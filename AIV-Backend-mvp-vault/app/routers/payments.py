"""Payments router — invoices, payouts, revenue summary."""

from uuid import UUID
from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_db
from ..middleware import require_auth
from ..services.commission_service import CommissionService

router = APIRouter(prefix="/payments", tags=["payments"])


@router.get("/invoices")
async def list_invoices(
    status: Optional[str] = None,
    type: Optional[str] = None,
    user: dict = Depends(require_auth),
    db: AsyncSession = Depends(get_db),
):
    svc = CommissionService(db)
    invoices = await svc.get_invoices(status=status, invoice_type=type)
    return [
        {
            "id": str(i.id), "organization_id": str(i.organization_id),
            "type": i.type, "amount": float(i.amount), "currency": i.currency,
            "deal_id": str(i.deal_id) if i.deal_id else None,
            "status": i.status, "due_date": i.due_date.isoformat() if i.due_date else None,
            "paid_at": i.paid_at.isoformat() if i.paid_at else None,
            "created_at": i.created_at.isoformat() if i.created_at else None,
        }
        for i in invoices
    ]


@router.get("/payouts")
async def list_payouts(
    deal_id: Optional[str] = None,
    user: dict = Depends(require_auth),
    db: AsyncSession = Depends(get_db),
):
    svc = CommissionService(db)
    payouts = await svc.get_payouts(deal_id=UUID(deal_id) if deal_id else None)
    return [
        {
            "id": str(p.id), "organization_id": str(p.organization_id),
            "deal_id": str(p.deal_id), "gross_amount": float(p.gross_amount),
            "commission_amount": float(p.commission_amount),
            "net_amount": float(p.net_amount), "status": p.status,
            "processed_at": p.processed_at.isoformat() if p.processed_at else None,
            "created_at": p.created_at.isoformat() if p.created_at else None,
        }
        for p in payouts
    ]


@router.get("/revenue")
async def revenue_summary(
    twin_id: Optional[str] = None,
    user: dict = Depends(require_auth),
    db: AsyncSession = Depends(get_db),
):
    svc = CommissionService(db)
    return await svc.get_revenue_summary(
        twin_id=UUID(twin_id) if twin_id else None,
    )
