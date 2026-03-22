"""Deal model — full licensing deal lifecycle with data_scope."""
import enum
from sqlalchemy import Column, String, Integer, Boolean, Float, DateTime, Date, ForeignKey, Text, Numeric, func, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID, ARRAY
from sqlalchemy.orm import relationship
import uuid
from ..database import Base


class DealStatus(str, enum.Enum):
    """Deal status lifecycle per spec Section 9.3."""
    SUBMITTED = "SUBMITTED"
    UNDER_REVIEW = "UNDER_REVIEW"
    APPROVED = "APPROVED"
    CONTRACT_SENT = "CONTRACT_SENT"
    EXECUTED = "EXECUTED"
    ACTIVE = "ACTIVE"
    COMPLETED = "COMPLETED"
    EXPIRED = "EXPIRED"
    TERMINATED = "TERMINATED"


class Deal(Base):
    __tablename__ = "deals"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    twin_id = Column(UUID(as_uuid=True), ForeignKey("twins.id"), nullable=False, index=True)
    client_organization_id = Column(UUID(as_uuid=True), ForeignKey("organization_table.id"), nullable=False, index=True)
    deal_number = Column(Integer, nullable=False)

    deal_type = Column(String(50), nullable=False)  # BRAND_CAMPAIGN|CONTENT_LICENSE|CONVERSATIONAL|EDUCATIONAL|CORPORATE|GAMING|API_INTEGRATION
    value = Column(Numeric, nullable=False)
    currency = Column(String(3), default="USD")
    commission_rate = Column(Numeric, nullable=False)
    commission_amount = Column(Numeric, nullable=False)
    territory = Column(ARRAY(Text), default=list)
    exclusivity = Column(Boolean, default=False)
    start_date = Column(Date, nullable=True)
    end_date = Column(Date, nullable=True)
    terms_summary = Column(Text, nullable=True)

    data_scope = Column(ARRAY(Text), nullable=False, default=list)  # identity_profile, knowledge_base, voice_identity, visual_identity
    package_version_at_exec = Column(Integer, nullable=True)
    version_hold_requested = Column(Boolean, default=False)
    version_hold_approved = Column(Boolean, default=False)

    grace_period_hours = Column(Integer, default=48)

    # Status: SUBMITTED|UNDER_REVIEW|APPROVED|CONTRACT_SENT|EXECUTED|ACTIVE|COMPLETED|EXPIRED|TERMINATED
    status = Column(String(50), nullable=False, default="SUBMITTED", index=True)
    approved_by = Column(UUID(as_uuid=True), ForeignKey("user_table.id"), nullable=True)
    executed_at = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    __table_args__ = (UniqueConstraint("twin_id", "deal_number"),)

    twin = relationship("Twin", back_populates="deals")
    milestones = relationship("DealMilestone", back_populates="deal", order_by="DealMilestone.sort_order")
    messages = relationship("DealMessage", back_populates="deal", order_by="DealMessage.created_at")
    contracts = relationship("DealContract", back_populates="deal", order_by="DealContract.version")
    pul_records = relationship("PermittedUseRecord", back_populates="deal", order_by="PermittedUseRecord.submitted_at")
    validations = relationship("ClientValidationSubmission", back_populates="deal")
