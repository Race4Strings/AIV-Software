"""
Workspace model for organizing chats.
"""
from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
import uuid

from ..database import Base


class Workspace(Base):
    """A workspace to organize chat sessions."""
    
    __tablename__ = "workspace_table"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    owner_id = Column(UUID(as_uuid=True), ForeignKey("user_table.id"), nullable=False, index=True)
    
    name = Column(String(100), nullable=False)
    description = Column(String(500), nullable=True)
    is_default = Column(Boolean, default=False)  # Auto-created "General" workspace
    icon = Column(String(50), nullable=True)  # Emoji or icon name
    
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    
    # Relationships
    owner = relationship("User", backref="workspaces")
    chats = relationship("Chat", back_populates="workspace", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<Workspace {self.name} owner={self.owner_id}>"
