# AIV Platform — Definitive Layout & Route Specification

> Every route, heading, button, form field, copy, and state.
> Updated to reflect the current codebase as of the latest deployment.

---

## GLOBAL LAYOUT

```
┌──────────────────┬───────────────────────────────────────────────────────┐
│    SIDEBAR       │  HEADER                                   🔔  [AT ▾] │
│    (w-60 / w-12) │  ────────────────────────────────────────────────────│
│                  │                                                      │
│  🛡 AIV          │                                                      │
│                  │                                                      │
│  ┌────────────┐  │                                                      │
│  │ My Vault ▾ │  │                  MAIN CONTENT                        │
│  └────────────┘  │                                                      │
│  ┌────────────┐  │           (changes per route)                        │
│  │ 🔑 Matthew │  │                                                      │
│  │   ACTIVE ▾ │  │                                                      │
│  └────────────┘  │                                                      │
│                  │                                                      │
│  ────────────    │                                                      │
│  🏠 Home         │                                                      │
│  🔑 Identity     │                                                      │
│  🧠 Training  ▾  │                                                      │
│    Today          │                                                      │
│    "Brand voice"  │                                                      │
│    "Personality"  │                                                      │
│    Yesterday      │                                                      │
│    "Career ref."  │                                                      │
│    + New Session  │                                                      │
│  💼 Deals    [3]  │                                                      │
│  🛡 Protection    │                                                      │
│                  │                                                      │
│  ────────────    │                                                      │
│  [« Collapse]    │                                                      │
└──────────────────┴───────────────────────────────────────────────────────┘
```

### Sidebar (Left — Fixed Position)

**Two modes:**

| Mode | Width | Trigger |
|------|-------|---------|
| Expanded | 240px (w-60) | Default, click expand button |
| Collapsed | 48px (w-12) | Click collapse button, persists to localStorage |

**Expanded sidebar contents (top to bottom):**

1. **Logo:** ShieldCheck icon + "AIV" text (uppercase, tracking-wider)

2. **Organization dropdown:**
   - Shows: Colored avatar letter + org name + ChevronDown
   - Dropdown menu: List of user's orgs (with role badges), separator, "Rename" (opens dialog), "Manage Team" → `/settings/team`, "Settings" → `/settings`, separator, "+ New Organization" (opens dialog)

3. **Twin switcher dropdown:**
   - Shows: Fingerprint icon + twin name + status dot (color-coded)
   - Status dot colors: ACTIVE=green, BUILDING/INITIALIZING=amber, LOCKED/PROTECTED_HOLD=red, ARCHIVED=gray
   - Dropdown menu: List of twins (with status badges), separator, "+ Add New Identity" → triggers onboarding

4. **Navigation items:**
   - 🏠 **Home** → `/dashboard`
   - 🔑 **Identity** → `/twin`
   - 🧠 **Training** (collapsible section):
     - "+ New Session" button
     - Session list grouped by date: Today, Yesterday, [day name] (within 7 days), Last Week (7-14 days), Earlier
     - Each session: MessageSquare icon + title + time (HH:MM)
     - Active session highlighted
     - Max 15 sessions shown
   - 💼 **Deals** → `/deals` (shows blue `bg-primary` badge with pending deal count)
   - 🛡 **Protection** → `/protection`

5. **Footer:** "Collapse" button (PanelLeftClose icon)
   - **"+ New Session"** button at bottom of session list (below all sessions)

**Collapsed sidebar:** Icon-only versions of all nav items with tooltips. Org = avatar letter. Twin = fingerprint + status dot.

**Mobile:** Sidebar hidden, replaced by Sheet overlay (always expanded) triggered by hamburger button in header.

### Header (Top — Sticky)

```
[☰ mobile only]                                    [🔔] [Avatar ▾]
```

- **Left:** Hamburger menu (mobile only, md:hidden)
- **Right:**
  - **Notifications bell:** Popover with notification list, unread count badge, "Mark all read" action, empty state: "No notifications"
  - **Avatar dropdown:** User name + email, separator, "Settings" → `/settings`, "Help" → `/help`, separator, "Log out"

---

## ROUTE MAP (25 routes)

| Route | Page | Auth | Layout |
|-------|------|------|--------|
| `/` | Landing | No | Full-screen (no sidebar) |
| `/auth/signin` | Sign In | No | Full-screen dark |
| `/auth/signup` | Sign Up | No | Full-screen dark |
| `/auth/verify` | Email Verification | No | Full-screen dark |
| `/auth/forgot-password` | Forgot Password | No | Full-screen dark |
| `/auth/reset-password` | Reset Password | No | Full-screen dark |
| `/onboard` | Onboarding (3 steps) | Yes | Full-screen (no sidebar) |
| `/calibration` | Precision Tuning | Yes | Full-screen (no sidebar) |
| `/dashboard` | Command Center | Yes | Sidebar + Header |
| `/twin` | Identity Management | Yes | Sidebar + Header |
| `/twin/training-area` | Training Area (Chat) | Yes | Sidebar + Header |
| `/twin/training` | Training Submissions | Yes | Sidebar + Header |
| `/twin/certification` | Certification | Yes | Sidebar + Header |
| `/deals` | Deals Pipeline | Yes | Sidebar + Header |
| `/deals/[id]` | Deal Workspace | Yes | Sidebar + Header |
| `/protection` | Protection | Yes | Sidebar + Header |
| `/settings` | Settings | Yes | Sidebar + Header |
| `/settings/billing` | Billing | Yes | Sidebar + Header |
| `/settings/team` | Team Management | Yes | Sidebar + Header |
| `/admin` | Admin Dashboard | Yes | Sidebar + Header (note: duplicate route exists at `app/admin/` — dashboard version takes precedence) |
| `/help` | Help Center | Yes | Sidebar + Header |
| `/licensing/[twinId]` | Licensing Portal | No | Full-screen (public) |
| `/verify/[certId]` | Certificate Verify | No | Full-screen (public) |
| `/legal/privacy` | Privacy Policy | No | Full-screen |
| `/legal/terms` | Terms of Service | No | Full-screen |

---

## PAGE SPECIFICATIONS

---

### LANDING (`/`)

**Layout:** Full-screen, dark, Aurora WebGL background

**Header:** AIV logo (left) + "Sign In" button (right)

**Hero:** Aurora gradient animation + signal notification cards + main headline

**CTA:** "Request Access" → opens Early Access Modal (10-step flow: role select → details → access code → signup → verify → success)

---

### SIGN IN (`/auth/signin`)

**Heading:** "Welcome back"
**Subheading:** "Sign in to your AIV account"

| Field | Label | Placeholder | AutoComplete |
|-------|-------|-------------|-------------|
| Identifier | "Email or Username" | "you@example.com" | username |
| Password | "Password" | "Enter your password" | current-password |

**Buttons:** "Sign In" (primary) · "Forgot password?" link · "Have an access code? Create your account" link
**Success:** → `/dashboard` · **Error:** "Invalid credentials. Please try again."

---

### SIGN UP (`/auth/signup?code=[optional]`)

| Field | Label | Placeholder | Validation | AutoComplete |
|-------|-------|-------------|-----------|-------------|
| Access Code | "Access Code" | — | Pre-fills from `?code=` | off |
| Name | "Name *" | "Full name" | Required | name |
| Username | "Username *" | "johndoe" | Required, min 3, a-z0-9_ | username |
| Email | "Email *" | "you@example.com" | Required, must contain @ | email |
| Password | "Password *" | "Min 8 characters" | Required, min 8 | new-password |
| Confirm | "Confirm Password *" | "Confirm your password" | Must match password | new-password |
| Terms | checkbox | "I agree to the Terms of Service and Privacy Policy" | Required | — |

**Component:** `<PasswordStrength>` below password (4 bars: destructive → warning → warning → success)
**Success:** → `/auth/verify?email=[email]`

---

### EMAIL VERIFICATION (`/auth/verify?email=[email]`)

**Heading:** "Verify your email"
**Subheading:** "We've sent a 6-digit verification code to {email}"

**OTP Input:** 6-digit numeric, monospace, auto-submit, supports paste
**Button:** "Verify Email" (disabled when < 6 digits)
**Resend:** 60-second cooldown ("Resend in {N}s")
**Footer:** "Didn't receive it? Check your spam or promotions folder." · "Back to sign in"
**Success:** → `/onboard`

---

### FORGOT PASSWORD (`/auth/forgot-password`)

**Heading:** "Reset Password" · **Subheading:** "Enter your email and we'll send you a reset link."
**Field:** Email input · **Button:** "Send Reset Link"
**Post-submit:** Always shows "If an account with that email exists, you'll receive a password reset link shortly."

---

### RESET PASSWORD (`/auth/reset-password?token=[token]`)

**No token:** "Invalid Link" + "This password reset link is invalid or has expired."
**With token:** New Password + Confirm Password (min 8) · **Success:** CheckCircle2 + "Your password has been updated."

---

### ONBOARDING (`/onboard`) — 3 Steps

**Layout:** Full-screen, centered max-w-2xl, progress bar (3 dots)

**Step 0 — Discovery:**
- **Heading:** "Who are we building for?"
- **Copy (manager):** "Enter your client's name, handle, or URL and we'll do the rest — searching public profiles, interviews, articles, and media to build a comprehensive foundation for their digital identity."
- **Copy (talent):** Same but with personal pronouns
- **Input:** "Enter a name, @handle, or URL" (text-lg, auto-focus)
- **Button:** "Build My Identity" (full-width)
- **Note:** "You can leave at any time and continue from where you left off."

**Step 1 — Review & Consent:**
- Discovery polling (4 animated stages, 45s timeout)
- "Continue with what we have so far" skip button
- Editable profile card (display_name, bio)
- Category multi-select (max 3): MUSIC, ENTERTAINMENT, SPORTS, BUSINESS, ACADEMIA, CULINARY, FASHION, MEDIA, GOVERNMENT, WELLNESS, ARTS, CHARACTER, VIRTUAL
- Clone type: "Personal Identity" / "Character or Brand"
- Profile consents (4, DATA_PROCESSING required):
  - "Public data discovery" · "Audio & video analysis" · "Behavioral analysis" · "Data processing & storage" (required)
- Licensing consents (3):
  - "Commercial licensing — Voice" · "Commercial licensing — Likeness" · "Commercial licensing — Behavioral & Personality"
- **Buttons:** "Back" / "Continue to authorization"

**Step 2 — Authorize:**
- Summary card: name, clone type, all granted consents, identity scores (CFS, coverage, confidence)
- Consent statement:
  - Manager: "I confirm that {name} has authorized me to act on their behalf for the creation and commercial licensing of their digital identity under the terms reviewed above."
  - Talent: "This is me. I authorize this version of my digital identity for commercial use under the terms reviewed above."
- "This is a recorded consent event."
- **Button:** "I Authorize This Identity" (success color, full-width)

**Completion:**
- Shield icon + confetti (30 particles)
- **"Your identity is ready"**
- "Your digital identity is now protected and building."
- "Your identity is secured with cryptographic verification and blockchain-anchored proof of ownership. Your Licensing Portal is open."
- Manager: "Train {name}'s twin to capture their voice, style, and personality with maximum accuracy."
- Talent: "Meet your digital self. A quick conversation to help your twin understand the real you — not just the public you."
- **"Start Training"** → `/twin/training-area` · "I'll do this later →" → `/dashboard`

---

### CALIBRATION (`/calibration`) — Precision Tuning

**Layout:** Full-screen, no sidebar

**Intro:**
- Brain icon · **"Make your twin sharper."**
- "Your digital twin is built from public data — interviews, posts, articles. This quick session (about 5 minutes) helps it understand the real you — not just the public you."
- "60 quick statements, one at a time. Takes about 5 minutes."
- **"Start Precision Tuning"** · "I'll do this later →"

**Per-item:** Progress bar + "X of 60 · ~N min remaining" · Domain label (e.g., "How you engage with people") · "I am someone who {text}" · 5 vertical buttons: Strongly Disagree → Strongly Agree · Auto-advance 300ms · Keyboard 1-5

**Done:** CheckCircle2 · **"Your twin just got sharper."** · "Go to Dashboard" → `/dashboard`

---

### DASHBOARD (`/dashboard`)

**Getting Started (dismissible, new users):**
- Sparkles icon · **"Getting Started — X of 5 complete"** · Progress bar
- Checklist:
  1. "Complete your identity profile" → `/twin`
  2. "Train your digital twin" → `/twin/training-area`
  3. "Complete Precision Tuning" → `/calibration`
  4. "Certify your identity" → `/twin/certification`
  5. "Create your first deal" → `/deals`

**Greeting:** "Good {morning/afternoon/evening}, {name}"

**KPI Row (3 cards) — varies by twin status:**

*ACTIVE twin:*
| Card | Value | Subtitle |
|------|-------|---------|
| Net Revenue | ${amount} | "across {N} deals" |
| Active Deals | {count} | "{rate}% conversion" |
| Identity Health | {icon} {label} | {description} |

*BUILDING twin:*
| Card | Value | Subtitle |
|------|-------|---------|
| Identity Status | Building | Progress description |
| Identity Health | {icon} {label} | Health description |
| Training Progress | {count} sessions | "Keep training to improve" |

**Pipeline (2/3) + Activity (1/3):** Deals by stage · Recent audit log entries (up to 6)

**Quick Actions:** Training Area, Deals, Certification, Start Precision Tuning (if incomplete)

---

### IDENTITY (`/twin`)

**Header:** Twin name · category badges · status badge · health indicator (icon + label + color)
**Actions:** 🔊 "Hear Your Twin" (TTS) · 🔒 Lock / 🔓 Unlock (ConfirmDialog + password, min 8 chars)
**Locked banner:** "Identity Locked — This identity is locked. Licensing portal is closed. Use the unlock button to restore access."
**Health tooltip:** "Your twin's health reflects data accuracy, personality coverage, and model confidence. Train your twin to improve these scores."

**Tabs:**
| Tab | Content |
|-----|---------|
| Identity | Profile fields, ALCM connection status, categories, clone type |
| Health | 3 progress bars (Profile Accuracy, Data Completeness, Model Reliability) — consistent for BUILDING and ACTIVE |
| Guardrails | Blocked topics, restricted topics, formality, controversy threshold, humor, AI disclosure (editable) |
| Licensing Rules | Pricing floor, territories, permitted/blacklisted use cases, exclusivity, grace period (editable) |

---

### TRAINING AREA (`/twin/training-area`)

**Header:** Bot icon · "Training Area" · twin name + status badge · "View Training Submissions" link
**ALCM unavailable banner:** "The identity engine is temporarily unavailable. Assistant mode works normally. Digital Self, Training, and Refinement modes may be limited."

**Chat interface:**
- Mode selector: [Assistant] [Digital Self] [Training] [Refinement]
- Mode-specific prompts displayed as suggestions
- Streaming message display
- Session stats bar: "{N} messages · {N} responses"
- **Input area:** [📎 Upload] [textarea] [🔗 Content ingest] [Send]
- **Upload button:** Opens file picker (audio, video, image, PDF, doc, txt)
- **Content ingest popover** (Link2 icon): "Train your twin — Paste a URL (YouTube, article, podcast) to add to your twin's knowledge." + URL input + "Add" button
- **New session** button creates via API and adds to sidebar
- **Session switching** via sidebar clicks updates chat content

---

### TRAINING SUBMISSIONS (`/twin/training`)

**Header:** Title + "+ New Submission" button

**Form (dialog):**
| Field | Type | Options/Placeholder |
|-------|------|-------------------|
| Category | Select | Personality & Style, Knowledge & Expertise, Voice & Speech, Visual & Appearance, Behavioral Patterns, Correction / Fix |
| What changed? | Text (required) | "e.g., Updated stance on AI regulation" |
| New information | Textarea (required) | "Enter the actual content, quote, position, or information to add..." |
| Source | Text (optional) | "Interview, article, personal knowledge..." |
| Target fields | Checkboxes | personality, knowledge, voice, communication_style, opinions |

**Cards:** Category + status badge · Approve (1-click) · Reject (2-step confirmation)

---

### CERTIFICATION (`/twin/certification`)

**Certificate card:** "Verified Certificate" (success icon) · Version · Blockchain seal (hash in monospace, network, tx hash link) · Copy button · Covered assets: Identity Profile, Personality Data, Voice Likeness, Visual Identity, Commercial Terms, Governance Rules · Audit trail · "Download Certificate" (PDF)

---

### DEALS (`/deals`)

**Summary row:** Total Value | Active | Pipeline | Conversion%
**Filter chips:** All, Submitted, Under Review, Approved, Contract Sent, Executed, Active, Completed, Expired, Terminated
**Status colors:** SUBMITTED=primary, UNDER_REVIEW=warning, APPROVED=success, CONTRACT_SENT=accent, EXECUTED/ACTIVE=success, COMPLETED=muted, EXPIRED=warning, TERMINATED=destructive
**Deal creation form:** Type, Value, Territory, Exclusivity, Start/End dates, Data Scope
**Empty:** "Licensing deals are how your identity generates revenue. Start by strengthening your digital twin in the Training Area." CTA → Training Area

---

### DEAL WORKSPACE (`/deals/[id]`)

**Breadcrumb:** Deals > {type} — Deal #{number}
**Header:** Title + status badge + transition action bar (with ConfirmDialog for irreversible actions)

**Tabs:** Overview | Contract | Milestones | Messages | PUL | Compliance

**Transitions:** SUBMITTED→"Begin Review" · UNDER_REVIEW→"Approve Inquiry" · APPROVED→"Send to Contract" · CONTRACT_SENT→"Mark as Executed" (destructive) · EXECUTED→"Activate Deal" (destructive) · ACTIVE→"Complete Deal"

---

### PROTECTION (`/protection`)

**Section 1 — Identity Certification:**
- Shield icon · **"Blockchain-Anchored Proof"** · "Cryptographically sealed, immutable record proving you created and own your digital identity." · "View Certificates" → `/twin/certification`

**Section 2 — Misuse Monitoring (Coming Soon):**
- **"AI-Powered Detection"** · Badge: "Coming Soon"
- 3 disabled feature cards: Content Scanning, Alert System, Enforcement Actions

---

### SETTINGS (`/settings`)

**Sections:** Account (name, email) · Appearance (Dark active, Light/System "Soon") · Notifications (5 toggles) · Security (password change with `<PasswordStrength>`) · Logout · Links: → Billing, → Team

---

### BILLING (`/settings/billing`)

**Breadcrumb:** Settings > Billing
**Payment:** Add/Update Card (Stripe) + "Manage Billing" (Stripe Portal)
**Fee-free tooltip:** "Your first 90 days are free. The $997/month platform partnership fee activates when your first deal executes or this window expires."
**Tables:** Invoices (date, type, amount, status) · Payouts (deal, gross, commission, net, status)

---

### TEAM (`/settings/team`)

**Breadcrumb:** Settings > Team
**Invite:** Email + Role select
**Roles:** Owner (Crown, warning) · Admin (Shield, primary) · Member (Users, foreground) · Viewer (Eye, muted)

---

### ADMIN (`/admin`)

**Sections:** Access Code Generation (label + count + generate) · Waitlist (grant single/batch) · Platform Activity Log (audit entries)

---

### HELP (`/help`)

**Heading:** "Help Center" · "Find answers to common questions about AIV."
**Accordion sections:** Getting Started (4) · Identity & Training (4) · Deals & Licensing (4) · Billing & Fees (3) · Security & Protection (3) · Account & Settings (3)
**Footer:** "Can't find what you're looking for?" · support@aiv.com

---

### LICENSING PORTAL (`/licensing/[twinId]`) — PUBLIC

**Header:** AIV logo + "Licensing Portal" + twin name
**Info panel (2/5):** Available modules (✓/✗), pricing floor, territory, permitted/blacklisted use cases, exclusivity
**Chat panel (3/5):** AI Licensing Assistant · Starter question chips: "What modules are available?" · "What's the minimum deal value?" · "Can I get exclusivity?" · "What territories are restricted?" · Input: "Ask about licensing terms, availability, pricing..."

---

### CERTIFICATE VERIFY (`/verify/[certId]`) — PUBLIC

ShieldCheck icon · Certificate card (cert ID, issue date, covered assets, blockchain seal, tx hash link) · Print + Download PDF

---

### LEGAL PAGES

`/legal/privacy` — Privacy Policy · `/legal/terms` — Terms of Service (prose-styled)

---

## DESIGN SYSTEM

| Token | Values |
|-------|--------|
| Typography | text-xs (12px min), text-sm, text-base, text-lg, text-xl, text-2xl, text-3xl, text-4xl |
| Spacing | 1, 2, 3, 4, 6, 8, 10, 12, 16 (no p-5, p-7, p-9) |
| Colors | All semantic: bg-primary, text-destructive, bg-success/10, etc. Includes sidebar tokens (bg-sidebar, text-sidebar-foreground, etc.) and chart tokens (chart-1 through chart-5). Primary has hex shade scale (primary-50 through primary-950) for explicit references — DEFAULT maps to OKLch CSS var. |
| Shadows | shadow-sm/md/lg/xl (dark blue-tinted in dark mode) |
| Radius | rounded-sm/md/lg/full |
| Glass | .glass-sm, .glass, .glass-lg, .glass-solid |
| Animation | fade-in, slide-in-right/bottom, scale-in, fade-out, shimmer |
| Motion | fast=150ms, normal=250ms, slow=400ms |
| Theme | Dark forced. Light = "Coming Soon" |
| Contrast | prefers-contrast: more supported |
| Motion | prefers-reduced-motion supported |
