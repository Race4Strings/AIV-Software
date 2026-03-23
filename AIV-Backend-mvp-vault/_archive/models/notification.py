"""
Notification model for in-app notifications.
"""
from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey, Enum, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
import uuid
import enum

from ..database import Base


class NotificationType(str, enum.Enum):
    MENTION = "mention"        # User mentioned in chat
    MESSAGE = "message"        # New message in chat
    CHAT_INVITE = "chat_invite"  # Invited to a chat


class Notification(Base):
    """In-app notification for users."""
    
    __tablename__ = "notification_table"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("user_table.id"), nullable=False, index=True)
    
    type = Column(Enum(NotificationType), nullable=False)
    title = Column(String(200), nullable=True)
    message = Column(String(500), nullable=True)
    
    # Related entities (optional)
    chat_id = Column(UUID(as_uuid=True), ForeignKey("chat_table.id"), nullable=True)
    message_id = Column(UUID(as_uuid=True), ForeignKey("chat_message_table.id"), nullable=True)
    
    is_read = Column(Boolean, default=False, index=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    
    # Relationships
    user = relationship("User", backref="notifications")
    chat = relationship("Chat", backref="notifications")
    related_message = relationship("ChatMessage", backref="notifications")
    
    def __repr__(self):
        return f"<Notification {self.type} for user={self.user_id}>"
