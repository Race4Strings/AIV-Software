from pydantic import BaseModel, Field
from typing import Optional, Dict, List, Any
from uuid import UUID
from datetime import datetime
from enum import Enum


class CloneStatusEnum(str, Enum):
    DRAFT = "draft"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


# ============== Request Schemas ==============

class CloneCreate(BaseModel):
    """Schema for creating a new clone."""
    name: str = Field(..., min_length=2, max_length=255)
    description: Optional[str] = None


class CloneUpdate(BaseModel):
    """Schema for updating clone metadata."""
    name: Optional[str] = Field(None, min_length=2, max_length=255)
    description: Optional[str] = None
    avatar_url: Optional[str] = None


class VoiceDataUpdate(BaseModel):
    """Schema for updating voice data (Stage 1)."""
    sample_url: str
    duration: Optional[int] = None
    transcription: Optional[str] = None


class NarrativeDataUpdate(BaseModel):
    """Schema for updating narrative answers (Stage 2).
    
    Contains answers to the personality questions.
    """
    answers: Dict[str, str] = Field(..., description="Dictionary of question_id: answer pairs")


class KnowledgeFileData(BaseModel):
    """Schema for a knowledge file."""
    filename: str
    url: str
    file_type: str
    size_bytes: Optional[int] = None


class KnowledgeDataUpdate(BaseModel):
    """Schema for updating knowledge files (Stage 3)."""
    files: List[KnowledgeFileData]


class ImageDataUpdate(BaseModel):
    """Schema for updating image data (Stage 4)."""
    frontal: Optional[str] = Field(None, description="URL to frontal portrait")
    profile: Optional[str] = Field(None, description="URL to profile angle photo")
    body: Optional[str] = Field(None, description="URL to full body photo")


class RightsUpdate(BaseModel):
    """Schema for updating privacy rights (Stage 5)."""
    is_public: bool = False
    allow_training: bool = False


class RawInputUpdate(BaseModel):
    """Schema for simplified single-paragraph onboarding."""
    raw_input: str = Field(..., min_length=50, description="Single paragraph describing yourself")


class DimensionData(BaseModel):
    """Schema for a single dimension."""
    content: str
    source: str = "initial"  # or "training"
    updated_at: str


class DimensionsResponse(BaseModel):
    """Response for clone dimensions."""
    version: int
    last_updated: Optional[datetime] = None
    dimensions: Dict[str, DimensionData]


class DimensionUpdate(BaseModel):
    """Schema for updating a single dimension."""
    content: str = Field(..., min_length=10)


# ============== Response Schemas ==============

class CloneResponse(BaseModel):
    """Full clone data response."""
    id: UUID
    owner_id: Optional[UUID]
    name: str
    description: Optional[str]
    avatar_url: Optional[str]
    status: CloneStatusEnum
    is_public: bool
    
    # Portal data
    voice_data: Optional[Dict[str, Any]]
    image_data: Optional[Dict[str, Any]]
    narrative_data: Optional[Dict[str, Any]]
    knowledge_files: Optional[List[Dict[str, Any]]]
    
    # ElevenLabs voice data
    elevenlabs_voice_id: Optional[str] = None
    intro_audio_url: Optional[str] = None
    
    # AI-generated avatars
    avatar_profile_url: Optional[str] = None
    avatar_icon_url: Optional[str] = None
    
    # Synthesized data (after activation)
    system_prompt: Optional[str]
    personality: Optional[Dict[str, Any]]
    background: Optional[str]
    
    # Simplified onboarding dimensions
    raw_input: Optional[str] = None
    dimensions: Optional[Dict[str, Any]] = None
    dimensions_version: Optional[int] = None
    
    # 3-Step Onboarding
    onboard_video_url: Optional[str] = None
    onboard_transcription: Optional[str] = None
    onboard_completed_at: Optional[datetime] = None
    
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class CloneStatusResponse(BaseModel):
    """Response for checking portal completion status."""
    has_clone: bool
    clone_id: Optional[UUID]
    status: Optional[CloneStatusEnum]
    is_portal_complete: bool
    
    # Stage completion flags
    voice_complete: bool = False
    personality_complete: bool = False
    knowledge_complete: bool = False
    visual_complete: bool = False
    rights_complete: bool = False
    activated: bool = False
