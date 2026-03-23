# AIV MVP Specification — Stage 1: The Vault
## Version 1.1 | February 24, 2026
## Source of Truth for All Development

## Product Identity
AIV is identity infrastructure for the digital twin economy. The ALCM (Artificial
Life Conception Model) is AIV's proprietary synthesis engine — the core IP.
AIV (the assistant) powers onboarding, document generation, and twin management.

## Release Strategy
- Stage 1: The Vault (Protect the Asset) — THIS SPEC (MVP)
- Stage 2: The Intake (Monetize the Asset) — Later
- Stage 3: The Multiplier (Scale the Asset) — Later

## Design Language
Premium vault. Dark theme built FROM existing AIV brand colors (deep blues, aurora
gradients, vibrant blue accents from landing page). NOT arbitrary new palette.
Think Ledger crypto wallet meets private bank portal.

## Key Decisions (Resolved Feb 24)
1. AI Model: Use EXISTING Gemini integration for MVP (not Claude). Gemini's native
   Google Search grounding is an advantage for research sub-agents.
2. ALCM JSON: Build deep-merge utility on Day 1 for partial field updates.
3. Voice+Video: KEEP camera/video capture from current onboarding. User is ON CAMERA
   during Q4-Q6. Audio → ElevenLabs. Video → stored for future ALCM visual.
   Existing avatar/caricature generation stays as-is.
4. Voice Gate: 30-second minimum per question before "Next" enables. Subtle progress
   indicator (not countdown). Target 90-120s total across Q4-Q6.
5. Timeline: 5 days with CST+IST timezone rotation (~16-18 productive hrs/day).
6. Theme: Dark using EXISTING brand colors from codebase. Pull hex values from
   landing page. Swap white surfaces → dark. Keep blue accents/aurora glows.
7. Editor: TipTap with split view (chat left, editor right). Resizable panels.
   Fallback: full-screen editor with chat side panel.

## Starting Point
Sami's UpdatedManish.dev branch (both repos) → new branch: mvp/vault

## Page Structure
```
/auth/signin, /auth/signup, /auth/verify  → Auth (restyle to vault)
/                                          → The Vault (homepage)
/onboard                                   → Conversational onboarding with AIV
/twin                                      → Digital Twin Profile
/twin/voice                                → Voice Identity
/twin/documents                            → Document Library
/twin/training                             → Training Portal
/twin/certification                        → Certification Record
/aiv                                       → AIV Assistant
/deals                                     → Deal Tracker
/settings                                  → Account settings
```

## Sidebar Navigation
- The Vault (home) → /
- Identity (expandable) → Profile, Voice, Documents, Training
- Certification → /twin/certification
- AIV Assistant → /aiv
- Deals → /deals
- Settings → /settings

## Two Core Interaction Modes
1. AIV (Conversational AI) — primary interaction layer (onboard, generate docs, train, manage)
2. The Vault (Dashboard) — state management / view layer (status, assets, docs, audit)

## Features (Stage 1 MVP)

### F1: Conversational Onboarding (HIGHEST PRIORITY)
- Conversational flow with AIV capturing everything for ALCM v1.0
- Q1-Q3: Identity capture (name, category, social handles) → triggers research agents
- Q4-Q6: On-camera personality questions (dual purpose: voice cloning + personality depth)
  - 30s minimum recording gate per question, subtle progress indicator
  - Audio → ElevenLabs voice cloning
  - Video → stored for future ALCM visual processing
  - Existing avatar/caricature generation from video stays as-is
- Research results presented conversationally with inline editing
- Governance basics (allowed uses, off-limits, brand conflicts, autonomy)
- Output: ALCM v1.0 + voice clone initiated + certification generated
- 3-5 minutes total for complete v1.0 twin

### F2: The Vault Dashboard (Homepage)
- Zone 1: Twin Identity Card (hero — name, persona, category, cert badge, completeness)
- Zone 2: Asset Overview Grid (visual, voice, personality, commercial, documents)
- Zone 3: Activity Feed (chronological audit trail)

### F3: Digital Twin Profile (/twin)
- 6 tabs: Identity, Personality, Visual, Voice, Commercial, Governance
- View-only — editing via AIV or Training Portal
- ALCM-proprietary data NOT exportable (voice_id, personality internals, behavioral calibration)

### F4: Document Generation & Editor (via AIV)
- Ask AIV to generate docs (contracts, PR guidelines, usage terms, brand briefs, NDAs)
- Split view: AIV chat left, TipTap editor right (resizable panels)
- Basic formatting: bold, italic, underline, headings, section highlighting
- Highlight text → ask AIV to revise specific sections
- Export: all user-generated docs exportable. ALCM internals NOT exportable.

### F5: Voice & Visual Identity (/twin/voice)
- Voice sample management, clone status, TTS demo
- Visual capture from onboarding video
- Branded as "AIV voice technology" — no ElevenLabs mention in UI

### F6: Training Portal (/twin/training)
- Conversational refinement: talk to AIV → AIV proposes ALCM field changes → user confirms
- Targeted writes to specific ALCM fields (not new documents)
- Version history (v1.0 → v1.1 → v1.2) with change log
- Upload materials → AIV processes → proposes changes → user confirms → applied

### F7: Certification (/twin/certification)
- SHA-256 hash of ALCM data + timestamp + consent record + version
- Audit trail timeline (every access, modification, export logged)

### F8: Deal Tracker (/deals) — Stage 2 Preview
- Manual deal entry (brand, type, value, status, dates, notes)
- Statuses: Draft → Negotiation → Contract Sent → Active → Completed → Expired
- Link contracts from Document Library

### F9: Settings
- Profile, team access (invite by email), notification preferences

## Technical Architecture

### Frontend
- Next.js 15, Tailwind CSS (dark theme), shadcn/ui, React Query, TipTap editor
- Web Speech API for press-to-talk, Framer Motion for animations

### Backend
- FastAPI, PostgreSQL (async via SQLAlchemy + asyncpg), Redis, S3/MinIO
- AI: Gemini (existing) for conversations, research, doc generation
- Voice: ElevenLabs API (existing integration)
- Email: Resend + SMTP (existing)

### New Models
Twin, Certification, Document, TrainingSubmission, Deal, AuditLog, OnboardingSession

### New Services
AIVService, ResearchAgentService, VoiceCloningService, CertificationService,
DocumentGenerationService, TwinService

## Team Model
- Ricardo (CTO): Primary builder via Kiro. Pushes to mvp/vault.
- Sami (Developer): Delegated tasks on sami/[task-name] branches only.
- Sami NEVER pushes directly to mvp/vault.

## 5-Day Build Plan
- Day 1: Foundation + Vault Shell (archive, models, migrations, dark theme, sidebar, homepage)
- Day 2: Onboarding + AIV Core (Gemini service, research agents, onboarding UI, voice capture)
- Day 3: Twin Profile + Certification + Voice (ALCM management, hash/proof, ElevenLabs, tabs)
- Day 4: Documents + Editor + Deals (doc generation, TipTap split view, deal tracker)
- Day 5: Training Portal + Polish (conversational training, audit log, integration testing)
