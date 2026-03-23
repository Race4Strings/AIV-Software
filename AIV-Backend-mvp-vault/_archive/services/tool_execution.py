"""
Tool Execution Service

Handles tool execution from chat, intent detection, and action confirmation.
"""
from typing import List, Dict, Any, Optional, Tuple
from uuid import UUID
from datetime import datetime, timezone
import json
import re

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from ..models import (
    UserToolConnection, ChatTool, ToolActionLog, ToolEvent,
    Chat, Clone
)
from ..services.gmail_adapter import GmailAdapter
from ..config import get_settings


class ToolExecutionService:
    """Service for executing tool actions from chat."""
    
    # Keywords that suggest tool-related intent
    GMAIL_KEYWORDS = [
        "email", "emails", "mail", "inbox", "unread", "send email",
        "reply", "compose", "message from", "check mail", "new mail",
        "gmail", "forward", "archive"
    ]
    
    def __init__(self, db: AsyncSession):
        self.db = db
    
    async def get_chat_tools(self, chat_id: UUID, user_id: str) -> List[Dict[str, Any]]:
        """Get tools available in a chat for the user."""
        result = await self.db.execute(
            select(ChatTool)
            .options(
                selectinload(ChatTool.connection).selectinload(UserToolConnection.tool)
            )
            .where(ChatTool.chat_id == chat_id)
        )
        chat_tools = result.scalars().all()
        
        tools = []
        for ct in chat_tools:
            # Only include tools owned by the user
            if str(ct.connection.user_id) == user_id:
                tools.append({
                    "id": str(ct.id),
                    "connection_id": str(ct.connection.id),
                    "name": ct.connection.tool.name,
                    "slug": ct.connection.tool.slug,
                    "capabilities": ct.connection.tool.capabilities or [],
                    "account_email": ct.connection.account_email,
                    "access_token": ct.connection.access_token
                })
        
        return tools
    
    def build_tool_prompt(self, tools: List[Dict[str, Any]]) -> str:
        """Build prompt section describing available tools."""
        if not tools:
            return ""
        
        prompt_parts = ["\n\n## Available Tools\nYou have access to the following tools:\n"]
        
        for tool in tools:
            caps = tool.get("capabilities", [])
            cap_list = ", ".join([c.get("name", "") for c in caps])
            prompt_parts.append(f"\n### {tool['name']} ({tool['account_email']})")
            prompt_parts.append(f"Capabilities: {cap_list}")
        
        prompt_parts.append("""

## Tool Usage Instructions

When the user asks about emails, calendar, or other connected tools:
1. Use the tool to get real information
2. Summarize the results naturally
3. For ACTIONS that modify data (send, delete, archive):
   - Always ask for confirmation first
   - Say: "I'll [action]. Should I proceed? (yes/no)"
   - Wait for user's confirmation before executing

Example responses:
- "You have 5 unread emails. The most recent is from John about 'Project Update'."
- "I can send that reply to Sarah. Here's what I'll send: [draft]. Should I proceed?"

IMPORTANT: For any action that sends, deletes, or modifies data, you MUST ask for confirmation first.
""")
        
        return "\n".join(prompt_parts)
    
    def detect_tool_intent(self, message: str, tools: List[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
        """Detect if message implies a tool action."""
        message_lower = message.lower()
        
        # Check for Gmail-related intent
        gmail_tool = next((t for t in tools if t["slug"] == "gmail"), None)
        if gmail_tool:
            for keyword in self.GMAIL_KEYWORDS:
                if keyword in message_lower:
                    return {
                        "tool": gmail_tool,
                        "intent_type": self._classify_gmail_intent(message_lower)
                    }
        
        return None
    
    def _classify_gmail_intent(self, message: str) -> str:
        """Classify the type of Gmail intent."""
        if any(w in message for w in ["send", "compose", "write", "draft"]):
            return "send_email"
        elif any(w in message for w in ["reply", "respond"]):
            return "reply_email"
        elif any(w in message for w in ["unread", "how many", "count"]):
            return "get_unread_count"
        elif any(w in message for w in ["search", "find", "look for"]):
            return "search_emails"
        elif any(w in message for w in ["archive", "clean"]):
            return "archive_email"
        else:
            return "read_emails"
    
    async def execute_tool_action(
        self,
        tool: Dict[str, Any],
        action: str,
        parameters: Dict[str, Any],
        user_id: str,
        chat_id: UUID
    ) -> Dict[str, Any]:
        """Execute a tool action."""
        requires_confirmation = self._action_requires_confirmation(action)
        
        if tool["slug"] == "gmail":
            return await self._execute_gmail_action(
                tool, action, parameters, user_id, chat_id, requires_confirmation
            )
        
        return {"success": False, "error": f"Unknown tool: {tool['slug']}"}
    
    def _action_requires_confirmation(self, action: str) -> bool:
        """Check if action requires user confirmation."""
        confirmation_actions = ["send_email", "reply_email", "archive_email", "trash_email"]
        return action in confirmation_actions
    
    async def _execute_gmail_action(
        self,
        tool: Dict[str, Any],
        action: str,
        parameters: Dict[str, Any],
        user_id: str,
        chat_id: UUID,
        requires_confirmation: bool
    ) -> Dict[str, Any]:
        """Execute a Gmail action."""
        adapter = GmailAdapter(tool["access_token"])
        
        try:
            if action == "get_unread_count":
                count = await adapter.get_unread_count()
                return {
                    "success": True,
                    "action": action,
                    "result": {"unread_count": count},
                    "message": f"You have {count} unread email{'s' if count != 1 else ''}."
                }
            
            elif action == "read_emails":
                count = parameters.get("count", 5)
                unread_only = parameters.get("unread_only", False)
                emails = await adapter.get_recent_emails(count=count, unread_only=unread_only)
                return {
                    "success": True,
                    "action": action,
                    "result": {"emails": emails, "count": len(emails)},
                    "message": self._format_email_list(emails)
                }
            
            elif action == "search_emails":
                query = parameters.get("query", "")
                emails = await adapter.search_emails(query=query, max_results=5)
                return {
                    "success": True,
                    "action": action,
                    "result": {"emails": emails, "query": query},
                    "message": self._format_email_list(emails, f"Found {len(emails)} emails matching '{query}'")
                }
            
            elif action == "send_email":
                if requires_confirmation and not parameters.get("confirmed"):
                    # Create pending action
                    action_log = await self._create_pending_action(
                        tool, action, parameters, user_id, chat_id
                    )
                    return {
                        "success": True,
                        "requires_confirmation": True,
                        "action_id": str(action_log.id),
                        "message": f"I'll send an email to {parameters.get('to')} with subject '{parameters.get('subject')}'. Should I proceed? (yes/no)"
                    }
                
                # Execute send
                result = await adapter.send_email(
                    to=parameters.get("to"),
                    subject=parameters.get("subject"),
                    body=parameters.get("body")
                )
                return {
                    "success": True,
                    "action": action,
                    "result": result,
                    "message": f"✅ Email sent to {parameters.get('to')}"
                }
            
            elif action == "reply_email":
                if requires_confirmation and not parameters.get("confirmed"):
                    action_log = await self._create_pending_action(
                        tool, action, parameters, user_id, chat_id
                    )
                    return {
                        "success": True,
                        "requires_confirmation": True,
                        "action_id": str(action_log.id),
                        "message": f"I'll reply to this email with: \"{parameters.get('body')[:100]}...\". Should I proceed? (yes/no)"
                    }
                
                result = await adapter.reply_to_email(
                    message_id=parameters.get("message_id"),
                    body=parameters.get("body")
                )
                return {
                    "success": True,
                    "action": action,
                    "result": result,
                    "message": "✅ Reply sent!"
                }
            
            elif action == "archive_email":
                if requires_confirmation and not parameters.get("confirmed"):
                    action_log = await self._create_pending_action(
                        tool, action, parameters, user_id, chat_id
                    )
                    return {
                        "success": True,
                        "requires_confirmation": True,
                        "action_id": str(action_log.id),
                        "message": "I'll archive this email. Should I proceed? (yes/no)"
                    }
                
                result = await adapter.archive_message(parameters.get("message_id"))
                return {
                    "success": True,
                    "action": action,
                    "result": result,
                    "message": "✅ Email archived"
                }
            
            else:
                return {"success": False, "error": f"Unknown action: {action}"}
                
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    def _format_email_list(self, emails: List[Dict], prefix: str = None) -> str:
        """Format email list for display."""
        if not emails:
            return prefix or "No emails found."
        
        lines = [prefix] if prefix else [f"Here are your {len(emails)} most recent emails:"]
        for i, email in enumerate(emails[:5], 1):
            unread = "📩" if email.get("is_unread") else "📧"
            lines.append(f"{i}. {unread} From: {email.get('from', 'Unknown')} - \"{email.get('subject', '(no subject)')}\"")
        
        return "\n".join(lines)
    
    async def _create_pending_action(
        self,
        tool: Dict[str, Any],
        action: str,
        parameters: Dict[str, Any],
        user_id: str,
        chat_id: UUID
    ) -> ToolActionLog:
        """Create a pending action requiring confirmation."""
        action_log = ToolActionLog(
            tool_connection_id=tool["connection_id"],
            chat_id=chat_id,
            user_id=user_id,
            action_type=action,
            action_data=parameters,
            requires_confirmation=True,
            confirmed=False
        )
        self.db.add(action_log)
        await self.db.commit()
        await self.db.refresh(action_log)
        return action_log
    
    async def confirm_action(self, action_id: UUID, user_id: str, confirmed: bool) -> Dict[str, Any]:
        """Confirm or reject a pending action."""
        result = await self.db.execute(
            select(ToolActionLog)
            .options(selectinload(ToolActionLog.connection))
            .where(
                ToolActionLog.id == action_id,
                ToolActionLog.user_id == user_id,
                ToolActionLog.executed == False
            )
        )
        action_log = result.scalar_one_or_none()
        
        if not action_log:
            return {"success": False, "error": "Action not found or already executed"}
        
        action_log.confirmed = confirmed
        action_log.confirmed_at = datetime.now(timezone.utc)
        
        if not confirmed:
            await self.db.commit()
            return {"success": True, "message": "Action cancelled."}
        
        # Execute the action
        tool = {
            "slug": "gmail",  # TODO: get from connection
            "connection_id": str(action_log.tool_connection_id),
            "access_token": action_log.connection.access_token
        }
        
        params = action_log.action_data or {}
        params["confirmed"] = True
        
        exec_result = await self.execute_tool_action(
            tool=tool,
            action=action_log.action_type,
            parameters=params,
            user_id=user_id,
            chat_id=action_log.chat_id
        )
        
        action_log.executed = True
        action_log.executed_at = datetime.now(timezone.utc)
        action_log.result = exec_result
        await self.db.commit()
        
        return exec_result


def get_tool_execution_service(db: AsyncSession) -> ToolExecutionService:
    """Get tool execution service instance."""
    return ToolExecutionService(db)
