"""
Scheduled Jobs — deal expiry enforcement + platform fee activation.

Per spec:
  - Section 9.3: Deals past end_date without closing attestation → auto-notify
  - Section 9.5: $997 platform fee activates when first deal EXECUTED or 90-day window expires

These run as background tasks on the platform service. In production,
consider moving to a dedicated worker or using Celery/ARQ.
"""

import logging
from datetime import datetime, timezone, date, timedelta
from decimal import Decimal

from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import async_session_maker
from ..models.deal import Deal
from ..models.twin import Twin
from ..models.notification import Notification
from ..models.invoice import Invoice

logger = logging.getLogger(__name__)


async def check_deal_expiry():
    """Check for active deals past their end_date. Notify both parties."""
    logger.info("Running deal expiry check...")
    async with async_session_maker() as db:
        try:
            today = date.today()
            result = await db.execute(
                select(Deal).where(
                    Deal.status == "ACTIVE",
                    Deal.end_date.isnot(None),
                    Deal.end_date < today,
                )
            )
            expired_deals = list(result.scalars().all())

            for deal in expired_deals:
                # Check if closing attestation exists (PUL with CLOSING_ATTESTATION)
                from ..models.permitted_use_record import PermittedUseRecord
                pul_result = await db.execute(
                    select(PermittedUseRecord).where(
                        PermittedUseRecord.deal_id == deal.id,
                        PermittedUseRecord.record_type == "CLOSING_ATTESTATION",
                    )
                )
                has_closing = pul_result.scalar_one_or_none() is not None

                if not has_closing:
                    # Get twin owner for notification
                    twin_result = await db.execute(
                        select(Twin).where(Twin.id == deal.twin_id)
                    )
                    twin = twin_result.scalar_one_or_none()
                    if twin and twin.talent_user_id:
                        notif = Notification(
                            user_id=twin.talent_user_id,
                            type="PUL_OVERDUE",
                            title="Deal Term Ended — Closing Attestation Required",
                            body=f"Deal #{deal.deal_number} has passed its end date. A closing attestation is required.",
                            action_url=f"/deals/{deal.id}",
                            entity_type="deal",
                            entity_id=deal.id,
                        )
                        db.add(notif)

            await db.commit()
            logger.info(f"Deal expiry check complete. {len(expired_deals)} expired deals found.")
        except Exception as e:
            logger.error(f"Deal expiry check failed: {e}", exc_info=True)
            await db.rollback()


async def activate_platform_fees():
    """Activate $997/month platform fee for eligible twins.

    Fee activates when:
    1. A deal has transitioned to EXECUTED for that twin, OR
    2. fee_free_window_expires < NOW()
    """
    logger.info("Running platform fee activation check...")
    async with async_session_maker() as db:
        try:
            now = datetime.now(timezone.utc)
            result = await db.execute(
                select(Twin).where(
                    Twin.status == "ACTIVE",
                    Twin.platform_fee_active.is_(False),
                )
            )
            candidates = list(result.scalars().all())

            activated = 0
            for twin in candidates:
                # Check if any deal is EXECUTED or beyond
                deal_result = await db.execute(
                    select(Deal).where(
                        Deal.twin_id == twin.id,
                        Deal.status.in_(["EXECUTED", "ACTIVE", "COMPLETED"]),
                    ).limit(1)
                )
                has_executed = deal_result.scalar_one_or_none() is not None

                # Or if fee window expired
                window_expired = (
                    twin.fee_free_window_expires is not None
                    and twin.fee_free_window_expires < now
                )

                if has_executed or window_expired:
                    twin.platform_fee_active = True

                    # Create first invoice
                    today = date.today()
                    invoice = Invoice(
                        organization_id=twin.organization_id,
                        type="PLATFORM_FEE",
                        amount=Decimal("997.00"),
                        currency="USD",
                        period_start=today,
                        period_end=today + timedelta(days=30),
                        status="PENDING",
                        due_date=today + timedelta(days=30),
                    )
                    db.add(invoice)
                    activated += 1

                    logger.info(f"Platform fee activated for twin {twin.id}")

            await db.commit()
            logger.info(f"Platform fee check complete. {activated} twins activated.")
        except Exception as e:
            logger.error(f"Platform fee activation failed: {e}", exc_info=True)
            await db.rollback()


def start_scheduler():
    """Start the APScheduler background scheduler."""
    from apscheduler.schedulers.asyncio import AsyncIOScheduler

    scheduler = AsyncIOScheduler()

    # Run deal expiry check daily at 2 AM UTC
    scheduler.add_job(check_deal_expiry, "cron", hour=2, minute=0)

    # Run platform fee activation daily at 3 AM UTC
    scheduler.add_job(activate_platform_fees, "cron", hour=3, minute=0)

    scheduler.start()
    logger.info("Scheduler started (deal expiry: 2AM UTC, platform fees: 3AM UTC)")
    return scheduler
