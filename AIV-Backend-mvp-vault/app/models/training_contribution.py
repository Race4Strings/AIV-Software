"""Training contribution — replaces training_submission with ALCM integration."""
from sqlalchemy import Column, String, DateTime, ForeignKey, Text, func
from sqlalchemy.dialects.postgresql import UUID, JSON
from sqlalchemy.orm import relationship
import uuid
from ..database import Base


class TrainingContribution(Base):
    __tablename__ = "training_contributions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    twin_id = Column(UUID(as_uuid=True), ForeignKey("twins.id"), nullable=False, index=True)
    contributor_id = Column(UUID(as_uuid=True), ForeignKey("user_table.id"), nullable=False)
    contributor_type = Column(String(50), nullable=False)  # TALENT|TEAM_MEMBER|AIV_INTERNAL

    modality = Column(String(50), nullable=False)  # TEXT|AUDIO|VIDEO|URL|STRUCTURED_DATA
    content = Column(Text, nullable=False)
    source_description = Column(Text, nullable=True)
    source_url = Column(Text, nullable=True)
    agent_mode = Column(String(50), nullable=True)  # TRAINING|REFINEMENT|ORGANIC_CONVERSATION

    alcm_processing_status = Column(String(50), default="PENDING")  # PENDING|PROCESSING|CLASSIFIED|APPLIED|FAILED
    alcm_processing_result = Column(JSON, nullable=True)

    approval_status = Column(String(50), default="PENDING_APPROVAL", index=True)  # AUTO_APPROVED|PENDING_APPROVAL|APPROVED|REJECTED
    approved_by = Column(UUID(as_uuid=True), ForeignKey("user_table.id"), nullable=True)
    approved_at = Column(DateTime(timezone=True), nullable=True)
    rejection_reason = Column(Text, nullable=True)

    reversed_at = Column(DateTime(timezone=True), nullable=True)
    reversed_by = Column(UUID(as_uuid=True), ForeignKey("user_table.id"), nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    twin = relationship("Twin", back_populates="training_contributions")
