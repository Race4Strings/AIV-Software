"""
Background Tasks for Tool Monitoring

Polls external tools (Gmail) for new events and creates notifications in chats.
"""
import asyncio
from datetime import datetime, timezone, timedelta
from typing import Optional
import logging

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from ..database import async_session_maker
from ..models import (
    UserToolConnection, ChatTool, ToolEvent, ChatMessage,
    Chat, ToolEventType, MessageType
)
from ..services.gmail_adapter import GmailAdapter

logger = logging.getLogger(__name__)


class ToolMonitoringService:
    """Background service for monitoring connected tools."""
    
    def __init__(self):
        self.running = False
        self.poll_interval = 60  # 1 minute
        self._task: Optional[asyncio.Task] = None
    
    async def start(self):
        """Start the monitoring loop."""
        if self.running:
            logger.warning("Tool monitoring already running")
            return
        
        self.running = True
        self._task = asyncio.create_task(self._monitoring_loop())
        logger.info(f"✅ Tool monitoring started (polling every {self.poll_interval}s)")
    
    async def stop(self):
        """Stop the monitoring loop."""
        self.running = False
        if self._task:
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass
        logger.info("⏹️ Tool monitoring stopped")
    
    async def _monitoring_loop(self):
        """Main monitoring loop."""
        while self.running:
            try:
                await self._poll_all_connections()
            except Exception as e:
                logger.error(f"Error in monitoring loop: {e}")
            
            await asyncio.sleep(self.poll_interval)
    
    async def _poll_all_connections(self):
        """Poll all active tool connections."""
        async with async_session_maker() as db:
            # Get all active Gmail connections that have chats
            result = await db.execute(
                select(UserToolConnection)
                .options(selectinload(UserToolConnection.tool))
                .where(
                    UserToolConnection.is_active == True,
                    UserToolConnection.access_token.isnot(None)
                )
            )
            connections = result.scalars().all()
            
            for connection in connections:
                if connection.tool.slug == "gmail":
                    await self._poll_gmail(connection, db)
    
    async def _poll_gmail(self, connection: UserToolConnection, db: AsyncSession):
        """Poll Gmail for new emails."""
        try:
            adapter = GmailAdapter(connection.access_token)
            
            # Get emails since last sync
            since = connection.last_synced_at or (datetime.now(timezone.utc) - timedelta(hours=1))
            
            emails = await adapter.get_recent_emails(
                count=10,
                unread_only=True,
                since=since
            )
            
            if not emails:
                # Update last synced even if no emails
                connection.last_synced_at = datetime.now(timezone.utc)
                await db.commit()
                return
            
            # Get chats that have this tool enabled
            chat_tools_result = await db.execute(
                select(ChatTool)
                .options(selectinload(ChatTool.chat))
                .where(ChatTool.tool_connection_id == connection.id)
            )
            chat_tools = chat_tools_result.scalars().all()
            
            if not chat_tools:
                # No chats to notify
                connection.last_synced_at = datetime.now(timezone.utc)
                await db.commit()
                return
            
            # Process each new email
            for email in emails:
                # Check if already processed
                existing = await db.execute(
                    select(ToolEvent).where(
                        ToolEvent.tool_connection_id == connection.id,
                        ToolEvent.event_id == email["id"]
                    )
                )
                if existing.scalar_one_or_none():
                    continue
                
                # Create tool event
                event = ToolEvent(
                    tool_connection_id=connection.id,
                    event_type=ToolEventType.NEW_EMAIL,
                    event_id=email["id"],
                    event_data=email,
                    processed=False
                )
                db.add(event)
                
                # Create notification messages in each chat
                for chat_tool in chat_tools:
                    await self._create_email_notification(
                        db=db,
                        chat=chat_tool.chat,
                        email=email
                    )
                
                # Mark as processed
                event.processed = True
                event.processed_at = datetime.now(timezone.utc)
            
            # Update last synced
            connection.last_synced_at = datetime.now(timezone.utc)
            await db.commit()
            
            logger.info(f"📧 Processed {len(emails)} emails for {connection.account_email}")
            
        except Exception as e:
            logger.error(f"Error polling Gmail for {connection.account_email}: {e}")
    
    async def _create_email_notification(
        self,
        db: AsyncSession,
        chat: Chat,
        email: dict
    ):
        """Create a notification message in the chat about new email."""
        sender = email.get("from", "Unknown")
        subject = email.get("subject", "(no subject)")
        snippet = email.get("snippet", "")[:100]
        
        # Format message
        message_content = f"""📧 **New Email Received**

**From:** {sender}
**Subject:** {subject}

{snippet}{"..." if len(email.get("snippet", "")) > 100 else ""}

_Reply to this message if you'd like me to help with this email._"""
        
        # Create system-style message (from the clone would be better, but we need clone context)
        # For now, create as a system notification
        chat_message = ChatMessage(
            chat_id=chat.id,
            sender_user_id=None,
            sender_clone_id=None,  # System message
            content=message_content,
            message_type=MessageType.TEXT,
            mentions={"type": "email_notification", "email_id": email.get("id")}
        )
        db.add(chat_message)
        
        logger.info(f"📬 Created email notification in chat {chat.id}")


# Singleton
_monitoring_service: Optional[ToolMonitoringService] = None


def get_monitoring_service() -> ToolMonitoringService:
    """Get singleton monitoring service."""
    global _monitoring_service
    if _monitoring_service is None:
        _monitoring_service = ToolMonitoringService()
    return _monitoring_service


async def start_monitoring():
    """Start the background monitoring service."""
    service = get_monitoring_service()
    await service.start()


async def stop_monitoring():
    """Stop the background monitoring service."""
    service = get_monitoring_service()
    await service.stop()
