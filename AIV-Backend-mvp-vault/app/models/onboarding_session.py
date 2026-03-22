"""Onboarding session — import-first pipeline replacing 6-step questionnaire."""
import enum
from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey, Text, func
from sqlalchemy.dialects.postgresql import UUID, JSON
from sqlalchemy.orm import relationship
import uuid
from ..database import Base


# Legacy enum for backward compat
class OnboardingStatus(str, enum.Enum):
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    ABANDONED = "abandoned"
    # New statuses
    DISCOVERY = "DISCOVERY"
    CONTENT_INGESTION = "CONTENT_INGESTION"
    PROFILE_REVIEW = "PROFILE_REVIEW"
    FILE_UPLOAD = "FILE_UPLOAD"
    RIGHTS_AGREEMENT = "RIGHTS_AGREEMENT"
    GATE_APPROVAL = "GATE_APPROVAL"
    COMPLETE = "COMPLETE"


class OnboardingSession(Base):
    __tablename__ = "onboarding_sessions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    twin_id = Column(UUID(as_uuid=True), ForeignKey("twins.id"), nullable=True)
    initiated_by = Column(UUID(as_uuid=True), ForeignKey("user_table.id"), nullable=False)
    onboarding_path = Column(String(50), nullable=False, default="HYBRID")  # AIV_ASSISTED|MANUAL|HYBRID

    # Discovery
    discovery_input = Column(Text, nullable=True)  # handle/name/URL entered
    discovered_profiles = Column(JSON, default=list)
    wikipedia_url = Column(Text, nullable=True)
    discovery_completed_at = Column(DateTime(timezone=True), nullable=True)

    # Consent
    consent_public_scraping = Column(Boolean, default=False)
    consent_granted_at = Column(DateTime(timezone=True), nullable=True)
    identity_verification = Column(String(50), default="EMAIL")
    identity_verified_at = Column(DateTime(timezone=True), nullable=True)

    # Files
    uploaded_file_urls = Column(JSON, default=list)
    files_processed_at = Column(DateTime(timezone=True), nullable=True)

    # Gate 1: Manager operational approval
    gate_1_manager_approved = Column(Boolean, default=False)
    gate_1_approved_by = Column(UUID(as_uuid=True), ForeignKey("user_table.id"), nullable=True)
    gate_1_approved_at = Column(DateTime(timezone=True), nullable=True)

    # Gate 2: Talent personal authorization
    gate_2_talent_authorized = Column(Boolean, default=False)
    gate_2_authorized_at = Column(DateTime(timezone=True), nullable=True)

    # Status: DISCOVERY|CONTENT_INGESTION|PROFILE_REVIEW|FILE_UPLOAD|RIGHTS_AGREEMENT|GATE_APPROVAL|COMPLETE
    status = Column(String(50), nullable=False, default="DISCOVERY")
    completed_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    twin = relationship("Twin", back_populates="onboarding_session")
