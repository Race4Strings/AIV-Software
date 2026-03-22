"""Audit Router — Compliance action log queries."""

from uuid import UUID
from typing import List, Optional
from datetime import datetime

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_db
from ..middleware.auth_middleware import require_auth
from ..models.audit_log import AuditLog
from ..schemas.audit_log import AuditLogResponse

router = APIRouter(prefix="/audit", tags=["Audit"])


@router.get("", response_model=List[AuditLogResponse])
async def list_audit_logs(
    twin_id: Optional[UUID] = Query(None, description="Filter by twin"),
    action: Optional[str] = Query(None, description="Filter by action type"),
    entity_type: Optional[str] = Query(None, description="Filter by entity type"),
    start_date: Optional[datetime] = Query(None, description="From date"),
    end_date: Optional[datetime] = Query(None, description="To date"),
    limit: int = Query(50, ge=1, le=200),
    user: dict = Depends(require_auth),
    db: AsyncSession = Depends(get_db),
):
    """List audit log entries with optional filters."""
    query = select(AuditLog).where(AuditLog.actor_id == UUID(user["id"]))

    if twin_id:
        query = query.where(AuditLog.twin_id == twin_id)
    if action:
        query = query.where(AuditLog.action == action)
    if entity_type:
        query = query.where(AuditLog.entity_type == entity_type)
    if start_date:
        query = query.where(AuditLog.created_at >= start_date)
    if end_date:
        query = query.where(AuditLog.created_at <= end_date)

    query = query.order_by(AuditLog.created_at.desc()).limit(limit)
    result = await db.execute(query)
    logs = result.scalars().all()
    return [AuditLogResponse.model_validate(log) for log in logs]
