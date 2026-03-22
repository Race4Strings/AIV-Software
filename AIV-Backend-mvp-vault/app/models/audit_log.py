"""Audit log — APPEND-ONLY. 7-year retention."""
from sqlalchemy import Column, String, DateTime, ForeignKey, func
from sqlalchemy.dialects.postgresql import UUID, JSON
from sqlalchemy.orm import relationship
import uuid
from ..database import Base


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    actor_id = Column(UUID(as_uuid=True), ForeignKey("user_table.id"), nullable=True)
    actor_type = Column(String(50), nullable=False)  # TALENT|MANAGER|TEAM_MEMBER|CLIENT|AIV_STAFF|SYSTEM
    action = Column(String(50), nullable=False)  # CREATE|UPDATE|DELETE|ACCESS|EXPORT|LOCK|UNLOCK|APPROVE|REJECT|DELIVER|REVOKE
    entity_type = Column(String(50), nullable=False)
    entity_id = Column(UUID(as_uuid=True), nullable=True)
    details = Column(JSON, default=dict)
    ip_address = Column(String(45), nullable=True)
    twin_id = Column(UUID(as_uuid=True), ForeignKey("twins.id"), nullable=True, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    # APPEND-ONLY: no updated_at

    twin = relationship("Twin", back_populates="audit_logs")
