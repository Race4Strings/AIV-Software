# Handoff: Ricardo → Sami
## Date: February 27, 2026 (Final Update — Late Night)
## Branch: `mvp/vault` (both repos — deployed to Railway)

---

## TL;DR

Days 1-3 are done. Onboarding flow is fully working and polished. Research agent overhauled.
Your job is Day 4: Documents + TipTap Editor + Deals. Full spec in `.kiro/specs/mvp-vault-day4/tasks.md`.

---

## What Changed Since Last Handoff

### Onboarding Polish (Frontend — 4 commits)
- Removed duplicate Toaster (was rendering twice)
- Replaced fake "AIV" text logo with real `/aiv.svg` on onboarding welcome
- Fixed `.env.local` pointing to wrong backend (`api2.aiv.chat` → Railway mvp)
- Research review page: no longer dumps raw JSON. Now shows human-friendly cards with icons, badges for arrays, readable text, edit-in-place per section
- Video questions revised:
  - Q4: "What drives you creatively?" (unchanged)
  - Q5: "A moment that changed everything" (personality probe)
  - Q6: "The ultimate conversation" (intellectual interests probe)
- Video recording: stop button disabled until 30s minimum, timer moved to top-right

### Research Agent Overhaul (Backend — 1 commit)
- 4 parallel Google-grounded searches instead of 3
- Strict rules: only verified facts, no gossip/rumors/fan opinions
- ALCM expanded to 5 sections: identity, personality, knowledge, social_media, commercial
- New `identity` section with: public_bio, known_for, causes, creative_philosophy

### Verified Working
- Full onboarding flow tested via Playwright (localhost + Railway)
- Q1 → Q2 → Q3 → Q4 (video) all transition correctly
- Research triggers after Q3, runs in parallel during video steps
- Zero API errors on Railway

---

## Your Day 4 Work

Full spec: `.kiro/specs/mvp-vault-day4/tasks.md` — 7 tasks.

**Summary: Document Library with TipTap editor (split view) + Deal Tracker.**
**Backend is 100% done — this is all frontend.**

### Task Order
1. Install deps + create API clients (documents.ts, deals.ts)
2. Document Library page (/twin/documents) — list, filters, CRUD
3. TipTap editor component — editor + toolbar + status bar
4. Document Editor page (/twin/documents/[id]) — split view with AIV chat
5. Deal Tracker page (/deals) — list, create dialog, status badges
6. Deal Detail page (/deals/[id]) — view/edit, status transitions
7. Quality pass — build, dark mode, mobile

### Key Technical Notes

```bash
npm install @tiptap/react @tiptap/starter-kit @tiptap/extension-underline @tiptap/extension-placeholder react-resizable-panels
```

- Split view: `react-resizable-panels` — left 35% AIV chat, right 65% TipTap editor
- Auto-save: debounce 1.5s → PUT /twins/{twin_id}/documents/{doc_id}
- Status bar: "Saved" / "Saving..." / "Error"

### Deal Status Transitions (must match backend)
```
Draft → Negotiation
Negotiation → Contract Sent, Draft
Contract Sent → Active, Negotiation
Active → Completed, Expired
Completed → (terminal)
Expired → (terminal)
```

### Backend Endpoints (ALL EXIST — no backend work needed)

Documents:
- `POST /twins/{twin_id}/documents` — create
- `GET /twins/{twin_id}/documents` — list (?doc_type=, ?status=)
- `GET /twins/{twin_id}/documents/{doc_id}` — get single
- `PUT /twins/{twin_id}/documents/{doc_id}` — update
- `DELETE /twins/{twin_id}/documents/{doc_id}` — delete

Deals:
- `POST /deals` — create (body: { data: DealCreate, twin_id: UUID })
- `GET /deals` — list all user's deals
- `GET /deals/{deal_id}` — get single
- `PUT /deals/{deal_id}` — update
- `PUT /deals/{deal_id}/status` — transition (body: { new_status: string })

### Patterns to Follow
- `apiClient` from `@/lib/api/client` for all API calls
- `fetchTwins()` from `@/lib/api/twins` to get twin_id
- shadcn/ui components (Card, Button, Dialog, Badge, etc.)
- `EmptyState` from `@/components/shared/empty-state`
- `StatusBadge` from `@/components/shared/status-badge`

---

## ⚠️ Git Workflow — CRITICAL

```bash
git fetch origin mvp/vault
git checkout -b sami/day4-documents-deals origin/mvp/vault

# Verify:
git log --oneline -3
# Should show: 45e144a, f640766, 6d46f47
```

Do NOT branch from `main`. The `main` branch is missing Days 1-3.

---

## Test Accounts
- `demo@vault.dev` / `VaultDemo#2026`
- `rickycor777@gmail.com` / `VaultDemo#2026`
- Dev mode OTP bypass active on Railway

## Railway URLs
- Frontend: https://aiv-frontend-mvp.up.railway.app
- Backend: https://aiv-backend-mvp.up.railway.app
- Swagger: https://aiv-backend-mvp.up.railway.app/docs

---

## What I'm Working On (Parallel)
- Day 5 planning (Training Portal + Final Polish)
- Continued QA on voice cloning end-to-end
- Will review your Day 4 branch when you push

Hit me up on Discord if anything is unclear. Don't guess — ask.
