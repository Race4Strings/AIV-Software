# Tasks: AIV MVP — Stage 1: The Vault (Day 1: Foundation & Shell)

> **Status (Feb 25, Night CST):** Tasks 1-4 and 16 completed by Ricardo.
> Additional archival beyond original spec: also archived contact, workspace, notification,
> admin routers/models/schemas (they had dependencies on archived Clone/Chat models).
> Backend now has ONLY auth + upload routers. Frontend builds with zero errors.
> **Your first task is Task 5.**

## Task 1: Create mvp/vault branches on both repos ✅ DONE
- [x] In AIV-frontend: `git checkout UpdatedManish.dev && git checkout -b mvp/vault`
- [x] In AIV-Backend: `git checkout UpdatedManish.dev && git checkout -b mvp/vault`
- [x] Verify both repos are on `mvp/vault` before proceeding

## Task 2: Archive old frontend code ✅ DONE
- [x] All old components, pages, and API modules archived to `_archive/`
- [x] Sidebar and site-header simplified to clean shells
- [x] `tsconfig.json` excludes `_archive/` from builds
- [x] `npm run build` passes with zero errors

## Task 3: Archive old backend code ✅ DONE
- [x] All old routers, services, models, schemas archived to `_archive/`
- [x] Only auth + upload routers remain active
- [x] Clone relationship removed from User model
- [x] Workspace creation removed from signup flow
- [x] tool_monitoring removed from app lifespan
- [x] `app/utils/__init__.py` created (ready for Task 6)
- [x] All Python files parse cleanly

## Task 4: Docker & config cleanup (Backend) ✅ DONE
- [x] Reverted PostgreSQL port from 5433 back to 5432
- [x] Reverted Redis port from 6380 back to 6379
- [x] Fixed `SigninRequest.password` to `min_length=1`, `SignupRequest.password` stays `min_length=8`

## Task 5: Create new backend models ✅ DONE (Sami)
- [x] Create `app/models/twin.py` — Twin model with all fields (id, user_id, name, public_name, category, bio, alcm_data JSON, voice_id, voice_status, voice_sample_url, commercial_terms JSON, governance JSON, status, completeness_score, version, certified_at, timestamps, relationships)
- [x] Create `app/models/certification.py` — Certification model (id, twin_id, version, hash, consent_record JSON, created_at, twin relationship)
- [x] Create `app/models/document.py` — Document model (id, twin_id, title, doc_type, content, status, exportable, created_by, timestamps, relationships)
- [x] Create `app/models/training_submission.py` — TrainingSubmission model (id, twin_id, category, content JSON, attachment_url, status, target_fields JSON, change_description, submitted_by, reviewed_by, timestamps, relationships)
- [x] Create `app/models/deal.py` — Deal model (id, twin_id, brand_name, deal_type, value, currency, status, terms_summary, notes, start_date, end_date, document_ids JSON, timestamps, twin relationship)
- [x] Create `app/models/audit_log.py` — AuditLog model (id, twin_id nullable, user_id, action, entity_type, entity_id, details JSON, ip_address, created_at, relationships)
- [x] Create `app/models/onboarding_session.py` — OnboardingSession model (id, twin_id nullable, user_id, status, current_step, research_data JSON, conversation_history JSON, voice_sample_urls JSON, user_responses JSON, started_at, completed_at, relationships)
- [x] Add `twins = relationship("Twin", back_populates="user")` to existing User model
- [x] Update `app/models/__init__.py` to export all new models

## Task 6: ALCM deep-merge utility (Backend) ✅ DONE (Sami)
- [x] Create `app/utils/alcm_merge.py` with a `deep_merge(base: dict, updates: dict) -> dict` function
- [x] Recursive dict merge: nested dicts merge recursively, lists replace entirely, None values are skipped
- [x] Add unit-level validation: test that merging `{"personality": {"no_go_topics": ["divorce"]}}` into a full ALCM structure only updates that specific field
- [x] Import and use in twin router for ALCM partial updates

## Task 7: Alembic migration (Backend) ✅ DONE (Sami)
- [x] Generate migration: `alembic revision --autogenerate -m "add vault models - twin certification document deal audit onboarding training_submission"`
- [x] Review generated migration for correctness (all 7 new tables, User relationship addition)
- [x] Apply migration: `alembic upgrade head`
- [x] Verify all tables exist in PostgreSQL

## Task 8: Pydantic schemas (Backend) ✅ DONE (Sami)
- [x] Create `app/schemas/twin.py` — TwinCreate, TwinUpdate, TwinResponse (EXCLUDE voice_id from response)
- [x] Create `app/schemas/certification.py` — CertificationResponse, CertificationProof
- [x] Create `app/schemas/document.py` — DocumentCreate, DocumentUpdate, DocumentResponse
- [x] Create `app/schemas/training_submission.py` — TrainingSubmissionCreate, TrainingSubmissionResponse
- [x] Create `app/schemas/deal.py` — DealCreate, DealUpdate, DealResponse
- [x] Create `app/schemas/audit_log.py` — AuditLogResponse, AuditLogFilter
- [x] Create `app/schemas/onboarding_session.py` — OnboardingStart, OnboardingStepSubmit, OnboardingSessionResponse

## Task 9: Skeleton routers (Backend) ✅ DONE (Sami)
- [x] Create `app/routers/twin.py` — POST /twins, GET /twins, GET /twins/{id}, PUT /twins/{id}, GET /twins/{id}/completeness. All require auth. Twin response excludes voice_id. PUT supports partial ALCM updates via deep-merge.
- [x] Create `app/routers/certification.py` — POST /twins/{id}/certification (generate hash + proof), GET /twins/{id}/certification (list versions), GET /twins/{id}/certification/latest
- [x] Create `app/routers/document.py` — POST /twins/{id}/documents, GET /twins/{id}/documents (filterable by type/status), GET /twins/{id}/documents/{doc_id}, PUT /twins/{id}/documents/{doc_id}, DELETE /twins/{id}/documents/{doc_id}
- [x] Create `app/routers/training.py` (new — replaces archived) — POST /twins/{id}/training, GET /twins/{id}/training (filterable by status/category), PUT /twins/{id}/training/{sub_id}/approve (apply changes to ALCM via deep-merge), PUT /twins/{id}/training/{sub_id}/reject
- [x] Create `app/routers/deal.py` — POST /deals, GET /deals, GET /deals/{id}, PUT /deals/{id}, PUT /deals/{id}/status (validate allowed transitions)
- [x] Create `app/routers/audit.py` — GET /audit (filterable by twin_id, action, entity_type, date range)
- [x] Create `app/routers/onboarding.py` (new — replaces archived) — POST /onboarding/start, GET /onboarding/{id}, PUT /onboarding/{id}/step, POST /onboarding/{id}/complete
- [x] Update `app/routers/__init__.py` to export all new routers
- [x] Register all new routers in `app/main.py`

## Task 10: Certification service (Backend) ✅ DONE (Sami)
- [x] Create `app/services/certification_service.py` with `generate_hash(alcm_data)` (SHA-256, deterministic serialization) and `create_proof(alcm_data, version, user_id)` (returns hash, version, timestamp, certified_by, algorithm, data_scope)
- [x] Wire into certification router's POST endpoint

## Task 11: AI service abstraction (Backend) — SKIP (Ricardo will do this)
- [ ] Create `app/services/ai_service.py` with abstract base class
- [ ] Create `GeminiAIService(AIServiceBase)` implementation
- [ ] Add streaming response support
- [ ] Add Google Search grounding configuration
- [ ] Export via `get_ai_service()` factory function

## Task 12: Update seed script (Backend) ✅ DONE (Sami)
- [x] Update `init_tables.py` to create all new tables
- [x] Seed a demo twin with sample ALCM data (personality, knowledge, social_media, visual sections populated)
- [x] Change demo credentials from `demo@12345` to `VaultDemo#2026`
- [x] Seed a sample certification record for the demo twin
- [x] Seed a sample document and deal for development testing

## Task 13: Dark vault theme (Frontend) — SKIP (Ricardo will do this)
## Task 14: Sidebar navigation (Frontend) — SKIP (Ricardo will do this)
## Task 15: Vault homepage layout (Frontend) — SKIP (Ricardo will do this)

## Task 16: Page stubs (Frontend) ✅ DONE
- [x] All 9 page stubs created: twin, twin/voice, twin/documents, twin/training, twin/certification, aiv, deals, settings, onboard
- [ ] Create a shared layout for authenticated pages that wraps content in sidebar + header shell
- [ ] Ensure all stubs render within the vault layout with sidebar visible

## Task 17: Auth pages restyling (Frontend) — SKIP (Ricardo will do this)

## Task 18: Quality checks
- [ ] Frontend: `npm run build` compiles with zero errors
- [ ] Frontend: `npm run dev` loads without crashes
- [ ] Frontend: Navigate to every new route — all render with sidebar and proper layout
- [ ] Frontend: Dark theme consistent across all pages (no white flashes)
- [ ] Frontend: Auth flow works (signin → redirect to vault homepage)
- [ ] Backend: `uvicorn app.main:app --reload` starts without errors
- [ ] Backend: All new endpoints visible in Swagger docs (`/docs`)
- [ ] Backend: Can create a twin via POST /twins
- [ ] Backend: Can generate certification via POST /twins/{id}/certification
- [ ] Backend: Can CRUD documents, deals, training submissions, audit logs
- [ ] Backend: No orphaned imports or references to archived code
- [ ] Backend: Alembic migration applies cleanly
