"""Versioned guardrail configuration — what the twin says/does."""
from sqlalchemy import Column, String, Integer, Boolean, DateTime, ForeignKey, Text, func
from sqlalchemy.dialects.postgresql import UUID, JSON, ARRAY
from sqlalchemy.orm import relationship
import uuid
from ..database import Base


class GuardrailConfig(Base):
    __tablename__ = "guardrail_configs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    twin_id = Column(UUID(as_uuid=True), ForeignKey("twins.id"), nullable=False)
    version = Column(Integer, nullable=False, default=1)
    configured_by = Column(UUID(as_uuid=True), ForeignKey("user_table.id"), nullable=False)

    blocked_topics = Column(ARRAY(Text), default=list)
    restricted_topics = Column(JSON, default=dict)
    language_restrictions = Column(ARRAY(Text), default=list)
    min_formality = Column(Integer, default=0)
    max_controversy = Column(Integer, default=100)
    humor_permitted = Column(Boolean, default=True)
    humor_blacklist = Column(ARRAY(Text), default=list)

    require_ai_disclosure = Column(Boolean, default=True)
    disclosure_text = Column(Text, default="This is an AI-generated response.")

    is_active = Column(Boolean, default=True)
    approved_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    twin = relationship("Twin", back_populates="guardrail_configs")
