"""
Schemas for notifications.
"""
from pydantic import BaseModel
from typing import Optional
from uuid import UUID
from datetime import datetime


class NotificationResponse(BaseModel):
    """Notification response."""
    id: UUID
    user_id: UUID
    type: str
    title: Optional[str] = None
    message: Optional[str] = None
    chat_id: Optional[UUID] = None
    message_id: Optional[UUID] = None
    is_read: bool
    created_at: datetime
    
    class Config:
        from_attributes = True
