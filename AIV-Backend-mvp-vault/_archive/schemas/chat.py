"""
Schemas for chats.
"""
from pydantic import BaseModel, Field
from typing import Optional, List
from uuid import UUID
from datetime import datetime
from enum import Enum


# ============== Enums ==============

class ChatTypeEnum(str, Enum):
    DIRECT = "direct"
    GROUP = "group"


# ============== Request Schemas ==============

class ChatCreate(BaseModel):
    """Create a new chat with participants and initial message."""
    title: Optional[str] = Field(None, max_length=200)
    participant_clone_ids: List[UUID] = []  # Clones from contacts
    participant_user_ids: List[UUID] = []   # Users from contacts (optional)
    initial_message: Optional[str] = Field(None, max_length=5000)


class ChatMessageCreate(BaseModel):
    """Send a message in chat."""
    content: str = Field(..., min_length=1, max_length=5000)


class AddParticipant(BaseModel):
    """Add participant to chat."""
    clone_id: Optional[UUID] = None
    user_id: Optional[UUID] = None


# ============== Response Schemas ==============

class ParticipantCloneInfo(BaseModel):
    """Clone participant info."""
    id: UUID
    name: str
    avatar_icon_url: Optional[str] = None
    
    class Config:
        from_attributes = True


class ParticipantUserInfo(BaseModel):
    """User participant info."""
    id: UUID
    name: str
    user_name: str
    
    class Config:
        from_attributes = True


class ParticipantResponse(BaseModel):
    """Chat participant."""
    id: UUID
    participant_type: str  # "clone" or "user"
    role: str
    clone: Optional[ParticipantCloneInfo] = None
    user: Optional[ParticipantUserInfo] = None
    joined_at: datetime


class ChatMessageResponse(BaseModel):
    """Chat message."""
    id: UUID
    chat_id: UUID
    content: str
    message_type: str
    sender_type: str  # "user" or "clone"
    sender_id: UUID
    sender_name: str
    sender_avatar: Optional[str] = None
    mentions: Optional[dict] = None
    created_at: datetime


class ChatResponse(BaseModel):
    """Chat response."""
    id: UUID
    workspace_id: UUID
    title: Optional[str] = None
    chat_type: str
    is_archived: bool
    participant_count: int
    message_count: int
    last_message: Optional[ChatMessageResponse] = None
    created_at: datetime
    updated_at: datetime


class ChatDetailResponse(ChatResponse):
    """Chat with participants and messages."""
    participants: List[ParticipantResponse] = []
    messages: List[ChatMessageResponse] = []
