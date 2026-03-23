"""
Contact model for managing user's contact list.
"""
from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey, func, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
import uuid

from ..database import Base


class Contact(Base):
    """A contact in user's contact list - can be a clone or real person."""
    
    __tablename__ = "contact_table"
    __table_args__ = (
        UniqueConstraint('owner_id', 'contact_user_id', name='uq_contact_user'),
        UniqueConstraint('owner_id', 'contact_clone_id', name='uq_contact_clone'),
    )
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    owner_id = Column(UUID(as_uuid=True), ForeignKey("user_table.id"), nullable=False, index=True)
    
    # Either a user or a clone (one must be set)
    contact_user_id = Column(UUID(as_uuid=True), ForeignKey("user_table.id"), nullable=True, index=True)
    contact_clone_id = Column(UUID(as_uuid=True), ForeignKey("clone_table.id"), nullable=True, index=True)
    
    nickname = Column(String(100), nullable=True)  # Custom display name
    is_favorite = Column(Boolean, default=False)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    
    # Relationships
    owner = relationship("User", foreign_keys=[owner_id], backref="contacts")
    contact_user = relationship("User", foreign_keys=[contact_user_id])
    contact_clone = relationship("Clone", backref="contacts")
    
    def __repr__(self):
        target = f"user={self.contact_user_id}" if self.contact_user_id else f"clone={self.contact_clone_id}"
        return f"<Contact {self.id} {target}>"
