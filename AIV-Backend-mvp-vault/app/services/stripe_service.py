"""
Stripe integration service — handles all payment operations.

Card capture, subscriptions, invoices, Connect payouts, and webhooks.
"""

import logging
from typing import Optional
from uuid import UUID

import stripe
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..config import get_settings
from ..models.user import User
from ..models.twin import Twin
from ..models.invoice import Invoice

logger = logging.getLogger(__name__)


def _init_stripe():
    """Initialize Stripe with the secret key from settings."""
    settings = get_settings()
    if settings.stripe_secret_key:
        stripe.api_key = settings.stripe_secret_key
    else:
        logger.warning("Stripe secret key not configured — payment operations will fail")


class StripeService:
    """Handles Stripe payment operations for AIV platform."""

    def __init__(self, db: AsyncSession):
        self.db = db
        _init_stripe()

    # ── Card Capture ──────────────────────────────────────

    async def create_checkout_session(
        self,
        user_id: UUID,
        success_url: str,
        cancel_url: str,
    ) -> dict:
        """Create a Stripe Checkout Session for card capture (setup mode).

        This captures a payment method without charging. The card is saved
        for future billing (platform fee + commission invoices).
        """
        user = await self._get_user(user_id)
        if not user:
            raise ValueError("User not found")

        # Create or retrieve Stripe customer
        customer_id = user.stripe_customer_id
        if not customer_id:
            customer = stripe.Customer.create(
                email=user.email,
                name=user.name,
                metadata={"aiv_user_id": str(user.id)},
            )
            customer_id = customer.id
            user.stripe_customer_id = customer_id
            await self.db.flush()

        # Create setup-mode checkout session (captures card, doesn't charge)
        session = stripe.checkout.Session.create(
            customer=customer_id,
            mode="setup",
            payment_method_types=["card"],
            success_url=success_url,
            cancel_url=cancel_url,
            metadata={"aiv_user_id": str(user.id)},
        )

        return {
            "checkout_url": session.url,
            "session_id": session.id,
        }

    # ── Platform Fee Subscription ─────────────────────────

    async def create_platform_fee_subscription(
        self,
        twin_id: UUID,
    ) -> Optional[dict]:
        """Create a $997/month subscription for the platform fee.

        Called by scheduler when fee-free window expires or first deal executes.
        """
        settings = get_settings()
        if not settings.stripe_platform_fee_price_id:
            logger.warning("Stripe platform fee price ID not configured")
            return None

        twin = await self._get_twin(twin_id)
        if not twin or twin.stripe_subscription_id:
            return None  # Already subscribed or twin not found

        # Get the twin owner's Stripe customer ID
        user = await self._get_user(twin.talent_user_id)
        if not user or not user.stripe_customer_id:
            logger.warning(f"Cannot create subscription: user {twin.talent_user_id} has no Stripe customer")
            return None

        try:
            subscription = stripe.Subscription.create(
                customer=user.stripe_customer_id,
                items=[{"price": settings.stripe_platform_fee_price_id}],
                metadata={
                    "aiv_twin_id": str(twin.id),
                    "type": "platform_fee",
                },
            )
            twin.stripe_subscription_id = subscription.id
            twin.platform_fee_active = True
            await self.db.flush()

            return {
                "subscription_id": subscription.id,
                "status": subscription.status,
            }
        except stripe.error.StripeError as e:
            logger.error(f"Failed to create platform fee subscription: {e}")
            return None

    # ── Commission Invoice ────────────────────────────────

    async def create_commission_invoice(
        self,
        customer_email: str,
        amount_cents: int,
        description: str,
        deal_id: UUID,
    ) -> Optional[dict]:
        """Create a Stripe Invoice for deal commission.

        For commissions under $50K, collected via Stripe.
        For larger amounts, wire transfer is used (tracked manually).
        """
        try:
            # Find or create customer for the client organization
            customers = stripe.Customer.list(email=customer_email, limit=1)
            if customers.data:
                customer_id = customers.data[0].id
            else:
                customer = stripe.Customer.create(
                    email=customer_email,
                    metadata={"type": "client", "aiv_deal_id": str(deal_id)},
                )
                customer_id = customer.id

            # Create invoice item + invoice
            stripe.InvoiceItem.create(
                customer=customer_id,
                amount=amount_cents,
                currency="usd",
                description=description,
            )

            invoice = stripe.Invoice.create(
                customer=customer_id,
                auto_advance=True,  # Auto-finalize and attempt collection
                collection_method="send_invoice",
                days_until_due=30,
                metadata={"aiv_deal_id": str(deal_id), "type": "commission"},
            )

            return {
                "invoice_id": invoice.id,
                "invoice_url": invoice.hosted_invoice_url,
                "status": invoice.status,
            }
        except stripe.error.StripeError as e:
            logger.error(f"Failed to create commission invoice: {e}")
            return None

    # ── Stripe Connect (Talent Payouts) ───────────────────

    async def create_connect_onboarding_link(
        self,
        user_id: UUID,
        return_url: str,
        refresh_url: str,
    ) -> Optional[dict]:
        """Create a Stripe Connect onboarding link for talent payout setup."""
        user = await self._get_user(user_id)
        if not user:
            return None

        try:
            # Create Express Connect account
            account = stripe.Account.create(
                type="express",
                email=user.email,
                metadata={"aiv_user_id": str(user.id)},
            )

            # Generate onboarding link
            link = stripe.AccountLink.create(
                account=account.id,
                refresh_url=refresh_url,
                return_url=return_url,
                type="account_onboarding",
            )

            return {
                "connect_account_id": account.id,
                "onboarding_url": link.url,
            }
        except stripe.error.StripeError as e:
            logger.error(f"Failed to create Connect account: {e}")
            return None

    async def create_payout_transfer(
        self,
        connect_account_id: str,
        amount_cents: int,
        deal_id: UUID,
    ) -> Optional[dict]:
        """Transfer payout to talent's Connect account."""
        try:
            transfer = stripe.Transfer.create(
                amount=amount_cents,
                currency="usd",
                destination=connect_account_id,
                metadata={"aiv_deal_id": str(deal_id), "type": "talent_payout"},
            )
            return {
                "transfer_id": transfer.id,
                "amount": transfer.amount,
                "status": "pending",
            }
        except stripe.error.StripeError as e:
            logger.error(f"Failed to create payout transfer: {e}")
            return None

    # ── Helpers ────────────────────────────────────────────

    async def _get_user(self, user_id: UUID) -> Optional[User]:
        result = await self.db.execute(select(User).where(User.id == user_id))
        return result.scalar_one_or_none()

    async def _get_twin(self, twin_id: UUID) -> Optional[Twin]:
        result = await self.db.execute(select(Twin).where(Twin.id == twin_id))
        return result.scalar_one_or_none()
