"""Agent message — replaces chat messages with mode tracking and action logging."""
from sqlalchemy import Column, String, Integer, DateTime, ForeignKey, Text, func
from sqlalchemy.dialects.postgresql import UUID, JSON, ARRAY
from sqlalchemy.orm import relationship
import uuid
from ..database import Base


class AgentMessage(Base):
    __tablename__ = "agent_messages"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    session_id = Column(UUID(as_uuid=True), ForeignKey("agent_sessions.id"), nullable=False, index=True)
    role = Column(String(20), nullable=False)  # USER|AGENT|SYSTEM
    mode_at_time = Column(String(50), nullable=False)  # Mode when message was sent
    content = Column(Text, nullable=False)
    media_urls = Column(ARRAY(Text), nullable=True)
    actions = Column(JSON, nullable=True)  # [{type, endpoint, latency_ms}, ...]
    tokens_used = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    session = relationship("AgentSession", back_populates="messages")
