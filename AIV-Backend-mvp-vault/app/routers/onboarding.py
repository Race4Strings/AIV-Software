"""Onboarding Router — Conversational twin onboarding flow (6 steps)."""

import asyncio
import traceback
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, UploadFile, File
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_db
from ..middleware.auth_middleware import require_auth
from ..models.onboarding_session import OnboardingSession, OnboardingStatus
from ..models.twin import Twin, TwinStatus
from ..models.audit_log import AuditLog
from ..schemas.onboarding_session import (
    OnboardingStepSubmit, OnboardingSessionResponse,
)
from ..services.alcm_client import get_alcm_client

router = APIRouter(prefix="/onboarding", tags=["Onboarding"])


@router.post("/start", response_model=OnboardingSessionResponse)
async def start_onboarding(
    user: dict = Depends(require_auth),
    db: AsyncSession = Depends(get_db),
):
    """Start a new onboarding session for the authenticated user."""
    session = OnboardingSession(
        initiated_by=UUID(user["id"]),
        status="DISCOVERY",
        onboarding_path="HYBRID",
    )
    db.add(session)

    audit = AuditLog(
        actor_id=UUID(user["id"]),
        actor_type="TALENT",
        action="CREATE",
        entity_type="onboarding_session",
    )
    db.add(audit)
    await db.flush()

    return OnboardingSessionResponse.model_validate(session)


@router.get("/{session_id}", response_model=OnboardingSessionResponse)
async def get_onboarding(
    session_id: UUID,
    user: dict = Depends(require_auth),
    db: AsyncSession = Depends(get_db),
):
    """Get the current state of an onboarding session."""
    result = await db.execute(
        select(OnboardingSession).where(
            OnboardingSession.id == session_id,
            OnboardingSession.user_id == UUID(user["id"]),
        )
    )
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Onboarding session not found")
    return OnboardingSessionResponse.model_validate(session)


@router.put("/{session_id}/step", response_model=OnboardingSessionResponse)
async def submit_step(
    session_id: UUID,
    data: OnboardingStepSubmit,
    user: dict = Depends(require_auth),
    db: AsyncSession = Depends(get_db),
):
    """Submit a step in the onboarding flow."""
    result = await db.execute(
        select(OnboardingSession).where(
            OnboardingSession.id == session_id,
            OnboardingSession.user_id == UUID(user["id"]),
        )
    )
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Onboarding session not found")

    if session.status != OnboardingStatus.IN_PROGRESS:
        raise HTTPException(status_code=400, detail="Onboarding is not in progress")

    if data.step != session.current_step:
        raise HTTPException(
            status_code=400,
            detail=f"Expected step {session.current_step}, got {data.step}",
        )

    # Store step response — create a NEW dict so SQLAlchemy detects the mutation
    responses = dict(session.user_responses or {})
    responses[str(data.step)] = data.response
    session.user_responses = responses

    # Store voice sample URL if provided — same pattern: new list for mutation tracking
    if data.voice_sample_url:
        urls = list(session.voice_sample_urls or [])
        urls.append(data.voice_sample_url)
        session.voice_sample_urls = urls

    # Advance to next step (max 6)
    if session.current_step < 6:
        session.current_step += 1

    await db.flush()
    return OnboardingSessionResponse.model_validate(session)


@router.post("/{session_id}/complete", response_model=OnboardingSessionResponse)
async def complete_onboarding(
    session_id: UUID,
    background_tasks: BackgroundTasks,
    user: dict = Depends(require_auth),
    db: AsyncSession = Depends(get_db),
):
    """
    Complete the onboarding session and create the twin.

    Voice cloning is already running (started in /voice endpoint).
    This just picks up the result if available, or sets the twin to
    poll for the voice_id from the session.
    """
    from datetime import datetime, timezone

    result = await db.execute(
        select(OnboardingSession).where(
            OnboardingSession.id == session_id,
            OnboardingSession.user_id == UUID(user["id"]),
        )
    )
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Onboarding session not found")

    if session.status != OnboardingStatus.IN_PROGRESS:
        raise HTTPException(status_code=400, detail="Onboarding is not in progress")

    # Create the twin from onboarding data
    responses = session.user_responses or {}
    step1 = responses.get("1", {}) or {}
    step3 = responses.get("3", {}) or {}

    # Extract voice-related data stashed by the /voice endpoint
    research = dict(session.research_data or {})
    voice_sample_url = research.pop("_voice_sample_url", None)
    # Check if voice cloning already completed (started in /voice endpoint)
    cloned_voice_id = research.pop("_voice_id", None)
    voice_clone_status = research.pop("_voice_clone_status", None)
    voice_clone_error = research.pop("_voice_clone_error", None)
    has_voice_flag = research.pop("_has_voice_video", False)
    # Clean all internal keys from research_data
    research.pop("_voice_video_url", None)
    research.pop("_voice_video_ext", None)
    alcm_data = {k: v for k, v in research.items() if not k.startswith("_")}

    # Build voice_sample_url from session recordings or pre-stored URL
    voice_urls = session.voice_sample_urls or []
    if not voice_sample_url:
        voice_sample_url = voice_urls[0] if voice_urls else None

    # Determine voice status for the twin
    if cloned_voice_id:
        # Voice cloning already finished successfully in the /voice background task
        voice_status = "READY"
        print(f"✅ [Complete] Voice already cloned: {cloned_voice_id}")
    elif voice_clone_status == "failed":
        voice_status = "FAILED"
        print(f"❌ [Complete] Voice cloning failed: {voice_clone_error}")
    elif has_voice_flag:
        # Cloning is still running in the background
        voice_status = "PROCESSING"
        print(f"🎤 [Complete] Voice cloning still in progress")
    else:
        voice_status = "PENDING"
        print(f"🎤 [Complete] No voice data submitted")

    print(f"🎤 [Complete] research_data keys (cleaned): {list(alcm_data.keys())}")

    # Get bio from step 3, or from research identity section
    bio = step3.get("bio", "") or alcm_data.get("identity", {}).get("public_bio", "")

    twin = Twin(
        user_id=UUID(user["id"]),
        name=step1.get("name", "My Twin"),
        category=step1.get("category"),
        bio=bio,
        alcm_data=alcm_data,
        status=TwinStatus.DRAFT,
        voice_id=cloned_voice_id,  # May already be set if cloning finished
        # voice_status removed — voice via ALCM
        voice_sample_url=voice_sample_url,
        completeness_score=0.0,
        version="1.0",
    )
    db.add(twin)
    await db.flush()

    twin_id = twin.id  # capture before session closes

    # Link twin to session
    session.twin_id = twin.id
    session.status = OnboardingStatus.COMPLETED
    session.completed_at = datetime.now(timezone.utc)

    # Clear the large blobs from research_data now that we've extracted it
    session.research_data = alcm_data

    # Audit
    audit = AuditLog(
        twin_id=twin.id,
        user_id=UUID(user["id"]),
        action="onboarding_completed",
        entity_type="onboarding_session",
        entity_id=session.id,
        details={"twin_name": twin.name},
    )
    db.add(audit)
    await db.flush()

    # If voice cloning is still in progress (not yet finished), set up a
    # lightweight polling background task that transfers the voice_id from
    # the session to the twin once it completes.
    if voice_status == "PROCESSING":
        async def _poll_voice_result():
            """Wait for the voice cloning bg task (started in /voice) to finish."""
            from ..database import async_session_maker
            import asyncio as _asyncio

            max_wait = 180  # 3 minutes max
            poll_interval = 5
            elapsed = 0
            print(f"🎤 [PollVoice] Waiting for voice clone result for twin {twin_id}...")

            while elapsed < max_wait:
                await _asyncio.sleep(poll_interval)
                elapsed += poll_interval
                try:
                    async with async_session_maker() as bg_db:
                        res = await bg_db.execute(
                            select(OnboardingSession).where(OnboardingSession.id == session_id)
                        )
                        s = res.scalar_one_or_none()
                        if not s:
                            break

                        rd = s.research_data or {}
                        vid = rd.get("_voice_id")
                        status = rd.get("_voice_clone_status")

                        if vid:
                            # Clone succeeded! Update twin.
                            t_res = await bg_db.execute(select(Twin).where(Twin.id == twin_id))
                            t = t_res.scalar_one_or_none()
                            if t:
                                t.voice_id = vid
                                pass  # voice via ALCM
                                ad = dict(t.alcm_data or {})
                                ad.pop("_voice_error", None)
                                t.alcm_data = ad
                                await bg_db.commit()
                                print(f"✅ [PollVoice] Twin {twin_id} updated with voice_id={vid}")
                            return

                        if status == "failed":
                            error = rd.get("_voice_clone_error", "Unknown")
                            t_res = await bg_db.execute(select(Twin).where(Twin.id == twin_id))
                            t = t_res.scalar_one_or_none()
                            if t:
                                pass  # voice via ALCM
                                ad = dict(t.alcm_data or {})
                                ad["_voice_error"] = error
                                t.alcm_data = ad
                                await bg_db.commit()
                            print(f"❌ [PollVoice] Voice cloning failed: {error}")
                            return
                except Exception as e:
                    print(f"⚠️ [PollVoice] Poll error: {e}")

            # Timed out
            print(f"⚠️ [PollVoice] Timed out waiting for voice clone result")
            try:
                async with async_session_maker() as bg_db:
                    t_res = await bg_db.execute(select(Twin).where(Twin.id == twin_id))
                    t = t_res.scalar_one_or_none()
                    if t and t.voice_status == "PROCESSING":
                        pass  # voice via ALCM
                        ad = dict(t.alcm_data or {})
                        ad["_voice_error"] = "Voice cloning timed out"
                        t.alcm_data = ad
                        await bg_db.commit()
            except Exception:
                pass

        background_tasks.add_task(_poll_voice_result)

    return OnboardingSessionResponse.model_validate(session)


@router.post("/{session_id}/research")
async def trigger_research(
    session_id: UUID,
    background_tasks: BackgroundTasks,
    user: dict = Depends(require_auth),
    db: AsyncSession = Depends(get_db),
):
    """Trigger background research after Q1-Q3 identity capture."""
    result = await db.execute(
        select(OnboardingSession).where(
            OnboardingSession.id == session_id,
            OnboardingSession.user_id == UUID(user["id"]),
        )
    )
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Onboarding session not found")

    if session.status != OnboardingStatus.IN_PROGRESS:
        raise HTTPException(status_code=400, detail="Onboarding is not in progress")

    # Extract Q1-Q3 data
    responses = session.user_responses or {}
    step1 = responses.get("1", {}) or {}
    step2 = responses.get("2", {}) or {}
    step3 = responses.get("3", {}) or {}

    name = step1.get("name", "")
    category = step1.get("category")
    social_handles = step2 if isinstance(step2, dict) else {}
    bio = step3.get("bio", "") if isinstance(step3, dict) else str(step3)

    if not name:
        raise HTTPException(status_code=400, detail="Name is required (complete step 1 first)")

    # Run research in background
    async def _run_research():
        from ..database import async_session_maker
        import traceback
        alcm_client = get_alcm_client()
        try:
            print(f"🔍 [Research] Starting for session {session_id}")
            # Hard timeout — if Gemini hangs, this unblocks after 90s
            # Classify via ALCM API (scraping now lives there)
            content = f"Name: {name}. Category: {category}. Bio: {bio}. Socials: {social_handles}"
            research_data = await asyncio.wait_for(
                alcm_client.classify("placeholder", content, "TEXT", 0.6),
                timeout=90.0,
            )
            async with async_session_maker() as bg_db:
                res = await bg_db.execute(
                    select(OnboardingSession).where(OnboardingSession.id == session_id)
                )
                s = res.scalar_one_or_none()
                if s:
                    existing = dict(s.research_data or {})
                    existing.update(research_data)
                    existing["_research_completed"] = True
                    s.research_data = existing
                    await bg_db.commit()
                    print(f"✅ [Research] Complete for session {session_id}")
        except Exception as e:
            print(f"❌ [Research] Failed for session {session_id}: {type(e).__name__}: {e}")
            traceback.print_exc()
            # Always write a terminal state so the frontend poll can resolve
            try:
                async with async_session_maker() as bg_db:
                    res = await bg_db.execute(
                        select(OnboardingSession).where(OnboardingSession.id == session_id)
                    )
                    s = res.scalar_one_or_none()
                    if s:
                        existing = dict(s.research_data or {})
                        existing["_research_completed"] = True
                        existing["_research_failed"] = True
                        existing["_research_error"] = str(e)[:200]
                        s.research_data = existing
                        await bg_db.commit()
            except Exception as db_err:
                print(f"❌ [Research] DB update failed: {db_err}")

    background_tasks.add_task(_run_research)

    return {"status": "researching", "message": "Research started in background"}


@router.get("/{session_id}/research")
async def get_research(
    session_id: UUID,
    user: dict = Depends(require_auth),
    db: AsyncSession = Depends(get_db),
):
    """Get research results for an onboarding session."""
    result = await db.execute(
        select(OnboardingSession).where(
            OnboardingSession.id == session_id,
            OnboardingSession.user_id == UUID(user["id"]),
        )
    )
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Onboarding session not found")

    research = session.research_data or {}
    is_done = (
        research.get("_research_completed") is True
        or bool(research.get("personality"))
        or research.get("_synthesis_failed") is True
        or research.get("_research_failed") is True
    )
    return {
        "status": "complete" if is_done else "pending",
        "data": research,
    }


@router.post("/{session_id}/voice")
async def submit_voice_sample(
    session_id: UUID,
    background_tasks: BackgroundTasks,
    video: UploadFile = File(..., description="Video file with audio for voice cloning"),
    user: dict = Depends(require_auth),
    db: AsyncSession = Depends(get_db),
):
    """
    Submit a video/audio sample for voice cloning.

    Starts voice cloning IMMEDIATELY in a background task so it runs
    while the user records Q5/Q6 and reviews research. The voice_id
    is stored in the session's research_data for /complete to pick up.
    """
    print(f"🎤 [Voice] Received voice upload for session {session_id}")
    print(f"🎤 [Voice] Filename: {video.filename}, Content-Type: {video.content_type}, Size hint: {video.size}")

    result = await db.execute(
        select(OnboardingSession).where(
            OnboardingSession.id == session_id,
            OnboardingSession.user_id == UUID(user["id"]),
        )
    )
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Onboarding session not found")

    video_bytes = await video.read()
    print(f"🎤 [Voice] Read {len(video_bytes)} bytes from upload")
    if len(video_bytes) < 5000:
        raise HTTPException(status_code=400, detail="Video file too short")

    # Determine format from filename
    filename = video.filename or "video.webm"
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else "webm"

    # Upload voice sample to storage for later playback
    voice_sample_url = ""
    try:
        from ..services.storage_service import get_storage_service
        import io
        storage = get_storage_service()
        upload_result = storage.upload_file(
            file=io.BytesIO(video_bytes),
            filename=filename,
            user_id=str(user["id"]),
            folder="voice",
        )
        voice_sample_url = upload_result.get("url", "")
        print(f"🎤 [Voice] Storage upload OK: {voice_sample_url[:80]}...")
    except Exception as e:
        print(f"⚠️ [Voice] Storage upload failed (continuing without): {e}")

    # Store voice sample URL reference — new list for mutation tracking
    urls = list(session.voice_sample_urls or [])
    urls.append(voice_sample_url)
    session.voice_sample_urls = urls

    # Store metadata in research_data
    rd = dict(session.research_data or {})
    rd["_voice_video_url"] = voice_sample_url
    rd["_voice_video_ext"] = ext
    rd["_voice_sample_url"] = voice_sample_url
    rd["_has_voice_video"] = True
    rd["_voice_clone_status"] = "processing"  # background task will update this
    session.research_data = rd

    await db.flush()

    # ── Start voice cloning IMMEDIATELY in background ──
    # This runs while the user records Q5/Q6 and reviews research,
    # giving ElevenLabs maximum processing time. The result is
    # persisted to the DB session so it survives server restarts.
    sess_id = session_id  # capture for closure
    user_name = (session.user_responses or {}).get("1", {}).get("name", "User")

    async def _clone_voice_now():
        """Extract audio from video, clone voice, persist result to session."""
        from ..database import async_session_maker

        async def _set_session_status(status: str, voice_id: str = None, error: str = None):
            """Persist voice clone result to the onboarding session's research_data."""
            try:
                async with async_session_maker() as bg_db:
                    res = await bg_db.execute(
                        select(OnboardingSession).where(OnboardingSession.id == sess_id)
                    )
                    s = res.scalar_one_or_none()
                    if s:
                        rd = dict(s.research_data or {})
                        rd["_voice_clone_status"] = status
                        if voice_id:
                            rd["_voice_id"] = voice_id
                        if error:
                            rd["_voice_clone_error"] = error
                        s.research_data = rd
                        await bg_db.commit()
            except Exception as db_err:
                print(f"⚠️ [VoiceClone] DB update failed: {db_err}")

        try:
            print(f"🎤 [VoiceClone] Starting immediately for session {sess_id}")

            # Voice cloning now happens via ALCM API (media analysis)
            alcm = get_alcm_client()
            # Upload the video to storage first, then send URL to ALCM for analysis
            # For now, log and mark as processing
            print(f"🎤 [VoiceClone] Sending to ALCM for analysis...")
            voice_id = None  # ALCM handles voice cloning asynchronously

            if voice_id:
                print(f"✅ [VoiceClone] Success! voice_id={voice_id}")
                await _set_session_status("ready", voice_id=voice_id)
            else:
                print(f"❌ [VoiceClone] ElevenLabs returned no voice_id")
                await _set_session_status("failed", error="ElevenLabs returned no voice_id")

        except Exception as e:
            print(f"❌ [VoiceClone] Crashed: {e}")
            traceback.print_exc()
            await _set_session_status("failed", error=f"Crashed: {str(e)[:200]}")

    background_tasks.add_task(_clone_voice_now)
    print(f"🎤 [Voice] Background voice cloning task launched for session {sess_id}")

    return {"status": "processing", "message": "Voice cloning started — processing while you continue"}
