"""
Notifications Router

Endpoints for managing user notifications.
"""
from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_db
from ..models import Notification
from ..schemas.notification import NotificationResponse
from ..middleware.auth_middleware import require_auth

router = APIRouter(prefix="/notifications", tags=["Notifications"])


@router.get("", response_model=List[NotificationResponse])
async def list_notifications(
    unread_only: bool = False,
    limit: int = 50,
    user: dict = Depends(require_auth),
    db: AsyncSession = Depends(get_db),
):
    """List notifications for the authenticated user."""
    query = select(Notification).where(Notification.user_id == user["id"])
    
    if unread_only:
        query = query.where(Notification.is_read == False)
    
    query = query.order_by(Notification.created_at.desc()).limit(limit)
    
    result = await db.execute(query)
    notifications = result.scalars().all()
    
    return [NotificationResponse.model_validate(n) for n in notifications]


@router.get("/unread-count")
async def get_unread_count(
    user: dict = Depends(require_auth),
    db: AsyncSession = Depends(get_db),
):
    """Get count of unread notifications."""
    from sqlalchemy import func
    
    result = await db.execute(
        select(func.count(Notification.id)).where(
            Notification.user_id == user["id"],
            Notification.is_read == False
        )
    )
    count = result.scalar() or 0
    
    return {"unread_count": count}


@router.put("/{notification_id}/read")
async def mark_as_read(
    notification_id: UUID,
    user: dict = Depends(require_auth),
    db: AsyncSession = Depends(get_db),
):
    """Mark a notification as read."""
    result = await db.execute(
        select(Notification).where(
            Notification.id == notification_id,
            Notification.user_id == user["id"]
        )
    )
    notification = result.scalar_one_or_none()
    
    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found")
    
    notification.is_read = True
    await db.commit()
    
    return {"status": "read", "notification_id": str(notification_id)}


@router.put("/read-all")
async def mark_all_as_read(
    user: dict = Depends(require_auth),
    db: AsyncSession = Depends(get_db),
):
    """Mark all notifications as read."""
    await db.execute(
        update(Notification)
        .where(Notification.user_id == user["id"], Notification.is_read == False)
        .values(is_read=True)
    )
    await db.commit()
    
    return {"status": "all_read"}


@router.delete("/{notification_id}")
async def delete_notification(
    notification_id: UUID,
    user: dict = Depends(require_auth),
    db: AsyncSession = Depends(get_db),
):
    """Delete a notification."""
    result = await db.execute(
        select(Notification).where(
            Notification.id == notification_id,
            Notification.user_id == user["id"]
        )
    )
    notification = result.scalar_one_or_none()
    
    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found")
    
    await db.delete(notification)
    await db.commit()
    
    return {"status": "deleted", "notification_id": str(notification_id)}
