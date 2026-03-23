# Handoff: Ricardo → Sami
## Date: February 25, 2026 (Night CST)
## Branch: mvp/vault (both repos)

---

## What I Did Today

1. **Full codebase audit** — Read every file in both repos (frontend + backend) and
   documented the full architecture, all models, routers, services, and components.

2. **Diffed your UpdatedManish.dev changes** against manish/dev baseline. Your work is
   solid — sidebar improvements, circular avatars, tab patterns, contact search
   enhancements are all being kept and built upon.

3. **Created the MVP spec** for the pivot (Stage 1: The Vault). This is in the `context/`
   folder as files 01-04. Read `00-README-START-HERE.md` first for the full walkthrough.

4. **Created the `mvp/vault` branch** on both repos off your `UpdatedManish.dev`. This is
   where all MVP work happens. The context files and spec are committed here.

5. **Archived old backend code** — Moved all clone/chat/tool/training/contact/workspace/
   notification/admin routers, services, models, and schemas to `_archive/`. Updated
   `main.py`, all `__init__.py` files. Removed tool_monitoring from the app lifespan.
   Removed Workspace creation from signup flow. Removed Clone relationship from User model.
   Archived old utility scripts. Backend imports cleanly — only auth and upload routers remain.

6. **Archived old frontend code** — Moved clone/chat/tool/producer/onboard components,
   portal pages, and old API modules to `_archive/`. Rewrote `page.tsx` as a minimal
   vault placeholder (landing page + auth-gated stub). Simplified sidebar and site-header
   to clean shells. Updated `tsconfig.json` to exclude `_archive/` from builds.
   Frontend builds with zero errors.

7. **Docker & config cleanup** — Reverted Docker port changes back to defaults
   (5432 for Postgres, 6379 for Redis). Fixed `SigninRequest` password validation
   back to `min_length=1` (only `SignupRequest` enforces `min_length=8`).

8. **Created page stubs** for all new vault routes: `/twin`, `/twin/voice`,
   `/twin/documents`, `/twin/training`, `/twin/certification`, `/aiv`, `/deals`,
   `/settings`, `/onboard`. All compile and render as placeholder pages.

9. **Created `app/utils/`** directory on backend with `__init__.py` — ready for the
   ALCM deep-merge utility (Task 6).

## Current State

- Both repos are on `mvp/vault` branch, pushed to GitHub
- Old code is archived in `_archive/` on both repos (not deleted, just moved)
- Frontend builds cleanly with all new route stubs in place
- Backend imports cleanly with only kept routers (auth, upload)
- Railway `dev` environment is still running the old `manish/dev` code (don't touch Railway)

## What You Should Work On

Start with the **backend tasks** — they're the foundation everything else builds on.
Since I already did the archival and cleanup, your first task is creating the new models.

### Your Tasks (in priority order):

**Task 5: Create new backend models**
- All 7 new models: Twin, Certification, Document, TrainingSubmission, Deal, AuditLog, OnboardingSession
- Follow existing patterns from User/Organization models
- Add `twins` relationship to User model
- See `03-spec-design.md` for the ALCM JSON schema structure

**Task 6: ALCM deep-merge utility**
- Create `app/utils/alcm_merge.py` with recursive dict merge function
- The `app/utils/` directory is already created and ready

**Task 7: Alembic migration**
- Generate and apply migration for all new models
- Verify tables exist in PostgreSQL

**Task 8: Pydantic schemas**
- Create request/response schemas for all new models
- CRITICAL: `voice_id` must NEVER appear in any response schema

**Task 9: Skeleton routers**
- Basic CRUD endpoints for all new models
- Register in `main.py` and `routers/__init__.py`

If you get through all 5 of those, continue with:

**Task 10: Certification service** — SHA-256 hash generation
**Task 12: Update seed script** — New tables, demo twin with ALCM data

## What You Should NOT Touch

- **Frontend** — I'll handle the frontend (dark theme, sidebar, homepage) when I wake up
- **Railway** — Don't deploy anything or change Railway config
- **AI service abstraction (Task 11)** — I want to design this myself
- **The `context/` folder** — Don't modify my files. Add your own handoff file when done.
- **`mvp/vault` branch directly** — Create `sami/day1-backend-foundation` (or similar),
  work there, push it. I'll review and merge.

## Important Notes

- The spec files (01-04) are your source of truth. If something is unclear, check there first.
- `voice_id` on the Twin model must NEVER appear in any API response schema — this is core IP
- JSON fields (alcm_data, commercial_terms, governance) should support partial updates (merge, not replace)
- Follow existing code patterns for everything (auth middleware, session handling, error responses)
- All data-modifying endpoints require authentication via existing session middleware

## When You're Done

1. Push your branch to GitHub
2. Create a handoff file: `context/handoff-2026-02-26-sami-to-ricardo.md` with:
   - What you built/changed
   - What's working, what's not
   - Any blockers or questions
   - What you think I should pick up next
3. Message me on WhatsApp that you're done

See you in the morning. Let's get this done. 🔒
