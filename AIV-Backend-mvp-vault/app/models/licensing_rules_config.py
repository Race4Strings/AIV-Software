"""Versioned licensing rules — what deals the twin can enter."""
from sqlalchemy import Column, String, Integer, Boolean, Float, DateTime, ForeignKey, Numeric, func
from sqlalchemy.dialects.postgresql import UUID, ARRAY
from sqlalchemy.orm import relationship
import uuid
from ..database import Base


class LicensingRulesConfig(Base):
    __tablename__ = "licensing_rules_configs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    twin_id = Column(UUID(as_uuid=True), ForeignKey("twins.id"), nullable=False)
    version = Column(Integer, nullable=False, default=1)
    configured_by = Column(UUID(as_uuid=True), ForeignKey("user_table.id"), nullable=False)

    pricing_floor = Column(Numeric, nullable=True)
    currency = Column(String(3), default="USD")
    territory_restrictions = Column(ARRAY(String), default=list)
    blacklisted_use_cases = Column(ARRAY(String), default=list)
    permitted_use_cases = Column(ARRAY(String), default=list)
    exclusivity_available = Column(Boolean, default=False)
    auto_approve_threshold = Column(Float, default=0.8)
    escalate_below = Column(Float, default=0.6)
    block_below = Column(Float, default=0.4)
    default_grace_period_hours = Column(Integer, default=48)

    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    twin = relationship("Twin", back_populates="licensing_rules_configs")
