from sqlalchemy import Column, String, Boolean, DateTime, func
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
import uuid

from ..database import Base


class User(Base):
    """User model for authentication and profile."""

    __tablename__ = "user_table"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    email = Column(String(255), nullable=False, unique=True, index=True)
    user_name = Column(String(255), nullable=False, unique=True, index=True)
    password = Column(String(255), nullable=False)
    is_verified = Column(Boolean, default=False, nullable=False)
    role = Column(String(50), nullable=False, default="TALENT")
    stripe_customer_id = Column(String(255), nullable=True)
    notification_preferences = Column(JSONB, nullable=True, default=dict)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    
    # Relationships
    organizations = relationship("OrganizationUser", back_populates="user")
    otps = relationship("OTP", back_populates="user")
    # Legacy: old routers reference user.twins. Now Twin uses talent_user_id with backref "owned_twins".
    # This relationship kept for compat — maps to twins where talent_user_id = this user's id.
    twins = relationship("Twin", foreign_keys="Twin.talent_user_id", viewonly=True)
    
    def __repr__(self):
        return f"<User {self.user_name}>"
