from sqlalchemy import Column, String, DateTime, Date, ForeignKey, Numeric, func
from sqlalchemy.dialects.postgresql import UUID
import uuid
from ..database import Base


class UsageMeter(Base):
    __tablename__ = "usage_meters"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organization_table.id"), nullable=False)
    twin_id = Column(UUID(as_uuid=True), ForeignKey("twins.id"), nullable=True)
    usage_type = Column(String(50), nullable=False)  # TWIN_INTERACTION|STORAGE_GB|API_CALL|CROSS_PLATFORM_SESSION
    quantity = Column(Numeric, nullable=False)
    unit_rate = Column(Numeric, nullable=False)
    period_start = Column(Date, nullable=False)
    period_end = Column(Date, nullable=False)
    invoice_id = Column(UUID(as_uuid=True), ForeignKey("invoices.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
