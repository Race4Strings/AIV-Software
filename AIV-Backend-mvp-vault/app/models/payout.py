from sqlalchemy import Column, String, DateTime, ForeignKey, Numeric, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
import uuid
from ..database import Base


class Payout(Base):
    __tablename__ = "payouts"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organization_table.id"), nullable=False)
    deal_id = Column(UUID(as_uuid=True), ForeignKey("deals.id", ondelete="RESTRICT"), nullable=False)
    gross_amount = Column(Numeric, nullable=False)
    commission_amount = Column(Numeric, nullable=False)
    net_amount = Column(Numeric, nullable=False)
    status = Column(String(50), default="PENDING")  # PENDING|PROCESSING|COMPLETED|FAILED
    processed_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    deal = relationship("Deal")
