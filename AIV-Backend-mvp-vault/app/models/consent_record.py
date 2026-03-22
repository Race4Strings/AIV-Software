"""Consent records — APPEND-ONLY. Revocations are new records, not updates."""
from sqlalchemy import Column, String, DateTime, ForeignKey, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
import uuid
from ..database import Base


class ConsentRecord(Base):
    __tablename__ = "consent_records"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    twin_id = Column(UUID(as_uuid=True), ForeignKey("twins.id"), nullable=False, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("user_table.id"), nullable=False)
    consent_type = Column(String(50), nullable=False)  # PUBLIC_SCRAPING|CROSS_PLATFORM_MONITORING|IN_PLATFORM_CAPTURE|DATA_PROCESSING|LIKENESS_LICENSING|VOICE_LICENSING|VISUAL_LICENSING
    action = Column(String(20), nullable=False)  # GRANTED|REVOKED|MODIFIED
    scope = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    # APPEND-ONLY: no updated_at

    twin = relationship("Twin", back_populates="consent_records")
