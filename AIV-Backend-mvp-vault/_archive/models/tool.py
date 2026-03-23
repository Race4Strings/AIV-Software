"""
Tool models for external service integrations (Gmail, Calendar, etc.).
"""
from sqlalchemy import Column, String, Text, Boolean, DateTime, ForeignKey, Enum, func
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
import uuid
import enum

from ..database import Base


class ToolProvider(str, enum.Enum):
    """OAuth provider for the tool."""
    GOOGLE = "google"
    MICROSOFT = "microsoft"
    SLACK = "slack"


class ToolEventType(str, enum.Enum):
    """Types of events from tools."""
    NEW_EMAIL = "new_email"
    EMAIL_REPLY = "email_reply"
    CALENDAR_EVENT = "calendar_event"
    CALENDAR_REMINDER = "calendar_reminder"
    SLACK_MESSAGE = "slack_message"


class ToolDefinition(Base):
    """System-defined available tools."""
    
    __tablename__ = "tool_definition_table"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(100), nullable=False)  # "Gmail"
    slug = Column(String(50), unique=True, nullable=False)  # "gmail"
    description = Column(Text, nullable=True)
    icon_url = Column(Text, nullable=True)
    
    provider = Column(Enum(ToolProvider), nullable=False)
    oauth_scopes = Column(JSONB, nullable=True)  # Required OAuth scopes
    capabilities = Column(JSONB, nullable=True)  # What the tool can do
    
    is_active = Column(Boolean, default=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    
    # Relationships
    connections = relationship("UserToolConnection", back_populates="tool")
    
    def __repr__(self):
        return f"<ToolDefinition {self.name}>"


class UserToolConnection(Base):
    """User's connected tool with OAuth tokens."""
    
    __tablename__ = "user_tool_connection_table"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("user_table.id"), nullable=False, index=True)
    tool_id = Column(UUID(as_uuid=True), ForeignKey("tool_definition_table.id"), nullable=False, index=True)
    
    # OAuth tokens (should be encrypted in production)
    access_token = Column(Text, nullable=True)
    refresh_token = Column(Text, nullable=True)
    token_expires_at = Column(DateTime(timezone=True), nullable=True)
    
    # Connected account info
    account_email = Column(String(255), nullable=True)
    account_name = Column(String(255), nullable=True)
    
    # User preferences for this tool
    settings = Column(JSONB, default=dict)
    
    # Tracking
    connected_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    last_synced_at = Column(DateTime(timezone=True), nullable=True)
    is_active = Column(Boolean, default=True)
    
    # Relationships
    user = relationship("User", backref="tool_connections")
    tool = relationship("ToolDefinition", back_populates="connections")
    chat_tools = relationship("ChatTool", back_populates="connection", cascade="all, delete-orphan")
    events = relationship("ToolEvent", back_populates="connection", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<UserToolConnection {self.account_email}>"


class ChatTool(Base):
    """Tool enabled in a specific chat."""
    
    __tablename__ = "chat_tool_table"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    chat_id = Column(UUID(as_uuid=True), ForeignKey("chat_table.id"), nullable=False, index=True)
    tool_connection_id = Column(UUID(as_uuid=True), ForeignKey("user_tool_connection_table.id"), nullable=False)
    added_by_id = Column(UUID(as_uuid=True), ForeignKey("user_table.id"), nullable=False)
    
    # Chat-specific settings
    settings = Column(JSONB, default=dict)  # e.g., {"notify_all_emails": false, "important_only": true}
    
    added_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    
    # Relationships
    chat = relationship("Chat", backref="tools")
    connection = relationship("UserToolConnection", back_populates="chat_tools")
    added_by = relationship("User")
    
    def __repr__(self):
        return f"<ChatTool chat={self.chat_id}>"


class ToolEvent(Base):
    """Events detected from tools (new emails, etc.)."""
    
    __tablename__ = "tool_event_table"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tool_connection_id = Column(UUID(as_uuid=True), ForeignKey("user_tool_connection_table.id"), nullable=False, index=True)
    
    event_type = Column(Enum(ToolEventType), nullable=False)
    event_id = Column(String(255), nullable=True)  # External ID (email ID, event ID)
    event_data = Column(JSONB, nullable=True)  # Event details
    
    # Processing status
    processed = Column(Boolean, default=False, index=True)
    processed_at = Column(DateTime(timezone=True), nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    
    # Relationships
    connection = relationship("UserToolConnection", back_populates="events")
    
    def __repr__(self):
        return f"<ToolEvent {self.event_type}>"


class ToolActionLog(Base):
    """Log of actions performed through tools."""
    
    __tablename__ = "tool_action_log_table"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tool_connection_id = Column(UUID(as_uuid=True), ForeignKey("user_tool_connection_table.id"), nullable=False)
    chat_id = Column(UUID(as_uuid=True), ForeignKey("chat_table.id"), nullable=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("user_table.id"), nullable=False)
    
    action_type = Column(String(100), nullable=False)  # "send_email", "create_event"
    action_data = Column(JSONB, nullable=True)  # Action parameters
    
    # Confirmation
    requires_confirmation = Column(Boolean, default=True)
    confirmed = Column(Boolean, default=False)
    confirmed_at = Column(DateTime(timezone=True), nullable=True)
    
    # Execution
    executed = Column(Boolean, default=False)
    executed_at = Column(DateTime(timezone=True), nullable=True)
    result = Column(JSONB, nullable=True)  # Result or error
    
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    
    # Relationships
    connection = relationship("UserToolConnection")
    chat = relationship("Chat", backref="tool_actions")
    user = relationship("User", backref="tool_actions")
    
    def __repr__(self):
        return f"<ToolActionLog {self.action_type}>"
