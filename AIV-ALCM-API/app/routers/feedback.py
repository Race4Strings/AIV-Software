"""Feedback endpoint — receive interaction feedback for learning."""
import uuid
import logging
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_db
from ..models.twin_profile import TwinProfile

router = APIRouter(tags=["feedback"])
logger = logging.getLogger(__name__)


class FeedbackRequest(BaseModel):
    interaction_id: str
    feedback_type: str  # USER_CORRECTION | RATING | IMPLICIT_ACCEPT | REFINEMENT
    signal: dict


@router.post("/twin/{twin_id}/feedback")
async def submit_feedback(
    twin_id: str, req: FeedbackRequest, db: AsyncSession = Depends(get_db),
):
    """Process interaction feedback for adaptive learning.

    Phase 1: logs the feedback. Full Bayesian updating comes later.
    """
    result = await db.execute(
        select(TwinProfile).where(TwinProfile.id == uuid.UUID(twin_id))
    )
    profile = result.scalar_one_or_none()
    if not profile:
        raise HTTPException(status_code=404, detail="Twin not found in ALCM")

    # Phase 1: log it. Phase 2+: Bayesian update pipeline.
    logger.info(
        f"Feedback received for twin {twin_id}: "
        f"type={req.feedback_type}, interaction={req.interaction_id}"
    )

    return {"processed": True, "learning_applied": False}  # False until Bayesian pipeline
