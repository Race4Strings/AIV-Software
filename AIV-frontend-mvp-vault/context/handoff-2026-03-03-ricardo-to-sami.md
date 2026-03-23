# Handoff: Ricardo → Sami
## Date: March 3, 2026
## Branches:
- **Frontend**: `ricardo/day4-fixes` (off `sami/day4-documents-deals` which is off `mvp/vault`)
- **Backend**: `mvp/vault`

---

## TL;DR

Fixed Sami's Day 4 issues (toast system, missing document editor page, lint warnings). Overhauled the sidebar to add project switching and chat history. Ported workspace + chat backend from `manish/dev`. Fixed voice cloning pipeline. **Nothing is deployed to Railway yet** — both repos need to be pushed and deployed.

---

## What Was Done Today

### 1. Day 4 Fixes (Frontend — `ricardo/day4-fixes`)

**Toast System Fix**: Sami added a custom Radix toast system (`toast.tsx`, `toaster.tsx`, `use-toast.ts`) but never rendered the `<Toaster>` in the layout. The app already uses `sonner`. Converted all 3 Day 4 pages (`deals/page.tsx`, `deals/[id]/page.tsx`, `twin/documents/page.tsx`) to use `import { toast } from "sonner"`. Deleted the orphaned files.

**Document Editor Page** (`/twin/documents/[id]`): This page was completely missing — Sami's handoff claimed it existed but it didn't. Built it with:
- Split-view layout using `react-resizable-panels` (35% left AIV chat placeholder, 65% right TipTap editor)
- Created `src/components/ui/resizable.tsx` (shadcn wrapper for `react-resizable-panels` v3 which uses `Group`/`Panel`/`Separator` exports with `orientation` prop, NOT the older `PanelGroup`/`PanelResizeHandle` with `direction` prop)
- Inline editable title (blur or Enter to save)
- Auto-save via TipTap's debounced `onSave` callback → `documentApi.updateDocument()`
- Export button (downloads as `.md`)
- Back button to document library
- Left panel is a placeholder for "Document AI coming soon"

**Lint Cleanup**: Removed unused `CardDescription`/`CardTitle` imports from deals page, prefixed unused `twin` variable with underscore in deal detail page.

### 2. Sidebar Overhaul (Frontend — `ricardo/day4-fixes`)

Restructured the sidebar layout to match the new design:

```
AIV Logo + Collapse toggle
─────────────────────────
The Vault
Identity (collapsible)
  → Profile / Voice / Documents / Training
Certification
Deals
─────────── separator ───────────
📁 Project Switcher (dropdown)
  → Lists all workspaces/projects
  → "New Project" option with create dialog
Talk to AIV (+ new chat pen icon)
  → Chat history list per project (recent 15)
  → Delete chat on hover
─────────────────────────
Settings
```

**New files created:**
- `src/lib/api/workspaces.ts` — API client for workspace CRUD (ported from `manish/dev`, uses same endpoints)
- `src/lib/api/chats.ts` — API client for chat CRUD (ported from `manish/dev`, adapted Clone→Twin)
- `src/components/aiv/new-project-dialog.tsx` — Create project dialog with emoji icon picker, name, description

**Modified:**
- `src/components/dashboard/app-sidebar.tsx` — Complete rewrite with project switcher, chat history, new layout

### 3. Voice Cloning Fix (Backend — `mvp/vault`)

The voice cloning pipeline was broken: after onboarding, the Voice Identity page showed "pending" with no cloned voice. Root cause was in `complete_onboarding()` — it created the Twin but never transferred `voice_sample_url` or checked for a pre-cloned `_voice_id` stored in `research_data`.

**Fixed in `app/routers/onboarding.py`:**
- `complete_onboarding()` now checks `research_data["_voice_id"]` (set by background voice cloning task) and transfers it to `twin.voice_id` + sets `voice_status = READY`
- Transfers `voice_sample_urls[0]` from session to `twin.voice_sample_url`
- Cleans `_voice_id` from ALCM data before storing
- Background `_process_voice` task now also sets `voice_sample_url` on the twin when updating

### 4. Workspace + Chat Backend (Backend — `mvp/vault`)

Ported from `manish/dev` branch and adapted for mvp/vault's Twin model (was Clone):

**New files:**
- `app/models/workspace.py` — Workspace model (name, description, icon, is_default, owner)
- `app/models/chat.py` — Chat, ChatParticipant, ChatMessage models (adapted: clone→twin)
- `app/schemas/workspace.py` — Pydantic schemas for workspace CRUD
- `app/schemas/chat.py` — Pydantic schemas for chat CRUD (adapted: ParticipantCloneInfo→ParticipantTwinInfo)
- `app/routers/workspace.py` — Full CRUD: list, create, get, update, delete. Auto-creates "General" default workspace per user.
- `app/routers/chat.py` — Simplified from manish/dev's 691-line version to ~200 lines. CRUD only (create chat in workspace, list chats, get chat detail, send message, get messages, delete chat). No AI orchestration — AI responses still go through existing `/aiv/chat` SSE endpoint.

**Modified:**
- `app/models/__init__.py` — Added Workspace, Chat, ChatParticipant, ChatMessage exports
- `app/routers/__init__.py` — Added workspace_router, chat_router
- `app/schemas/__init__.py` — Added workspace + chat schema exports
- `app/main.py` — Registered workspace_router and chat_router

---

## What's NOT Working / Needs Attention

### 🔴 Critical: Backend Not Deployed
Both repos have unpushed commits. The Railway backend (`aiv-backend-mvp.up.railway.app`) does NOT have the workspace/chat routes yet. This causes 404 errors on the frontend for `/workspaces` endpoint. **You need to:**
1. Push backend `mvp/vault` to origin
2. Deploy to Railway
3. Run Alembic migration for new tables: `workspace_table`, `chat_table`, `chat_participant_table`, `chat_message_table`

### 🔴 Critical: Alembic Migration Needed
The new workspace + chat models need a database migration. Generate and run:
```bash
alembic revision --autogenerate -m "add workspace and chat tables"
alembic upgrade head
```

### 🟡 Project Creation Fails
The "New Project" dialog works on the frontend but the API call fails because the backend isn't deployed. Once deployed + migrated, it should work.

### 🟡 Chat History Not Persisting
Same reason — the chat CRUD endpoints aren't live on Railway. The sidebar shows "0 chats" and the "Talk to AIV" button falls back to navigating to `/aiv` without creating a chat record.

### 🟡 Canvas/Artifact Feature (Not Started)
Ricardo wants the AIV chat to support a "canvas" or "artifact" mode — similar to ChatGPT Canvas or Claude Artifacts. When AIV generates a document during chat, it should open a split-view editor panel on the right side (like the document editor page). This is a significant feature that needs:
- Detection of when AIV's response contains a document/artifact
- A split-view layout on the `/aiv` chat page (chat left, canvas right)
- The canvas should use the TipTap editor component
- Auto-save the generated document to the documents API
- Ability to continue chatting while editing the document

This could be a Day 5 task or a separate spec.

### 🟡 Document Editor Left Panel
The document editor page (`/twin/documents/[id]`) has a placeholder "Document AI coming soon" in the left panel. This should eventually be a scoped AIV chat that can help draft/edit the document.

---

## File Map

### Frontend (`ricardo/day4-fixes` branch)
```
src/app/(dashboard)/twin/documents/[id]/page.tsx  — NEW: Document editor with split-view
src/components/ui/resizable.tsx                    — NEW: shadcn wrapper for react-resizable-panels v3
src/lib/api/workspaces.ts                          — NEW: Workspace API client
src/lib/api/chats.ts                               — NEW: Chat API client
src/components/aiv/new-project-dialog.tsx           — NEW: Create project dialog
src/components/dashboard/app-sidebar.tsx            — REWRITTEN: New sidebar layout
src/app/(dashboard)/deals/page.tsx                 — MODIFIED: sonner toast, removed unused imports
src/app/(dashboard)/deals/[id]/page.tsx            — MODIFIED: sonner toast, unused var fix
src/app/(dashboard)/twin/documents/page.tsx        — MODIFIED: sonner toast
src/components/ui/toast.tsx                        — DELETED
src/components/ui/toaster.tsx                      — DELETED
src/hooks/use-toast.ts                             — DELETED
```

### Backend (`mvp/vault` branch)
```
app/models/workspace.py                            — NEW
app/models/chat.py                                 — NEW (adapted from manish/dev, Clone→Twin)
app/schemas/workspace.py                           — NEW
app/schemas/chat.py                                — NEW (adapted from manish/dev)
app/routers/workspace.py                           — NEW
app/routers/chat.py                                — NEW (simplified from manish/dev)
app/routers/onboarding.py                          — MODIFIED: voice cloning fix
app/models/__init__.py                             — MODIFIED: added exports
app/routers/__init__.py                            — MODIFIED: added exports
app/schemas/__init__.py                            — MODIFIED: added exports
app/main.py                                        — MODIFIED: registered routers
```

---

## Merge Strategy

1. **Backend first**: Push `mvp/vault`, deploy to Railway, run migration
2. **Frontend**: Push `ricardo/day4-fixes`, then merge to `mvp/vault` when ready
3. **DO NOT merge frontend to mvp/vault until backend is deployed** — the workspace/chat features will 404 otherwise

---

## Day 5 Priorities (Suggested)

1. Deploy backend + run Alembic migration for workspace/chat tables
2. Verify project creation and chat history work end-to-end
3. Canvas/artifact feature for AIV chat (split-view document generation)
4. Wire up the document editor left panel with scoped AIV chat
5. Training Portal (from original Day 5 spec)
