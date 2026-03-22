"""Validation endpoint — personality consistency checking."""
import uuid
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_db
from ..models.twin_profile import TwinProfile
from ..services.llm_provider import get_llm_provider

router = APIRouter(tags=["validate"])


class ValidateRequest(BaseModel):
    twin_id: str
    sample_content: str
    sample_context: str = ""


class ValidateResponse(BaseModel):
    consistency_score: Optional[float] = None
    passed: Optional[bool] = None
    details: str = ""


@router.post("/validate", response_model=ValidateResponse)
async def validate_output(req: ValidateRequest, db: AsyncSession = Depends(get_db)):
    """Check if client-submitted content is consistent with the twin's personality."""
    result = await db.execute(
        select(TwinProfile).where(TwinProfile.id == uuid.UUID(req.twin_id))
    )
    profile = result.scalar_one_or_none()
    if not profile:
        raise HTTPException(status_code=404, detail="Twin not found in ALCM")

    identity = profile.identity_profile or {}
    personality = identity.get("personality", {})

    prompt = f"""You are evaluating whether the following content is consistent with a specific person's identity and personality.

Known personality traits: {personality.get('traits', [])}
Communication style: {personality.get('communication_style', 'Unknown')}
Values: {personality.get('values', [])}

Content to validate:
{req.sample_content}

Context: {req.sample_context}

Rate the personality consistency from 0.0 to 1.0 and explain briefly.
Return ONLY JSON: {{"score": 0.85, "passed": true, "details": "explanation"}}"""

    provider = get_llm_provider()
    response = await provider.generate(prompt=prompt, temperature=0.2, max_tokens=500)

    import json
    try:
        cleaned = response.strip()
        if cleaned.startswith("```"):
            cleaned = cleaned.split("\n", 1)[1] if "\n" in cleaned else cleaned[3:]
        if cleaned.endswith("```"):
            cleaned = cleaned[:-3]
        data = json.loads(cleaned.strip())
        score = float(data.get("score", 0.5))
        return ValidateResponse(
            consistency_score=score,
            passed=score >= 0.6,
            details=data.get("details", ""),
        )
    except Exception:
        return ValidateResponse(
            consistency_score=None,
            passed=None,
            details="Validation parsing failed — manual review recommended.",
        )
