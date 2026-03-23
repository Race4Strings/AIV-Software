# Debug Doc — AI Chat SSE Streaming Issue + Session Status

**Date:** March 15, 2026 (Sunday night — demo is tomorrow with Andres + investors)
**Priority:** CRITICAL — AI chat and voice cloning are the two hero features for the demo

---

## The Problem

AI chat streaming (SSE) is broken on the Railway deployment. The user sends a message, the backend returns HTTP 200, but the frontend never receives the streamed chunks — it hangs indefinitely with the input disabled, then eventually shows "Sorry, I couldn't process that request."

## What We Know

### Infrastructure
- **Frontend:** Next.js 15.5.12 on Railway, branch `mvp/vault-ui-polish`, service `AIV-frontend`
- **Backend:** FastAPI on Railway, branch `backend-polish`, service `AIV-Backend`
- **Railway project:** `peaceful-curiosity`, environment: `mvp`
- **Frontend URL:** `https://aiv-frontend-mvp.up.railway.app`
- **Backend URL:** `https://aiv-backend-mvp.up.railway.app`

### Root Cause (Likely)

The frontend uses Next.js `rewrites()` in `next.config.ts` to proxy `/api/backend/*` to the backend. SSE/streaming responses are being **buffered by the Next.js rewrite proxy** and never forwarded to the client in real-time.

**Evidence:**
1. Backend logs show `POST /aiv/chat HTTP/1.1 200 OK` — the request completes successfully
2. Backend has `X-Accel-Buffering: no` header on the SSE response
3. Frontend console shows the fetch eventually fails or times out
4. The backend's `/aiv/chat/sync` (non-streaming) endpoint works fine via the proxy
5. Earlier today, the proxy was returning 500 for ALL requests because `NEXT_PUBLIC_API_URL` (public Railway URL) was timing out from within Railway's internal network. We fixed this by adding `BACKEND_INTERNAL_URL=http://aiv-backend.railway.internal:8000` and updating `next.config.ts` to prefer it. The 500s are fixed, but SSE streaming is still buffered.

### What We Tried
- Confirmed backend returns 200 OK and streams correctly (tested via `curl` directly to backend)
- Added `X-Accel-Buffering: no` header to the StreamingResponse
- Fixed the internal URL issue (proxy now works for non-streaming requests)
- Verified Gemini API key (`GOOGLE_GENAI_API_KEY`) is set and working
- Checked Railway deploy logs — no errors

### The Fix Needed

**Option A (Recommended — quickest):** Make the chat fetch call the backend directly instead of going through the Next.js proxy. Change `chat-interface.tsx` line ~134:

```typescript
// BEFORE (goes through Next.js rewrite proxy — buffers SSE)
const response = await fetch("/api/backend/aiv/chat", { ... });

// AFTER (direct to backend — SSE works)
const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/aiv/chat`, { ... });
```

This requires CORS to be configured (it already is — `CORS_ORIGINS` includes the frontend URL). The cookie `credentials: "include"` should still work since `COOKIE_SAMESITE=none` and `COOKIE_SECURE=true` are set.

Also do the same in `template-form.tsx` line ~105 which also uses `/api/backend/aiv/chat`.

**Option B:** Create a custom Next.js API route (`/api/chat/route.ts`) that manually proxies the SSE stream without buffering. More work but keeps same-origin.

**Option C:** Use the sync endpoint `/aiv/chat/sync` as a fallback. Loses streaming UX but guaranteed to work.

---

## Other Key Context

### What's Working
- Dashboard: ✅ loads correctly, shows twin data, activity feed, protection checklist
- Twin Profile (all 6 tabs): ✅ identity, voice, governance, commercial, visual, documents
- Certification page: ✅ immutable (no re-certify), shows "Blockchain Pending" badge
- Governance: ✅ save/edit works, rules are injected into AI system prompt
- Documents: ✅ empty state, template generation
- Training: ✅ empty state with submission form
- Deals: ✅ shows "Marketplace Coming Soon"
- Sidebar: ✅ workspace switcher, chat history, nav highlighting
- Auth: ✅ signin/signup/forgot-password
- Onboarding: ✅ 6-step flow with video recording

### Demo Account
- **Email:** `demo@vault.dev` / **Password:** `VaultDemo#2026`
- Twin: "Jennifer Aniston" (Actress, Producer)
- Certification: WIPED (was v1.1 from before immutability fix) — needs re-certification during demo
- Deals: WIPED (old "Test Nike" deal removed)
- Governance rules set: no-go topics (politics, religion, personal relationships, salary details), professional tone, no endorsements without approval, family-friendly content

### Voice Cloning Status
- ElevenLabs API key is configured on Railway (`ELEVENLABS_API_KEY`)
- Voice cloning happens during onboarding steps 4-6 (video questions → ffmpeg extracts audio → ElevenLabs creates clone)
- Backend service: `app/services/voice_cloning_service.py`
- Frontend component: `src/components/twin/twin-tab-voice.tsx`
- TTS playground endpoint: backend has `/twins/{id}/voice/tts` 
- **NOT YET TESTED E2E** — Ricardo needs to do a fresh onboarding flow to verify the full pipeline works
- ffmpeg is installed on Railway (verified via `/health/voice` endpoint)

### Blockchain
- **SKIPPED for now** — not worth the token spend. UI shows "Blockchain Pending" badges which is fine for demo.
- Wallet was funded but private key was lost. New wallet generated but not funded.
- Smart contract deploy script ready at `AIV-Backend/scripts/deploy_contract.py`

### Key Files for the Chat Fix
- `AIV-frontend/src/components/aiv/chat-interface.tsx` — line ~134, the `fetch("/api/backend/aiv/chat", ...)` call
- `AIV-frontend/src/components/documents/template-form.tsx` — line ~105, same pattern
- `AIV-frontend/next.config.ts` — the rewrite rule proxying `/api/backend/*`
- `AIV-Backend/app/routers/aiv.py` — the SSE streaming endpoint
- `AIV-Backend/app/services/ai_service.py` — Gemini API streaming (`_stream_response` method)
- `AIV-Backend/app/services/aiv_service.py` — orchestrates context building + AI call

### Key Files for Voice Cloning
- `AIV-Backend/app/services/voice_cloning_service.py` — ElevenLabs wrapper
- `AIV-Backend/app/routers/onboarding.py` — handles video upload + audio extraction + voice clone creation
- `AIV-frontend/src/components/twin/twin-tab-voice.tsx` — Voice tab UI with TTS playground
- `AIV-frontend/src/components/onboarding/onboarding-flow.tsx` — onboarding steps including video recording

### Environment Variables on Railway (Backend)
- `GOOGLE_GENAI_API_KEY` — Gemini API key (set)
- `ELEVENLABS_API_KEY` — ElevenLabs voice cloning (set)
- `BACKEND_INTERNAL_URL` — set on frontend service: `http://aiv-backend.railway.internal:8000`
- `NEXT_PUBLIC_API_URL` — set on frontend: `https://aiv-backend-mvp.up.railway.app`
- `CORS_ORIGINS` — includes both localhost ports and Railway URLs
- `COOKIE_SAMESITE=none`, `COOKIE_SECURE=true`

### Git Branches
- Frontend: `mvp/vault-ui-polish` (deployed to Railway `mvp` environment)
- Backend: `backend-polish` (deployed to Railway `mvp` environment)
- Both push to GitHub org `AIV-Dream-Avant-Garde`

### Recent Commits (Today)
- Frontend: `74b08e7` — "fix: use internal Railway URL for server-side API rewrites (fixes ETIMEDOUT)"
- Frontend: `1e4e11d` — "feat: deals page shows Marketplace Coming Soon + work session log"
- Frontend: `64743e7` — "fix: suppress React hydration warning #418 from next-themes"
- Backend: `cfc04bf` — "cleanup: remove temp admin endpoint after demo prep"
- Backend: `5bbeafe` — "fix: remove status update from cleanup endpoint (enum issue)"
