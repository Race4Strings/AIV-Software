# Handoff: Ricardo → Sami
## Date: February 26, 2026
## Branch: `mvp/vault` (both repos — all code merged and pushed)

---

## Summary

Day 2 code is complete. All 8 implementation tasks are done. The AIV chat works end-to-end (tested on Railway). The onboarding flow components are built but need end-to-end testing. A Railway `mvp` environment is live for testing.

---

## What Was Done Before Day 2

### Day 1: Sami's Branch Review
- Reviewed your `sami/day1-backend-foundation` branch before merging
- Found 4 issues across your router files that should be revisited:
  - `app/routers/deal.py` — status transition validation edge cases
  - `app/routers/certification.py` — minor issues noted during review
  - `app/routers/document.py` — minor issues noted during review
  - `app/routers/training.py` — minor issues noted during review
- Merged with `--no-ff` to preserve history — but keep these in mind for quality pass

### Day 1: Sidebar Fix
- Narrowed sidebar to 12rem, pinned "Talk to AIV" + "Settings" to bottom-left
- Collapse behavior: ChatGPT-style (AIV icon swaps to PanelLeft on hover)
- File: `src/components/dashboard/app-sidebar.tsx`

---

## What Was Built (Day 2)

### Backend (AIV-Backend)
| File | What it does |
|------|-------------|
| `app/services/aiv_service.py` | AIVService — wraps GeminiAIService, two modes (onboarding/assistant), conversation history, streaming |
| `app/services/voice_cloning_service.py` | VoiceCloningService — adapted from archive ElevenLabsService, all methods kept, added ffmpeg audio extraction |
| `app/services/research_agent_service.py` | ResearchAgentService — parallel Google-grounded searches, ALCM-structured output |
| `app/routers/aiv.py` | POST /aiv/chat (SSE streaming), POST /aiv/chat/sync (fallback) |
| `app/routers/onboarding.py` | Enhanced: POST /research, GET /research, POST /voice (new endpoints) |

### Frontend (AIV-frontend)
| File | What it does |
|------|-------------|
| `src/components/aiv/chat-interface.tsx` | Full chat UI with SSE streaming |
| `src/components/aiv/message-bubble.tsx` | User/AIV bubbles with markdown rendering (react-markdown) |
| `src/components/aiv/chat-input.tsx` | Textarea with Enter-to-send, auto-resize |
| `src/components/onboard/onboarding-context.tsx` | State management for 7-phase onboarding |
| `src/components/onboard/onboarding-flow.tsx` | Step orchestrator with progress bar |
| `src/components/onboard/text-step.tsx` | Q1 (name/category), Q2 (social handles), Q3 (bio) |
| `src/components/onboard/video-step.tsx` | Q4-Q6 video recording with MediaRecorder + camera |
| `src/components/onboard/recording-gate.tsx` | 30s minimum circular SVG progress indicator |
| `src/components/onboard/research-review.tsx` | Editable research results cards + completion |
| `src/lib/api/onboarding.ts` | API client for all onboarding endpoints |

---

## Railway Deployment (mvp environment)

Live and working for testing:
- **Frontend**: https://aiv-frontend-mvp.up.railway.app
- **Backend**: https://aiv-backend-mvp.up.railway.app
- **Project**: `peaceful-curiosity`, environment: `mvp`

Test accounts in the DB:
- `demo@vault.dev` / `VaultDemo#2026` (username: demouser)
- `rickycor777@gmail.com` / `VaultDemo#2026` (username: jonahhill123)

---

## What Needs To Be Done (Sami's Tasks)

### Priority 1: Wire Onboarding Redirect for New Users
After signup → verify → login, new users land on the dashboard but are NOT redirected to `/onboard`. This needs to be wired:
- In the dashboard (`src/app/page.tsx`), check if the user has a twin (call `GET /twin/me` or similar)
- If no twin exists, redirect to `/onboard` automatically
- The onboarding flow at `/onboard` also needs to create an onboarding session via `POST /onboarding/start` if one doesn't exist
- After onboarding completes, redirect to `/` (dashboard)

### Priority 2: End-to-End Onboarding Testing
The onboarding flow (Q1-Q6 → research → complete) needs to be tested end-to-end on the Railway deployment. The components are built but haven't been tested as a connected flow.

Steps to test:
1. Sign up a new account on the Railway frontend
2. After entering your email, the OTP code will be shown directly on the verify page in an amber banner (dev mode is enabled — no email delivery needed, no Railway access needed)
3. After verification you'll land on the dashboard
4. Navigate to `/onboard`
5. Walk through Q1-Q3 (text steps), Q4-Q6 (video steps with camera)
6. Verify research review loads and cards are editable
7. Complete onboarding and verify twin is created

### Priority 3: Fix Email/OTP Delivery (Lower Priority Now)
OTP codes are generated correctly but emails aren't being delivered (Resend API domain verification issue). A dev mode bypass is active so this isn't blocking testing:
- Backend returns the OTP code in the API response when `DEV_MODE=true`
- Frontend verify page displays it in an amber banner automatically
- No Railway access needed to test auth flow
- When ready for production: verify `aiv.chat` domain in Resend dashboard, then set `DEV_MODE=false`

### Priority 4: Review Router Issues from Day 1
During the review of your `sami/day1-backend-foundation` branch, 4 issues were noted in:
- `app/routers/deal.py`
- `app/routers/certification.py`
- `app/routers/document.py`
- `app/routers/training.py`
Do a quality pass on these routers — check error handling, edge cases, and status transition logic.

### Priority 5: Remaining Quality Checks
- [ ] Test video recording with 30s gate works in browser
- [ ] Test light/dark mode on /aiv and /onboard pages
- [ ] Test all new backend endpoints in Swagger (https://aiv-backend-mvp.up.railway.app/docs)
- [ ] Verify voice cloning triggers (or gracefully handles missing API key)
- [ ] Verify research agent returns structured data

### Priority 6: Onboarding Session Creation
The onboarding flow needs an active `onboarding_sessions` record in the DB. Verify that:
- A new onboarding session is created when a user first visits `/onboard`
- Or wire it so the frontend creates one via `POST /onboarding/start` (endpoint exists)
- The flow should check if user already has a twin and skip onboarding if so

---

## Known Issues

1. **Email OTP not delivered** — Resend API needs domain verification. Dev mode bypass is active: backend returns OTP in API response when `DEV_MODE=true`, frontend displays it in an amber banner on the verify page. No Railway access needed to test auth.
2. **Onboarding redirect missing** — New users land on dashboard after signup, not redirected to `/onboard`. This is P1 for Sami.
3. **`/portal` was 404** — Fixed. Redirects now go to `/` (dashboard). Already merged and pushed.
4. **Railway env credentials** — When cloning a Railway environment, service variables (DATABASE_URL, REDIS_URL) keep the old env's passwords. Already fixed for `mvp` env.
5. **Router issues from Day 1** — 4 issues noted in deal.py, certification.py, document.py, training.py during branch review. Need quality pass.

---

## Architecture Notes

- AIV chat uses SSE streaming (not WebSocket) — `fetch` + `ReadableStream` on frontend, `StreamingResponse` on backend
- Onboarding state is managed via React Context (`OnboardingProvider`), not Redux
- Voice cloning is async — video upload → ffmpeg audio extraction → ElevenLabs API, all in background tasks
- Research agent runs parallel Google-grounded searches via `asyncio.gather`
- All new endpoints require authentication (session cookie)

---

## Branch Info
- Integration branch: `mvp/vault` (both repos)
- Feature branch: `ricardo/day2-onboarding` (merged to mvp/vault)
- DO NOT touch `main` branch — completely different application
