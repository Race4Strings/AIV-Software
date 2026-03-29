import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime, JSON
from sqlalchemy.dialects.postgresql import UUID

from ..database import Base


class WaitlistEntry(Base):
    """Waitlist entries for users requesting early access.

    Users fill out a role-specific form on the landing page.
    Admins review and grant access (generating a code).
    """

    __tablename__ = "waitlist_entries"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String(255), unique=True, nullable=False, index=True)
    name = Column(String(255), nullable=True)
    role = Column(String(50), nullable=True)  # creator, manager, brand, investor
    phone = Column(String(30), nullable=True)
    referral_source = Column(String(255), nullable=True)
    extra_data = Column(JSON, nullable=True)  # Role-specific details (handle, audience_size, budget, etc.)
    status = Column(String(20), default="pending", nullable=False)  # pending, granted, removed
    granted_code = Column(String(20), nullable=True)  # The access code generated for them
    created_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    granted_at = Column(DateTime(timezone=True), nullable=True)
