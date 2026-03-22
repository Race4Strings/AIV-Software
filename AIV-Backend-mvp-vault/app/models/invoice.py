from sqlalchemy import Column, String, DateTime, Date, ForeignKey, Numeric, func
from sqlalchemy.dialects.postgresql import UUID
import uuid
from ..database import Base


class Invoice(Base):
    __tablename__ = "invoices"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organization_table.id"), nullable=False)
    type = Column(String(50), nullable=False)  # PLATFORM_FEE|COMMISSION|USAGE
    amount = Column(Numeric, nullable=False)
    currency = Column(String(3), default="USD")
    deal_id = Column(UUID(as_uuid=True), ForeignKey("deals.id"), nullable=True)
    period_start = Column(Date, nullable=True)
    period_end = Column(Date, nullable=True)
    status = Column(String(50), default="PENDING")  # PENDING|PAID|OVERDUE|CANCELLED
    due_date = Column(Date, nullable=False)
    paid_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
