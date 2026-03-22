from sqlalchemy import Column, String, DateTime, ForeignKey, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import UUID, JSON
from sqlalchemy.orm import relationship
import uuid

from ..database import Base


class Organization(Base):
    """Organization — holds twins, team members, billing."""

    __tablename__ = "organization_table"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    type = Column(String(50), nullable=False, default="TALENT_TEAM")  # TALENT_TEAM|CLIENT|AIV_INTERNAL
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    # Relationships
    memberships = relationship("OrganizationMembership", back_populates="organization")
    # Legacy relationship kept for auth_service compatibility
    users = relationship("OrganizationUser", back_populates="organization")

    def __repr__(self):
        return f"<Organization {self.name} ({self.type})>"


class OrganizationUser(Base):
    """Legacy join table — kept for auth_service compatibility during migration."""

    __tablename__ = "organization_users_table"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("user_table.id"), nullable=False, index=True)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organization_table.id"), nullable=False, index=True)
    role = Column(String(50), default="member", nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    user = relationship("User", back_populates="organizations")
    organization = relationship("Organization", back_populates="users")


class OrganizationMembership(Base):
    """New membership model with granular permissions."""

    __tablename__ = "organization_memberships"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organization_table.id"), nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey("user_table.id"), nullable=False)
    role = Column(String(50), nullable=False)  # OWNER|ADMIN|MEMBER|VIEWER
    permissions = Column(JSON, nullable=False, default=dict)
    invited_by = Column(UUID(as_uuid=True), ForeignKey("user_table.id"), nullable=True)
    accepted_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    __table_args__ = (UniqueConstraint("organization_id", "user_id"),)

    organization = relationship("Organization", back_populates="memberships")
    user = relationship("User", foreign_keys=[user_id])
