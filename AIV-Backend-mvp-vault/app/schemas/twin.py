from pydantic import BaseModel, Field
from typing import Optional, List
from uuid import UUID
from datetime import datetime


# ============== Request Schemas ==============

class TwinCreate(BaseModel):
    """Schema for creating a new digital twin."""
    name: str = Field(..., min_length=1, max_length=255)
    public_name: Optional[str] = Field(None, max_length=255)
    category: Optional[str] = Field(None, max_length=100)
    bio: Optional[str] = None
    alcm_data: Optional[dict] = None
    commercial_terms: Optional[dict] = None
    governance: Optional[dict] = None

    class Config:
        json_schema_extra = {
            "example": {
                "name": "John Doe",
                "public_name": "JD Official",
                "category": "musician",
                "bio": "Grammy-winning artist and producer",
            }
        }


class TwinUpdate(BaseModel):
    """Schema for updating a twin. All fields optional for partial updates."""
    name: Optional[str] = Field(None, max_length=255)
    public_name: Optional[str] = Field(None, max_length=255)
    category: Optional[str] = Field(None, max_length=100)
    bio: Optional[str] = None
    alcm_data: Optional[dict] = None  # Partial — merged via deep_merge
    commercial_terms: Optional[dict] = None
    governance: Optional[dict] = None


# ============== Response Schemas ==============

class TwinResponse(BaseModel):
    """Response schema for a twin.
    
    CRITICAL: voice_id is intentionally EXCLUDED — it is proprietary ALCM IP.
    """
    id: UUID
    user_id: UUID
    name: str
    public_name: Optional[str] = None
    category: Optional[str] = None
    bio: Optional[str] = None
    alcm_data: Optional[dict] = None
    voice_status: str
    voice_sample_url: Optional[str] = None
    commercial_terms: Optional[dict] = None
    governance: Optional[dict] = None
    status: str
    completeness_score: float
    version: str
    certified_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class TwinListResponse(BaseModel):
    """Response schema for listing twins."""
    id: UUID
    name: str
    public_name: Optional[str] = None
    category: Optional[str] = None
    status: str
    completeness_score: float
    version: str
    certified_at: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True


class TwinCompletenessResponse(BaseModel):
    """Response for twin completeness check."""
    twin_id: UUID
    completeness_score: float
    missing_sections: List[str] = []
