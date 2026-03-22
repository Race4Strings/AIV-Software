"""Twin lifecycle endpoints."""
import uuid
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_db
from ..models.twin_profile import TwinProfile
from ..utils import parse_uuid

router = APIRouter(prefix="/twin", tags=["twin"])


class TwinCreateResponse(BaseModel):
    alcm_twin_id: str


class TwinHealthResponse(BaseModel):
    cfs: float
    psychographic_coverage: float
    personality_confidence: float
    health_status: str


@router.post("", response_model=TwinCreateResponse)
async def create_twin(db: AsyncSession = Depends(get_db)):
    """Create a new identity record in the ALCM."""
    profile = TwinProfile()
    db.add(profile)
    await db.flush()
    return TwinCreateResponse(alcm_twin_id=str(profile.id))


@router.delete("/{twin_id}")
async def delete_twin(twin_id: str, db: AsyncSession = Depends(get_db)):
    """Delete an identity record."""
    result = await db.execute(
        select(TwinProfile).where(TwinProfile.id == parse_uuid(twin_id, "twin_id"))
    )
    profile = result.scalar_one_or_none()
    if not profile:
        raise HTTPException(status_code=404, detail="Twin not found in ALCM")
    await db.delete(profile)
    return {"deleted": True}


@router.get("/{twin_id}/health", response_model=TwinHealthResponse)
async def get_twin_health(twin_id: str, db: AsyncSession = Depends(get_db)):
    """Get health indicators for a twin."""
    result = await db.execute(
        select(TwinProfile).where(TwinProfile.id == parse_uuid(twin_id, "twin_id"))
    )
    profile = result.scalar_one_or_none()
    if not profile:
        raise HTTPException(status_code=404, detail="Twin not found in ALCM")

    return TwinHealthResponse(
        cfs=profile.cfs or 0.0,
        psychographic_coverage=profile.psychographic_coverage or 0.0,
        personality_confidence=profile.personality_confidence or 0.0,
        health_status=profile.health_status or "BUILDING",
    )
