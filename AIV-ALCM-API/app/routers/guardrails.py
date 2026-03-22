"""Guardrails endpoint — receive guardrail config pushes from the platform."""
import uuid
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional, List
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_db
from ..models.twin_profile import TwinProfile

router = APIRouter(tags=["guardrails"])


class GuardrailPush(BaseModel):
    blocked_topics: List[str] = []
    restricted_topics: dict = {}
    language_restrictions: List[str] = []
    min_formality: int = 0
    max_controversy: int = 100
    humor_permitted: bool = True
    humor_blacklist: List[str] = []
    require_ai_disclosure: bool = True
    disclosure_text: str = "This is an AI-generated response."


@router.post("/twin/{twin_id}/guardrails")
async def push_guardrails(
    twin_id: str, config: GuardrailPush, db: AsyncSession = Depends(get_db),
):
    """Receive updated guardrail config from the platform.

    The ALCM stores these and enforces them on every generation call.
    """
    result = await db.execute(
        select(TwinProfile).where(TwinProfile.id == uuid.UUID(twin_id))
    )
    profile = result.scalar_one_or_none()
    if not profile:
        raise HTTPException(status_code=404, detail="Twin not found in ALCM")

    profile.active_guardrails = config.dict()
    await db.flush()

    return {"confirmation": True, "propagation_status": "applied"}
