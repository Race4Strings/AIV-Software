"""BFI-2 Precision Tuning — personality calibration via Big Five Inventory-2.

Stores talent self-report responses (60 items) and computed domain/facet scores.
ALCM comparison is computed live via the calibration service, never stored.
This data lives in the Platform DB, never sent to the ALCM API.
Encrypted at rest (GDPR special category / CCPA sensitive PI).
"""
from sqlalchemy import Column, String, DateTime, ForeignKey, Float, Integer, Boolean, func
from sqlalchemy.dialects.postgresql import UUID, JSON
from sqlalchemy.orm import relationship
import uuid
from ..database import Base


class BFI2Response(Base):
    __tablename__ = "bfi2_responses"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    twin_id = Column(UUID(as_uuid=True), ForeignKey("twins.id"), nullable=False, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("user_table.id"), nullable=False)

    # Raw responses — 60 items, JSONB array
    # Shape: [{"item": 1, "value": 4}, {"item": 2, "value": 2}, ...]
    # Values: 1-5 per item (Disagree strongly -> Agree strongly)
    responses = Column(JSON, nullable=True)

    # Computed domain scores (1.0 - 5.0 scale, after reverse-scoring)
    score_extraversion = Column(Float, nullable=True)
    score_agreeableness = Column(Float, nullable=True)
    score_conscientiousness = Column(Float, nullable=True)
    score_negative_emotionality = Column(Float, nullable=True)
    score_open_mindedness = Column(Float, nullable=True)

    # Computed facet scores (15 facets, stored as JSONB)
    # Shape: {"sociability": 3.5, "assertiveness": 4.0, "energy_level": 3.0, ...}
    facet_scores = Column(JSON, nullable=True)

    # Progress tracking (for resume functionality)
    progress = Column(Integer, default=0)  # number of items completed (0-60)

    # Completion state
    completed = Column(Boolean, default=False)

    # Reminder tracking
    reminded_in_training = Column(Boolean, default=False)

    # Timestamps
    started_at = Column(DateTime(timezone=True), server_default=func.now())
    completed_at = Column(DateTime(timezone=True), nullable=True)

    # Source context
    source = Column(String(50), default="ONBOARDING_INTERSTITIAL")
    # ONBOARDING_INTERSTITIAL | TRAINING_AREA | SETTINGS | RESUME

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    twin = relationship("Twin", backref="bfi2_responses")
