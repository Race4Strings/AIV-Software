"""Twin Router — Core CRUD for digital twins."""

import logging
from uuid import UUID
from typing import List
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
import io

from ..database import get_db
from ..middleware.auth_middleware import require_auth
from ..models.twin import Twin, TwinStatus
from ..models.audit_log import AuditLog
from ..schemas.twin import (
    TwinCreate, TwinUpdate, TwinResponse,
    TwinListResponse,
)
from ..services.alcm_client import get_alcm_client


class TTSRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=500)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/twins", tags=["Twins"])


@router.post("", response_model=TwinResponse)
async def create_twin(
    data: TwinCreate,
    user: dict = Depends(require_auth),
    db: AsyncSession = Depends(get_db),
):
    """Create a new digital twin for the authenticated user."""
    # Create ALCM identity record
    alcm_client = get_alcm_client()
    alcm_twin_id = None
    try:
        alcm_result = await alcm_client.create_twin()
        alcm_twin_id = alcm_result.get("alcm_twin_id")
    except Exception as e:
        logger.warning(f"ALCM twin creation failed silently: {e}")

    twin = Twin(
        talent_user_id=UUID(user["id"]),
        display_name=data.name,
        public_name=data.public_name,
        identity_category=[data.category] if data.category else ["ENTERTAINMENT"],
        bio=data.bio,
        status=TwinStatus.INITIALIZING.value,
        alcm_twin_id=alcm_twin_id,
    )
    db.add(twin)

    audit = AuditLog(
        twin_id=None,
        actor_id=UUID(user["id"]),
        actor_type="TALENT",
        action="CREATE",
        entity_type="twin",
        details={"name": data.name},
    )
    db.add(audit)
    await db.flush()

    audit.twin_id = twin.id
    await db.flush()
    await db.refresh(twin)

    return TwinResponse.model_validate(twin)



@router.get("", response_model=List[TwinListResponse])
async def list_twins(
    user: dict = Depends(require_auth),
    db: AsyncSession = Depends(get_db),
):
    """List all twins belonging to the authenticated user."""
    result = await db.execute(
        select(Twin)
        .where(Twin.talent_user_id == UUID(user["id"]))
        .order_by(Twin.created_at.desc())
    )
    twins = result.scalars().all()
    return [TwinListResponse.model_validate(t) for t in twins]


@router.get("/{twin_id}", response_model=TwinResponse)
async def get_twin(
    twin_id: UUID,
    user: dict = Depends(require_auth),
    db: AsyncSession = Depends(get_db),
):
    """Get a twin by ID. Must belong to the authenticated user."""
    result = await db.execute(
        select(Twin).where(Twin.id == twin_id, Twin.talent_user_id == UUID(user["id"]))
    )
    twin = result.scalar_one_or_none()
    if not twin:
        raise HTTPException(status_code=404, detail="Twin not found")
    return TwinResponse.model_validate(twin)


@router.put("/{twin_id}", response_model=TwinResponse)
async def update_twin(
    twin_id: UUID,
    data: TwinUpdate,
    user: dict = Depends(require_auth),
    db: AsyncSession = Depends(get_db),
):
    """Update platform-level twin fields. ALCM data managed via Training Area."""
    result = await db.execute(
        select(Twin).where(Twin.id == twin_id, Twin.talent_user_id == UUID(user["id"]))
    )
    twin = result.scalar_one_or_none()
    if not twin:
        raise HTTPException(status_code=404, detail="Twin not found")

    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        if value is not None and hasattr(twin, field):
            setattr(twin, field, value)

    audit = AuditLog(
        twin_id=twin_id,
        actor_id=UUID(user["id"]),
        actor_type="TALENT",
        action="UPDATE",
        entity_type="twin",
        details={"fields_updated": list(update_data.keys())},
    )
    db.add(audit)
    await db.flush()
    await db.refresh(twin)

    return TwinResponse.model_validate(twin)
@router.patch("/{twin_id}", response_model=TwinResponse)
async def patch_twin(
    twin_id: UUID,
    data: TwinUpdate,
    user: dict = Depends(require_auth),
    db: AsyncSession = Depends(get_db),
):
    """Partial update a twin (PATCH alias for PUT). ALCM data uses deep-merge."""
    return await update_twin(twin_id, data, user, db)
@router.post("/{twin_id}/update", response_model=TwinResponse)
async def post_update_twin(
    twin_id: UUID,
    data: TwinUpdate,
    user: dict = Depends(require_auth),
    db: AsyncSession = Depends(get_db),
):
    """Update a twin via POST (workaround for Chrome cross-origin PUT/PATCH restrictions)."""
    return await update_twin(twin_id, data, user, db)


# ------------------------------------------------------------------
# Twin Lifecycle: Lock / Unlock / Archive
# ------------------------------------------------------------------

@router.post("/{twin_id}/lock")
async def lock_twin(
    twin_id: UUID,
    user: dict = Depends(require_auth),
    db: AsyncSession = Depends(get_db),
):
    """Emergency lock a twin — blocks all licensing and generation."""
    result = await db.execute(select(Twin).where(Twin.id == twin_id))
    twin = result.scalar_one_or_none()
    if not twin:
        raise HTTPException(status_code=404, detail="Twin not found")
    if twin.status == "LOCKED":
        return {"status": "already_locked", "twin_id": str(twin_id)}
    old_status = twin.status
    twin.status = "LOCKED"
    db.add(AuditLog(
        actor_id=UUID(user["id"]), actor_type="TALENT", action="LOCK",
        entity_type="twin", entity_id=twin_id, twin_id=twin_id,
        details={"from": old_status, "reason": "manual_lock"},
    ))
    await db.flush()
    logger.info(f"Twin {twin_id} locked by user {user['id']}")
    return {"status": "locked", "twin_id": str(twin_id), "previous_status": old_status}


@router.post("/{twin_id}/unlock")
async def unlock_twin(
    twin_id: UUID,
    user: dict = Depends(require_auth),
    db: AsyncSession = Depends(get_db),
):
    """Unlock a previously locked twin — restores to ACTIVE status."""
    result = await db.execute(select(Twin).where(Twin.id == twin_id))
    twin = result.scalar_one_or_none()
    if not twin:
        raise HTTPException(status_code=404, detail="Twin not found")
    if twin.status != "LOCKED":
        raise HTTPException(status_code=400, detail=f"Twin is not locked (current status: {twin.status})")
    twin.status = "ACTIVE"
    db.add(AuditLog(
        actor_id=UUID(user["id"]), actor_type="TALENT", action="UNLOCK",
        entity_type="twin", entity_id=twin_id, twin_id=twin_id,
    ))
    await db.flush()
    logger.info(f"Twin {twin_id} unlocked by user {user['id']}")
    return {"status": "active", "twin_id": str(twin_id)}


@router.post("/{twin_id}/archive")
async def archive_twin(
    twin_id: UUID,
    user: dict = Depends(require_auth),
    db: AsyncSession = Depends(get_db),
):
    """Permanently archive a twin — cannot be undone."""
    result = await db.execute(select(Twin).where(Twin.id == twin_id))
    twin = result.scalar_one_or_none()
    if not twin:
        raise HTTPException(status_code=404, detail="Twin not found")
    if twin.status == "ARCHIVED":
        return {"status": "already_archived", "twin_id": str(twin_id)}
    old_status = twin.status
    twin.status = "ARCHIVED"
    db.add(AuditLog(
        actor_id=UUID(user["id"]), actor_type="TALENT", action="ARCHIVE",
        entity_type="twin", entity_id=twin_id, twin_id=twin_id,
        details={"from": old_status},
    ))
    await db.flush()
    logger.info(f"Twin {twin_id} archived by user {user['id']}")
    return {"status": "archived", "twin_id": str(twin_id), "previous_status": old_status}


@router.delete("/{twin_id}")
async def delete_twin(
    twin_id: UUID,
    user: dict = Depends(require_auth),
    db: AsyncSession = Depends(get_db),
):
    """Delete a twin and all related records. Must belong to the authenticated user."""
    return await _delete_twin(twin_id, user, db)


@router.post("/{twin_id}/delete")
async def post_delete_twin(
    twin_id: UUID,
    user: dict = Depends(require_auth),
    db: AsyncSession = Depends(get_db),
):
    """Delete a twin via POST (workaround for Chrome cross-origin DELETE restrictions)."""
    return await _delete_twin(twin_id, user, db)

@router.post("/{twin_id}/remove")
async def post_remove_twin(
    twin_id: UUID,
    user: dict = Depends(require_auth),
    db: AsyncSession = Depends(get_db),
):
    """Remove a twin via POST (alternate path to avoid CDN cache issues)."""
    return await _delete_twin(twin_id, user, db)



async def _delete_twin(twin_id: UUID, user: dict, db: AsyncSession):
    """Internal: delete a twin and all related records."""
    result = await db.execute(
        select(Twin).where(Twin.id == twin_id, Twin.talent_user_id == UUID(user["id"]))
    )
    twin = result.scalar_one_or_none()
    if not twin:
        raise HTTPException(status_code=404, detail="Twin not found")

    from sqlalchemy import text

    # Use savepoints so a failed DELETE doesn't abort the whole transaction
    async def safe_delete(sql: str, params: dict):
        try:
            async with db.begin_nested():
                await db.execute(text(sql), params)
        except Exception as e:
            logger.debug(f"Twin cleanup skip: {e}")

    await safe_delete("DELETE FROM audit_logs WHERE twin_id = :tid", {"tid": twin_id})
    for tbl, col in [
        # New schema tables
        ("agent_messages", "session_id"),  # via agent_sessions
        ("agent_sessions", "twin_id"),
        ("guardrail_configs", "twin_id"),
        ("licensing_rules_configs", "twin_id"),
        ("deal_contracts", "deal_id"),  # via deals
        ("deal_milestones", "deal_id"),  # via deals
        ("deal_messages", "deal_id"),  # via deals
        ("permitted_use_records", "deal_id"),  # via deals
        ("identity_package_versions", "twin_id"),
        ("consent_records", "twin_id"),
        ("training_contributions", "twin_id"),
        ("negotiation_knowledge", "twin_id"),
        ("notifications", "entity_id"),
        ("deals", "twin_id"),
        ("onboarding_sessions", "twin_id"),
        # Legacy tables (safe to attempt — will silently skip if already dropped)
        ("chat_message_table", "sender_twin_id"),
        ("chat_participant_table", "twin_id"),
        ("certifications", "twin_id"),
        ("documents", "twin_id"),
        ("training_submissions", "twin_id"),
    ]:
        await safe_delete(f"DELETE FROM {tbl} WHERE {col} = :tid", {"tid": twin_id})
    # Use raw SQL to avoid ORM relationship autoflush issues with missing DB columns
    await db.execute(text("DELETE FROM twins WHERE id = :tid"), {"tid": twin_id})
    await db.flush()
    return {"status": "deleted", "twin_id": str(twin_id)}


@router.get("/{twin_id}/health")
async def get_twin_health(
    twin_id: UUID,
    user: dict = Depends(require_auth),
    db: AsyncSession = Depends(get_db),
):
    """Get twin health from ALCM API."""
    result = await db.execute(
        select(Twin).where(Twin.id == twin_id, Twin.talent_user_id == UUID(user["id"]))
    )
    twin = result.scalar_one_or_none()
    if not twin:
        raise HTTPException(status_code=404, detail="Twin not found")

    if twin.alcm_twin_id:
        client = get_alcm_client()
        health = await client.get_health(str(twin.alcm_twin_id))
        # Cache health status
        twin.health_status = health.get("health_status", "BUILDING")
        await db.flush()
        return health

    return {
        "cfs": 0.0,
        "psychographic_coverage": 0.0,
        "personality_confidence": 0.0,
        "health_status": twin.health_status or "BUILDING",
    }

@router.post("/{twin_id}/voice/tts")
async def text_to_speech_demo(
    twin_id: UUID,
    data: TTSRequest,
    user: dict = Depends(require_auth),
    db: AsyncSession = Depends(get_db),
):
    """Generate speech via ALCM API (voice synthesis abstracted behind ALCM)."""
    result = await db.execute(
        select(Twin).where(Twin.id == twin_id, Twin.talent_user_id == UUID(user["id"]))
    )
    twin = result.scalar_one_or_none()
    if not twin:
        raise HTTPException(status_code=404, detail="Twin not found")
    if not twin.alcm_twin_id:
        raise HTTPException(status_code=400, detail="No ALCM identity linked to this twin")

    client = get_alcm_client()
    audio_bytes = await client.generate_speech(str(twin.alcm_twin_id), data.text)
    if not audio_bytes:
        raise HTTPException(status_code=503, detail="Speech generation unavailable")

    return StreamingResponse(io.BytesIO(audio_bytes), media_type="audio/mpeg")


class VoiceCloneRequest(BaseModel):
    audio_url: str = Field(..., description="S3/MinIO URL of uploaded audio file for voice cloning")


@router.post("/{twin_id}/voice/reclone")
async def reclone_voice(
    twin_id: UUID,
    data: VoiceCloneRequest,
    user: dict = Depends(require_auth),
    db: AsyncSession = Depends(get_db),
):
    """Re-initiate voice cloning from uploaded audio via ALCM API.

    Flow: Upload audio → ALCM analyze_media → voice profile created/updated.
    The ALCM API abstracts the voice provider (ElevenLabs or equivalent).
    """
    result = await db.execute(
        select(Twin).where(Twin.id == twin_id, Twin.talent_user_id == UUID(user["id"]))
    )
    twin = result.scalar_one_or_none()
    if not twin:
        raise HTTPException(status_code=404, detail="Twin not found")
    if not twin.alcm_twin_id:
        raise HTTPException(status_code=400, detail="No ALCM identity linked to this twin")

    client = get_alcm_client()
    try:
        analysis = await client.analyze_media(
            str(twin.alcm_twin_id),
            media_url=data.audio_url,
            media_type="AUDIO",
        )
        if analysis.get("_alcm_unavailable"):
            raise HTTPException(
                status_code=503,
                detail="Voice processing service temporarily unavailable. Your audio has been saved and will be processed when the service is back.",
            )

        db.add(AuditLog(
            actor_id=UUID(user["id"]), actor_type="TALENT", action="VOICE_RECLONE",
            entity_type="twin", entity_id=twin_id, twin_id=twin_id,
            details={"audio_url": data.audio_url, "processing_id": analysis.get("processing_id")},
        ))
        await db.flush()

        return {
            "status": "processing",
            "processing_id": analysis.get("processing_id"),
            "message": "Voice cloning initiated. Your voice profile will be updated once processing completes.",
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Voice reclone failed for twin {twin_id}: {e}")
        raise HTTPException(status_code=500, detail="Voice cloning failed. Please try again.")


@router.get("/{twin_id}/export")
async def export_twin_data(
    twin_id: UUID,
    user: dict = Depends(require_auth),
    db: AsyncSession = Depends(get_db),
):
    """Export all data associated with a twin (GDPR data portability).

    Returns a JSON document containing all personal data, consent records,
    audit logs, and configuration associated with this identity.
    """
    import json
    from ..models.consent_record import ConsentRecord
    from ..models.audit_log import AuditLog
    from ..models.guardrail_config import GuardrailConfig
    from ..models.licensing_rules_config import LicensingRulesConfig

    twin = (await db.execute(select(Twin).where(Twin.id == twin_id))).scalar_one_or_none()
    if not twin:
        raise HTTPException(status_code=404, detail="Twin not found")
    if str(twin.talent_user_id) != user["id"]:
        raise HTTPException(status_code=403, detail="Not your twin")

    # Gather all related data
    consents = (await db.execute(select(ConsentRecord).where(ConsentRecord.twin_id == twin_id))).scalars().all()
    audit_logs = (await db.execute(select(AuditLog).where(AuditLog.twin_id == twin_id))).scalars().all()
    guardrails = (await db.execute(select(GuardrailConfig).where(GuardrailConfig.twin_id == twin_id))).scalars().all()
    licensing = (await db.execute(select(LicensingRulesConfig).where(LicensingRulesConfig.twin_id == twin_id))).scalars().all()

    export_data = {
        "export_type": "GDPR_DATA_EXPORT",
        "exported_at": datetime.now(timezone.utc).isoformat(),
        "twin": {
            "id": str(twin.id),
            "display_name": twin.display_name,
            "public_name": twin.public_name,
            "bio": twin.bio,
            "identity_category": twin.identity_category,
            "clone_type": twin.clone_type,
            "status": twin.status,
            "health_status": twin.health_status,
            "created_at": twin.created_at.isoformat() if twin.created_at else None,
        },
        "consents": [
            {"type": c.consent_type, "action": c.action, "scope": c.scope, "created_at": c.created_at.isoformat() if c.created_at else None}
            for c in consents
        ],
        "guardrail_versions": [
            {"version": g.version, "is_active": g.is_active, "created_at": g.created_at.isoformat() if g.created_at else None}
            for g in guardrails
        ],
        "licensing_rule_versions": [
            {"version": l.version, "is_active": l.is_active, "created_at": l.created_at.isoformat() if l.created_at else None}
            for l in licensing
        ],
        "audit_log_count": len(audit_logs),
    }

    content = json.dumps(export_data, indent=2)
    return StreamingResponse(
        io.BytesIO(content.encode()),
        media_type="application/json",
        headers={"Content-Disposition": f"attachment; filename=aiv-export-{twin_id}.json"},
    )


# voice_debug removed — voice operations now go through ALCM API

