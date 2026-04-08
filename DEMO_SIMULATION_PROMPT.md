# AIV Demo System — Build Prompt

## Before You Write Any Code

**Read these files first.** Do not proceed until you understand the existing patterns:

1. `AIV-Backend-mvp-vault/app/main.py` — Startup sequence, router registration, lifespan events
2. `AIV-Backend-mvp-vault/app/config.py` — Pydantic BaseSettings, `get_settings()` cached singleton
3. `AIV-Backend-mvp-vault/app/database.py` — `get_db()` dependency, `async_session_maker()`
4. `AIV-Backend-mvp-vault/app/routers/__init__.py` — How routers are exported
5. `AIV-Backend-mvp-vault/scripts/seed_demo.py` — Existing seed script (extend, don't replace)
6. `AIV-Backend-mvp-vault/app/services/stripe_service.py` — StripeService interface
7. `AIV-Backend-mvp-vault/app/services/esign_service.py` — ESignService interface
8. `AIV-Backend-mvp-vault/app/services/blockchain_service.py` — BlockchainService interface
9. `AIV-Backend-mvp-vault/app/services/alcm_client.py` — ALCMClient + GracefulALCMClient + `get_alcm_client()`
10. `AIV-Backend-mvp-vault/app/routers/auth.py` — Where `dev_otp` is returned (search for `dev_mode`)
11. `AIV-Backend-mvp-vault/app/routers/twin.py` — Health endpoint calls ALCM live
12. `AIV-frontend-mvp-vault/src/app/layout.tsx` — Where to inject demo panel
13. `AIV-frontend-mvp-vault/src/app/auth/verify/page.tsx` — OTP verification flow
14. `AIV-frontend-mvp-vault/src/middleware.ts` — Route protection logic
15. `AIV-frontend-mvp-vault/next.config.ts` — Env vars, rewrites

---

## What You're Building

A **demo mode** for the AIV platform. This is NOT a simulation — it uses the real platform with real services wherever possible. The only things that get simulated are things that *cannot* happen in a demo: real clients submitting deal inquiries, real counterparties signing contracts, real Stripe charges, and real time passing.

**Purpose:** Founder review/testing, investor pitches, talent/manager showcases, team onboarding walkthroughs.

**Core principle:** The demo must be a true representation of what users can do and access. Use the actual platform features and integrations. Nothing is hardcoded in walkthrough mode — the user signs up as themselves, enters real talent info, and the platform does its real thing. Only the "into the future" showcase view has pre-populated data, and even that data must reflect what the real platform actually produces.

---

## Two Demo Modes

| Mode | Entry Point | What's Real | What's Simulated | Use Case |
|------|------------|-------------|-----------------|----------|
| **Walkthrough** | Landing page (`/`) | Everything through onboarding + training area. Real signup, real discovery, real ALCM, real onboarding. | Deal inquiries, contract counter-signatures, Stripe charges, time passage. | Testing, talent/manager demos, team onboarding |
| **Showcase** | Dashboard (`/dashboard`) | UI renders real components with real data shapes. | All data pre-populated for a 6-month mature account. | Investor pitches, quick showcases |

**The manager is you.** You sign up with your own name. The platform already supports this.

**The talent is Matthew McConaughey.** Real public figure. Discovery finds real Wikipedia, real social profiles, real interviews. ALCM processes real public data.

**Mode selection:** `POST /demo/reset` accepts `{ "mode": "walkthrough" | "showcase" }`.

---

## What's Real vs. What's Simulated

### REAL (use the actual platform)

- **Auth & Signup** — Real flow. OTP shown in-app via existing `dev_otp` field.
- **Discovery** — Real Wikipedia API, real Google CSE, real Gemini. McConaughey has extensive public data.
- **Onboarding** — Real 3-step flow: Discovery (name/handle/URL) → Review & Consent (profiles, consents, categories, clone type) → Authorize (Gate 2 password). Real profile assembly. Real consent recording. Real gates.
- **ALCM** — Real API calls if running. `GracefulALCMClient` already handles ALCM being down.
- **Navigation** — Sidebar layout with org name, twin switcher dropdown, expandable Training section with ChatGPT-style session history. Top-right header with notifications bell + avatar dropdown (Settings, Help, Logout).
- **Training Area** — Real assistant, real ALCM generation, real multi-mode conversations. Sessions listed in sidebar for quick switching.
- **Twin Switcher** — Dropdown at top of sidebar shows current twin, allows switching between twins in the org, "+ Add New Identity" triggers onboarding.
- **Twin Management** — Real CRUD, real guardrails, real health metrics.
- **Certification** — Real package creation, real hash computation.
- **Contract Generator** — Real PDF generation (works offline, no external deps).
- **Commission Service** — Real math (no external deps).
- **Dashboard, Settings, Team** — All real.

### SIMULATED (only what cannot happen in a demo)

| Feature | Why | How |
|---------|-----|-----|
| Deal inquiries | No real client will submit during a demo | `POST /demo/advance` creates deal records in DB |
| Contract counter-signatures | No real counterparty | Advance sets `signed_by_client_at` directly |
| Stripe payments | No real charges desired | Mock service returns valid-shaped responses |
| Zoho Sign | No real e-sig flow | Mock service auto-completes |
| Blockchain | Optional | Mock if no Polygon keys; real if configured |
| Time passage | Can't wait 6 months | Advance generates backdated records |

### CONDITIONAL (real if configured, mock if not)

- **Email** — Real if Resend/SMTP configured. OTP shown in-app via `dev_otp` regardless.
- **Blockchain** — Real if Polygon keys set. Mock generates realistic hashes otherwise.
- **ALCM** — Real if running. `GracefulALCMClient` degrades gracefully if not.

---

## Walkthrough Mode

You use the real platform. The demo panel provides: **Reset** (clean DB) and **Advance** (generate next batch of time-skipped data).

### What You Do (all real)

1. **Landing** — Browse `/`, "How It Works", request access
2. **Signup** — Your real name, any email. OTP shown in-app.
3. **Onboarding Step 1: Discovery** — Enter "Matthew McConaughey" (name, handle, or URL). Real discovery runs with AI-assembled bio.
4. **Onboarding Step 2: Review & Consent** — Review discovered profiles, edit display name/bio, toggle consents, select identity categories, choose clone type.
5. **Onboarding Step 3: Authorize** — Gate 2 summary + password authorization. Real consent events recorded.
6. **Dashboard (Building)** — Real BUILDING state. Sidebar shows twin in switcher. Training area accessible from sidebar with session history.
7. **Press Advance →** from here forward.

### Advance Phases

**Advance 1 — "Twin matures" (BUILDING → ACTIVE):**
Generates 2 weeks of backdated history:
- Update twin status: BUILDING → ACTIVE, health_status → HEALTHY
- Update twin: stage_1_completed_at = now - 14 days, fee_free_window_expires = now + 76 days
- 5 training contributions:
  1. Text: "McConaughey's 'just keep livin' philosophy should be central — it's not a catchphrase, it's a worldview" — status=APPROVED, created_at=now-13d
  2. Text: "Career arc: Dazed and Confused (1993) → rom-com era → McConaissance → Dallas Buyers Club Oscar → Lincoln/Wild Turkey brand era" — status=APPROVED, created_at=now-11d
  3. Text: "Excerpt from Greenlights — 'Life is not a popularity contest. Be brave. Take the hill.'" — status=APPROVED, created_at=now-9d
  4. Text: "Brand philosophy — only partners with brands he genuinely uses. Lincoln, Wild Turkey, Kiehl's." — status=PENDING, created_at=now-5d
  5. Text: "2019 touring schedule and appearance dates" — status=REJECTED, rejection_reason="Stale data", created_at=now-3d
- 3 agent sessions:
  - Session 1 (now-12d, ASSISTANT mode, 6 messages): Exploring brand voice. Messages: "How would Matthew approach a brand partnership question?" / "I'd focus on authenticity — Matthew doesn't endorse, he partners. There's a difference..." / "What about his tone when discussing competition?" / "He doesn't compete. He's said 'I'm not in competition with anyone but myself'..." / "How should he handle personal questions?" / "Redirect to philosophy. 'I don't chase things, I attract them by becoming more of myself.'"
  - Session 2 (now-8d, DIGITAL_SELF mode, 4 messages): Testing personality capture. Messages: "Tell me about your approach to acting." / "Man, for me it's about finding the frequency of a character. You gotta tune in before you can turn it on. That's what happened with Ron Woodroof — I didn't play him, I found him." / "What's your morning routine?" / "I wake up early. Before the world gets loud. Journal, coffee, look at the river. That's my time to get honest with myself."
  - Session 3 (now-4d, TRAINING mode, 8 messages): Film career refinement. Q&A covering: early career, McConaissance turning point, Oscar for Dallas Buyers Club, transition to brand work, teaching at UT Austin, Greenlights writing process, "just keep livin" foundation origin.
- Identity package v1 sealed:
  - seal_hash: compute real SHA-256 of twin data
  - Use BlockchainService (real if configured, mock if not) for tx_hash + block_number
  - is_current=true, created_at=now-2d
- Guardrail config v1: Confirm the user's config from onboarding is active. If none exists, create default for ENTERTAINMENT category.
- Licensing rules config v1: pricing_floor=50000, permitted_use_cases=["BRAND_CAMPAIGN", "CONTENT_LICENSE", "EDUCATIONAL", "API_INTEGRATION"], blacklisted=["ADULT_CONTENT", "POLITICAL_CAMPAIGN", "GAMBLING"], auto_approve_threshold=100000, escalate_below=60000. created_at=now-10d
- 8 audit log entries: COMPLETE_ONBOARDING, UPDATE_TWIN_STATUS (BUILDING), SUBMIT_TRAINING ×5 (one per contribution), UPDATE_TWIN_STATUS (ACTIVE), CREATE_PACKAGE, SEAL_PACKAGE. Timestamps match the records they reference.
- 6 notifications: "Onboarding complete", "Training submitted" ×3 (one per approved), "Twin is now ACTIVE", "Identity package sealed". Last 2 unread.

**Advance 2 — "First deal arrives":**
Generates 3 weeks of additional history (timestamps: now-14d to now-0d, offset from advance 1):
- Guardrail config v2: Copy v1, add "competitor endorsements" to blocked_topics, add "university tenure details" to restricted_topics. version=2, is_active=true, v1.is_active=false. created_at=now-10d
- Consent update: VISUAL_LICENSING REVOKED (now-12d, reason: "Scope review before deal negotiation"), then VISUAL_LICENSING GRANTED (now-11d, reason: "Re-granted after legal scope clarification")
- Create client org: "Lincoln Motor Company" (type: CLIENT)
- Deal 1: Lincoln Motor Company
  - deal_type=BRAND_CAMPAIGN, value=150000, currency=USD
  - territory=["North America"], data_scope=["identity_profile", "voice_identity"]
  - exclusivity=false, deal_number=1
  - commission_rate=0.30 (first deal), commission_amount=45000
  - status=SUBMITTED, created_at=now-2d
  - 1 deal message: From Lincoln — "We'd like to explore a digital voice campaign for the 2027 Navigator launch. Matthew's existing relationship with Lincoln makes this a natural extension. Proposed scope: identity profile and voice identity for a 6-month North American campaign. Budget: $150,000."
- Notification: "New deal inquiry from Lincoln Motor Company" (unread)
- 3 audit entries: UPDATE_GUARDRAIL_CONFIG, UPDATE_CONSENT ×2, CREATE_DEAL

**Advance 3 — "Deal negotiated and executed":**
Generates 8 days of deal progression:
- 4 deal messages (append to Deal 1 thread):
  1. From manager (now-7d): "Thank you for the inquiry. We're interested. Can you clarify the exclusivity terms and confirm this is limited to North American markets?"
  2. From Lincoln (now-6d): "Confirmed — North America only, non-exclusive. We're open to a territory extension clause if the campaign performs. We'd also like to include a brief appearance clause for the launch event."
  3. From manager (now-4d): "We'll proceed without the appearance clause — Matthew's physical appearances are managed separately. Happy to include a territory extension option at pre-agreed rates. Sending for contract."
  4. From Lincoln (now-3d): "Agreed. Looking forward to the contract."
- Status transitions: SUBMITTED (already) → UNDER_REVIEW (now-7d) → APPROVED (now-4d) → CONTRACT_SENT (now-3d)
- Contract v1: Use real ContractGenerator to create PDF. Set created_at=now-3d.
- Simulated signatures: signed_by_talent_at=now-2d, signed_by_client_at=now-1d
- Status: EXECUTED (now-1d) → ACTIVE (now-1d)
- 4 milestones:
  1. "Campaign Brief & Strategy Alignment" — due_date=now+14d, sort_order=1
  2. "Voice Recording Sessions" — due_date=now+45d, sort_order=2
  3. "Creative Review & Approval" — due_date=now+90d, sort_order=3
  4. "Campaign Launch" — due_date=now+150d, sort_order=4
- PUL opening declaration: created_at=now-1d, type=OPENING
- RDA: data_scope=["identity_profile", "voice_identity"], recipient="Lincoln Motor Company", delivery_confirmed=true, created_at=now-1d
- Commission invoice: amount=45000, status=PENDING, type=COMMISSION, created_at=now-1d
- Platform fee activation: Update twin.platform_fee_active=true. Create platform fee invoice: amount=997, status=PAID, type=PLATFORM_FEE, created_at=now-1d
- Use MockStripeService (or real if configured) for subscription creation
- 5 audit entries: UPDATE_DEAL_STATUS ×4, SIGN_CONTRACT ×2, CREATE_MILESTONE ×4, CREATE_PUL, ACTIVATE_PLATFORM_FEE, CREATE_INVOICE ×2
- 4 notifications: "Deal approved", "Contract signed by both parties", "Deal is now active", "Platform fee activated"

**Advance 4 — "Time passes, second deal":**
Generates 75 days of ongoing activity:
- Deal 1 progress: milestones 1+2 completed (completed_at set), 1 PUL ongoing attestation (now-30d), 1 client validation submission (consistency_score=0.89, passed=true, now-20d)
- 2 platform fee invoices: PAID (now-60d, now-30d)
- Payout 1: deal_id=Deal1, gross=150000, commission=45000, net=105000, status=COMPLETED, processed_at=now-45d
- Create client org: "Campari Group" (Wild Turkey parent)
- Deal 2: Wild Turkey Bourbon
  - deal_type=BRAND_CAMPAIGN, value=85000, deal_number=2
  - commission_rate=0.25, commission_amount=21250
  - territory=["Global"], data_scope=["identity_profile", "knowledge_base"]
  - Status progression: SUBMITTED (now-40d) → UNDER_REVIEW → APPROVED → CONTRACT_SENT → EXECUTED (now-30d) → ACTIVE
  - Contract signed, 4 milestones (2 completed), PUL opening + 1 ongoing
  - 4 messages: inquiry, negotiation, agreement, launch coordination
- Identity package v2: New hash, cascaded_to_deals=[Deal 1 ID], v1.is_current=false, v2.is_current=true, created_at=now-25d
- Create client org: "Spotify AB"
- Deal 3: Spotify Studios
  - deal_type=CONTENT_LICENSE, value=40000, deal_number=3
  - commission_rate=0.20
  - territory=["Global"], data_scope=["knowledge_base"]
  - status=SUBMITTED, created_at=now-7d
  - 1 message: "We're interested in licensing Matthew's conversational knowledge base for a podcast companion feature. Would love to discuss scope and terms."
- Misuse detection: type="unauthorized_redistribution", description="Voice sample from Lincoln campaign found on unauthorized third-party platform. Source: Hudson Rouge subcontractor.", detected_at=now-21d, resolved_at=now-14d, resolution="Partner issued takedown and correction notice. No twin lock required."
- Commission invoice for Wild Turkey: amount=21250, status=PENDING
- Audit entries for all actions (~15)
- Notifications for: milestones completed, payout processed, new deal inquiries, misuse detected, misuse resolved, package updated. Last 3 unread.

**Advance 5 — "Full maturity":**
Generates final 30 days:
- Deal 1: milestones 3+4 completed, PUL closing attestation, status → COMPLETED
- Deal 2: milestone 3 in progress (2/4 done)
- Deal 3: still SUBMITTED (unread notification reminder)
- New team member: name="Demo Admin", email="admin@demo.aiv.chat", role=ADMIN, invited and accepted
- 2 more platform fee invoices (PAID)
- Payout 2: Wild Turkey, gross=85000, commission=21250, net=63750, status=PENDING
- Final audit entries + notifications
- End state matches Showcase mode

### Phase Detection Logic

`POST /demo/advance` determines phase by querying DB state — NOT a stored counter:

```
No user exists                              → error: "Sign up first"
User exists, no twin                        → error: "Complete onboarding first"
Twin INITIALIZING or BUILDING               → Advance 1
Twin ACTIVE, 0 deals                        → Advance 2
1+ deals, none EXECUTED                     → Advance 3
1+ deals EXECUTED, < 3 deals total          → Advance 4
3 deals, Deal 1 not COMPLETED              → Advance 5
Deal 1 COMPLETED                           → error: "Demo fully advanced"
```

---

## Showcase Mode — 6-Month Pre-Populated State

`POST /demo/reset {"mode": "showcase"}` creates the complete end-state in one shot.

### Showcase Identity

- Name: Andres Toro
- Email: demo@aiv.chat
- Username: andres
- Password: AIVDemo#2026
- Role: MANAGER
- Org: AIV (TALENT_TEAM)

### Showcase ALCM Health Problem & Fix

**Problem:** The `/twin/{id}/health` endpoint calls ALCM live via `get_alcm_client().get_health()`. In showcase mode, if ALCM isn't running, the dashboard shows degraded health even though the DB says HEALTHY.

**Fix:** In the twin health endpoint (`app/routers/twin.py`), when `DEMO_MODE=true` and the ALCM call fails or returns degraded data, return the cached DB values instead of the ALCM response:

```python
if settings.DEMO_MODE:
    health = await client.get_health(str(twin.alcm_twin_id))
    if not health or health.get("cfs", 0) == 0:
        # ALCM not running or returned empty — use DB cache
        return {
            "cfs": 0.78,
            "psychographic_coverage": 0.62,
            "personality_confidence": 0.71,
            "health_status": twin.health_status or "HEALTHY",
        }
```

This is the ONE place where demo mode should override a real endpoint's behavior.

### Complete Data

Same end-state as Advance 5. All records, all relationships, all timestamps. Refer to the advance phase descriptions above for exact field values. The showcase generator should call the same data generator functions used by advances 1–5, just with a single pre-set user identity instead of the walkthrough user.

---

## Mock Service Injection — How It Actually Works

**Critical:** Services in this codebase are NOT injected via FastAPI `Depends()`. They are imported and instantiated inline in route handlers:

```python
# payments.py
from ..services.stripe_service import StripeService
svc = StripeService(db)  # Inline instantiation

# licensing.py
from ..services.esign_service import ESignService  # LOCAL import inside handler
esign = ESignService(db)

# packages.py
from ..services.blockchain_service import BlockchainService
bc = BlockchainService()  # No params
```

**Therefore: use module-level patching at startup, not dependency overrides.**

In `app/main.py`, during the lifespan startup event, when `DEMO_MODE=true`:

```python
import app.services.stripe_service as stripe_mod
import app.services.esign_service as esign_mod
import app.services.blockchain_service as blockchain_mod

if settings.DEMO_MODE:
    if not settings.STRIPE_SECRET_KEY:
        from app.services.mocks.mock_stripe_service import MockStripeService
        stripe_mod.StripeService = MockStripeService

    if not settings.ZOHO_SIGN_CLIENT_ID:
        from app.services.mocks.mock_esign_service import MockESignService
        esign_mod.ESignService = MockESignService

    if not settings.POLYGON_RPC_URL:
        from app.services.mocks.mock_blockchain_service import MockBlockchainService
        blockchain_mod.BlockchainService = MockBlockchainService
```

This works because routers import from these modules. When they do `from ..services.stripe_service import StripeService`, they get whatever class is currently bound to that name in the module. If we patch it before the first request, all subsequent imports resolve to the mock.

**For routers that use local imports** (e.g., `licensing.py` imports `ESignService` inside the handler function), the patch still works because the local import reads from the module at call time, not at module-load time.

---

## dev_otp — Where and How

In `app/routers/auth.py`, the `dev_otp` field is included in signup and resend-otp responses when `dev_mode` is truthy:

```python
settings = get_settings()
dev_mode = getattr(settings, 'dev_mode', False)
# ...
if dev_mode:
    response_data["dev_otp"] = otp_code
```

**What to do:** In `app/config.py`, the existing field is `DEV_MODE: bool = False`. Add logic so `DEMO_MODE=true` also makes `dev_mode` return true:

```python
@property
def dev_mode_or_demo(self) -> bool:
    return self.DEV_MODE or self.DEMO_MODE
```

Then in `auth.py`, change `dev_mode = getattr(settings, 'dev_mode', False)` to `dev_mode = getattr(settings, 'dev_mode_or_demo', getattr(settings, 'dev_mode', False))`.

Or simpler: just update the `DEV_MODE` property to also check `DEMO_MODE`.

---

## Backend Implementation

### Files to Create

**`AIV-Backend-mvp-vault/app/routers/demo.py`**

```
POST /demo/reset     Body: {"mode": "walkthrough" | "showcase"}
POST /demo/advance   No body. Returns: {"phase": N, "phase_name": "...", "summary": "...", "redirect": "/path"}
GET  /demo/state     Returns: {"mode": "...", "phase": N, "phase_name": "...", "advances_remaining": N}
```

All return 404 if not `settings.DEMO_MODE`.

**`AIV-Backend-mvp-vault/app/services/demo_service.py`** — Orchestration: reset, detect phase, advance.

**`AIV-Backend-mvp-vault/app/services/demo_data_generators.py`** — Five generator functions (one per advance). Each creates backdated records using real model classes.

**`AIV-Backend-mvp-vault/app/services/mocks/mock_stripe_service.py`** — Same interface as `StripeService(db)`.

**`AIV-Backend-mvp-vault/app/services/mocks/mock_esign_service.py`** — Same interface as `ESignService(db)`.

**`AIV-Backend-mvp-vault/app/services/mocks/mock_blockchain_service.py`** — Same interface as `BlockchainService()`.

**`AIV-Backend-mvp-vault/app/services/mocks/__init__.py`** — Empty.

### Files to Modify

**`AIV-Backend-mvp-vault/app/config.py`** — Add:
```python
DEMO_MODE: bool = False
DEMO_DATABASE_URL: str = ""
```

**`AIV-Backend-mvp-vault/app/main.py`** — Add:
- Demo router registration (inside `if settings.DEMO_MODE:`)
- Module-level mock patching in lifespan startup
- Demo database engine creation if `DEMO_DATABASE_URL` is set

**`AIV-Backend-mvp-vault/app/routers/__init__.py`** — Conditionally export demo router.

**`AIV-Backend-mvp-vault/app/routers/auth.py`** — Make `dev_otp` also trigger on `DEMO_MODE=true`.

**`AIV-Backend-mvp-vault/app/routers/twin.py`** — In health endpoint, return cached DB values when `DEMO_MODE=true` and ALCM returns empty/degraded.

### Table Truncation Order (FK-safe, complete)

```
agent_messages, agent_sessions,
permitted_use_records, client_validation_submissions,
production_partner_disclosures, reference_data_agreements,
deal_contracts, deal_milestones, deal_messages,
negotiation_knowledge, deals,
identity_package_versions,
training_contributions, consent_records,
guardrail_configs, licensing_rules_configs,
notifications, misuse_detections, twin_locks,
audit_logs, onboarding_sessions,
bfi2_responses,
twins,
organization_memberships, organization_users_table,
otp_table,
invoices, usage_meters, payouts,
marketplace_inquiries, marketplace_listings,
waitlist_entries, access_codes,
user_table, organization_table,
```

### Database Isolation

When `DEMO_MODE=true` and `DEMO_DATABASE_URL` is set, create a separate async engine + session maker for the demo DB. Override `get_db()` to use this engine. If `DEMO_DATABASE_URL` is empty, fall back to `DATABASE_URL` with a warning log: "DEMO_MODE active but no DEMO_DATABASE_URL set — using main database. Reset will wipe all data."

---

## Frontend Implementation

### Files to Create

**`AIV-frontend-mvp-vault/src/components/demo/demo-panel.tsx`**
- Hidden by default. Toggle: `Ctrl+Shift+D` / `Cmd+Shift+D`.
- Floating bottom-right, semi-transparent, minimal.
- Shows: current phase name, mode indicator, advance button, reset button.
- Advance button shows what happens next: "Advance → Twin matures to ACTIVE (2 weeks pass)"
- Reset has confirmation dialog.
- After advance: toast with summary + auto-redirect to suggested page.
- Fetches state from `GET /demo/state` on mount and after actions.

**`AIV-frontend-mvp-vault/src/lib/demo-mode.ts`**
```typescript
export const isDemoMode = process.env.NEXT_PUBLIC_DEMO_MODE === "true";
```

**`AIV-frontend-mvp-vault/src/lib/api/demo.ts`** — API client:
```typescript
export const demoApi = {
  reset: (mode: "walkthrough" | "showcase") => apiClient.post("/demo/reset", { mode }),
  advance: () => apiClient.post("/demo/advance"),
  getState: () => apiClient.get("/demo/state"),
};
```

### Files to Modify

**`AIV-frontend-mvp-vault/src/app/layout.tsx`** — After `{children}` inside `<Providers>`:
```tsx
{isDemoMode && <DemoPanel />}
```
Use `next/dynamic` with `ssr: false`.

**`AIV-frontend-mvp-vault/src/app/auth/verify/page.tsx`** — When `isDemoMode`, show OTP from sessionStorage (stored during signup from `dev_otp` response field) as a small badge near the input: "Demo code: 123456".

**`AIV-frontend-mvp-vault/src/app/auth/signup/page.tsx`** — When `isDemoMode`, pre-fill access code field with `"DEMO-2026"`.

---

## Environment Gating

**Backend:**
- `DEMO_MODE=true` activates demo router + mock injection + dev_otp
- Demo router returns 404 without the flag
- Mocks only replace services whose API keys are missing

**Frontend:**
- `NEXT_PUBLIC_DEMO_MODE=true` enables demo panel + OTP display + access code pre-fill
- All gated behind `isDemoMode` check
- Tree-shaken in production builds

---

## Verification Checklist

### Walkthrough Mode
- [ ] `POST /demo/reset {"mode": "walkthrough"}` clears all tables (including bfi2_responses, waitlist_entries, marketplace tables, access_codes)
- [ ] Creates access code "DEMO-2026"
- [ ] Real signup works. OTP shown in-app.
- [ ] Real discovery finds Matthew McConaughey
- [ ] Real onboarding completes (all 3 steps: Discovery, Review & Consent, Authorize)
- [ ] Real training area works (if ALCM running)
- [ ] Advance 1: twin transitions to ACTIVE, 5 training contributions created, 3 agent sessions with realistic messages, package sealed, health endpoint returns HEALTHY
- [ ] Advance 2: guardrail v2 created, consent revoked+re-granted, Lincoln deal created as SUBMITTED
- [ ] Advance 3: deal messages created, status → ACTIVE, contract generated, milestones created, commission invoice, platform fee activated
- [ ] Advance 4: milestones progressed, payout processed, Wild Turkey + Spotify deals created, misuse event logged
- [ ] Advance 5: Deal 1 COMPLETED, team member added, final invoices/payouts
- [ ] Commission math: 30% ($45K) / 25% ($21.25K) / 20% (pending)

### Showcase Mode
- [ ] `POST /demo/reset {"mode": "showcase"}` creates full state in < 5 seconds
- [ ] Login as demo@aiv.chat / AIVDemo#2026 works
- [ ] Every page has data — zero empty states
- [ ] `/dashboard` — health indicators visible, 3 deals in pipeline
- [ ] `/twin` — all 5 tabs populated. Health endpoint returns HEALTHY even if ALCM is down.
- [ ] `/deals` — COMPLETED + ACTIVE + SUBMITTED visible, revenue summary correct
- [ ] `/settings/billing` — 6 invoices, 2 payouts
- [ ] `/twin/certification` — 2 package versions with hashes
- [ ] Notifications: 16 total, last 3 unread
- [ ] Audit log: ~42 entries spanning 6 months

### Mock Services
- [ ] StripeService mock only active when STRIPE_SECRET_KEY is empty
- [ ] ESignService mock only active when ZOHO_SIGN_CLIENT_ID is empty
- [ ] BlockchainService mock only active when POLYGON_RPC_URL is empty
- [ ] When keys ARE configured, real services are used (not mocks)
- [ ] Module-level patching works for both top-level and local imports in routers

### Environment Gating
- [ ] `DEMO_MODE` unset → `/demo/*` returns 404, no mocks loaded, no demo panel
- [ ] Demo panel hidden by default, appears on Ctrl+Shift+D / Cmd+Shift+D

### Data Integrity
- [ ] All foreign keys valid (deal_id in audit_logs, twin_id in notifications, etc.)
- [ ] Consent ledger is append-only
- [ ] Timestamps chronologically consistent across related records
- [ ] deal_number sequence determines correct commission rates
- [ ] Identity package cascaded_to_deals references correct deal IDs
