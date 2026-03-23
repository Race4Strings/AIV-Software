from sqlalchemy import Column, String, Text, Boolean, DateTime, ForeignKey, Enum, func, Integer
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
import uuid
import enum

from ..database import Base


class CloneStatus(str, enum.Enum):
    """Clone processing status."""
    DRAFT = "draft"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


class Clone(Base):
    """Clone model for AI digital twins."""
    
    __tablename__ = "clone_table"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    owner_id = Column(UUID(as_uuid=True), ForeignKey("user_table.id"), nullable=True, index=True)
    name = Column(String(255), nullable=False, index=True)
    description = Column(Text, nullable=True)
    avatar_url = Column(Text, nullable=True)
    system_prompt = Column(Text, nullable=True)
    personality = Column(JSONB, nullable=True)  # { traits, speaking_style, quirks, knowledge_areas }
    background = Column(Text, nullable=True)
    status = Column(Enum(CloneStatus), default=CloneStatus.DRAFT, nullable=False)
    
    # Data collected during cloning portal
    voice_data = Column(JSONB, nullable=True)  # { sampleUrl: string, transcription: string }
    image_data = Column(JSONB, nullable=True)  # { frontal: string, profile: string, body: string }
    narrative_data = Column(JSONB, nullable=True)  # { q1: string, ... q10: string }
    knowledge_files = Column(JSONB, nullable=True)  # [{ filename, url, type }]
    
    # ElevenLabs voice clone ID
    elevenlabs_voice_id = Column(String(255), nullable=True)
    
    # Intro audio URL (generated TTS with cloned voice)
    intro_audio_url = Column(Text, nullable=True)
    
    # AI-generated avatar URLs
    avatar_profile_url = Column(Text, nullable=True)  # Polished portrait
    avatar_icon_url = Column(Text, nullable=True)     # Cartoon icon
    
    # Privacy settings
    is_public = Column(Boolean, default=False, nullable=False)
    
    # Processing step tracker (1=voice, 2=avatar, 3=personality, 4=finalize)
    processing_step = Column(Integer, nullable=True)
    
    # Simplified onboarding: 1 question → AI expands to 10 dimensions
    raw_input = Column(Text, nullable=True)  # Original single paragraph from user
    dimensions = Column(JSONB, nullable=True)  # 10 extracted dimensions
    dimensions_version = Column(Integer, default=1)  # Increments on each update
    last_trained_at = Column(DateTime(timezone=True), nullable=True)  # Last training session
    
    # 3-Step Onboarding: Combined voice + personality from video
    onboard_video_url = Column(Text, nullable=True)  # Original video/audio file
    onboard_transcription = Column(Text, nullable=True)  # Gemini transcription
    onboard_completed_at = Column(DateTime(timezone=True), nullable=True)
    rights_data = Column(JSONB, nullable=True)  # User consent and privacy settings
    
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    
    # Relationships
    owner = relationship("User", back_populates="clones")
    
    def __repr__(self):
        return f"<Clone {self.name} status={self.status}>"
    
    @property
    def is_portal_complete(self) -> bool:
        """Check if all portal stages are complete."""
        return (
            self.voice_data is not None
            and self.narrative_data is not None
            and self.image_data is not None
            and self.status == CloneStatus.COMPLETED
        )
