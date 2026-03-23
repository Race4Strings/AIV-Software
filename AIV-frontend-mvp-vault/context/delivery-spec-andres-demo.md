# Andres Demo Delivery Spec — March 6, 2026

## Goal
Andres signs up, goes through onboarding, and lands on a fully populated dashboard that demonstrates real protection value. Zero errors, zero broken states, zero toast notifications.

## Demo URL
`https://aiv-frontend-mvp.up.railway.app` (or Vercel preview from mvp/vault)

## Critical Path (must work flawlessly)

### 1. Sign Up
- Create account with email + password
- Email verification (DEV_MODE=true means OTP shows in API response — handled gracefully in UI)
- Redirect to onboarding

### 2. Onboarding (6 steps)
- Q1: Name + professional title
- Q2: Social media handles
- Q3: Bio
- Q4-Q6: Video recordings (30s minimum each) — these are voice samples
- Research runs in background after Q3 (Gemini AI + Google Search grounding)
- Voice cloning triggers on each video upload (ElevenLabs)
- Research review page shows ALCM data, user can edit
- "Create My Digital Twin" completes onboarding

### 3. Dashboard (post-onboarding)
- Protection Status cards: certification status, doc count, protection level
- Protection Checklist: identity captured, voice cloned, certified, governance, legal docs
- Asset Overview: visual identity, voice protection, commercial terms, documents
- Recent Activity feed

### 4. Identity Profile
- All 6 tabs populated from ALCM data
- Inline editing works
- Protection/certification banner visible at top of profile

### 5. Certification
- One-click certify
- SHA-256 hash generated
- Public verification URL works
- PDF export works

### 6. Legal Templates
- All 4 templates render
- Auto-populate from ALCM
- Generate document works
- Document saves to library

### 7. Voice
- Shows cloning status
- Voice preview/TTS demo works with cloned voice

## Testing Results (API-verified March 6)

- [x] Fresh signup works — returns dev_otp
- [x] Email verification works — sets session cookie
- [x] Onboarding start works
- [x] All 6 onboarding steps persist data correctly (JSON mutation fix deployed)
- [x] Research populates ALCM data via Gemini AI
- [x] Complete onboarding creates twin with ALCM + bio
- [x] Certification creates SHA-256 hash
- [x] Public verification page returns cert metadata
- [x] Build passes clean on all 19 routes
- [ ] Voice cloning during onboarding (requires browser video recording — not API-testable)
- [ ] Voice TTS preview (requires cloned voice_id)
- [ ] Full visual QA in browser

## Backend Fix Deployed
SQLAlchemy JSON mutation tracking — steps 2-6 data was being lost because in-place dict mutations weren't detected. Fixed by creating new dict/list copies before reassigning. Bio now correctly pulled from step 3 instead of step 1.

## Known Risks
1. Gemini AI returns sparse data for non-famous people (expected — works great for celebrities)
2. Voice cloning depends on ffmpeg on Railway (installed in Dockerfile)
3. ElevenLabs has rate limits
4. Research takes 15-30s — user might get impatient
5. Video recording requires camera/mic permissions
