"""Async processing job queue."""
import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Text, DateTime, JSON, Index
from sqlalchemy.dialects.postgresql import UUID

from ..database import Base


class ProcessingJob(Base):
    __tablename__ = "processing_jobs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    twin_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    job_type = Column(String(50), nullable=False)  # CLASSIFY | ATTRIBUTE | ANALYZE_MEDIA
    status = Column(String(50), default="PENDING")  # PENDING | PROCESSING | COMPLETED | FAILED
    input_data = Column(JSON, default=dict)
    result_data = Column(JSON)
    error = Column(Text)

    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    completed_at = Column(DateTime(timezone=True))
