"""Package delivery endpoints — scoped identity data for clients."""
import hashlib
import json
import uuid
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from typing import Optional, List
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_db
from ..models.twin_profile import TwinProfile

router = APIRouter(tags=["package"])

VALID_MODULES = {"identity_profile", "knowledge_base", "voice_identity", "visual_identity"}


class PackageResponse(BaseModel):
    identity_profile: Optional[dict] = None
    knowledge_base: Optional[dict] = None
    voice_identity: Optional[dict] = None
    visual_identity: Optional[dict] = None
    seal_hash: Optional[str] = None
    version: int = 1


@router.get("/twin/{twin_id}/package", response_model=PackageResponse)
async def get_package(
    twin_id: str,
    scope: str = Query(..., description="Comma-separated delivery modules"),
    db: AsyncSession = Depends(get_db),
):
    """Deliver scoped identity data per deal manifest."""
    result = await db.execute(
        select(TwinProfile).where(TwinProfile.id == uuid.UUID(twin_id))
    )
    profile = result.scalar_one_or_none()
    if not profile:
        raise HTTPException(status_code=404, detail="Twin not found in ALCM")

    requested = {s.strip() for s in scope.split(",")} & VALID_MODULES
    if not requested:
        raise HTTPException(status_code=400, detail=f"Invalid scope. Valid: {VALID_MODULES}")

    response = PackageResponse()
    if "identity_profile" in requested:
        response.identity_profile = profile.identity_profile or {}
    if "knowledge_base" in requested:
        response.knowledge_base = profile.knowledge_base or {}
    if "voice_identity" in requested:
        response.voice_identity = profile.voice_profile or {}
    if "visual_identity" in requested:
        response.visual_identity = profile.visual_profile or {}

    return response


@router.post("/twin/{twin_id}/snapshot")
async def create_snapshot(twin_id: str, db: AsyncSession = Depends(get_db)):
    """Create a versioned snapshot of the current identity state."""
    result = await db.execute(
        select(TwinProfile).where(TwinProfile.id == uuid.UUID(twin_id))
    )
    profile = result.scalar_one_or_none()
    if not profile:
        raise HTTPException(status_code=404, detail="Twin not found in ALCM")

    data = json.dumps({
        "identity_profile": profile.identity_profile or {},
        "knowledge_base": profile.knowledge_base or {},
        "voice_profile": profile.voice_profile or {},
        "visual_profile": profile.visual_profile or {},
    }, sort_keys=True, separators=(",", ":"))
    seal_hash = hashlib.sha256(data.encode()).hexdigest()

    return {
        "snapshot_ref": str(uuid.uuid4()),
        "seal_hash": seal_hash,
        "version_number": 1,  # Will be managed by platform's identity_package_versions
    }
