"""
Chat models for multi-party conversations.
"""
from sqlalchemy import Column, String, Text, Boolean, DateTime, ForeignKey, Enum, func
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
import uuid
import enum

from ..database import Base


class ChatType(str, enum.Enum):
    DIRECT = "direct"  # 1:1 chat
    GROUP = "group"    # Multiple participants


class ParticipantRole(str, enum.Enum):
    OWNER = "owner"    # Chat creator
    MEMBER = "member"  # Regular participant


class MessageType(str, enum.Enum):
    TEXT = "text"      # Regular message
    SYSTEM = "system"  # System notification


class Chat(Base):
    """A chat conversation with one or more participants."""
    
    __tablename__ = "chat_table"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    workspace_id = Column(UUID(as_uuid=True), ForeignKey("workspace_table.id"), nullable=False, index=True)
    creator_id = Column(UUID(as_uuid=True), ForeignKey("user_table.id"), nullable=False, index=True)
    
    title = Column(String(200), nullable=True)  # Optional chat title
    chat_type = Column(Enum(ChatType), default=ChatType.DIRECT, nullable=False)
    is_archived = Column(Boolean, default=False)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    
    # Relationships
    workspace = relationship("Workspace", back_populates="chats")
    creator = relationship("User", backref="created_chats")
    participants = relationship("ChatParticipant", back_populates="chat", cascade="all, delete-orphan")
    messages = relationship("ChatMessage", back_populates="chat", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<Chat {self.id} type={self.chat_type}>"


class ChatParticipant(Base):
    """A participant in a chat - can be user or clone."""
    
    __tablename__ = "chat_participant_table"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    chat_id = Column(UUID(as_uuid=True), ForeignKey("chat_table.id"), nullable=False, index=True)
    
    # Either user or clone (one must be set)
    user_id = Column(UUID(as_uuid=True), ForeignKey("user_table.id"), nullable=True, index=True)
    clone_id = Column(UUID(as_uuid=True), ForeignKey("clone_table.id"), nullable=True, index=True)
    
    role = Column(Enum(ParticipantRole), default=ParticipantRole.MEMBER, nullable=False)
    joined_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    
    # Relationships
    chat = relationship("Chat", back_populates="participants")
    user = relationship("User", backref="chat_participations")
    clone = relationship("Clone", backref="chat_participations")
    
    def __repr__(self):
        target = f"user={self.user_id}" if self.user_id else f"clone={self.clone_id}"
        return f"<ChatParticipant {target}>"


class ChatMessage(Base):
    """A message in a chat."""
    
    __tablename__ = "chat_message_table"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    chat_id = Column(UUID(as_uuid=True), ForeignKey("chat_table.id"), nullable=False, index=True)
    
    # Sender (either user or clone)
    sender_user_id = Column(UUID(as_uuid=True), ForeignKey("user_table.id"), nullable=True, index=True)
    sender_clone_id = Column(UUID(as_uuid=True), ForeignKey("clone_table.id"), nullable=True, index=True)
    
    content = Column(Text, nullable=False)
    message_type = Column(Enum(MessageType), default=MessageType.TEXT, nullable=False)
    mentions = Column(JSONB, nullable=True)  # {"users": [...], "clones": [...]}
    
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    
    # Relationships
    chat = relationship("Chat", back_populates="messages")
    sender_user = relationship("User", backref="chat_messages")
    sender_clone = relationship("Clone", backref="chat_messages")
    
    def __repr__(self):
        sender = f"user={self.sender_user_id}" if self.sender_user_id else f"clone={self.sender_clone_id}"
        return f"<ChatMessage {sender}: {self.content[:30]}...>"
