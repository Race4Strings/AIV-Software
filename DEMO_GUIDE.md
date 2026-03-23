# AIV Platform — Demo Walkthrough Guide

**Demo credentials:** `demo@aiv.chat` / `AIVDemo#2026`
**Persona:** Marcus Rivera — multi-platinum Latin music artist, 47M+ followers

---

## Before the Demo

1. Ensure all services are running:
   - Backend: `cd AIV-Backend-mvp-vault && ./venv/bin/uvicorn app.main:app --reload --port 8000`
   - ALCM API: `cd AIV-ALCM-API && ./venv/bin/uvicorn app.main:app --port 8001`
   - Frontend: `cd AIV-frontend-mvp-vault && npm run dev -- --port 3001`
2. Open `http://localhost:3001` in your browser
3. If data looks stale, re-seed: `cd AIV-Backend-mvp-vault && ./venv/bin/python scripts/seed_demo.py`

---

## The Walkthrough (8-10 minutes)

### 1. Landing Page (30 seconds)

> **What to say:** "AIV is identity infrastructure for the digital twin economy. We capture, structure, validate, and license digital representations of public figures — enabling any downstream tool to produce output that is genuinely faithful to that person. AIV doesn't synthesize voice or generate video. We produce and license the structured identity data that makes those outputs accurate."

**What they see:** Dark gradient landing with "Own Your Digital Identity" headline, CTAs to Get Started or Sign In.

**Action:** Click **Sign In**

---

### 2. Sign In (15 seconds)

Enter: `demo@aiv.chat` / `AIVDemo#2026`

> "Let me show you what Marcus Rivera's team sees when they log in."

---

### 3. Dashboard — Command Center (90 seconds)

**What they see:**
- **Identity Status:** Marcus Rivera, HEALTHY, "Identity Verified & Protected" badge
- **Revenue Card:** $105,000 net revenue
- **Pending Inquiries:** Spotify Studios $40K content license
- **Active Deals:** Beats by Dre $150K
- **Quick Actions:** Training Area, Review Deals, Certification

> **What to say:** "This is the command center. Marcus's team sees the health of his digital identity, active revenue from licensing deals, and pending inquiries from brands. Right now, Beats by Dre has an active $150K deal, Ubisoft is in contract negotiation for $85K, and Spotify just submitted a new $40K inquiry. That's $275K in pipeline with $105K already earned."

**Point out:** The notification bell (top right) shows **2 unread** — the Ubisoft and Spotify inquiries.

---

### 4. Identity Profile (60 seconds)

**Click:** "Identity" in the sidebar (or "View Identity" button)

**Walk through each tab:**

- **Identity tab:** Display name, bio, category (ENTERTAINMENT), clone type (PUBLIC_FIGURE), ALCM linked
- **Health tab:** CFS score, psychographic coverage, personality confidence
- **Guardrails tab:** 4 blocked topics (politics, religion, personal relationships, competitors), humor permitted, AI disclosure required
- **Licensing Rules tab:** $25K pricing floor, global territory, blacklisted use cases, 72h grace period

> "The talent's team configures exactly what their digital twin can and cannot do. These guardrails are enforced on every single piece of generated content. The licensing rules determine what deals are automatically approved vs. flagged for review."

---

### 5. Training Area (60 seconds)

**Click:** "Training Area" in the sidebar

**What they see:** Multi-mode assistant with 4 modes (Assistant, Digital Self, Training, Refinement)

> "This is where the talent interacts with their digital twin. In Assistant mode, it helps with platform questions and deal status. In Digital Self mode, Marcus can literally talk to himself — test how his twin responds. Training mode lets him add new information, and Refinement mode lets him correct anything the AI gets wrong."

**Action:** Type a message: "What deals do I have active right now?"

> "The assistant knows Marcus's deal history, revenue, and identity data. It's one brain across multiple knowledge domains."

**Optional:** Click "Digital Self" mode to show the mode switch.

---

### 6. Deals Pipeline (90 seconds)

**Click:** "Deals" in the sidebar

**What they see:**
- **Revenue summary:** 3 deals, $275K gross, $74.25K commission, $200.75K net
- **Pipeline groups:** Inquiries (Spotify), Negotiation (Ubisoft), Active (Beats)
- **Parameter flags:** Green checkmarks on deals within approved parameters

> "Every deal flows through a structured lifecycle. Inquiries come in, the team reviews parameter flags — does this deal meet pricing floor? Is the territory allowed? Is the use case permitted? — and either approves or rejects. The commission structure is transparent: 30% on first deal, 25% on second, 20% thereafter."

**Click:** The **Beats by Dre** deal card

---

### 7. Deal Workspace (60 seconds)

**What they see:**
- Overview: $150K, 30% commission ($45K), net $105K, data scope (identity_profile + voice_identity)
- Contract tab: Version 1, both parties signed
- Milestones tab: "Voice Model Integration" (due in 30 days), "Campaign Launch" (due in 60 days)
- PUL tab: Opening declaration submitted (Instagram, TikTok, YouTube, Beats App)

> "Each deal is a self-contained workspace. Contract, milestones, messaging with the client, Permitted Use Lifecycle tracking, and the data manifest showing exactly which identity modules were released. The client received Marcus's identity profile and voice identity — nothing more, nothing less."

---

### 8. Certification (45 seconds)

**Click:** "Certification" in the sidebar

**What they see:** AIV Seal with SHA-256 hash, blockchain anchor (Polygon)

> "Every identity is sealed with cryptographic provenance. The AIV Seal is anchored on-chain — it proves that this version of Marcus's digital identity was authorized by him, at this time, with this exact data. Any downstream output generated from this data inherits the provenance."

---

### 9. Onboarding Preview (45 seconds)

> "Let me show you how a new talent comes in."

**Open a new incognito tab** → `http://localhost:3001/onboard`

**Walk through the steps:**

1. **Discovery:** "Enter a handle, name, or URL. We pull public data across 400+ platforms."
2. **Review:** "The talent confirms which profiles are theirs."
3. **Upload:** "Professional files — audio, video, photos. Never webcam recordings."
4. **Rights:** "Identity category, successor designation, consent agreements."
5. **Authorize:** "Gate 2 — the talent personally says 'This is me. I authorize this for commercial use.' Without this, the Licensing Portal doesn't open."

> "The entire process treats them like a known public figure claiming and verifying what already exists about them — not an unknown person being interviewed."

---

### 10. Closing (30 seconds)

> "AIV is the infrastructure layer. We don't compete with voice companies, avatar companies, or AI chatbot companies — we make all of them better by giving them authorized, structured, faithful identity data. Every generation company becomes an integration partner, not a competitor. The talent controls the identity. The tools control the rendering."

---

## Key Numbers to Reference

| Metric | Value |
|--------|-------|
| Active deal value | $150,000 (Beats by Dre) |
| Pipeline total | $275,000 (3 deals) |
| Net revenue to talent | $200,750 |
| AIV commission earned | $74,250 |
| Commission structure | 30% / 25% / 20% (decreasing per deal) |
| Platform fee | $997/month (activates after first deal or 90 days) |
| Identity modules | 4 (Identity Profile, Knowledge Base, Voice Identity, Visual Identity) |
| Guardrail enforcement | Real-time, on every generated output |

---

## FAQ Prep

**"How is this different from licensing through an agency?"**
> AIV is infrastructure, not an agency. The talent's team does their own business development. We provide the data layer, the licensing automation, and the identity protection. Agencies can use AIV as their backend.

**"What if the talent changes their mind about a deal?"**
> They can update guardrails or revoke consent at any time. Active deals are flagged with a configurable grace period for the client to adjust.

**"How do you ensure the AI actually sounds like the talent?"**
> The ALCM (Artificial Life Conception Model) is our proprietary identity engine. It captures personality across 9 processing modules — psychographic classification, dimensional scoring, personality core, context modulation, and more. Every generated output is validated for personality consistency.

**"What's the revenue model?"**
> 30% commission on first deal, 25% on second, 20% thereafter. Plus a $997/month platform partnership fee that only activates after the talent is already earning. We absorb the full cost of building their digital identity upfront.
