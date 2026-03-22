"""Speech generation endpoint — TTS via abstracted provider."""
import uuid
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_db
from ..models.twin_profile import TwinProfile
from ..services.tts_service import get_tts_service

router = APIRouter(tags=["speech"])


class SpeechRequest(BaseModel):
    twin_id: str
    text: str


@router.post("/generate-speech")
async def generate_speech(req: SpeechRequest, db: AsyncSession = Depends(get_db)):
    """Generate speech from text using the twin's cloned voice."""
    result = await db.execute(
        select(TwinProfile).where(TwinProfile.id == uuid.UUID(req.twin_id))
    )
    profile = result.scalar_one_or_none()
    if not profile:
        raise HTTPException(status_code=404, detail="Twin not found in ALCM")

    voice_data = profile.voice_profile or {}
    voice_id = voice_data.get("voice_id")

    if not voice_id:
        raise HTTPException(status_code=400, detail="No voice profile configured for this twin")

    tts = get_tts_service()
    audio_bytes = await tts.text_to_speech(voice_id, req.text)

    if not audio_bytes:
        raise HTTPException(status_code=503, detail="Speech generation failed")

    return Response(content=audio_bytes, media_type="audio/mpeg")
