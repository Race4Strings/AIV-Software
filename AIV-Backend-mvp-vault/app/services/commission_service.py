"""
Commission Service — 30/25/20 calculation, invoice generation, payout processing.

Commission routing: all client payments flow through to the talent's team.
AIV's commission is deducted transparently. The talent sees:
  "Payment received: $50,000. AIV commission (30%): $15,000. Net to you: $35,000."
"""

import logging
from datetime import date, datetime, timezone, timedelta
from decimal import Decimal
from typing import Optional, List
from uuid import UUID

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from sqlalchemy import select

from ..models.deal import Deal
from ..models.invoice import Invoice
from ..models.payout import Payout
from ..models.twin import Twin

logger = logging.getLogger(__name__)

COMMISSION_RATES = {1: Decimal("0.30"), 2: Decimal("0.25")}
DEFAULT_RATE = Decimal("0.20")


class CommissionService:
    def __init__(self, db: AsyncSession):
        self.db = db

    def get_rate(self, deal_number: int) -> Decimal:
        return COMMISSION_RATES.get(deal_number, DEFAULT_RATE)

    async def create_commission_invoice(self, deal: Deal) -> Invoice:
        """Create a commission invoice when a deal is executed."""
        invoice = Invoice(
            organization_id=deal.client_organization_id,
            type="COMMISSION",
            amount=deal.commission_amount,
            currency=deal.currency or "USD",
            deal_id=deal.id,
            status="PENDING",
            due_date=date.today() + timedelta(days=30),
        )
        self.db.add(invoice)
        await self.db.flush()
        return invoice

    async def create_platform_fee_invoice(self, org_id: UUID) -> Invoice:
        """Create the $997 monthly platform partnership fee invoice."""
        today = date.today()
        invoice = Invoice(
            organization_id=org_id,
            type="PLATFORM_FEE",
            amount=Decimal("997.00"),
            currency="USD",
            period_start=today,
            period_end=today + timedelta(days=30),
            status="PENDING",
            due_date=today + timedelta(days=30),
        )
        self.db.add(invoice)
        await self.db.flush()
        return invoice

    async def create_payout(self, deal: Deal) -> Payout:
        """Create a payout record for the talent's team."""
        # Get twin's org_id without lazy loading
        twin = await self.db.execute(
            select(Twin).where(Twin.id == deal.twin_id)
        )
        twin_obj = twin.scalar_one_or_none()
        org_id = twin_obj.organization_id if twin_obj else deal.client_organization_id

        payout = Payout(
            organization_id=org_id,
            deal_id=deal.id,
            gross_amount=deal.value,
            commission_amount=deal.commission_amount,
            net_amount=deal.value - deal.commission_amount,
            status="PENDING",
        )
        self.db.add(payout)
        await self.db.flush()
        return payout

    async def get_revenue_summary(
        self, org_id: UUID = None, twin_id: UUID = None,
    ) -> dict:
        """Revenue summary with commission breakdown."""
        query = select(
            func.count(Deal.id).label("total_deals"),
            func.coalesce(func.sum(Deal.value), 0).label("gross_revenue"),
            func.coalesce(func.sum(Deal.commission_amount), 0).label("total_commission"),
        ).where(Deal.status.in_(["EXECUTED", "ACTIVE", "COMPLETED"]))

        if twin_id:
            query = query.where(Deal.twin_id == twin_id)
        if org_id:
            query = query.where(Deal.client_organization_id == org_id)

        result = await self.db.execute(query)
        row = result.one()

        gross = float(row.gross_revenue)
        commission = float(row.total_commission)

        return {
            "total_deals": row.total_deals,
            "gross_revenue": gross,
            "total_commission": commission,
            "net_revenue": gross - commission,
            "currency": "USD",
        }

    async def get_invoices(
        self, org_id: UUID = None, status: str = None, invoice_type: str = None,
    ) -> List[Invoice]:
        query = select(Invoice).order_by(Invoice.created_at.desc())
        if org_id:
            query = query.where(Invoice.organization_id == org_id)
        if status:
            query = query.where(Invoice.status == status)
        if invoice_type:
            query = query.where(Invoice.type == invoice_type)
        result = await self.db.execute(query.limit(100))
        return list(result.scalars().all())

    async def get_payouts(
        self, org_id: UUID = None, deal_id: UUID = None,
    ) -> List[Payout]:
        query = select(Payout).order_by(Payout.created_at.desc())
        if org_id:
            query = query.where(Payout.organization_id == org_id)
        if deal_id:
            query = query.where(Payout.deal_id == deal_id)
        result = await self.db.execute(query.limit(100))
        return list(result.scalars().all())
