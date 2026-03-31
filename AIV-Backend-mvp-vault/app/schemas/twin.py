from pydantic import BaseModel, Field
from typing import Optional, List
from uuid import UUID
from datetime import datetime


# ============== Request Schemas ==============

class TwinCreate(BaseModel):
    """Schema for creating a new digital twin (slim — no ALCM data)."""
    name: str = Field(..., min_length=1, max_length=255, description="Display name")
    public_name: Optional[str] = Field(None, max_length=255)
    category: Optional[str] = Field(None, max_length=50, description="Identity category")
    bio: Optional[str] = None

    class Config:
        json_schema_extra = {
            "example": {
                "name": "John Doe",
                "public_name": "JD Official",
                "category": "ENTERTAINMENT",
                "bio": "Grammy-winning artist and producer",
            }
        }


class TwinUpdate(BaseModel):
    """Schema for updating platform-level twin fields. No ALCM data here."""
    display_name: Optional[str] = Field(None, max_length=255)
    public_name: Optional[str] = Field(None, max_length=255)
    bio: Optional[str] = None
    identity_category: Optional[List[str]] = Field(None, max_length=3)


# ============== Response Schemas ==============

class TwinResponse(BaseModel):
    """Full twin response. No ALCM data, voice_id, or internal scores exposed."""
    id: UUID
    talent_user_id: Optional[UUID] = None
    organization_id: Optional[UUID] = None
    alcm_twin_id: Optional[UUID] = None
    display_name: Optional[str] = None
    public_name: Optional[str] = None
    bio: Optional[str] = None
    identity_category: Optional[List[str]] = None
    clone_type: Optional[str] = None
    status: str
    health_status: Optional[str] = None
    talent_authorization_at: Optional[datetime] = None
    certified_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class TwinListResponse(BaseModel):
    """Compact twin for list views."""
    id: UUID
    display_name: Optional[str] = None
    public_name: Optional[str] = None
    identity_category: Optional[List[str]] = None
    status: str
    health_status: Optional[str] = None
    talent_authorization_at: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True


class TwinHealthResponse(BaseModel):
    """Health data from ALCM API."""
    twin_id: UUID
    cfs: float = 0.0
    psychographic_coverage: float = 0.0
    personality_confidence: float = 0.0
    health_status: str = "BUILDING"
