"""Precision Tuning (BFI-2) endpoints.

Talent-facing name: "Precision Tuning"
Internal name: BFI-2 Calibration

These endpoints live under /twins/{twin_id}/calibration/ and handle
the 60-item personality questionnaire lifecycle: start, save (auto-save),
complete, list, status check, and live ALCM comparison.
"""
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_db
from ..middleware import require_auth
from ..services import calibration_service

router = APIRouter(tags=["Calibration"])


# ---------------------------------------------------------------------------
# Request/Response schemas
# ---------------------------------------------------------------------------

class StartCalibrationRequest(BaseModel):
    source: str = "ONBOARDING_INTERSTITIAL"


class SaveResponsesRequest(BaseModel):
    responses: list[dict]  # [{"item": 1, "value": 4}, ...]


# ---------------------------------------------------------------------------
# Serialization
# ---------------------------------------------------------------------------

def _serialize(record) -> dict:
    return {
        "id": str(record.id),
        "twin_id": str(record.twin_id),
        "user_id": str(record.user_id),
        "progress": record.progress,
        "completed": record.completed,
        "score_extraversion": record.score_extraversion,
        "score_agreeableness": record.score_agreeableness,
        "score_conscientiousness": record.score_conscientiousness,
        "score_negative_emotionality": record.score_negative_emotionality,
        "score_open_mindedness": record.score_open_mindedness,
        "facet_scores": record.facet_scores,
        "source": record.source,
        "started_at": record.started_at.isoformat() if record.started_at else None,
        "completed_at": record.completed_at.isoformat() if record.completed_at else None,
        "created_at": record.created_at.isoformat() if record.created_at else None,
    }


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.post("/twins/{twin_id}/calibration/start")
async def start_calibration(
    twin_id: str,
    body: StartCalibrationRequest = StartCalibrationRequest(),
    user: dict = Depends(require_auth),
    db: AsyncSession = Depends(get_db),
):
    """Start a new Precision Tuning session. Returns calibration ID + 60 items."""
    record = await calibration_service.start_calibration(
        twin_id=UUID(twin_id),
        user_id=UUID(user["id"]),
        source=body.source,
        db=db,
    )
    return {
        "calibration": _serialize(record),
        "items": calibration_service.get_items_for_client(),
    }


@router.put("/twins/{twin_id}/calibration/{cal_id}")
async def save_responses(
    twin_id: str,
    cal_id: str,
    body: SaveResponsesRequest,
    user: dict = Depends(require_auth),
    db: AsyncSession = Depends(get_db),
):
    """Save partial or complete responses. Called on every item tap (auto-save)."""
    record = await calibration_service.save_responses(
        cal_id=UUID(cal_id),
        responses=body.responses,
        db=db,
    )
    if not record:
        raise HTTPException(status_code=404, detail="Calibration not found")
    return _serialize(record)


@router.post("/twins/{twin_id}/calibration/{cal_id}/complete")
async def complete_calibration(
    twin_id: str,
    cal_id: str,
    user: dict = Depends(require_auth),
    db: AsyncSession = Depends(get_db),
):
    """Trigger BFI-2 scoring (domain + facet means). No ALCM call — scoring only."""
    record = await calibration_service.complete_calibration(
        cal_id=UUID(cal_id), db=db,
    )
    if not record:
        raise HTTPException(status_code=400, detail="Calibration not found or incomplete (60 responses required)")
    return {
        "calibration": _serialize(record),
        "message": "Your responses are recorded. As your twin processes more data, we'll compare its understanding against yours and surface any gaps.",
    }


@router.get("/twins/{twin_id}/calibration")
async def list_calibrations(
    twin_id: str,
    user: dict = Depends(require_auth),
    db: AsyncSession = Depends(get_db),
):
    """List all calibration records for this twin (most recent first)."""
    records = await calibration_service.get_calibrations(
        twin_id=UUID(twin_id), db=db,
    )
    return [_serialize(r) for r in records]


@router.get("/twins/{twin_id}/calibration/status")
async def calibration_status(
    twin_id: str,
    user: dict = Depends(require_auth),
    db: AsyncSession = Depends(get_db),
):
    """Quick check: has this twin completed Precision Tuning?"""
    return await calibration_service.get_calibration_status(
        twin_id=UUID(twin_id), db=db,
    )


@router.get("/twins/{twin_id}/calibration/comparison")
async def live_comparison(
    twin_id: str,
    user: dict = Depends(require_auth),
    db: AsyncSession = Depends(get_db),
):
    """Live comparison: BFI-2 self-report vs current ALCM Big Five.

    Computed fresh on every call (ALCM scores evolve over time).
    Returns confidence-weighted divergence + tiered result framing.
    Returns 404 if no completed calibration exists.
    """
    result = await calibration_service.compute_live_comparison(
        twin_id=UUID(twin_id), db=db,
    )
    if result is None:
        raise HTTPException(status_code=404, detail="No completed calibration found")
    return result
