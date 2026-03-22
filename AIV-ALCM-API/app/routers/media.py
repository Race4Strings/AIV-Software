"""Media analysis endpoint — process uploaded audio/video/images."""
import uuid
import logging
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_db
from ..models.twin_profile import TwinProfile

router = APIRouter(tags=["media"])
logger = logging.getLogger(__name__)


class AnalyzeMediaRequest(BaseModel):
    twin_id: str
    media_url: str
    media_type: str  # audio | video | image


@router.post("/analyze-media")
async def analyze_media(req: AnalyzeMediaRequest, db: AsyncSession = Depends(get_db)):
    """Analyze uploaded media for voice/visual profile extraction.

    Phase 1: returns processing acknowledgment.
    Full analysis pipeline (voice embeddings, visual descriptors) comes later.
    """
    result = await db.execute(
        select(TwinProfile).where(TwinProfile.id == uuid.UUID(req.twin_id))
    )
    profile = result.scalar_one_or_none()
    if not profile:
        raise HTTPException(status_code=404, detail="Twin not found in ALCM")

    logger.info(f"Media analysis requested: twin={req.twin_id}, type={req.media_type}, url={req.media_url}")

    return {
        "processing_id": str(uuid.uuid4()),
        "status": "ACKNOWLEDGED",
        "voice_profile": {},
        "visual_descriptors": {},
    }
