"""
Contacts Router

Endpoints for managing user's contact list.
"""
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, or_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from ..database import get_db
from ..models import Contact, Clone, User
from ..models.clone import CloneStatus
from ..schemas.contact import (
    ContactCreate, ContactResponse, ContactCloneInfo, ContactUserInfo, ContactSearchResult
)
from ..middleware.auth_middleware import require_auth

router = APIRouter(prefix="/contacts", tags=["Contacts"])


@router.get("", response_model=List[ContactResponse])
async def list_contacts(
    user: dict = Depends(require_auth),
    db: AsyncSession = Depends(get_db),
):
    """List all contacts for the authenticated user."""
    result = await db.execute(
        select(Contact)
        .options(selectinload(Contact.contact_clone), selectinload(Contact.contact_user))
        .where(Contact.owner_id == user["id"])
        .order_by(Contact.is_favorite.desc(), Contact.created_at.desc())
    )
    contacts = result.scalars().all()
    
    response = []
    for contact in contacts:
        contact_data = {
            "id": contact.id,
            "owner_id": contact.owner_id,
            "nickname": contact.nickname,
            "is_favorite": contact.is_favorite,
            "created_at": contact.created_at,
        }
        
        if contact.contact_clone:
            contact_data["contact_type"] = "clone"
            contact_data["clone"] = ContactCloneInfo.model_validate(contact.contact_clone)
        elif contact.contact_user:
            contact_data["contact_type"] = "user"
            contact_data["user"] = ContactUserInfo.model_validate(contact.contact_user)
        
        response.append(ContactResponse(**contact_data))
    
    return response


@router.post("", response_model=ContactResponse)
async def add_contact(
    data: ContactCreate,
    user: dict = Depends(require_auth),
    db: AsyncSession = Depends(get_db),
):
    """Add a clone or user to contacts."""
    # Validate: must specify exactly one
    if not data.contact_clone_id and not data.contact_user_id:
        raise HTTPException(status_code=400, detail="Must specify contact_clone_id or contact_user_id")
    if data.contact_clone_id and data.contact_user_id:
        raise HTTPException(status_code=400, detail="Cannot specify both clone and user")
    
    # Check if contact already exists
    existing_query = select(Contact).where(Contact.owner_id == user["id"])
    if data.contact_clone_id:
        existing_query = existing_query.where(Contact.contact_clone_id == data.contact_clone_id)
    else:
        existing_query = existing_query.where(Contact.contact_user_id == data.contact_user_id)
    
    existing = await db.execute(existing_query)
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Contact already exists")
    
    # Verify the clone/user exists
    if data.contact_clone_id:
        clone_result = await db.execute(
            select(Clone)
            .where(Clone.id == data.contact_clone_id, Clone.is_public == True)
        )
        clone = clone_result.scalar_one_or_none()
        if not clone:
            raise HTTPException(status_code=404, detail="Public clone not found")
    
    if data.contact_user_id:
        user_result = await db.execute(
            select(User).where(User.id == data.contact_user_id)
        )
        target_user = user_result.scalar_one_or_none()
        if not target_user:
            raise HTTPException(status_code=404, detail="User not found")
        # Can't add yourself
        if str(data.contact_user_id) == user["id"]:
            raise HTTPException(status_code=400, detail="Cannot add yourself as contact")
    
    # Create contact
    contact = Contact(
        owner_id=user["id"],
        contact_clone_id=data.contact_clone_id,
        contact_user_id=data.contact_user_id,
        nickname=data.nickname,
    )
    db.add(contact)
    await db.commit()
    
    # Reload with relationships
    await db.refresh(contact)
    result = await db.execute(
        select(Contact)
        .options(selectinload(Contact.contact_clone), selectinload(Contact.contact_user))
        .where(Contact.id == contact.id)
    )
    contact = result.scalar_one()
    
    contact_data = {
        "id": contact.id,
        "owner_id": contact.owner_id,
        "nickname": contact.nickname,
        "is_favorite": contact.is_favorite,
        "created_at": contact.created_at,
    }
    
    if contact.contact_clone:
        contact_data["contact_type"] = "clone"
        contact_data["clone"] = ContactCloneInfo.model_validate(contact.contact_clone)
    elif contact.contact_user:
        contact_data["contact_type"] = "user"
        contact_data["user"] = ContactUserInfo.model_validate(contact.contact_user)
    
    return ContactResponse(**contact_data)


@router.delete("/{contact_id}")
async def remove_contact(
    contact_id: UUID,
    user: dict = Depends(require_auth),
    db: AsyncSession = Depends(get_db),
):
    """Remove a contact."""
    result = await db.execute(
        select(Contact).where(Contact.id == contact_id, Contact.owner_id == user["id"])
    )
    contact = result.scalar_one_or_none()
    
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")
    
    await db.delete(contact)
    await db.commit()
    
    return {"status": "deleted", "contact_id": str(contact_id)}


@router.get("/public", response_model=List[ContactSearchResult])
async def list_public_clones(
    offset: int = Query(0, ge=0, description="Number of items to skip"),
    limit: int = Query(20, ge=1, le=100, description="Max items to return"),
    user: dict = Depends(require_auth),
    db: AsyncSession = Depends(get_db),
):
    """List all public clones with pagination for browsing."""
    result = await db.execute(
        select(Clone)
        .options(selectinload(Clone.owner))
        .where(
            Clone.is_public == True,
            Clone.status == CloneStatus.COMPLETED,
        )
        .order_by(Clone.name)
        .offset(offset)
        .limit(limit)
    )
    clones = result.scalars().all()
    
    return [
        ContactSearchResult(
            id=clone.id,
            name=clone.name,
            type="clone",
            description=clone.description,
            avatar_profile_url=clone.avatar_profile_url,
            avatar_icon_url=clone.avatar_icon_url,
            owner_name=clone.owner.name if clone.owner else "AIV System"
        )
        for clone in clones
    ]


@router.get("/search", response_model=List[ContactSearchResult])
async def search_public_clones(
    q: str = Query(..., min_length=1, description="Search query"),
    limit: int = Query(20, ge=1, le=50),
    user: dict = Depends(require_auth),
    db: AsyncSession = Depends(get_db),
):
    """Search for public clones and users."""
    # 1. Search for Clones
    clones_result = await db.execute(
        select(Clone)
        .options(selectinload(Clone.owner))
        .where(
            Clone.is_public == True,
            Clone.status == CloneStatus.COMPLETED,
            Clone.name.ilike(f"%{q}%")
        )
        .order_by(Clone.name)
        .limit(limit)
    )
    clones = clones_result.scalars().all()
    
    # 2. Search for Users
    users_result = await db.execute(
        select(User)
        .where(
            or_(
                User.user_name.ilike(f"%{q}%"),
                User.name.ilike(f"%{q}%"),
                User.email.ilike(f"%{q}%")
            ),
            User.id != user["id"]
        )
        .order_by(User.user_name)
        .limit(limit)
    )
    users = users_result.scalars().all()
    
    results = []
    
    # Add Clones
    for clone in clones:
        results.append(ContactSearchResult(
            id=clone.id,
            name=clone.name,
            type="clone",
            description=clone.description,
            avatar_profile_url=clone.avatar_profile_url,
            avatar_icon_url=clone.avatar_icon_url,
            owner_name=clone.owner.name if clone.owner else "AIV System"
        ))
        
    # Add Users
    for u in users:
        results.append(ContactSearchResult(
            id=u.id,
            name=u.name,
            type="user",
            user_name=u.user_name,
            description=f"@{u.user_name}"
        ))
    
    return results[:limit]


@router.get("/public/{clone_id}")
async def get_public_clone_detail(
    clone_id: UUID,
    user: dict = Depends(require_auth),
    db: AsyncSession = Depends(get_db),
):
    """Get detailed info about a public clone (persona)."""
    result = await db.execute(
        select(Clone)
        .options(selectinload(Clone.owner))
        .where(
            Clone.id == clone_id,
            Clone.is_public == True,
            Clone.status == CloneStatus.COMPLETED,
        )
    )
    clone = result.scalar_one_or_none()
    
    if not clone:
        raise HTTPException(status_code=404, detail="Public clone not found")
    
    return {
        "id": str(clone.id),
        "name": clone.name,
        "description": clone.description,
        "avatar_profile_url": clone.avatar_profile_url,
        "avatar_icon_url": clone.avatar_icon_url,
        "personality": clone.personality,
        "background": clone.background,
        "is_system": clone.owner_id is None,  # True for seeded personas
        "owner_name": clone.owner.name if clone.owner else "AIV System",
        "created_at": clone.created_at.isoformat() if clone.created_at else None,
    }


@router.put("/{contact_id}/favorite")
async def toggle_favorite(
    contact_id: UUID,
    user: dict = Depends(require_auth),
    db: AsyncSession = Depends(get_db),
):
    """Toggle favorite status of a contact."""
    result = await db.execute(
        select(Contact).where(Contact.id == contact_id, Contact.owner_id == user["id"])
    )
    contact = result.scalar_one_or_none()
    
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")
    
    contact.is_favorite = not contact.is_favorite
    await db.commit()
    
    return {"status": "updated", "is_favorite": contact.is_favorite}
