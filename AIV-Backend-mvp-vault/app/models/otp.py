from sqlalchemy import Column, String, DateTime, ForeignKey, Enum, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
import uuid
import enum

from ..database import Base


class OTPType(str, enum.Enum):
    """Types of OTP usage."""
    EMAIL_VERIFICATION = "email_verification"
    PASSWORD_RESET = "password_reset"


class OTP(Base):
    """OTP model for email verification and password reset."""
    
    __tablename__ = "otp_table"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("user_table.id"), nullable=False, index=True)
    otp = Column(String(6), nullable=False)
    otp_type = Column(Enum(OTPType), nullable=False, default=OTPType.EMAIL_VERIFICATION)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=False, index=True)
    
    # Relationships
    user = relationship("User", back_populates="otps")
    
    def __repr__(self):
        return f"<OTP user={self.user_id} type={self.otp_type}>"
