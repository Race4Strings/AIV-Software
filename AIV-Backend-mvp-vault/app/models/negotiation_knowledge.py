"""Negotiation knowledge — opt-in deal intelligence that trains the assistant."""
from sqlalchemy import Column, String, DateTime, ForeignKey, Text, func
from sqlalchemy.dialects.postgresql import UUID, JSON
import uuid
from ..database import Base


class NegotiationKnowledge(Base):
    __tablename__ = "negotiation_knowledge"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    twin_id = Column(UUID(as_uuid=True), ForeignKey("twins.id"), nullable=False, index=True)
    created_by = Column(UUID(as_uuid=True), ForeignKey("user_table.id"), nullable=False)

    knowledge_type = Column(String(50), nullable=False)  # INQUIRY_DECISION|PRICING_PREFERENCE|TERRITORY_PREFERENCE|CLIENT_NOTE|NEGOTIATION_PATTERN
    deal_id = Column(UUID(as_uuid=True), ForeignKey("deals.id"), nullable=True)
    decision = Column(String(50), nullable=False)  # APPROVED|REJECTED|MODIFIED|ESCALATED
    context = Column(JSON, nullable=False)
    reasoning = Column(Text, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
