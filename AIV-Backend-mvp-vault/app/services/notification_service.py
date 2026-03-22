"""
Notification Service — Event-driven alerts to the right user at the right time.

Notification types per spec:
  DEAL_SUBMITTED, DEAL_APPROVED, DEAL_EXECUTED, PUL_OVERDUE, PUL_SUBMITTED,
  PACKAGE_UPDATED, GUARDRAIL_CHANGED, HEALTH_ALERT, VALIDATION_RESULT,
  TWIN_LOCKED, MISUSE_DETECTED, PAYMENT_RECEIVED, AUDIT_DUE,
  MILESTONE_UPCOMING, SCOPE_EXPANSION_REQUEST, VERSION_HOLD_REQUEST, SYSTEM_ALERT
"""

import logging
from datetime import datetime, timezone
from typing import Optional, List
from uuid import UUID

from sqlalchemy import select, desc, update
from sqlalchemy.ext.asyncio import AsyncSession

from ..models.notification import Notification

logger = logging.getLogger(__name__)


class NotificationService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(
        self,
        user_id: UUID,
        type: str,
        title: str,
        body: str,
        action_url: str = None,
        entity_type: str = None,
        entity_id: UUID = None,
    ) -> Notification:
        notif = Notification(
            user_id=user_id,
            type=type,
            title=title,
            body=body,
            action_url=action_url,
            entity_type=entity_type,
            entity_id=entity_id,
        )
        self.db.add(notif)
        await self.db.flush()
        logger.info(f"Notification created: {type} for user {user_id}")
        return notif

    async def get_for_user(
        self, user_id: UUID, unread_only: bool = False,
        notif_type: str = None, limit: int = 50,
    ) -> List[Notification]:
        query = (
            select(Notification)
            .where(Notification.user_id == user_id)
            .order_by(desc(Notification.created_at))
            .limit(limit)
        )
        if unread_only:
            query = query.where(Notification.read.is_(False))
        if notif_type:
            query = query.where(Notification.type == notif_type)
        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def mark_read(self, notif_id: UUID) -> Optional[Notification]:
        result = await self.db.execute(
            select(Notification).where(Notification.id == notif_id)
        )
        notif = result.scalar_one_or_none()
        if notif:
            notif.read = True
            notif.read_at = datetime.now(timezone.utc)
            await self.db.flush()
        return notif

    async def mark_all_read(self, user_id: UUID) -> int:
        result = await self.db.execute(
            update(Notification)
            .where(Notification.user_id == user_id, Notification.read.is_(False))
            .values(read=True, read_at=datetime.now(timezone.utc))
        )
        await self.db.flush()
        return result.rowcount

    # ------------------------------------------------------------------
    # Convenience methods for common events
    # ------------------------------------------------------------------

    async def notify_deal_submitted(self, user_id: UUID, deal_id: UUID, client_name: str):
        return await self.create(
            user_id, "DEAL_SUBMITTED", "New Deal Inquiry",
            f"A new deal inquiry has been submitted by {client_name}.",
            action_url=f"/deals/{deal_id}", entity_type="deal", entity_id=deal_id,
        )

    async def notify_deal_executed(self, user_id: UUID, deal_id: UUID, value: str):
        return await self.create(
            user_id, "DEAL_EXECUTED", "Deal Executed",
            f"Deal worth {value} has been fully executed. Both parties signed.",
            action_url=f"/deals/{deal_id}", entity_type="deal", entity_id=deal_id,
        )

    async def notify_pul_overdue(self, user_id: UUID, deal_id: UUID):
        return await self.create(
            user_id, "PUL_OVERDUE", "PUL Submission Overdue",
            "A Permitted Use Lifecycle submission is overdue for a deal.",
            action_url=f"/deals/{deal_id}", entity_type="deal", entity_id=deal_id,
        )

    async def notify_milestone_upcoming(self, user_id: UUID, deal_id: UUID, title: str):
        return await self.create(
            user_id, "MILESTONE_UPCOMING", f"Milestone Due: {title}",
            f"The milestone '{title}' is approaching its due date.",
            action_url=f"/deals/{deal_id}", entity_type="deal", entity_id=deal_id,
        )

    async def notify_payment_received(self, user_id: UUID, amount: str, deal_id: UUID = None):
        return await self.create(
            user_id, "PAYMENT_RECEIVED", "Payment Received",
            f"Payment of {amount} has been processed.",
            action_url=f"/deals/{deal_id}" if deal_id else None,
            entity_type="deal", entity_id=deal_id,
        )
