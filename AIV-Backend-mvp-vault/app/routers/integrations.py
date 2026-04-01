"""
Integrations Router — Cross-platform data ingestion.

Stage 2: Google Meet integration (first cross-platform).
Handles meeting recording ingestion, transcript extraction,
and feeding content into the ALCM training pipeline.
"""

import logging
from uuid import UUID
from typing import Optional

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_db
from ..middleware.auth_middleware import require_auth
from ..models.twin import Twin
from ..models.training_contribution import TrainingContribution
from ..models.audit_log import AuditLog
from ..services.alcm_client import get_alcm_client

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/integrations", tags=["integrations"])


# ------------------------------------------------------------------
# Schemas
# ------------------------------------------------------------------

class MeetingIngestionRequest(BaseModel):
    """Ingest a Google Meet recording or transcript."""
    twin_id: str
    meeting_url: Optional[str] = None
    transcript_text: Optional[str] = None
    recording_url: Optional[str] = None
    meeting_title: Optional[str] = None
    meeting_date: Optional[str] = None
    participants: Optional[list] = None


class TranscriptIngestionRequest(BaseModel):
    """Ingest a transcript from any source (Meet, Zoom, podcast, etc.)."""
    twin_id: str
    transcript_text: str
    source: str = "GOOGLE_MEET"
    title: Optional[str] = None
    date: Optional[str] = None


# ------------------------------------------------------------------
# Google Meet Integration
# ------------------------------------------------------------------

@router.post("/meet/ingest")
async def ingest_meeting(
    req: MeetingIngestionRequest,
    background_tasks: BackgroundTasks,
    user: dict = Depends(require_auth),
    db: AsyncSession = Depends(get_db),
):
    """Ingest a Google Meet recording or transcript into the training pipeline.

    Flow:
    1. Accept transcript text or recording URL
    2. Create TrainingContribution record
    3. Background: send to ALCM for classification
    4. Results feed into twin's identity profile

    This is the first cross-platform integration (Stage 2).
    The same pattern extends to Zoom, podcast platforms, etc.
    """
    twin = (await db.execute(
        select(Twin).where(Twin.id == UUID(req.twin_id))
    )).scalar_one_or_none()
    if not twin:
        raise HTTPException(status_code=404, detail="Twin not found")

    if not req.transcript_text and not req.recording_url:
        raise HTTPException(status_code=400, detail="Provide either transcript_text or recording_url")

    content_text = req.transcript_text or ""
    modality = "TEXT" if req.transcript_text else "AUDIO"

    # Create training contribution
    contribution = TrainingContribution(
        twin_id=UUID(req.twin_id),
        contributor_id=UUID(user["id"]),
        contributor_type=user.get("role", "TALENT"),
        modality=modality,
        content=content_text if content_text else f"[Recording: {req.recording_url}]",
        source_description=f"Google Meet: {req.meeting_title or 'Untitled meeting'}",
        source_url=req.meeting_url or req.recording_url,
        agent_mode="TRAINING",
        alcm_processing_status="PENDING",
        approval_status="AUTO_APPROVED",
    )
    db.add(contribution)

    db.add(AuditLog(
        actor_id=UUID(user["id"]), actor_type="TALENT", action="MEET_INGEST",
        entity_type="training_contribution", twin_id=UUID(req.twin_id),
        details={
            "source": "google_meet",
            "title": req.meeting_title,
            "has_transcript": bool(req.transcript_text),
            "has_recording": bool(req.recording_url),
        },
    ))
    await db.flush()

    # Background: classify through ALCM
    if content_text and twin.alcm_twin_id:
        background_tasks.add_task(
            _classify_meeting_content,
            str(contribution.id),
            str(twin.alcm_twin_id),
            content_text,
        )

    return {
        "status": "ingested",
        "contribution_id": str(contribution.id),
        "processing_status": "PENDING" if content_text else "REQUIRES_TRANSCRIPTION",
        "message": "Meeting content ingested and queued for identity processing.",
    }


@router.post("/transcript/ingest")
async def ingest_transcript(
    req: TranscriptIngestionRequest,
    background_tasks: BackgroundTasks,
    user: dict = Depends(require_auth),
    db: AsyncSession = Depends(get_db),
):
    """Ingest a transcript from any source into the training pipeline.

    Supports: Google Meet, Zoom, podcast transcripts, interview transcripts.
    """
    twin = (await db.execute(
        select(Twin).where(Twin.id == UUID(req.twin_id))
    )).scalar_one_or_none()
    if not twin:
        raise HTTPException(status_code=404, detail="Twin not found")

    contribution = TrainingContribution(
        twin_id=UUID(req.twin_id),
        contributor_id=UUID(user["id"]),
        contributor_type=user.get("role", "TALENT"),
        modality="TEXT",
        content=req.transcript_text,
        source_description=f"{req.source}: {req.title or 'Untitled'}",
        agent_mode="TRAINING",
        alcm_processing_status="PENDING",
        approval_status="AUTO_APPROVED",
    )
    db.add(contribution)
    await db.flush()

    if twin.alcm_twin_id:
        background_tasks.add_task(
            _classify_meeting_content,
            str(contribution.id),
            str(twin.alcm_twin_id),
            req.transcript_text,
        )

    return {
        "status": "ingested",
        "contribution_id": str(contribution.id),
        "source": req.source,
        "message": "Transcript ingested and queued for identity processing.",
    }


@router.get("/sources")
async def list_integration_sources(
    user: dict = Depends(require_auth),
):
    """List available integration sources and their status."""
    return {
        "sources": [
            {
                "id": "google_meet",
                "name": "Google Meet",
                "status": "available",
                "description": "Ingest meeting recordings and transcripts",
                "supports": ["transcript", "recording_url"],
            },
            {
                "id": "zoom",
                "name": "Zoom",
                "status": "available",
                "description": "Ingest Zoom meeting transcripts",
                "supports": ["transcript"],
            },
            {
                "id": "podcast",
                "name": "Podcast",
                "status": "available",
                "description": "Ingest podcast episode transcripts",
                "supports": ["transcript", "recording_url"],
            },
            {
                "id": "youtube",
                "name": "YouTube",
                "status": "available",
                "description": "Ingest YouTube video transcripts",
                "supports": ["transcript", "video_url"],
            },
        ],
    }


# ------------------------------------------------------------------
# Background task
# ------------------------------------------------------------------

async def _classify_meeting_content(
    contribution_id: str, alcm_twin_id: str, content: str
):
    """Classify meeting/transcript content through ALCM in background."""
    from ..database import async_session_maker

    try:
        alcm = get_alcm_client()
        result = await alcm.classify(
            alcm_twin_id,
            content,
            contributor_type="TALENT",
            source_reliability=0.8,  # Meeting transcripts are reliable but may include other speakers
        )

        async with async_session_maker() as db:
            async with db.begin():
                from sqlalchemy import select as sel
                contrib = (await db.execute(
                    sel(TrainingContribution).where(TrainingContribution.id == UUID(contribution_id))
                )).scalar_one_or_none()
                if contrib:
                    if result.get("_alcm_unavailable"):
                        contrib.alcm_processing_status = "PENDING"
                    else:
                        contrib.alcm_processing_status = "CLASSIFIED"
                        contrib.alcm_processing_result = result

        logger.info(f"Meeting content classified: contribution={contribution_id}")
    except Exception as e:
        logger.error(f"Meeting content classification failed: {e}")
