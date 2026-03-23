# AIV MVP Build — Context & Spec Guide for Sami
## Date: February 25, 2026
## From: Ricardo

---

Hey Sami — this folder contains everything you need to understand the pivot and
start contributing to the MVP build. I created a formal spec that we'll
follow for the entire build. Read this file first, then the others in order.

## What Happened

We're pivoting AIV from the AI clone/agentic assistant platform to a **digital twin
identity infrastructure platform** called "The Vault." The ALCM (Artificial Life
Conception Model) — the synthesis engine that creates the digital twin — is still
the core product. What's changing is the wrapper: instead of chat-based AI clones,
we're building a premium vault where high-profile individuals create, certify,
protect, and monetize their digital twin.

Your `UpdatedManish.dev` branch is the starting point. Your sidebar improvements,
circular avatars, "Profile" label, tab patterns, and component hierarchy are all
being kept and built upon. Good work on those.

## The 5 Files in This Folder

Read them in numbered order:

### 00 — This file (README)
You're reading it. Explains the approach and how to use the other files.

### 01 — MVP Spec: Stage 1 — The Vault
`01-mvp-spec-stage1-vault.md`

This is the **product spec** — WHAT we're building. It covers:
- Product identity and design language (premium vault, dark theme)
- All features (F1-F9): onboarding, vault dashboard, twin profile, document
  generation, voice identity, training portal, certification, deal tracker, settings
- Page structure and routing
- Technical architecture decisions
- 5-day build plan
- Key decisions that were already resolved (use Gemini not Claude, keep video
  capture, dark theme from existing brand colors, etc.)

**Read this to understand the product vision and what each feature does.**

### 02 — Spec Requirements
`02-spec-requirements.md`

This is the **technical requirements** document — the formal list of 16 requirements
that Day 1 must satisfy. It covers both frontend and backend:
- Branch setup, code archival (what to keep vs archive)
- Dark theme approach
- Sidebar navigation structure
- Homepage layout (3 zones)
- New database models (7 models)
- ALCM deep-merge utility
- Migrations, schemas, routers
- AI service abstraction (vendor-agnostic)

**Read this to understand the technical scope and constraints.**

### 03 — Spec Design
`03-spec-design.md`

This is the **architecture and design** document — HOW we're building it:
- System architecture diagram
- Theme strategy (oklch CSS variables, existing brand colors)
- ALCM JSON schema structure (the exact shape of the twin data)
- Deep-merge utility design
- AI service abstraction pattern (abstract base → Gemini implementation)
- Certification flow
- File organization (what new files go where in both repos)

**Read this to understand the technical approach and file structure.**

### 04 — Spec Tasks
`04-spec-tasks.md`

This is the **task checklist** — the actual work items with checkboxes. 18 tasks
covering both repos. Tasks are ordered by dependency:
1. Branch setup
2-3. Archive old code (frontend + backend)
4. Docker/config cleanup
5. New backend models
6. ALCM deep-merge utility
7. Alembic migration
8. Pydantic schemas
9. Skeleton routers
10. Certification service
11. AI service abstraction
12. Seed script update
13. Dark vault theme
14. Sidebar navigation
15. Vault homepage layout
16. Page stubs
17. Auth pages restyling
18. Quality checks

**This is your checklist. When I hand off tasks to you, I'll reference specific
task numbers from this list.**

## How We Work Together

### Branch Strategy
```
mvp/vault (Ricardo owns — main development branch)
  └── sami/[task-name] (your feature branches)
```

- I push directly to `mvp/vault`
- You create `sami/[descriptive-task]` branches off the latest `mvp/vault`
- You NEVER push directly to `mvp/vault` — only I merge
- Before starting work, always `git pull origin mvp/vault` to get my latest

### Handoff Protocol
Each handoff includes:
1. What was built/changed
2. Current state (what works, what's broken)
3. What you should work on next (specific task numbers)
4. What you should NOT touch

I'll put my handoff notes in this same `context/` folder, dated. You do the same —
create a markdown file summarizing what you did, what's working, any blockers, and
push it to your branch. I'll read it when I wake up.

Example: `context/handoff-2026-02-25-ricardo-to-sami.md`
Example: `context/handoff-2026-02-26-sami-to-ricardo.md`

### If You Have Doubts
- If a task is unclear, skip it and move to the next one. Note what confused you
  in your handoff file.
- If something in the spec conflicts with what you see in the code, trust the spec
  but note the conflict.
- If you're unsure whether to keep or archive something, keep it. We can always
  archive later.
- Ask your LLM to help — feed it the spec files for context.

### Quality Bar
- Every push must compile (`npm run build` for frontend, `uvicorn` starts for backend)
- No orphaned imports or broken references
- Follow existing code patterns (don't introduce new conventions)
- Dark theme must be consistent (no white flashes)

## Quick Start

1. Read files 01-04 in order
2. Read Andres's master doc in the WhatsApp group for the full product vision
3. Read the handoff file `handoff-2026-02-25-ricardo-to-sami.md` for your assigned tasks
4. Pull `mvp/vault`, create your branch `sami/[task-name]`, start working
5. When done, push your branch + your own handoff notes, let me know on WhatsApp

Let's build this. 🔒
