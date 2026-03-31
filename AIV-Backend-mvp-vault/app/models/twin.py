"""Twin model — slim reference record. No identity data stored here.

Identity data lives in the ALCM API (via alcm_twin_id).
Configuration lives in dedicated versioned tables (guardrail_configs, licensing_rules_configs).

Legacy columns (alcm_data, voice_id, governance, etc.) still exist in the DB
but are NOT defined here — SQLAlchemy ignores them. They'll be dropped in Phase 5.
"""
import enum

from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey, Text, func
from sqlalchemy.dialects.postgresql import UUID, ARRAY
from sqlalchemy.orm import relationship
import uuid

from ..database import Base


class TwinStatus(str, enum.Enum):
    """Twin status lifecycle per spec Section 5."""
    INITIALIZING = "INITIALIZING"
    BUILDING = "BUILDING"
    ACTIVE = "ACTIVE"
    PROTECTED_HOLD = "PROTECTED_HOLD"
    LOCKED = "LOCKED"
    ARCHIVED = "ARCHIVED"


class HealthStatus(str, enum.Enum):
    BUILDING = "BUILDING"
    HEALTHY = "HEALTHY"
    ATTENTION_NEEDED = "ATTENTION_NEEDED"
    ACTION_REQUIRED = "ACTION_REQUIRED"


class Twin(Base):
    """Digital Twin — slim reference. ALCM API holds all identity data."""

    __tablename__ = "twins"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organization_table.id"), nullable=True, index=True)
    talent_user_id = Column(UUID(as_uuid=True), ForeignKey("user_table.id"), nullable=True, index=True)
    alcm_twin_id = Column(UUID(as_uuid=True), nullable=True)

    # Display — display_name is the new primary field; legacy `name` col stays in DB
    display_name = Column(String(255), nullable=True)
    public_name = Column(String(255), nullable=True)
    bio = Column(Text, nullable=True)
    identity_category = Column(ARRAY(String(50)), nullable=True, default=["ENTERTAINMENT"])
    clone_type = Column(String(50), nullable=True, default="PUBLIC_FIGURE")

    # Status: INITIALIZING | BUILDING | ACTIVE | PROTECTED_HOLD | LOCKED | ARCHIVED
    status = Column(String(50), nullable=False, default="INITIALIZING")
    stage_1_completed_at = Column(DateTime(timezone=True), nullable=True)
    stage_2_completed_at = Column(DateTime(timezone=True), nullable=True)
    fee_free_window_expires = Column(DateTime(timezone=True), nullable=True)
    platform_fee_active = Column(Boolean, default=False)
    stripe_subscription_id = Column(String(255), nullable=True)
    certified_at = Column(DateTime(timezone=True), nullable=True)

    # Health (cached from ALCM): BUILDING | HEALTHY | ATTENTION_NEEDED | ACTION_REQUIRED
    health_status = Column(String(50), default="BUILDING")
    health_last_computed = Column(DateTime(timezone=True), nullable=True)
    last_training_activity = Column(DateTime(timezone=True), nullable=True)
    last_quarterly_audit = Column(DateTime(timezone=True), nullable=True)
    next_quarterly_audit = Column(DateTime(timezone=True), nullable=True)

    # Succession
    successor_contact_email = Column(String(255), nullable=True)
    successor_contact_name = Column(String(255), nullable=True)
    successor_designated_at = Column(DateTime(timezone=True), nullable=True)

    # Gate 2: Licensing Portal blocked until this is set
    talent_authorization_at = Column(DateTime(timezone=True), nullable=True)

    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    # Relationships
    organization = relationship("Organization", backref="twins")
    talent_user = relationship("User", foreign_keys=[talent_user_id], backref="owned_twins")
    guardrail_configs = relationship("GuardrailConfig", back_populates="twin", order_by="GuardrailConfig.version.desc()")
    licensing_rules_configs = relationship("LicensingRulesConfig", back_populates="twin", order_by="LicensingRulesConfig.version.desc()")
    deals = relationship("Deal", back_populates="twin")
    training_contributions = relationship("TrainingContribution", back_populates="twin")
    audit_logs = relationship("AuditLog", back_populates="twin")
    onboarding_session = relationship("OnboardingSession", back_populates="twin", uselist=False)
    consent_records = relationship("ConsentRecord", back_populates="twin")
    identity_package_versions = relationship("IdentityPackageVersion", back_populates="twin")

    def __repr__(self):
        return f"<Twin {self.display_name or 'unnamed'} ({self.status})>"
