"""
Training models for clone improvement through conversation.
"""
from sqlalchemy import Column, String, Text, Boolean, DateTime, ForeignKey, Integer, func
from sqlalchemy.dialects.postgresql import UUID, JSONB, ARRAY
from sqlalchemy.orm import relationship
import uuid

from ..database import Base


class TrainingSession(Base):
    """A training session where the owner chats with their clone to improve it."""
    
    __tablename__ = "training_session_table"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    clone_id = Column(UUID(as_uuid=True), ForeignKey("clone_table.id"), nullable=False, index=True)
    owner_id = Column(UUID(as_uuid=True), ForeignKey("user_table.id"), nullable=False, index=True)
    
    title = Column(String(255), nullable=True)
    message_count = Column(Integer, default=0)
    dimensions_updated = Column(JSONB, default=list)  # List of dimension keys updated
    
    ended_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    
    # Relationships
    clone = relationship("Clone", backref="training_sessions")
    owner = relationship("User", backref="training_sessions")
    messages = relationship("TrainingMessage", back_populates="session", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<TrainingSession {self.id} clone={self.clone_id}>"


class TrainingMessage(Base):
    """A message in a training session."""
    
    __tablename__ = "training_message_table"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    session_id = Column(UUID(as_uuid=True), ForeignKey("training_session_table.id"), nullable=False, index=True)
    
    role = Column(String(20), nullable=False)  # 'user' or 'assistant'
    content = Column(Text, nullable=False)
    
    # Analysis results (for user messages only)
    analyzed = Column(Boolean, default=False)
    analysis = Column(JSONB, nullable=True)  # What AI found in this message
    dimensions_affected = Column(ARRAY(String), nullable=True)  # ['mind', 'work']
    
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    
    # Relationships
    session = relationship("TrainingSession", back_populates="messages")
    
    def __repr__(self):
        return f"<TrainingMessage {self.role}: {self.content[:50]}...>"
