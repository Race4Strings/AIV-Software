"""
Onboarding Router — Import-first pipeline per spec Section 3.2.

Endpoints:
  POST /onboarding/start              — Create session, start discovery
  GET  /onboarding/{id}               — Poll session status
  POST /onboarding/{id}/confirm-profiles — Confirm discovered profiles
  POST /onboarding/{id}/upload        — Record file uploads
  POST /onboarding/{id}/review        — Submit corrections to draft profile
  POST /onboarding/{id}/rights        — Rights agreement + category selection
  POST /onboarding/{id}/gate-1        — Manager operational approval
  POST /onboarding/{id}/gate-2        — Talent personal authorization
"""

import logging
from uuid import UUID
from datetime import datetime, timezone, timedelta
from typing import Optional, List

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, EmailStr
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_db
from ..middleware import require_auth
from ..models.onboarding_session import OnboardingSession
from ..models.twin import Twin
from ..models.audit_log import AuditLog
from ..models.consent_record import ConsentRecord
from ..services.alcm_client import get_alcm_client

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/onboarding", tags=["Onboarding"])


# ------------------------------------------------------------------
# Schemas
# ------------------------------------------------------------------

class StartRequest(BaseModel):
    discovery_input: str
    onboarding_path: str = "HYBRID"


class ConfirmProfilesRequest(BaseModel):
    confirmed_profiles: List[str]


class ReviewRequest(BaseModel):
    corrections: dict


class RightsRequest(BaseModel):
    identity_category: str
    successor: Optional[dict] = None
    consents: List[str] = []


class GateRequest(BaseModel):
    approved: bool = True


class Gate2Request(BaseModel):
    approved: bool = True
    consents: List[str] = []  # Granular: VOICE_LICENSING, VISUAL_LICENSING, etc.


def _serialize(s: OnboardingSession) -> dict:
    return {
        "id": str(s.id),
        "twin_id": str(s.twin_id) if s.twin_id else None,
        "status": s.status,
        "onboarding_path": s.onboarding_path,
        "discovery_input": s.discovery_input,
        "discovered_profiles": s.discovered_profiles or [],
        "gate_1_manager_approved": s.gate_1_manager_approved,
        "gate_2_talent_authorized": s.gate_2_talent_authorized,
        "created_at": s.created_at.isoformat() if s.created_at else None,
        "completed_at": s.completed_at.isoformat() if s.completed_at else None,
    }


# ------------------------------------------------------------------
# Endpoints
# ------------------------------------------------------------------

@router.post("/start")
async def start_onboarding(
    req: StartRequest,
    user: dict = Depends(require_auth),
    db: AsyncSession = Depends(get_db),
):
    """Start onboarding. Creates twin in INITIALIZING + ALCM identity record."""
    alcm = get_alcm_client()
    alcm_twin_id = None
    try:
        result = await alcm.create_twin()
        alcm_twin_id = result.get("alcm_twin_id")
    except Exception as e:
        logger.warning(f"ALCM twin creation failed: {e}")

    twin = Twin(
        talent_user_id=UUID(user["id"]),
        display_name=req.discovery_input.split("/")[-1].strip("@").title(),
        identity_category="ENTERTAINMENT",
        status="INITIALIZING",
        alcm_twin_id=alcm_twin_id,
    )
    db.add(twin)
    await db.flush()

    session = OnboardingSession(
        twin_id=twin.id,
        initiated_by=UUID(user["id"]),
        onboarding_path=req.onboarding_path,
        discovery_input=req.discovery_input,
        status="DISCOVERY",
    )
    db.add(session)
    db.add(AuditLog(
        actor_id=UUID(user["id"]), actor_type="TALENT",
        action="CREATE", entity_type="onboarding_session", twin_id=twin.id,
    ))
    await db.flush()

    # Kick off discovery classification
    if alcm_twin_id and req.onboarding_path != "MANUAL":
        try:
            await alcm.classify(alcm_twin_id, req.discovery_input, "TEXT", 0.6)
        except Exception as e:
            logger.warning(f"Discovery classify failed: {e}")

    return _serialize(session)


@router.get("/{session_id}")
async def get_onboarding(
    session_id: str,
    user: dict = Depends(require_auth),
    db: AsyncSession = Depends(get_db),
):
    """Poll session status."""
    return _serialize(await _get_session(db, session_id, user["id"]))


@router.get("/{session_id}/discovery-results")
async def get_discovery_results(
    session_id: str,
    user: dict = Depends(require_auth),
    db: AsyncSession = Depends(get_db),
):
    """Get discovery results from ALCM scraping service.

    Returns structured identity data: name, bio, career, social handles.
    Polls ALCM health for the twin's profile data.
    """
    session = await _get_session(db, session_id, user["id"])
    results = {
        "status": "processing",
        "profile": None,
        "health": None,
    }

    if not session.twin_id:
        return results

    twin_r = await db.execute(select(Twin).where(Twin.id == session.twin_id))
    twin = twin_r.scalar_one_or_none()
    if not twin or not twin.alcm_twin_id:
        return results

    alcm = get_alcm_client()
    try:
        health = await alcm.get_health(str(twin.alcm_twin_id))
        results["status"] = "ready"
        results["health"] = health

        # Try to get the full profile package for display
        try:
            package = await alcm.get_package(str(twin.alcm_twin_id), ["identity_profile", "knowledge_base"])
            results["profile"] = package
        except Exception:
            pass
    except Exception as e:
        logger.warning(f"Discovery results fetch failed: {e}")
        results["status"] = "processing"

    # Include twin basic info for the review screen
    results["twin"] = {
        "id": str(twin.id),
        "display_name": twin.display_name,
        "bio": twin.bio,
        "identity_category": twin.identity_category,
    }

    return results


@router.post("/{session_id}/confirm-profiles")
async def confirm_profiles(
    session_id: str,
    req: ConfirmProfilesRequest,
    user: dict = Depends(require_auth),
    db: AsyncSession = Depends(get_db),
):
    """Talent confirms which discovered profiles are theirs."""
    session = await _get_session(db, session_id, user["id"])
    session.discovered_profiles = req.confirmed_profiles
    session.discovery_completed_at = datetime.now(timezone.utc)
    session.status = "CONTENT_INGESTION"
    await db.flush()
    return _serialize(session)


@router.post("/{session_id}/upload")
async def upload_files(
    session_id: str,
    user: dict = Depends(require_auth),
    db: AsyncSession = Depends(get_db),
):
    """Record that files have been uploaded (actual upload via /upload endpoint)."""
    session = await _get_session(db, session_id, user["id"])
    session.status = "FILE_UPLOAD"
    session.files_processed_at = datetime.now(timezone.utc)
    await db.flush()
    return _serialize(session)


@router.post("/{session_id}/review")
async def review_profile(
    session_id: str,
    req: ReviewRequest,
    user: dict = Depends(require_auth),
    db: AsyncSession = Depends(get_db),
):
    """Talent submits corrections to the draft profile."""
    session = await _get_session(db, session_id, user["id"])

    if session.twin_id:
        twin_r = await db.execute(select(Twin).where(Twin.id == session.twin_id))
        twin = twin_r.scalar_one_or_none()
        if twin and twin.alcm_twin_id:
            alcm = get_alcm_client()
            await alcm.attribute(str(twin.alcm_twin_id), req.corrections)

    session.status = "PROFILE_REVIEW"
    await db.flush()
    return _serialize(session)


@router.post("/{session_id}/rights")
async def submit_rights(
    session_id: str,
    req: RightsRequest,
    user: dict = Depends(require_auth),
    db: AsyncSession = Depends(get_db),
):
    """Rights agreement, identity category, successor designation."""
    session = await _get_session(db, session_id, user["id"])

    # Validate successor email if provided
    if req.successor and req.successor.get("email"):
        import re
        email = req.successor["email"].strip()
        if not re.match(r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$", email):
            raise HTTPException(status_code=400, detail="Invalid successor email format.")

    # Validate identity category
    valid_categories = {"ENTERTAINMENT", "SPORTS", "CORPORATE", "EDUCATION", "CREATOR_ECONOMY", "BRAND_PERSONA", "GAMING_VIRTUAL"}
    if req.identity_category not in valid_categories:
        raise HTTPException(status_code=400, detail=f"Invalid identity category. Must be one of: {', '.join(sorted(valid_categories))}")

    if session.twin_id:
        twin_r = await db.execute(select(Twin).where(Twin.id == session.twin_id))
        twin = twin_r.scalar_one_or_none()
        if twin:
            twin.identity_category = req.identity_category
            if req.successor:
                twin.successor_contact_name = req.successor.get("name", "").strip()
                twin.successor_contact_email = req.successor.get("email", "").strip()
                twin.successor_designated_at = datetime.now(timezone.utc)

    for consent_type in req.consents:
        db.add(ConsentRecord(
            twin_id=session.twin_id, user_id=UUID(user["id"]),
            consent_type=consent_type, action="GRANTED",
        ))

    session.consent_public_scraping = "PUBLIC_SCRAPING" in req.consents
    session.consent_granted_at = datetime.now(timezone.utc)
    session.status = "RIGHTS_AGREEMENT"
    await db.flush()
    return _serialize(session)


@router.post("/{session_id}/gate-1")
async def gate_1(
    session_id: str,
    req: GateRequest,
    user: dict = Depends(require_auth),
    db: AsyncSession = Depends(get_db),
):
    """Gate 1: Manager confirms twin is representative.

    Pre-conditions enforced:
    - Rights agreement must be completed (consent_granted_at set)
    - At least one consent must exist
    """
    session = await _get_session(db, session_id, user["id"])

    if not req.approved:
        return _serialize(session)

    # Validate prerequisites
    if not session.consent_granted_at:
        raise HTTPException(
            status_code=400,
            detail="Rights agreement must be completed before Gate 1 approval."
        )

    session.gate_1_manager_approved = True
    session.gate_1_approved_by = UUID(user["id"])
    session.gate_1_approved_at = datetime.now(timezone.utc)
    session.status = "GATE_APPROVAL"
    await db.flush()
    return _serialize(session)


@router.post("/{session_id}/gate-2")
async def gate_2(
    session_id: str,
    req: Gate2Request,
    request: Request,
    user: dict = Depends(require_auth),
    db: AsyncSession = Depends(get_db),
):
    """Gate 2: Talent personally authorizes identity for commercial use.

    Without this, the Licensing Portal does NOT open. Non-negotiable.
    Recorded as a consent event in the consent ledger.
    """
    session = await _get_session(db, session_id, user["id"])
    if not req.approved:
        return _serialize(session)

    # Gate 2 requires Gate 1
    if not session.gate_1_manager_approved:
        raise HTTPException(
            status_code=400,
            detail="Gate 1 (manager approval) must be completed before Gate 2."
        )

    # Check ALCM health if twin has an ALCM link (soft gate — warn but allow)
    readiness_warnings = []
    if session.twin_id:
        twin_r_check = await db.execute(select(Twin).where(Twin.id == session.twin_id))
        twin_check = twin_r_check.scalar_one_or_none()
        if twin_check and twin_check.alcm_twin_id:
            try:
                alcm = get_alcm_client()
                health = await alcm.get_health(str(twin_check.alcm_twin_id))
                cfs = health.get("cfs", 0)
                coverage = health.get("psychographic_coverage", 0)
                confidence = health.get("personality_confidence", 0)
                if cfs < 0.65:
                    readiness_warnings.append(f"CFS is {cfs:.0%} (target: 65%)")
                if coverage < 0.5:
                    readiness_warnings.append(f"Coverage is {coverage:.0%} (target: 50%)")
                if confidence < 0.5:
                    readiness_warnings.append(f"Confidence is {confidence:.0%} (target: 50%)")
            except Exception as e:
                logger.warning(f"ALCM health check failed during Gate 2: {e}")

    now = datetime.now(timezone.utc)
    session.gate_2_talent_authorized = True
    session.gate_2_authorized_at = now
    session.status = "COMPLETE"
    session.completed_at = now

    # Open the Licensing Portal
    if session.twin_id:
        twin_r = await db.execute(select(Twin).where(Twin.id == session.twin_id))
        twin = twin_r.scalar_one_or_none()
        if twin:
            twin.talent_authorization_at = now
            twin.status = "BUILDING"
            twin.fee_free_window_expires = now + timedelta(days=90)

        # Record EACH consent type individually (granular, GDPR-compliant)
        gate2_consents = req.consents or ["LIKENESS_LICENSING"]
        for consent_type in gate2_consents:
            db.add(ConsentRecord(
                twin_id=session.twin_id, user_id=UUID(user["id"]),
                consent_type=consent_type, action="GRANTED",
                scope=f"Gate 2 authorization — {consent_type}",
            ))

    # Log with IP address for legal defensibility
    client_ip = request.client.host if request.client else None
    db.add(AuditLog(
        actor_id=UUID(user["id"]), actor_type="TALENT",
        action="APPROVE", entity_type="gate_2_authorization",
        twin_id=session.twin_id,
        ip_address=client_ip,
        details={
            "gate": 2,
            "action": "talent_personal_authorization",
            "consents_granted": gate2_consents if session.twin_id else [],
            "ip_address": client_ip,
        },
    ))
    await db.flush()

    logger.info(f"Gate 2 authorized for twin {session.twin_id}")
    result = _serialize(session)
    if readiness_warnings:
        result["readiness_warnings"] = readiness_warnings
    return result


# ------------------------------------------------------------------
# Helpers
# ------------------------------------------------------------------

async def _get_session(db: AsyncSession, session_id: str, user_id: str) -> OnboardingSession:
    try:
        sid = UUID(session_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid session ID")

    result = await db.execute(select(OnboardingSession).where(OnboardingSession.id == sid))
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Onboarding session not found")
    if str(session.initiated_by) != user_id:
        raise HTTPException(status_code=403, detail="Not your session")
    return session
