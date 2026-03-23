"""
Schemas for tool integrations.
"""
from pydantic import BaseModel, Field
from typing import Optional, List, Any
from uuid import UUID
from datetime import datetime


# ============== Tool Definition ==============

class ToolCapability(BaseModel):
    """A capability the tool provides."""
    name: str
    description: str
    requires_confirmation: bool = False


class ToolDefinitionResponse(BaseModel):
    """Tool definition response."""
    id: UUID
    name: str
    slug: str
    description: Optional[str] = None
    icon_url: Optional[str] = None
    provider: str
    capabilities: Optional[List[ToolCapability]] = None
    is_connected: bool = False  # Whether user has connected this tool
    
    class Config:
        from_attributes = True


# ============== User Tool Connection ==============

class ToolConnectionResponse(BaseModel):
    """User's connected tool."""
    id: UUID
    tool_id: UUID
    tool_name: str
    tool_slug: str
    tool_icon: Optional[str] = None
    account_email: Optional[str] = None
    account_name: Optional[str] = None
    connected_at: datetime
    last_synced_at: Optional[datetime] = None
    is_active: bool
    
    class Config:
        from_attributes = True


# ============== Chat Tool ==============

class ChatToolAdd(BaseModel):
    """Add tool to chat."""
    tool_connection_id: UUID
    settings: Optional[dict] = Field(default_factory=dict)


class ChatToolResponse(BaseModel):
    """Tool enabled in chat."""
    id: UUID
    tool_name: str
    tool_slug: str
    tool_icon: Optional[str] = None
    account_email: Optional[str] = None
    settings: Optional[dict] = None
    added_at: datetime
    
    class Config:
        from_attributes = True


# ============== Tool Actions ==============

class ToolActionRequest(BaseModel):
    """Request to execute a tool action."""
    tool_connection_id: UUID
    action: str  # "send_email", "get_unread"
    parameters: dict = Field(default_factory=dict)


class ToolActionPending(BaseModel):
    """Pending action requiring confirmation."""
    action_id: UUID
    action_type: str
    description: str
    details: dict


class ToolActionResult(BaseModel):
    """Result of tool action."""
    success: bool
    action_type: str
    result: Optional[Any] = None
    error: Optional[str] = None
    requires_confirmation: bool = False
    pending_action: Optional[ToolActionPending] = None


class ConfirmActionRequest(BaseModel):
    """Confirm a pending action."""
    action_id: UUID
    confirmed: bool


# ============== Tool Events ==============

class ToolEventResponse(BaseModel):
    """Event from a tool."""
    id: UUID
    event_type: str
    event_data: Optional[dict] = None
    created_at: datetime
    
    class Config:
        from_attributes = True


# ============== OAuth ==============

class OAuthStartResponse(BaseModel):
    """OAuth flow start response."""
    auth_url: str
    state: str
