"""
Training Router

Endpoints for training chat sessions where owners improve their clone.
"""
from typing import List, Optional
from uuid import UUID
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from ..database import get_db, async_session_maker
from ..models import Clone, TrainingSession, TrainingMessage
from ..models.clone import CloneStatus
from ..schemas.training import (
    TrainingSessionCreate, TrainingSessionResponse, TrainingSessionWithMessages,
    TrainingMessageCreate, TrainingMessageResponse, SendMessageResponse,
    TrainingStatsResponse
)
from ..middleware.auth_middleware import require_auth
from ..services.clone_inference import get_clone_inference
from ..services.training_analyzer import get_training_analyzer

router = APIRouter(prefix="/clones/{clone_id}/training", tags=["Training Chat"])


async def verify_clone_owner(clone_id: UUID, user_id: str, db: AsyncSession) -> Clone:
    """Verify user owns the clone and return it."""
    result = await db.execute(
        select(Clone).where(Clone.id == clone_id)
    )
    clone = result.scalar_one_or_none()
    
    if not clone:
        raise HTTPException(status_code=404, detail="Clone not found")
    
    if str(clone.owner_id) != user_id:
        raise HTTPException(status_code=403, detail="You don't own this clone")
    
    if clone.status != CloneStatus.COMPLETED:
        raise HTTPException(status_code=400, detail="Clone must be activated before training")
    
    return clone


@router.post("/sessions", response_model=TrainingSessionResponse)
async def create_session(
    clone_id: UUID,
    data: TrainingSessionCreate,
    user: dict = Depends(require_auth),
    db: AsyncSession = Depends(get_db),
):
    """Start a new training session with the clone."""
    clone = await verify_clone_owner(clone_id, user["id"], db)
    
    session = TrainingSession(
        clone_id=clone.id,
        owner_id=clone.owner_id,
        title=data.title or f"Training Session {datetime.utcnow().strftime('%Y-%m-%d %H:%M')}",
        dimensions_updated=[]
    )
    db.add(session)
    await db.commit()
    await db.refresh(session)
    
    return session


@router.get("/sessions", response_model=List[TrainingSessionResponse])
async def list_sessions(
    clone_id: UUID,
    user: dict = Depends(require_auth),
    db: AsyncSession = Depends(get_db),
):
    """List all training sessions for this clone."""
    clone = await verify_clone_owner(clone_id, user["id"], db)
    
    result = await db.execute(
        select(TrainingSession)
        .where(TrainingSession.clone_id == clone.id)
        .order_by(TrainingSession.created_at.desc())
    )
    sessions = result.scalars().all()
    
    return sessions


@router.get("/sessions/{session_id}", response_model=TrainingSessionWithMessages)
async def get_session(
    clone_id: UUID,
    session_id: UUID,
    user: dict = Depends(require_auth),
    db: AsyncSession = Depends(get_db),
):
    """Get a training session with its messages."""
    clone = await verify_clone_owner(clone_id, user["id"], db)
    
    result = await db.execute(
        select(TrainingSession)
        .options(selectinload(TrainingSession.messages))
        .where(
            TrainingSession.id == session_id,
            TrainingSession.clone_id == clone.id
        )
    )
    session = result.scalar_one_or_none()
    
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    return session


@router.post("/sessions/{session_id}/messages", response_model=SendMessageResponse)
async def send_message(
    clone_id: UUID,
    session_id: UUID,
    data: TrainingMessageCreate,
    background_tasks: BackgroundTasks,
    user: dict = Depends(require_auth),
    db: AsyncSession = Depends(get_db),
):
    """Send a message in the training session and get a response."""
    clone = await verify_clone_owner(clone_id, user["id"], db)
    
    # Get session
    result = await db.execute(
        select(TrainingSession)
        .options(selectinload(TrainingSession.messages))
        .where(
            TrainingSession.id == session_id,
            TrainingSession.clone_id == clone.id
        )
    )
    session = result.scalar_one_or_none()
    
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    if session.ended_at:
        raise HTTPException(status_code=400, detail="Session has ended")
    
    # Save user message
    user_msg = TrainingMessage(
        session_id=session.id,
        role="user",
        content=data.content,
        analyzed=False
    )
    db.add(user_msg)
    
    # Get conversation history for context
    history = [
        {"role": msg.role, "content": msg.content}
        for msg in session.messages
    ]
    
    # Generate clone response
    inference = get_clone_inference()
    response_content = await inference.generate_response(
        clone=clone,
        conversation_history=history,
        user_message=data.content
    )
    
    # Save assistant message
    assistant_msg = TrainingMessage(
        session_id=session.id,
        role="assistant",
        content=response_content
    )
    db.add(assistant_msg)
    
    # Update session message count
    session.message_count = (session.message_count or 0) + 2
    
    await db.commit()
    await db.refresh(user_msg)
    await db.refresh(assistant_msg)
    
    # Analyze message in background and potentially update dimensions
    background_tasks.add_task(
        analyze_and_update_task,
        clone_id=clone.id,
        message_id=user_msg.id,
        message_content=data.content,
        session_id=session.id
    )
    
    return SendMessageResponse(
        user_message=user_msg,
        assistant_message=assistant_msg,
        dimension_updated=None  # Will be updated asynchronously
    )


@router.get("/sessions/{session_id}/messages", response_model=List[TrainingMessageResponse])
async def get_messages(
    clone_id: UUID,
    session_id: UUID,
    user: dict = Depends(require_auth),
    db: AsyncSession = Depends(get_db),
):
    """Get messages for a training session."""
    clone = await verify_clone_owner(clone_id, user["id"], db)
    
    result = await db.execute(
        select(TrainingMessage)
        .where(TrainingMessage.session_id == session_id)
        .order_by(TrainingMessage.created_at.asc())
    )
    messages = result.scalars().all()
    
    return messages


@router.post("/sessions/{session_id}/end", response_model=TrainingSessionResponse)
async def end_session(
    clone_id: UUID,
    session_id: UUID,
    user: dict = Depends(require_auth),
    db: AsyncSession = Depends(get_db),
):
    """End a training session."""
    clone = await verify_clone_owner(clone_id, user["id"], db)
    
    result = await db.execute(
        select(TrainingSession)
        .where(
            TrainingSession.id == session_id,
            TrainingSession.clone_id == clone.id
        )
    )
    session = result.scalar_one_or_none()
    
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    session.ended_at = datetime.utcnow()
    clone.last_trained_at = datetime.utcnow()
    
    await db.commit()
    await db.refresh(session)
    
    return session


@router.get("/stats", response_model=TrainingStatsResponse)
async def get_training_stats(
    clone_id: UUID,
    user: dict = Depends(require_auth),
    db: AsyncSession = Depends(get_db),
):
    """Get training statistics for the clone."""
    clone = await verify_clone_owner(clone_id, user["id"], db)
    
    # Count sessions
    session_result = await db.execute(
        select(func.count(TrainingSession.id))
        .where(TrainingSession.clone_id == clone.id)
    )
    total_sessions = session_result.scalar() or 0
    
    # Count messages
    message_result = await db.execute(
        select(func.count(TrainingMessage.id))
        .join(TrainingSession)
        .where(TrainingSession.clone_id == clone.id)
    )
    total_messages = message_result.scalar() or 0
    
    # Aggregate dimensions updated
    dims_updated = {}
    sessions_result = await db.execute(
        select(TrainingSession.dimensions_updated)
        .where(TrainingSession.clone_id == clone.id)
    )
    for dims in sessions_result.scalars():
        if dims:
            for dim in dims:
                dims_updated[dim] = dims_updated.get(dim, 0) + 1
    
    return TrainingStatsResponse(
        total_sessions=total_sessions,
        total_messages=total_messages,
        dimensions_updated=dims_updated,
        last_trained_at=clone.last_trained_at
    )


async def analyze_and_update_task(
    clone_id: UUID,
    message_id: UUID,
    message_content: str,
    session_id: UUID
):
    """Background task to analyze message and update clone dimensions."""
    from sqlalchemy.orm.attributes import flag_modified
    
    async with async_session_maker() as db:
        # Get clone and message
        clone_result = await db.execute(
            select(Clone).where(Clone.id == clone_id)
        )
        clone = clone_result.scalar_one_or_none()
        
        msg_result = await db.execute(
            select(TrainingMessage).where(TrainingMessage.id == message_id)
        )
        message = msg_result.scalar_one_or_none()
        
        if not clone or not message or not clone.dimensions:
            return
        
        # Get session for dimensions_updated tracking
        session_result = await db.execute(
            select(TrainingSession).where(TrainingSession.id == session_id)
        )
        session = session_result.scalar_one_or_none()
        
        # Get recent messages for context
        msgs_result = await db.execute(
            select(TrainingMessage)
            .where(TrainingMessage.session_id == session_id)
            .order_by(TrainingMessage.created_at.desc())
            .limit(10)
        )
        recent_msgs = [
            {"role": m.role, "content": m.content}
            for m in reversed(list(msgs_result.scalars()))
        ]
        
        try:
            # Analyze message
            analyzer = get_training_analyzer()
            analysis = await analyzer.analyze_message(
                message=message_content,
                current_dimensions=clone.dimensions,
                conversation_context=recent_msgs
            )
            
            # Update message with analysis
            message.analyzed = True
            message.analysis = analysis
            
            if analysis:
                # Apply update to dimensions
                dimension_key = analysis.get("dimension")
                if dimension_key:
                    clone.dimensions = await analyzer.apply_update(
                        dimensions=clone.dimensions,
                        analysis=analysis
                    )
                    clone.dimensions_version = (clone.dimensions_version or 1) + 1
                    message.dimensions_affected = [dimension_key]
                    
                    # Track in session
                    if session:
                        updated_list = session.dimensions_updated or []
                        if dimension_key not in updated_list:
                            updated_list.append(dimension_key)
                            session.dimensions_updated = updated_list
                            flag_modified(session, "dimensions_updated")
                    
                    flag_modified(clone, "dimensions")
                    print(f"✅ Updated dimension '{dimension_key}' from training message")
            
            await db.commit()
            
        except Exception as e:
            print(f"❌ Training analysis failed: {e}")
            message.analyzed = True
            message.analysis = {"error": str(e)}
            await db.commit()


# ============== SIMPLIFIED SINGLE-SESSION ENDPOINTS ==============
# These endpoints auto-manage a single lifetime session per clone
# Frontend doesn't need to manage session IDs

from pydantic import BaseModel


class SimpleChatResponse(BaseModel):
    """Response for simplified chat endpoint."""
    session_id: UUID
    messages: List[TrainingMessageResponse]
    total_messages: int


class SimpleChatMessageRequest(BaseModel):
    """Request for sending a chat message."""
    content: str


class SimpleChatMessageResponse(BaseModel):
    """Response after sending a chat message."""
    user_message: TrainingMessageResponse
    assistant_message: TrainingMessageResponse
    dimension_updated: Optional[str] = None


async def get_or_create_session(clone: Clone, db: AsyncSession) -> TrainingSession:
    """Get the single active session for clone, or create one if none exists."""
    # Find existing active session (not ended)
    result = await db.execute(
        select(TrainingSession)
        .where(
            TrainingSession.clone_id == clone.id,
            TrainingSession.ended_at.is_(None)
        )
        .order_by(TrainingSession.created_at.desc())
        .limit(1)
    )
    session = result.scalar_one_or_none()
    
    if session:
        return session
    
    # Create new session
    session = TrainingSession(
        clone_id=clone.id,
        owner_id=clone.owner_id,
        title="Training Chat",
        dimensions_updated=[]
    )
    db.add(session)
    await db.commit()
    await db.refresh(session)
    
    return session


@router.get("/chat", response_model=SimpleChatResponse)
async def get_chat(
    clone_id: UUID,
    limit: int = 50,
    offset: int = 0,
    user: dict = Depends(require_auth),
    db: AsyncSession = Depends(get_db),
):
    """
    Get training chat for this clone.
    
    Auto-creates a single lifetime session if none exists.
    Returns recent messages (default last 50).
    """
    clone = await verify_clone_owner(clone_id, user["id"], db)
    session = await get_or_create_session(clone, db)
    
    # Get messages with pagination (chronological order)
    result = await db.execute(
        select(TrainingMessage)
        .where(TrainingMessage.session_id == session.id)
        .order_by(TrainingMessage.created_at.asc())
        .limit(limit)
        .offset(offset)
    )
    messages = list(result.scalars().all())
    
    # Get total count
    count_result = await db.execute(
        select(func.count(TrainingMessage.id))
        .where(TrainingMessage.session_id == session.id)
    )
    total = count_result.scalar() or 0
    
    return SimpleChatResponse(
        session_id=session.id,
        messages=messages,
        total_messages=total
    )


@router.post("/chat", response_model=SimpleChatMessageResponse)
async def send_chat_message(
    clone_id: UUID,
    data: SimpleChatMessageRequest,
    background_tasks: BackgroundTasks,
    user: dict = Depends(require_auth),
    db: AsyncSession = Depends(get_db),
):
    """
    Send a message in training chat.
    
    Auto-manages session - just send your message, get a response.
    Background task analyzes and updates dimensions automatically.
    """
    clone = await verify_clone_owner(clone_id, user["id"], db)
    session = await get_or_create_session(clone, db)
    
    # Load existing messages for context
    result = await db.execute(
        select(TrainingMessage)
        .where(TrainingMessage.session_id == session.id)
        .order_by(TrainingMessage.created_at.desc())
        .limit(10)  # Last 10 for context
    )
    recent_messages = list(reversed(result.scalars().all()))
    
    # Save user message
    user_msg = TrainingMessage(
        session_id=session.id,
        role="user",
        content=data.content,
        analyzed=False
    )
    db.add(user_msg)
    
    # Build conversation history
    history = [{"role": m.role, "content": m.content} for m in recent_messages]
    
    # Generate clone response
    inference = get_clone_inference()
    response_content = await inference.generate_response(
        clone=clone,
        conversation_history=history,
        user_message=data.content
    )
    
    # Save assistant message
    assistant_msg = TrainingMessage(
        session_id=session.id,
        role="assistant",
        content=response_content
    )
    db.add(assistant_msg)
    
    # Update session message count
    session.message_count = (session.message_count or 0) + 2
    
    await db.commit()
    await db.refresh(user_msg)
    await db.refresh(assistant_msg)
    
    # Analyze message in background
    background_tasks.add_task(
        analyze_and_update_task,
        clone_id=clone.id,
        message_id=user_msg.id,
        message_content=data.content,
        session_id=session.id
    )
    
    return SimpleChatMessageResponse(
        user_message=user_msg,
        assistant_message=assistant_msg,
        dimension_updated=None  # Updated asynchronously
    )
