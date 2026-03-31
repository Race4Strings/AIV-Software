"""Routers package — complete platform API."""
from .auth import router as auth_router
from .upload import router as upload_router
from .twin import router as twin_router
from .audit import router as audit_router
from .onboarding import router as onboarding_router
from .verify import router as verify_router
from .agent import router as agent_router
from .licensing import router as licensing_router
from .payments import router as payments_router
from .notifications import router as notifications_router
from .guardrails import router as guardrails_router
from .consent import router as consent_router
from .organizations import router as organizations_router
from .packages import router as packages_router
from .calibration import router as calibration_router
from .training import router as training_router

__all__ = [
    "auth_router", "upload_router", "twin_router",
    "audit_router", "onboarding_router", "verify_router",
    "agent_router", "licensing_router",
    "payments_router", "notifications_router",
    "guardrails_router", "consent_router",
    "organizations_router", "packages_router",
    "calibration_router", "training_router",
]
