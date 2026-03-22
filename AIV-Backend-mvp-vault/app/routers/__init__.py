"""Routers package — new architecture only. Legacy routers removed in Phase 6."""
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

__all__ = [
    "auth_router", "upload_router", "twin_router",
    "audit_router", "onboarding_router", "verify_router",
    "agent_router", "licensing_router",
    "payments_router", "notifications_router",
]
