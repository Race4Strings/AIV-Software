from sqlalchemy import Column, String, DateTime, ForeignKey, Text, func
from sqlalchemy.dialects.postgresql import UUID, JSON
import uuid
from ..database import Base


class MisuseDetection(Base):
    __tablename__ = "misuse_detections"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    twin_id = Column(UUID(as_uuid=True), ForeignKey("twins.id"), nullable=False)
    detection_type = Column(String(50), nullable=False)  # VOICE_MATCH|LIKENESS_MATCH|TEXT_PATTERN|SEAL_ABSENT
    platform = Column(Text, nullable=False)
    source_url = Column(Text, nullable=False)
    detected_at = Column(DateTime(timezone=True), server_default=func.now())
    evidence = Column(JSON, default=dict)
    status = Column(String(50), default="DETECTED")  # DETECTED|UNDER_REVIEW|CONFIRMED|FALSE_POSITIVE|ENFORCEMENT_SENT|RESOLVED
    reviewed_by = Column(UUID(as_uuid=True), ForeignKey("user_table.id"), nullable=True)
    reviewed_at = Column(DateTime(timezone=True), nullable=True)
    enforcement_action = Column(Text, nullable=True)
    resolved_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
