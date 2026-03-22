from sqlalchemy import Column, DateTime, ForeignKey, Text, func
from sqlalchemy.dialects.postgresql import UUID
import uuid
from ..database import Base


class ProductionPartnerDisclosure(Base):
    __tablename__ = "production_partner_disclosures"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    deal_id = Column(UUID(as_uuid=True), ForeignKey("deals.id"), nullable=False)
    rda_id = Column(UUID(as_uuid=True), ForeignKey("reference_data_agreements.id"), nullable=True)
    partner_name = Column(Text, nullable=False)
    partner_role = Column(Text, nullable=False)
    partner_contact = Column(Text, nullable=True)
    data_access_scope = Column(Text, nullable=True)
    disclosed_at = Column(DateTime(timezone=True), server_default=func.now())
    approved_by = Column(UUID(as_uuid=True), ForeignKey("user_table.id"), nullable=True)
    revoked_at = Column(DateTime(timezone=True), nullable=True)
