"""Drift detection endpoint — personality drift monitoring."""
import uuid
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_db
from ..models.twin_profile import TwinProfile

router = APIRouter(tags=["drift"])


class DriftResponse(BaseModel):
    drift_score: Optional[float] = None
    threshold_status: str = "WITHIN_BOUNDS"
    details: str = ""


@router.get("/twin/{twin_id}/drift", response_model=DriftResponse)
async def check_drift(twin_id: str, db: AsyncSession = Depends(get_db)):
    """Check personality drift for a twin.

    Phase 1: returns placeholder. Full drift detection comes later.
    """
    result = await db.execute(
        select(TwinProfile).where(TwinProfile.id == uuid.UUID(twin_id))
    )
    profile = result.scalar_one_or_none()
    if not profile:
        raise HTTPException(status_code=404, detail="Twin not found in ALCM")

    # Phase 1: no drift detection yet
    return DriftResponse(
        drift_score=0.0,
        threshold_status="WITHIN_BOUNDS",
        details="Drift detection not yet active (Phase 1).",
    )
