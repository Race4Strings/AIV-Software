"""Consent router — append-only consent ledger per spec Section 3.11."""
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_db
from ..middleware import require_auth
from ..models.consent_record import ConsentRecord

router = APIRouter(tags=["Consent"])


class ConsentRequest(BaseModel):
    consent_type: str  # PUBLIC_SCRAPING|VOICE_LICENSING|VISUAL_LICENSING|etc.
    action: str  # GRANTED|REVOKED|MODIFIED
    scope: Optional[str] = None


@router.post("/twins/{twin_id}/consent")
async def add_consent(
    twin_id: str, req: ConsentRequest,
    user: dict = Depends(require_auth), db: AsyncSession = Depends(get_db),
):
    """Record a consent event. APPEND-ONLY — revocations are new records."""
    record = ConsentRecord(
        twin_id=UUID(twin_id), user_id=UUID(user["id"]),
        consent_type=req.consent_type, action=req.action, scope=req.scope,
    )
    db.add(record)
    await db.flush()
    return {
        "id": str(record.id), "twin_id": twin_id,
        "consent_type": record.consent_type, "action": record.action,
        "scope": record.scope,
        "created_at": record.created_at.isoformat() if record.created_at else None,
    }


@router.get("/twins/{twin_id}/consent")
async def get_consent_ledger(
    twin_id: str,
    user: dict = Depends(require_auth), db: AsyncSession = Depends(get_db),
):
    """Get full consent ledger for a twin."""
    result = await db.execute(
        select(ConsentRecord).where(ConsentRecord.twin_id == UUID(twin_id))
        .order_by(ConsentRecord.created_at)
    )
    records = result.scalars().all()
    return [
        {
            "id": str(r.id), "consent_type": r.consent_type,
            "action": r.action, "scope": r.scope,
            "created_at": r.created_at.isoformat() if r.created_at else None,
        }
        for r in records
    ]
