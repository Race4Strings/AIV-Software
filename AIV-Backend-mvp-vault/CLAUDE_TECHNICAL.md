# AIV Platform Technical Specification — Schemas, APIs, Migration

**Version: 1.0 | March 2026**
**Document ID: AIV-PLATFORM-TECHNICAL**
**This is Part 2 of the platform guide. Read [CLAUDE.md](CLAUDE.md) first for product context.**
**Where this document conflicts with the Platform Migration Architecture or Platform Data Architecture, this document governs.**

---

## Quick Reference

| What you need | Where to find it |
|---|---|
| All 31 platform table schemas (SQL) | Section 1 |
| API error format, pagination, rate limiting | Section 2 |
| All REST API endpoints (auth, twins, deals, assistant, etc.) | Section 3 |
| ALCM Client SDK (`alcm_client.py` interface) | Section 4 |
| File-by-file migration map (KEEP / REWRITE / DELETE / MOVE) | Section 5 |
| Docker Compose (two-service setup) | Section 6 |
| Target environment variables (.env for both services) | Section 7 |
| Acceptance criteria per migration phase | Section 8 |
| Contract template prompt | Section 9 |

### Table Schema Quick Index (Section 1)

| Group | Tables | Subsection |
|---|---|---|
| Accounts | `users`, `organizations`, `organization_memberships`, `otps` | 1.1 |
| Twin | `twins` (slim reference) | 1.2 |
| Config | `guardrail_configs`, `licensing_rules_configs` | 1.3 |
| Onboarding | `onboarding_sessions` | 1.4 |
| Training | `training_contributions`, `negotiation_knowledge` | 1.5 |
| Assistant | `agent_sessions`, `agent_messages` | 1.6 |
| Deals | `deals`, `deal_milestones`, `deal_messages`, `deal_contracts`, `reference_data_agreements`, `production_partner_disclosures`, `permitted_use_records`, `client_validation_submissions` | 1.7 |
| Packages | `identity_package_versions` | 1.8 |
| Payments | `invoices`, `usage_meters`, `payouts` | 1.9 |
| System | `notifications`, `misuse_detections`, `twin_locks`, `consent_records`, `audit_logs` | 1.10 |
| Marketplace | `marketplace_listings`, `marketplace_inquiries` (Stage 3) | 1.11 |

---

## 1. Corrected SQL Schemas — All 31 Platform Tables

These schemas supersede all prior documents. Key corrections from earlier versions: `package_tier` → `data_scope`, `negotiation_knowledge` added, `deal_milestones` added.

### 1.1 Accounts & Access

```sql
CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email           VARCHAR(255) UNIQUE NOT NULL,
    name            VARCHAR(255) NOT NULL,
    username        VARCHAR(255) UNIQUE NOT NULL,
    password_hash   VARCHAR(255) NOT NULL,
    email_verified  BOOLEAN DEFAULT FALSE,
    role            VARCHAR(50) NOT NULL DEFAULT 'TALENT',
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);
-- role: TALENT | MANAGER | TEAM_MEMBER | CLIENT | AIV_STAFF | ADMIN

CREATE TABLE organizations (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            VARCHAR(255) NOT NULL,
    type            VARCHAR(50) NOT NULL DEFAULT 'TALENT_TEAM',
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);
-- type: TALENT_TEAM | CLIENT | AIV_INTERNAL

CREATE TABLE organization_memberships (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) NOT NULL,
    user_id         UUID REFERENCES users(id) NOT NULL,
    role            VARCHAR(50) NOT NULL,
    permissions     JSONB NOT NULL DEFAULT '{}',
    invited_by      UUID REFERENCES users(id),
    accepted_at     TIMESTAMPTZ,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(organization_id, user_id)
);
-- role: OWNER | ADMIN | MEMBER | VIEWER
-- permissions shape:
-- {
--   "can_configure_guardrails": bool,
--   "can_approve_deals": bool,
--   "can_view_revenue": bool,
--   "can_contribute_training": bool,
--   "can_access_contracts": bool,
--   "can_manage_team": bool
-- }

CREATE TABLE otps (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID REFERENCES users(id) NOT NULL,
    otp             VARCHAR(6) NOT NULL,
    otp_type        VARCHAR(50) NOT NULL,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    expires_at      TIMESTAMPTZ NOT NULL
);
-- otp_type: EMAIL_VERIFICATION | PASSWORD_RESET
```

### 1.2 Twin (Slim Reference — No Identity Data)

```sql
CREATE TABLE twins (
    id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id             UUID REFERENCES organizations(id) NOT NULL,
    talent_user_id              UUID REFERENCES users(id) NOT NULL,
    alcm_twin_id                UUID,

    display_name                VARCHAR(255) NOT NULL,
    public_name                 VARCHAR(255),
    bio                         TEXT,
    identity_category           VARCHAR(50) NOT NULL,
    identity_category_secondary VARCHAR(50),
    clone_type                  VARCHAR(50) NOT NULL DEFAULT 'PUBLIC_FIGURE',

    status                      VARCHAR(50) NOT NULL DEFAULT 'INITIALIZING',
    stage_1_completed_at        TIMESTAMPTZ,
    stage_2_completed_at        TIMESTAMPTZ,
    fee_free_window_expires     TIMESTAMPTZ,
    platform_fee_active         BOOLEAN DEFAULT FALSE,
    certified_at                TIMESTAMPTZ,

    health_status               VARCHAR(50) DEFAULT 'BUILDING',
    health_last_computed        TIMESTAMPTZ,
    last_training_activity      TIMESTAMPTZ,
    last_quarterly_audit        TIMESTAMPTZ,
    next_quarterly_audit        TIMESTAMPTZ,

    successor_contact_email     VARCHAR(255),
    successor_contact_name      VARCHAR(255),
    successor_designated_at     TIMESTAMPTZ,

    talent_authorization_at     TIMESTAMPTZ,

    created_at                  TIMESTAMPTZ DEFAULT NOW(),
    updated_at                  TIMESTAMPTZ DEFAULT NOW()
);
-- identity_category: ENTERTAINMENT | SPORTS | CORPORATE | EDUCATION
--   | CREATOR_ECONOMY | BRAND_PERSONA | GAMING_VIRTUAL
-- clone_type: PUBLIC_FIGURE | FICTIONAL_CHARACTER
-- status: INITIALIZING | BUILDING | ACTIVE | PROTECTED_HOLD | LOCKED | ARCHIVED
-- health_status: BUILDING | HEALTHY | ATTENTION_NEEDED | ACTION_REQUIRED
-- talent_authorization_at: Gate 2 timestamp. NULL = not yet authorized.
--   Licensing Portal does not open until this is set.

CREATE INDEX idx_twins_org ON twins(organization_id);
CREATE INDEX idx_twins_talent ON twins(talent_user_id);
CREATE INDEX idx_twins_status ON twins(status);
```

### 1.3 Configuration (Versioned)

```sql
CREATE TABLE guardrail_configs (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    twin_id                 UUID REFERENCES twins(id) NOT NULL,
    version                 INT NOT NULL DEFAULT 1,
    configured_by           UUID REFERENCES users(id) NOT NULL,

    blocked_topics          TEXT[] DEFAULT '{}',
    restricted_topics       JSONB DEFAULT '{}',
    language_restrictions   TEXT[] DEFAULT '{}',
    min_formality           INT DEFAULT 0 CHECK (min_formality BETWEEN 0 AND 100),
    max_controversy         INT DEFAULT 100 CHECK (max_controversy BETWEEN 0 AND 100),
    humor_permitted         BOOLEAN DEFAULT TRUE,
    humor_blacklist         TEXT[] DEFAULT '{}',

    require_ai_disclosure   BOOLEAN DEFAULT TRUE,
    disclosure_text         TEXT DEFAULT 'This is an AI-generated response.',

    is_active               BOOLEAN DEFAULT TRUE,
    approved_at             TIMESTAMPTZ,
    created_at              TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE licensing_rules_configs (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    twin_id                 UUID REFERENCES twins(id) NOT NULL,
    version                 INT NOT NULL DEFAULT 1,
    configured_by           UUID REFERENCES users(id) NOT NULL,

    pricing_floor           DECIMAL,
    currency                CHAR(3) DEFAULT 'USD',
    territory_restrictions  TEXT[] DEFAULT '{}',
    blacklisted_use_cases   TEXT[] DEFAULT '{}',
    permitted_use_cases     TEXT[] DEFAULT '{}',
    exclusivity_available   BOOLEAN DEFAULT FALSE,
    auto_approve_threshold  FLOAT DEFAULT 0.8,
    escalate_below          FLOAT DEFAULT 0.6,
    block_below             FLOAT DEFAULT 0.4,
    default_grace_period_hours INT DEFAULT 48,

    is_active               BOOLEAN DEFAULT TRUE,
    created_at              TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_guardrails_twin_active ON guardrail_configs(twin_id) WHERE is_active = TRUE;
CREATE INDEX idx_licensing_rules_twin_active ON licensing_rules_configs(twin_id) WHERE is_active = TRUE;
```

### 1.4 Onboarding

```sql
CREATE TABLE onboarding_sessions (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    twin_id                 UUID REFERENCES twins(id),
    initiated_by            UUID REFERENCES users(id) NOT NULL,
    onboarding_path         VARCHAR(50) NOT NULL DEFAULT 'HYBRID',

    discovery_input         TEXT,
    discovered_profiles     JSONB DEFAULT '[]',
    wikipedia_url           TEXT,
    discovery_completed_at  TIMESTAMPTZ,

    consent_public_scraping BOOLEAN DEFAULT FALSE,
    consent_granted_at      TIMESTAMPTZ,
    identity_verification   VARCHAR(50) DEFAULT 'EMAIL',
    identity_verified_at    TIMESTAMPTZ,

    uploaded_file_urls      JSONB DEFAULT '[]',
    files_processed_at      TIMESTAMPTZ,

    gate_1_manager_approved BOOLEAN DEFAULT FALSE,
    gate_1_approved_by      UUID REFERENCES users(id),
    gate_1_approved_at      TIMESTAMPTZ,
    gate_2_talent_authorized BOOLEAN DEFAULT FALSE,
    gate_2_authorized_at    TIMESTAMPTZ,

    status                  VARCHAR(50) NOT NULL DEFAULT 'DISCOVERY',
    completed_at            TIMESTAMPTZ,
    created_at              TIMESTAMPTZ DEFAULT NOW()
);
-- onboarding_path: AIV_ASSISTED | MANUAL | HYBRID
-- status: DISCOVERY | CONTENT_INGESTION | PROFILE_REVIEW
--   | FILE_UPLOAD | RIGHTS_AGREEMENT | GATE_APPROVAL | COMPLETE
```

### 1.5 Training & Negotiation Knowledge

```sql
CREATE TABLE training_contributions (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    twin_id                 UUID REFERENCES twins(id) NOT NULL,
    contributor_id          UUID REFERENCES users(id) NOT NULL,
    contributor_type        VARCHAR(50) NOT NULL,

    modality                VARCHAR(50) NOT NULL,
    content                 TEXT NOT NULL,
    source_description      TEXT,
    source_url              TEXT,
    agent_mode              VARCHAR(50),

    alcm_processing_status  VARCHAR(50) DEFAULT 'PENDING',
    alcm_processing_result  JSONB,

    approval_status         VARCHAR(50) DEFAULT 'PENDING_APPROVAL',
    approved_by             UUID REFERENCES users(id),
    approved_at             TIMESTAMPTZ,
    rejection_reason        TEXT,

    reversed_at             TIMESTAMPTZ,
    reversed_by             UUID REFERENCES users(id),

    created_at              TIMESTAMPTZ DEFAULT NOW()
);
-- contributor_type: TALENT | TEAM_MEMBER | AIV_INTERNAL
-- modality: TEXT | AUDIO | VIDEO | URL | STRUCTURED_DATA
-- agent_mode: TRAINING | REFINEMENT | ORGANIC_CONVERSATION
-- alcm_processing_status: PENDING | PROCESSING | CLASSIFIED | APPLIED | FAILED
-- approval_status: AUTO_APPROVED | PENDING_APPROVAL | APPROVED | REJECTED

CREATE INDEX idx_training_contrib_twin ON training_contributions(twin_id);
CREATE INDEX idx_training_contrib_status ON training_contributions(approval_status);

CREATE TABLE negotiation_knowledge (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    twin_id             UUID REFERENCES twins(id) NOT NULL,
    created_by          UUID REFERENCES users(id) NOT NULL,

    knowledge_type      VARCHAR(50) NOT NULL,
    deal_id             UUID,  -- FK added via ALTER TABLE after deals table exists
    decision            VARCHAR(50) NOT NULL,
    context             JSONB NOT NULL,
    reasoning           TEXT,

    created_at          TIMESTAMPTZ DEFAULT NOW()
);
-- NOTE: deal_id FK constraint must be added AFTER deals table is created:
--   ALTER TABLE negotiation_knowledge ADD CONSTRAINT fk_neg_knowledge_deal
--     FOREIGN KEY (deal_id) REFERENCES deals(id);
-- knowledge_type: INQUIRY_DECISION | PRICING_PREFERENCE | TERRITORY_PREFERENCE
--   | CLIENT_NOTE | NEGOTIATION_PATTERN
-- decision: APPROVED | REJECTED | MODIFIED | ESCALATED
-- context shape (example for INQUIRY_DECISION):
-- {
--   "client_name": "Ubisoft",
--   "deal_type": "GAMING",
--   "value": 45000,
--   "territory": ["Global"],
--   "flagged_params": ["territory"],
--   "use_case": "NPC voice"
-- }

CREATE INDEX idx_neg_knowledge_twin ON negotiation_knowledge(twin_id);
```

### 1.6 Assistant Sessions

```sql
CREATE TABLE agent_sessions (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             UUID REFERENCES users(id) NOT NULL,
    twin_id             UUID REFERENCES twins(id),
    current_mode        VARCHAR(50) NOT NULL DEFAULT 'ASSISTANT',
    started_at          TIMESTAMPTZ DEFAULT NOW(),
    last_activity_at    TIMESTAMPTZ DEFAULT NOW(),
    ended_at            TIMESTAMPTZ,
    auth_expires_at     TIMESTAMPTZ NOT NULL
);
-- current_mode: ASSISTANT | DIGITAL_SELF | TRAINING | REFINEMENT

CREATE TABLE agent_messages (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id          UUID REFERENCES agent_sessions(id) NOT NULL,
    role                VARCHAR(20) NOT NULL,
    mode_at_time        VARCHAR(50) NOT NULL,
    content             TEXT NOT NULL,
    media_urls          TEXT[],
    actions             JSONB,
    tokens_used         INT DEFAULT 0,
    created_at          TIMESTAMPTZ DEFAULT NOW()
);
-- role: USER | AGENT | SYSTEM
-- actions shape: [{"type": "alcm_query", "endpoint": "/generate", "latency_ms": 340}, ...]

CREATE INDEX idx_agent_sessions_user ON agent_sessions(user_id);
CREATE INDEX idx_agent_messages_session ON agent_messages(session_id);
```

### 1.7 Deals (CORRECTED — data_scope replaces package_tier)

```sql
CREATE TABLE deals (
    id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    twin_id                     UUID REFERENCES twins(id) NOT NULL,
    client_organization_id      UUID REFERENCES organizations(id) NOT NULL,
    deal_number                 INT NOT NULL,

    deal_type                   VARCHAR(50) NOT NULL,
    value                       DECIMAL NOT NULL,
    currency                    CHAR(3) DEFAULT 'USD',
    commission_rate             DECIMAL NOT NULL,
    commission_amount           DECIMAL NOT NULL,
    territory                   TEXT[] DEFAULT '{}',
    exclusivity                 BOOLEAN DEFAULT FALSE,
    start_date                  DATE,
    end_date                    DATE,
    terms_summary               TEXT,

    -- CORRECTED: was package_tier, now data_scope
    data_scope                  TEXT[] NOT NULL DEFAULT '{}',
    package_version_at_exec     INT,
    version_hold_requested      BOOLEAN DEFAULT FALSE,
    version_hold_approved       BOOLEAN DEFAULT FALSE,

    grace_period_hours          INT DEFAULT 48,

    status                      VARCHAR(50) NOT NULL DEFAULT 'SUBMITTED',
    approved_by                 UUID REFERENCES users(id),
    executed_at                 TIMESTAMPTZ,
    completed_at                TIMESTAMPTZ,

    created_at                  TIMESTAMPTZ DEFAULT NOW(),
    updated_at                  TIMESTAMPTZ DEFAULT NOW()
);
-- deal_type: BRAND_CAMPAIGN | CONTENT_LICENSE | CONVERSATIONAL
--   | EDUCATIONAL | CORPORATE | GAMING | API_INTEGRATION
-- data_scope: text array of delivery module names:
--   'identity_profile', 'knowledge_base', 'voice_identity', 'visual_identity'
--   Example: {'identity_profile', 'voice_identity'}
-- status: SUBMITTED | UNDER_REVIEW | APPROVED | CONTRACT_SENT
--   | EXECUTED | ACTIVE | COMPLETED | EXPIRED | TERMINATED
-- grace_period_hours: talent-configurable, defaults from licensing_rules_configs

CREATE INDEX idx_deals_twin ON deals(twin_id);
CREATE INDEX idx_deals_client ON deals(client_organization_id);
CREATE INDEX idx_deals_status ON deals(status);
ALTER TABLE deals ADD CONSTRAINT unique_deal_number_per_twin UNIQUE(twin_id, deal_number);
-- deal_number is assigned by the platform on deal creation:
--   SELECT COALESCE(MAX(deal_number), 0) + 1 FROM deals WHERE twin_id = :twin_id

CREATE TABLE deal_milestones (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    deal_id             UUID REFERENCES deals(id) NOT NULL,
    title               TEXT NOT NULL,
    description         TEXT,
    due_date            DATE,
    completed_at        TIMESTAMPTZ,
    completed_by        UUID REFERENCES users(id),
    comments            TEXT,
    sort_order          INT NOT NULL DEFAULT 0,
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_milestones_deal ON deal_milestones(deal_id);

CREATE TABLE deal_messages (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    deal_id         UUID REFERENCES deals(id) NOT NULL,
    sender_id       UUID REFERENCES users(id) NOT NULL,
    content         TEXT NOT NULL,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_deal_messages_deal ON deal_messages(deal_id);

CREATE TABLE deal_contracts (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    deal_id             UUID REFERENCES deals(id) NOT NULL,
    version             INT NOT NULL DEFAULT 1,
    contract_url        TEXT NOT NULL,
    signed_by_talent_at TIMESTAMPTZ,
    signed_by_client_at TIMESTAMPTZ,
    esignature_ref      TEXT,
    is_amendment        BOOLEAN DEFAULT FALSE,
    parent_contract_id  UUID REFERENCES deal_contracts(id),
    created_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_deal_contracts_deal ON deal_contracts(deal_id);

CREATE TABLE reference_data_agreements (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    deal_id                 UUID REFERENCES deals(id) NOT NULL,
    data_manifest           JSONB NOT NULL,
    recipient_org           TEXT NOT NULL,
    recipient_contact       TEXT NOT NULL,
    purpose                 TEXT NOT NULL,
    restrictions            JSONB DEFAULT '{}',
    destruction_required_by DATE,
    signed_at               TIMESTAMPTZ,
    data_delivered_at       TIMESTAMPTZ,
    delivery_confirmed      BOOLEAN DEFAULT FALSE,
    destruction_confirmed   TIMESTAMPTZ,
    created_at              TIMESTAMPTZ DEFAULT NOW()
);
-- data_manifest shape:
-- {
--   "identity_profile": true,
--   "knowledge_base": true,
--   "voice_identity": true,
--   "visual_identity": false
-- }

CREATE TABLE production_partner_disclosures (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    deal_id             UUID REFERENCES deals(id) NOT NULL,
    rda_id              UUID REFERENCES reference_data_agreements(id),
    partner_name        TEXT NOT NULL,
    partner_role        TEXT NOT NULL,
    partner_contact     TEXT,
    data_access_scope   TEXT,
    disclosed_at        TIMESTAMPTZ DEFAULT NOW(),
    approved_by         UUID REFERENCES users(id),
    revoked_at          TIMESTAMPTZ
);

CREATE TABLE permitted_use_records (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    deal_id             UUID REFERENCES deals(id) NOT NULL,
    record_type         VARCHAR(50) NOT NULL,
    submitted_by        UUID REFERENCES users(id) NOT NULL,
    content_produced    JSONB DEFAULT '{}',
    platforms_used      TEXT[] DEFAULT '{}',
    territories_reached TEXT[] DEFAULT '{}',
    production_partners TEXT[] DEFAULT '{}',
    ai_tools_used       TEXT[] DEFAULT '{}',
    scope_changes       TEXT,
    period_start        DATE,
    period_end          DATE,
    flagged             BOOLEAN DEFAULT FALSE,
    flag_reason         TEXT,
    submitted_at        TIMESTAMPTZ DEFAULT NOW()
    -- APPEND-ONLY: no updated_at
);
-- record_type: OPENING_DECLARATION | UPDATE | MATERIAL_CHANGE
--   | MILESTONE_GATE | CLOSING_ATTESTATION

CREATE INDEX idx_pul_deal ON permitted_use_records(deal_id);
CREATE INDEX idx_pul_submitted ON permitted_use_records(deal_id, submitted_at);

CREATE TABLE client_validation_submissions (
    id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    deal_id                     UUID REFERENCES deals(id) NOT NULL,
    submitted_by                UUID REFERENCES users(id) NOT NULL,
    sample_content              TEXT NOT NULL,
    sample_context              TEXT,
    sample_modality             VARCHAR(20) DEFAULT 'TEXT',
    personality_consistency     FLOAT,
    passed                      BOOLEAN,
    inconsistency_details       TEXT,
    talent_review_status        VARCHAR(50) DEFAULT 'PENDING',
    reviewed_by                 UUID REFERENCES users(id),
    reviewed_at                 TIMESTAMPTZ,
    review_notes                TEXT,
    submitted_at                TIMESTAMPTZ DEFAULT NOW()
);
-- talent_review_status: PENDING | ACCEPTED | FLAGGED | RESTRICTED
```

### 1.8 Identity Package Versioning

```sql
CREATE TABLE identity_package_versions (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    twin_id             UUID REFERENCES twins(id) NOT NULL,
    version_number      INT NOT NULL,
    alcm_snapshot_ref   TEXT NOT NULL,

    change_summary      TEXT,
    change_categories   TEXT[] DEFAULT '{}',

    seal_id             UUID NOT NULL DEFAULT gen_random_uuid(),
    seal_hash           VARCHAR(128) NOT NULL,
    seal_generated_at   TIMESTAMPTZ DEFAULT NOW(),

    tx_hash             VARCHAR(70),
    block_number        VARCHAR(20),
    network             VARCHAR(20),

    cascaded_to_deals   INT DEFAULT 0,
    cascade_completed   TIMESTAMPTZ,

    is_current          BOOLEAN DEFAULT FALSE,
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    created_by          UUID REFERENCES users(id),
    UNIQUE(twin_id, version_number)
);
```

### 1.9 Payments

```sql
CREATE TABLE invoices (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id     UUID REFERENCES organizations(id) NOT NULL,
    type                VARCHAR(50) NOT NULL,
    amount              DECIMAL NOT NULL,
    currency            CHAR(3) DEFAULT 'USD',
    deal_id             UUID REFERENCES deals(id),
    period_start        DATE,
    period_end          DATE,
    status              VARCHAR(50) DEFAULT 'PENDING',
    due_date            DATE NOT NULL,
    paid_at             TIMESTAMPTZ,
    created_at          TIMESTAMPTZ DEFAULT NOW()
);
-- type: PLATFORM_FEE | COMMISSION | USAGE

CREATE TABLE usage_meters (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id     UUID REFERENCES organizations(id) NOT NULL,
    twin_id             UUID REFERENCES twins(id),
    usage_type          VARCHAR(50) NOT NULL,
    quantity            DECIMAL NOT NULL,
    unit_rate           DECIMAL NOT NULL,
    period_start        DATE NOT NULL,
    period_end          DATE NOT NULL,
    invoice_id          UUID REFERENCES invoices(id),
    created_at          TIMESTAMPTZ DEFAULT NOW()
);
-- usage_type: TWIN_INTERACTION | STORAGE_GB | API_CALL
--   | CROSS_PLATFORM_SESSION

CREATE TABLE payouts (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id     UUID REFERENCES organizations(id) NOT NULL,
    deal_id             UUID REFERENCES deals(id) NOT NULL,
    gross_amount        DECIMAL NOT NULL,
    commission_amount   DECIMAL NOT NULL,
    net_amount          DECIMAL NOT NULL,
    status              VARCHAR(50) DEFAULT 'PENDING',
    processed_at        TIMESTAMPTZ,
    created_at          TIMESTAMPTZ DEFAULT NOW()
);
-- status: PENDING | PROCESSING | COMPLETED | FAILED
```

### 1.10 System (Notifications, Enforcement, Consent, Audit)

```sql
CREATE TABLE notifications (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID REFERENCES users(id) NOT NULL,
    type            VARCHAR(50) NOT NULL,
    title           TEXT NOT NULL,
    body            TEXT NOT NULL,
    action_url      TEXT,
    entity_type     VARCHAR(50),
    entity_id       UUID,
    read            BOOLEAN DEFAULT FALSE,
    read_at         TIMESTAMPTZ,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);
-- type: DEAL_SUBMITTED | DEAL_APPROVED | DEAL_EXECUTED
--   | PUL_OVERDUE | PUL_SUBMITTED | PACKAGE_UPDATED
--   | GUARDRAIL_CHANGED | HEALTH_ALERT | VALIDATION_RESULT
--   | TWIN_LOCKED | MISUSE_DETECTED | PAYMENT_RECEIVED
--   | AUDIT_DUE | MILESTONE_UPCOMING | SCOPE_EXPANSION_REQUEST
--   | VERSION_HOLD_REQUEST | SYSTEM_ALERT

CREATE INDEX idx_notifications_user_unread ON notifications(user_id) WHERE read = FALSE;

CREATE TABLE misuse_detections (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    twin_id             UUID REFERENCES twins(id) NOT NULL,
    detection_type      VARCHAR(50) NOT NULL,
    platform            TEXT NOT NULL,
    source_url          TEXT NOT NULL,
    detected_at         TIMESTAMPTZ DEFAULT NOW(),
    evidence            JSONB DEFAULT '{}',
    status              VARCHAR(50) DEFAULT 'DETECTED',
    reviewed_by         UUID REFERENCES users(id),
    reviewed_at         TIMESTAMPTZ,
    enforcement_action  TEXT,
    resolved_at         TIMESTAMPTZ,
    created_at          TIMESTAMPTZ DEFAULT NOW()
);
-- detection_type: VOICE_MATCH | LIKENESS_MATCH | TEXT_PATTERN | SEAL_ABSENT
-- status: DETECTED | UNDER_REVIEW | CONFIRMED | FALSE_POSITIVE
--   | ENFORCEMENT_SENT | RESOLVED

CREATE TABLE twin_locks (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    twin_id                 UUID REFERENCES twins(id) NOT NULL,
    lock_scope              VARCHAR(20) NOT NULL,
    trigger_type            VARCHAR(50) NOT NULL,
    triggered_by            UUID REFERENCES users(id) NOT NULL,
    reason                  TEXT NOT NULL,
    locked_at               TIMESTAMPTZ DEFAULT NOW(),
    reinstated_at           TIMESTAMPTZ,
    reinstated_by           UUID REFERENCES users(id),
    reinstatement_reason    TEXT
);
-- lock_scope: TWIN | ACCOUNT
-- trigger_type: BREACH | LEGAL_DISPUTE | MISUSE | TALENT_REQUEST
--   | NON_PAYMENT | SUCCESSION_EVENT

CREATE TABLE consent_records (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    twin_id         UUID REFERENCES twins(id) NOT NULL,
    user_id         UUID REFERENCES users(id) NOT NULL,
    consent_type    VARCHAR(50) NOT NULL,
    action          VARCHAR(20) NOT NULL,
    scope           TEXT,
    created_at      TIMESTAMPTZ DEFAULT NOW()
    -- APPEND-ONLY: no updated_at. Revocations are new records.
);
-- consent_type: PUBLIC_SCRAPING | CROSS_PLATFORM_MONITORING
--   | IN_PLATFORM_CAPTURE | DATA_PROCESSING
--   | LIKENESS_LICENSING | VOICE_LICENSING | VISUAL_LICENSING
-- action: GRANTED | REVOKED | MODIFIED

CREATE INDEX idx_consent_twin ON consent_records(twin_id);
CREATE INDEX idx_consent_type ON consent_records(twin_id, consent_type);

CREATE TABLE audit_logs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id        UUID REFERENCES users(id),
    actor_type      VARCHAR(50) NOT NULL,
    action          VARCHAR(50) NOT NULL,
    entity_type     VARCHAR(50) NOT NULL,
    entity_id       UUID,
    details         JSONB DEFAULT '{}',
    ip_address      INET,
    twin_id         UUID REFERENCES twins(id),
    created_at      TIMESTAMPTZ DEFAULT NOW()
    -- APPEND-ONLY: no updated_at. 7-year retention.
);
-- actor_type: TALENT | MANAGER | TEAM_MEMBER | CLIENT | AIV_STAFF | SYSTEM
-- action: CREATE | UPDATE | DELETE | ACCESS | EXPORT
--   | LOCK | UNLOCK | APPROVE | REJECT | DELIVER | REVOKE

CREATE INDEX idx_audit_twin ON audit_logs(twin_id);
CREATE INDEX idx_audit_created ON audit_logs(created_at);
```

### 1.11 Marketplace (Stage 3 — create schema now, build later)

```sql
CREATE TABLE marketplace_listings (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    twin_id                 UUID REFERENCES twins(id) NOT NULL UNIQUE,
    visible                 BOOLEAN DEFAULT FALSE,
    headline                TEXT,
    description             TEXT,
    category_tags           TEXT[] DEFAULT '{}',
    available_use_cases     TEXT[] DEFAULT '{}',
    available_territories   TEXT[] DEFAULT '{}',
    pricing_guidance        JSONB,
    featured                BOOLEAN DEFAULT FALSE,
    created_at              TIMESTAMPTZ DEFAULT NOW(),
    updated_at              TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE marketplace_inquiries (
    id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    listing_id                  UUID REFERENCES marketplace_listings(id),
    client_organization_id      UUID REFERENCES organizations(id) NOT NULL,
    use_case                    TEXT NOT NULL,
    territory                   TEXT,
    budget_range                TEXT,
    message                     TEXT,
    status                      VARCHAR(50) DEFAULT 'NEW',
    converted_deal_id           UUID REFERENCES deals(id),
    created_at                  TIMESTAMPTZ DEFAULT NOW()
);
-- status: NEW | RESPONDED | CONVERTED_TO_DEAL | DECLINED
```

---

## 2. Platform API Standards

### 2.1 Error Response Format

Every error response from the platform API follows this shape:

```json
{
  "error": {
    "code": "DEAL_NOT_FOUND",
    "message": "Deal with the specified ID does not exist.",
    "status": 404,
    "details": {}
  }
}
```

Standard error codes used across all endpoints:

| Code | HTTP | When |
|---|---|---|
| `VALIDATION_ERROR` | 400 | Request body fails schema validation |
| `UNAUTHORIZED` | 401 | No session or session expired |
| `FORBIDDEN` | 403 | User lacks permission for this action |
| `NOT_FOUND` | 404 | Entity does not exist or user has no access |
| `CONFLICT` | 409 | State conflict (e.g., deal already executed, twin already locked) |
| `GATE_2_REQUIRED` | 403 | Twin has no talent authorization — Licensing Portal blocked |
| `TWIN_LOCKED` | 423 | Twin is in LOCKED or PROTECTED_HOLD status |
| `APPEND_ONLY_VIOLATION` | 400 | Attempt to UPDATE an append-only record |
| `ALCM_UNAVAILABLE` | 503 | ALCM API is unreachable — graceful degradation active |
| `INTERNAL_ERROR` | 500 | Unexpected server error |

### 2.2 Pagination

Every list endpoint that can return more than 50 items uses cursor-based pagination:

**Request:** `?limit=20&cursor=<opaque_string>`
- `limit`: items per page (default 20, max 100)
- `cursor`: opaque string from previous response (omit for first page)

**Response envelope:**
```json
{
  "data": [...],
  "pagination": {
    "has_more": true,
    "next_cursor": "eyJpZCI6IjEyMyJ9",
    "total": 142
  }
}
```

Endpoints that always return small sets (guardrail history, org members, consent ledger per twin) return flat arrays without pagination.

### 2.3 Rate Limiting

Rate limits are enforced per session via Redis sliding window:

| Role | Default | Expensive Operations |
|---|---|---|
| TALENT / MANAGER / TEAM_MEMBER | 120 req/min | 20 req/min for `/assistant/*/message`, `/twins/*/training` |
| CLIENT | 60 req/min | 10 req/min for `/deals/*/validate`, `/deals/*/pul` |
| AIV_STAFF / ADMIN | 300 req/min | 60 req/min |

Rate limit headers on every response:
```
X-RateLimit-Limit: 120
X-RateLimit-Remaining: 117
X-RateLimit-Reset: 1711036800
```

When exceeded: HTTP 429 with `Retry-After` header.

---

## 3. Platform REST API Endpoints

### 3.1 Auth (stays, minor additions)

| Method | Path | Request Body | Response | Notes |
|---|---|---|---|---|
| POST | `/auth/signup` | `{name, username, email, password, role?, org_name?}` | `{user, otp?}` | Auto-creates org. If role=MANAGER, creates TALENT_TEAM org. |
| POST | `/auth/verify-email` | `{email, otp}` | `{user}` | Sets email_verified=true, creates session |
| POST | `/auth/resend-otp` | `{email}` | `{message}` | |
| POST | `/auth/signin` | `{identifier, password}` | `{user, org}` | identifier = email or username |
| GET | `/auth/signout` | — | `{message}` | Destroys session |
| GET | `/auth/me` | — | `{user, org, memberships}` | Returns user + org context |
| POST | `/auth/forgot-password` | `{email}` | `{message}` | Always succeeds (security) |
| POST | `/auth/reset-password` | `{email, otp, new_password}` | `{user}` | |

### 3.2 Onboarding (restructured)

| Method | Path | Body / Params | Response | Notes |
|---|---|---|---|---|
| POST | `/onboarding/start` | `{discovery_input, onboarding_path}` | `{session}` | Creates twin in INITIALIZING, starts discovery |
| GET | `/onboarding/{session_id}` | — | `{session}` | Poll for status |
| POST | `/onboarding/{session_id}/confirm-profiles` | `{confirmed_profiles: [...]}` | `{session}` | Talent confirms discovered profiles |
| POST | `/onboarding/{session_id}/upload` | multipart: files[] | `{uploaded_urls}` | Professional media uploads |
| POST | `/onboarding/{session_id}/review` | `{corrections: {...}}` | `{session}` | Talent submits corrections to draft profile |
| POST | `/onboarding/{session_id}/rights` | `{identity_category, successor?, consents[]}` | `{session}` | Rights agreement, category selection |
| POST | `/onboarding/{session_id}/gate-1` | `{approved: bool}` | `{session}` | Manager operational approval |
| POST | `/onboarding/{session_id}/gate-2` | `{authorized: bool}` | `{session, twin}` | Talent personal authorization. Sets talent_authorization_at. Twin → BUILDING. |

### 3.3 Twins (slim)

| Method | Path | Body / Params | Response | Notes |
|---|---|---|---|---|
| GET | `/twins` | — | `{twins[]}` | All twins for user's org |
| GET | `/twins/{twin_id}` | — | `{twin, health, guardrails, licensing_rules}` | Assembled view |
| PUT | `/twins/{twin_id}` | `{display_name?, public_name?, bio?}` | `{twin}` | Platform fields only. No ALCM data. |
| DELETE | `/twins/{twin_id}` | — | `{message}` | Initiates archival process |
| GET | `/twins/{twin_id}/health` | — | `{health}` | Calls ALCM API, caches result |

### 3.4 Guardrails & Licensing Rules

| Method | Path | Body | Response | Notes |
|---|---|---|---|---|
| GET | `/twins/{id}/guardrails` | — | `{config, history[]}` | Active config + version history |
| POST | `/twins/{id}/guardrails` | `{blocked_topics?, ...}` | `{config}` | Creates new version, sets is_active=true, pushes to ALCM API |
| GET | `/twins/{id}/licensing-rules` | — | `{config, history[]}` | Active config + version history |
| POST | `/twins/{id}/licensing-rules` | `{pricing_floor?, ...}` | `{config}` | Creates new version |

### 3.5 Training

| Method | Path | Body | Response | Notes |
|---|---|---|---|---|
| GET | `/twins/{id}/training` | `?status=&contributor_type=` | `{contributions[]}` | Filterable list |
| POST | `/twins/{id}/training` | `{modality, content, source_description?, source_url?}` | `{contribution}` | Sent to ALCM for classification |
| POST | `/twins/{id}/training/{contrib_id}/approve` | — | `{contribution}` | Triggers ALCM attribution |
| POST | `/twins/{id}/training/{contrib_id}/reject` | `{reason}` | `{contribution}` | |
| POST | `/twins/{id}/training/{contrib_id}/reverse` | — | `{contribution}` | Rolls back ALCM changes |

### 3.6 Assistant (replaces /aiv/chat)

| Method | Path | Body | Response | Notes |
|---|---|---|---|---|
| POST | `/assistant/session` | `{twin_id?}` | `{session}` | Creates new session |
| GET | `/assistant/sessions` | `?active=true` | `{sessions[]}` | User's sessions |
| POST | `/assistant/session/{id}/message` | `{content, media_urls?}` | SSE stream | Streaming response |
| POST | `/assistant/session/{id}/message/sync` | `{content, media_urls?}` | `{message}` | Non-streaming |
| POST | `/assistant/session/{id}/mode` | `{mode}` | `{session}` | Switch mode explicitly |
| GET | `/assistant/session/{id}/messages` | `?page=&limit=` | `{messages[]}` | History with pagination |

### 3.7 Deals & Licensing

| Method | Path | Body / Params | Response | Notes |
|---|---|---|---|---|
| GET | `/deals` | `?twin_id=&status=&sort=` | `{deals[]}` | Pipeline view data |
| POST | `/deals` | `{twin_id, client_org_id, deal_type, value, territory[], data_scope[], ...}` | `{deal}` | Creates deal in SUBMITTED status |
| GET | `/deals/{id}` | — | `{deal, contract, milestones[], pul_records[], validations[]}` | Full workspace data |
| PUT | `/deals/{id}` | `{terms changes}` | `{deal}` | Update terms (versioned in audit) |
| PUT | `/deals/{id}/status` | `{status}` | `{deal}` | Status transition with validation |
| POST | `/deals/{id}/milestones` | `{title, description, due_date}` | `{milestone}` | Add milestone |
| PUT | `/deals/{id}/milestones/{mid}` | `{completed_at?, comments?}` | `{milestone}` | Update milestone |
| POST | `/deals/{id}/contract` | multipart: file | `{contract}` | Upload contract |
| POST | `/deals/{id}/contract/{cid}/sign` | `{party: 'talent'\|'client'}` | `{contract}` | Record signature |
| POST | `/deals/{id}/messages` | `{content}` | `{message}` | Deal workspace messaging |
| GET | `/deals/{id}/messages` | `?page=&limit=` | `{messages[]}` | |
| POST | `/deals/{id}/pul` | `{record_type, content_produced, platforms_used, ...}` | `{record}` | PUL submission (append-only) |
| POST | `/deals/{id}/validate` | `{sample_content, sample_context}` | `{validation}` | Sends to ALCM for consistency check |
| POST | `/deals/{id}/rda` | `{recipient_org, purpose, restrictions}` | `{rda}` | Creates RDA from deal manifest |
| POST | `/deals/{id}/partners` | `{partner_name, partner_role, data_access_scope}` | `{disclosure}` | Production partner disclosure |
| POST | `/deals/{id}/version-hold` | `{reason}` | `{deal}` | Client requests version hold |
| POST | `/deals/{id}/scope-expansion` | `{additional_modules[], justification}` | `{deal}` | Scope expansion request |

### 3.8 Identity Packages

| Method | Path | Body / Params | Response | Notes |
|---|---|---|---|---|
| GET | `/twins/{id}/packages` | — | `{versions[]}` | Version history |
| GET | `/twins/{id}/packages/current` | — | `{version}` | Current active version |
| POST | `/twins/{id}/packages/snapshot` | — | `{version}` | Creates new version from ALCM snapshot |
| POST | `/twins/{id}/packages/{vid}/cascade` | — | `{affected_deals[]}` | Triggers cascade to active deals |

### 3.9 Payments

| Method | Path | Params | Response | Notes |
|---|---|---|---|---|
| GET | `/payments/invoices` | `?status=&type=` | `{invoices[]}` | |
| GET | `/payments/payouts` | `?deal_id=&status=` | `{payouts[]}` | |
| GET | `/payments/revenue` | `?period=&twin_id=` | `{summary}` | Revenue summary with commission breakdown |

### 3.10 Notifications

| Method | Path | Body / Params | Response | Notes |
|---|---|---|---|---|
| GET | `/notifications` | `?unread=true&type=` | `{notifications[]}` | |
| POST | `/notifications/{id}/read` | — | `{notification}` | Mark as read |
| POST | `/notifications/read-all` | — | `{count}` | Mark all as read |

### 3.11 Other

| Method | Path | Notes |
|---|---|---|
| GET | `/audit` | `?twin_id=&action=&entity_type=&start=&end=` |
| POST | `/upload` | Generic file upload → S3 |
| GET | `/verify/{seal_id}` | Public, no auth → returns seal provenance proof |
| POST | `/twins/{id}/consent` | `{consent_type, action, scope}` → append-only |
| GET | `/twins/{id}/consent` | Full consent ledger |
| GET | `/organizations/{id}` | Org details |
| POST | `/organizations/{id}/invite` | `{email, role, permissions}` |
| GET | `/organizations/{id}/members` | List members with roles |
| PUT | `/organizations/{id}/members/{uid}` | Update permissions |

---

## 4. ALCM Client SDK Interface

The platform's only way to talk to the ALCM API. Every ALCM interaction goes through this file.

```python
# app/services/alcm_client.py

class ALCMClient:
    """SDK for all ALCM API calls from the platform."""

    def __init__(self, base_url: str, timeout: int = 30):
        self.base_url = base_url  # e.g., "http://alcm-api:8001"
        self.timeout = timeout

    # --- Twin lifecycle ---
    async def create_twin(self) -> dict:
        """POST /twin -> {alcm_twin_id}"""

    async def delete_twin(self, alcm_twin_id: str) -> bool:
        """DELETE /twin/{id} -> bool"""

    # --- Data processing ---
    async def classify(self, alcm_twin_id: str, content: str,
                       modality: str, source_reliability: float = 0.6) -> dict:
        """POST /classify
        Send: {twin_id, content, modality, source_reliability}
        Receive: {categories_affected: [], confidence_scores: {}, processing_id}"""

    async def analyze_media(self, alcm_twin_id: str, media_url: str,
                            media_type: str) -> dict:
        """POST /analyze-media
        Send: {twin_id, media_url, media_type}
        Receive: {voice_profile: {}, visual_descriptors: {}, processing_id}"""

    async def attribute(self, alcm_twin_id: str, classified_data: dict) -> dict:
        """POST /attribute
        Send: {twin_id, classified_data}
        Receive: {sub_components_updated: [], confidence_deltas: {}}"""

    # --- Generation ---
    async def generate(self, alcm_twin_id: str, context: str,
                       guardrails: dict, mode: str = "conversation") -> str:
        """POST /generate
        Send: {twin_id, context, guardrails, mode}
        Receive: {response_text, personality_consistency_score, metadata}"""

    async def generate_stream(self, alcm_twin_id: str, context: str,
                              guardrails: dict, mode: str = "conversation"):
        """POST /generate/stream -> SSE stream of tokens"""

    async def generate_speech(self, alcm_twin_id: str, text: str) -> bytes:
        """POST /generate-speech
        Send: {twin_id, text}
        Receive: audio bytes (mp3)"""

    # --- Validation ---
    async def validate_output(self, alcm_twin_id: str, sample: str,
                              context: str = "") -> dict:
        """POST /validate
        Send: {twin_id, sample_content, sample_context}
        Receive: {consistency_score: float, passed: bool, details: str}"""

    # --- Health & monitoring ---
    async def get_health(self, alcm_twin_id: str) -> dict:
        """GET /twin/{id}/health
        Receive: {cfs, per_dimension_fidelity, health_indicators, coverage}"""

    async def get_drift(self, alcm_twin_id: str) -> dict:
        """GET /twin/{id}/drift
        Receive: {drift_score, threshold_status, details}"""

    # --- Package delivery ---
    async def get_package(self, alcm_twin_id: str, scope: list) -> dict:
        """GET /twin/{id}/package?scope=identity_profile,voice_identity
        Receive: {identity_profile?: {}, knowledge_base?: {}, voice_identity?: {},
                  visual_identity?: {}, seal_hash, version}"""

    async def create_snapshot(self, alcm_twin_id: str) -> dict:
        """POST /twin/{id}/snapshot
        Receive: {snapshot_ref, seal_hash, version_number}"""

    # --- Configuration ---
    async def push_guardrails(self, alcm_twin_id: str, config: dict) -> dict:
        """POST /twin/{id}/guardrails
        Send: {guardrail config}
        Receive: {confirmation, propagation_status}"""

    # --- Feedback / Learning ---
    async def submit_feedback(self, alcm_twin_id: str, interaction_id: str,
                              feedback_type: str, signal: dict) -> dict:
        """POST /twin/{id}/feedback
        Send: {interaction_id, feedback_type, signal}
        feedback_type: USER_CORRECTION | RATING | IMPLICIT_ACCEPT | REFINEMENT
        signal shape varies by type:
          USER_CORRECTION: {original_response, corrected_response, context}
          RATING: {score: 1-5, context}
          IMPLICIT_ACCEPT: {response_used: true, context}
          REFINEMENT: {sub_component, old_value, new_value, reason}
        Receive: {processed: bool, learning_applied: bool}"""

    # --- Service health ---
    async def health_check(self) -> dict:
        """GET /health
        Receive: {status: 'ok', version: '...', uptime_seconds: int}
        Use for: docker health checks, platform startup verification,
          monitoring dashboards"""

    # --- Error handling ---
    # All methods raise:
    #   ALCMConnectionError -> ALCM API unreachable
    #   ALCMTimeoutError -> request exceeded timeout
    #   ALCMValidationError -> 400-level response
    #   ALCMNotFoundError -> twin not found in ALCM
    #   ALCMServerError -> 500-level response
```

---

## 5. File-by-File Migration Map

### Current files — what happens to each:

```
app/models/
  user.py               -> KEEP, add 'role' field
  organization.py       -> KEEP, add 'type' field
  otp.py                -> KEEP as-is
  twin.py               -> REWRITE: remove alcm_data, voice_id, commercial_terms,
                           governance, completeness_score. Add alcm_twin_id,
                           identity_category, clone_type, new status enum, health
                           cache, succession, talent_authorization_at
  certification.py      -> DELETE: replaced by identity_package_version.py
  document.py           -> DELETE: replaced by deal_contract.py, rda.py, ppd.py
  deal.py               -> REWRITE: new fields, data_scope instead of document_ids,
                           commission_rate, deal_number
  training_submission.py-> REWRITE -> training_contribution.py: new fields
  audit_log.py          -> REWRITE: expanded action/actor types
  onboarding_session.py -> REWRITE: pipeline-based, no steps 1-6
  workspace.py          -> DELETE
  workspace_document.py -> DELETE
  chat.py               -> DELETE: replaced by agent_session.py, agent_message.py

  NEW FILES:
    guardrail_config.py
    licensing_rules_config.py
    agent_session.py
    agent_message.py
    deal_contract.py
    deal_milestone.py
    deal_message.py
    reference_data_agreement.py
    production_partner_disclosure.py
    permitted_use_record.py
    client_validation_submission.py
    identity_package_version.py
    negotiation_knowledge.py
    invoice.py
    usage_meter.py
    payout.py
    notification.py
    misuse_detection.py
    twin_lock.py
    consent_record.py
    marketplace_listing.py
    marketplace_inquiry.py

app/services/
  auth_service.py           -> KEEP, add check_permission()
  voice_cloning_service.py  -> MOVE to ALCM API -> tts_service.py
  storage_service.py        -> KEEP as-is
  email_service.py          -> KEEP, add templates for deal events
  blockchain_service.py     -> KEEP, retarget to seal package versions
  certification_service.py  -> DELETE: replaced by package_service.py
  research_agent_service.py -> MOVE to ALCM API -> scraping_service.py
  ai_service.py             -> DELETE: split into ALCM generation + agent orchestration
  aiv_service.py            -> DELETE: replaced by agent_service.py
  gemini_service.py         -> DELETE: moves to ALCM API

  NEW FILES:
    alcm_client.py
    agent_service.py
    onboarding_service.py
    licensing_service.py
    commission_service.py
    package_service.py
    guardrail_service.py
    validation_service.py
    notification_service.py

app/routers/
  auth.py          -> KEEP, minor updates
  onboarding.py    -> REWRITE: new pipeline endpoints
  twin.py          -> REWRITE: slim endpoints, no ALCM data
  certification.py -> DELETE: replaced by packages.py
  document.py      -> DELETE
  training.py      -> REWRITE: new contribution model
  deal.py          -> REWRITE: full deal lifecycle
  audit.py         -> KEEP, expand filters
  aiv.py           -> DELETE: replaced by agent.py
  chat.py          -> DELETE
  workspace.py     -> DELETE
  upload.py        -> KEEP
  verify.py        -> REWRITE: seal verification

  NEW FILES:
    agent.py
    guardrails.py
    licensing_rules.py
    licensing.py
    packages.py
    validation.py
    payments.py
    notifications.py
    misuse.py
    consent.py
    marketplace.py

FRONTEND:
  next.config.ts        -> KEEP: /api/backend/* -> :8000/* proxy stays as-is.
                           The frontend NEVER calls :8001 (ALCM API) directly.
                           All identity data requests go platform -> ALCM, not
                           frontend -> ALCM. No new proxy rules needed.
  middleware.ts          -> UPDATE: add org-based route guards for multi-twin orgs
  src/app/(dashboard)/   -> RESTRUCTURE: new nav (Home, Identity, Deals, Certification)
  src/components/twin/   -> REWRITE: remove ALCM data editing, add slim profile view
  src/components/aiv/    -> REWRITE -> src/components/assistant/: multi-mode interface
  src/components/onboard/-> REWRITE: import-first pipeline, file upload, no video recording
  src/lib/api/twins.ts   -> REWRITE: remove alcm_data mutations, add health/guardrails
  src/lib/api/chats.ts   -> DELETE: replaced by assistant.ts
  src/lib/api/workspaces.ts -> DELETE
```

---

## 6. Docker Compose — Two Services

```yaml
version: "3.8"

services:
  platform:
    build:
      context: ./AIV-Backend
      dockerfile: Dockerfile
    ports:
      - "8000:8000"
    env_file:
      - ./AIV-Backend/.env
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_started
      alcm-api:
        condition: service_started
    restart: unless-stopped

  alcm-api:
    build:
      context: ./AIV-ALCM-API
      dockerfile: Dockerfile
    ports:
      - "8001:8001"
    env_file:
      - ./AIV-ALCM-API/.env
    depends_on:
      postgres:
        condition: service_healthy
    restart: unless-stopped

  frontend:
    build:
      context: ./AIV-Frontend
      dockerfile: Dockerfile
    ports:
      - "3001:3001"
    environment:
      - NEXT_PUBLIC_API_URL=http://platform:8000
    depends_on:
      - platform
    restart: unless-stopped

  postgres:
    image: postgres:16-alpine
    ports:
      - "5432:5432"
    environment:
      POSTGRES_USER: aiv
      POSTGRES_PASSWORD: aiv_password
      POSTGRES_DB: aiv_db
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U aiv"]
      interval: 5s
      timeout: 5s
      retries: 5
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redisdata:/data
    restart: unless-stopped

  minio:
    image: minio/minio
    ports:
      - "9000:9000"
      - "9001:9001"
    environment:
      MINIO_ROOT_USER: minioadmin
      MINIO_ROOT_PASSWORD: minioadmin
    volumes:
      - miniodata:/data
    command: server /data --console-address ":9001"
    restart: unless-stopped

volumes:
  pgdata:
  redisdata:
  miniodata:
```

---

## 7. Target Environment Variables

### Platform (.env)
```bash
# Database
DATABASE_URL=postgresql+asyncpg://aiv:aiv_password@postgres:5432/aiv_db
DATABASE_URL_SYNC=postgresql://aiv:aiv_password@postgres:5432/aiv_db

# Redis
REDIS_URL=redis://redis:6379

# Session
SESSION_SECRET=<generate-secure-random>
SESSION_EXPIRE_MINUTES=1440
COOKIE_SAMESITE=lax
COOKIE_SECURE=false

# CORS
CORS_ORIGINS=http://localhost:3001

# ALCM API (NEW)
ALCM_API_URL=http://alcm-api:8001
ALCM_API_TIMEOUT=30

# Email
RESEND_API_KEY=<key>
SMTP_HOST=localhost
SMTP_PORT=1025
SMTP_FROM=noreply@aiv.chat

# Storage
MINIO_ENDPOINT=minio:9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_BUCKET=aiv-uploads
MINIO_SECURE=false

# Blockchain
POLYGON_RPC_URL=https://rpc-amoy.polygon.technology/
POLYGON_PRIVATE_KEY=<key>
CERT_CONTRACT_ADDRESS=<address>

# LLM (for assistant orchestration only — generation is ALCM's job)
ANTHROPIC_API_KEY=<key>

# Web Search (for assistant Training mode — "find my latest podcast")
# Used by agent_service.py when the assistant needs to discover content on the web.
# Anthropic's Claude tool_use with web_search is the primary method if using Claude
# for orchestration. Fallback: SERP_API_KEY for SerpAPI or equivalent.
SERP_API_KEY=<key>

# Dev
DEV_MODE=true
```

### ALCM API (.env)
```bash
# Database (separate schema or separate DB)
DATABASE_URL=postgresql+asyncpg://aiv:aiv_password@postgres:5432/alcm_db

# LLM (for classification, attribution, generation, validation)
ANTHROPIC_API_KEY=<key>
ANTHROPIC_MODEL_PRIMARY=claude-sonnet-4-20250514
ANTHROPIC_MODEL_CLASSIFICATION=claude-haiku-4-5-20251001

# TTS (behind abstraction layer)
ELEVENLABS_API_KEY=<key>

# Storage (for media processing)
MINIO_ENDPOINT=minio:9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_BUCKET=alcm-media
MINIO_SECURE=false
```

Note: Platform no longer needs `GOOGLE_GENAI_API_KEY` (Gemini replaced by Claude via ALCM). Platform no longer needs `ELEVENLABS_API_KEY` (moved to ALCM). Platform gains `ALCM_API_URL` and `ANTHROPIC_API_KEY` (for assistant orchestration).

---

## 8. Acceptance Criteria Per Migration Phase

### Phase 1: Extract ALCM API (Week 1-2)

**Done when:**
- [ ] ALCM API service starts on :8001 and responds to health check
- [ ] `POST /twin` creates a twin record in ALCM DB, returns `alcm_twin_id`
- [ ] `POST /classify` accepts text content, returns classified categories (can use simplified classifier initially)
- [ ] `POST /generate` accepts twin_id + context + guardrails, returns identity-consistent response text
- [ ] `POST /analyze-media` accepts media URL, returns at minimum a processing acknowledgment
- [ ] `GET /twin/{id}/health` returns basic health indicators
- [ ] `alcm_client.py` exists in platform, all ALCM calls route through it
- [ ] Platform still functions if ALCM API is unreachable (graceful degradation: returns cached data, shows "identity engine temporarily unavailable")
- [ ] `research_agent_service.py` logic has been copied to ALCM API as `scraping_service.py` (can remain in platform temporarily)
- [ ] `voice_cloning_service.py` logic has been copied to ALCM API as `tts_service.py`
- [ ] Docker compose starts both services successfully

**NOT required for Phase 1:** Full Bayesian scoring, personality core derivation, drift detection, or high-fidelity generation. Basic LLM pass-through is acceptable. The goal is separation, not sophistication.

### Phase 2: New Platform Schema (Week 2-4)

**Done when:**
- [ ] Alembic migration creates all 31 tables
- [ ] `twins` table no longer contains `alcm_data`, `voice_id`, `voice_status`, `commercial_terms`, `governance`, `completeness_score` (columns dropped or ignored)
- [ ] `twins` table has `alcm_twin_id`, `talent_authorization_at`, new status enum, health cache fields
- [ ] `guardrail_configs` table exists with version history working (new row per change, `is_active` toggle)
- [ ] `licensing_rules_configs` table exists with version history working
- [ ] `agent_sessions` and `agent_messages` tables exist
- [ ] `deals` table uses `data_scope TEXT[]` not `package_tier`
- [ ] `deal_milestones` table exists
- [ ] `negotiation_knowledge` table exists
- [ ] `consent_records` table exists, is append-only (verify no UPDATE queries exist)
- [ ] `audit_logs` table exists, is append-only
- [ ] Old tables (`workspace_table`, `workspace_documents`, `chat_table`, `chat_participant_table`, `chat_message_table`, `documents`, `certifications`) still exist but are unused by new code
- [ ] Data migration script moves existing `twins.governance` -> `guardrail_configs` + `licensing_rules_configs`

**Note:** `marketplace_listings` and `marketplace_inquiries` are created in this migration but remain empty and unused until Stage 3. Their presence is for planning — no code references them until Phase 6 (post-Phase 5).

### Phase 3: Assistant + Training Area (Week 3-6)

**Done when:**
- [ ] `POST /assistant/session` creates a session, returns session ID
- [ ] `POST /assistant/session/{id}/message` streams a response via SSE
- [ ] Assistant mode: answers platform questions from docs/DB (deal status, revenue, how-to)
- [ ] Digital Self mode: calls ALCM API `/generate` with twin's personality, returns identity-consistent response
- [ ] Training mode: accepts "find my latest podcast" -> calls web search -> returns results -> user confirms -> sends to ALCM `/classify`
- [ ] Refinement mode: accepts "I'd say it differently" -> sends correction to ALCM `/attribute`
- [ ] Mode switching works mid-session ("let me talk to myself" -> Digital Self)
- [ ] `agent_messages` records mode_at_time and actions taken per message
- [ ] Permission enforcement: team members cannot enter Digital Self mode
- [ ] Old `/aiv/chat` endpoint still works but routes through new agent service (backward compat)

### Phase 4: Licensing Portal (Week 5-8)

**Done when:**
- [ ] Client can submit a deal via `POST /deals` with `data_scope` array
- [ ] Deal appears in talent team's pipeline view at correct status
- [ ] Inquiry cards show parameter flags (checked against `licensing_rules_configs`)
- [ ] Deal workspace opens on execution with contract, milestones, messaging, PUL, data manifest
- [ ] `POST /deals/{id}/contract` uploads contract, `POST /deals/{id}/contract/{cid}/sign` records signatures
- [ ] Deal does not execute until both talent team AND client have signed
- [ ] `GET /twins/{id}/packages/current` + `POST /twins/{id}/packages/snapshot` work
- [ ] Package delivery: `GET /twin/{id}/package?scope=X` on ALCM returns scoped data
- [ ] Commission calculated correctly (30%/25%/20% based on `deal_number`)
- [ ] PUL submissions are append-only, viewable by both parties
- [ ] Notifications fire for: deal submitted, deal approved, PUL overdue, package updated, milestone upcoming
- [ ] Grace period on talent profile changes is configurable per deal (defaults from `licensing_rules_configs`)
- [ ] "Add to assistant training?" prompt after inquiry decisions stores to `negotiation_knowledge` on opt-in only
- [ ] Twin with `talent_authorization_at = NULL` cannot have deals created against it (Gate 2 enforcement)

### Phase 5: Drop Legacy (Week 8+)

**Done when:**
- [ ] `alcm_data` column removed from `twins` table (or confirmed unused)
- [ ] `workspace_table`, `workspace_documents`, `chat_table`, `chat_participant_table`, `chat_message_table` dropped
- [ ] `documents` table dropped
- [ ] `certifications` table dropped (replaced by `identity_package_versions`)
- [ ] No platform code references old table names
- [ ] No API endpoint returns data from old tables
- [ ] All tests pass with old tables absent

---

## 9. Contract Template Prompt

When building the contract auto-generation system, use this prompt structure to generate licensing agreement templates:

```
Generate a licensing agreement between [Talent Name] (via AIV platform)
and [Client Organization] for the following terms:

Deal type: {deal_type}
Identity data scope: {data_scope modules}
Territory: {territory list}
Duration: {start_date} to {end_date}
Exclusivity: {yes/no}
Value: {amount} {currency}
Commission: {rate}% to AIV

The agreement must include:
1. Grant of license (specifying exact data scope from the data manifest)
2. Permitted uses (from deal_type)
3. Territory and duration restrictions
4. Exclusivity terms (if applicable)
5. Payment schedule and commission structure
6. Permitted Use Lifecycle reporting obligations
7. Reference Data Agreement requirements (if data transfer involved)
8. Production Partner Disclosure obligations
9. Client-side validation expectations
10. Modification and amendment process
11. Grace period for talent profile changes: {grace_period_hours} hours
12. Termination conditions
13. Data destruction/return requirements at term end
14. Audit rights
15. Confidentiality and NDA terms
16. Liability and indemnification
17. Dispute resolution
18. Governing law and jurisdiction

Format as a professional legal document ready for review by the talent's team.
Mark all sections that require human legal review with [REVIEW REQUIRED].
```

---

**This document + the AIV Platform Guide together constitute the complete specification. An engineer reading both documents has everything needed to begin implementation at Phase 1.**
