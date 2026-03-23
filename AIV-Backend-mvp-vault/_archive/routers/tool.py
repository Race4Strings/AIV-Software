"""
Tools Router

Endpoints for managing external tool integrations (Gmail, Calendar, etc.).
"""
from typing import List, Optional
from uuid import UUID
import secrets
from datetime import datetime, timezone, timedelta

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import RedirectResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
import httpx

from ..database import get_db
from ..config import get_settings
from ..models import (
    ToolDefinition, UserToolConnection, ChatTool, ToolEvent, ToolActionLog,
    Chat, ToolProvider
)
from ..schemas.tool import (
    ToolDefinitionResponse, ToolConnectionResponse, ChatToolResponse,
    ChatToolAdd, OAuthStartResponse, ToolActionRequest, ToolActionResult,
    ConfirmActionRequest
)
from ..middleware.auth_middleware import require_auth

router = APIRouter(prefix="/tools", tags=["Tools"])

# OAuth state storage (in production, use Redis)
oauth_states = {}


# ============== Tool Discovery ==============

@router.get("", response_model=List[ToolDefinitionResponse])
async def list_tools(
    user: dict = Depends(require_auth),
    db: AsyncSession = Depends(get_db),
):
    """List all available tools with connection status."""
    # Get all active tools
    tools_result = await db.execute(
        select(ToolDefinition).where(ToolDefinition.is_active == True)
    )
    tools = tools_result.scalars().all()
    
    # Get user's connections
    connections_result = await db.execute(
        select(UserToolConnection.tool_id).where(
            UserToolConnection.user_id == user["id"],
            UserToolConnection.is_active == True
        )
    )
    connected_tool_ids = {row for row in connections_result.scalars().all()}
    
    response = []
    for tool in tools:
        caps = tool.capabilities or []
        response.append(ToolDefinitionResponse(
            id=tool.id,
            name=tool.name,
            slug=tool.slug,
            description=tool.description,
            icon_url=tool.icon_url,
            provider=tool.provider.value if tool.provider else "unknown",
            capabilities=caps,
            is_connected=tool.id in connected_tool_ids
        ))
    
    return response


# ============== User Connections ==============

@router.get("/connections", response_model=List[ToolConnectionResponse])
async def list_connections(
    user: dict = Depends(require_auth),
    db: AsyncSession = Depends(get_db),
):
    """List user's connected tools."""
    result = await db.execute(
        select(UserToolConnection)
        .options(selectinload(UserToolConnection.tool))
        .where(
            UserToolConnection.user_id == user["id"],
            UserToolConnection.is_active == True
        )
    )
    connections = result.scalars().all()
    
    return [
        ToolConnectionResponse(
            id=c.id,
            tool_id=c.tool_id,
            tool_name=c.tool.name,
            tool_slug=c.tool.slug,
            tool_icon=c.tool.icon_url,
            account_email=c.account_email,
            account_name=c.account_name,
            connected_at=c.connected_at,
            last_synced_at=c.last_synced_at,
            is_active=c.is_active
        )
        for c in connections
    ]


@router.delete("/connections/{connection_id}")
async def disconnect_tool(
    connection_id: UUID,
    user: dict = Depends(require_auth),
    db: AsyncSession = Depends(get_db),
):
    """Disconnect a tool from user's account."""
    result = await db.execute(
        select(UserToolConnection).where(
            UserToolConnection.id == connection_id,
            UserToolConnection.user_id == user["id"]
        )
    )
    connection = result.scalar_one_or_none()
    
    if not connection:
        raise HTTPException(status_code=404, detail="Connection not found")
    
    # Soft delete - mark as inactive
    connection.is_active = False
    connection.access_token = None
    connection.refresh_token = None
    
    await db.commit()
    
    return {"status": "disconnected", "connection_id": str(connection_id)}


# ============== OAuth Flow ==============

@router.get("/{slug}/auth", response_model=OAuthStartResponse)
async def start_oauth(
    slug: str,
    user: dict = Depends(require_auth),
    db: AsyncSession = Depends(get_db),
):
    """Start OAuth flow for a tool."""
    settings = get_settings()
    
    # Get tool definition
    result = await db.execute(
        select(ToolDefinition).where(ToolDefinition.slug == slug)
    )
    tool = result.scalar_one_or_none()
    
    if not tool:
        raise HTTPException(status_code=404, detail="Tool not found")
    
    # Generate OAuth state
    state = secrets.token_urlsafe(32)
    oauth_states[state] = {
        "user_id": user["id"],
        "tool_id": str(tool.id),
        "tool_slug": slug,
        "expires": datetime.now(timezone.utc) + timedelta(minutes=10)
    }
    
    # Build OAuth URL based on provider
    if tool.provider == ToolProvider.GOOGLE:
        scopes = " ".join(tool.oauth_scopes or [
            "https://www.googleapis.com/auth/gmail.readonly",
            "https://www.googleapis.com/auth/gmail.send",
            "https://www.googleapis.com/auth/gmail.modify"
        ])
        
        auth_url = (
            "https://accounts.google.com/o/oauth2/v2/auth?"
            f"client_id={settings.google_client_id}&"
            f"redirect_uri={settings.api_base_url}/tools/{slug}/callback&"
            f"response_type=code&"
            f"scope={scopes}&"
            f"state={state}&"
            f"access_type=offline&"
            f"prompt=consent"
        )
    else:
        raise HTTPException(status_code=400, detail=f"Provider {tool.provider} not supported")
    
    return OAuthStartResponse(auth_url=auth_url, state=state)


@router.get("/{slug}/callback")
async def oauth_callback(
    slug: str,
    code: str = Query(...),
    state: str = Query(None),  # Made optional for testing
    error: str = Query(None),
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(require_auth),  # Get user from session as fallback
):
    """OAuth callback handler."""
    settings = get_settings()
    
    # Handle errors from OAuth provider
    if error:
        # Redirect to frontend with error
        return RedirectResponse(f"{settings.frontend_url}/tools?error={error}")
    
    # Get state data or use session fallback
    state_data = None
    if state:
        state_data = oauth_states.pop(state, None)
    
    if not state_data:
        # Fallback: use current session user (for testing without state)
        if user:
            state_data = {"user_id": user["id"]}
        else:
            return RedirectResponse(f"{settings.frontend_url}/tools?error=invalid_state")
    elif datetime.now(timezone.utc) > state_data.get("expires", datetime.max.replace(tzinfo=timezone.utc)):
        return RedirectResponse(f"{settings.frontend_url}/tools?error=expired_state")
    
    # Get tool
    result = await db.execute(
        select(ToolDefinition).where(ToolDefinition.slug == slug)
    )
    tool = result.scalar_one_or_none()
    
    if not tool:
        return RedirectResponse(f"{settings.frontend_url}/tools?error=tool_not_found")
    
    try:
        # Exchange code for tokens
        if tool.provider == ToolProvider.GOOGLE:
            token_data = await _exchange_google_code(
                code=code,
                redirect_uri=f"{settings.api_base_url}/tools/{slug}/callback",
                settings=settings
            )
        else:
            return RedirectResponse(f"{settings.frontend_url}/tools?error=unsupported_provider")
        
        # Get user info
        if slug == "gmail":
            user_info = await _get_gmail_profile(token_data["access_token"])
        else:
            user_info = {"email": "unknown", "name": "Unknown"}
        
        # Check for existing connection
        existing = await db.execute(
            select(UserToolConnection).where(
                UserToolConnection.user_id == state_data["user_id"],
                UserToolConnection.tool_id == tool.id
            )
        )
        connection = existing.scalar_one_or_none()
        
        if connection:
            # Update existing connection
            connection.access_token = token_data["access_token"]
            connection.refresh_token = token_data.get("refresh_token", connection.refresh_token)
            connection.token_expires_at = datetime.now(timezone.utc) + timedelta(seconds=token_data.get("expires_in", 3600))
            connection.account_email = user_info.get("email")
            connection.account_name = user_info.get("name")
            connection.is_active = True
        else:
            # Create new connection
            connection = UserToolConnection(
                user_id=state_data["user_id"],
                tool_id=tool.id,
                access_token=token_data["access_token"],
                refresh_token=token_data.get("refresh_token"),
                token_expires_at=datetime.now(timezone.utc) + timedelta(seconds=token_data.get("expires_in", 3600)),
                account_email=user_info.get("email"),
                account_name=user_info.get("name")
            )
            db.add(connection)
        
        await db.commit()
        
        # Redirect to frontend success
        return RedirectResponse(f"{settings.frontend_url}/tools?connected={slug}")
        
    except Exception as e:
        print(f"OAuth error: {e}")
        return RedirectResponse(f"{settings.frontend_url}/tools?error=oauth_failed")


async def _exchange_google_code(code: str, redirect_uri: str, settings) -> dict:
    """Exchange authorization code for Google tokens."""
    async with httpx.AsyncClient() as client:
        response = await client.post(
            "https://oauth2.googleapis.com/token",
            data={
                "code": code,
                "client_id": settings.google_client_id,
                "client_secret": settings.google_client_secret,
                "redirect_uri": redirect_uri,
                "grant_type": "authorization_code"
            }
        )
        response.raise_for_status()
        return response.json()


async def _get_gmail_profile(access_token: str) -> dict:
    """Get Gmail user profile."""
    async with httpx.AsyncClient() as client:
        response = await client.get(
            "https://gmail.googleapis.com/gmail/v1/users/me/profile",
            headers={"Authorization": f"Bearer {access_token}"}
        )
        response.raise_for_status()
        data = response.json()
        return {
            "email": data.get("emailAddress"),
            "name": data.get("emailAddress")  # Gmail doesn't return name in profile
        }


# ============== Chat Tools ==============

@router.get("/chat/{chat_id}", response_model=List[ChatToolResponse])
async def list_chat_tools(
    chat_id: UUID,
    user: dict = Depends(require_auth),
    db: AsyncSession = Depends(get_db),
):
    """List tools enabled in a chat."""
    # Verify chat access
    chat_result = await db.execute(
        select(Chat).where(Chat.id == chat_id)
    )
    chat = chat_result.scalar_one_or_none()
    if not chat or str(chat.creator_id) != user["id"]:
        raise HTTPException(status_code=404, detail="Chat not found")
    
    result = await db.execute(
        select(ChatTool)
        .options(selectinload(ChatTool.connection).selectinload(UserToolConnection.tool))
        .where(ChatTool.chat_id == chat_id)
    )
    chat_tools = result.scalars().all()
    
    return [
        ChatToolResponse(
            id=ct.id,
            tool_name=ct.connection.tool.name,
            tool_slug=ct.connection.tool.slug,
            tool_icon=ct.connection.tool.icon_url,
            account_email=ct.connection.account_email,
            settings=ct.settings,
            added_at=ct.added_at
        )
        for ct in chat_tools
    ]


@router.post("/chat/{chat_id}", response_model=ChatToolResponse)
async def add_tool_to_chat(
    chat_id: UUID,
    data: ChatToolAdd,
    user: dict = Depends(require_auth),
    db: AsyncSession = Depends(get_db),
):
    """Add a tool to a chat."""
    # Verify chat ownership
    chat_result = await db.execute(
        select(Chat).where(Chat.id == chat_id)
    )
    chat = chat_result.scalar_one_or_none()
    if not chat or str(chat.creator_id) != user["id"]:
        raise HTTPException(status_code=404, detail="Chat not found")
    
    # Verify connection ownership
    conn_result = await db.execute(
        select(UserToolConnection)
        .options(selectinload(UserToolConnection.tool))
        .where(
            UserToolConnection.id == data.tool_connection_id,
            UserToolConnection.user_id == user["id"],
            UserToolConnection.is_active == True
        )
    )
    connection = conn_result.scalar_one_or_none()
    if not connection:
        raise HTTPException(status_code=404, detail="Tool connection not found")
    
    # Check if already added
    existing = await db.execute(
        select(ChatTool).where(
            ChatTool.chat_id == chat_id,
            ChatTool.tool_connection_id == data.tool_connection_id
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Tool already added to chat")
    
    # Add to chat
    chat_tool = ChatTool(
        chat_id=chat_id,
        tool_connection_id=data.tool_connection_id,
        added_by_id=user["id"],
        settings=data.settings or {}
    )
    db.add(chat_tool)
    await db.commit()
    await db.refresh(chat_tool)
    
    return ChatToolResponse(
        id=chat_tool.id,
        tool_name=connection.tool.name,
        tool_slug=connection.tool.slug,
        tool_icon=connection.tool.icon_url,
        account_email=connection.account_email,
        settings=chat_tool.settings,
        added_at=chat_tool.added_at
    )


@router.delete("/chat/{chat_id}/{chat_tool_id}")
async def remove_tool_from_chat(
    chat_id: UUID,
    chat_tool_id: UUID,
    user: dict = Depends(require_auth),
    db: AsyncSession = Depends(get_db),
):
    """Remove a tool from a chat."""
    result = await db.execute(
        select(ChatTool)
        .options(selectinload(ChatTool.chat))
        .where(ChatTool.id == chat_tool_id, ChatTool.chat_id == chat_id)
    )
    chat_tool = result.scalar_one_or_none()
    
    if not chat_tool or str(chat_tool.chat.creator_id) != user["id"]:
        raise HTTPException(status_code=404, detail="Chat tool not found")
    
    await db.delete(chat_tool)
    await db.commit()
    
    return {"status": "removed", "chat_tool_id": str(chat_tool_id)}


# ============== Tool Execution ==============

@router.post("/execute", response_model=ToolActionResult)
async def execute_tool_action(
    data: ToolActionRequest,
    user: dict = Depends(require_auth),
    db: AsyncSession = Depends(get_db),
):
    """Execute a tool action (for direct API calls)."""
    from ..services.tool_execution import get_tool_execution_service
    
    # Verify connection ownership
    conn_result = await db.execute(
        select(UserToolConnection)
        .options(selectinload(UserToolConnection.tool))
        .where(
            UserToolConnection.id == data.tool_connection_id,
            UserToolConnection.user_id == user["id"],
            UserToolConnection.is_active == True
        )
    )
    connection = conn_result.scalar_one_or_none()
    if not connection:
        raise HTTPException(status_code=404, detail="Tool connection not found")
    
    tool = {
        "slug": connection.tool.slug,
        "connection_id": str(connection.id),
        "access_token": connection.access_token,
        "capabilities": connection.tool.capabilities or []
    }
    
    service = get_tool_execution_service(db)
    result = await service.execute_tool_action(
        tool=tool,
        action=data.action,
        parameters=data.parameters,
        user_id=user["id"],
        chat_id=None  # Direct execution, no chat
    )
    
    return ToolActionResult(
        success=result.get("success", False),
        action_type=data.action,
        result=result.get("result"),
        error=result.get("error"),
        requires_confirmation=result.get("requires_confirmation", False),
        pending_action=None  # TODO: populate if needed
    )


@router.post("/actions/{action_id}/confirm")
async def confirm_tool_action(
    action_id: UUID,
    data: ConfirmActionRequest,
    user: dict = Depends(require_auth),
    db: AsyncSession = Depends(get_db),
):
    """Confirm or reject a pending tool action."""
    from ..services.tool_execution import get_tool_execution_service
    
    service = get_tool_execution_service(db)
    result = await service.confirm_action(
        action_id=action_id,
        user_id=user["id"],
        confirmed=data.confirmed
    )
    
    return result


@router.get("/actions/pending")
async def list_pending_actions(
    user: dict = Depends(require_auth),
    db: AsyncSession = Depends(get_db),
):
    """List user's pending tool actions awaiting confirmation."""
    result = await db.execute(
        select(ToolActionLog)
        .where(
            ToolActionLog.user_id == user["id"],
            ToolActionLog.requires_confirmation == True,
            ToolActionLog.confirmed == False,
            ToolActionLog.executed == False
        )
        .order_by(ToolActionLog.created_at.desc())
    )
    actions = result.scalars().all()
    
    return [
        {
            "id": str(a.id),
            "action_type": a.action_type,
            "action_data": a.action_data,
            "created_at": a.created_at.isoformat()
        }
        for a in actions
    ]

