from pydantic import BaseModel, Field
from typing import Optional, List
from uuid import UUID
from datetime import datetime


# ============== Request Schemas ==============

class DealCreate(BaseModel):
    """Schema for creating a new deal."""
    brand_name: str = Field(..., min_length=1, max_length=255)
    deal_type: Optional[str] = Field(None, max_length=100)  # licensing, endorsement, etc.
    value: Optional[float] = None
    currency: str = Field(default="USD", max_length=10)
    terms_summary: Optional[str] = None
    notes: Optional[str] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    document_ids: Optional[List[str]] = None  # References to Document IDs

    class Config:
        json_schema_extra = {
            "example": {
                "brand_name": "Nike",
                "deal_type": "endorsement",
                "value": 50000.00,
                "currency": "USD",
                "terms_summary": "6-month social media endorsement deal",
            }
        }


class DealUpdate(BaseModel):
    """Schema for updating a deal. All fields optional."""
    brand_name: Optional[str] = Field(None, max_length=255)
    deal_type: Optional[str] = Field(None, max_length=100)
    value: Optional[float] = None
    currency: Optional[str] = Field(None, max_length=10)
    status: Optional[str] = None  # draft, negotiation, contract_sent, active, completed, expired
    terms_summary: Optional[str] = None
    notes: Optional[str] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    document_ids: Optional[List[str]] = None


# ============== Response Schemas ==============

class DealResponse(BaseModel):
    """Response schema for a deal."""
    id: UUID
    twin_id: UUID
    brand_name: str
    deal_type: Optional[str] = None
    value: Optional[float] = None
    currency: str
    status: str
    terms_summary: Optional[str] = None
    notes: Optional[str] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    document_ids: Optional[List[str]] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
