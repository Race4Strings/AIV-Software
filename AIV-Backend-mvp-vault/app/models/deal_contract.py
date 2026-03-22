from sqlalchemy import Column, String, Integer, Boolean, DateTime, ForeignKey, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
import uuid
from ..database import Base


class DealContract(Base):
    __tablename__ = "deal_contracts"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    deal_id = Column(UUID(as_uuid=True), ForeignKey("deals.id"), nullable=False, index=True)
    version = Column(Integer, nullable=False, default=1)
    contract_url = Column(Text, nullable=False)
    signed_by_talent_at = Column(DateTime(timezone=True), nullable=True)
    signed_by_client_at = Column(DateTime(timezone=True), nullable=True)
    esignature_ref = Column(Text, nullable=True)
    is_amendment = Column(Boolean, default=False)
    parent_contract_id = Column(UUID(as_uuid=True), ForeignKey("deal_contracts.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    deal = relationship("Deal", back_populates="contracts")
