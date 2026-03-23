"""
Gmail Adapter for tool integration.

Provides interface to Gmail API using OAuth tokens.
"""
import base64
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone
import httpx


class GmailAdapter:
    """Adapter for Gmail API operations."""
    
    BASE_URL = "https://gmail.googleapis.com/gmail/v1"
    
    def __init__(self, access_token: str):
        """Initialize with OAuth access token."""
        self.access_token = access_token
        self.headers = {
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json"
        }
    
    async def _request(
        self, 
        method: str, 
        endpoint: str, 
        params: dict = None, 
        json: dict = None
    ) -> Dict[str, Any]:
        """Make authenticated request to Gmail API."""
        async with httpx.AsyncClient() as client:
            response = await client.request(
                method=method,
                url=f"{self.BASE_URL}{endpoint}",
                headers=self.headers,
                params=params,
                json=json,
                timeout=30.0
            )
            response.raise_for_status()
            return response.json()
    
    async def get_profile(self) -> Dict[str, Any]:
        """Get user's Gmail profile."""
        return await self._request("GET", "/users/me/profile")
    
    async def get_unread_count(self) -> int:
        """Get count of unread emails in inbox."""
        result = await self._request(
            "GET", 
            "/users/me/messages",
            params={"q": "is:unread in:inbox", "maxResults": 1}
        )
        return result.get("resultSizeEstimate", 0)
    
    async def list_messages(
        self, 
        query: str = "in:inbox",
        max_results: int = 10,
        page_token: str = None
    ) -> Dict[str, Any]:
        """List messages matching query."""
        params = {"q": query, "maxResults": max_results}
        if page_token:
            params["pageToken"] = page_token
        
        return await self._request("GET", "/users/me/messages", params=params)
    
    async def get_message(self, message_id: str, format: str = "metadata") -> Dict[str, Any]:
        """Get a specific message.
        
        format: 'minimal', 'metadata', 'full', 'raw'
        """
        return await self._request(
            "GET", 
            f"/users/me/messages/{message_id}",
            params={"format": format}
        )
    
    async def get_message_details(self, message_id: str) -> Dict[str, Any]:
        """Get message with parsed headers."""
        msg = await self.get_message(message_id, format="metadata")
        
        headers = {h["name"].lower(): h["value"] for h in msg.get("payload", {}).get("headers", [])}
        
        return {
            "id": msg["id"],
            "thread_id": msg["threadId"],
            "subject": headers.get("subject", "(no subject)"),
            "from": headers.get("from", "unknown"),
            "to": headers.get("to", ""),
            "date": headers.get("date", ""),
            "snippet": msg.get("snippet", ""),
            "labels": msg.get("labelIds", []),
            "is_unread": "UNREAD" in msg.get("labelIds", [])
        }
    
    async def get_recent_emails(
        self, 
        count: int = 5, 
        unread_only: bool = False,
        since: datetime = None
    ) -> List[Dict[str, Any]]:
        """Get recent emails with details."""
        query = "in:inbox"
        if unread_only:
            query += " is:unread"
        if since:
            # Gmail uses epoch seconds for after: query
            epoch = int(since.timestamp())
            query += f" after:{epoch}"
        
        result = await self.list_messages(query=query, max_results=count)
        messages = result.get("messages", [])
        
        details = []
        for msg in messages:
            detail = await self.get_message_details(msg["id"])
            details.append(detail)
        
        return details
    
    async def search_emails(self, query: str, max_results: int = 10) -> List[Dict[str, Any]]:
        """Search emails with custom query."""
        result = await self.list_messages(query=query, max_results=max_results)
        messages = result.get("messages", [])
        
        details = []
        for msg in messages:
            detail = await self.get_message_details(msg["id"])
            details.append(detail)
        
        return details
    
    async def get_thread(self, thread_id: str) -> Dict[str, Any]:
        """Get all messages in a thread."""
        return await self._request(
            "GET",
            f"/users/me/threads/{thread_id}",
            params={"format": "metadata"}
        )
    
    async def send_email(
        self, 
        to: str, 
        subject: str, 
        body: str,
        body_type: str = "plain",
        reply_to_message_id: str = None,
        thread_id: str = None
    ) -> Dict[str, Any]:
        """Send an email.
        
        Args:
            to: Recipient email
            subject: Email subject
            body: Email body
            body_type: 'plain' or 'html'
            reply_to_message_id: Message ID to reply to
            thread_id: Thread ID to add message to
        """
        # Create message
        message = MIMEMultipart() if body_type == "html" else MIMEText(body)
        message["to"] = to
        message["subject"] = subject
        
        if body_type == "html":
            message.attach(MIMEText(body, "html"))
        
        # Add reply headers if replying
        if reply_to_message_id:
            # Get original message for headers
            original = await self.get_message(reply_to_message_id, format="metadata")
            headers = {h["name"].lower(): h["value"] for h in original.get("payload", {}).get("headers", [])}
            
            if "message-id" in headers:
                message["In-Reply-To"] = headers["message-id"]
                message["References"] = headers.get("references", "") + " " + headers["message-id"]
        
        # Encode message
        raw = base64.urlsafe_b64encode(message.as_bytes()).decode("utf-8")
        
        body_data = {"raw": raw}
        if thread_id:
            body_data["threadId"] = thread_id
        
        return await self._request(
            "POST",
            "/users/me/messages/send",
            json=body_data
        )
    
    async def reply_to_email(
        self,
        message_id: str,
        body: str,
        body_type: str = "plain"
    ) -> Dict[str, Any]:
        """Reply to an email."""
        # Get original message
        original = await self.get_message(message_id, format="metadata")
        headers = {h["name"].lower(): h["value"] for h in original.get("payload", {}).get("headers", [])}
        
        # Get reply-to or from address
        reply_to = headers.get("reply-to", headers.get("from", ""))
        subject = headers.get("subject", "")
        if not subject.lower().startswith("re:"):
            subject = f"Re: {subject}"
        
        return await self.send_email(
            to=reply_to,
            subject=subject,
            body=body,
            body_type=body_type,
            reply_to_message_id=message_id,
            thread_id=original["threadId"]
        )
    
    async def mark_as_read(self, message_id: str) -> Dict[str, Any]:
        """Mark message as read."""
        return await self._request(
            "POST",
            f"/users/me/messages/{message_id}/modify",
            json={"removeLabelIds": ["UNREAD"]}
        )
    
    async def mark_as_unread(self, message_id: str) -> Dict[str, Any]:
        """Mark message as unread."""
        return await self._request(
            "POST",
            f"/users/me/messages/{message_id}/modify",
            json={"addLabelIds": ["UNREAD"]}
        )
    
    async def archive_message(self, message_id: str) -> Dict[str, Any]:
        """Archive a message (remove from inbox)."""
        return await self._request(
            "POST",
            f"/users/me/messages/{message_id}/modify",
            json={"removeLabelIds": ["INBOX"]}
        )
    
    async def trash_message(self, message_id: str) -> Dict[str, Any]:
        """Move message to trash."""
        return await self._request(
            "POST",
            f"/users/me/messages/{message_id}/trash"
        )
