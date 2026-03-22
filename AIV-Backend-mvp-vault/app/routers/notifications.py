"""Notifications router — read/unread tracking."""

from uuid import UUID
from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_db
from ..middleware import require_auth
from ..services.notification_service import NotificationService

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
