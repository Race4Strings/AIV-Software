"""
Schemas for workspaces.
"""
from pydantic import BaseModel, Field
from typing import Optional, List
from uuid import UUID
from datetime import datetime


# ============== Request Schemas ==============

class WorkspaceCreate(BaseModel):
    """Create a new workspace."""
    name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=500)
    icon: Optional[str] = Field(None, max_length=50)


class WorkspaceUpdate(BaseModel):
    """Update a workspace."""
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=500)
    icon: Optional[str] = Field(None, max_length=50)


# ============== Response Schemas ==============

class WorkspaceResponse(BaseModel):
    """Workspace response."""
    id: UUID
    owner_id: UUID
    name: str
    description: Optional[str] = None
    is_default: bool
    icon: Optional[str] = None
    chat_count: int = 0
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True
