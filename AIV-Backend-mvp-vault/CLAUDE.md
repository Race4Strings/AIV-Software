# AIV Platform Guide — Strategic & Product Specification

**Version: 1.0 | March 2026**
**Document ID: AIV-PLATFORM-GUIDE**
**This document is the authoritative source for platform development. Where companion documents conflict with this guide, this guide governs.**

> **Companion doc:** [CLAUDE_TECHNICAL.md](CLAUDE_TECHNICAL.md) — SQL schemas for all 31 tables, REST API endpoint definitions, ALCM client SDK interface, file-by-file migration map, docker-compose, target .env, and acceptance criteria per phase.

---

## Quick Reference

| What you need | Where to find it |
|---|---|
| What AIV is and does | Section 1 |
| Two-service architecture diagram | Section 2 |
| What's changing from the current codebase | Section 3 |
| New Twin table (slim reference) | Section 4 |
| Twin status lifecycle | Section 5 |
| Assistant modes and training area | Section 6 |
| Onboarding pipeline (import-first) | Section 7 |
| Guardrails vs. licensing rules | Section 8 |
| Licensing Portal / deal lifecycle | Section 9 |
| ALCM Identity Package delivery | Section 10 |
| Mid-deal change scenarios | Section 11 |
| Commission and payments | Section 12 |
| Navigation structure | Section 13 |
| Dashboard (command center) | Section 14 |
| Organization accounts | Section 15 |
| AIV Seal (identity provenance) | Section 16 |
| Visual direction | Section 17 |
| Platform partnership fee framing | Section 18 |
| Legal agreements | Section 19 |
| Security architecture | Section 20 |
| Stage-aligned feature rollout | Section 21 |
| Key technical decisions | Section 22 |
| All database tables (list) | Section 23 |
| All services (list) | Section 24 |
| ALCM API endpoints | Section 25 |
| What NOT to do | Section 26 |
| Migration phases | Section 27 |

---

## 1. What This Project Is

AIV is identity infrastructure for the digital twin economy. It captures, structures, validates, governs, and licenses digital representations of public figures and fictional characters — enabling any downstream tool (voice synthesis, avatar generation, conversational AI) to produce output that is genuinely faithful to that person.

AIV does NOT synthesize voice, produce images, or generate video. It produces and licenses the structured identity data that makes those outputs accurate. Third-party tools consume AIV's data to render the experience. AIV controls the identity. The tools control the rendering. This makes every generation company a potential integration partner, not a competitor.

**Revenue:** 30% commission on first licensing deal per twin, 25% on second, 20% thereafter. A $997/month platform partnership fee (not a subscription — see Section 18) activates when the first deal executes or 90 days post-Stage-1-completion, whichever comes first. The full build and refinement period before that is completely free.

**Clone types for MVP:** Public Figure Replica (primary revenue) and Fictional Character / Brand Persona (secondary). Historical figures, brands as identity owners, and composite archetypes are deferred to the roadmap — the architecture must not preclude them but zero engineering effort is spent on them now.

---

## 2. Architecture — Two Services, One Frontend

```
┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│   Next.js 15     │────▶│  AIV Platform    │────▶│  ALCM API        │
│   Frontend       │     │  (FastAPI :8000) │     │  (FastAPI :8001) │
│   :3001          │     │                  │     │                  │
│  UI, navigation, │     │  Accounts, deals │     │  Identity data,  │
│  training area   │     │  licensing, pay- │     │  classification, │
│                  │     │  ments, config,  │     │  personality,    │
│                  │     │  notifications   │     │  generation,     │
│                  │     │                  │     │  validation      │
└──────────────────┘     └────────┬─────────┘     └────────┬─────────┘
                                 │                         │
                          ┌──────┴───────┐           ┌─────┴────────┐
                          │ PostgreSQL  │           │ PostgreSQL  │
                          │ Redis       │           │ (own schema │
                          │ S3/MinIO    │           │  or own DB) │
                          └─────────────┘           └─────────────┘
```

**The Platform** (:8000) is the product people use. Accounts, the assistant, the training area, the Licensing Portal, deals, payments, guardrail/licensing-rules configuration, notifications, audit trails. It NEVER stores personality data, psychographic scores, dimensional values, or Bayesian distributions.

**The ALCM API** (:8001) is the identity intelligence engine. Psychographic classification, dimensional scoring, personality derivation, identity-consistent generation, personality validation, fidelity measurement, adaptive learning. Pure data processing — no user accounts, no billing, no deal management.

**The rule:** Platform calls ALCM API. ALCM API never calls platform. Data flows one direction.

---

## 3. Current State of the Codebase

The repo contains a **monolithic prototype** where platform and identity engine are combined. Being migrated to the two-service architecture.

**What exists and works:**
- FastAPI backend on :8000 with async SQLAlchemy + PostgreSQL
- Next.js 15 frontend on :3001 with proxy rewrites to backend
- Redis session auth (signup → email OTP → signin)
- Twin creation with JSONB `alcm_data` blob holding all identity data
- 6-step onboarding questionnaire (3 text + 3 video)
- 4-parallel Gemini research agent that scrapes public info and synthesizes identity data
- ElevenLabs voice cloning (video → FFmpeg → clone → TTS)
- Polygon blockchain anchoring (SHA-256 → smart contract)
- Workspace-based chat with SSE streaming via Gemini
- Document management (catch-all, 8 doc types)
- Deal tracking (basic CRUD with status transitions)
- Training submissions (propose/approve/reject ALCM changes)
- Audit logging, S3/MinIO storage

**What needs to change:**
1. Extract ALCM into separate service (:8001) → `alcm_data`, research agent, voice cloning move out
2. Restructure platform schema → Twin becomes slim reference, catch-all tables become purpose-built
3. Replace workspace/chat with the assistant and training area under Identity
4. Build the Licensing Portal (doesn't exist yet — this is what generates revenue)
5. Add missing infrastructure → payments, notifications, guardrail versioning, consent ledger, org accounts in UI

---

## 4. The Twin Table — The Most Important Change

**Current:** `twins` holds everything — personality, voice IDs, commercial terms, governance, completeness scores — all in one row with JSONB blobs.

**Target:** `twins` is a slim reference record. Identity data → ALCM API (via `alcm_twin_id`). Configuration → dedicated versioned tables (`guardrail_configs`, `licensing_rules_configs`).

```
CURRENT twins:                          TARGET twins:
├── alcm_data (JSONB) → REMOVE         ├── alcm_twin_id (UUID) → ALCM API ref
├── voice_id → REMOVE                  ├── display_name
├── voice_status → REMOVE              ├── identity_category
├── commercial_terms (JSONB) → REMOVE  ├── clone_type
├── governance (JSONB) → REMOVE        ├── status (new lifecycle)
├── completeness_score → REMOVE        ├── health_status (cached from ALCM)
├── ...                                ├── ...
```

When the platform needs personality data, it calls the ALCM API. It never stores it locally (except as a temporary cache during migration Phase 1).

---

## 5. Status Lifecycle

**Current:** `DRAFT | ACTIVE | CERTIFIED | SUSPENDED`

**Target:** `INITIALIZING | BUILDING | ACTIVE | PROTECTED_HOLD | LOCKED | ARCHIVED`

| Status | Meaning | UI Indicator |
|---|---|---|
| `INITIALIZING` | Being created from onboarding data | Loading state |
| `BUILDING` | In training area, not cleared for licensing | **Progress indicator** (coverage %) |
| `ACTIVE` | Fully operational, available for licensing | **Health indicator** (Healthy / Attention / Action Required) |
| `PROTECTED_HOLD` | Frozen — succession event | Alert state |
| `LOCKED` | Deactivated — enforcement, breach, talent emergency | Locked state |
| `ARCHIVED` | Permanently inactive — departure | Archived state |

There is NO "suspended" or "paused" status. No pause policy. The progress indicator during BUILDING transforms to the health indicator once ACTIVE — no percentages on revenue-generating twins.

---

## 6. Your Assistant (by AIV) — The Training Area Interface

The current workspace/chat is a generic Gemini-powered chat. It is replaced by **your assistant (by AIV)** — a multimodal conversational interface that lives inside the **training area** under the Identity section of the nav.

**This is NOT:** A separate app. A top-level nav item. A standalone product. Called "the AIV Agent" in any talent-facing context. It is the assistant, living within Identity, available whenever the talent works on their digital twin.

### 6.1 Assistant Modes

| Mode | What Happens | Backend |
|---|---|---|
| **Assistant** (default) | Platform questions, deal status, revenue, help, file upload guidance | Platform DB, docs, deal data |
| **Digital Self** | Talent talks to their twin to test and deepen accuracy | ALCM API `/generate` |
| **Training** | Add info, find interviews, update positions, upload files, scrape | ALCM API `/classify`, `/attribute`, web |
| **Refinement** | Direct correction, side-by-side comparison, context tuning | ALCM API sub-component updates |

Mode transitions are fluid. "Let me talk to myself" → Digital Self. "Find my latest podcast" → Training. Context preserved across switches.

### 6.2 One Brain, Multiple Knowledge Domains

The assistant is one system that gets smarter over time across multiple domains:

- **Identity knowledge** — from the ALCM API (personality data, coverage gaps, health)
- **Deal/negotiation knowledge** — from the platform DB (deal history, rejection patterns, pricing preferences, client notes)
- **Platform knowledge** — from documentation (how AIV works, commission structure, Seal explanation)

Negotiation knowledge is stored in the **platform database** (not the ALCM API) because it's commercially sensitive business operations data. It's accessible only to the talent's team and the assistant. It's NEVER included in any ALCM Identity Package delivered to clients. Encrypted at rest, access logged.

### 6.3 Opt-In Training from Deal Decisions

When the talent's team makes a decision on a deal inquiry (approve, reject, modify), a prompt appears: **"Add this to your assistant's knowledge? Yes / No."** One tap. If yes, the decision context is stored in a dedicated `negotiation_knowledge` table. If no, it's just a deal record.

This is NEVER automatic. Every piece of negotiation intelligence requires explicit opt-in.

### 6.4 Multi-Party Access

| User | Modes Available | Authority |
|---|---|---|
| **Talent** | All four modes | Ultimate authority on identity |
| **Manager/team** | Assistant (deals, ops) + Training (submissions require talent approval) | Operational control |
| **Account Manager** | Can facilitate Training/Refinement alongside talent | Lower reliability weight (0.7) |

### 6.5 Tables Replacing Current Chat

| Old | New | Why |
|---|---|---|
| `workspace_table` | Removed | Generic workspaces don't match the product |
| `workspace_documents` | Removed | Documents live inside Deals now |
| `chat_table` | `agent_sessions` | Mode tracking, auth state, twin context |
| `chat_participant_table` | Removed | Session is per-user, not multi-participant |
| `chat_message_table` | `agent_messages` | Mode at time, actions taken, tokens metered |

### 6.6 Conversation History Across Modes

When the assistant switches modes, full session history stays in `agent_messages` for audit and continuity. What's sent to the ALCM API on each call is a **curated context window**:

- **Digital Self mode:** Last 20 messages from the current session + the twin's personality summary (from ALCM `/twin/{id}/health` coverage data). The ALCM does NOT receive the full session transcript.
- **Training mode:** The current user message + the source content being classified. No conversation history needed for classification.
- **Refinement mode:** The current correction + the original output being corrected + the last 5 messages for context.
- **Assistant mode:** Last 10 messages from the current session. No ALCM call — platform DB and docs only.

This keeps ALCM API calls lightweight while preserving conversational coherence in the UI.

### 6.7 Session Persistence

If the user returns within the session's `auth_expires_at` window (default 4 hours), the existing session resumes — they see their conversation history and continue from where they left off. If the session has expired, a new session is created. Previous sessions remain accessible as read-only history from the training area. The user's last 10 sessions are listed in the training area sidebar for easy navigation.

---

## 7. Onboarding — Import-First Pipeline

**Current:** 6-step questionnaire treating talent like an unknown person being interviewed.

**Target:** Import-first pipeline treating them like a known public figure claiming and verifying what already exists about them. Professional file uploads — NEVER webcam recordings on the platform. Quality matters.

### 7.1 The Pipeline

```
STEP 0: CROSS-PLATFORM DISCOVERY
  ├── Given one handle/name/URL, find all social profiles (400+ platforms)
  ├── Tools: Sherlock (via Apify), Modash, name-based search
  ├── Handles are NOT always consistent — name-based search required
  └── Talent/team confirms which profiles are theirs

STEP 1: VERIFIED BACKBONE
  ├── Wikipedia/Wikidata API for structured biographical data
  ├── Infobox: birth date, nationality, occupation, career milestones
  └── High-confidence factual foundation

STEP 2: CONTENT INGESTION
  ├── Social media public posts (consented platforms)
  ├── YouTube interview transcripts, podcast transcripts
  ├── Published articles, press coverage, public statements
  └── All processed through ALCM API Psychographic Classifier

STEP 3: INITIAL PROFILE ASSEMBLY
  ├── ALCM builds draft profile from all ingested data
  ├── Preliminary personality derivation (confidence 0.3–0.5)
  └── Estimated psychographic coverage: 30–50% from scraping alone

STEP 4: TALENT REVIEW (via assistant in training area)
  ├── "Here's what we know about you. What did we get right?"
  ├── Talent corrects, supplements, uploads professional files
  ├── Assistant guides through what's needed, confirms minimums met
  └── Talent can enter Digital Self mode to test early version

STEP 5: PROFESSIONAL FILE UPLOADS + RIGHTS
  ├── Professional audio, video, photos (uploaded, not recorded)
  ├── Rights and permissions agreement
  ├── Identity Category selection
  ├── Successor designation (encouraged, not mandatory)
  └── Guardrail defaults loaded from Identity Category

STEP 6: DUAL SIGN-OFF
  ├── GATE 1 (operational): Manager confirms twin is representative
  ├── GATE 2 (personal authorization): Talent themselves signs off:
       "This is me. I authorize this version for commercial use."
       This is a recorded consent event in the consent ledger.
       Without Gate 2, the Licensing Portal does NOT open.
       Non-negotiable.
  └── Twin enters BUILDING status
```

**Three paths:** AIV-Assisted (scraping builds foundation, talent refines), Manual (talent enters everything), Hybrid (most common — scraping + manual supplementation).

**Stage 1 completion gate:** CFS ≥ 65, psychographic coverage ≥ 50%, personality confidence ≥ 0.5, manager confirmation → twin transitions to ACTIVE. The 90-day fee-free window begins.

**Scraped data reliability weight:** 0.6 (public content is curated, reliable for public positions, less reliable for private behavior).

**The current `research_agent_service.py`** (4-parallel Gemini search) is the prototype of the ALCM's scraping pipeline. It moves to the ALCM API and gets expanded.

---

## 8. Guardrails vs. Licensing Rules — Two Separate Systems

**Current:** `twins.governance` (JSONB) mixes behavioral rules with commercial terms.

**Target:** Two separate, independently versioned tables with two enforcement points:

| System | What It Governs | When Enforced | Enforced By |
|---|---|---|---|
| `guardrail_configs` | What the twin says/does — blocked topics, tone, humor, content safety | Every generated output | ALCM API Safeguard Gateway |
| `licensing_rules_configs` | What deals the twin can enter — pricing, territories, use cases, thresholds | Every deal submission | Platform |

Both versioned (new row per change, `is_active` flag). Full history for audit. Both configured by talent's team through the assistant or structured interfaces.

---

## 9. The Licensing Portal — Complete Deal Lifecycle

This is the client-facing product that generates revenue. It does not exist yet — it's the primary build target for Stage 2.

### 9.1 AI Licensing Assistant — Client Qualification

AIV is infrastructure, not an agency. The talent's team does their own business development. When a potential client shows interest, the manager sends them to the talent's Licensing Portal entry point.

The **AI Licensing Assistant** reads the talent's `licensing_rules_configs` and qualifies the client:
- Tells them what's available: "Voice licensing is available. Global territory is permitted. Minimum deal value is $25,000."
- Tells them what's NOT possible: "Exclusivity is not available. Tobacco-related use cases are restricted."
- Answers questions: "Can we use this for an in-game NPC? Yes, gaming is an approved use case."

The assistant creates a **warm, informed client**. It does NOT negotiate, make commitments, or close deals. It prepares the ground so the talent's team's time is spent on actual negotiation, not repetitive qualifying questions.

### 9.2 Inquiry Cards

When inquiries arrive that fall outside pre-approved parameters, the talent's team sees **summary cards** (surfaced through their assistant and the Deals section):

**What a card shows:** Client name, deal type, scope, value, duration, territory. Green checkmarks on parameters within bounds. Warning flags on items outside parameters. Quick actions: approve, reject, view full context, ask assistant.

**Opt-in training:** After every decision, a prompt: "Add this to your assistant's knowledge? Yes / No." If approved, the decision and its context enter the `negotiation_knowledge` table. The assistant learns patterns over time — "This team consistently declines Latin American deals. Consider updating territory restrictions."

When ALL parameters are within pre-approved range, the card shows "All parameters within range" with an option to auto-generate the contract immediately.

### 9.3 Deal Lifecycle — End to End

**PRE-DEAL:**
1. Client arrives at Licensing Portal entry point
2. AI Licensing Assistant qualifies (reads licensing rules, informs, educates)
3. Client submits structured deal request

**INQUIRY STAGE:**
4. Request appears as inquiry card in talent team's view
5. Team reviews: approve (→ contract generation), reject (logged, optionally trains assistant), or expand to negotiate

**NEGOTIATION:**
6. Both parties communicate within the deal workspace messaging thread
7. Terms are adjusted through conversation
8. When agreed, contract auto-generates from final terms
9. Talent team reviews, edits if needed, can re-upload revised version
10. **Talent team signs. Client signs. Both signatures required.** Nothing executes without explicit talent team sign-off.

**EXECUTION:**
11. Contract signed by both parties → deal becomes ACTIVE
12. Data manifest created from deal terms (specifies exactly which ALCM modules client receives)
13. Identity package version locked to the deal
14. If reference data transfer needed → RDA generated, both parties sign
15. Production Partner Disclosure required before any data moves
16. Milestones populated with start/end dates and descriptions
17. Commission rate set (30/25/20 based on deal sequence for this twin)
18. First payment event triggered

**ACTIVE DEAL:**
19. Client receives scoped data via API or reference transfer
20. Milestones tracked — both parties update completion, add comments
21. Permitted Use Lifecycle submissions come in on schedule from client
22. Client can submit outputs for personality consistency validation
23. Talent team monitors through pipeline view and assistant notifications
24. Payments process per agreed schedule, commission deducted transparently

**MID-DEAL CHANGES:** (see Section 11)

**COMPLETION:**
25. Final PUL closing attestation submitted by client
26. Reviewed and confirmed
27. Destruction/return of reference data confirmed if applicable
28. Final payment processed
29. Deal enters permanent archive (all records retained per data retention policy)

**DEAL EXPIRY ENFORCEMENT:** If a deal passes its `end_date` without a closing attestation: the system auto-notifies both parties ("Deal term has ended — closing attestation required"). If no attestation arrives within 14 days, the talent team is notified with an escalation prompt. The deal remains in ACTIVE status (not auto-completed) until the attestation is submitted or the talent team manually closes it. This prevents deals from silently expiring without proper documentation.

**ABNORMAL EXITS:**
- Talent departure with active deal → deal continues through natural term, AIV manages wind-down
- Client breach → documented, twin locking available, enforcement per legal framework
- Dispute → deal state preserved, resolution process initiated

### 9.5 Platform Fee Activation

The $997 platform partnership fee is triggered by a **daily scheduled job** that checks all twins where `status = ACTIVE` and `platform_fee_active = FALSE`. The fee activates (and the first invoice is created) when either:
- A deal has transitioned to EXECUTED status for that twin, OR
- `fee_free_window_expires < NOW()`

Whichever comes first. Once `platform_fee_active` is set to TRUE, it remains TRUE for the duration of the twin's ACTIVE status. Monthly invoices are generated automatically thereafter.

### 9.4 Deal Organization in the UI

**Three views, all under the Deals nav item:**

**Pipeline view** (main Deals page): All deals organized by status — Inquiries, Under Negotiation, Contracts Pending, Active, Completed. Most urgent and newest items surface to the top. Summary cards with flags.

**Deal workspace** (per deal): Everything about one deal in one self-contained space — contract (viewable, downloadable, editable before execution), messaging thread with the client, milestones with start/end dates and completion tracking, PUL submissions, data manifest (which identity modules were released), validation results, payment breakdown.

**Messaging within each workspace:** Each deal has its own thread. No general inbox. No hunting. The deal IS the organizational unit. No folders needed — each deal workspace auto-creates when the deal is initiated.

---

## 10. ALCM Identity Package — What Clients Receive

When a deal is executed, the talent/team provides access to the **ALCM Identity Package** through the Licensing Portal. There are NO preset tiers. The deal contract specifies what data the client receives, and this becomes the **data manifest**.

**Deal terms → data manifest → ALCM API scoped request → client receives ONLY what was agreed.**

### 10.1 Delivery Modules (How Clients See It)

| Module | What's Included | Typical Use Cases |
|---|---|---|
| **Identity Profile** | Personality core + behavioral instructions + context modulation + discourse patterns + guardrail config | All deals |
| **Knowledge Base** | RAG entries, known positions, expertise areas, opinions | Content, conversational, educational |
| **Voice Identity** | Voice embeddings, speech patterns, accent markers, prosodic data | Voice campaigns, podcasts, games |
| **Visual Identity** | Appearance descriptors, expressions, gestures, likeness data | Video, avatars, multimodal |

These modules are independently queryable and deliverable. The ALCM API endpoint: `GET /twin/{id}/package?scope=identity_profile,voice_identity` returns only the requested modules.

### 10.2 Internal ALCM Organization (How Engineers See It)

The ALCM API stores data in nine processing modules, which map to the four delivery modules:

| Internal Module | Delivery Module It Feeds |
|---|---|
| Psychographic Data (per-category classifications) | Identity Profile |
| Dimensional Scores (Bayesian distributions) | Identity Profile |
| Personality Core (Big Five, MBTI, CCP) | Identity Profile |
| Context Modulation (per-context overrides) | Identity Profile |
| Score-to-Gen Instructions (prompt layers) | Identity Profile |
| RAG Knowledge Base (semantic entries) | Knowledge Base |
| Voice Profile (embeddings, parameters) | Voice Identity |
| Visual Profile (descriptors, references) | Visual Identity |
| Relationship Graph (per-contact adaptation) | Identity Profile |

### 10.3 What Clients Do NOT Receive (Any Scope)

Raw training data, onboarding video/audio, ALCM model weights or Bayesian distributions (AIV IP), psychographic coverage scores, internal confidence metrics, data restricted by guardrail configuration, negotiation knowledge, Twin Health Score internals.

### 10.4 Package Versioning and Active Deal Cascade

The package is versioned. When the talent updates their profile (through the assistant), a new version is created. Cascade behavior:

1. All active Licensing Workspaces with affected modules in their manifest receive notification
2. New version becomes active for affected deals
3. Clients notified of changes at the category level ("communication style updated"), NOT sub-component level
4. Previous version retained in deal record for audit
5. Client can request a version hold through the workspace (talent team approves/rejects)

---

## 11. Mid-Deal Change Logic — Every Scenario

| Scenario | System Behavior | Authority |
|---|---|---|
| **Talent updates module in active deal's manifest** | Cascade to affected deals, client notified, grace period applies | Automatic (talent published the update) |
| **Talent updates module NOT in deal's manifest** | No cascade, no notification | N/A |
| **Client requests scope expansion** (wants additional modules) | Expansion request in workspace → talent approves → manifest updated → commission recalculated → contract amendment generated | Talent team approval required |
| **Talent adds blocked topic during live campaign** | Client notified, configurable grace period, then enforced | Talent team (grace period is theirs to set) |
| **Talent revokes consent type** (e.g., voice) while active deals use it | **Critical event.** Platform flags conflict, notifies talent team that active deals will be affected, requires explicit confirmation. Active deals may need renegotiation or termination. | Talent team must confirm |
| **Client scope reduction** | Deal updated (versioned), manifest reduced, no commission impact | Both parties agree |
| **Client misses PUL deadline** | Automated warning notification → escalation if continued → talent team decides consequences | Talent team decides severity |
| **Client outputs fail personality validation** | Both parties notified, remediation guidance provided | Talent/team are ultimate deciders |
| **Client adds undisclosed production partner** | Documented breach → twin locking available → enforcement | AIV system + talent team |

**Grace periods, notification preferences, approval workflows, escalation thresholds — ALL configurable per talent.** Smart defaults provided ("most common" settings) to minimize friction. Every talent is different.

---

## 12. Commission & Payment

**Routing:** All client payments flow through to the talent's team. AIV's commission is deducted transparently. The talent sees: "Payment received: $50,000. AIV commission (30%): $15,000. Net to you: $35,000." The talent never feels like they're paying AIV — they receive revenue with a pre-agreed split.

**Commission calculation:** 30% on first deal per twin, 25% on second, 20% on all subsequent. The `deal_number` field on each deal tracks sequence per twin and determines the rate.

**The $997 platform partnership fee** is the one direct charge — framed as infrastructure maintenance that activates only after they're already earning (see Section 18).

---

## 13. Navigation

### Primary (always visible):
| Nav Item | Contains |
|---|---|
| **Home** | Command center dashboard |
| **Identity** | Twin profile, training area (assistant + Digital Self + refinement), guardrails config, licensing rules config |
| **Deals** | Pipeline view, deal workspaces, revenue, PUL status |
| **Certification** | Identity verification & protection status, package versions, blockchain proofs |

### Secondary (settings-level):
- Team & Permissions
- Account & Billing
- Platform Settings

**Training** lives inside Identity. **Documents** live inside Deals (contracts, RDAs, disclosures are deal artifacts). **The assistant** lives inside the training area within Identity. No standalone "Documents," "Training," or "Chat" sections in the nav.

---

## 14. Dashboard — Command Center

**During BUILDING status:** Progress indicator showing ALCM capture coverage. This is useful and necessary — the talent needs to know where they are.

**Once ACTIVE:** Progress indicator transforms to health indicator (Healthy / Attention Needed / Action Required). No percentages on active, revenue-generating twins.

**Dashboard content:** Identity verification & protection status (NOT "Seal Status" — use "Identity Verified & Protected" with AIV Seal as the mechanism described underneath), active deal pipeline (summary), recent activity feed, assistant recommendations ("Your twin hasn't been updated in 3 weeks"), quick actions (open training, review pending deal, check revenue).

---

## 15. Organization Accounts

Orgs exist in the database but are invisible in the UI. They must be surfaced — this is what makes AIV infrastructure rather than a personal profile tool.

**How they work:**
- Manager signs up → org created, manager is owner → invites talent and team
- Talent signs up directly → org created, talent is owner → invites manager
- Org holds one or more twins (one per talent, expandable later)
- Team members invited with role-based JSONB permissions
- Portfolio views available as org grows (aggregate revenue, deal pipeline across twins, team activity)
- Billing centralized per org

**MVP:** One org per signup, one twin per org (expandable later), team invitations with role-based permissions, org name visible in UI.

---

## 16. The AIV Seal — Identity Provenance

**"The AIV Seal"** is the brand name for identity provenance metadata. It is ALWAYS accompanied by a plain-language explanation. Never assume the audience knows what it means.

### How it appears:
- **Talent-facing:** "The AIV Seal — your digital proof of identity authenticity"
- **Client-facing:** "AIV Seal-certified — verified identity provenance metadata confirming authorization"
- **Developer docs:** "Cryptographic Seal — identity provenance metadata embedded in the package"
- **Dashboard label:** "Identity Verified & Protected" (NOT "Seal Status")

### Properties:
- Always present in the data — non-optional, how provenance works
- Never visible to end users unless talent/client chooses to surface it
- Not a branding requirement — no mandatory "Powered by AIV" anywhere
- Verifiable by any authorized party through AIV's verification API
- Inheritable — outputs generated from sealed data inherit provenance
- Blockchain-anchored for immutability (Polygon)

---

## 17. Visual Direction

Evolve the existing dark theme. Tighten typography, clean hierarchy, reduce visual noise — but do NOT redesign from scratch. Structural changes (nav, dashboard, deal workspaces) are what matter now. Aesthetic refinement is incremental.

The training area conversation interface should feel **focused and intimate** — a proper space for the talent to engage with their digital self. Not a chatbot sidebar. Not a widget. A room.

---

## 18. Platform Partnership Fee — Framing

The $997/month is NOT a subscription. It is a **platform partnership fee** covering: ongoing AI training conversations clients have with the twin, identity data hosting and continuous refinement, licensing portal operations, AIV Seal maintenance, misuse monitoring, quarterly audits, Account Manager support.

**Framing copy:** "AIV absorbs the full cost of building your digital identity. When your first deal closes — meaning you're already earning — the platform partnership fee activates to maintain the infrastructure that makes your ongoing revenue possible."

---

## 19. Legal Agreements Required

These agreements must be created for platform operations:

| # | Agreement | When Signed | Purpose |
|---|---|---|---|
| 1 | **Platform Services Agreement** | Onboarding | Master agreement: services, commission, fees, data ownership, departure terms, liability, dispute resolution |
| 2 | **Identity Authorization Consent** | Onboarding (Gate 2) | Talent's personal consent to capture/structure/license identity. Granular (voice, likeness, behavioral separately). Revocable. |
| 3 | **Data Processing Agreement** | Onboarding | GDPR/CCPA-compliant data handling |
| 4 | **Licensing Agreement Template** | Per deal | Auto-generated, talent-team-reviewed, editable, requires both-party signatures |
| 5 | **Reference Data Agreement** | Per data transfer | Governs every transfer of reference data to clients |
| 6 | **NDA** | Before client sees detailed data | Client confidentiality obligation |
| 7 | **Production Partner Disclosure** | Before data release | Client lists every third party accessing reference data |
| 8 | **Succession Designation** | Onboarding (optional) | Names successor for twin in case of death/incapacitation |
| 9 | **Commission & Fee Schedule** | Attached to PSA | 30/25/20, $997 trigger, metered rates |
| 10 | **Acceptable Use Policy** | Per deal | What clients can/cannot do with licensed data |

---

## 20. Security Architecture

**Data classification:**
- **Identity Core** (highest): Personality profiles, dimensional scores, voice embeddings — AES-256, per-user key
- **Negotiation Knowledge** (high): Deal patterns, pricing preferences, rejection history — Platform DB, encrypted, never in ALCM packages
- **Commercial** (high): Deal terms, revenue, commissions — Scoped access per role
- **Operational** (medium): Interaction logs, training contributions, health data — Internal + talent team
- **Public** (as configured): Marketplace listings, narrative profiles — As talent configures

**Assistant security:** Auth per session (4h timeout default), permission enforcement per query per mode, mode-specific authorization (Digital Self requires talent auth — team cannot enter), audit logging on every interaction, web search sandboxing (no direct injection into profile), prompt injection protection (sanitized input, bounded tool access).

---

## 21. Stage-Aligned Feature Rollout

### Stage 1 — The Vault (Protection & Capture) — LIVE
Platform-only. Text interactions. Scraping + ALCM processing. Guardrail/licensing-rules configuration. Multi-party training. Progress indicator during BUILDING. Basic health monitoring. Clone types: Public Figure Replica, Fictional Character.

### Stage 2 — The Intake (Monetization & Licensing) — Month 3
Licensing Portal. AI Licensing Assistant. Deal workspaces. Contracts, RDA, PUL. Commission engine. Voice synthesis (TTS via ALCM API). Basic avatar. Twin Experience Environment. Client-side validation (basic). Google Meet integration (first cross-platform). Quarterly audits (first at 90 days post-Stage-1). Package versioning with cascade.

### Stage 3 — The Multiplier (Scale & Marketplace) — Month 9
Marketplace (two-sided). Consumer API. Full cross-platform API. Misuse Detection. Advanced validation (continuous automated). Advanced analytics. Enterprise buyer introductions. Full multimodal twin experience.

---

## 22. Key Technical Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Database | PostgreSQL + JSONB | Flexible nested structures, strong consistency |
| Cache/Sessions | Redis | Session state, prompt caching, rate limiting |
| File Storage | S3/MinIO | Contracts, media, uploads |
| Backend | FastAPI (async) | Both services |
| Frontend | Next.js 15 | SSR, API routes, proxy |
| Primary LLM | Claude (Anthropic) | Best instruction-following for personality embodiment |
| Classification LLM | Claude Haiku | Speed + accuracy for high-volume classification |
| TTS | ElevenLabs (behind abstraction) | Market leader. Abstracted so providers are swappable. |
| Avatar | Evaluate at Stage 2 | Market evolving — build abstraction now, pick provider later |
| Blockchain | Polygon (Amoy → mainnet) | Seal provenance anchoring |
| Scraping | Apify (Sherlock) + custom | Cross-platform discovery (400+ platforms) |

---

## 23. Database Tables — Complete List

### Platform (:8000) — 31 tables:
```
ACCOUNTS:     users, organizations, organization_memberships, otps
TWIN:         twins
CONFIG:       guardrail_configs, licensing_rules_configs
ONBOARDING:   onboarding_sessions
TRAINING:     training_contributions, negotiation_knowledge
ASSISTANT:    agent_sessions, agent_messages
DEALS:        deals, deal_milestones, deal_messages, deal_contracts,
              reference_data_agreements,
              production_partner_disclosures, permitted_use_records,
              client_validation_submissions
PACKAGES:     identity_package_versions
PAYMENTS:     invoices, usage_meters, payouts
SYSTEM:       notifications, misuse_detections, twin_locks,
              consent_records, audit_logs
MARKETPLACE:  marketplace_listings, marketplace_inquiries (Stage 3)
```

Note: `negotiation_knowledge` stores opt-in deal intelligence that trains the assistant.

Note: `deal_milestones` tracks per-deal milestones with dates, completion, and comments.

Note: `deals.data_scope` (text[]) replaces `package_tier` from prior documents. Deal terms define scope, not tiers.

### ALCM API (:8001) — organized in delivery and processing modules:
```
PROFILES:     twin_profiles
PROCESSING:   psychographic_data, dimensional_scores, personality_cores,
              context_modulation, score_to_gen_instructions
KNOWLEDGE:    rag_entries
MEDIA:        voice_profiles, visual_profiles
SOCIAL:       relationship_graphs
QUEUE:        processing_jobs
```

---

## 24. All Services

### Platform Services:
| Service | Purpose |
|---|---|
| `auth_service.py` | Signup, verify, signin, password reset, RBAC permission checks |
| `alcm_client.py` | SDK for ALL ALCM API calls — the platform's only way to talk to ALCM |
| `agent_service.py` | Assistant orchestration: intent → mode → backend → permissions → response |
| `onboarding_service.py` | Discovery pipeline, file upload guidance, profile assembly coordination |
| `licensing_service.py` | Deal lifecycle, PUL management, RDA, package delivery, inquiry cards |
| `commission_service.py` | 30/25/20 calculation, invoice generation, payout processing |
| `package_service.py` | Package versioning, Seal provenance, cascade to active deals |
| `guardrail_service.py` | Versioned guardrail management, push to ALCM API, cascade to deployments |
| `validation_service.py` | Client output validation via ALCM API consistency check |
| `notification_service.py` | Event-driven alerts to the right user at the right time |
| `storage_service.py` | S3/MinIO file operations |
| `email_service.py` | Transactional email via Resend/SMTP |
| `blockchain_service.py` | Polygon anchoring for Seal provenance |

### ALCM API Services:
| Service | Purpose |
|---|---|
| `classifier_service.py` | Psychographic classification (LLM + rule validation) |
| `attribution_service.py` | Dimensional scoring (LLM inference + Bayesian update) |
| `personality_service.py` | Big Five derivation, MBTI, Cognitive Complexity Profile |
| `generation_service.py` | Score-to-Generation (7-layer prompt assembly → LLM → response) |
| `validation_service.py` | Personality consistency checking |
| `learning_service.py` | Bayesian updating, feedback processing, credit assignment |
| `drift_service.py` | Personality drift detection |
| `scraping_service.py` | Cross-platform discovery + content ingestion |
| `tts_service.py` | Voice synthesis via ElevenLabs (abstracted for provider swap) |
| `fidelity_service.py` | CFS computation, health score indicators |

> **Project structure:** The complete target directory structure for both services — every model file, router file, service file, middleware, and utility mapped to its filesystem location — is specified in the AIV Platform Technical Specification Section 5 (File-by-File Migration Map). That document is the single source of truth for where files live. It includes the current→target mapping for every existing file (KEEP, REWRITE, DELETE, MOVE) and lists every new file to be created, organized by `app/models/`, `app/routers/`, `app/services/`, and `app/middleware/` for the platform, and the equivalent structure for the ALCM API. The frontend file structure (Next.js components, routes, API clients) is also specified there.

---

## 25. ALCM API Endpoints (Called by Platform)

| Platform Action | ALCM Endpoint | Returns |
|---|---|---|
| Create identity record | `POST /twin` | `alcm_twin_id` |
| Delete identity record | `DELETE /twin/{id}` | Confirmation |
| Send scraped content for classification | `POST /classify` | Categories affected, confidence scores |
| Send uploaded media for analysis | `POST /analyze-media` | Voice profile, visual descriptors |
| Approved training contribution | `POST /attribute` | Sub-components updated, confidence deltas |
| Digital Self mode conversation | `POST /generate` | Identity-consistent response text |
| Streaming generation | `POST /generate/stream` | SSE stream of tokens |
| Check twin health | `GET /twin/{id}/health` | CFS, per-dimension fidelity, health indicators |
| Deliver identity package to client | `GET /twin/{id}/package?scope=identity_profile,voice_identity` | Scoped identity data per manifest |
| Validate client-submitted output | `POST /validate` | Consistency score, pass/fail, details |
| Push updated guardrails | `POST /twin/{id}/guardrails` | Confirmation + propagation status |
| Check personality drift | `GET /twin/{id}/drift` | Drift score, threshold status |
| Create versioned snapshot | `POST /twin/{id}/snapshot` | Snapshot reference, seal hash |
| Generate speech from text | `POST /generate-speech` | Audio bytes (via abstracted TTS provider) |
| Submit interaction feedback | `POST /twin/{id}/feedback` | Processing confirmation, learning applied |
| Service health check | `GET /health` | Status, version, uptime |

---

## 26. What NOT to Do

**Data boundaries:**
- Never store personality data, psychographic scores, dimensional values, or Bayesian distributions in the platform database.
- Never call ElevenLabs or any rendering provider directly from the platform — all third-party rendering goes through the ALCM API's abstraction layer.
- Never expose `voice_id`, ALCM model weights, internal confidence scores, or negotiation knowledge in any client-facing API response.
- Never include negotiation knowledge in any ALCM Identity Package delivered to clients.
- Never release identity data to a client outside of what the deal terms specify. The data manifest equals the deal scope.

**Status and lifecycle:**
- Never create a "suspended" or "paused" twin status. There is no pause policy.
- Never modify `consent_records`, `permitted_use_records`, or `audit_logs`. These are append-only. Revocations and corrections are new records.

**Authorization and control:**
- Never let clients modify guardrails. They operate within the talent's defined bounds.
- Never execute a deal without the talent team's explicit contract sign-off.
- Never open the Licensing Portal for a twin without Gate 2 (talent personal authorization consent).
- Never auto-train the assistant from deal decisions without explicit opt-in (Yes/No per decision).

**UX and branding:**
- Never build training, refinement, project management, and help as separate top-level nav sections. All within Identity, served by one assistant in the training area.
- Never call it "the AIV Agent" in talent-facing UI. It's "your assistant (by AIV)."
- Never use "Seal Status" as a dashboard label. Use "Identity Verified & Protected."
- Never show progress percentages on an ACTIVE twin. Use health indicators.
- Never expect talent to record webcam video on the platform. They upload professional files.

**Architecture:**
- Never use `package_tier` in deal records. Use `data_scope` (text array of delivery module names).
- Never use `?tier=X` in ALCM API calls. Use `?scope=module1,module2`.
- Never store the ALCM Identity Package data in the platform database permanently. Cache temporarily during migration Phase 1 only.

---

## 27. Migration Phases

**Phase 1 (Wk 1–2): Extract ALCM API**
- Create ALCM API service on :8001
- Move `alcm_data`, `research_agent_service`, `voice_cloning_service` into it
- Create `alcm_client.py` in the platform
- Keep `alcm_data` in platform Twin temporarily as cache
- Both systems run in parallel

**Phase 2 (Wk 2–4): New Platform Schema**
- Alembic migration for new tables
- Migrate `twins.governance` → `guardrail_configs` + `licensing_rules_configs`
- Migrate `twins.commercial_terms` → `licensing_rules_configs`
- Replace workspace/chat → `agent_sessions` + `agent_messages`
- Replace `documents` → purpose-built deal entities
- Add `consent_records`, `negotiation_knowledge`, `twin_locks`, org membership permissions
- Add new `onboarding_sessions` schema (pipeline-based)

**Phase 3 (Wk 3–6): Assistant + Training Area**
- Build agent orchestration service
- Replace `/aiv/chat` with multi-mode assistant
- Integrate with ALCM API for Digital Self + Training + Refinement
- Integrate with platform data for Assistant mode

**Phase 4 (Wk 5–8): Licensing Portal**
- Build deal lifecycle with all stages
- Inquiry cards with parameter checking
- Contract generation, e-signature integration
- RDA, Production Partner Disclosure, PUL
- Commission engine, payment routing
- Package delivery via ALCM API scoped requests
- Notification system
- AI Licensing Assistant (reads licensing rules, qualifies clients)

**Phase 5 (Wk 8+): Drop Legacy**
- Remove `alcm_data` cache from platform Twin table
- Remove old workspace/chat/document tables
- Remove old onboarding questionnaire flow
- All reads through ALCM API or new platform tables

---

## 28. Reference Documents

These provide detailed specifications. They are companions to this guide, not replacements:

- **AIV Platform Technical Specification** — corrected SQL schemas for all 31 tables, platform REST API endpoint definitions with request/response shapes, `alcm_client.py` interface, file-by-file migration map, docker-compose, target .env, acceptance criteria per phase. **Read this second, immediately after this guide.**
- **ALCM Developer Guide v2.0** — the identity engine specification (how personality is captured, scored, delivered, and used for generation). 3,000+ lines of technical detail on the ALCM API's internal architecture.
- **Strategic Recommendations v2.0** — product vision, assistant architecture, onboarding pipeline, licensing mechanics, stage rollout.
- **Platform Data Architecture v1.0** — entity-relationship diagram. **Note:** contains outdated `package_tier` references — use `data_scope` per this guide.
- **Platform Migration Architecture** — current→target mapping with SQL schemas and file structures. **Note:** contains outdated `package_tier` references — use `data_scope` per this guide.
- **Master Internal Alignment Document v4.5** — business model, pricing, competitive landscape, contract terms, departure policy.

**Where documents conflict, this guide governs.**
