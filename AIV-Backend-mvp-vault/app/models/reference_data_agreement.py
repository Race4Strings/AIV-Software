from sqlalchemy import Column, Boolean, DateTime, Date, ForeignKey, Text, func
from sqlalchemy.dialects.postgresql import UUID, JSON
import uuid
from ..database import Base


class ReferenceDataAgreement(Base):
    __tablename__ = "reference_data_agreements"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    deal_id = Column(UUID(as_uuid=True), ForeignKey("deals.id"), nullable=False)
    data_manifest = Column(JSON, nullable=False)
    recipient_org = Column(Text, nullable=False)
    recipient_contact = Column(Text, nullable=False)
    purpose = Column(Text, nullable=False)
    restrictions = Column(JSON, default=dict)
    destruction_required_by = Column(Date, nullable=True)
    signed_at = Column(DateTime(timezone=True), nullable=True)
    data_delivered_at = Column(DateTime(timezone=True), nullable=True)
    delivery_confirmed = Column(Boolean, default=False)
    destruction_confirmed = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
