from typing import Optional
import asyncio
from uuid import UUID
import httpx
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_db, async_session_maker
from ..models import Clone, User
from ..models.clone import CloneStatus
from ..schemas.clone import (
    CloneCreate, CloneResponse, CloneUpdate,
    VoiceDataUpdate, NarrativeDataUpdate, ImageDataUpdate,
    RightsUpdate, CloneStatusResponse, RawInputUpdate,
    DimensionsResponse, DimensionUpdate
)
from ..middleware.auth_middleware import require_auth

router = APIRouter(prefix="/clone", tags=["Cloning Portal"])


@router.get("/status", response_model=CloneStatusResponse)
async def get_clone_status(
    user: dict = Depends(require_auth),
    db: AsyncSession = Depends(get_db),
):
    """
    Check if user has completed the cloning portal.
    
    Used by frontend to gate access to dashboard.
    """
    user_id = UUID(user["id"])
    
    result = await db.execute(
        select(Clone).where(Clone.owner_id == user_id)
    )
    clone = result.scalar_one_or_none()
    
    if not clone:
        return CloneStatusResponse(
            has_clone=False,
            clone_id=None,
            status=None,
            is_portal_complete=False,
        )
    
    return CloneStatusResponse(
        has_clone=True,
        clone_id=clone.id,
        status=clone.status,
        is_portal_complete=clone.status == CloneStatus.COMPLETED,
        voice_complete=clone.voice_data is not None,
        personality_complete=clone.narrative_data is not None,
        knowledge_complete=clone.knowledge_files is not None,
        visual_complete=clone.image_data is not None,
        rights_complete=True,  # Always true since it has a default
        activated=clone.status == CloneStatus.COMPLETED,
    )


@router.post("", response_model=CloneResponse)
async def create_clone(
    data: CloneCreate,
    user: dict = Depends(require_auth),
    db: AsyncSession = Depends(get_db),
):
    """Create a new draft clone for the user."""
    user_id = UUID(user["id"])
    
    # Check if user already has a clone
    result = await db.execute(
        select(Clone).where(Clone.owner_id == user_id)
    )
    existing = result.scalar_one_or_none()
    
    if existing:
        raise HTTPException(
            status_code=400,
            detail="You already have a clone. Complete or delete it first.",
        )
    
    clone = Clone(
        owner_id=user_id,
        name=data.name,
        description=data.description,
        status=CloneStatus.DRAFT,
    )
    db.add(clone)
    await db.commit()
    await db.refresh(clone)
    
    return clone


@router.get("/{clone_id}", response_model=CloneResponse)
async def get_clone(
    clone_id: UUID,
    user: dict = Depends(require_auth),
    db: AsyncSession = Depends(get_db),
):
    """Get clone by ID."""
    result = await db.execute(
        select(Clone).where(Clone.id == clone_id)
    )
    clone = result.scalar_one_or_none()
    
    if not clone:
        raise HTTPException(status_code=404, detail="Clone not found")
    
    # Check ownership
    if clone.owner_id and str(clone.owner_id) != user["id"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    return clone


@router.put("/{clone_id}/voice")
async def update_voice_data(
    clone_id: UUID,
    data: VoiceDataUpdate,
    user: dict = Depends(require_auth),
    db: AsyncSession = Depends(get_db),
):
    """Update clone's voice data (Stage 1)."""
    result = await db.execute(
        select(Clone).where(Clone.id == clone_id)
    )
    clone = result.scalar_one_or_none()
    
    if not clone or str(clone.owner_id) != user["id"]:
        raise HTTPException(status_code=404, detail="Clone not found")
    
    clone.voice_data = {
        "sampleUrl": data.sample_url,
        "duration": data.duration,
        "transcription": data.transcription,
    }
    await db.commit()
    
    return {"state": "success", "message": "Voice data updated"}


@router.put("/{clone_id}/personality")
async def update_personality_data(
    clone_id: UUID,
    data: NarrativeDataUpdate,
    user: dict = Depends(require_auth),
    db: AsyncSession = Depends(get_db),
):
    """Update clone's narrative/personality data (Stage 2)."""
    result = await db.execute(
        select(Clone).where(Clone.id == clone_id)
    )
    clone = result.scalar_one_or_none()
    
    if not clone or str(clone.owner_id) != user["id"]:
        raise HTTPException(status_code=404, detail="Clone not found")
    
    clone.narrative_data = data.answers
    await db.commit()
    
    return {"state": "success", "message": "Personality data updated"}


@router.put("/{clone_id}/raw-input")
async def update_raw_input(
    clone_id: UUID,
    data: RawInputUpdate,
    background_tasks: BackgroundTasks,
    user: dict = Depends(require_auth),
    db: AsyncSession = Depends(get_db),
):
    """
    Update clone with single-paragraph input (simplified onboarding).
    
    This triggers AI expansion to 10 dimensions in the background.
    """
    result = await db.execute(
        select(Clone).where(Clone.id == clone_id)
    )
    clone = result.scalar_one_or_none()
    
    if not clone or str(clone.owner_id) != user["id"]:
        raise HTTPException(status_code=404, detail="Clone not found")
    
    clone.raw_input = data.raw_input
    await db.commit()
    
    # Expand to dimensions in background
    background_tasks.add_task(expand_dimensions_task, clone_id)
    
    return {"status": "processing", "message": "Expanding input to personality dimensions"}


async def expand_dimensions_task(clone_id: UUID):
    """Background task to expand raw input to 10 dimensions."""
    from ..services.dimension_expander import get_dimension_expander
    
    async with async_session_maker() as db:
        result = await db.execute(
            select(Clone).where(Clone.id == clone_id)
        )
        clone = result.scalar_one_or_none()
        
        if not clone or not clone.raw_input:
            return
        
        try:
            expander = get_dimension_expander()
            dimensions = await expander.expand(clone.raw_input)
            
            clone.dimensions = dimensions
            clone.dimensions_version = 1
            await db.commit()
            print(f"✅ Expanded dimensions for clone {clone.name}")
        except Exception as e:
            print(f"❌ Failed to expand dimensions: {e}")


@router.get("/{clone_id}/dimensions", response_model=DimensionsResponse)
async def get_dimensions(
    clone_id: UUID,
    user: dict = Depends(require_auth),
    db: AsyncSession = Depends(get_db),
):
    """Get clone's 10 personality dimensions."""
    result = await db.execute(
        select(Clone).where(Clone.id == clone_id)
    )
    clone = result.scalar_one_or_none()
    
    if not clone or str(clone.owner_id) != user["id"]:
        raise HTTPException(status_code=404, detail="Clone not found")
    
    if not clone.dimensions:
        raise HTTPException(status_code=404, detail="Dimensions not yet generated")
    
    return DimensionsResponse(
        version=clone.dimensions_version or 1,
        last_updated=clone.updated_at,
        dimensions=clone.dimensions
    )


@router.put("/{clone_id}/dimensions/{dimension_key}")
async def update_dimension(
    clone_id: UUID,
    dimension_key: str,
    data: DimensionUpdate,
    background_tasks: BackgroundTasks,
    user: dict = Depends(require_auth),
    db: AsyncSession = Depends(get_db),
):
    """Update a single personality dimension."""
    valid_keys = ["mind", "heart", "spirit", "physicality", "experiences",
                  "relationships", "surroundings", "work", "ethics", "future"]
    
    if dimension_key not in valid_keys:
        raise HTTPException(status_code=400, detail=f"Invalid dimension. Must be one of: {valid_keys}")
    
    result = await db.execute(
        select(Clone).where(Clone.id == clone_id)
    )
    clone = result.scalar_one_or_none()
    
    if not clone or str(clone.owner_id) != user["id"]:
        raise HTTPException(status_code=404, detail="Clone not found")
    
    if not clone.dimensions:
        raise HTTPException(status_code=400, detail="Dimensions not yet generated")
    
    # Update the dimension
    from datetime import datetime
    clone.dimensions[dimension_key] = {
        "content": data.content,
        "source": "manual",
        "updated_at": datetime.utcnow().isoformat() + "Z"
    }
    clone.dimensions_version = (clone.dimensions_version or 1) + 1
    
    # Mark as modified for SQLAlchemy to detect JSONB change
    from sqlalchemy.orm.attributes import flag_modified
    flag_modified(clone, "dimensions")
    
    await db.commit()
    
    # Regenerate personality in background
    background_tasks.add_task(regenerate_personality_task, clone_id)
    
    return {"status": "success", "message": f"Updated {dimension_key} dimension", "version": clone.dimensions_version}


@router.put("/{clone_id}/knowledge")
async def update_knowledge_data(
    clone_id: UUID,
    data: dict,  # List of file info
    user: dict = Depends(require_auth),
    db: AsyncSession = Depends(get_db),
):
    """Update clone's knowledge files (Stage 3)."""
    result = await db.execute(
        select(Clone).where(Clone.id == clone_id)
    )
    clone = result.scalar_one_or_none()
    
    if not clone or str(clone.owner_id) != user["id"]:
        raise HTTPException(status_code=404, detail="Clone not found")
    
    clone.knowledge_files = data.get("files", [])
    await db.commit()
    
    return {"state": "success", "message": "Knowledge files updated"}


@router.put("/{clone_id}/visual")
async def update_visual_data(
    clone_id: UUID,
    data: ImageDataUpdate,
    user: dict = Depends(require_auth),
    db: AsyncSession = Depends(get_db),
):
    """Update clone's image data (Stage 4)."""
    result = await db.execute(
        select(Clone).where(Clone.id == clone_id)
    )
    clone = result.scalar_one_or_none()
    
    if not clone or str(clone.owner_id) != user["id"]:
        raise HTTPException(status_code=404, detail="Clone not found")
    
    clone.image_data = data.model_dump(exclude_none=True)
    await db.commit()
    
    return {"state": "success", "message": "Visual data updated"}


@router.put("/{clone_id}/rights")
async def update_rights(
    clone_id: UUID,
    data: RightsUpdate,
    user: dict = Depends(require_auth),
    db: AsyncSession = Depends(get_db),
):
    """Update clone's privacy settings (Stage 5)."""
    result = await db.execute(
        select(Clone).where(Clone.id == clone_id)
    )
    clone = result.scalar_one_or_none()
    
    if not clone or str(clone.owner_id) != user["id"]:
        raise HTTPException(status_code=404, detail="Clone not found")
    
    clone.is_public = data.is_public
    await db.commit()
    
    return {"state": "success", "message": "Privacy settings updated"}


from ..services.email_service import email_service
from ..services.elevenlabs_service import get_elevenlabs_service
from ..services.storage_service import get_storage_service
from io import BytesIO

# Intro text for TTS generation
CLONE_INTRO_TEXT = """Hello! I'm your digital clone. I'm here to represent you, connect with others on your behalf, and help you scale your time and presence. Let's create something amazing together."""

async def simulate_processing(clone_id: UUID):
    """
    Process clone activation including:
    1. Create voice clone via ElevenLabs API
    2. Generate intro audio using cloned voice
    3. Update clone status
    4. Send email notification
    """
    await asyncio.sleep(2)  # Brief delay to allow response to return
    
    async with async_session_maker() as db:
        try:
            result = await db.execute(
                select(Clone).where(Clone.id == clone_id)
            )
            clone = result.scalar_one_or_none()
            if not clone:
                print(f"❌ Clone {clone_id} not found for processing")
                return
            
            # Step 1: Create ElevenLabs voice clone
            clone.processing_step = 1
            await db.commit()
            
            elevenlabs = get_elevenlabs_service()
            voice_id = None
            if elevenlabs.is_configured and clone.voice_data:
                voice_url = clone.voice_data.get("sampleUrl")
                if voice_url:
                    print(f"🎙️ Creating ElevenLabs voice clone for {clone.name}...")
                    voice_id = await elevenlabs.create_voice_clone_from_url(
                        name=f"{clone.name} Voice",
                        audio_url=voice_url,
                        description=f"Voice clone for {clone.name}"
                    )
                    if voice_id:
                        clone.elevenlabs_voice_id = voice_id
                        print(f"✅ ElevenLabs voice created: {voice_id}")
                    else:
                        print("⚠️ Voice cloning failed, continuing without voice")
            else:
                print("⚠️ ElevenLabs not configured or no voice data, skipping voice clone")
            
            await db.commit()  # Commit voice step
            
            # Step 2: Generate intro audio with cloned voice
            if voice_id and elevenlabs.is_configured:
                print(f"🔊 Generating intro audio for {clone.name}...")
                audio_bytes = await elevenlabs.text_to_speech(
                    voice_id=voice_id,
                    text=CLONE_INTRO_TEXT,
                    model_id="eleven_multilingual_v2"
                )
                if audio_bytes:
                    # Upload to MinIO
                    storage = get_storage_service()
                    user_id = str(clone.owner_id) if clone.owner_id else "anonymous"
                    audio_file = BytesIO(audio_bytes)
                    upload_result = storage.upload_file(
                        file=audio_file,
                        filename=f"intro_{clone_id}.mp3",
                        user_id=user_id,
                        content_type="audio/mpeg",
                        folder="intro_audio"
                    )
                    clone.intro_audio_url = upload_result["url"]
                    print(f"✅ Intro audio saved: {upload_result['url']}")
                else:
                    print("⚠️ TTS generation failed, continuing without intro audio")
            
            # Step 3: Generate AI avatars from photos
            clone.processing_step = 2
            await db.commit()
            
            from ..services.gemini_service import get_gemini_service
            gemini = get_gemini_service()
            
            if gemini.is_configured and clone.image_data:
                storage = get_storage_service()
                user_id = str(clone.owner_id) if clone.owner_id else "anonymous"
                
                # Generate polished portrait from frontal photo
                frontal_url = clone.image_data.get("frontal")
                if frontal_url:
                    print(f"🖼️ Generating portrait avatar for {clone.name}...")
                    try:
                        async with httpx.AsyncClient(timeout=30.0) as client:
                            resp = await client.get(frontal_url)
                            if resp.status_code == 200:
                                avatar_bytes = await gemini.generate_avatar(resp.content)
                                if avatar_bytes:
                                    avatar_file = BytesIO(avatar_bytes)
                                    result = storage.upload_file(
                                        file=avatar_file,
                                        filename=f"avatar_portrait_{clone_id}.png",
                                        user_id=user_id,
                                        content_type="image/png",
                                        folder="avatars"
                                    )
                                    clone.avatar_profile_url = result["url"]
                                    print(f"✅ Portrait avatar saved: {result['url']}")
                    except Exception as e:
                        print(f"⚠️ Portrait avatar generation failed: {e}")
                
                # Generate cartoon icon from profile photo (or frontal as fallback)
                profile_url = clone.image_data.get("profile") or clone.image_data.get("frontal")
                if profile_url:
                    print(f"🎨 Generating cartoon icon for {clone.name}...")
                    try:
                        async with httpx.AsyncClient(timeout=30.0) as client:
                            resp = await client.get(profile_url)
                            if resp.status_code == 200:
                                icon_bytes = await gemini.generate_icon(resp.content)
                                if icon_bytes:
                                    icon_file = BytesIO(icon_bytes)
                                    result = storage.upload_file(
                                        file=icon_file,
                                        filename=f"avatar_icon_{clone_id}.png",
                                        user_id=user_id,
                                        content_type="image/png",
                                        folder="avatars"
                                    )
                                    clone.avatar_icon_url = result["url"]
                                    print(f"✅ Cartoon icon saved: {result['url']}")
                    except Exception as e:
                        print(f"⚠️ Cartoon icon generation failed: {e}")
            else:
                print("⚠️ Gemini not configured or no image data, skipping avatar generation")
            
            await db.commit()  # Commit avatar step
            
            # Step 4: AI Personality Synthesis
            clone.processing_step = 3
            await db.commit()
            
            from ..services.synthesis_service import get_synthesis_service
            synthesis = get_synthesis_service()
            
            # Prefer dimensions (new flow) over narrative_data (old flow)
            has_data = clone.dimensions or clone.narrative_data
            
            if synthesis.is_configured and has_data:
                print(f"🧠 Synthesizing personality for {clone.name}...")
                voice_url = clone.voice_data.get("sampleUrl") if clone.voice_data else None
                
                synthesis_result = await synthesis.synthesize_personality(
                    clone_name=clone.name,
                    narrative_data=clone.narrative_data,  # Old format
                    dimensions=clone.dimensions,  # New format (preferred)
                    voice_url=voice_url,
                    image_data=clone.image_data
                )
                
                if synthesis_result:
                    clone.system_prompt = synthesis_result.get("systemPrompt", f"You are {clone.name}'s digital clone.")
                    clone.personality = synthesis_result.get("personality", {})
                    clone.description = synthesis_result.get("shortDescription")
                    clone.background = synthesis_result.get("background")
                    print(f"✅ Personality synthesis complete")
                else:
                    # Fallback to basic personality
                    clone.system_prompt = f"You are {clone.name}'s digital clone. Respond in their voice and personality."
                    clone.personality = {
                        "traits": ["friendly", "helpful"],
                        "speaking_style": "conversational",
                    }
                    print("⚠️ Synthesis failed, using fallback personality")
            else:
                # Fallback if no synthesis service or no data
                clone.system_prompt = f"You are {clone.name}'s digital clone. Respond in their voice and personality."
                clone.personality = {
                    "traits": ["friendly", "helpful"],
                    "speaking_style": "conversational",
                }
                print("⚠️ Synthesis not available or no personality data, using fallback")
            
            await db.commit()  # Commit personality step
            
            # Step 5: Finalize clone
            clone.processing_step = 4
            clone.status = CloneStatus.COMPLETED
            await db.commit()
            print(f"✅ Clone {clone.name} processing complete")
            
            # Step 5: Send email notification
            if clone.owner_id:
                user_result = await db.execute(
                    select(User).where(User.id == clone.owner_id)
                )
                user = user_result.scalar_one_or_none()
                if user and user.email:
                    await email_service.send_clone_ready(
                        to=user.email,
                        username=user.name or user.email,
                        clone_name=clone.name
                    )

        except Exception as e:
            print(f"❌ Background processing error: {e}")
            await db.rollback()



@router.post("/{clone_id}/activate")
async def activate_clone(
    clone_id: UUID,
    background_tasks: BackgroundTasks,
    user: dict = Depends(require_auth),
    db: AsyncSession = Depends(get_db),
):
    """
    Activate the clone (Stage 6).
    
    This triggers the AI synthesis process.
    """
    result = await db.execute(
        select(Clone).where(Clone.id == clone_id)
    )
    clone = result.scalar_one_or_none()
    
    if not clone or str(clone.owner_id) != user["id"]:
        raise HTTPException(status_code=404, detail="Clone not found")
    
    # Validate required data
    if not clone.voice_data:
        raise HTTPException(status_code=400, detail="Voice data required")
    if not clone.narrative_data:
        raise HTTPException(status_code=400, detail="Personality data required")
    if not clone.image_data:
        raise HTTPException(status_code=400, detail="Visual data required")
    
    # Mark as processing - user will be redirected immediately
    clone.status = CloneStatus.PROCESSING
    await db.commit()
    
    # Trigger background simulation
    background_tasks.add_task(simulate_processing, clone_id)
    
    return {
        "state": "processing",
        "message": "Clone activation started. You will be notified when complete.",
        "clone_id": str(clone.id),
    }


@router.post("/{clone_id}/complete-processing")
async def complete_processing(
    clone_id: UUID,
    user: dict = Depends(require_auth),
    db: AsyncSession = Depends(get_db),
):
    """
    Complete clone processing (for testing/simulation).
    
    In production, this would be called by a background worker.
    """
    result = await db.execute(
        select(Clone).where(Clone.id == clone_id)
    )
    clone = result.scalar_one_or_none()
    
    if not clone or str(clone.owner_id) != user["id"]:
        raise HTTPException(status_code=404, detail="Clone not found")
    
    if clone.status != CloneStatus.PROCESSING:
        raise HTTPException(status_code=400, detail="Clone is not processing")
    
    # Synthesize the clone (in production, this would be AI processing)
    clone.status = CloneStatus.COMPLETED
    clone.system_prompt = f"You are {clone.name}'s digital clone. Respond in their voice and personality."
    clone.personality = {
        "traits": ["friendly", "helpful"],
        "speaking_style": "conversational",
    }
    await db.commit()
    
    # TODO: Send email notification to user
    
    return {
        "state": "success",
        "message": "Clone processing complete",
        "clone_id": str(clone.id),
    }


async def regenerate_personality_task(clone_id: UUID):
    """Background task to regenerate personality after dimension changes."""
    from ..services.synthesis_service import get_synthesis_service
    
    async with async_session_maker() as db:
        result = await db.execute(
            select(Clone).where(Clone.id == clone_id)
        )
        clone = result.scalar_one_or_none()
        
        if not clone or not clone.dimensions:
            return
        
        try:
            synthesis = get_synthesis_service()
            
            if synthesis.is_configured:
                voice_url = clone.voice_data.get("sampleUrl") if clone.voice_data else None
                
                synthesis_result = await synthesis.synthesize_personality(
                    clone_name=clone.name,
                    dimensions=clone.dimensions,
                    voice_url=voice_url,
                    image_data=clone.image_data
                )
                
                if synthesis_result:
                    clone.system_prompt = synthesis_result.get("systemPrompt")
                    clone.personality = synthesis_result.get("personality", {})
                    clone.description = synthesis_result.get("shortDescription")
                    clone.background = synthesis_result.get("background")
                    await db.commit()
                    print(f"✅ Regenerated personality for {clone.name} (v{clone.dimensions_version})")
        except Exception as e:
            print(f"❌ Failed to regenerate personality: {e}")
