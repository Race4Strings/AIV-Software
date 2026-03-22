"""Twin Router — Core CRUD for digital twins."""

from uuid import UUID
from typing import List

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
    TwinListResponse, TwinCompletenessResponse,
)
from ..utils.alcm_merge import deep_merge
from ..services.alcm_client import get_alcm_client


class TTSRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=500)

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
    except Exception:
        pass  # Graceful — twin still created, ALCM linked later

    twin = Twin(
        talent_user_id=UUID(user["id"]),
        display_name=data.name,
        public_name=data.public_name,
        identity_category=data.category or "ENTERTAINMENT",
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
        .where(Twin.user_id == UUID(user["id"]))
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
        select(Twin).where(Twin.id == twin_id, Twin.user_id == UUID(user["id"]))
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
    """Update a twin. ALCM data uses deep-merge for partial updates."""
    result = await db.execute(
        select(Twin).where(Twin.id == twin_id, Twin.user_id == UUID(user["id"]))
    )
    twin = result.scalar_one_or_none()
    if not twin:
        raise HTTPException(status_code=404, detail="Twin not found")

    # Apply scalar updates
    update_data = data.model_dump(exclude_unset=True)

    # Deep-merge ALCM data if provided
    if "alcm_data" in update_data and update_data["alcm_data"] is not None:
        twin.alcm_data = deep_merge(twin.alcm_data or {}, update_data.pop("alcm_data"))

    # Deep-merge commercial_terms if provided
    if "commercial_terms" in update_data and update_data["commercial_terms"] is not None:
        twin.commercial_terms = deep_merge(
            twin.commercial_terms or {}, update_data.pop("commercial_terms")
        )

    # Deep-merge governance if provided
    if "governance" in update_data and update_data["governance"] is not None:
        twin.governance = deep_merge(
            twin.governance or {}, update_data.pop("governance")
        )

    # Apply remaining scalar fields
    for field, value in update_data.items():
        if value is not None:
            setattr(twin, field, value)

    # Audit
    audit = AuditLog(
        twin_id=twin_id,
        user_id=UUID(user["id"]),
        action="twin_updated",
        entity_type="twin",
        details={"fields_updated": list(data.model_dump(exclude_unset=True).keys())},
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
        select(Twin).where(Twin.id == twin_id, Twin.user_id == UUID(user["id"]))
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
        except Exception:
            pass  # Table/column may not exist — skip

    await safe_delete("DELETE FROM audit_logs WHERE twin_id = :tid", {"tid": twin_id})
    for tbl, col in [
        ("chat_message_table", "sender_twin_id"),
        ("chat_participant_table", "twin_id"),
        ("certifications", "twin_id"),
        ("documents", "twin_id"),
        ("deals", "twin_id"),
        ("training_submissions", "twin_id"),
        ("onboarding_sessions", "twin_id"),
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


@router.post("/{twin_id}/voice/reclone")
async def reclone_voice(
    twin_id: UUID,
    user: dict = Depends(require_auth),
    db: AsyncSession = Depends(get_db),
):
    """Re-initiate voice cloning. Coming soon."""
    raise HTTPException(status_code=501, detail="Voice re-cloning coming soon")


# voice_debug removed — voice operations now go through ALCM API

