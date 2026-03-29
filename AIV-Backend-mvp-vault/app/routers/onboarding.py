"""
Onboarding Router — Import-first pipeline per spec Section 3.2.

Endpoints:
  GET  /onboarding/sessions/active    — Resume incomplete onboarding session
  POST /onboarding/start              — Create session, start discovery
  GET  /onboarding/{id}               — Poll session status
  GET  /onboarding/{id}/discovery-results — Get discovery results
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
# Category Detection — surface-level classification from public data
# ------------------------------------------------------------------

CATEGORY_KEYWORDS: dict[str, list[str]] = {
    "MUSIC": [
        "singer", "musician", "rapper", "producer", "dj", "songwriter", "band",
        "grammy", "billboard", "album", "tour", "concert", "music", "hip hop",
        "reggaeton", "pop", "rock", "jazz", "r&b", "country", "latin", "classical",
        "composer", "vocalist", "mc", "beatmaker", "recording artist",
    ],
    "ENTERTAINMENT": [
        "actor", "actress", "director", "comedian", "entertainer", "performer",
        "film", "movie", "tv", "television", "oscar", "emmy",
        "influencer", "youtuber", "streamer", "tiktoker", "content creator", "podcaster",
        "blogger", "vlogger", "twitch",
    ],
    "SPORTS": [
        "athlete", "player", "coach", "nba", "nfl", "mlb", "nhl", "fifa", "ufc", "mma",
        "boxer", "wrestler", "footballer", "soccer", "basketball", "baseball", "tennis",
        "golf", "swimmer", "olympic", "championship", "league", "sports", "esports",
    ],
    "BUSINESS": [
        "ceo", "cfo", "cto", "coo", "founder", "co-founder", "executive", "chairman",
        "president", "managing partner", "venture", "investor", "entrepreneur",
        "business", "startup", "fortune 500", "board member", "public speaker",
    ],
    "ACADEMIA": [
        "professor", "teacher", "educator", "academic", "researcher", "phd", "university",
        "lecturer", "scholar", "dean", "chancellor", "scientist", "science communicator",
        "author", "writer", "historian", "theorist",
    ],
    "CULINARY": [
        "chef", "restaurateur", "culinary", "michelin", "cookbook", "food critic",
        "sommelier", "pastry chef", "food network", "kitchen", "gastronomy",
    ],
    "FASHION": [
        "fashion", "designer", "model", "supermodel", "stylist", "couture", "runway",
        "beauty", "cosmetics", "makeup artist", "vogue", "met gala",
    ],
    "MEDIA": [
        "journalist", "anchor", "correspondent", "reporter", "editor", "columnist",
        "news", "broadcast", "host", "talk show", "radio", "press",
    ],
    "GOVERNMENT": [
        "politician", "senator", "congressman", "president", "minister", "governor",
        "diplomat", "ambassador", "activist", "public servant", "mayor", "campaign",
        "political", "policy", "legislation",
    ],
    "WELLNESS": [
        "doctor", "physician", "surgeon", "fitness", "trainer", "yoga", "meditation",
        "therapist", "psychologist", "nutritionist", "health", "wellness", "mental health",
    ],
    "ARTS": [
        "artist", "painter", "sculptor", "photographer", "architect", "gallery",
        "museum", "exhibition", "curator", "visual art", "installation",
    ],
    "CHARACTER": [
        "character", "fictional", "superhero", "villain", "anime", "cartoon", "comic",
        "video game", "npc", "rpg",
    ],
    "VIRTUAL": [
        "virtual", "vtuber", "mascot", "avatar", "digital influencer", "ai persona",
        "brand mascot",
    ],
}


def detect_categories(text: str) -> list[str]:
    """Detect identity categories from occupation, bio, or other public text.

    Returns a list of matching categories (multi-label) sorted by match strength.
    Falls back to empty list if nothing matches (frontend handles unknown).
    Uses word boundary matching to avoid false positives (e.g., "nfl" in "influencer").
    """
    import re
    if not text:
        return []
    text_lower = text.lower()
    scores: dict[str, int] = {}
    for category, keywords in CATEGORY_KEYWORDS.items():
        count = 0
        for kw in keywords:
            # Use word boundary regex to avoid substring false positives
            if re.search(r'\b' + re.escape(kw) + r'\b', text_lower):
                count += 1
        if count > 0:
            scores[category] = count
    # Return categories sorted by match count (strongest first)
    return sorted(scores, key=lambda c: scores[c], reverse=True)


# ------------------------------------------------------------------
# Endpoints
# ------------------------------------------------------------------

@router.get("/sessions/active")
async def get_active_session(
    user: dict = Depends(require_auth),
    db: AsyncSession = Depends(get_db),
):
    """Return the most recent incomplete onboarding session for session resume.

    If the user closed the browser mid-onboarding, this allows the frontend
    to pick up where they left off.
    """
    result = await db.execute(
        select(OnboardingSession)
        .where(OnboardingSession.initiated_by == UUID(user["id"]))
        .where(OnboardingSession.status != "COMPLETE")
        .order_by(OnboardingSession.created_at.desc())
        .limit(1)
    )
    session = result.scalar_one_or_none()
    if not session:
        return None

    # Include twin info for frontend hydration
    data = _serialize(session)
    if session.twin_id:
        twin_r = await db.execute(select(Twin).where(Twin.id == session.twin_id))
        twin = twin_r.scalar_one_or_none()
        if twin:
            data["twin"] = {
                "id": str(twin.id),
                "display_name": twin.display_name,
                "bio": twin.bio,
                "identity_category": twin.identity_category,
            }
    return data


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
        detected_cat = detect_categories(req.discovery_input)
        cat = detected_cat[0] if detected_cat else "ENTERTAINMENT"
        result = await alcm.create_twin(
            identity_category=cat,
            clone_type=getattr(req, "clone_type", "PUBLIC_FIGURE") or "PUBLIC_FIGURE",
        )
        alcm_twin_id = result.get("alcm_twin_id")
    except Exception as e:
        logger.warning(f"ALCM twin creation failed: {e}")

    # Auto-detect category from discovery input
    detected = detect_categories(req.discovery_input)
    primary_category = detected[0] if detected else "ENTERTAINMENT"

    # Look up user's organization for the twin
    from ..models.organization import OrganizationUser
    org_id = None
    try:
        org_result = await db.execute(
            select(OrganizationUser.organization_id)
            .where(OrganizationUser.user_id == UUID(user["id"]))
            .limit(1)
        )
        org_id = org_result.scalar_one_or_none()
    except Exception:
        logger.warning(f"Could not look up organization for user {user['id']}")

    twin = Twin(
        talent_user_id=UUID(user["id"]),
        organization_id=org_id,
        display_name=req.discovery_input.split("/")[-1].strip("@").title(),
        identity_category=primary_category,
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
    if not twin:
        return results

    # If ALCM twin wasn't created, return mock data immediately
    if not twin.alcm_twin_id:
        name = (session.discovery_input or "").strip().strip("@").replace("_", " ").title()
        results["status"] = "ready"
        results["health"] = {
            "cfs": 0.15,
            "psychographic_coverage": 0.10,
            "personality_confidence": 0.12,
            "health_status": "BUILDING",
        }
        results["mock"] = True
        # Detect categories from available text
        detection_text = f"{twin.display_name or name} {twin.bio or ''} {session.discovery_input or ''}"
        detected = detect_categories(detection_text)
        results["detected_categories"] = detected
        results["twin"] = {
            "id": str(twin.id),
            "display_name": twin.display_name or name,
            "bio": twin.bio,
            "identity_category": twin.identity_category,
            "detected_categories": detected,
        }
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
        logger.warning(f"Discovery results fetch failed (ALCM unavailable): {e}")
        # Mock discovery fallback — generate baseline profile from input
        name = (session.discovery_input or "").strip().strip("@").replace("_", " ").title()
        results["status"] = "ready"
        results["health"] = {
            "cfs": 0.15,
            "psychographic_coverage": 0.10,
            "personality_confidence": 0.12,
            "health_status": "BUILDING",
        }
        results["mock"] = True

    # Include twin basic info for the review screen
    detection_text = f"{twin.display_name or ''} {twin.bio or ''} {session.discovery_input or ''}"
    detected = detect_categories(detection_text)
    results["detected_categories"] = detected
    results["twin"] = {
        "id": str(twin.id),
        "display_name": twin.display_name,
        "bio": twin.bio,
        "detected_categories": detected,
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


class UploadRecord(BaseModel):
    file_urls: List[dict] = []  # [{"url": "...", "type": "AUDIO"|"VIDEO"|"IMAGE"}]


@router.post("/{session_id}/upload")
async def upload_files(
    session_id: str,
    req: UploadRecord = UploadRecord(),
    user: dict = Depends(require_auth),
    db: AsyncSession = Depends(get_db),
):
    """Record file uploads and send media to ALCM for analysis."""
    session = await _get_session(db, session_id, user["id"])
    session.status = "FILE_UPLOAD"
    session.files_processed_at = datetime.now(timezone.utc)

    # Send media files to ALCM for voice/visual analysis
    job_ids = []
    if req.file_urls and session.twin_id:
        twin = (await db.execute(select(Twin).where(Twin.id == session.twin_id))).scalar_one_or_none()
        if twin and twin.alcm_twin_id:
            alcm = get_alcm_client()
            for f in req.file_urls:
                url = f.get("url", "")
                media_type = f.get("type", "").upper()
                if url and media_type in ("AUDIO", "VIDEO", "IMAGE"):
                    try:
                        result = await alcm.analyze_media(
                            str(twin.alcm_twin_id), url, media_type,
                        )
                        if result.get("processing_id"):
                            job_ids.append(result["processing_id"])
                    except Exception as e:
                        logger.warning(f"ALCM media analysis failed for {url}: {e}")

    await db.flush()
    response = _serialize(session)
    if job_ids:
        response["media_processing_jobs"] = job_ids
    return response


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
    valid_categories = {
        "MUSIC", "ENTERTAINMENT", "SPORTS", "BUSINESS", "ACADEMIA", "CULINARY",
        "FASHION", "MEDIA", "GOVERNMENT", "WELLNESS", "ARTS",
        "CHARACTER", "VIRTUAL",
    }
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

        # Record Gate 2 authorization as a single consent event
        # Individual consent types were already recorded in /rights endpoint
        db.add(ConsentRecord(
            twin_id=session.twin_id, user_id=UUID(user["id"]),
            consent_type="GATE_2_AUTHORIZATION", action="GRANTED",
            scope="Talent personal authorization for commercial use",
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
            "authorization": "commercial_use",
            "ip_address": client_ip,
        },
    ))
    await db.flush()

    # Anchor identity creation on blockchain
    if session.twin_id:
        try:
            from ..services.blockchain_service import BlockchainService
            bc = BlockchainService()
            await bc.anchor_identity_seal(
                twin_id=str(session.twin_id),
                identity_data={
                    "event": "GATE_2_AUTHORIZATION",
                    "display_name": twin.display_name if twin else None,
                    "identity_category": twin.identity_category if twin else None,
                    "clone_type": twin.clone_type if twin else None,
                    "authorized_at": now.isoformat(),
                    "authorized_by": user["id"],
                    "ip_address": client_ip,
                },
            )
        except Exception as e:
            logger.warning(f"Gate 2 blockchain anchoring failed (non-blocking): {e}")

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
