"""Attribution endpoint — apply classified data to twin's identity profile."""
import uuid
import logging
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import List
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_db
from ..models.twin_profile import TwinProfile

router = APIRouter(tags=["attribute"])
logger = logging.getLogger(__name__)


class AttributeRequest(BaseModel):
    twin_id: str
    classified_data: dict


class AttributeResponse(BaseModel):
    sub_components_updated: List[str] = []
    confidence_deltas: dict = {}


@router.post("/attribute", response_model=AttributeResponse)
async def attribute_data(req: AttributeRequest, db: AsyncSession = Depends(get_db)):
    """Apply classified data to a twin's identity profile.

    Updates the relevant delivery modules (identity_profile, knowledge_base, etc.)
    based on the classification results. Returns which sub-components were updated
    and how confidence scores changed.
    """
    try:
        twin_uuid = uuid.UUID(req.twin_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid twin_id format")

    result = await db.execute(
        select(TwinProfile).where(TwinProfile.id == twin_uuid)
    )
    profile = result.scalar_one_or_none()
    if not profile:
        raise HTTPException(status_code=404, detail="Twin not found in ALCM")

    updated_components = []
    confidence_deltas = {}

    data = req.classified_data
    correction = data.get("correction", "")
    context = data.get("context", "")

    # Apply to identity profile if personality/identity-related
    if correction or data.get("personality") or data.get("identity"):
        current = dict(profile.identity_profile or {})
        if correction:
            current.setdefault("refinements", []).append({
                "correction": correction,
                "context": context[:500],
            })
        if data.get("personality"):
            current["personality"] = {**current.get("personality", {}), **data["personality"]}
        if data.get("identity"):
            current["identity"] = {**current.get("identity", {}), **data["identity"]}
        profile.identity_profile = current
        updated_components.append("identity_profile")
        confidence_deltas["identity_profile"] = 0.02

    # Apply to knowledge base
    if data.get("knowledge"):
        current = dict(profile.knowledge_base or {})
        current.update(data["knowledge"])
        profile.knowledge_base = current
        updated_components.append("knowledge_base")
        confidence_deltas["knowledge_base"] = 0.03

    # Apply to social media data
    if data.get("social_media"):
        current = dict(profile.identity_profile or {})
        current["social_media"] = {**current.get("social_media", {}), **data["social_media"]}
        profile.identity_profile = current
        if "identity_profile" not in updated_components:
            updated_components.append("identity_profile")

    # Update confidence scores
    if updated_components:
        profile.personality_confidence = min(1.0, (profile.personality_confidence or 0.0) + 0.02)
        profile.psychographic_coverage = min(1.0, (profile.psychographic_coverage or 0.0) + 0.01)

    await db.flush()

    logger.info(f"Attribution applied to twin {req.twin_id}: {updated_components}")

    return AttributeResponse(
        sub_components_updated=updated_components,
        confidence_deltas=confidence_deltas,
    )
