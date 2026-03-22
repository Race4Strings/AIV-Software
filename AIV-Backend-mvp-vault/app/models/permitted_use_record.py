"""Permitted Use Lifecycle records — APPEND-ONLY. No updated_at."""
from sqlalchemy import Column, String, Boolean, DateTime, Date, ForeignKey, Text, func
from sqlalchemy.dialects.postgresql import UUID, JSON, ARRAY
from sqlalchemy.orm import relationship
import uuid
from ..database import Base


class PermittedUseRecord(Base):
    __tablename__ = "permitted_use_records"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    deal_id = Column(UUID(as_uuid=True), ForeignKey("deals.id"), nullable=False, index=True)
    record_type = Column(String(50), nullable=False)  # OPENING_DECLARATION|UPDATE|MATERIAL_CHANGE|MILESTONE_GATE|CLOSING_ATTESTATION
    submitted_by = Column(UUID(as_uuid=True), ForeignKey("user_table.id"), nullable=False)
    content_produced = Column(JSON, default=dict)
    platforms_used = Column(ARRAY(Text), default=list)
    territories_reached = Column(ARRAY(Text), default=list)
    production_partners = Column(ARRAY(Text), default=list)
    ai_tools_used = Column(ARRAY(Text), default=list)
    scope_changes = Column(Text, nullable=True)
    period_start = Column(Date, nullable=True)
    period_end = Column(Date, nullable=True)
    flagged = Column(Boolean, default=False)
    flag_reason = Column(Text, nullable=True)
    submitted_at = Column(DateTime(timezone=True), server_default=func.now())
    # APPEND-ONLY: no updated_at

    deal = relationship("Deal", back_populates="pul_records")
