"""
E-Signature service — Zoho Sign integration.

Handles OAuth token management, signature request creation,
webhook processing, and status tracking.

Zoho Sign API docs: https://www.zoho.com/sign/api/
"""

import logging
from typing import Optional, List
from datetime import datetime, timezone

import httpx

from ..config import get_settings

logger = logging.getLogger(__name__)

ZOHO_ACCOUNTS_URL = "https://accounts.zoho.com"
ZOHO_SIGN_API_URL = "https://sign.zoho.com/api/v1"


class ESignService:
    """Handles Zoho Sign e-signature operations."""

    def __init__(self, db=None):
        self.db = db
        self._settings = get_settings()

    def _is_configured(self) -> bool:
        return bool(self._settings.zoho_sign_client_id and self._settings.zoho_sign_client_secret)

    async def _get_access_token(self) -> Optional[str]:
        """Get a valid access token, refreshing if needed."""
        token = self._settings.zoho_sign_access_token
        if token:
            return token

        refresh_token = self._settings.zoho_sign_refresh_token
        if not refresh_token:
            logger.warning("No Zoho Sign refresh token — OAuth flow required")
            return None

        # Refresh the access token
        return await self._refresh_access_token(refresh_token)

    async def _refresh_access_token(self, refresh_token: str) -> Optional[str]:
        """Refresh the Zoho Sign access token."""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{ZOHO_ACCOUNTS_URL}/oauth/v2/token",
                    params={
                        "refresh_token": refresh_token,
                        "client_id": self._settings.zoho_sign_client_id,
                        "client_secret": self._settings.zoho_sign_client_secret,
                        "grant_type": "refresh_token",
                    },
                )
                data = response.json()
                if "access_token" in data:
                    # Store for subsequent calls in this process
                    self._settings.zoho_sign_access_token = data["access_token"]
                    return data["access_token"]
                logger.error(f"Zoho token refresh failed: {data}")
                return None
        except Exception as e:
            logger.error(f"Zoho token refresh error: {e}")
            return None

    def get_oauth_url(self, state: str = "aiv") -> str:
        """Generate the OAuth authorization URL for initial setup."""
        return (
            f"{ZOHO_ACCOUNTS_URL}/oauth/v2/auth"
            f"?scope=ZohoSign.documents.ALL,ZohoSign.templates.ALL,ZohoSign.account.ALL"
            f"&client_id={self._settings.zoho_sign_client_id}"
            f"&response_type=code"
            f"&access_type=offline"
            f"&redirect_uri={self._settings.zoho_sign_redirect_uri}"
            f"&state={state}"
        )

    async def exchange_code_for_tokens(self, code: str) -> Optional[dict]:
        """Exchange OAuth authorization code for access + refresh tokens."""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{ZOHO_ACCOUNTS_URL}/oauth/v2/token",
                    params={
                        "code": code,
                        "client_id": self._settings.zoho_sign_client_id,
                        "client_secret": self._settings.zoho_sign_client_secret,
                        "grant_type": "authorization_code",
                        "redirect_uri": self._settings.zoho_sign_redirect_uri,
                    },
                )
                data = response.json()
                if "access_token" in data:
                    self._settings.zoho_sign_access_token = data["access_token"]
                    if "refresh_token" in data:
                        self._settings.zoho_sign_refresh_token = data["refresh_token"]
                    logger.info("Zoho Sign OAuth tokens acquired")
                    return {
                        "access_token": data["access_token"],
                        "refresh_token": data.get("refresh_token"),
                        "expires_in": data.get("expires_in"),
                    }
                logger.error(f"Zoho OAuth exchange failed: {data}")
                return None
        except Exception as e:
            logger.error(f"Zoho OAuth exchange error: {e}")
            return None

    async def create_signature_request(
        self,
        title: str,
        subject: str,
        message: str,
        signers: List[dict],  # [{"email": "...", "name": "...", "role": "talent|client"}]
        file_urls: Optional[List[str]] = None,
        file_content: Optional[bytes] = None,
        metadata: Optional[dict] = None,
    ) -> Optional[dict]:
        """Create a signature request via Zoho Sign.

        Args:
            title: Document title
            subject: Email subject line
            message: Message to signers
            signers: List of signer dicts with email, name, role
            file_urls: URLs to documents (downloaded and attached)
            metadata: Custom metadata (e.g., deal_id, contract_id)

        Returns:
            dict with request_id, or None if failed
        """
        if not self._is_configured():
            logger.info(f"E-sign request (not configured): {title} for {[s['email'] for s in signers]}")
            return {
                "request_id": f"mock-sig-{title[:20]}",
                "status": "mock",
                "signers": signers,
            }

        token = await self._get_access_token()
        if not token:
            logger.warning("No valid Zoho Sign access token")
            return {
                "request_id": f"mock-sig-{title[:20]}",
                "status": "no_token",
                "signers": signers,
                "oauth_url": self.get_oauth_url(),
            }

        try:
            # Build the Zoho Sign request
            actions = []
            for i, s in enumerate(signers):
                actions.append({
                    "action_type": "SIGN",
                    "recipient_name": s["name"],
                    "recipient_email": s["email"],
                    "signing_order": i,
                    "verify_recipient": True,
                })

            request_payload = {
                "requests": {
                    "request_name": title,
                    "subject": subject,
                    "description": message,
                    "actions": actions,
                    "notes": metadata or {},
                    "is_sequential": True,
                }
            }

            headers = {
                "Authorization": f"Zoho-oauthtoken {token}",
                "Content-Type": "application/json",
            }

            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    f"{ZOHO_SIGN_API_URL}/requests",
                    json=request_payload,
                    headers=headers,
                )
                data = response.json()

                if response.status_code in (200, 201) and data.get("status") == "success":
                    request_data = data.get("requests", {})
                    return {
                        "request_id": request_data.get("request_id"),
                        "request_status": request_data.get("request_status"),
                        "signing_url": request_data.get("sign_url"),
                    }
                else:
                    logger.error(f"Zoho Sign request failed: {data}")
                    return None

        except Exception as e:
            logger.error(f"Failed to create Zoho Sign request: {e}")
            return None

    async def get_signature_status(self, request_id: str) -> Optional[dict]:
        """Check the status of a signature request."""
        if not self._is_configured():
            return {"status": "mock", "is_complete": False}

        token = await self._get_access_token()
        if not token:
            return None

        try:
            headers = {"Authorization": f"Zoho-oauthtoken {token}"}
            async with httpx.AsyncClient(timeout=15.0) as client:
                response = await client.get(
                    f"{ZOHO_SIGN_API_URL}/requests/{request_id}",
                    headers=headers,
                )
                data = response.json()

                if data.get("status") == "success":
                    req = data.get("requests", {})
                    actions = req.get("actions", [])
                    signatures = []
                    for action in actions:
                        signatures.append({
                            "signer_email": action.get("recipient_email"),
                            "signer_name": action.get("recipient_name"),
                            "status": action.get("action_status"),
                            "signed_at": action.get("signed_date_time"),
                        })
                    return {
                        "request_id": req.get("request_id"),
                        "is_complete": req.get("request_status") == "completed",
                        "request_status": req.get("request_status"),
                        "signatures": signatures,
                    }
                return None
        except Exception as e:
            logger.error(f"Failed to get Zoho Sign status: {e}")
            return None

    @staticmethod
    def process_webhook_event(event_type: str, event_data: dict) -> dict:
        """Process a Zoho Sign webhook event.

        Zoho Sign webhook event types:
        - RequestCompleted: all parties signed
        - RequestRejected: a party declined
        - RequestSent: request sent to signers
        - RequestViewed: a party viewed the document
        - SignCompleted: one party signed

        Returns action to take based on event type.
        """
        actions = {
            "RequestCompleted": "all_signed",
            "SignCompleted": "signer_completed",
            "RequestRejected": "declined",
            "RequestSent": "sent",
            "RequestViewed": "viewed",
            # Also handle legacy Dropbox Sign events for backward compat
            "signature_request_all_signed": "all_signed",
            "signature_request_signed": "signer_completed",
            "signature_request_declined": "declined",
        }

        # Zoho puts the request_id in different places depending on event
        request_id = (
            event_data.get("request_id")
            or event_data.get("requests", {}).get("request_id")
            or event_data.get("signature_request", {}).get("signature_request_id")
        )

        return {
            "action": actions.get(event_type, "unknown"),
            "request_id": request_id,
            "event_type": event_type,
        }
