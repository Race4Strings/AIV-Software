"""
Schemas for training chat sessions.
"""
from pydantic import BaseModel, Field
from typing import Optional, Dict, List, Any
from uuid import UUID
from datetime import datetime


# ============== Request Schemas ==============

class TrainingSessionCreate(BaseModel):
    """Schema for starting a new training session."""
    title: Optional[str] = None


class TrainingMessageCreate(BaseModel):
    """Schema for sending a training message."""
    content: str = Field(..., min_length=1, max_length=5000)


# ============== Response Schemas ==============

class TrainingMessageResponse(BaseModel):
    """Response for a training message."""
    id: UUID
    session_id: UUID
    role: str
    content: str
    analyzed: bool = False
    analysis: Optional[Dict[str, Any]] = None
    dimensions_affected: Optional[List[str]] = None
    created_at: datetime
    
    class Config:
        from_attributes = True


class TrainingSessionResponse(BaseModel):
    """Response for a training session."""
    id: UUID
    clone_id: UUID
    owner_id: UUID
    title: Optional[str]
    message_count: int = 0
    dimensions_updated: List[str] = []
    ended_at: Optional[datetime]
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class TrainingSessionWithMessages(TrainingSessionResponse):
    """Training session with messages included."""
    messages: List[TrainingMessageResponse] = []


class SendMessageResponse(BaseModel):
    """Response after sending a message in training."""
    user_message: TrainingMessageResponse
    assistant_message: TrainingMessageResponse
    dimension_updated: Optional[Dict[str, Any]] = None  # If dimension was changed


class TrainingStatsResponse(BaseModel):
    """Statistics about training progress."""
    total_sessions: int
    total_messages: int
    dimensions_updated: Dict[str, int]  # {'mind': 3, 'heart': 2, ...}
    last_trained_at: Optional[datetime]
