"""
Onboard Router - 3-Step Combined Voice + Personality + Rights

Provides a streamlined onboarding flow:
1. User records video introducing themselves
2. Backend extracts frames, audio, and processes everything async
3. User can poll status to check progress
"""

from datetime import datetime, timezone
from uuid import UUID
from typing import Optional
import asyncio
import subprocess
import tempfile
import os
from io import BytesIO

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, BackgroundTasks, Form
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel

from ..database import get_db, async_session_maker
from ..models.clone import Clone, CloneStatus
from ..middleware.auth_middleware import require_auth
from ..services.gemini_service import get_gemini_service
from ..services.elevenlabs_service import get_elevenlabs_service
from ..services.storage_service import get_storage_service
from ..services.synthesis_service import get_synthesis_service

router = APIRouter(prefix="/clone", tags=["onboard"])


# ============== Schemas ==============

class OnboardResponse(BaseModel):
    """Response after onboard submission"""
    status: str  # "processing"
    message: str
    clone_id: str


class OnboardStatusResponse(BaseModel):
    """Detailed status of onboard processing"""
    clone_id: str
    overall_status: str  # "processing", "complete", "failed"
    
    # Individual step statuses
    video_saved: bool = False
    frames_extracted: bool = False
    audio_extracted: bool = False
    transcription_complete: bool = False
    dimensions_extracted: bool = False
    voice_cloned: bool = False
    avatar_generated: bool = False
    personality_synthesized: bool = False
    
    # Data when complete
    transcription: Optional[str] = None
    dimensions: Optional[dict] = None
    voice_id: Optional[str] = None
    avatar_url: Optional[str] = None
    
    # Timestamps
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    
    # Error info
    error: Optional[str] = None


# ============== Helper Functions ==============

def get_video_format(filename: str) -> str:
    """Determine video format from filename."""
    ext = filename.lower().split('.')[-1] if '.' in filename else 'webm'
    return ext


async def extract_audio_from_video(video_bytes: bytes, video_format: str) -> Optional[bytes]:
    """Extract audio track from video using ffmpeg."""
    try:
        with tempfile.NamedTemporaryFile(suffix=f'.{video_format}', delete=False) as video_file:
            video_file.write(video_bytes)
            video_path = video_file.name
        
        audio_path = video_path.replace(f'.{video_format}', '.wav')
        
        # Extract audio with ffmpeg
        result = subprocess.run([
            'ffmpeg', '-i', video_path,
            '-vn',  # No video
            '-acodec', 'pcm_s16le',  # PCM audio
            '-ar', '16000',  # 16kHz sample rate
            '-ac', '1',  # Mono
            '-y',  # Overwrite
            audio_path
        ], capture_output=True, timeout=60)
        
        if result.returncode == 0 and os.path.exists(audio_path):
            with open(audio_path, 'rb') as f:
                audio_bytes = f.read()
            os.unlink(audio_path)
            os.unlink(video_path)
            print(f"✅ Extracted audio: {len(audio_bytes)} bytes")
            return audio_bytes
        else:
            print(f"❌ FFmpeg error: {result.stderr.decode()[:200]}")
            os.unlink(video_path)
            return None
            
    except Exception as e:
        print(f"❌ Audio extraction failed: {e}")
        return None


async def extract_frames_from_video(video_bytes: bytes, video_format: str, num_frames: int = 3) -> list[bytes]:
    """Extract frames from video at different timestamps."""
    frames = []
    try:
        with tempfile.NamedTemporaryFile(suffix=f'.{video_format}', delete=False) as video_file:
            video_file.write(video_bytes)
            video_path = video_file.name
        
        # Get video duration first
        probe_result = subprocess.run([
            'ffprobe', '-v', 'error',
            '-show_entries', 'format=duration',
            '-of', 'default=noprint_wrappers=1:nokey=1',
            video_path
        ], capture_output=True, timeout=30)
        
        duration_str = probe_result.stdout.decode().strip()
        # Handle 'N/A' or empty output from ffprobe
        try:
            duration = float(duration_str) if duration_str and duration_str != 'N/A' else 10.0
        except ValueError:
            duration = 10.0  # Default to 10 seconds if we can't parse duration
        
        # Extract frames at 25%, 50%, 75% of video
        timestamps = [duration * 0.25, duration * 0.50, duration * 0.75]
        
        for i, ts in enumerate(timestamps):
            frame_path = f"{video_path}_frame_{i}.jpg"
            
            result = subprocess.run([
                'ffmpeg', '-ss', str(ts),
                '-i', video_path,
                '-vframes', '1',
                '-q:v', '2',
                '-y',
                frame_path
            ], capture_output=True, timeout=30)
            
            if result.returncode == 0 and os.path.exists(frame_path):
                with open(frame_path, 'rb') as f:
                    frames.append(f.read())
                os.unlink(frame_path)
        
        os.unlink(video_path)
        print(f"✅ Extracted {len(frames)} frames")
        return frames
        
    except Exception as e:
        print(f"❌ Frame extraction failed: {e}")
        return frames


async def process_onboard_async(
    clone_id: UUID,
    video_bytes: bytes,
    video_format: str,
    is_public: bool,
    allow_ai_learning: bool,
    allow_audio_clone: bool,
):
    """
    Background task to process onboard video.
    
    Steps:
    1. Save video to storage
    2. Extract 3 frames from video
    3. Extract audio from video
    4. Transcribe audio with Gemini
    5. Expand to 10 dimensions with Gemini
    6. Clone voice with ElevenLabs
    7. Generate avatar from best frame
    8. Synthesize personality
    """
    async with async_session_maker() as db:
        try:
            # Get clone
            result = await db.execute(select(Clone).where(Clone.id == clone_id))
            clone = result.scalar_one_or_none()
            if not clone:
                print(f"❌ Clone {clone_id} not found")
                return
            
            user_id = str(clone.owner_id)
            gemini = get_gemini_service()
            elevenlabs = get_elevenlabs_service()
            storage = get_storage_service()
            synthesis = get_synthesis_service()
            
            # Initialize processing status
            processing_status = {
                "video_saved": False,
                "frames_extracted": False,
                "audio_extracted": False,
                "transcription_complete": False,
                "dimensions_extracted": False,
                "voice_cloned": False,
                "avatar_generated": False,
                "personality_synthesized": False,
                "error": None
            }
            
            # Step 1: Save video to storage
            try:
                upload_result = storage.upload_file(
                    file=BytesIO(video_bytes),
                    filename=f"onboard_video.{video_format}",
                    content_type=f"video/{video_format}",
                    folder=f"onboard/{user_id}",
                    user_id=user_id
                )
                video_url = upload_result["url"]
                clone.onboard_video_url = video_url
                processing_status["video_saved"] = True
                await db.commit()
                print(f"✅ Video saved: {video_url[:50]}...")
            except Exception as e:
                print(f"⚠️ Video upload failed: {e}")
                # Continue anyway, we have the bytes
            
            # Step 2 & 3: Extract frames and audio in parallel
            frames_task = extract_frames_from_video(video_bytes, video_format, 3)
            audio_task = extract_audio_from_video(video_bytes, video_format)
            
            frames, audio_bytes = await asyncio.gather(frames_task, audio_task)
            
            if frames:
                processing_status["frames_extracted"] = True
                # Save frames to storage
                frame_urls = []
                for i, frame_bytes in enumerate(frames):
                    try:
                        upload_result = storage.upload_file(
                            file=BytesIO(frame_bytes),
                            filename=f"onboard_frame_{i}.jpg",
                            content_type="image/jpeg",
                            folder=f"frames/{user_id}",
                            user_id=user_id
                        )
                        frame_urls.append(upload_result["url"])
                    except Exception as e:
                        print(f"⚠️ Frame {i} upload failed: {e}")
                
                # Store frame URLs
                if frame_urls:
                    clone.image_data = {
                        "source": "onboard",
                        "frames": frame_urls,
                        "extracted_at": datetime.now(timezone.utc).isoformat()
                    }
                    await db.commit()
            
            if audio_bytes:
                processing_status["audio_extracted"] = True
            else:
                processing_status["error"] = "Failed to extract audio"
                await db.commit()
                return
            
            # Step 4 & 5: Transcribe and extract dimensions with Gemini
            # Step 6: Clone voice with ElevenLabs (parallel)
            transcribe_task = gemini.transcribe_and_extract_dimensions(audio_bytes, "wav")
            voice_task = elevenlabs.create_voice_clone(name=f"{clone.name}'s Voice", audio_data=audio_bytes, audio_format="wav")
            
            results = await asyncio.gather(
                transcribe_task,
                voice_task,
                return_exceptions=True
            )
            
            # Process transcription result
            transcription_result = results[0]
            if isinstance(transcription_result, Exception):
                print(f"❌ Transcription failed: {transcription_result}")
                transcription_result = {"transcription": "", "dimensions": {}}
            else:
                processing_status["transcription_complete"] = True
            
            transcription = transcription_result.get("transcription", "")
            dimensions_raw = transcription_result.get("dimensions", {})
            
            # Define now for use in both dimensions and voice_data
            now = datetime.now(timezone.utc).isoformat()
            
            if dimensions_raw:
                processing_status["dimensions_extracted"] = True
                
                # Format dimensions with metadata
                dimensions = {}
                for key, content in dimensions_raw.items():
                    dimensions[key] = {
                        "content": content if isinstance(content, str) else str(content),
                        "source": "onboard",
                        "updated_at": now
                    }
                
                clone.dimensions = dimensions
                clone.dimensions_version = 1
            
            clone.onboard_transcription = transcription
            clone.raw_input = transcription
            
            # Process voice clone result
            voice_id = results[1]
            if isinstance(voice_id, Exception):
                print(f"❌ Voice cloning failed: {voice_id}")
            elif voice_id:
                processing_status["voice_cloned"] = True
                clone.elevenlabs_voice_id = voice_id
                clone.voice_data = {
                    "source": "onboard",
                    "cloned": True,
                    "voice_id": voice_id,
                    "created_at": now
                }
                
                # Generate sample intro audio (wait 10 seconds for voice to be fully processed)
                try:
                    await asyncio.sleep(10)
                    
                    clone_name = clone.name.replace("'s Clone", "").strip()
                    intro_text = (
                        f"Hey there! I'm {clone_name}'s digital clone. "
                        f"I'm here to chat, answer questions, and help out whenever you need me. "
                        f"Think of me as a friendly AI version of {clone_name}. "
                        f"Feel free to ask me anything - I'm always happy to help!"
                    )
                    
                    intro_audio = await elevenlabs.text_to_speech(voice_id=voice_id, text=intro_text)
                    if intro_audio:
                        upload_result = storage.upload_file(
                            file=BytesIO(intro_audio),
                            filename="intro_audio.mp3",
                            content_type="audio/mpeg",
                            folder=f"audio/{user_id}",
                            user_id=user_id
                        )
                        clone.intro_audio_url = upload_result["url"]
                        print(f"✅ Generated intro audio sample")
                except Exception as e:
                    print(f"⚠️ Intro audio generation failed: {e}")
            
            await db.commit()
            
            # Step 7: Generate avatar from best frame (middle one)
            if frames and len(frames) > 1:
                try:
                    best_frame = frames[1]  # Middle frame usually best
                    avatar_bytes = await gemini.generate_avatar(best_frame)
                    if avatar_bytes:
                        upload_result = storage.upload_file(
                            file=BytesIO(avatar_bytes),
                            filename="avatar_profile.png",
                            content_type="image/png",
                            folder=f"avatars/{user_id}",
                            user_id=user_id
                        )
                        clone.avatar_profile_url = upload_result["url"]
                        processing_status["avatar_generated"] = True
                        
                    icon_bytes = await gemini.generate_icon(best_frame)
                    if icon_bytes:
                        upload_result = storage.upload_file(
                            file=BytesIO(icon_bytes),
                            filename="avatar_icon.png",
                            content_type="image/png",
                            folder=f"avatars/{user_id}",
                            user_id=user_id
                        )
                        clone.avatar_icon_url = upload_result["url"]
                        
                    await db.commit()
                except Exception as e:
                    print(f"⚠️ Avatar generation failed: {e}")
            
            # Step 8: Synthesize personality
            if clone.dimensions:
                try:
                    personality_data = await synthesis.synthesize_personality(
                        clone_name=clone.name,
                        dimensions=clone.dimensions
                    )
                    if personality_data:
                        clone.personality = personality_data.get("personality")
                        clone.system_prompt = personality_data.get("system_prompt")
                        clone.background = personality_data.get("background")
                        processing_status["personality_synthesized"] = True
                        await db.commit()
                        print("✅ Personality synthesized")
                except Exception as e:
                    print(f"⚠️ Personality synthesis failed: {e}")
            
            # Apply rights settings
            clone.is_public = is_public
            clone.rights_data = {
                "allow_ai_learning": allow_ai_learning,
                "allow_audio_clone": allow_audio_clone,
                "accepted_at": datetime.now(timezone.utc).isoformat()
            }
            
            # Mark onboarding complete
            clone.onboard_completed_at = datetime.now(timezone.utc)
            clone.status = CloneStatus.COMPLETED
            
            await db.commit()
            print(f"✅ Onboard processing complete for clone {clone_id}")
            
        except Exception as e:
            print(f"❌ Onboard processing failed: {e}")
            import traceback
            traceback.print_exc()
            await db.rollback()


# ============== Endpoints ==============

@router.post("/{clone_id}/onboard", response_model=OnboardResponse)
async def onboard_clone(
    clone_id: UUID,
    background_tasks: BackgroundTasks,
    video: UploadFile = File(..., description="Video file (webm, mp4, mov)"),
    is_public: bool = Form(default=False, description="Make clone publicly visible"),
    allow_ai_learning: bool = Form(default=True, description="Allow AI to learn from interactions"),
    allow_audio_clone: bool = Form(default=True, description="Allow voice cloning"),
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(require_auth)
):
    """
    Combined onboarding from video recording.
    
    User records a video answering: "Tell me everything I need to know about you"
    
    Backend processes (async):
    1. Saves video for future reference
    2. Extracts 3 frames for avatar generation
    3. Extracts audio track
    4. Transcribes audio → 10 personality dimensions
    5. Clones voice with ElevenLabs
    6. Generates avatar from best frame
    7. Synthesizes personality
    8. Applies rights settings
    
    Poll GET /clone/{id}/onboard/status for progress.
    """
    # Verify clone ownership
    result = await db.execute(select(Clone).where(Clone.id == clone_id))
    clone = result.scalar_one_or_none()
    
    if not clone or str(clone.owner_id) != user["id"]:
        raise HTTPException(status_code=404, detail="Clone not found")
    
    # Read video file
    video_bytes = await video.read()
    if len(video_bytes) < 10000:  # Less than 10KB is probably too short
        raise HTTPException(status_code=400, detail="Video file too short")
    
    # Determine format
    video_format = get_video_format(video.filename or "video.webm")
    
    # Mark clone as processing
    clone.status = CloneStatus.PROCESSING
    clone.processing_step = 1
    await db.commit()
    
    # Start background processing
    background_tasks.add_task(
        process_onboard_async,
        clone_id,
        video_bytes,
        video_format,
        is_public,
        allow_ai_learning,
        allow_audio_clone,
    )
    
    return OnboardResponse(
        status="processing",
        message="Processing your video. Check status for progress.",
        clone_id=str(clone_id)
    )


@router.get("/{clone_id}/onboard/status", response_model=OnboardStatusResponse)
async def get_onboard_status(
    clone_id: UUID,
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(require_auth)
):
    """
    Check the status of onboard processing.
    
    Poll this endpoint every 2-3 seconds after calling POST /clone/{id}/onboard.
    """
    result = await db.execute(select(Clone).where(Clone.id == clone_id))
    clone = result.scalar_one_or_none()
    
    if not clone or str(clone.owner_id) != user["id"]:
        raise HTTPException(status_code=404, detail="Clone not found")
    
    # Determine overall status
    if clone.onboard_completed_at:
        overall_status = "complete"
    elif clone.status == CloneStatus.PROCESSING:
        overall_status = "processing"
    elif clone.status == CloneStatus.FAILED:
        overall_status = "failed"
    else:
        overall_status = "pending"
    
    return OnboardStatusResponse(
        clone_id=str(clone_id),
        overall_status=overall_status,
        
        # Step statuses (inferred from data presence)
        video_saved=clone.onboard_video_url is not None,
        frames_extracted=clone.image_data is not None and "frames" in (clone.image_data or {}),
        audio_extracted=clone.onboard_transcription is not None or clone.elevenlabs_voice_id is not None,
        transcription_complete=clone.onboard_transcription is not None and len(clone.onboard_transcription or "") > 0,
        dimensions_extracted=clone.dimensions is not None and len(clone.dimensions or {}) > 0,
        voice_cloned=clone.elevenlabs_voice_id is not None,
        avatar_generated=clone.avatar_profile_url is not None,
        personality_synthesized=clone.personality is not None,
        
        # Data
        transcription=clone.onboard_transcription,
        dimensions=clone.dimensions,
        voice_id=clone.elevenlabs_voice_id,
        avatar_url=clone.avatar_profile_url,
        
        # Timestamps
        started_at=clone.updated_at if clone.status == CloneStatus.PROCESSING else None,
        completed_at=clone.onboard_completed_at,
    )


# Enhancement endpoints (optional, do later)

@router.post("/{clone_id}/enhance/photos")
async def enhance_with_photos(
    clone_id: UUID,
    photos: list[UploadFile] = File(..., description="1-3 photos for better avatar"),
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(require_auth)
):
    """Add photos to improve avatar. Optional enhancement."""
    result = await db.execute(select(Clone).where(Clone.id == clone_id))
    clone = result.scalar_one_or_none()
    
    if not clone or str(clone.owner_id) != user["id"]:
        raise HTTPException(status_code=404, detail="Clone not found")
    
    if len(photos) > 3:
        raise HTTPException(status_code=400, detail="Maximum 3 photos allowed")
    
    storage = get_storage_service()
    gemini = get_gemini_service()
    user_id = str(clone.owner_id)
    
    photo_urls = []
    photo_bytes_list = []
    
    for i, photo in enumerate(photos):
        photo_bytes = await photo.read()
        photo_bytes_list.append(photo_bytes)
        try:
            upload_result = storage.upload_file(
                file=BytesIO(photo_bytes),
                filename=f"enhance_photo_{i}.png",
                content_type="image/png",
                folder=f"photos/{user_id}",
                user_id=user_id
            )
            photo_urls.append(upload_result["url"])
        except Exception as e:
            print(f"⚠️ Photo {i} upload failed: {e}")
    
    # Generate avatar from first photo
    if photo_bytes_list:
        try:
            avatar_bytes = await gemini.generate_avatar(photo_bytes_list[0])
            if avatar_bytes:
                upload_result = storage.upload_file(
                    file=BytesIO(avatar_bytes),
                    filename="avatar_profile.png",
                    content_type="image/png",
                    folder=f"avatars/{user_id}",
                    user_id=user_id
                )
                clone.avatar_profile_url = upload_result["url"]
            
            icon_bytes = await gemini.generate_icon(photo_bytes_list[0])
            if icon_bytes:
                upload_result = storage.upload_file(
                    file=BytesIO(icon_bytes),
                    filename="avatar_icon.png",
                    content_type="image/png",
                    folder=f"avatars/{user_id}",
                    user_id=user_id
                )
                clone.avatar_icon_url = upload_result["url"]
        except Exception as e:
            print(f"⚠️ Avatar generation failed: {e}")
    
    # Update image_data
    existing = clone.image_data or {}
    existing["enhanced_photos"] = photo_urls
    existing["enhanced_at"] = datetime.now(timezone.utc).isoformat()
    clone.image_data = existing
    
    await db.commit()
    
    return {
        "status": "success",
        "photos_uploaded": len(photo_urls),
        "avatar_generated": clone.avatar_profile_url is not None
    }


@router.post("/{clone_id}/enhance/knowledge")
async def enhance_with_knowledge(
    clone_id: UUID,
    files: list[UploadFile] = File(..., description="Knowledge documents (PDF, TXT, DOC)"),
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(require_auth)
):
    """Add knowledge documents. Optional enhancement."""
    result = await db.execute(select(Clone).where(Clone.id == clone_id))
    clone = result.scalar_one_or_none()
    
    if not clone or str(clone.owner_id) != user["id"]:
        raise HTTPException(status_code=404, detail="Clone not found")
    
    storage = get_storage_service()
    user_id = str(clone.owner_id)
    
    uploaded_files = []
    for file in files:
        file_bytes = await file.read()
        try:
            upload_result = storage.upload_file(
                file=BytesIO(file_bytes),
                filename=file.filename or "document",
                content_type=file.content_type or "application/octet-stream",
                folder=f"documents/{user_id}",
                user_id=user_id
            )
            uploaded_files.append({
                "url": upload_result["url"],
                "name": file.filename,
                "size": len(file_bytes)
            })
        except Exception as e:
            print(f"⚠️ Upload failed: {e}")
    
    # Append to existing
    existing = clone.knowledge_files or []
    clone.knowledge_files = existing + uploaded_files
    await db.commit()
    
    return {
        "status": "success",
        "files_uploaded": len(uploaded_files),
        "total_files": len(clone.knowledge_files)
    }
