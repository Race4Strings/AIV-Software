"""
Chats Router

Endpoints for managing chats with multi-participant support and AI orchestration.
"""
from typing import List, Optional
from uuid import UUID
import re

from fastapi import APIRouter, Depends, HTTPException, Query, BackgroundTasks
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from ..database import get_db
from ..models import (
    Workspace, Chat, ChatParticipant, ChatMessage, Clone, User,
    ChatType, ParticipantRole, MessageType
)
from ..models.clone import CloneStatus
from ..schemas.chat import (
    ChatCreate, ChatMessageCreate, AddParticipant,
    ChatResponse, ChatDetailResponse, ChatMessageResponse, ParticipantResponse,
    ParticipantCloneInfo, ParticipantUserInfo
)
from ..middleware.auth_middleware import require_auth
from ..services.orchestration import get_orchestration_service
from ..services.clone_inference import get_clone_inference

router = APIRouter(tags=["Chats"])


# ============== Helper Functions ==============

def build_message_response(msg: ChatMessage) -> ChatMessageResponse:
    """Build message response from model."""
    if msg.sender_clone_id and msg.sender_clone:
        sender_type = "clone"
        sender_id = msg.sender_clone_id
        sender_name = msg.sender_clone.name
        sender_avatar = msg.sender_clone.avatar_icon_url
    elif msg.sender_user_id and msg.sender_user:
        sender_type = "user"
        sender_id = msg.sender_user_id
        sender_name = msg.sender_user.name
        sender_avatar = None
    else:
        sender_type = "system"
        sender_id = msg.id
        sender_name = "AIV"
        sender_avatar = None
    
    return ChatMessageResponse(
        id=msg.id,
        chat_id=msg.chat_id,
        content=msg.content,
        message_type=msg.message_type.value if msg.message_type else "text",
        sender_type=sender_type,
        sender_id=sender_id,
        sender_name=sender_name,
        sender_avatar=sender_avatar,
        mentions=msg.mentions,
        created_at=msg.created_at
    )


def build_participant_response(p: ChatParticipant) -> ParticipantResponse:
    """Build participant response from model."""
    if p.clone_id and p.clone:
        return ParticipantResponse(
            id=p.id,
            participant_type="clone",
            role=p.role.value if p.role else "member",
            clone=ParticipantCloneInfo.model_validate(p.clone),
            user=None,
            joined_at=p.joined_at
        )
    elif p.user_id and p.user:
        return ParticipantResponse(
            id=p.id,
            participant_type="user",
            role=p.role.value if p.role else "member",
            clone=None,
            user=ParticipantUserInfo.model_validate(p.user),
            joined_at=p.joined_at
        )
    return None


def parse_mentions(content: str, valid_names: Optional[List[str]] = None) -> dict:
    """Parse @mentions from message content. Returns {clones: [...], users: [...]}"""
    mentions = set()
    
    # 1. Check for specific valid names (multi-word support)
    if valid_names:
        # Sort by length desc to match longest names first
        sorted_names = sorted(valid_names, key=len, reverse=True)
        for name in sorted_names:
            # Check for @Name case-insensitive
            pattern = r'@' + re.escape(name)
            if re.search(pattern, content, re.IGNORECASE):
                mentions.add(name)
    
    # 2. Fallback to simple single-word capture
    pattern = r'@(\w+)'
    regex_matches = re.findall(pattern, content)
    mentions.update(regex_matches)
    
    return {"names": list(mentions)} if mentions else None


# ============== Workspace Chat Endpoints ==============

@router.get("/workspaces/{workspace_id}/chats", response_model=List[ChatResponse])
async def list_workspace_chats(
    workspace_id: UUID,
    user: dict = Depends(require_auth),
    db: AsyncSession = Depends(get_db),
):
    """List all chats in a workspace."""
    # Verify workspace ownership
    ws_result = await db.execute(
        select(Workspace).where(
            Workspace.id == workspace_id,
            Workspace.owner_id == user["id"]
        )
    )
    if not ws_result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Workspace not found")
    
    # Get chats with counts
    result = await db.execute(
        select(Chat)
        .where(Chat.workspace_id == workspace_id, Chat.is_archived == False)
        .order_by(Chat.updated_at.desc())
    )
    chats = result.scalars().all()
    
    response = []
    for chat in chats:
        # Get counts
        p_count = await db.execute(
            select(func.count(ChatParticipant.id)).where(ChatParticipant.chat_id == chat.id)
        )
        m_count = await db.execute(
            select(func.count(ChatMessage.id)).where(ChatMessage.chat_id == chat.id)
        )
        
        # Get last message
        last_msg_result = await db.execute(
            select(ChatMessage)
            .options(selectinload(ChatMessage.sender_clone), selectinload(ChatMessage.sender_user))
            .where(ChatMessage.chat_id == chat.id)
            .order_by(ChatMessage.created_at.desc())
            .limit(1)
        )
        last_msg = last_msg_result.scalar_one_or_none()
        
        response.append(ChatResponse(
            id=chat.id,
            workspace_id=chat.workspace_id,
            title=chat.title,
            chat_type=chat.chat_type.value if chat.chat_type else "direct",
            is_archived=chat.is_archived,
            participant_count=p_count.scalar() or 0,
            message_count=m_count.scalar() or 0,
            last_message=build_message_response(last_msg) if last_msg else None,
            created_at=chat.created_at,
            updated_at=chat.updated_at
        ))
    
    return response


@router.post("/workspaces/{workspace_id}/chats", response_model=ChatDetailResponse)
async def create_chat(
    workspace_id: UUID,
    data: ChatCreate,
    background_tasks: BackgroundTasks,
    user: dict = Depends(require_auth),
    db: AsyncSession = Depends(get_db),
):
    """Create a new chat with participants and optional initial message."""
    # Verify workspace ownership
    ws_result = await db.execute(
        select(Workspace).where(
            Workspace.id == workspace_id,
            Workspace.owner_id == user["id"]
        )
    )
    if not ws_result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Workspace not found")
    
    # Determine chat type (AIV responds if no clone participants)
    total_participants = len(data.participant_clone_ids) + len(data.participant_user_ids)
    if total_participants == 0:
        chat_type = ChatType.DIRECT  # Just user + AIV
    elif total_participants > 1:
        chat_type = ChatType.GROUP
    else:
        chat_type = ChatType.DIRECT
    
    # Create chat
    chat = Chat(
        workspace_id=workspace_id,
        creator_id=user["id"],
        title=data.title,
        chat_type=chat_type
    )
    db.add(chat)
    await db.flush()
    
    # Add creator as participant (owner)
    creator_participant = ChatParticipant(
        chat_id=chat.id,
        user_id=user["id"],
        role=ParticipantRole.OWNER
    )
    db.add(creator_participant)
    
    # Add clone participants
    for clone_id in data.participant_clone_ids:
        clone_result = await db.execute(
            select(Clone).where(Clone.id == clone_id, Clone.status == CloneStatus.COMPLETED)
        )
        clone = clone_result.scalar_one_or_none()
        if not clone:
            raise HTTPException(status_code=404, detail=f"Clone {clone_id} not found")
        
        participant = ChatParticipant(
            chat_id=chat.id,
            clone_id=clone_id,
            role=ParticipantRole.MEMBER
        )
        db.add(participant)
    
    # Add user participants
    for uid in data.participant_user_ids:
        user_result = await db.execute(select(User).where(User.id == uid))
        if not user_result.scalar_one_or_none():
            raise HTTPException(status_code=404, detail=f"User {uid} not found")
        
        participant = ChatParticipant(
            chat_id=chat.id,
            user_id=uid,
            role=ParticipantRole.MEMBER
        )
        db.add(participant)
    
    await db.commit()
    
    # Send initial message if provided
    if data.initial_message:
        await db.refresh(chat)
        await _send_message_internal(
            chat_id=chat.id,
            user_id=user["id"],
            content=data.initial_message,
            background_tasks=background_tasks,
            db=db
        )
    
    # Return chat details
    return await _get_chat_detail(chat.id, user["id"], db)


# ============== Chat Endpoints ==============

@router.get("/chats/{chat_id}", response_model=ChatDetailResponse)
async def get_chat(
    chat_id: UUID,
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    user: dict = Depends(require_auth),
    db: AsyncSession = Depends(get_db),
):
    """Get chat details with participants and messages."""
    return await _get_chat_detail(chat_id, user["id"], db, limit, offset)


@router.get("/chats/{chat_id}/messages", response_model=List[ChatMessageResponse])
async def get_chat_messages(
    chat_id: UUID,
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    user: dict = Depends(require_auth),
    db: AsyncSession = Depends(get_db),
):
    """Get messages for a chat (paginated)."""
    # Verify access
    chat = await _verify_chat_access(chat_id, user["id"], db)
    
    result = await db.execute(
        select(ChatMessage)
        .options(selectinload(ChatMessage.sender_clone), selectinload(ChatMessage.sender_user))
        .where(ChatMessage.chat_id == chat_id)
        .order_by(ChatMessage.created_at.asc())
        .offset(offset)
        .limit(limit)
    )
    messages = result.scalars().all()
    
    return [build_message_response(m) for m in messages]


@router.post("/chats/{chat_id}/messages", response_model=dict)
async def send_message(
    chat_id: UUID,
    data: ChatMessageCreate,
    background_tasks: BackgroundTasks,
    user: dict = Depends(require_auth),
    db: AsyncSession = Depends(get_db),
):
    """Send a message in the chat. AI will orchestrate which clone(s) respond."""
    # Verify access
    chat = await _verify_chat_access(chat_id, user["id"], db)
    
    result = await _send_message_internal(
        chat_id=chat_id,
        user_id=user["id"],
        content=data.content,
        background_tasks=background_tasks,
        db=db
    )
    
    return result


@router.post("/chats/{chat_id}/participants", response_model=ParticipantResponse)
async def add_participant(
    chat_id: UUID,
    data: AddParticipant,
    user: dict = Depends(require_auth),
    db: AsyncSession = Depends(get_db),
):
    """Add a participant to the chat."""
    chat = await _verify_chat_access(chat_id, user["id"], db)
    
    if not data.clone_id and not data.user_id:
        raise HTTPException(status_code=400, detail="Must specify clone_id or user_id")
    
    # Check not already participant
    existing_query = select(ChatParticipant).where(ChatParticipant.chat_id == chat_id)
    if data.clone_id:
        existing_query = existing_query.where(ChatParticipant.clone_id == data.clone_id)
    else:
        existing_query = existing_query.where(ChatParticipant.user_id == data.user_id)
    
    existing = await db.execute(existing_query)
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Already a participant")
    
    participant = ChatParticipant(
        chat_id=chat_id,
        clone_id=data.clone_id,
        user_id=data.user_id,
        role=ParticipantRole.MEMBER
    )
    db.add(participant)
    
    # Update chat type to group if needed
    chat.chat_type = ChatType.GROUP
    
    await db.commit()
    
    # Reload with relationships
    result = await db.execute(
        select(ChatParticipant)
        .options(selectinload(ChatParticipant.clone), selectinload(ChatParticipant.user))
        .where(ChatParticipant.id == participant.id)
    )
    participant = result.scalar_one()
    
    return build_participant_response(participant)


@router.delete("/chats/{chat_id}/participants/{participant_id}")
async def remove_participant(
    chat_id: UUID,
    participant_id: UUID,
    user: dict = Depends(require_auth),
    db: AsyncSession = Depends(get_db),
):
    """Remove a participant from the chat."""
    chat = await _verify_chat_access(chat_id, user["id"], db)
    
    # Find the participant
    result = await db.execute(
        select(ChatParticipant)
        .options(selectinload(ChatParticipant.clone), selectinload(ChatParticipant.user))
        .where(ChatParticipant.id == participant_id, ChatParticipant.chat_id == chat_id)
    )
    participant = result.scalar_one_or_none()
    
    if not participant:
        raise HTTPException(status_code=404, detail="Participant not found")
    
    # Cannot remove yourself (the owner)
    if participant.user_id and str(participant.user_id) == user["id"] and participant.role == ParticipantRole.OWNER:
        raise HTTPException(status_code=400, detail="Cannot remove yourself as owner")
    
    # Delete the participant
    await db.delete(participant)
    
    # Update chat type if only one non-owner participant left
    remaining = await db.execute(
        select(func.count(ChatParticipant.id))
        .where(ChatParticipant.chat_id == chat_id, ChatParticipant.role != ParticipantRole.OWNER)
    )
    remaining_count = remaining.scalar() or 0
    
    if remaining_count <= 1:
        chat.chat_type = ChatType.DIRECT
    
    await db.commit()
    
    return {"status": "removed", "participant_id": str(participant_id)}


# ============== Internal Functions ==============

async def _verify_chat_access(chat_id: UUID, user_id: str, db: AsyncSession) -> Chat:
    """Verify user has access to chat."""
    # Check if user is participant or creator
    result = await db.execute(
        select(Chat)
        .options(selectinload(Chat.participants))
        .where(Chat.id == chat_id)
    )
    chat = result.scalar_one_or_none()
    
    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found")
    
    # Check if user is participant
    is_participant = any(
        p.user_id and str(p.user_id) == user_id 
        for p in chat.participants
    )
    
    if not is_participant and str(chat.creator_id) != user_id:
        raise HTTPException(status_code=403, detail="Not a participant in this chat")
    
    return chat


async def _get_chat_detail(
    chat_id: UUID, 
    user_id: str, 
    db: AsyncSession,
    message_limit: int = 50,
    message_offset: int = 0
) -> ChatDetailResponse:
    """Get full chat details."""
    chat = await _verify_chat_access(chat_id, user_id, db)
    
    # Get participants
    p_result = await db.execute(
        select(ChatParticipant)
        .options(selectinload(ChatParticipant.clone), selectinload(ChatParticipant.user))
        .where(ChatParticipant.chat_id == chat_id)
    )
    participants = [build_participant_response(p) for p in p_result.scalars().all() if p]
    
    # Get messages
    m_result = await db.execute(
        select(ChatMessage)
        .options(selectinload(ChatMessage.sender_clone), selectinload(ChatMessage.sender_user))
        .where(ChatMessage.chat_id == chat_id)
        .order_by(ChatMessage.created_at.asc())
        .offset(message_offset)
        .limit(message_limit)
    )
    messages = [build_message_response(m) for m in m_result.scalars().all()]
    
    # Get counts
    p_count = await db.execute(
        select(func.count(ChatParticipant.id)).where(ChatParticipant.chat_id == chat_id)
    )
    m_count = await db.execute(
        select(func.count(ChatMessage.id)).where(ChatMessage.chat_id == chat_id)
    )
    
    return ChatDetailResponse(
        id=chat.id,
        workspace_id=chat.workspace_id,
        title=chat.title,
        chat_type=chat.chat_type.value if chat.chat_type else "direct",
        is_archived=chat.is_archived,
        participant_count=p_count.scalar() or 0,
        message_count=m_count.scalar() or 0,
        last_message=messages[-1] if messages else None,
        created_at=chat.created_at,
        updated_at=chat.updated_at,
        participants=[p for p in participants if p],
        messages=messages
    )


async def _send_message_internal(
    chat_id: UUID,
    user_id: str,
    content: str,
    background_tasks: BackgroundTasks,
    db: AsyncSession
) -> dict:
    """Internal function to send message and trigger AI responses."""
    # Get clone participants first to help with mention parsing
    participants_result = await db.execute(
        select(ChatParticipant)
        .options(selectinload(ChatParticipant.clone))
        .where(ChatParticipant.chat_id == chat_id, ChatParticipant.clone_id.isnot(None))
    )
    clone_participants = [p for p in participants_result.scalars().all() if p.clone]
    valid_names = [p.clone.name for p in clone_participants]

    # Parse mentions with knowledge of valid names
    mentions = parse_mentions(content, valid_names)
    
    # Save user message
    user_msg = ChatMessage(
        chat_id=chat_id,
        sender_user_id=user_id,
        content=content,
        message_type=MessageType.TEXT,
        mentions=mentions
    )
    db.add(user_msg)
    await db.commit()
    
    # Reload with relationships to avoid lazy loading issues
    user_msg_result = await db.execute(
        select(ChatMessage)
        .options(selectinload(ChatMessage.sender_user), selectinload(ChatMessage.sender_clone))
        .where(ChatMessage.id == user_msg.id)
    )
    user_msg = user_msg_result.scalar_one()
    
    # Determine responders:
    # 1. If no mentions, AIV responds (system)
    # 2. If mentions exist, mentioned clones respond
    
    should_use_aiv = True
    if mentions and mentions.get("names"):
        # Mentions exist - check if any match participants
        mentioned_names = [n.lower() for n in mentions["names"]]
        matching_clones = [c for c in clone_participants if c.clone.name.lower() in mentioned_names]
        if matching_clones:
            should_use_aiv = False
    
    # Forced AIV response if no clones in chat at all (fallback)
    if not clone_participants:
        should_use_aiv = True

    if should_use_aiv:
        # Get recent conversation for context
        history_result = await db.execute(
            select(ChatMessage)
            .where(ChatMessage.chat_id == chat_id)
            .order_by(ChatMessage.created_at.desc())
            .limit(10)
        )
        history = [
            {"role": "user" if m.sender_user_id else "assistant", "content": m.content}
            for m in reversed(list(history_result.scalars().all()))
        ]
        
        # Generate AIV response
        inference = get_clone_inference()
        aiv_response = await inference.generate_aiv_response(
            conversation_history=history,
            user_message=content
        )
        
        # Save AIV message
        aiv_msg = ChatMessage(
            chat_id=chat_id,
            sender_clone_id=None,
            sender_user_id=None,
            content=aiv_response,
            message_type=MessageType.TEXT
        )
        db.add(aiv_msg)
        await db.commit()
        await db.refresh(aiv_msg)
        
        return {
            "status": "sent",
            "user_message": build_message_response(user_msg).__dict__,
            "clone_responses": [{
                "id": str(aiv_msg.id),
                "chat_id": str(chat_id),
                "content": aiv_response,
                "message_type": "text",
                "sender_type": "system",
                "sender_id": str(aiv_msg.id),
                "sender_name": "AIV",
                "sender_avatar": None,
                "mentions": None,
                "created_at": aiv_msg.created_at.isoformat() if aiv_msg.created_at else None
            }]
        }
    
    # Otherwise, mentions exist and match clones - let them respond
    # (We bypass orchestration since user wants explicit control)
    clones_to_respond = await _select_responders(
        content=content,
        mentions=mentions,
        clone_participants=clone_participants,
        chat_id=chat_id,
        db=db
    )
    
    # Generate responses from selected clones
    clone_responses = []
    for clone in clones_to_respond:
        # Get recent conversation for context
        history_result = await db.execute(
            select(ChatMessage)
            .where(ChatMessage.chat_id == chat_id)
            .order_by(ChatMessage.created_at.desc())
            .limit(10)
        )
        history = [
            {"role": "user" if m.sender_user_id else "assistant", "content": m.content}
            for m in reversed(list(history_result.scalars().all()))
        ]
        
        # Generate response
        inference = get_clone_inference()
        response_content = await inference.generate_response(
            clone=clone,
            conversation_history=history,
            user_message=content
        )
        
        # Save clone message
        clone_msg = ChatMessage(
            chat_id=chat_id,
            sender_clone_id=clone.id,
            content=response_content,
            message_type=MessageType.TEXT
        )
        db.add(clone_msg)
        await db.commit()
        await db.refresh(clone_msg)
        
        # Reload with relationships for response
        msg_result = await db.execute(
            select(ChatMessage)
            .options(selectinload(ChatMessage.sender_clone))
            .where(ChatMessage.id == clone_msg.id)
        )
        clone_msg = msg_result.scalar_one()
        clone_responses.append(build_message_response(clone_msg).__dict__)
    
    return {
        "status": "sent",
        "user_message": build_message_response(user_msg).__dict__,
        "clone_responses": clone_responses
    }


async def _select_responders(
    content: str,
    mentions: Optional[dict],
    clone_participants: list,
    chat_id: UUID,
    db: AsyncSession
) -> List[Clone]:
    """Select which clones should respond based on mentions or AI orchestration."""
    clones = [p.clone for p in clone_participants]
    
    # If mentions exist, find matching clones
    if mentions and mentions.get("names"):
        mentioned_names = [n.lower() for n in mentions["names"]]
        mentioned_clones = [c for c in clones if c.name.lower() in mentioned_names]
        if mentioned_clones:
            return mentioned_clones
    
    # No mentions - use orchestration to pick best responder(s)
    try:
        orchestrator = get_orchestration_service()
        selected = await orchestrator.select_responders(
            message=content,
            clones=clones
        )
        return selected if selected else [clones[0]]  # Fallback to first clone
    except Exception as e:
        print(f"Orchestration failed: {e}")
        return [clones[0]]  # Fallback to first clone
