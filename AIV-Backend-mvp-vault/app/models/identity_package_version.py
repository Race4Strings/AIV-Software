"""Identity package versioning — replaces certifications with Seal + cascade."""
from sqlalchemy import Column, String, Integer, Boolean, DateTime, ForeignKey, Text, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import UUID, ARRAY
from sqlalchemy.orm import relationship
import uuid
from ..database import Base


class IdentityPackageVersion(Base):
    __tablename__ = "identity_package_versions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    twin_id = Column(UUID(as_uuid=True), ForeignKey("twins.id"), nullable=False)
    version_number = Column(Integer, nullable=False)
    alcm_snapshot_ref = Column(Text, nullable=False)

    change_summary = Column(Text, nullable=True)
    change_categories = Column(ARRAY(Text), default=list)

    seal_id = Column(UUID(as_uuid=True), nullable=False, default=uuid.uuid4)
    seal_hash = Column(String(128), nullable=False)
    seal_generated_at = Column(DateTime(timezone=True), server_default=func.now())

    tx_hash = Column(String(70), nullable=True)
    block_number = Column(String(20), nullable=True)
    network = Column(String(20), nullable=True)

    cascaded_to_deals = Column(Integer, default=0)
    cascade_completed = Column(DateTime(timezone=True), nullable=True)

    is_current = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    created_by = Column(UUID(as_uuid=True), ForeignKey("user_table.id"), nullable=True)

    __table_args__ = (UniqueConstraint("twin_id", "version_number"),)

    twin = relationship("Twin", back_populates="identity_package_versions")
