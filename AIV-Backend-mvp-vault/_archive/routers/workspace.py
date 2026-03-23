"""
Workspaces Router

Endpoints for managing workspaces (chat organizers).
"""
from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_db
from ..models import Workspace, Chat
from ..schemas.workspace import WorkspaceCreate, WorkspaceUpdate, WorkspaceResponse
from ..middleware.auth_middleware import require_auth

router = APIRouter(prefix="/workspaces", tags=["Workspaces"])


async def get_or_create_default_workspace(user_id: str, db: AsyncSession) -> Workspace:
    """Get or create the default workspace for a user."""
    result = await db.execute(
        select(Workspace).where(
            Workspace.owner_id == user_id,
            Workspace.is_default == True
        )
    )
    workspace = result.scalar_one_or_none()
    
    if not workspace:
        workspace = Workspace(
            owner_id=user_id,
            name="General",
            description="Default workspace for all chats",
            is_default=True,
            icon="💬"
        )
        db.add(workspace)
        await db.commit()
        await db.refresh(workspace)
    
    return workspace


@router.get("", response_model=List[WorkspaceResponse])
async def list_workspaces(
    user: dict = Depends(require_auth),
    db: AsyncSession = Depends(get_db),
):
    """List all workspaces for the authenticated user."""
    # Ensure default workspace exists
    await get_or_create_default_workspace(user["id"], db)
    
    # Get workspaces with chat counts
    result = await db.execute(
        select(Workspace)
        .where(Workspace.owner_id == user["id"])
        .order_by(Workspace.is_default.desc(), Workspace.name)
    )
    workspaces = result.scalars().all()
    
    # Get chat counts
    response = []
    for ws in workspaces:
        count_result = await db.execute(
            select(func.count(Chat.id)).where(Chat.workspace_id == ws.id)
        )
        chat_count = count_result.scalar() or 0
        
        response.append(WorkspaceResponse(
            id=ws.id,
            owner_id=ws.owner_id,
            name=ws.name,
            description=ws.description,
            is_default=ws.is_default,
            icon=ws.icon,
            chat_count=chat_count,
            created_at=ws.created_at,
            updated_at=ws.updated_at
        ))
    
    return response


@router.post("", response_model=WorkspaceResponse)
async def create_workspace(
    data: WorkspaceCreate,
    user: dict = Depends(require_auth),
    db: AsyncSession = Depends(get_db),
):
    """Create a new workspace."""
    workspace = Workspace(
        owner_id=user["id"],
        name=data.name,
        description=data.description,
        icon=data.icon,
        is_default=False
    )
    db.add(workspace)
    await db.commit()
    await db.refresh(workspace)
    
    return WorkspaceResponse(
        id=workspace.id,
        owner_id=workspace.owner_id,
        name=workspace.name,
        description=workspace.description,
        is_default=workspace.is_default,
        icon=workspace.icon,
        chat_count=0,
        created_at=workspace.created_at,
        updated_at=workspace.updated_at
    )


@router.get("/{workspace_id}", response_model=WorkspaceResponse)
async def get_workspace(
    workspace_id: UUID,
    user: dict = Depends(require_auth),
    db: AsyncSession = Depends(get_db),
):
    """Get a workspace by ID."""
    result = await db.execute(
        select(Workspace).where(
            Workspace.id == workspace_id,
            Workspace.owner_id == user["id"]
        )
    )
    workspace = result.scalar_one_or_none()
    
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace not found")
    
    count_result = await db.execute(
        select(func.count(Chat.id)).where(Chat.workspace_id == workspace.id)
    )
    chat_count = count_result.scalar() or 0
    
    return WorkspaceResponse(
        id=workspace.id,
        owner_id=workspace.owner_id,
        name=workspace.name,
        description=workspace.description,
        is_default=workspace.is_default,
        icon=workspace.icon,
        chat_count=chat_count,
        created_at=workspace.created_at,
        updated_at=workspace.updated_at
    )


@router.put("/{workspace_id}", response_model=WorkspaceResponse)
async def update_workspace(
    workspace_id: UUID,
    data: WorkspaceUpdate,
    user: dict = Depends(require_auth),
    db: AsyncSession = Depends(get_db),
):
    """Update a workspace."""
    result = await db.execute(
        select(Workspace).where(
            Workspace.id == workspace_id,
            Workspace.owner_id == user["id"]
        )
    )
    workspace = result.scalar_one_or_none()
    
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace not found")
    
    # Update fields
    if data.name is not None:
        workspace.name = data.name
    if data.description is not None:
        workspace.description = data.description
    if data.icon is not None:
        workspace.icon = data.icon
    
    await db.commit()
    await db.refresh(workspace)
    
    count_result = await db.execute(
        select(func.count(Chat.id)).where(Chat.workspace_id == workspace.id)
    )
    chat_count = count_result.scalar() or 0
    
    return WorkspaceResponse(
        id=workspace.id,
        owner_id=workspace.owner_id,
        name=workspace.name,
        description=workspace.description,
        is_default=workspace.is_default,
        icon=workspace.icon,
        chat_count=chat_count,
        created_at=workspace.created_at,
        updated_at=workspace.updated_at
    )


@router.delete("/{workspace_id}")
async def delete_workspace(
    workspace_id: UUID,
    user: dict = Depends(require_auth),
    db: AsyncSession = Depends(get_db),
):
    """Delete a workspace (cannot delete default)."""
    result = await db.execute(
        select(Workspace).where(
            Workspace.id == workspace_id,
            Workspace.owner_id == user["id"]
        )
    )
    workspace = result.scalar_one_or_none()
    
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace not found")
    
    if workspace.is_default:
        raise HTTPException(status_code=400, detail="Cannot delete default workspace")
    
    await db.delete(workspace)
    await db.commit()
    
    return {"status": "deleted", "workspace_id": str(workspace_id)}
