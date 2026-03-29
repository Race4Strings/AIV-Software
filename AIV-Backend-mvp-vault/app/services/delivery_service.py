"""
Package delivery service — delivers identity packages to deal clients.

Handles scoped delivery based on deal data_scope, access tracking,
and secure time-limited URLs.
"""

import logging
import uuid
import hashlib
from datetime import datetime, timezone, timedelta
from typing import Optional
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..models.identity_package_version import IdentityPackageVersion
from ..models.twin import Twin
from ..models.audit_log import AuditLog

logger = logging.getLogger(__name__)


class DeliveryService:
    """Handles identity package delivery to deal clients."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def deliver_package(
        self,
        deal_id: UUID,
        twin_id: UUID,
        data_scope: list,
        client_org_id: Optional[UUID] = None,
        delivered_by: Optional[UUID] = None,
    ) -> dict:
        """Deliver an identity package scoped to the deal's data_scope.

        Called when a deal transitions to EXECUTED status.

        Args:
            deal_id: The deal being executed
            twin_id: The twin whose identity is being licensed
            data_scope: List of identity modules included (e.g., ["voice_identity", "behavioral_model"])
            client_org_id: The client organization receiving the package
            delivered_by: User who triggered the delivery

        Returns:
            dict with delivery details including access token and expiry
        """
        # Get current package version for the twin
        result = await self.db.execute(
            select(IdentityPackageVersion)
            .where(IdentityPackageVersion.twin_id == twin_id)
            .where(IdentityPackageVersion.is_current == True)
            .limit(1)
        )
        package = result.scalar_one_or_none()

        if not package:
            logger.warning(f"No current package version for twin {twin_id}")
            # Create a placeholder delivery record even without a package
            package_version = "pending"
            package_hash = "pending"
        else:
            package_version = str(package.version_number)
            package_hash = package.seal_hash

        # Generate a secure access token
        access_token = hashlib.sha256(
            f"{deal_id}-{twin_id}-{uuid.uuid4()}".encode()
        ).hexdigest()

        # Set expiry (30 days from now)
        expires_at = datetime.now(timezone.utc) + timedelta(days=30)

        # Log the delivery
        self.db.add(AuditLog(
            actor_id=delivered_by,
            actor_type="SYSTEM",
            action="DELIVER",
            entity_type="identity_package",
            twin_id=twin_id,
            details={
                "deal_id": str(deal_id),
                "client_org_id": str(client_org_id) if client_org_id else None,
                "package_version": package_version,
                "package_hash": package_hash,
                "data_scope": data_scope,
                "access_token_hash": hashlib.sha256(access_token.encode()).hexdigest(),
                "expires_at": expires_at.isoformat(),
            },
        ))

        # Update cascade counter on package
        if package:
            package.cascaded_to_deals = (package.cascaded_to_deals or 0) + 1

        await self.db.flush()

        return {
            "delivery_id": str(uuid.uuid4()),
            "deal_id": str(deal_id),
            "twin_id": str(twin_id),
            "package_version": package_version,
            "package_hash": package_hash,
            "data_scope": data_scope,
            "access_token": access_token,
            "expires_at": expires_at.isoformat(),
            "status": "delivered",
        }

    async def get_package_for_client(
        self,
        twin_id: UUID,
        data_scope: list,
        access_token: str,
    ) -> Optional[dict]:
        """Retrieve a scoped identity package for an authorized client.

        Validates the access token against the delivery audit log before
        returning any data. Returns None if the token is invalid or expired.
        """
        # Validate access token against delivery audit log
        from sqlalchemy import and_
        token_check = await self.db.execute(
            select(AuditLog).where(
                and_(
                    AuditLog.action == "DELIVER",
                    AuditLog.entity_type == "identity_package",
                    AuditLog.twin_id == twin_id,
                )
            ).order_by(AuditLog.created_at.desc())
        )
        delivery_records = token_check.scalars().all()

        # Validate token by comparing hash against stored hash
        incoming_hash = hashlib.sha256(access_token.encode()).hexdigest()
        token_valid = False
        for record in delivery_records:
            details = record.details or {}
            stored_hash = details.get("access_token_hash", "")
            if stored_hash and incoming_hash == stored_hash:
                # Check expiry
                expires_str = details.get("expires_at")
                if expires_str:
                    from dateutil.parser import isoparse
                    expires_at = isoparse(expires_str)
                    if datetime.now(timezone.utc) > expires_at:
                        logger.warning(f"Expired delivery token for twin {twin_id}")
                        return None
                token_valid = True
                break

        if not token_valid:
            logger.warning(f"Invalid delivery token for twin {twin_id}")
            return None

        # Get current package
        result = await self.db.execute(
            select(IdentityPackageVersion)
            .where(IdentityPackageVersion.twin_id == twin_id)
            .where(IdentityPackageVersion.is_current == True)
            .limit(1)
        )
        package = result.scalar_one_or_none()

        if not package:
            return None

        # Get twin data for the scoped modules
        twin = (await self.db.execute(
            select(Twin).where(Twin.id == twin_id)
        )).scalar_one_or_none()

        if not twin:
            return None

        # Fetch real scoped data from ALCM API
        from .alcm_client import get_alcm_client

        scoped_data = {
            "twin_id": str(twin.id),
            "display_name": twin.display_name,
            "identity_category": twin.identity_category,
            "package_version": package.version_number,
            "seal_hash": package.seal_hash,
            "seal_id": str(package.seal_id),
            "blockchain": {
                "tx_hash": package.tx_hash,
                "block_number": package.block_number,
                "network": package.network,
            } if package.tx_hash else None,
            "modules": {},
        }

        if twin.alcm_twin_id:
            alcm = get_alcm_client()
            alcm_package = await alcm.get_package(str(twin.alcm_twin_id), data_scope)
            if not alcm_package.get("_alcm_unavailable"):
                scoped_data["modules"] = alcm_package.get("modules", {})
                scoped_data["alcm_version"] = alcm_package.get("version")
                scoped_data["alcm_seal_hash"] = alcm_package.get("seal_hash")
            else:
                # Fallback: basic platform data only
                for scope in data_scope:
                    if scope == "identity_profile":
                        scoped_data["modules"][scope] = {
                            "display_name": twin.display_name,
                            "public_name": twin.public_name,
                            "bio": twin.bio,
                            "category": twin.identity_category,
                        }
                    else:
                        scoped_data["modules"][scope] = {"status": "alcm_unavailable"}
        else:
            for scope in data_scope:
                scoped_data["modules"][scope] = {"status": "no_alcm_identity"}

        # Log access
        self.db.add(AuditLog(
            actor_type="CLIENT",
            action="ACCESS",
            entity_type="identity_package",
            twin_id=twin_id,
            details={
                "data_scope": data_scope,
                "package_version": package.version_number,
            },
        ))
        await self.db.flush()

        return scoped_data
