"""Generation endpoints — identity-consistent text generation."""
import json
import uuid
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_db
from ..models.twin_profile import TwinProfile
from ..services.llm_provider import get_llm_provider

router = APIRouter(tags=["generate"])


class GenerateRequest(BaseModel):
    twin_id: str
    context: str
    guardrails: dict = {}
    mode: str = "conversation"


class GenerateResponse(BaseModel):
    response_text: str
    personality_consistency_score: Optional[float] = None
    metadata: dict = {}


def _build_identity_prompt(profile: TwinProfile, guardrails: dict) -> str:
    """Build a system prompt from the twin's identity profile."""
    identity = profile.identity_profile or {}
    personality = identity.get("personality", {})
    knowledge = profile.knowledge_base or {}

    parts = ["You are embodying a specific identity. Stay faithful to this person's personality and knowledge."]

    if identity.get("identity", {}).get("public_bio"):
        parts.append(f"Bio: {identity['identity']['public_bio']}")

    if personality.get("communication_style"):
        parts.append(f"Communication style: {personality['communication_style']}")

    if personality.get("values"):
        parts.append(f"Core values: {', '.join(personality['values'])}")

    # Apply guardrails
    blocked = guardrails.get("blocked_topics", [])
    if blocked:
        parts.append(f"NEVER discuss: {', '.join(blocked)}")

    if guardrails.get("require_ai_disclosure", True):
        disclosure = guardrails.get("disclosure_text", "This is an AI-generated response.")
        parts.append(f"If asked, acknowledge: {disclosure}")

    return "\n".join(parts)


@router.post("/generate", response_model=GenerateResponse)
async def generate(req: GenerateRequest, db: AsyncSession = Depends(get_db)):
    """Generate identity-consistent text."""
    result = await db.execute(
        select(TwinProfile).where(TwinProfile.id == uuid.UUID(req.twin_id))
    )
    profile = result.scalar_one_or_none()
    if not profile:
        raise HTTPException(status_code=404, detail="Twin not found in ALCM")

    provider = get_llm_provider()
    identity_context = _build_identity_prompt(profile, req.guardrails)
    response_text = await provider.generate(
        prompt=req.context,
        context=identity_context,
        temperature=0.7,
    )

    return GenerateResponse(
        response_text=response_text,
        personality_consistency_score=None,  # Phase 1: no validation yet
        metadata={"mode": req.mode},
    )


@router.post("/generate/stream")
async def generate_stream(req: GenerateRequest, db: AsyncSession = Depends(get_db)):
    """Stream identity-consistent text via SSE."""
    result = await db.execute(
        select(TwinProfile).where(TwinProfile.id == uuid.UUID(req.twin_id))
    )
    profile = result.scalar_one_or_none()
    if not profile:
        raise HTTPException(status_code=404, detail="Twin not found in ALCM")

    provider = get_llm_provider()
    identity_context = _build_identity_prompt(profile, req.guardrails)

    async def event_stream():
        try:
            async for chunk in provider.generate_stream(
                prompt=req.context,
                context=identity_context,
                temperature=0.7,
            ):
                yield f"data: {json.dumps({'text': chunk})}\n\n"
        except Exception as e:
            yield f"data: {json.dumps({'error': f'Stream failed: {type(e).__name__}'})}\n\n"
        yield "data: [DONE]\n\n"

    return StreamingResponse(event_stream(), media_type="text/event-stream")
