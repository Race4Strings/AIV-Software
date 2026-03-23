"""
Schemas for contacts.
"""
from pydantic import BaseModel, Field
from typing import Optional
from uuid import UUID
from datetime import datetime


# ============== Request Schemas ==============

class ContactCreate(BaseModel):
    """Add a contact (clone or user)."""
    contact_user_id: Optional[UUID] = None
    contact_clone_id: Optional[UUID] = None
    nickname: Optional[str] = Field(None, max_length=100)


# ============== Response Schemas ==============

class ContactCloneInfo(BaseModel):
    """Clone info in contact response."""
    id: UUID
    name: str
    avatar_profile_url: Optional[str] = None
    avatar_icon_url: Optional[str] = None
    
    class Config:
        from_attributes = True


class ContactUserInfo(BaseModel):
    """User info in contact response."""
    id: UUID
    name: str
    user_name: str
    
    class Config:
        from_attributes = True


class ContactResponse(BaseModel):
    """Contact response."""
    id: UUID
    owner_id: UUID
    nickname: Optional[str] = None
    is_favorite: bool
    contact_type: str  # "clone" or "user"
    
    # One of these will be populated
    clone: Optional[ContactCloneInfo] = None
    user: Optional[ContactUserInfo] = None
    
    created_at: datetime
    
    class Config:
        from_attributes = True


class ContactSearchResult(BaseModel):
    """Public search result for clones and users."""
    id: UUID
    name: str
    type: str = "clone"  # "clone" or "user"
    user_name: Optional[str] = None
    description: Optional[str] = None
    avatar_profile_url: Optional[str] = None
    avatar_icon_url: Optional[str] = None
    owner_name: Optional[str] = None
    
    class Config:
        from_attributes = True
