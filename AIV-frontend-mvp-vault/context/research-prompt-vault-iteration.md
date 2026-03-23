# Research Prompt: AIV Vault MVP — Strategic Pivot & Rapid Iteration

## THE SINGLE MOST IMPORTANT THING

The #1 value proposition of this platform — the thing that must work in the MVP before anything else — is this:

**A creator signs up, and from that moment they have legal grounds to protect themselves.**

They get: a certified, defensible record of identity ownership. Monitoring that surfaces unauthorized use of their likeness. Legal document templates (takedown notices, cease & desist, licensing agreements) auto-populated from their identity data. And a clear path to take action — file claims, issue takedowns, enforce their rights.

This taps into the single biggest fear in entertainment right now: actors, musicians, influencers, and creators are terrified that their image, voice, and likeness are being cloned, diluted, and abused by AI — and they have no control over it. They want to own their human essence. They want to protect their person. We are the platform that gives them that power.

The marketplace, the monetization, the licensing revenue — all of that comes later. The MVP must nail PROTECTION. If a talent signs up and feels "my identity is now legally protected, I can see who's misusing it, and I have the tools to stop them" — we win. Everything else is Stage 2 and 3.

Every feature decision, every UI choice, every research recommendation should be evaluated against this question: **does this help the creator protect themselves?**

---

## IMPORTANT FRAMING

We are NOT building another AI chatbot or content generation tool. We are building **identity protection and licensing infrastructure** — a platform where celebrities, influencers, creators, and public figures can legally protect their name, image, likeness, and voice (NIL) from AI abuse, manage their digital twin, and eventually monetize it through controlled licensing. Think of it as **the legal and operational backbone for the digital twin economy**.

**On AI document generation**: Deprioritized. Users can create documents in ChatGPT/Claude and upload them — we don't need to compete with those tools. HOWEVER, there may be value in lightweight AI-assisted legal template generation (licensing agreements, takedown notices, consent forms) that auto-populates from the user's identity data. This doesn't require expensive models — just internet-connected models that can reference current legal frameworks. The key question for research: is there a narrow, high-value document generation use case that justifies the cost, specifically around legal/licensing templates?

**No crypto/web3**: We use cryptographic hashing (SHA-256) for proof-of-creation records, but we avoid all blockchain/web3 terminology. Trust > hype. Our certification is "tamper-proof record" not "on-chain verification."

---

## Context: What We're Building

AIV is identity infrastructure for the digital twin economy. The core product is "The Vault" — a premium workspace where high-profile individuals create, certify, protect, and eventually monetize their digital twin. The ALCM (Artificial Life Conception Model) is our proprietary synthesis engine that creates verified digital twins from research data, personality capture, and voice cloning.

**Positioning**: "AIV is the operating system for AI identity. We certify, protect, and monetize a talent's digital twin — so their team controls every use of their likeness, every deal closes in hours instead of months, and revenue flows automatically every time a brand licenses their twin. Think of it like Visa — but for AI identity."

**Revenue model**: Per-deal basis — AIV takes a platform commission on licensing deals (like Stripe takes a cut of transactions). Zero upfront cost to talent. This means we want LESS AI where it's not needed, keeping operational costs low.

**The vision**: We want to be the go-to platform for identity protection and licensing in the AI age. We handle the legal process at a fraction of what a law firm charges. Protection first, monetization later.

**Three-stage roadmap**:
- **Stage 1 — THE VAULT** (current MVP): Capture, certify, protect. Nothing is deployed or public. Talent reviews everything.
- **Stage 2 — THE INTAKE** (next): Licensing portal. Brands submit requests, managers set rules, deals auto-generate contracts.
- **Stage 3 — THE MULTIPLIER** (future): Marketplace, misuse detection, API access, multi-platform deployment.

**Who we serve**: Athletes, musicians, actors, executives, influencers, creators, estates of deceased talent. Decision makers are managers, agents, agencies, business managers, entertainment attorneys. One manager relationship can bring 10-50 talent onto the platform.

**The three value props every feature must serve**:
1. **Protection** — Proof-of-ownership, traceable, enforceable
2. **Revenue** — Licensing deals that close fast, revenue distributed automatically
3. **Control** — Talent's team sets every rule, nothing goes live without authorization

---

## Our Direct Competition

### Vermillio (TraceID) — PRIMARY COMPETITOR
[Source: vermill.io](https://vermill.io)

Vermillio is the first AI rights management platform, backed by Sony Music. Their TraceID system provides:
- IP & NIL Content Monitoring & Reporting
- Alerts & Automated Takedowns
- Lost Revenue Management
- IP & NIL asset preparation for AI Licensing
- Auditing of Authorized AI licenses
- Smart Contracts and Payment management
- 24/7 real-time content monitoring
- AI-powered content identification (even altered/AI-generated content)
- Automated takedown requests based on user-defined rules
- Quarterly AI Risk Score
- Monthly Threat Reports
- Data Licensing Opportunities

**Pricing tiers**: Free ($0 — quarterly AI risk score + licensing opportunities), Basic ($10/mo — 5 takedowns + monthly threat report), Plus ($99/mo — 30 takedowns + monthly threat report)

**Partners**: WME (major talent agency), Steve Harvey endorsement. Featured in major press.

**Key insight**: Vermillio focuses on the PROTECTION + LICENSING pipeline. They don't do personality capture or voice cloning — they assume the identity already exists and focus on monitoring/enforcement.

### Loti AI — SECONDARY COMPETITOR (Monitoring Focus)
[Source: lotiai.com](https://www.lotiai.com)

Loti AI is the leading platform for likeness and IP protection:
- Facial recognition scanning across the entire internet
- Voice likeness detection
- Deepfake detection and removal
- Fake account protection
- Automated DMCA takedowns (95% removal within 17 hours)
- 24/7 Watchtower monitoring
- Licensing platform for legitimate content use
- Free tier for basic monitoring

**Target users**: Everyone (free tier), Public Figures/Artists (paid Watchtower), IP holders (API access)

**Key insight**: Loti focuses heavily on the DETECTION side — scanning the web for unauthorized use. They have strong facial/voice recognition tech. They also offer licensing management but it's secondary to protection.

---

## The Legal Landscape We're Operating In

### Key Legal Frameworks (from our research)

**Right of Publicity** (State-level, patchwork):
- ~38 states have right-of-publicity laws (25 by statute, rest by common law)
- Scope varies wildly: California protects for 70 years post-death, Tennessee only 10
- Most laws were written before AI could generate convincing synthetic media
- Tennessee's ELVIS Act (March 2024) explicitly added "voice" protection including AI simulations

**Federal Legislation**:
- TAKE IT DOWN Act (signed May 2025) — first federal statute targeting non-consensual intimate imagery including AI deepfakes
- NO FAKES Act (introduced April 2025, not yet passed) — would create federal right of publicity for voice and visual likeness, with notice-and-takedown procedures

**The McConaughey Strategy** (Trademark-based protection):
- Matthew McConaughey trademarked his "Alright, alright, alright" as a sound mark with precise pitch/cadence description
- His team registered 8 trademarks covering video clips, audio snippets, and catchphrases
- Goal: create actionable federal court claims against AI voice/likeness cloning
- This approach gives access to federal court regardless of which state's publicity laws apply

**6 Pillars of Identity Protection** (from ISBA guide):
1. **Contracts**: AI-specific clauses requiring permission before creating AI versions
2. **Licensing Agencies**: Monitoring for AI misuse, notification requirements
3. **Social Media**: Watermarking, takedown notices, platform rights management tools
4. **Finances**: Monitoring brand usage, tracking tools, compensation for brand infringement
5. **Intellectual Property**: Trademark names/logos/catchphrases, copyright original content, biometric protections
6. **Enforcement**: Evidence preservation, DMCA takedowns, platform reporting, legal action

**Potential Legal Claims for Misuse**:
- Right of Publicity (state level)
- Copyright Infringement (state/federal)
- False Endorsement (FTC rules, federal)
- Unjust Enrichment
- Trademark Infringement (federal, USPTO)

**Practical Protection Steps**:
- Review/update contracts with AI-specific clauses
- Set up monitoring (brand protection firms, AI detection software)
- Create incident response plans
- Consider authorized AI partnerships (controlled licensing proves active management)
- Register trademarks for unique identifiers

---

## Current State of Our Platform (What's Built)

### Tech Stack
- **Frontend**: Next.js 15 (App Router), Tailwind CSS (dark theme), shadcn/ui, TanStack Query, TipTap editor, react-resizable-panels, Lucide icons
- **Backend**: FastAPI (Python), PostgreSQL (async SQLAlchemy), Redis, MinIO (S3), Alembic migrations
- **AI**: Google Gemini API (with Google Search grounding for research), SSE streaming
- **Voice**: ElevenLabs API (voice cloning + TTS)
- **Auth**: Session-based (cookies) + OTP email verification

### Features That Work End-to-End
1. **Onboarding Flow**: 3 text questions → 4 parallel Google-grounded research searches → 3 video questions (30s min, personality probes) → audio extracted for voice cloning → research review with editable cards → governance basics → Twin created with ALCM v1.0 + voice clone + certification. Takes 3-5 minutes.
2. **Twin Profile**: 6 read-only tabs (Identity, Personality, Visual, Voice, Commercial, Governance) displaying ALCM data
3. **Voice Identity**: Clone status, original sample playback, TTS demo
4. **Certification**: SHA-256 hash of ALCM data with audit trail
5. **Document Library**: CRUD for documents, TipTap editor with split-view layout
6. **Deal Tracker**: Manual deal entry with status workflow
7. **AIV Chat**: SSE streaming chat with Gemini

### What's Broken/Missing
1. **Dashboard**: Shows hardcoded placeholder data, not real twin data
2. **Training Portal**: Empty "Coming soon" stub
3. **No way to edit ALCM data** from UI after onboarding
4. **No protection/monitoring features** — this is the biggest gap
5. **No legal framework tools** — no trademark tracking, no takedown management
6. **Settings**: Just a theme toggle
7. **No real activity feed** — hardcoded placeholder entries

### The CEO's Feedback
After a demo review, the CEO was disappointed. Core concern: **no one would actually use this app as it is**. Features exist structurally but don't deliver real value. The app captures identity but gives users nothing meaningful to DO after onboarding. There's no reason to come back.

---

## What We Need Research On

### 1. CRITICAL: Identity Protection & Licensing Platform Design

This is the core of our pivot. Research how to build a platform that handles:

**Identity Asset Management**:
- How should we present the "identity vault" — the collection of protected assets (name, image, likeness, voice, catchphrases, trademarks)?
- What's the best UX for managing these assets? Think of it like a portfolio/vault view.
- How do Vermillio and Loti present their dashboards?

**Protection Monitoring**:
- What can we realistically build for monitoring unauthorized use?
- Can we integrate with existing monitoring APIs or services?
- What does a "threat report" look like? How should we present detected violations?
- How does Loti's Watchtower work from a UX perspective?
- What's the minimum viable monitoring feature we can ship?

**Takedown Management**:
- How should DMCA takedown workflows be managed in-app?
- What information needs to be collected for a valid takedown notice?
- How do platforms (YouTube, Instagram, TikTok, X) handle takedown requests?
- Can we automate parts of this process?

**Legal Document Generation**:
- What legal documents does an identity protection client need?
- AI usage consent forms, licensing agreements, takedown notice templates, trademark applications
- Can we pre-build templates that auto-populate from the user's ALCM data?
- This is where AI document generation DOES make sense — legal templates, not creative content

**Trademark & IP Tracking**:
- How should we track registered trademarks, copyrights, and other IP?
- What's the UX for managing a portfolio of IP registrations?
- How do we track filing status, renewal dates, jurisdictions?

### 2. Competitor Deep Dive

**Vermillio (TraceID)**:
- What's their full feature set beyond what's on the marketing site?
- How does their monitoring actually work?
- What's their onboarding flow?
- How do they handle the licensing side?
- What's their smart contract system?
- How do they present threat reports?
- What can we learn from their UX?

**Loti AI**:
- How does Watchtower work from a user perspective?
- What's their takedown process?
- How do they handle licensing management?
- What's their free vs paid feature split?
- How do they present scan results?

**Other players to research**:
- Clearview AI (facial recognition, controversial but relevant tech)
- MarkMonitor / Corsearch (brand protection, trademark monitoring)
- Red Points (brand protection, counterfeit detection)
- Attributer / Digimarc (digital watermarking)

### 3. Voice Cloning as Hero Feature

Voice cloning is our most impressive working feature. Research:
- How do ElevenLabs, Resemble.ai, Play.ht present voice clone management?
- What voice settings matter (stability, similarity, style)?
- How should we present voice as a PROTECTED ASSET, not just a demo toy?
- What's the legal framework for voice protection specifically?
- How does the McConaughey sound mark strategy apply to our users?

### 4. ALCM as Legal Evidence

Our ALCM (personality/identity data) + SHA-256 certification could serve as legal evidence of identity ownership. Research:
- How can a timestamped, hashed identity profile serve as proof of ownership?
- What's the legal weight of blockchain/hash-based certification?
- How does this compare to Vermillio's blockchain-based digital fingerprinting?
- What additional data should we capture to strengthen legal standing?

### 5. What Would Make This App Actually Useful?

Given our pivot to protection + licensing:

**For the individual (celebrity/influencer/creator)**:
- What would make them open this app daily? (Monitoring alerts, threat reports, takedown status)
- What pain points does identity protection solve that they currently handle via lawyers?
- How should the personality profile be presented to feel like a valuable LEGAL ASSET?
- What's the onboarding experience for identity protection? (Beyond personality capture — trademark inventory, existing IP, social media accounts to monitor)

**For talent managers**:
- How would they use this to manage multiple clients' identity protection?
- What reporting/analytics would be valuable?
- How does deal tracking need to work for licensing deals?

**For the legal process**:
- What can we automate vs what needs human lawyers?
- Can we partner with law firms for the actual legal filings?
- What's the "fraction of the cost" model — how do we price this?

### 6. Specific UI/UX Recommendations for Our Stack

Based on the research, provide specific, actionable recommendations for our Next.js + shadcn/ui + Tailwind stack:

**Dashboard redesign**: What should the homepage show? Think: protection status, recent alerts, identity completeness, active monitoring, pending takedowns, upcoming trademark renewals.

**Identity Vault view**: How should we present the collection of protected assets? Cards? Timeline? Portfolio view?

**Monitoring dashboard**: What does a real-time monitoring view look like? How do we show scan results, detected violations, takedown status?

**ALCM editing**: How should users edit their identity profile? Direct inline editing on tabs? Guided wizard? The less AI the better — just clean forms.

**Legal document templates**: What pre-built templates should we offer? How should template selection work? These should auto-populate from ALCM data.

**Voice showcase**: How should we present the voice clone as a PROTECTED ASSET with legal weight, not just a TTS demo?

**Deal/Licensing management**: What's the minimum viable licensing tracker? What fields matter for IP licensing deals?

---

### 7. Sales-to-Product Alignment

The sales playbook makes specific promises that the product must deliver. Research how to close these gaps:

**"What if we ran a scan of [talent]'s digital footprint and showed you exactly what's out there?"**
- This is the single most compelling sales tool mentioned. Can we build a basic version?
- What APIs exist for reverse image search, voice fingerprinting, social media scraping?
- How do Loti and Vermillio actually perform their scans technically?
- What's the minimum viable "digital footprint scan" we could ship?
- Could we use Google's reverse image search API, or social media platform APIs?
- Even a basic report showing "here's where your name/likeness appears online" would be powerful

**"Certify ownership with a cryptographic proof-of-creation record"**
- Our current implementation: SHA-256 hash of ALCM JSON data + timestamp
- The playbook calls this "the digital equivalent of a title deed" — how do we make it actually legally meaningful?
- What additional data should we capture to strengthen legal standing? (Consent records, witness signatures, notarization?)
- How does this compare to Vermillio's blockchain-based digital fingerprinting?
- Should we integrate with any existing legal/IP registration systems?
- **Blockchain consideration**: Vermillio uses blockchain for their TraceID fingerprinting. We don't want full web3 infrastructure or crypto terminology, but is there a lightweight approach — like periodically anchoring our SHA-256 hashes to a public blockchain (Bitcoin, Ethereum) as a timestamping service — that adds legal weight without the complexity? Think RFC 3161 trusted timestamping but with blockchain as the trust anchor. NOT for MVP launch, but worth understanding the feasibility and legal value for a future iteration.

**"Nothing goes live until talent and their team confirm the twin is accurate"**
- The Training Portal needs to be an approval workflow, not a chatbot
- Manager/talent submits change request → review → approve → ALCM updated
- What's the best UX for this kind of approval workflow? Think GitHub PR reviews but for identity data.
- How do talent management platforms handle approval workflows?

**"Manager sets rules: pricing floors, approved use cases, territory restrictions"**
- This is Stage 2 (The Intake) but we need the data model ready in Stage 1
- What governance/rules framework should we build into the ALCM now?
- What fields do licensing agreements typically need? (Territory, duration, use case, exclusivity, pricing)

**Multi-talent management (the Manager Multiplier)**
- One manager can bring 10-50 talent. The platform needs to support this.
- How should the manager dashboard differ from the talent dashboard?
- What's the UX for switching between talent profiles?
- How do existing talent management platforms handle multi-client views?

### 8. Community-Powered Reporting (Fan Tip Line)

An idea worth exploring: leveraging a talent's fan base to help detect unauthorized use of their likeness. Concept:

- Each talent gets a public "Report Unauthorized Use" page (no login required)
- Fans can submit reports with evidence (URL, screenshot, description)
- Reports go to the talent's management team for review in the platform
- Think of it as a tip line, not a bounty system
- Fans already do this organically on social media — we're just giving them a structured channel

**Key questions for research**:
- How do we make this spam-resistant? (Captcha, rate limiting, duplicate URL detection, requiring evidence)
- Should there be any reward/recognition system? Or is "helping protect [talent]" enough motivation?
- CRITICAL ABUSE VECTOR: If there's any prize pool, people will create deepfakes and report them to collect rewards. How do other platforms handle this? (Bug bounty programs have similar issues)
- Is a simple free reporting form enough for MVP? No rewards, no gamification — just structured submissions?
- How does this compare to Loti's automated scanning? Is community reporting complementary or redundant?
- Could this scale to be a meaningful data source for monitoring, or is it just a nice-to-have?
- What's the UX for the management team reviewing reports? (Queue, triage, mark as valid/spam, initiate takedown)

For MVP: probably just a simple public report form per talent + a management review queue. No rewards. The value is in giving fans a channel and giving managers a dashboard of community-reported violations.

### 9. Narrow AI Document Generation Use Case

We're NOT building a general-purpose AI writing tool. But there may be a narrow, high-value use case:

**Legal template generation that auto-populates from ALCM data**:
- AI Usage Consent Forms (pre-filled with talent's name, likeness description, voice characteristics)
- Licensing Agreement Templates (pre-filled with governance rules, pricing floors, territory restrictions)
- DMCA Takedown Notice Templates (pre-filled with talent's identity details, evidence of ownership)
- Cease & Desist Letter Templates
- Brand Partnership Brief Templates (auto-generated from ALCM personality/commercial data)
- Media Kit Generation (auto-generated from ALCM data — bio, stats, brand affiliations, voice sample link)

Research questions:
- Is this valuable enough to justify AI costs? Or should these just be static templates with merge fields?
- What model would be cost-effective for this? (Not Opus — maybe Haiku, Gemini Flash, or GPT-4o-mini?)
- How do legal tech platforms (LegalZoom, Rocket Lawyer, DocuSign) handle template generation?
- What's the minimum viable version? (Probably just merge-field templates, no AI needed)

---

## Output Format

Please structure your research as:

1. **Executive Summary** — Top 5 strategic insights that should drive our pivot
2. **Competitor Breakdown** — Detailed comparison table: Vermillio vs Loti vs AIV (us) — features, pricing, UX, gaps we can fill
3. **Legal Framework Summary** — What identity protection actually entails, step by step, and what we can automate
4. **Feature Priority Matrix** — What to build next ranked by (user value × implementation effort), specifically for protection/monitoring/licensing
5. **Identity Vault UX Spec** — How the main dashboard and asset management should work
6. **Monitoring & Takedown Workflow** — How to implement minimum viable monitoring, including technical feasibility of a "digital footprint scan"
7. **Community Reporting System** — UX spec for fan-powered violation reporting, spam prevention, management review queue
8. **Legal Document Template Library** — List of templates we should pre-build, whether AI-generated or merge-field based, and cost analysis
9. **Voice Protection Strategy** — How to position voice cloning as a legal asset, not just a demo
10. **ALCM as Legal Evidence** — How our certification system strengthens legal standing, what to add, and whether lightweight blockchain anchoring adds value (without going full web3)
11. **Dashboard Redesign Spec** — What the homepage should actually show post-pivot, mapped to the 3 value props (Protection, Revenue, Control)
12. **Training Portal as Approval Workflow** — UX spec for change request → review → approve flow (not chatbot)
13. **Manager Experience** — How to support multi-talent management, what the manager dashboard looks like
14. **Pricing Model Analysis** — How Vermillio and Loti price, and where we should position
15. **Sales-to-Product Gap Analysis** — What the sales playbook promises vs what we can actually deliver, with timeline to close each gap
16. **Launch Roadmap** — What to ship broken into: TODAY (hours), THIS WEEK (days 1-3), NEXT WEEK (days 4-7), WEEK 2 (days 8-14). We have AI-assisted development running agents in parallel, full codebase already scaffolded, and unlimited AI credits. Be aggressive but realistic. The sales team is already closing — every day without a functional product is a missed opportunity. Prioritize by what makes the biggest demo impact and what unblocks sales conversations.

Keep everything grounded in what's technically feasible with our stack (Next.js 15, shadcn/ui, Tailwind, FastAPI, Gemini, ElevenLabs). We have the full skeleton already built — pages, routes, models, routers, API clients all exist. We just need to make them useful. First round of high-value improvements should ship TONIGHT. The protection features (certification UX, legal templates, monitoring basics) are the priority — they're what makes the product worth demoing.

---

## Reference Sources

- [Vermillio TraceID Platform](https://vermill.io) — Primary competitor, AI rights management
- [Loti AI](https://www.lotiai.com) — Secondary competitor, likeness monitoring & takedowns
- [DBL Lawyers: Protecting Your Name and Likeness from AI Abuse](https://www.dbllawyers.com/protecting-your-name-and-likeness-from-ai-abuse-deepfake-legal-strategies/) — McConaughey trademark strategy, legal framework overview
- [ISBA: AI and Entertainment Guide](https://www.isba.org/public/guide/ai-entertainment) — 6 pillars of identity protection, enforcement checklist
- TAKE IT DOWN Act (signed May 2025) — First federal deepfake law
- NO FAKES Act (introduced April 2025) — Pending federal right of publicity
- Tennessee ELVIS Act (March 2024) — AI voice protection
