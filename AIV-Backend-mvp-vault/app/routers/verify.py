"""Public Verification Router — no auth required.

Allows anyone with a seal hash to verify identity provenance.
Uses IdentityPackageVersion (replaces old Certification model).
"""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import datetime
from typing import Optional, List

from ..database import get_db
from ..models.identity_package_version import IdentityPackageVersion
from ..models.twin import Twin

router = APIRouter(prefix="/verify", tags=["Public Verification"])


class PublicVerificationResponse(BaseModel):
    """Public-facing seal verification. No sensitive info exposed."""
    seal_hash: str
    version_number: int
    sealed_at: datetime
    twin_name: str
    twin_public_name: Optional[str] = None
    twin_category: Optional[str] = None
    algorithm: str = "sha256"
    tx_hash: Optional[str] = None
    block_number: Optional[str] = None
    network: Optional[str] = None
    covered_assets: List[str] = [
        "Identity Profile",
        "Knowledge Base",
        "Voice Identity",
        "Visual Identity",
    ]


@router.get("/{seal_hash}", response_model=PublicVerificationResponse)
async def verify_seal(
    seal_hash: str,
    db: AsyncSession = Depends(get_db),
):
    """Public endpoint: verify an AIV Seal by its SHA-256 hash.

    No authentication required — meant to be shared publicly.
    Returns seal provenance metadata without exposing identity data.
    """
    result = await db.execute(
        select(IdentityPackageVersion, Twin)
        .join(Twin, IdentityPackageVersion.twin_id == Twin.id)
        .where(IdentityPackageVersion.seal_hash == seal_hash)
        .order_by(IdentityPackageVersion.created_at.desc())
        .limit(1)
    )
    row = result.first()
    if not row:
        raise HTTPException(status_code=404, detail="Seal not found")

    pkg, twin = row
    return PublicVerificationResponse(
        seal_hash=pkg.seal_hash,
        version_number=pkg.version_number,
        sealed_at=pkg.seal_generated_at or pkg.created_at,
        twin_name=twin.display_name or "Unknown",
        twin_public_name=twin.public_name,
        twin_category=twin.identity_category[0] if twin.identity_category else "ENTERTAINMENT",
        tx_hash=pkg.tx_hash,
        block_number=pkg.block_number,
        network=pkg.network,
    )
