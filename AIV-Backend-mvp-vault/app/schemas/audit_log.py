from pydantic import BaseModel
from typing import Optional
from uuid import UUID
from datetime import datetime


# ============== Response Schemas ==============

class AuditLogResponse(BaseModel):
    """Response schema for an audit log entry."""
    id: UUID
    twin_id: Optional[UUID] = None
    actor_id: Optional[UUID] = None
    actor_type: str = "SYSTEM"
    action: str
    entity_type: Optional[str] = None
    entity_id: Optional[UUID] = None
    details: Optional[dict] = None
    ip_address: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class AuditLogFilter(BaseModel):
    """Filter parameters for querying audit logs."""
    twin_id: Optional[UUID] = None
    action: Optional[str] = None
    entity_type: Optional[str] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
