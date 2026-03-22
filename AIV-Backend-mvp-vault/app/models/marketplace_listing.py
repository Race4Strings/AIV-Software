"""Marketplace listing — Stage 3 placeholder. Schema created now, build later."""
from sqlalchemy import Column, Boolean, DateTime, ForeignKey, Text, func
from sqlalchemy.dialects.postgresql import UUID, JSON, ARRAY
import uuid
from ..database import Base


class MarketplaceListing(Base):
    __tablename__ = "marketplace_listings"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    twin_id = Column(UUID(as_uuid=True), ForeignKey("twins.id"), nullable=False, unique=True)
    visible = Column(Boolean, default=False)
    headline = Column(Text, nullable=True)
    description = Column(Text, nullable=True)
    category_tags = Column(ARRAY(Text), default=list)
    available_use_cases = Column(ARRAY(Text), default=list)
    available_territories = Column(ARRAY(Text), default=list)
    pricing_guidance = Column(JSON, nullable=True)
    featured = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
