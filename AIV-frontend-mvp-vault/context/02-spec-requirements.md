# Requirements: AIV MVP — Stage 1: The Vault (Day 1: Foundation & Shell)

## Context
AIV is pivoting from an AI clone/chat platform to a digital twin identity infrastructure platform.
The ALCM (Artificial Life Conception Model) is the core IP — the proprietary synthesis engine that
produces verified digital twins. This spec covers Day 1 of a 5-day MVP build.

Reference documents:
- `context/01-mvp-spec-stage1-vault.md` (MVP specification)
- `context/03-spec-design.md` (architecture and design)

## Requirement 1: Branch Setup
Both repos (AIV-frontend, AIV-Backend) must have a new `mvp/vault` branch created off
`UpdatedManish.dev` (Sami's latest). All Day 1 work happens on this branch. The old app
on `UpdatedManish.dev` and `manish/dev` stays intact.

## Requirement 2: Code Archival
Old clone/chat/tool code must be moved to `_archive/` directories (not deleted) in both repos.
After archival, both apps must start cleanly with no import errors or references to archived code.

### Frontend archival targets:
- `src/components/producer/` (old clone creation wizard)
- `src/components/onboard/` (old video-based onboarding)
- `src/components/dashboard/activation/` (clone activation)
- `src/components/tools/` (tools page components)
- `src/app/portal/` (old portal pages)
- `src/app/tools/` (old tools page)
- `src/lib/api/clone.ts` (clone API calls)
- `src/lib/api/training.ts` (training API calls)
- `src/lib/api/tools.ts` (tools API calls)

### Frontend KEEP list:
- All auth (pages, API, middleware)
- `src/lib/api/client.ts`, `upload.ts`
- All `src/components/ui/` (shadcn primitives)
- `src/components/dashboard/` (app-sidebar, site-header, nav-user, logo — simplified to clean shells)

### Backend archival targets:
- Routers: clone, chat, training, tool, onboard
- Services: clone_inference, dimension_expander, synthesis_service, orchestration,
  gmail_adapter, tool_execution, tool_monitoring, training_analyzer, elevenlabs_service
- Models: clone, chat, tool, training
- Schemas: clone, chat, tool, training

### Backend KEEP list:
- Routers: auth, upload
- Services: auth_service, email_service, gemini_service, storage_service
- Models: user, organization, otp
- All middleware, config, database, main.py, Docker, Alembic infrastructure

## Requirement 3: Dark Vault Theme (Frontend)
The entire frontend must use a dark theme built FROM the existing AIV brand colors.
The codebase already has a `.dark` CSS class variant in `globals.css` using oklch values,
and a primary indigo palette (primary-400: #818cf8, primary-500: #6366f1, primary-600: #4f46e5)
in `tailwind.config.js`. The brand font is Satoshi.

The approach:
- Make the `.dark` variant the DEFAULT (always-on, no toggle)
- Derive dark surfaces from the existing deep blue/indigo brand palette
- Keep the indigo accent colors for CTAs, active states, badges
- Add vault-specific semantic colors: success (green for "certified"), warning (amber for "processing"), danger (red for "expired")
- Override shadcn CSS variables so all primitives render dark by default
- No light mode. No theme toggle. Dark is the only theme.

The vault should feel like a continuation of the landing page aesthetic (deep blues, aurora gradients),
not a generic dark mode or an arbitrary new palette.

## Requirement 4: Sidebar Navigation (Frontend)
The sidebar must be restructured for the vault navigation. Remove chat lists, workspace switcher,
and clone-related items. Keep Sami's improvements (trigger placement, component hierarchy, logo size).

New structure:
```
[AIV Logo]
── The Vault          (icon: Shield)        → /
── Identity           (icon: Fingerprint)   → expandable
   ├── Profile                              → /twin
   ├── Voice                                → /twin/voice
   ├── Documents                            → /twin/documents
   └── Training                             → /twin/training
── Certification      (icon: BadgeCheck)    → /twin/certification
── AIV Assistant      (icon: Bot)           → /aiv
── Deals              (icon: Briefcase)     → /deals
── Settings           (icon: Settings)      → /settings
```

## Requirement 5: Vault Homepage Layout (Frontend)
The main dashboard (`/`) must display three zones with placeholder content:
- Zone 1: Twin Identity Card (hero — name, persona, category, cert badge, completeness, "Refine with AIV" CTA)
- Zone 2: Asset Overview Grid (5 panels: Visual, Voice, Personality, Commercial, Documents)
- Zone 3: Activity Feed (chronological list of recent actions)

No API calls — pure layout with placeholder data.

## Requirement 6: Page Stubs (Frontend)
All new routes must have stub pages with proper Next.js App Router setup:
`/twin`, `/twin/voice`, `/twin/documents`, `/twin/training`, `/twin/certification`,
`/aiv`, `/deals`, `/settings`, `/onboard`

Each stub: sidebar + header shell, centered title, "Coming soon" subtitle.

## Requirement 7: Auth Pages Restyling (Frontend)
Existing auth pages (signin, signup, verify) must be restyled to match the dark vault aesthetic.
Keep all existing functionality. Dark backgrounds, light text, indigo accent buttons.

## Requirement 8: New Database Models (Backend)
Create 7 new SQLAlchemy models following existing codebase patterns:
- **Twin** (replaces Clone) — core identity model with ALCM JSON, voice, commercial terms, governance
- **Certification** — SHA-256 hash + timestamp + consent record per version
- **Document** — generated docs with type, content, export control
- **TrainingSubmission** — proposed ALCM changes with target fields and status workflow
- **Deal** — licensing deal tracking with status transitions
- **AuditLog** — action logging for compliance
- **OnboardingSession** — onboarding progress tracking with research data and conversation history

Critical: Twin.voice_id must NEVER appear in any API response schema.

## Requirement 9: ALCM Deep-Merge Utility (Backend)
Build a utility function for partial JSON updates to the `alcm_data` field.
The Training Portal depends on targeted field updates (e.g., updating `personality.no_go_topics`
without clobbering `personality.values`). This must be solid from Day 1.

## Requirement 10: Alembic Migration (Backend)
Generate and apply an Alembic migration for all new models. All tables must be created
in PostgreSQL. Migration must apply cleanly on a fresh database.

## Requirement 11: Pydantic Schemas (Backend)
Create request/response schemas for all new models. Follow existing patterns in `app/schemas/`.
Twin response schema must EXCLUDE `voice_id`. Support partial updates for JSON fields.

## Requirement 12: Skeleton Routers (Backend)
Create functional CRUD routers for: twins, certification, documents, training, deals, audit, onboarding.
All data-modifying endpoints require authentication via existing session middleware.
Register all new routers in `main.py`.

## Requirement 13: Certification Service (Backend)
Implement `CertificationService` with SHA-256 hash generation of ALCM data (deterministic
serialization with sorted keys) and proof-of-creation record generation.

## Requirement 14: AI Service Abstraction (Backend)
The existing `gemini_service.py` is used for MVP. Design the AI integration with a clean
abstraction layer so the underlying model can be swapped (e.g., to Claude or other models)
in the future without changing calling code. For MVP, Gemini handles: conversational responses,
web-grounded research (via Google Search grounding), and document generation.
Add a streaming response capability for the AIV conversational interface.

## Requirement 15: Update Seed Script (Backend)
Update `init_tables.py` to create all new tables and seed a demo twin with sample ALCM data.
Use stronger demo credentials than the current `demo@12345`.

## Requirement 16: Docker & Config Cleanup (Backend)
Revert Sami's Docker port changes (5433→5432, 6380→6379) to standard defaults.
Fix password validation: `min_length=8` on `SignupRequest` only, `SigninRequest` stays at `min_length=1`.
