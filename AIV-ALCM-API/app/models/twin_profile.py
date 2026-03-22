"""Central identity record in the ALCM API."""
import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Text, Float, Boolean, DateTime, JSON
from sqlalchemy.dialects.postgresql import UUID

from ..database import Base


class TwinProfile(Base):
    __tablename__ = "twin_profiles"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    # Identity data (structured JSONB blobs per delivery module)
    identity_profile = Column(JSON, default=dict)   # personality core, behavioral, discourse
    knowledge_base = Column(JSON, default=dict)      # RAG entries, positions, expertise
    voice_profile = Column(JSON, default=dict)       # embeddings, speech patterns, accent
    visual_profile = Column(JSON, default=dict)      # appearance, expressions, gestures

    # Processing state
    psychographic_coverage = Column(Float, default=0.0)
    personality_confidence = Column(Float, default=0.0)
    cfs = Column(Float, default=0.0)  # Composite Fidelity Score

    # Health
    health_status = Column(String(50), default="BUILDING")
    last_health_check = Column(DateTime(timezone=True))

    # Guardrails (pushed from platform)
    active_guardrails = Column(JSON, default=dict)

    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc),
                        onupdate=lambda: datetime.now(timezone.utc))
