# AIV Vault Launch — Action Plan
## Date: March 3, 2026
## Status: ACTIVE — Execute immediately

---

## Guiding Principle

A creator signs up, and from that moment they have legal grounds to protect
themselves. That's the MVP. Everything else is iteration.

**What "launch-ready" means:**
1. Capture identity (onboarding — already works)
2. Certify it (SHA-256 — exists, needs better UX)
3. Give them legal tools to protect it (templates — not built yet)
4. Show them where their likeness appears (footprint scan — not built yet)

**What launch-ready does NOT mean:**
- Automated monitoring (post-launch)
- Marketplace or licensing portal (Stage 2)
- Manager multi-talent dashboard (Stage 2)
- AI document generation (not needed)
- Subscription pricing (revenue is per-deal commission, Stage 2)

---

## Revenue Model Reminder

Zero upfront cost. AIV is free to onboard. Revenue comes from Stage 2
licensing commissions (per-deal, like Stripe). No SaaS subscription tiers
for MVP. The sales pitch is "we only earn when you earn."

---

## Phase 1: TODAY (Hours) — Make It Demoable

### 1.1 Dashboard Redesign — Show Real Data
**What**: Replace hardcoded placeholder dashboard with real ALCM data.
**Why**: Current dashboard shows "Your Digital Twin" with 0% completeness
and fake activity feed. Useless for demos.
**How**:
- Fetch real twin data on dashboard load (API already exists)
- Show real name, category, bio from ALCM
- Calculate real completeness from ALCM section fill rates
- Show real certification status (certified date, or "Not yet certified" CTA)
- Show real voice clone status
- Activity feed pulls from real audit log API (already exists)
- Protection checklist instead of vanity score:
  - ✅/❌ Identity captured
  - ✅/❌ Voice cloned
  - ✅/❌ Identity certified
  - ✅/❌ Governance rules set
  - ✅/❌ Legal documents generated
  - ✅/❌ First scan completed
- Quick action buttons: "Certify Now" / "Run Scan" / "Generate Document"

### 1.2 Certification UX — Make It Look Like a Legal Document
**What**: Transform the certification page from a developer hash display
into something that looks and feels like a legal certificate.
**Why**: The playbook calls this "the digital equivalent of a title deed."
Currently it's a hash string in a card. Needs to feel like a document
you'd show a lawyer.
**How**:
- Certificate page with:
  - Talent's full name (large, prominent)
  - "Certificate of Digital Identity Ownership"
  - Date of certification
  - Version number
  - SHA-256 hash (displayed formally, not as debug output)
  - What's covered: list of certified assets (identity, personality,
    voice, visual, commercial terms, governance)
  - Unique verification URL (aiv.chat/verify/{cert-id})
  - "This certificate attests that the above-named individual's digital
    identity profile was captured, reviewed, and certified on [date]."
  - Download as PDF button
- Public verification page (/verify/[cert-id]):
  - Anyone with the URL can verify the certification is valid
  - Shows: talent name, certification date, hash, status
  - Does NOT show ALCM data (just confirms it exists and is certified)
- Certification card on dashboard showing status prominently

### 1.3 Legal Template Library — First 2 Templates
**What**: DMCA Takedown Notice and Cease & Desist Letter templates with
merge fields auto-populated from ALCM data.
**Why**: These are the "take action" tools. The core deliverable of
"protection at a fraction of law firm cost."
**How**:
- New page: /twin/documents/templates (or integrate into existing doc library)
- Template selection screen (cards with description of each template)
- Step-by-step form flow:
  1. Select template
  2. Review auto-populated fields (from ALCM — name, contact, identity
     description, certification reference). All editable.
  3. Fill manual fields (infringing URL, platform, recipient, etc.)
  4. Preview the complete document
  5. Download as PDF
- Template 1: DMCA Takedown Notice
  - Auto-populated: Owner name, contact info, description of protected
    identity (from ALCM), certification hash + date as proof of ownership
  - Manual: Infringing URL, platform, description of infringement,
    date discovered
  - Includes all 6 required elements under 17 U.S.C. § 512
- Template 2: Cease & Desist Letter
  - Auto-populated: Owner name, protected assets description,
    certification details, applicable state laws
  - Manual: Recipient name/address, specific violation, demand
  - Professional formatting, downloadable PDF

### 1.4 ALCM Inline Editing
**What**: Let users edit their identity profile directly from the twin
profile tabs.
**Why**: Currently the 6 tabs are read-only. Users can't update their
identity data after onboarding. This is broken.
**How**:
- Add "Edit" button to each ALCM tab section
- Click edit → fields become form inputs (text, textarea, tag inputs)
- Save → PUT to twins API with deep-merge (already supported)
- Each save creates an audit log entry
- Keep it simple: direct editing, no approval workflow for self-edits
  (approval workflow is for when managers edit on behalf of talent — later)

---

## Phase 2: THIS WEEK (Days 1-3) — Make It Scannable

### 2.1 Digital Footprint Scan (Basic)
**What**: On-demand scan that shows where a talent's likeness appears online.
**Why**: The #1 sales demo tool. "What if we ran a scan and showed you
exactly what's out there?" Nothing converts faster.
**How**:
- Backend: New FastAPI endpoint + Celery background task
- Scan sources (start with what's feasible):
  - Google Cloud Vision API — web detection (finds visually similar images
    across the web). Free tier: 1,000/month. Paid: $3.50/1K.
  - Google Custom Search API — name + likeness mentions. Free: 100/day.
  - TinEye API — reverse image search. $200/month for 5K searches.
  - Start with Google Cloud Vision + Custom Search (cheapest, fastest to
    integrate). Add TinEye if results are thin.
- Frontend: "Run Scan" button on dashboard → loading state → results page
- Results displayed as cards:
  - Thumbnail (if image found)
  - Source URL + platform name
  - Match type (exact image, similar image, name mention)
  - Confidence indicator
  - "Flag as Unauthorized" button → feeds into takedown workflow
  - "Mark as Authorized" button → whitelist
- Store scan results in DB for history
- Scan history page showing past scans with result counts
- **Cost reality check**: Validate actual costs with small test before
  promising unlimited scans. May need to limit free scans.

### 2.2 Remaining Legal Templates (4 more)
**What**: Complete the template library with 4 more templates.
- Template 3: AI Usage Consent Form
- Template 4: Licensing Agreement (basic — for Stage 2 readiness)
- Template 5: Brand Partnership Brief
- Template 6: Media Kit (auto-generated from ALCM)
**Why**: Full legal toolkit. Media kit is especially useful — managers
always need these and currently create them manually.

### 2.3 Voice as Protected Asset (UX Repositioning)
**What**: Reframe the voice page from "TTS demo" to "Voice Protection."
**Why**: Voice cloning is our most impressive feature AND our biggest
differentiator. No competitor combines voice cloning + certification +
legal framework. But currently it's presented as a toy.
**How**:
- Rename "Voice Identity" → "Voice Protection" in sidebar and page title
- Add voice certification card (SHA-256 of voice sample + clone metadata)
- Show "Voice Protection Status" prominently:
  - Voice captured: ✅/❌
  - Voice cloned: ✅/❌
  - Voice certified: ✅/❌
  - Voice monitoring: Coming soon
- Keep TTS demo but frame it as "Verify your voice clone accuracy"
- Add "What's Protected" section explaining legal standing of voice
  ownership (reference ELVIS Act, McConaughey strategy)
- Link to "Generate Takedown Notice" for voice-specific violations

### 2.4 Fan Report Form (Public Page)
**What**: Public page where fans can report unauthorized use of a talent's
likeness. No login required.
**Why**: Community-powered monitoring at zero API cost. Fans already do
this organically — we're giving them a structured channel.
**How**:
- Public route: /protect/[talent-slug]/report
- Shows talent name + verified photo + "Help protect [Name]"
- Form: report type, URL, platform, description, evidence upload
- Captcha + rate limiting + duplicate URL detection
- Submissions go to management review queue (internal)
- No rewards system. Motivation is "help protect someone you care about."

---

## Phase 3: NEXT WEEK (Days 4-7) — Make It Enforceable

### 3.1 DMCA Takedown Workflow
**What**: Connect flagged content (from scans or fan reports) to actual
takedown submission.
**How**:
- From any flagged content → "Initiate Takedown" button
- Auto-generates DMCA notice from template + evidence + ALCM data
- User reviews and confirms
- System submits to platform (start with manual — user copies notice
  and submits to platform's IP form. Automate via DMCA.com API later.)
- Status tracking: Submitted → Acknowledged → Removed / Rejected
- Dashboard shows active takedowns with status

### 3.2 Monitoring Dashboard
**What**: Central view of all protection activity — scan results, fan
reports, takedown status, alerts.
**How**:
- Aggregated view pulling from: scan results, fan reports, takedowns
- Filter by: platform, type, severity, status
- Each item: thumbnail, source, type, status, quick actions
- Stats: total threats detected, takedowns submitted, success rate

### 3.3 Training Portal → Approval Workflow
**What**: Replace the "Coming soon" stub with a change request system.
**Why**: The playbook says "every adjustment goes through approval before
it's live." Currently there's no way to propose or approve ALCM changes
beyond direct editing.
**How**:
- Change request submission: select what to change, describe the change,
  attach evidence
- Review queue: list of pending requests
- Review interface: current state vs. proposed state (side-by-side)
- Approve → changes applied to ALCM, new certification generated
- Reject → with comment explaining why
- Audit trail on every action

---

## Phase 4: WEEK 2 (Days 8-14) — Make It Robust

### 4.1 Automated Scheduled Monitoring
- Celery Beat scheduler for recurring scans
- Weekly image scans, daily name monitoring
- Alert notifications (email + in-app)

### 4.2 Threat Reports
- Weekly aggregated report generation
- Exportable as PDF
- Email delivery to talent/manager

### 4.3 OpenTimestamps Blockchain Anchoring
- Anchor SHA-256 hashes to Bitcoin blockchain via OpenTimestamps
- Free, lightweight, adds independent verification
- Verification page shows blockchain proof
- No crypto/web3 language in UI — just "independently verified timestamp"

### 4.4 Public Verification Page Polish
- /verify/[cert-id] page fully polished
- Shareable link for legal proceedings
- QR code generation for physical documents

---

## What We're NOT Building (Scope Control)

- ❌ AI document generation (users can use ChatGPT/Claude and upload)
- ❌ Subscription pricing tiers (revenue is per-deal commission, Stage 2)
- ❌ Manager multi-talent dashboard (needs role-based auth — Stage 2)
- ❌ Marketplace / licensing portal (Stage 2)
- ❌ Real-time web crawling (Loti has 10K+ servers for this — don't compete)
- ❌ Smart contracts (Vermillio territory — we focus on protection layer)
- ❌ Canvas/artifact feature for AIV chat (deprioritized)
- ❌ Protection Score gauge (vanity metric — use checklist instead)
- ❌ Blockchain-native anything (OpenTimestamps is the lightweight exception)

---

## Technical Notes

### APIs to Integrate
| API | Purpose | Cost | Priority |
|-----|---------|------|----------|
| Google Cloud Vision | Web detection, image matching | Free 1K/mo, $3.50/1K after | Phase 2 |
| Google Custom Search | Name/likeness mentions | Free 100/day | Phase 2 |
| TinEye | Reverse image search | $200/mo (5K searches) | Phase 2 (if needed) |
| DMCA.com | Takedown submission | Subscription (TBD) | Phase 3 |
| OpenTimestamps | Blockchain anchoring | Free | Phase 4 |

### New Backend Models Needed
- `ScanResult` — stores footprint scan results (source_url, platform,
  match_type, confidence, status, thumbnail_url, scan_id)
- `Scan` — scan metadata (twin_id, initiated_by, status, started_at,
  completed_at, result_count)
- `FanReport` — community reports (twin_id, reporter_email, report_type,
  url, platform, description, evidence_url, status)
- `Takedown` — takedown tracking (twin_id, target_url, platform, status,
  notice_document_id, submitted_at, resolved_at)
- `LegalDocument` — generated legal documents (twin_id, template_type,
  data, generated_at, downloaded_at)
- `ChangeRequest` — ALCM change proposals (twin_id, requester_id,
  asset_type, current_state, proposed_state, status, reviewer_id,
  reviewed_at, comments)

### New Frontend Pages/Routes
- /verify/[cert-id] — public certification verification
- /protect/[slug]/report — public fan report form
- /twin/documents/templates — legal template library
- /monitoring — scan results + alerts dashboard (Phase 3)
- /monitoring/scan — trigger and view scans (Phase 2)

### Existing Infrastructure We're Leveraging
- Twin model + ALCM JSON (exists)
- Certification service + SHA-256 (exists)
- Document model + TipTap editor (exists)
- Audit log model + API (exists)
- Voice cloning pipeline (exists)
- Onboarding flow (exists, works end-to-end)
- All CRUD routers (exist)
- Celery + Redis (exists in docker-compose)

---

## Success Criteria for Launch

The platform is launch-ready when a sales rep can:
1. Walk a prospect through onboarding (3-5 min) → twin created, voice cloned
2. Show them a real dashboard with their actual identity data
3. Show them a certification that looks like a legal document
4. Run a digital footprint scan and show results
5. Generate a DMCA takedown notice pre-filled with their data
6. Download it as a PDF they can actually send to a platform
7. Show them the fan report page where their community can help

That's the demo. That's the product. Ship it.
