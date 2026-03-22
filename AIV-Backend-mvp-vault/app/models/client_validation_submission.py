from sqlalchemy import Column, String, Float, Boolean, DateTime, ForeignKey, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
import uuid
from ..database import Base


class ClientValidationSubmission(Base):
    __tablename__ = "client_validation_submissions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    deal_id = Column(UUID(as_uuid=True), ForeignKey("deals.id"), nullable=False)
    submitted_by = Column(UUID(as_uuid=True), ForeignKey("user_table.id"), nullable=False)
    sample_content = Column(Text, nullable=False)
    sample_context = Column(Text, nullable=True)
    sample_modality = Column(String(20), default="TEXT")
    personality_consistency = Column(Float, nullable=True)
    passed = Column(Boolean, nullable=True)
    inconsistency_details = Column(Text, nullable=True)
    talent_review_status = Column(String(50), default="PENDING")  # PENDING|ACCEPTED|FLAGGED|RESTRICTED
    reviewed_by = Column(UUID(as_uuid=True), ForeignKey("user_table.id"), nullable=True)
    reviewed_at = Column(DateTime(timezone=True), nullable=True)
    review_notes = Column(Text, nullable=True)
    submitted_at = Column(DateTime(timezone=True), server_default=func.now())

    deal = relationship("Deal", back_populates="validations")
