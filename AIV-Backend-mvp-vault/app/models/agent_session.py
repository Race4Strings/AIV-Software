"""Agent session — replaces workspace/chat with mode-tracked assistant sessions."""
from sqlalchemy import Column, String, DateTime, ForeignKey, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
import uuid
from ..database import Base


class AgentSession(Base):
    __tablename__ = "agent_sessions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("user_table.id"), nullable=False, index=True)
    twin_id = Column(UUID(as_uuid=True), ForeignKey("twins.id"), nullable=True)
    current_mode = Column(String(50), nullable=False, default="ASSISTANT")  # ASSISTANT|DIGITAL_SELF|TRAINING|REFINEMENT
    started_at = Column(DateTime(timezone=True), server_default=func.now())
    last_activity_at = Column(DateTime(timezone=True), server_default=func.now())
    ended_at = Column(DateTime(timezone=True), nullable=True)
    auth_expires_at = Column(DateTime(timezone=True), nullable=False)

    messages = relationship("AgentMessage", back_populates="session", order_by="AgentMessage.created_at")
