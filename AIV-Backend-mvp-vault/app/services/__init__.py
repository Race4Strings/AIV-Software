"""Services package — new architecture. Legacy services removed in Phase 6."""
from .auth_service import AuthService
from .email_service import EmailService
from .alcm_client import get_alcm_client, GracefulALCMClient
from .agent_service import AgentService
from .licensing_service import LicensingService
from .commission_service import CommissionService
from .notification_service import NotificationService

__all__ = [
    "AuthService", "EmailService",
    "get_alcm_client", "GracefulALCMClient",
    "AgentService", "LicensingService",
    "CommissionService", "NotificationService",
]
