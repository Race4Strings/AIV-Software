"""
ElevenLabs Voice Cloning Service

Integrates with ElevenLabs API for:
- Instant voice cloning from audio samples
- Text-to-speech generation with cloned voices
"""

import httpx
from typing import Optional
from io import BytesIO
from functools import lru_cache

from ..config import get_settings


class ElevenLabsService:
    """Service for ElevenLabs voice cloning API."""
    
    BASE_URL = "https://api.elevenlabs.io/v1"
    
    def __init__(self):
        settings = get_settings()
        self.api_key = settings.elevenlabs_api_key
        
        if not self.api_key:
            print("⚠️ ELEVENLABS_API_KEY not configured. Voice cloning will be disabled.")
    
    @property
    def headers(self) -> dict:
        return {
            "xi-api-key": self.api_key,
        }
    
    @property
    def is_configured(self) -> bool:
        """Check if ElevenLabs API is configured."""
        return bool(self.api_key)
    
    async def create_voice_clone(
        self,
        name: str,
        audio_data: bytes,
        description: Optional[str] = None,
        audio_format: str = "wav"
    ) -> Optional[str]:
        """
        Create a voice clone from audio data.
        
        Args:
            name: Name for the cloned voice
            audio_data: Audio file bytes (mp3, wav, webm, etc.)
            description: Optional description for the voice
            audio_format: Audio format (wav, mp3, webm) - defaults to wav
        
        Returns:
            voice_id: The ElevenLabs voice ID, or None if failed
        """
        if not self.is_configured:
            print("⚠️ ElevenLabs not configured, skipping voice clone creation")
            return None
        
        # Map format to MIME type
        mime_types = {
            "wav": "audio/wav",
            "mp3": "audio/mpeg",
            "webm": "audio/webm",
            "ogg": "audio/ogg",
            "flac": "audio/flac",
        }
        mime_type = mime_types.get(audio_format.lower(), "audio/wav")
        
        print(f"🎤 Creating voice clone '{name}' with {audio_format} format ({len(audio_data)} bytes)")
        
        try:
            async with httpx.AsyncClient(timeout=120.0) as client:  # Increased timeout for large files
                # Prepare the multipart form data
                files = {
                    "files": (f"voice_sample.{audio_format}", audio_data, mime_type),
                }
                data = {
                    "name": name,
                }
                if description:
                    data["description"] = description
                
                response = await client.post(
                    f"{self.BASE_URL}/voices/add",
                    headers=self.headers,
                    files=files,
                    data=data,
                )
                
                if response.status_code == 200:
                    result = response.json()
                    voice_id = result.get("voice_id")
                    print(f"✅ Created ElevenLabs voice clone: {voice_id}")
                    return voice_id
                else:
                    print(f"❌ ElevenLabs API error: {response.status_code} - {response.text[:300]}")
                    return None
                    
        except Exception as e:
            print(f"❌ Failed to create voice clone: {e}")
            return None
    
    async def create_voice_clone_from_url(
        self,
        name: str,
        audio_url: str,
        description: Optional[str] = None
    ) -> Optional[str]:
        """
        Create a voice clone from an audio URL (e.g., S3/MinIO URL).
        
        Args:
            name: Name for the cloned voice
            audio_url: URL to the audio file
            description: Optional description for the voice
        
        Returns:
            voice_id: The ElevenLabs voice ID, or None if failed
        """
        if not self.is_configured:
            print("⚠️ ElevenLabs not configured, skipping voice clone creation")
            return None
        
        try:
            # Download audio from URL
            async with httpx.AsyncClient(timeout=30.0) as client:
                audio_response = await client.get(audio_url)
                if audio_response.status_code != 200:
                    print(f"❌ Failed to download audio from {audio_url}")
                    return None
                
                audio_data = audio_response.content
            
            # Create voice clone
            return await self.create_voice_clone(name, audio_data, description)
            
        except Exception as e:
            print(f"❌ Failed to create voice clone from URL: {e}")
            return None
    
    async def text_to_speech(
        self,
        voice_id: str,
        text: str,
        model_id: str = "eleven_multilingual_v2",  # Best quality model
        stability: float = 0.45,  # Slightly lower for more natural variation
        similarity_boost: float = 0.90,  # Higher for closer voice matching
        style: float = 0.20,  # Style exaggeration for more authentic patterns
    ) -> Optional[bytes]:
        """
        Generate speech from text using a cloned voice.
        
        Args:
            voice_id: The ElevenLabs voice ID
            text: Text to convert to speech
            model_id: TTS model to use (eleven_multilingual_v2 is highest quality)
            stability: Voice stability (0.0-1.0, lower = more expressive)
            similarity_boost: How closely to match original voice (0.0-1.0)
            style: Style exaggeration for speech patterns (0.0-1.0)
        
        Returns:
            Audio bytes (mp3 format), or None if failed
        """
        if not self.is_configured:
            return None
        
        try:
            async with httpx.AsyncClient(timeout=120.0) as client:
                response = await client.post(
                    f"{self.BASE_URL}/text-to-speech/{voice_id}",
                    headers={
                        **self.headers,
                        "Content-Type": "application/json",
                    },
                    json={
                        "text": text,
                        "model_id": model_id,
                        "voice_settings": {
                            "stability": stability,
                            "similarity_boost": similarity_boost,
                            "style": style,
                            "use_speaker_boost": True,  # Enhances similarity to original
                        }
                    },
                )
                
                if response.status_code == 200:
                    return response.content
                else:
                    print(f"❌ TTS error: {response.status_code} - {response.text[:200]}")
                    return None
                    
        except Exception as e:
            print(f"❌ TTS failed: {e}")
            return None
    
    async def delete_voice(self, voice_id: str) -> bool:
        """
        Delete a cloned voice from ElevenLabs.
        
        Args:
            voice_id: The ElevenLabs voice ID to delete
        
        Returns:
            True if deleted successfully
        """
        if not self.is_configured or not voice_id:
            return False
        
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.delete(
                    f"{self.BASE_URL}/voices/{voice_id}",
                    headers=self.headers,
                )
                
                if response.status_code == 200:
                    print(f"✅ Deleted ElevenLabs voice: {voice_id}")
                    return True
                else:
                    print(f"❌ Failed to delete voice: {response.status_code}")
                    return False
                    
        except Exception as e:
            print(f"❌ Failed to delete voice: {e}")
            return False
    
    async def get_voice_info(self, voice_id: str) -> Optional[dict]:
        """Get information about a voice."""
        if not self.is_configured or not voice_id:
            return None
        
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.get(
                    f"{self.BASE_URL}/voices/{voice_id}",
                    headers=self.headers,
                )
                
                if response.status_code == 200:
                    return response.json()
                return None
                
        except Exception:
            return None


@lru_cache()
def get_elevenlabs_service() -> ElevenLabsService:
    """Get cached ElevenLabs service instance."""
    return ElevenLabsService()
