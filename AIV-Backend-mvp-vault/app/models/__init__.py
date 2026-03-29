"""Models package — all 31 platform tables. Legacy models removed in Phase 6."""

# Accounts
from .user import User
from .organization import Organization, OrganizationUser, OrganizationMembership
from .otp import OTP

# Twin (slim reference)
from .twin import Twin

# Configuration (versioned)
from .guardrail_config import GuardrailConfig
from .licensing_rules_config import LicensingRulesConfig

# Onboarding
from .onboarding_session import OnboardingSession

# Training
from .training_contribution import TrainingContribution
from .negotiation_knowledge import NegotiationKnowledge

# Assistant
from .agent_session import AgentSession
from .agent_message import AgentMessage

# Deals
from .deal import Deal
from .deal_milestone import DealMilestone
from .deal_message import DealMessage
from .deal_contract import DealContract
from .reference_data_agreement import ReferenceDataAgreement
from .production_partner_disclosure import ProductionPartnerDisclosure
from .permitted_use_record import PermittedUseRecord
from .client_validation_submission import ClientValidationSubmission

# Packages
from .identity_package_version import IdentityPackageVersion

# Payments
from .invoice import Invoice
from .usage_meter import UsageMeter
from .payout import Payout

# System
from .notification import Notification
from .misuse_detection import MisuseDetection
from .twin_lock import TwinLock
from .consent_record import ConsentRecord
from .audit_log import AuditLog

# Access Control
from .access_code import AccessCode
from .waitlist import WaitlistEntry

# Calibration (Precision Tuning — BFI-2)
from .bfi2_response import BFI2Response

# Marketplace (Stage 3 — schema only)
from .marketplace_listing import MarketplaceListing
from .marketplace_inquiry import MarketplaceInquiry

__all__ = [
    "User", "Organization", "OrganizationUser", "OrganizationMembership", "OTP",
    "Twin",
    "GuardrailConfig", "LicensingRulesConfig",
    "OnboardingSession",
    "TrainingContribution", "NegotiationKnowledge",
    "AgentSession", "AgentMessage",
    "Deal", "DealMilestone", "DealMessage", "DealContract",
    "ReferenceDataAgreement", "ProductionPartnerDisclosure",
    "PermittedUseRecord", "ClientValidationSubmission",
    "IdentityPackageVersion",
    "Invoice", "UsageMeter", "Payout",
    "Notification", "MisuseDetection", "TwinLock", "ConsentRecord", "AuditLog",
    "AccessCode", "WaitlistEntry",
    "BFI2Response",
    "MarketplaceListing", "MarketplaceInquiry",
]
