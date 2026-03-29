"""Guardrails & Licensing Rules router per spec Section 3.4."""
import logging
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional, List
from sqlalchemy import select, desc
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_db
from ..middleware import require_auth
from ..middleware.permissions import require_role
from ..models.twin import Twin
from ..models.guardrail_config import GuardrailConfig
from ..models.licensing_rules_config import LicensingRulesConfig
from ..services.alcm_client import get_alcm_client

logger = logging.getLogger(__name__)
router = APIRouter(tags=["Configuration"])


def _serialize_guardrail(g: GuardrailConfig) -> dict:
    return {
        "id": str(g.id), "twin_id": str(g.twin_id), "version": g.version,
        "blocked_topics": g.blocked_topics or [], "restricted_topics": g.restricted_topics or {},
        "language_restrictions": g.language_restrictions or [],
        "min_formality": g.min_formality, "max_controversy": g.max_controversy,
        "humor_permitted": g.humor_permitted, "humor_blacklist": g.humor_blacklist or [],
        "require_ai_disclosure": g.require_ai_disclosure,
        "disclosure_text": g.disclosure_text,
        "is_active": g.is_active,
        "created_at": g.created_at.isoformat() if g.created_at else None,
    }


def _serialize_licensing(l: LicensingRulesConfig) -> dict:
    return {
        "id": str(l.id), "twin_id": str(l.twin_id), "version": l.version,
        "pricing_floor": float(l.pricing_floor) if l.pricing_floor else None,
        "currency": l.currency,
        "territory_restrictions": l.territory_restrictions or [],
        "blacklisted_use_cases": l.blacklisted_use_cases or [],
        "permitted_use_cases": l.permitted_use_cases or [],
        "exclusivity_available": l.exclusivity_available,
        "auto_approve_threshold": l.auto_approve_threshold,
        "default_grace_period_hours": l.default_grace_period_hours,
        "is_active": l.is_active,
        "created_at": l.created_at.isoformat() if l.created_at else None,
    }


# ------------------------------------------------------------------
# Guardrails
# ------------------------------------------------------------------

@router.get("/twins/{twin_id}/guardrails")
async def get_guardrails(
    twin_id: str, user: dict = Depends(require_auth), db: AsyncSession = Depends(get_db),
):
    """Get active guardrail config + version history."""
    result = await db.execute(
        select(GuardrailConfig).where(GuardrailConfig.twin_id == UUID(twin_id))
        .order_by(desc(GuardrailConfig.version))
    )
    configs = list(result.scalars().all())
    active = next((c for c in configs if c.is_active), None)
    return {
        "config": _serialize_guardrail(active) if active else None,
        "history": [_serialize_guardrail(c) for c in configs],
    }


class GuardrailUpdate(BaseModel):
    blocked_topics: Optional[List[str]] = None
    restricted_topics: Optional[dict] = None
    language_restrictions: Optional[List[str]] = None
    min_formality: Optional[int] = None
    max_controversy: Optional[int] = None
    humor_permitted: Optional[bool] = None
    humor_blacklist: Optional[List[str]] = None
    require_ai_disclosure: Optional[bool] = None
    disclosure_text: Optional[str] = None


@router.post("/twins/{twin_id}/guardrails")
async def update_guardrails(
    twin_id: str, req: GuardrailUpdate,
    user: dict = Depends(require_role("ADMIN")), db: AsyncSession = Depends(get_db),
):
    """Create new guardrail version. Requires ADMIN or OWNER role."""
    tid = UUID(twin_id)

    # Deactivate current
    current = await db.execute(
        select(GuardrailConfig).where(GuardrailConfig.twin_id == tid, GuardrailConfig.is_active.is_(True))
    )
    for old in current.scalars().all():
        old.is_active = False

    # Get next version
    ver_result = await db.execute(
        select(GuardrailConfig.version).where(GuardrailConfig.twin_id == tid)
        .order_by(desc(GuardrailConfig.version)).limit(1)
    )
    next_ver = (ver_result.scalar() or 0) + 1

    config = GuardrailConfig(
        twin_id=tid, version=next_ver, configured_by=UUID(user["id"]),
        blocked_topics=req.blocked_topics or [],
        restricted_topics=req.restricted_topics or {},
        language_restrictions=req.language_restrictions or [],
        min_formality=req.min_formality or 0,
        max_controversy=req.max_controversy or 100,
        humor_permitted=req.humor_permitted if req.humor_permitted is not None else True,
        humor_blacklist=req.humor_blacklist or [],
        require_ai_disclosure=req.require_ai_disclosure if req.require_ai_disclosure is not None else True,
        disclosure_text=req.disclosure_text or "This is an AI-generated response.",
        is_active=True,
    )
    db.add(config)
    await db.flush()

    # Push to ALCM API
    twin_r = await db.execute(select(Twin).where(Twin.id == tid))
    twin = twin_r.scalar_one_or_none()
    if twin and twin.alcm_twin_id:
        alcm = get_alcm_client()
        await alcm.push_guardrails(str(twin.alcm_twin_id), _serialize_guardrail(config))

    return _serialize_guardrail(config)


# ------------------------------------------------------------------
# Licensing Rules
# ------------------------------------------------------------------

@router.get("/twins/{twin_id}/licensing-rules")
async def get_licensing_rules(
    twin_id: str, user: dict = Depends(require_auth), db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(LicensingRulesConfig).where(LicensingRulesConfig.twin_id == UUID(twin_id))
        .order_by(desc(LicensingRulesConfig.version))
    )
    configs = list(result.scalars().all())
    active = next((c for c in configs if c.is_active), None)
    return {
        "config": _serialize_licensing(active) if active else None,
        "history": [_serialize_licensing(c) for c in configs],
    }


class LicensingRulesUpdate(BaseModel):
    pricing_floor: Optional[float] = None
    currency: Optional[str] = None
    territory_restrictions: Optional[List[str]] = None
    blacklisted_use_cases: Optional[List[str]] = None
    permitted_use_cases: Optional[List[str]] = None
    exclusivity_available: Optional[bool] = None
    default_grace_period_hours: Optional[int] = None


@router.post("/twins/{twin_id}/licensing-rules")
async def update_licensing_rules(
    twin_id: str, req: LicensingRulesUpdate,
    user: dict = Depends(require_role("ADMIN")), db: AsyncSession = Depends(get_db),
):
    tid = UUID(twin_id)

    current = await db.execute(
        select(LicensingRulesConfig).where(LicensingRulesConfig.twin_id == tid, LicensingRulesConfig.is_active.is_(True))
    )
    for old in current.scalars().all():
        old.is_active = False

    ver_result = await db.execute(
        select(LicensingRulesConfig.version).where(LicensingRulesConfig.twin_id == tid)
        .order_by(desc(LicensingRulesConfig.version)).limit(1)
    )
    next_ver = (ver_result.scalar() or 0) + 1

    config = LicensingRulesConfig(
        twin_id=tid, version=next_ver, configured_by=UUID(user["id"]),
        pricing_floor=req.pricing_floor,
        currency=req.currency or "USD",
        territory_restrictions=req.territory_restrictions or [],
        blacklisted_use_cases=req.blacklisted_use_cases or [],
        permitted_use_cases=req.permitted_use_cases or [],
        exclusivity_available=req.exclusivity_available or False,
        default_grace_period_hours=req.default_grace_period_hours or 48,
        is_active=True,
    )
    db.add(config)
    await db.flush()
    return _serialize_licensing(config)
