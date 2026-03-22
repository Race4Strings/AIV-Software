"""
Agent router — "Your assistant (by AIV)" endpoints.

Replaces the old /aiv/chat with a multi-mode assistant under /assistant/*.
The old /aiv/chat endpoint is kept for backward compat and routes through here.
"""

import json
from uuid import UUID
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_db
from ..middleware import require_auth
from ..services.agent_service import AgentService

router = APIRouter(prefix="/assistant", tags=["assistant"])


# ------------------------------------------------------------------
# Request/Response schemas
# ------------------------------------------------------------------

class CreateSessionRequest(BaseModel):
    twin_id: Optional[str] = None


class SessionResponse(BaseModel):
    id: str
    user_id: str
    twin_id: Optional[str]
    current_mode: str
    started_at: str
    last_activity_at: str
    auth_expires_at: str


class MessageRequest(BaseModel):
    content: str
    media_urls: Optional[list] = None


class MessageResponse(BaseModel):
    id: str
    session_id: str
    role: str
    mode_at_time: str
    content: str
    actions: Optional[list] = None
    created_at: str


class SwitchModeRequest(BaseModel):
    mode: str


def _session_to_response(session) -> dict:
    return {
        "id": str(session.id),
        "user_id": str(session.user_id),
        "twin_id": str(session.twin_id) if session.twin_id else None,
        "current_mode": session.current_mode,
        "started_at": session.started_at.isoformat() if session.started_at else "",
        "last_activity_at": session.last_activity_at.isoformat() if session.last_activity_at else "",
        "auth_expires_at": session.auth_expires_at.isoformat() if session.auth_expires_at else "",
    }


def _message_to_response(msg) -> dict:
    return {
        "id": str(msg.id),
        "session_id": str(msg.session_id),
        "role": msg.role,
        "mode_at_time": msg.mode_at_time,
        "content": msg.content,
        "actions": msg.actions,
        "created_at": msg.created_at.isoformat() if msg.created_at else "",
    }


# ------------------------------------------------------------------
# Session endpoints
# ------------------------------------------------------------------

@router.post("/session")
async def create_session(
    req: CreateSessionRequest,
    user: dict = Depends(require_auth),
    db: AsyncSession = Depends(get_db),
):
    """Create a new assistant session."""
    service = AgentService(db)
    twin_id = UUID(req.twin_id) if req.twin_id else None
    session = await service.create_session(UUID(user["id"]), twin_id)
    return _session_to_response(session)


@router.get("/sessions")
async def list_sessions(
    active: bool = Query(True),
    user: dict = Depends(require_auth),
    db: AsyncSession = Depends(get_db),
):
    """List user's sessions (last 10)."""
    service = AgentService(db)
    sessions = await service.get_active_sessions(UUID(user["id"]))
    return [_session_to_response(s) for s in sessions]


# ------------------------------------------------------------------
# Message endpoints
# ------------------------------------------------------------------

@router.post("/session/{session_id}/message")
async def send_message_stream(
    session_id: str,
    req: MessageRequest,
    user: dict = Depends(require_auth),
    db: AsyncSession = Depends(get_db),
):
    """Send a message and stream the response via SSE."""
    service = AgentService(db)
    session = await service.get_session(UUID(session_id))

    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    if str(session.user_id) != user["id"]:
        raise HTTPException(status_code=403, detail="Not your session")

    user_role = user.get("role", "TALENT")

    async def event_stream():
        try:
            async for chunk in service.send_message_stream(session, req.content, user_role):
                yield f"data: {json.dumps({'text': chunk})}\n\n"
            yield "data: [DONE]\n\n"
        except PermissionError as e:
            yield f"data: {json.dumps({'error': str(e)})}\n\n"
            yield "data: [DONE]\n\n"
        except Exception as e:
            yield f"data: {json.dumps({'error': 'An error occurred. Please try again.'})}\n\n"
            yield "data: [DONE]\n\n"

    return StreamingResponse(event_stream(), media_type="text/event-stream")


@router.post("/session/{session_id}/message/sync")
async def send_message_sync(
    session_id: str,
    req: MessageRequest,
    user: dict = Depends(require_auth),
    db: AsyncSession = Depends(get_db),
):
    """Send a message and get the full response (non-streaming)."""
    service = AgentService(db)
    session = await service.get_session(UUID(session_id))

    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    if str(session.user_id) != user["id"]:
        raise HTTPException(status_code=403, detail="Not your session")

    user_role = user.get("role", "TALENT")

    try:
        msg = await service.send_message(session, req.content, user_role)
        return _message_to_response(msg)
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))


@router.get("/session/{session_id}/messages")
async def get_messages(
    session_id: str,
    limit: int = Query(50, le=200),
    offset: int = Query(0),
    user: dict = Depends(require_auth),
    db: AsyncSession = Depends(get_db),
):
    """Get message history for a session."""
    service = AgentService(db)
    session = await service.get_session(UUID(session_id))

    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    if str(session.user_id) != user["id"]:
        raise HTTPException(status_code=403, detail="Not your session")

    messages = await service.get_session_messages(UUID(session_id), limit, offset)
    return [_message_to_response(m) for m in messages]


# ------------------------------------------------------------------
# Mode switching
# ------------------------------------------------------------------

@router.post("/session/{session_id}/mode")
async def switch_mode(
    session_id: str,
    req: SwitchModeRequest,
    user: dict = Depends(require_auth),
    db: AsyncSession = Depends(get_db),
):
    """Switch the assistant's mode."""
    service = AgentService(db)
    session = await service.get_session(UUID(session_id))

    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    if str(session.user_id) != user["id"]:
        raise HTTPException(status_code=403, detail="Not your session")

    user_role = user.get("role", "TALENT")

    try:
        updated = await service.switch_mode(session, req.mode, user_role)
        return _session_to_response(updated)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))
