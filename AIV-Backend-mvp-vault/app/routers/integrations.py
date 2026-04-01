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


class UnifiedIngestRequest(BaseModel):
    """Unified content ingestion — auto-detects source from URL or content."""
    twin_id: str
    content: Optional[str] = None
    url: Optional[str] = None
    title: Optional[str] = None


def _extract_youtube_video_id(url: str) -> Optional[str]:
    """Extract video ID from various YouTube URL formats."""
    import re
    patterns = [
        r'(?:youtube\.com/watch\?v=|youtu\.be/|youtube\.com/embed/)([a-zA-Z0-9_-]{11})',
        r'youtube\.com/shorts/([a-zA-Z0-9_-]{11})',
    ]
    for pattern in patterns:
        match = re.search(pattern, url)
        if match:
            return match.group(1)
    return None


def _fetch_youtube_transcript(video_id: str) -> Optional[str]:
    """Fetch auto-generated transcript from YouTube video."""
    try:
        from youtube_transcript_api import YouTubeTranscriptApi
        transcript_list = YouTubeTranscriptApi.get_transcript(video_id)
        return " ".join([entry["text"] for entry in transcript_list])
    except Exception as e:
        logger.warning(f"YouTube transcript extraction failed for {video_id}: {e}")
        return None


def _detect_source_from_url(url: str) -> str:
    """Auto-detect content source from URL."""
    lower = url.lower()
    if "youtube.com" in lower or "youtu.be" in lower:
        return "YOUTUBE"
    if "meet.google.com" in lower:
        return "GOOGLE_MEET"
    if "zoom.us" in lower or "zoom.com" in lower:
        return "ZOOM"
    if "spotify.com" in lower or "podcasts.apple.com" in lower or "anchor.fm" in lower:
        return "PODCAST"
    if "twitter.com" in lower or "x.com" in lower:
        return "SOCIAL_MEDIA"
    if "instagram.com" in lower or "tiktok.com" in lower:
        return "SOCIAL_MEDIA"
    return "WEB_ARTICLE"


# ------------------------------------------------------------------
# Unified Ingest (recommended — auto-detects source)
# ------------------------------------------------------------------

@router.post("/ingest")
async def unified_ingest(
    req: UnifiedIngestRequest,
    background_tasks: BackgroundTasks,
    user: dict = Depends(require_auth),
    db: AsyncSession = Depends(get_db),
):
    """Unified content ingestion — paste text or a URL, system auto-classifies.

    Accepts:
    - Raw text (transcripts, articles, interview notes)
    - URLs (YouTube, Google Meet, Zoom, podcasts, articles)
    - Or both (text + source URL for attribution)

    The system auto-detects the source type and routes to ALCM for classification.
    """
    twin = (await db.execute(
        select(Twin).where(Twin.id == UUID(req.twin_id))
    )).scalar_one_or_none()
    if not twin:
        raise HTTPException(status_code=404, detail="Twin not found")

    if not req.content and not req.url:
        raise HTTPException(status_code=400, detail="Provide content text or a URL")

    # Auto-detect source and extract content from URL if possible
    source = _detect_source_from_url(req.url) if req.url else "TRANSCRIPT"
    content_text = req.content or ""
    extracted_from_url = False

    # YouTube: auto-extract transcript from video
    if source == "YOUTUBE" and req.url and not content_text:
        video_id = _extract_youtube_video_id(req.url)
        if video_id:
            transcript = _fetch_youtube_transcript(video_id)
            if transcript:
                content_text = transcript
                extracted_from_url = True
                logger.info(f"Extracted YouTube transcript ({len(transcript)} chars) from {video_id}")
            else:
                content_text = f"[YouTube video: {req.url} — transcript not available (may be disabled or private)]"
        else:
            content_text = f"[YouTube URL could not be parsed: {req.url}]"
    elif not content_text:
        content_text = f"[Content from URL: {req.url}]"

    modality = "TEXT" if (req.content or extracted_from_url) else "URL"

    contribution = TrainingContribution(
        twin_id=UUID(req.twin_id),
        contributor_id=UUID(user["id"]),
        contributor_type=user.get("role", "TALENT"),
        modality=modality,
        content=content_text,
        source_description=f"{source}: {req.title or 'Untitled'}",
        source_url=req.url,
        agent_mode="TRAINING",
        alcm_processing_status="PENDING",
        approval_status="AUTO_APPROVED",
    )
    db.add(contribution)

    db.add(AuditLog(
        actor_id=UUID(user["id"]), actor_type="TALENT", action="CONTENT_INGEST",
        entity_type="training_contribution", twin_id=UUID(req.twin_id),
        details={"source": source, "has_text": bool(req.content), "has_url": bool(req.url)},
    ))
    await db.flush()

    if content_text and twin.alcm_twin_id:
        background_tasks.add_task(
            _classify_meeting_content,
            str(contribution.id),
            str(twin.alcm_twin_id),
            content_text,
        )

    message = "Content submitted — your twin is learning from it."
    if extracted_from_url:
        message = f"YouTube transcript extracted and submitted — your twin is learning from it."
    elif source != "TRANSCRIPT" and not req.content:
        message = "URL saved. For best results, paste the text content directly — automatic extraction is available for YouTube links."

    return {
        "status": "ingested",
        "contribution_id": str(contribution.id),
        "detected_source": source,
        "extracted_from_url": extracted_from_url,
        "message": message,
    }


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
                "status": "coming_soon",
                "description": "Direct Zoom integration coming soon — paste transcripts manually for now",
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
                "status": "coming_soon",
                "description": "Automatic YouTube transcript extraction coming soon — paste transcripts manually for now",
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
