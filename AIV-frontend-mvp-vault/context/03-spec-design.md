# Design: AIV MVP — Stage 1: The Vault (Day 1: Foundation & Shell)

## Architecture Overview

Day 1 establishes the skeleton for both frontend and backend. No feature logic — just the
structural foundation that Days 2-5 build on.

```
┌─────────────────────────────────────────────────────────┐
│                    AIV-frontend                          │
│  Next.js 15 (App Router) + Tailwind (dark) + shadcn/ui  │
│                                                          │
│  /auth/*          → Auth pages (restyled dark)           │
│  /                → Vault homepage (3 zones, placeholder) │
│  /twin/*          → Twin profile stubs (6 sub-pages)     │
│  /aiv             → AIV assistant stub                   │
│  /deals           → Deal tracker stub                    │
│  /settings        → Settings stub                        │
│  /onboard         → Onboarding stub                      │
│                                                          │
│  Sidebar: Vault nav (Identity expandable, Cert, AIV,     │
│           Deals, Settings)                               │
└──────────────────────┬──────────────────────────────────┘
                       │ API calls (Day 2+)
┌──────────────────────▼──────────────────────────────────┐
│                    AIV-Backend                            │
│  FastAPI + SQLAlchemy async + PostgreSQL + Redis          │
│                                                          │
│  Kept routers: auth, contact, upload, workspace,         │
│                notification, admin                       │
│  New routers:  twins, certification, documents,          │
│                training, deals, audit, onboarding        │
│                                                          │
│  New models:   Twin, Certification, Document,            │
│                TrainingSubmission, Deal, AuditLog,        │
│                OnboardingSession                         │
│                                                          │
│  New services: CertificationService, AIService (abstract) │
│  Utility:      ALCM deep-merge for partial JSON updates  │
└─────────────────────────────────────────────────────────┘
```

## Frontend Design

### Theme Strategy
The codebase already has oklch-based CSS variables with a `.dark` variant in `globals.css`.
The approach is to make dark the default by adding the `dark` class to `<html>` in the
root layout, then refine the dark palette to incorporate the brand's deep blue/indigo tones.

Current `.dark` values use neutral grays (oklch with 0 chroma). The vault aesthetic needs
slight blue chroma injected into backgrounds and borders to match the brand's deep blue
aurora feel. The primary indigo palette (already in tailwind.config.js) provides the accent system.

Key CSS variable overrides:
- `--background`: near-black with slight blue tint (not pure neutral)
- `--card` / `--popover`: slightly elevated dark surface
- `--sidebar`: darker than card for visual hierarchy
- `--border` / `--input`: subtle blue-tinted borders
- `--primary`: indigo accent (existing primary-500 #6366f1)
- Keep existing `--destructive` and `--warning` values

### Sidebar Architecture
Build on Sami's existing `app-sidebar.tsx` structure. The sidebar uses shadcn's `Sidebar`
component with `SidebarMenu`, `SidebarMenuItem`, `SidebarMenuButton` primitives.

The "Identity" section uses a collapsible group (`SidebarGroup` with `Collapsible`) containing
4 sub-items. All other nav items are top-level.

Active route detection via `usePathname()` — highlight the matching nav item.

### Homepage Layout
Three stacked zones using Tailwind grid/flex:
- Zone 1 (hero): Full-width card with CSS border glow effect (box-shadow with indigo tint)
- Zone 2 (grid): `grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3` responsive layout
- Zone 3 (feed): Simple `<ul>` with monospace timestamps

### Page Stubs
Each stub page is a server component that renders within the authenticated layout shell
(sidebar + header). The layout wraps all non-auth routes.

### Auth Restyling
Add `dark` class to the auth layout's root element. The existing form components (shadcn Input,
Button, Label) will inherit dark styles from the CSS variable overrides. Minimal changes needed
beyond ensuring the background and text colors are correct.

## Backend Design

### Model Relationships
```
User ──1:N──> Twin ──1:N──> Certification
                   ──1:N──> Document
                   ──1:N──> TrainingSubmission
                   ──1:N──> Deal
                   ──1:N──> AuditLog
                   ──1:1──> OnboardingSession
```

### ALCM Data Structure
The `alcm_data` JSON column on Twin holds the structured digital twin profile:
```json
{
  "personality": {
    "communication_style": "string",
    "tone_descriptors": ["string"],
    "values": ["string"],
    "no_go_topics": ["string"],
    "behavioral_traits": ["string"],
    "public_vs_private": "string",
    "humor_style": "string",
    "passions": ["string"]
  },
  "knowledge": {
    "career_highlights": ["string"],
    "expertise_areas": ["string"],
    "notable_works": ["string"],
    "brand_affiliations": ["string"],
    "education": "string",
    "awards": ["string"]
  },
  "social_media": {
    "instagram": "string",
    "twitter": "string",
    "tiktok": "string",
    "youtube": "string",
    "linkedin": "string",
    "other": [{"platform": "string", "handle": "string"}]
  },
  "visual": {
    "image_urls": ["string"],
    "visual_style_notes": "string",
    "brand_colors": ["string"]
  }
}
```

### Deep-Merge Utility
For partial ALCM updates, implement a recursive merge that:
- Merges dicts recursively (doesn't replace entire sub-objects)
- Replaces lists entirely (no list merging — too ambiguous)
- Handles None values (skip, don't overwrite with None)
- Returns the merged result

Example: updating `{"personality": {"no_go_topics": ["divorce"]}}` merges into existing
alcm_data without touching `personality.values` or any other field.

### AI Service Abstraction
```python
# Abstract interface
class AIServiceBase(ABC):
    async def generate_response(self, prompt, context, stream=False) -> str | AsyncGenerator
    async def generate_with_search(self, query, context) -> dict
    async def generate_document(self, template, parameters) -> str

# Concrete implementation for MVP
class GeminiAIService(AIServiceBase):
    # Uses existing gemini_service.py patterns
    # Adds streaming support via httpx streaming
    # Adds Google Search grounding for research
```

This lets us swap to Claude or any other model later by implementing a new subclass
and changing the dependency injection.

### Router Patterns
All new routers follow existing codebase conventions:
- `Depends(require_auth)` for authentication
- `Depends(get_db)` for database sessions
- Pydantic schemas for request/response validation
- HTTPException for error responses
- UUID path parameters for entity IDs

### Certification Flow
```
POST /twins/{id}/certification
  1. Load twin's current alcm_data
  2. Serialize deterministically (json.dumps with sort_keys=True)
  3. Generate SHA-256 hash
  4. Create Certification record (hash, version, timestamp, consent)
  5. Update twin.certified_at and twin.status = "certified"
  6. Create AuditLog entry
  7. Return certification proof
```

## File Organization

### Frontend new files:
```
src/app/
├── page.tsx                    (modify — vault homepage)
├── layout.tsx                  (modify — add dark class, vault layout)
├── twin/
│   ├── page.tsx                (new — twin profile stub)
│   ├── voice/page.tsx          (new)
│   ├── documents/page.tsx      (new)
│   ├── training/page.tsx       (new)
│   └── certification/page.tsx  (new)
├── aiv/page.tsx                (new)
├── deals/page.tsx              (new)
├── settings/page.tsx           (new)
├── onboard/page.tsx            (new)
└── auth/                       (modify — restyle dark)
src/components/dashboard/
├── app-sidebar.tsx             (modify — vault nav)
└── site-header.tsx             (modify — vault styling)
src/app/globals.css             (modify — dark theme defaults)
_archive/                       (new — archived old code)
```

### Backend new files:
```
app/models/
├── twin.py                     (new)
├── certification.py            (new)
├── document.py                 (new)
├── training_submission.py      (new)
├── deal.py                     (new)
├── audit_log.py                (new)
└── onboarding_session.py       (new)
app/schemas/
├── twin.py                     (new)
├── certification.py            (new)
├── document.py                 (new)
├── training_submission.py      (new)
├── deal.py                     (new)
├── audit_log.py                (new)
└── onboarding_session.py       (new)
app/routers/
├── twin.py                     (new)
├── certification.py            (new)
├── document.py                 (new)
├── training.py                 (new — replaces archived training router)
├── deal.py                     (new)
├── audit.py                    (new)
└── onboarding.py               (new — replaces archived onboard router)
app/services/
├── certification_service.py    (new)
├── ai_service.py               (new — abstract + Gemini implementation)
└── alcm_utils.py               (new — deep-merge utility)
app/utils/
└── alcm_merge.py               (new — or in services/alcm_utils.py)
_archive/                       (new — archived old code)
```
