"""Classification endpoint — sends content through LLM for psychographic classification."""
import uuid
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_db
from ..models.twin_profile import TwinProfile
from ..services.llm_provider import get_llm_provider

router = APIRouter(tags=["classify"])

CLASSIFICATION_PROMPT = """You are a psychographic classifier. Analyze the following content and classify it into relevant identity categories.

Return a JSON object with:
- "categories_affected": list of categories this content informs (e.g., "personality", "knowledge", "social", "visual", "identity")
- "confidence_scores": object mapping each category to a confidence float (0.0-1.0)
- "key_insights": list of 2-5 brief insights extracted from the content
- "modality_quality": float (0.0-1.0) indicating how useful this content is for identity building

Only return valid JSON, no other text."""


class ClassifyRequest(BaseModel):
    twin_id: str
    content: str
    modality: str = "TEXT"
    source_reliability: float = 0.6


class ClassifyResponse(BaseModel):
    categories_affected: list = []
    confidence_scores: dict = {}
    processing_id: Optional[str] = None


@router.post("/classify", response_model=ClassifyResponse)
async def classify_content(req: ClassifyRequest, db: AsyncSession = Depends(get_db)):
    """Classify content for psychographic identity building."""
    result = await db.execute(
        select(TwinProfile).where(TwinProfile.id == uuid.UUID(req.twin_id))
    )
    profile = result.scalar_one_or_none()
    if not profile:
        raise HTTPException(status_code=404, detail="Twin not found in ALCM")

    provider = get_llm_provider()
    classification = await provider.classify(req.content, CLASSIFICATION_PROMPT)

    return ClassifyResponse(
        categories_affected=classification.get("categories_affected", []),
        confidence_scores=classification.get("confidence_scores", {}),
        processing_id=str(uuid.uuid4()),
    )
