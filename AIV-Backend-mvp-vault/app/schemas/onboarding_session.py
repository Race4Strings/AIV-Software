from pydantic import BaseModel
from typing import Optional, List
from uuid import UUID
from datetime import datetime


# ============== Request Schemas ==============

class OnboardingStart(BaseModel):
    """Schema for starting a new onboarding session."""
    pass  # No input needed — session starts fresh for the authenticated user


class OnboardingStepSubmit(BaseModel):
    """Schema for submitting a step in the onboarding flow."""
    step: int  # Which step is being submitted (1-6)
    response: Optional[dict] = None  # Structured answer for the step
    voice_sample_url: Optional[str] = None  # URL of recorded voice sample (Q4-Q6)

    class Config:
        json_schema_extra = {
            "example": {
                "step": 1,
                "response": {
                    "name": "John Doe",
                    "category": "musician",
                    "social_handles": {"instagram": "@johndoe"},
                },
            }
        }


# ============== Response Schemas ==============

class OnboardingSessionResponse(BaseModel):
    """Response schema for an onboarding session."""
    id: UUID
    twin_id: Optional[UUID] = None
    user_id: UUID
    status: str  # in_progress, completed, abandoned
    current_step: int
    research_data: Optional[dict] = None
    conversation_history: Optional[List[dict]] = None
    voice_sample_urls: Optional[List[str]] = None
    user_responses: Optional[dict] = None
    started_at: datetime
    completed_at: Optional[datetime] = None

    class Config:
        from_attributes = True
