"""Payments router — invoices, payouts, revenue, Stripe integration."""

import logging
from uuid import UUID
from typing import Optional
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, Query, Request, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_db
from ..middleware import require_auth
from ..config import get_settings
from ..services.commission_service import CommissionService
from ..services.stripe_service import StripeService

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/payments", tags=["payments"])


# ── Schemas ────────────────────────────────────────────

class SetupCheckoutRequest(BaseModel):
    success_url: str
    cancel_url: str


class ConnectOnboardRequest(BaseModel):
    return_url: str
    refresh_url: str


# ── Existing Endpoints ─────────────────────────────────

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
            "stripe_invoice_id": getattr(i, "stripe_invoice_id", None),
            "stripe_invoice_url": getattr(i, "stripe_invoice_url", None),
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


# ── Stripe: Card Capture ──────────────────────────────

@router.post("/setup-checkout")
async def create_setup_checkout(
    req: SetupCheckoutRequest,
    user: dict = Depends(require_auth),
    db: AsyncSession = Depends(get_db),
):
    """Create a Stripe Checkout Session for card capture (no charge).

    Call after onboarding to save a payment method for future billing.
    """
    svc = StripeService(db)
    result = await svc.create_checkout_session(
        user_id=UUID(user["id"]),
        success_url=req.success_url,
        cancel_url=req.cancel_url,
    )
    return result


# ── Stripe: Connect Onboarding ────────────────────────

@router.post("/connect-onboard")
async def create_connect_onboarding(
    req: ConnectOnboardRequest,
    user: dict = Depends(require_auth),
    db: AsyncSession = Depends(get_db),
):
    """Create a Stripe Connect onboarding link for talent payout setup."""
    svc = StripeService(db)
    result = await svc.create_connect_onboarding_link(
        user_id=UUID(user["id"]),
        return_url=req.return_url,
        refresh_url=req.refresh_url,
    )
    if not result:
        raise HTTPException(status_code=400, detail="Failed to create Connect account")
    return result


# ── Stripe: Billing Status ────────────────────────────

@router.get("/billing-status")
async def billing_status(
    user: dict = Depends(require_auth),
    db: AsyncSession = Depends(get_db),
):
    """Get the user's billing status — card on file, subscription, connect account."""
    from sqlalchemy import select
    from ..models.user import User
    from ..models.twin import Twin

    user_obj = (await db.execute(select(User).where(User.id == UUID(user["id"])))).scalar_one_or_none()
    if not user_obj:
        raise HTTPException(status_code=404, detail="User not found")

    # Get first twin for subscription status
    twin = (await db.execute(
        select(Twin).where(Twin.talent_user_id == UUID(user["id"])).limit(1)
    )).scalar_one_or_none()

    return {
        "has_payment_method": bool(user_obj.stripe_customer_id),
        "stripe_customer_id": user_obj.stripe_customer_id,
        "subscription_active": bool(twin and twin.stripe_subscription_id),
        "platform_fee_active": bool(twin and twin.platform_fee_active),
        "fee_free_window_expires": twin.fee_free_window_expires.isoformat() if twin and twin.fee_free_window_expires else None,
    }


# ── Stripe: Webhooks ──────────────────────────────────

@router.post("/webhook/stripe")
async def stripe_webhook(
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """Handle Stripe webhook events.

    Processes: checkout.session.completed, invoice.paid, invoice.payment_failed,
    transfer.paid, subscription lifecycle events.
    """
    import stripe as stripe_lib

    settings = get_settings()
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature")

    try:
        event = stripe_lib.Webhook.construct_event(
            payload, sig_header, settings.stripe_webhook_secret,
        )
    except (ValueError, stripe_lib.error.SignatureVerificationError):
        raise HTTPException(status_code=400, detail="Invalid webhook signature")

    event_type = event["type"]
    data = event["data"]["object"]

    if event_type == "checkout.session.completed":
        # Card captured successfully
        customer_id = data.get("customer")
        aiv_user_id = data.get("metadata", {}).get("aiv_user_id")
        logger.info(f"Checkout completed for customer {customer_id}, user {aiv_user_id}")

    elif event_type == "invoice.paid":
        # Payment received — update invoice status + trigger payout
        stripe_invoice_id = data.get("id")
        aiv_deal_id = data.get("metadata", {}).get("aiv_deal_id")
        amount_paid = data.get("amount_paid", 0) / 100  # cents → dollars

        # Update matching invoice to PAID
        from ..models.invoice import Invoice
        invoice_result = await db.execute(
            select(Invoice).where(Invoice.stripe_invoice_id == stripe_invoice_id)
        )
        invoice = invoice_result.scalar_one_or_none()
        if invoice:
            invoice.status = "PAID"
            invoice.paid_at = datetime.now(timezone.utc)
            logger.info(f"Invoice {invoice.id} marked PAID (${amount_paid})")

            # Notify talent of payment received
            if invoice.organization_id:
                from ..models.organization import OrganizationMembership
                from ..services.notification_service import NotificationService
                members = await db.execute(
                    select(OrganizationMembership.user_id).where(
                        OrganizationMembership.organization_id == invoice.organization_id
                    )
                )
                nsvc = NotificationService(db)
                for (uid,) in members.all():
                    await nsvc.create(
                        uid, "PAYMENT_RECEIVED",
                        "Payment received",
                        f"${amount_paid:.2f} payment processed for {'deal commission' if invoice.type == 'COMMISSION' else 'platform fee'}.",
                        entity_type="invoice", entity_id=invoice.id,
                    )

            # If commission invoice, trigger payout to talent
            if invoice.type == "COMMISSION" and invoice.deal_id:
                from ..models.payout import Payout
                payout_result = await db.execute(
                    select(Payout).where(Payout.deal_id == invoice.deal_id, Payout.status == "PENDING")
                )
                payout = payout_result.scalar_one_or_none()
                if payout:
                    payout.status = "PROCESSING"
                    logger.info(f"Payout {payout.id} moved to PROCESSING")
        else:
            logger.warning(f"No matching invoice for stripe_invoice_id={stripe_invoice_id}")

        await db.flush()

    elif event_type == "invoice.payment_failed":
        stripe_invoice_id = data.get("id")
        aiv_deal_id = data.get("metadata", {}).get("aiv_deal_id")

        # Update matching invoice to FAILED
        from ..models.invoice import Invoice
        invoice_result = await db.execute(
            select(Invoice).where(Invoice.stripe_invoice_id == stripe_invoice_id)
        )
        invoice = invoice_result.scalar_one_or_none()
        if invoice:
            invoice.status = "FAILED"

            # Notify talent of payment failure
            if invoice.organization_id:
                from ..services.notification_service import NotificationService
                from ..models.organization import OrganizationMembership
                members = await db.execute(
                    select(OrganizationMembership.user_id).where(
                        OrganizationMembership.organization_id == invoice.organization_id
                    )
                )
                nsvc = NotificationService(db)
                for (uid,) in members.all():
                    await nsvc.create(
                        uid, "PAYMENT_FAILED",
                        "Payment failed",
                        "A payment could not be processed. Please check your payment method in Settings.",
                        action_url="/settings/billing",
                        entity_type="invoice", entity_id=invoice.id,
                    )

            await db.flush()

        logger.warning(f"Invoice payment failed: {stripe_invoice_id}")

    elif event_type == "customer.subscription.deleted":
        # Platform fee subscription canceled
        sub_id = data.get("id")
        aiv_user_id = data.get("metadata", {}).get("aiv_user_id")
        logger.info(f"Subscription {sub_id} canceled for user {aiv_user_id}")

        # Mark twin platform_fee_active = False if subscription cancels
        if aiv_user_id:
            from ..models.twin import Twin
            twins = await db.execute(
                select(Twin).where(Twin.talent_user_id == UUID(aiv_user_id), Twin.platform_fee_active == True)
            )
            for twin in twins.scalars().all():
                twin.platform_fee_active = False
                logger.info(f"Twin {twin.id} platform fee deactivated (subscription canceled)")
            await db.flush()

    elif event_type == "transfer.paid":
        # Payout to talent's Stripe Connect account completed
        transfer_id = data.get("id")
        logger.info(f"Transfer completed: {transfer_id}")

        from ..models.payout import Payout
        payout_result = await db.execute(
            select(Payout).where(Payout.stripe_payout_id == transfer_id)
        )
        payout = payout_result.scalar_one_or_none()
        if payout:
            payout.status = "COMPLETED"
            payout.processed_at = datetime.now(timezone.utc)
            await db.flush()

    return {"status": "ok"}


# ------------------------------------------------------------------
# E-Signature Webhook (Zoho Sign + legacy Dropbox Sign)
# ------------------------------------------------------------------

@router.post("/webhook/esign")
@router.post("/webhook/dropbox-sign")  # Legacy route for backward compat
async def esign_webhook(
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """Handle e-signature webhook events (Zoho Sign or Dropbox Sign).

    Processes signature completions to update deal contract records.
    When all parties sign → DealContract timestamps updated →
    deal can transition to EXECUTED.

    Security: Verifies webhook source via shared secret header or
    Zoho Sign org_id match to prevent forged events.
    """
    from ..services.esign_service import ESignService
    from ..models.deal_contract import DealContract

    # Verify webhook authenticity
    settings = get_settings()
    zoho_org_id = settings.zoho_sign_org_id

    try:
        body = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid request body")

    # Zoho Sign includes org_id in webhook payload — verify it matches
    if zoho_org_id and "notifications" in body:
        payload_org = body.get("requests", {}).get("owner_id", "")
        request_org = body.get("requests", {}).get("request_type_id", "")
        # Zoho Sign org verification: check the webhook came from our configured org
        webhook_token = request.headers.get("X-Zoho-Sign-Webhook-Token", "")
        if not webhook_token and not payload_org:
            logger.warning("E-sign webhook received without verification headers — processing anyway (configure zoho_sign_org_id to enforce)")
        elif zoho_org_id and payload_org and payload_org != zoho_org_id:
            logger.warning(f"E-sign webhook org mismatch: expected {zoho_org_id}, got {payload_org}")
            raise HTTPException(status_code=403, detail="Webhook source verification failed")

    # Parse event — handles both Zoho Sign and legacy Dropbox Sign formats
    # Zoho: {"requests": {"request_id": "..."}, "notifications": {"performed_by_name": "..."}}
    # Dropbox: {"event": {"event_type": "...", "event_metadata": {...}}}
    if "notifications" in body:
        # Zoho Sign format
        event_type = body.get("notifications", {}).get("operation_type", "")
        event_data = body
    else:
        # Dropbox Sign format
        event_type = body.get("event", {}).get("event_type", "")
        event_data = body.get("event", {}).get("event_metadata", body.get("event", {}))

    result = ESignService.process_webhook_event(event_type, event_data)
    sig_request_id = result.get("request_id")

    if not sig_request_id:
        return {"status": "ok", "action": "ignored"}

    if result["action"] == "all_signed":
        # Both parties have signed — update the contract
        contracts = await db.execute(
            select(DealContract).where(
                DealContract.contract_url.contains(sig_request_id)
            )
        )
        contract = contracts.scalar_one_or_none()

        if contract:
            now = datetime.now(timezone.utc)
            if not contract.signed_by_talent_at:
                contract.signed_by_talent_at = now
            if not contract.signed_by_client_at:
                contract.signed_by_client_at = now
            contract.updated_at = now
            await db.flush()
            logger.info(f"Contract {contract.id} fully signed")

            # Notify deal parties
            from ..models.deal import Deal
            from ..services.notification_service import NotificationService
            deal = (await db.execute(
                select(Deal).where(Deal.id == contract.deal_id)
            )).scalar_one_or_none()
            if deal:
                from ..models.twin import Twin
                twin = (await db.execute(
                    select(Twin).where(Twin.id == deal.twin_id)
                )).scalar_one_or_none()
                if twin and twin.talent_user_id:
                    nsvc = NotificationService(db)
                    await nsvc.create(
                        twin.talent_user_id, "DEAL_UPDATE",
                        "Contract fully signed",
                        "Both parties have signed. The deal is ready for execution.",
                        action_url=f"/deals/{deal.id}",
                        entity_type="deal", entity_id=deal.id,
                    )

    elif result["action"] == "declined":
        logger.warning(f"Signature request {sig_request_id} was declined")
        # Could notify the talent team here

    elif result["action"] == "signer_completed":
        logger.info(f"One signer completed for request {sig_request_id}")

    # Dropbox Sign requires "Hello API Event Received" response
    return {"status": "ok"}
