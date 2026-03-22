from sqlalchemy import Column, String, DateTime, ForeignKey, Text, func
from sqlalchemy.dialects.postgresql import UUID
import uuid
from ..database import Base


class TwinLock(Base):
    __tablename__ = "twin_locks"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    twin_id = Column(UUID(as_uuid=True), ForeignKey("twins.id"), nullable=False)
    lock_scope = Column(String(20), nullable=False)  # TWIN|ACCOUNT
    trigger_type = Column(String(50), nullable=False)  # BREACH|LEGAL_DISPUTE|MISUSE|TALENT_REQUEST|NON_PAYMENT|SUCCESSION_EVENT
    triggered_by = Column(UUID(as_uuid=True), ForeignKey("user_table.id"), nullable=False)
    reason = Column(Text, nullable=False)
    locked_at = Column(DateTime(timezone=True), server_default=func.now())
    reinstated_at = Column(DateTime(timezone=True), nullable=True)
    reinstated_by = Column(UUID(as_uuid=True), ForeignKey("user_table.id"), nullable=True)
    reinstatement_reason = Column(Text, nullable=True)
