# AIV Platform — Full Codebase Context for MVP Review
**Generated: March 9, 2026 | Purpose: Cross-reference against Master Document v4.5**
**CONFIDENTIAL — For internal review only**

---

## EXECUTIVE SUMMARY

AIV is a two-repo platform (Next.js frontend + FastAPI backend) implementing a digital twin identity vault. The MVP focuses on Stage 1 (Build) and Stage 2 (Protect) from the master document, with partial Stage 3 (Launch) infrastructure. Below is a complete inventory of what exists in code today, mapped against the master document's feature stack and release stages.

---

## 1. TECH STACK

### Frontend (AIV-frontend)
- **Framework:** Next.js 15 (App Router), React 19, TypeScript
- **UI:** Tailwind CSS + shadcn/ui (30+ Radix UI components), Lucide icons, Framer Motion
- **State:** TanStack Query (React Query), Zustand, Context API
- **Forms:** React Hook Form + Zod validation
- **Rich Text:** TipTap editor (documents)
- **API:** Axios with proxy rewrite (`/api/backend/*` → Railway backend)
- **Auth:** localStorage user session + HTTP-only cookie (backend session)
- **Deployment:** Vercel (auto-deploys from `mvp/vault` branch)

### Backend (AIV-Backend)
- **Framework:** FastAPI 0.115.6, Python 3.11+, Uvicorn (async)
- **Database:** PostgreSQL 16 (SQLAlchemy 2.0 async ORM, Alembic migrations)
- **Cache/Sessions:** Redis 7 (HTTP-only cookie sessions, 24hr TTL)
- **Storage:** MinIO/S3-compatible (boto3) — voice samples, images, documents
- **AI:** Google Gemini 2.0 Flash (chat, research, document generation)
- **Voice:** ElevenLabs API (voice cloning + TTS)
- **Email:** SMTP (MailHog dev, production SMTP) + optional Resend
- **Deployment:** Railway (`peaceful-curiosity` project, `mvp` environment)

### Infrastructure (Docker Compose for local dev)
- PostgreSQL 16 (port 5432)
- Redis 7 (port 6379)
- MinIO (port 9000 API, 9001 console)
- MailHog (port 1025 SMTP, 8025 web UI)

---

## 2. DATABASE SCHEMA (15 Tables)

| Table | Purpose | Key Fields |
|-------|---------|------------|
| `user_table` | User accounts | id, name, email, user_name, password (bcrypt), is_verified |
| `twins` | Digital twin identities | id, user_id, name, public_name, category, bio, alcm_data (JSON), voice_id (HIDDEN), voice_status, commercial_terms (JSON), governance (JSON), status, completeness_score, version |
| `certifications` | SHA-256 proof-of-creation | id, twin_id, version, hash, consent_record (JSON) |
| `documents` | Generated/uploaded docs | id, twin_id, title, doc_type, content, status, exportable |
| `deals` | Licensing deal tracking | id, twin_id, brand_name, deal_type, value, currency, status, terms_summary, start_date, end_date, document_ids |
| `training_submissions` | ALCM refinement proposals | id, twin_id, category, content (JSON), status, target_fields, change_description |
| `audit_logs` | Compliance trail | id, twin_id, user_id, action, entity_type, details (JSON), ip_address |
| `onboarding_sessions` | 6-step onboarding flow | id, twin_id, user_id, status, current_step, research_data (JSON), voice_sample_urls, user_responses (JSON) |
| `otp_table` | Email verification/reset | id, user_id, otp, otp_type, expires_at |
| `workspace_table` | Chat organization | id, owner_id, name, is_default |
| `chat_table` | Conversations | id, workspace_id, creator_id, title, chat_type |
| `chat_participant_table` | Chat members | id, chat_id, user_id, twin_id, role |
| `chat_message_table` | Messages | id, chat_id, sender_user_id, content, message_type |
| `workspace_documents` | Knowledge base files | id, workspace_id, filename, storage_key, storage_url |
| `organization_table` | Team management (basic) | id, name, owner_id |

---

## 3. ALL FRONTEND PAGES & ROUTES

### Authentication (Public)
| Route | Status | Description |
|-------|--------|-------------|
| `/auth/signin` | ✅ Built | Email/username + password login |
| `/auth/signup` | ✅ Built | Account creation with email verification |
| `/auth/verify` | ✅ Built | OTP email verification (dev mode shows OTP) |
| `/auth/forgot-password` | ✅ Built | Request password reset |
| `/auth/reset-password` | ✅ Built | Reset password with OTP token |

### Onboarding (Authenticated, no sidebar)
| Route | Status | Description |
|-------|--------|-------------|
| `/onboard` | ✅ Built | 6-step twin creation: Welcome → Q1-Q3 text → Q4-Q6 video recording → Research review → Complete |

### Dashboard (Authenticated, sidebar layout)
| Route | Status | Description |
|-------|--------|-------------|
| `/` | ✅ Built | Vault Dashboard — protection status cards, checklist, asset grid, activity feed |
| `/twin` | ✅ Built | Twin profile with 6 tabs: Identity, Personality, Visual, Voice, Commercial, Governance |
| `/twin/documents` | ✅ Built | Document library — CRUD, search, filter, upload |
| `/twin/documents/[id]` | ✅ Built | Document editor with TipTap rich text |
| `/twin/documents/templates` | ✅ Built | Legal template generator (4 templates: DMCA, C&D, AI Consent, Right of Publicity) |
| `/twin/training` | 🟡 Placeholder | "Coming Soon" page with feature preview cards |
| `/twin/certification` | ✅ Built | SHA-256 certification, version history, public verification URL, PDF export |
| `/deals` | 🟡 Placeholder | "Coming Soon" page — Deals & Marketplace preview |
| `/deals/[id]` | 🟡 Route exists | Individual deal page (route exists but deals are "coming soon") |
| `/aiv` | ✅ Built | Chat interface with AI (SSE streaming, workspace/project context, chat history) |
| `/settings` | ✅ Built | Account info, theme toggle (light/dark), sign out, notifications (coming soon) |

### Public
| Route | Status | Description |
|-------|--------|-------------|
| `/verify/[hash]` | ✅ Built | Public certificate verification page (no auth required) |

---

## 4. ALL BACKEND API ENDPOINTS (50+)

### Authentication (`/auth`) — 8 endpoints
- `POST /auth/signup` — Register, send OTP
- `POST /auth/verify-email` — Verify email with OTP
- `POST /auth/resend-otp` — Resend verification code
- `POST /auth/signin` — Login (email/username + password)
- `GET /auth/signout` — Logout, destroy session
- `GET /auth/me` — Get current user
- `POST /auth/forgot-password` — Request reset OTP
- `POST /auth/reset-password` — Reset password with OTP

### Twins (`/twins`) — 10 endpoints
- `POST /twins` — Create twin
- `GET /twins` — List user's twins
- `GET /twins/{id}` — Get twin details
- `PUT /twins/{id}` — Update twin (ALCM deep-merge)
- `PATCH /twins/{id}` — Partial update alias
- `POST /twins/{id}/update` — Update via POST
- `DELETE /twins/{id}` — Delete twin + related records
- `POST /twins/{id}/delete` — Delete via POST
- `GET /twins/{id}/completeness` — Profile completeness score (0.0-1.0)
- `POST /twins/{id}/voice/tts` — Text-to-speech with cloned voice

### Certification (`/twins/{id}/certification`) — 3 endpoints
- `POST /twins/{id}/certification` — Generate SHA-256 hash of ALCM data
- `GET /twins/{id}/certification` — List all certifications
- `GET /twins/{id}/certification/latest` — Get latest cert

### Documents (`/twins/{id}/documents`) — 5 endpoints
- `POST /twins/{id}/documents` — Create document
- `GET /twins/{id}/documents` — List documents (filterable)
- `GET /twins/{id}/documents/{doc_id}` — Get document
- `PUT /twins/{id}/documents/{doc_id}` — Update document
- `DELETE /twins/{id}/documents/{doc_id}` — Delete document

### Training (`/twins/{id}/training`) — 4 endpoints
- `POST /twins/{id}/training` — Submit ALCM refinement proposal
- `GET /twins/{id}/training` — List submissions
- `PUT /twins/{id}/training/{sub_id}/approve` — Approve & apply via deep-merge
- `PUT /twins/{id}/training/{sub_id}/reject` — Reject submission

### Deals (`/deals`) — 5 endpoints
- `POST /deals` — Create deal
- `GET /deals` — List all user's deals
- `GET /deals/{id}` — Get deal
- `PUT /deals/{id}` — Update deal
- `PUT /deals/{id}/status` — Update status with validated transitions

### Onboarding (`/onboarding`) — 7 endpoints
- `POST /onboarding/start` — Start session
- `GET /onboarding/{id}` — Get session state
- `PUT /onboarding/{id}/step` — Submit step response
- `POST /onboarding/{id}/complete` — Complete onboarding, create twin, start voice cloning
- `POST /onboarding/{id}/research` — Trigger background research agents
- `GET /onboarding/{id}/research` — Get research results
- `POST /onboarding/{id}/voice` — Upload voice sample

### Chat & Workspaces — 12 endpoints
- `GET /workspaces` — List workspaces (auto-creates "General" default)
- `POST /workspaces` — Create workspace
- `PUT /workspaces/{id}` — Update workspace
- `DELETE /workspaces/{id}` — Delete workspace
- `GET /workspaces/{id}/chats` — List chats
- `POST /workspaces/{id}/chats` — Create chat
- `GET /chats/{id}` — Get chat with messages
- `POST /chats/{id}/messages` — Send user message
- `POST /chats/{id}/messages/assistant` — Store AI response
- `DELETE /chats/{id}` — Delete chat

### AI Chat (`/aiv`) — 2 endpoints
- `POST /aiv/chat` — Stream SSE chat response (modes: assistant, onboarding)
- `POST /aiv/chat/sync` — Non-streaming fallback

### File Upload (`/upload`) — 4 endpoints
- `POST /upload` — Generic upload (folder: uploads|voice|images|documents)
- `POST /upload/voice` — Voice recording upload
- `POST /upload/image` — Image upload
- `POST /upload/document` — Document upload

### Audit (`/audit`) — 1 endpoint
- `GET /audit` — List audit logs (filterable by twin_id, action, entity_type, date range)

### Public Verification (`/verify`) — 1 endpoint
- `GET /verify/{hash}` — Public certificate verification (no auth)

### Health — 3 endpoints
- `GET /` — API info
- `GET /health` — Health check
- `GET /health/voice` — Voice cloning config check

---

## 5. ALCM (Artificial Life Conception Model) — Data Structure

The ALCM is stored as a JSON blob in `twins.alcm_data`. Current sections:

```json
{
  "personality": {
    "traits": [], "communication_style": "", "values": [],
    "interests": [], "humor_style": "", "no_go_topics": [],
    "catchphrases": [], "emotional_range": ""
  },
  "knowledge": {
    "career_highlights": [], "expertise_areas": [],
    "education": [], "awards": []
  },
  "social_media": {
    "platforms": {}, "content_style": "", "content_themes": [],
    "posting_frequency": "", "follower_count": "", "engagement_rate": ""
  },
  "visual": {
    "style_notes": "", "brand_colors": [],
    "preferred_backdrop": "", "avatar_description": ""
  },
  "commercial": {
    "brand_partnerships": [], "business_ventures": [],
    "industry_focus": "", "collaboration_style": ""
  },
  "identity": {
    "public_bio": "", "known_for": [],
    "causes": [], "creative_philosophy": ""
  }
}
```

Updates use deep-merge (nested dicts merge recursively, lists replace entirely).

---

## 6. AI/ML INTEGRATIONS

### Google Gemini 2.0 Flash
- **Chat:** Streaming SSE responses with conversation history (last 20 turns)
- **Research Agents:** 4 parallel queries during onboarding (career, social media, interviews, commercial partnerships) using Google Search grounding
- **Document Generation:** Contracts, NDAs, brand briefs from templates + parameters
- **System Prompts:** Mode-specific (assistant vs onboarding)

### ElevenLabs Voice Cloning
- **Flow:** Video recorded during onboarding Q4 → ffmpeg extracts audio (16kHz mono WAV) → ElevenLabs creates voice clone → voice_id stored (NEVER exposed in API)
- **TTS:** Text-to-speech endpoint using cloned voice (eleven_multilingual_v2 model)
- **Status Tracking:** PENDING → PROCESSING → READY | FAILED
- **Security:** voice_id is proprietary, intentionally excluded from all API responses

---

## 7. ONBOARDING FLOW (Detailed)

1. **Welcome** — Introduction screen
2. **Q1** — Name, title/category, public name (text)
3. **Q2** — Social media handles (text)
4. **Q3** — Bio, personal statement (text)
5. **Q4** — On-camera personality question (video recording — voice sample extracted here for cloning)
6. **Q5** — On-camera personality question (video recording)
7. **Q6** — On-camera personality question (video recording)
8. **Research Review** — AI research agents run in background (4 parallel queries), user reviews results
9. **Processing** — Twin creation + voice cloning initiated as background task
10. **Complete** — Redirect to vault dashboard

---

## 8. SECURITY & AUTH

- **Password:** bcrypt hashing (passlib), minimum 8 chars
- **Sessions:** Redis-based, HTTP-only cookies, SameSite configurable, 24hr TTL
- **OTP:** 6-digit codes, 15-minute expiry, for email verification and password reset
- **CORS:** Configurable origins, credentials enabled
- **Audit:** Every sensitive action logged with user_id, timestamp, IP address
- **voice_id:** Proprietary ElevenLabs ID, never exposed in any API response
- **API Proxy:** Frontend uses Next.js rewrites to avoid CORS (same-origin to browser)

---

## 9. FRONTEND UI COMPONENTS (Key)

### Navigation
- Collapsible sidebar with: Dashboard, Identity, Documents, Training, Certification, Deals
- "Talk to AIV" chat section with workspace/project switcher and chat history
- Top header with user avatar dropdown (settings, sign out)

### Twin Profile (6 Tabs)
- **Identity:** Name, public name, category, bio, social media links (editable inline)
- **Personality:** Traits, values, communication style, interests (from ALCM)
- **Visual:** Image gallery, brand colors, mood boards
- **Voice:** Clone status badge, TTS playground (type text → generate speech), original sample playback, debug info
- **Commercial:** Licensing rates, exclusions, response times (editable)
- **Governance:** Privacy rules, usage restrictions, behavioral guardrails (editable)

### Vault Dashboard
- Protection Status cards (certification status, document count, protection level)
- Protection Checklist (5 items: identity captured, voice cloned, certified, governance set, documents created)
- Asset Overview grid (visual identity, voice, commercial terms, documents)
- Recent Activity feed with timestamps

### Document System
- Library with search, type/status filters
- Create new or upload existing
- TipTap rich text editor
- 4 legal templates: DMCA Takedown, Cease & Desist, AI Usage Consent, Right of Publicity
- Templates auto-populate from twin data

### Certification
- One-click SHA-256 certification
- Version history timeline
- Copy hash to clipboard
- Public verification URL
- PDF export (browser print)

---

## 10. KNOWN ISSUES & GAPS (from handoff doc)

1. **Frontend uses `/twins/` but backend originally used `/clone/`** — aliases were added but may still have edge cases
2. **Training Portal** — Backend endpoints exist (CRUD + approve/reject), frontend is "Coming Soon" placeholder
3. **Deals & Marketplace** — Backend endpoints exist (CRUD + status transitions), frontend is "Coming Soon" placeholder
4. **Notifications** — Settings page shows "Coming soon"
5. **Rate limiting** — Not implemented
6. **Real-time WebSockets** — Not implemented (SSE only for chat streaming)
7. **Payment processing** — Not implemented (no Stripe integration)
8. **Cross-Platform API** — Not implemented (master doc says August 2026)
9. **Marketplace** — Not implemented (master doc says Months 10-18)
10. **Web Misuse Detection** — Not implemented
11. **Twin Health Score** — Not implemented (master doc says full automation December 2026)
12. **Quarterly Twin Audit** — Not implemented in code
13. **Licensing Workspace** — Not implemented (this is a major Stage 3 feature)
14. **Permitted Use Lifecycle** — Not implemented
15. **Commission Engine** — Not implemented
16. **Behavioral Guardrails (runtime enforcement)** — Governance data is stored but not enforced at runtime
17. **Consent Framework (granular revocable grants)** — Not implemented as described in master doc
18. **Cryptographic Seal (blockchain-anchored)** — Current implementation is SHA-256 hash only, not blockchain-anchored
19. **Identity Vault (encrypted storage)** — Files stored in S3/MinIO but no special encryption layer
20. **Licensing Rules Engine** — Not implemented
21. **AI Licensing Assistant** — Not implemented
22. **Marketplace Discovery Interface** — Not implemented
23. **Enterprise Tier Controls** — Not implemented
24. **Multi-Client Architecture** — Not implemented (single-user per account)

---

## 11. FEATURE STACK MAPPING — Master Doc vs. Code Reality

### 1. Capture & Replication
| Feature | Master Doc | Code Status |
|---------|-----------|-------------|
| Identity Capture | ✅ Specified | ✅ Built — onboarding Q1-Q3 text intake |
| Identity Structuring | ✅ Specified | ✅ Built — ALCM JSON structure |
| Biometric Data Processing | ✅ Specified | 🟡 Partial — voice only (ElevenLabs), no face modeling |
| Knowledge Base Integration | ✅ Specified | ✅ Built — research agents populate ALCM knowledge section |
| Personality Modeling | ✅ Specified | ✅ Built — ALCM personality section from onboarding + research |
| High-Fidelity AI Replication | ✅ Specified | 🟡 Partial — voice clone exists, no visual/behavioral replication |
| ALCM | ✅ Specified | ✅ Built — JSON data model with deep-merge updates |
| Continuous Model Refinement | ✅ Specified | 🟡 Backend ready — training submission endpoints exist, frontend placeholder |

### 2. Protection
| Feature | Master Doc | Code Status |
|---------|-----------|-------------|
| Cryptographic Proof of Creation | ✅ Specified | ✅ Built — SHA-256 hash of ALCM data |
| Timestamp Certification | ✅ Specified | ✅ Built — created_at on certifications |
| Encrypted Storage | ✅ Specified | 🟡 Partial — S3/MinIO storage, no special encryption layer |
| Identity Vault | ✅ Specified | 🟡 Partial — data stored but no "vault" with cryptographic erasure |
| Consent Framework | ✅ Specified | ❌ Not built — no granular revocable consent grants |
| Web Misuse Detection | ✅ Specified | ❌ Not built |
| Misuse Alerts | ✅ Specified | ❌ Not built |
| Evidence & Audit Trail | ✅ Specified | ✅ Built — audit_logs table with full action tracking |
| Enforcement-Ready Documentation | ✅ Specified | 🟡 Partial — legal templates exist (DMCA, C&D, etc.) |
| Account & Twin Locking | ✅ Specified | 🟡 Partial — twin status can be set to SUSPENDED |
| Version Control | ✅ Specified | ✅ Built — twin version field, certification version history |
| Approval Workflows | ✅ Specified | 🟡 Backend ready — training approval flow exists |
| Behavioral Guardrails | ✅ Specified | 🟡 Data stored — governance JSON exists, no runtime enforcement |

### 3. Licensing Infrastructure
| Feature | Master Doc | Code Status |
|---------|-----------|-------------|
| Preset Licensing Rules Engine | ✅ Specified | ❌ Not built |
| Usage Permissions Management | ✅ Specified | ❌ Not built |
| Territory & Duration Controls | ✅ Specified | ❌ Not built |
| AI Training Permissions | ✅ Specified | ❌ Not built |
| Automated Contract Generation | ✅ Specified | 🟡 Partial — document templates exist, not automated from deals |
| Reference Data Agreement | ✅ Specified | ❌ Not built |
| Production Partner Disclosure | ✅ Specified | ❌ Not built |
| Permitted Use Lifecycle | ✅ Specified | ❌ Not built |
| E-Signature Integration | ✅ Specified | ❌ Not built |
| Instant Payment Processing | ✅ Specified | ❌ Not built |
| Dedicated Licensing Portal | ✅ Specified | ❌ Not built |
| AI Licensing Assistant | ✅ Specified | ❌ Not built |
| Commission Engine | ✅ Specified | ❌ Not built |
| Payout Management | ✅ Specified | ❌ Not built |
| Revenue Tracking | ✅ Specified | ❌ Not built |

### 4. Marketplace
| Feature | Master Doc | Code Status |
|---------|-----------|-------------|
| Discovery Interface | ✅ Specified | ❌ Not built |
| Inbound Deal Flow | ✅ Specified | ❌ Not built |
| Negotiation Tools | ✅ Specified | ❌ Not built |
| Complete Deal Flow Process | ✅ Specified | ❌ Not built |
| Deal Management | ✅ Specified | 🟡 Backend ready — deal CRUD + status transitions exist |

### 5. Cross-Platform Deployment
| Feature | Master Doc | Code Status |
|---------|-----------|-------------|
| Presence Management | ✅ Specified | ❌ Not built |
| API Access | ✅ Specified | ❌ Not built (August 2026 per master doc) |
| Cross-Platform API | ✅ Specified | ❌ Not built (August 2026 per master doc) |
| Platform Integrations | ✅ Specified | ❌ Not built |

### 6. Revenue Tracking
| Feature | Master Doc | Code Status |
|---------|-----------|-------------|
| Commission Engine | ✅ Specified | ❌ Not built |
| Payout Management | ✅ Specified | ❌ Not built |
| Monetization Reporting | ✅ Specified | ❌ Not built |

### 7. Management Interface
| Feature | Master Doc | Code Status |
|---------|-----------|-------------|
| Manager Console | ✅ Specified | ❌ Not built (single-user only) |
| Role-Based Access Controls | ✅ Specified | ❌ Not built |
| Inbound Deal Queue | ✅ Specified | ❌ Not built |
| One-Click Approvals | ✅ Specified | ❌ Not built |
| Sub-Account Management | ✅ Specified | ❌ Not built |
| Notification Center | ✅ Specified | ❌ Not built |
| Escalation Tools | ✅ Specified | ❌ Not built |

### 8. Governance & Control
| Feature | Master Doc | Code Status |
|---------|-----------|-------------|
| Behavioral Guardrails | ✅ Specified | 🟡 Data stored, no runtime enforcement |
| Usage Restrictions | ✅ Specified | 🟡 Data stored, no runtime enforcement |
| Approval Workflows | ✅ Specified | 🟡 Backend training approval exists |
| Version Control | ✅ Specified | ✅ Built |

### 9. Training Portal
| Feature | Master Doc | Code Status |
|---------|-----------|-------------|
| Training Portal | ✅ Specified | 🟡 Backend CRUD exists, frontend is "Coming Soon" |

### 10. Analytics Dashboard
| Feature | Master Doc | Code Status |
|---------|-----------|-------------|
| Performance Metrics | ✅ Specified | ❌ Not built |
| Usage Insights | ✅ Specified | ❌ Not built |
| Licensing Analytics | ✅ Specified | ❌ Not built |
| Twin Health Score | ✅ Specified | ❌ Not built (December 2026 per master doc) |

### 11. Scalability Infrastructure
| Feature | Master Doc | Code Status |
|---------|-----------|-------------|
| Multi-Client Architecture | ✅ Specified | ❌ Not built |
| Enterprise Tier Controls | ✅ Specified | ❌ Not built |

---

## 12. RELEASE STAGE MAPPING

### Stage 1 — Build (Creation) ✅ MOSTLY COMPLETE
| Feature | Status |
|---------|--------|
| Identity Capture | ✅ |
| Identity Structuring | ✅ |
| Biometric Data Processing | 🟡 Voice only |
| Knowledge Base Integration | ✅ |
| Personality Modeling | ✅ |
| High-Fidelity AI Replication | 🟡 Voice only |
| ALCM | ✅ |
| Training Portal | 🟡 Backend only |
| Continuous Model Refinement | 🟡 Backend only |

### Stage 2 — Protect (Protection) 🟡 PARTIALLY COMPLETE
| Feature | Status |
|---------|--------|
| Cryptographic Proof of Creation | ✅ SHA-256 (not blockchain) |
| Timestamp Certification | ✅ |
| Encrypted Storage | 🟡 S3 only |
| Identity Vault | 🟡 Partial |
| Consent Framework | ❌ |
| Version Control | ✅ |
| Approval Workflows | 🟡 Backend only |
| Behavioral Guardrails | 🟡 Data only |
| Reference Data Agreement framework | ❌ |
| Enforcement-Ready Documentation | 🟡 Templates exist |

### Stage 3 — Launch (Activation) ❌ NOT STARTED (except deal CRUD backend)
### Stage 4 — Scale (Expansion) ❌ NOT STARTED
### Stage 5 — Grow (Optimization) ❌ NOT STARTED

---

## 13. WHAT THE MVP DEMO CAN SHOW TODAY

1. **Full auth flow** — signup, email verification, signin, forgot/reset password, signout
2. **6-step onboarding** — text questions, video recording, AI research agents, twin creation
3. **Voice cloning** — ElevenLabs integration, TTS playground with cloned voice
4. **Vault dashboard** — protection status, checklist, asset overview, activity feed
5. **Twin profile editing** — 6 tabs with inline editing for all ALCM sections
6. **Document management** — create, edit, delete, upload, search, filter
7. **Legal templates** — DMCA Takedown, Cease & Desist, AI Usage Consent, Right of Publicity (auto-populated from twin data)
8. **Certification** — SHA-256 proof-of-creation, version history, public verification URL
9. **AI chat** — streaming conversation with Gemini, workspace/project organization
10. **Settings** — theme toggle, account info, sign out
11. **Audit trail** — all actions logged and visible in activity feed

---

## 14. WHAT THE MVP CANNOT SHOW TODAY

1. **Licensing Workspace** — the entire deal execution environment described in the master doc
2. **Marketplace** — no buyer-facing discovery or transaction interface
3. **Commission Engine** — no revenue tracking or commission calculation
4. **Payment Processing** — no Stripe or payment integration
5. **Manager/Team Interface** — single-user only, no role-based access
6. **Behavioral Guardrails (runtime)** — governance data stored but not enforced during interactions
7. **Consent Framework** — no granular revocable consent system
8. **Web Misuse Detection** — no scanning for unauthorized use
9. **Cross-Platform API** — no external deployment capability
10. **Blockchain-anchored Cryptographic Seal** — current cert is SHA-256 hash only
11. **Training Portal UI** — backend exists, frontend is placeholder
12. **Deals UI** — backend exists, frontend is placeholder
13. **Analytics/Reporting** — no performance metrics or usage insights
14. **Enterprise features** — no multi-client, no tier controls

---

## 15. DEPLOYMENT INFO

- **Backend API:** `https://aiv-backend-mvp.up.railway.app`
- **Frontend:** Vercel (auto-deploys from `mvp/vault` branch)
- **Database:** PostgreSQL on Railway
- **Branch:** `mvp/vault` on both repos
- **Demo Account:** `demo@vault.dev` / `VaultDemo#2026` (exists but has NOT gone through onboarding)
