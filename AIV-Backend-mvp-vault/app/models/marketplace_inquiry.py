"""Marketplace inquiry — Stage 3 placeholder."""
from sqlalchemy import Column, String, DateTime, ForeignKey, Text, func
from sqlalchemy.dialects.postgresql import UUID
import uuid
from ..database import Base


class MarketplaceInquiry(Base):
    __tablename__ = "marketplace_inquiries"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    listing_id = Column(UUID(as_uuid=True), ForeignKey("marketplace_listings.id"), nullable=True)
    client_organization_id = Column(UUID(as_uuid=True), ForeignKey("organization_table.id"), nullable=False)
    use_case = Column(Text, nullable=False)
    territory = Column(Text, nullable=True)
    budget_range = Column(Text, nullable=True)
    message = Column(Text, nullable=True)
    status = Column(String(50), default="NEW")  # NEW|RESPONDED|CONVERTED_TO_DEAL|DECLINED
    converted_deal_id = Column(UUID(as_uuid=True), ForeignKey("deals.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
