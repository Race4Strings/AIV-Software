"""Notifications router — read/unread tracking + preferences."""

from uuid import UUID
from typing import Optional

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_db
from ..middleware import require_auth
from ..services.notification_service import NotificationService
from ..models.user import User


class NotificationPreferences(BaseModel):
    deal_alerts: bool = True
    pul_reminders: bool = True
    health_alerts: bool = True
    milestone_reminders: bool = True
    system_updates: bool = False

router = APIRouter(prefix="/notifications", tags=["notifications"])


@router.get("")
async def list_notifications(
    unread: bool = Query(False),
    type: Optional[str] = None,
    user: dict = Depends(require_auth),
    db: AsyncSession = Depends(get_db),
):
    svc = NotificationService(db)
    notifs = await svc.get_for_user(UUID(user["id"]), unread_only=unread, notif_type=type)
    return [
        {
            "id": str(n.id), "type": n.type, "title": n.title, "body": n.body,
            "action_url": n.action_url, "entity_type": n.entity_type,
            "entity_id": str(n.entity_id) if n.entity_id else None,
            "read": n.read, "read_at": n.read_at.isoformat() if n.read_at else None,
            "created_at": n.created_at.isoformat() if n.created_at else None,
        }
        for n in notifs
    ]


@router.post("/{notif_id}/read")
async def mark_read(
    notif_id: str,
    user: dict = Depends(require_auth),
    db: AsyncSession = Depends(get_db),
):
    svc = NotificationService(db)
    notif = await svc.mark_read(UUID(notif_id))
    if not notif:
        return {"error": "Notification not found"}
    return {"id": str(notif.id), "read": True}


@router.post("/read-all")
async def mark_all_read(
    user: dict = Depends(require_auth),
    db: AsyncSession = Depends(get_db),
):
    svc = NotificationService(db)
    count = await svc.mark_all_read(UUID(user["id"]))
    return {"count": count}


@router.get("/preferences")
async def get_preferences(
    user: dict = Depends(require_auth),
    db: AsyncSession = Depends(get_db),
):
    """Get user's notification preferences."""
    result = await db.execute(select(User).where(User.id == UUID(user["id"])))
    u = result.scalar_one_or_none()
    prefs = getattr(u, "notification_preferences", None) or {}
    return {
        "deal_alerts": prefs.get("deal_alerts", True),
        "pul_reminders": prefs.get("pul_reminders", True),
        "health_alerts": prefs.get("health_alerts", True),
        "milestone_reminders": prefs.get("milestone_reminders", True),
        "system_updates": prefs.get("system_updates", False),
    }


@router.post("/preferences")
async def update_preferences(
    prefs: NotificationPreferences,
    user: dict = Depends(require_auth),
    db: AsyncSession = Depends(get_db),
):
    """Update user's notification preferences. Persists to database."""
    await db.execute(
        update(User)
        .where(User.id == UUID(user["id"]))
        .values(notification_preferences=prefs.model_dump())
    )
    await db.flush()
    return prefs.model_dump()
