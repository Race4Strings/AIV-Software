"""
AIV Demo Seed — Elite-grade demo data for investor/talent walkthroughs.

Creates a complete, believable demo state:
  - Marcus Rivera (multi-platinum Latin music artist)
  - Rivera Management Group (talent org)
  - 3 deals across different lifecycle stages
  - Guardrails, licensing rules, consents, package, notifications, audit trail

Usage:
    cd AIV-Backend-mvp-vault
    python scripts/seed_demo.py

Demo credentials:
    Email:    demo@aiv.chat
    Password: AIVDemo#2026
"""

import os
import sys
import hashlib
import json
from datetime import datetime, timezone, timedelta
from decimal import Decimal
from uuid import uuid4

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from dotenv import load_dotenv
load_dotenv()

from sqlalchemy import create_engine, text
from sqlalchemy.orm import Session
from app.database import Base
from app.models import *  # noqa
from app.utils.password import hash_password

# --------------------------------------------------------------------------
# Database connection
# --------------------------------------------------------------------------
database_url = os.getenv("DATABASE_URL_SYNC")
if not database_url:
    database_url = os.getenv("DATABASE_URL", "").replace("+asyncpg", "")
engine = create_engine(database_url, echo=False)

print("AIV Demo Seed")
print("=" * 60)

# --------------------------------------------------------------------------
# Wipe existing demo data
# --------------------------------------------------------------------------
print("\nCleaning existing data...")
with engine.connect() as conn:
    # Delete in correct FK order
    for table in [
        "agent_messages", "agent_sessions",
        "permitted_use_records", "client_validation_submissions",
        "production_partner_disclosures", "reference_data_agreements",
        "deal_contracts", "deal_milestones", "deal_messages",
        "negotiation_knowledge", "deals",
        "identity_package_versions",
        "training_contributions", "consent_records",
        "guardrail_configs", "licensing_rules_configs",
        "notifications", "misuse_detections", "twin_locks",
        "audit_logs", "onboarding_sessions",
        "twins",
        "organization_memberships", "organization_users_table",
        "otp_table",
        "invoices", "usage_meters", "payouts",
        "user_table", "organization_table",
    ]:
        try:
            conn.execute(text(f"DELETE FROM {table}"))
        except Exception:
            pass
    conn.commit()
print("  Done — all tables cleared.")

# --------------------------------------------------------------------------
# Seed
# --------------------------------------------------------------------------
print("\nSeeding demo data...")

with Session(engine) as db:
    now = datetime.now(timezone.utc)

    # ---- Organization ----
    org = Organization(
        id=uuid4(),
        name="Rivera Management Group",
        type="TALENT_TEAM",
    )
    db.add(org)
    db.flush()
    print(f"  Org: {org.name} ({org.id})")

    # ---- User ----
    user = User(
        id=uuid4(),
        name="Marcus Rivera",
        email="demo@aiv.chat",
        user_name="marcus",
        password=hash_password("AIVDemo#2026"),
        is_verified=True,
        role="TALENT",
    )
    db.add(user)
    db.flush()

    # Link user to org
    org_user = OrganizationUser(
        id=uuid4(),
        user_id=user.id,
        organization_id=org.id,
        role="owner",
    )
    db.add(org_user)

    membership = OrganizationMembership(
        id=uuid4(),
        organization_id=org.id,
        user_id=user.id,
        role="OWNER",
        permissions={
            "can_configure_guardrails": True,
            "can_approve_deals": True,
            "can_view_revenue": True,
            "can_contribute_training": True,
            "can_access_contracts": True,
            "can_manage_team": True,
        },
        accepted_at=now,
    )
    db.add(membership)
    print(f"  User: {user.name} ({user.email})")

    # ---- Twin ----
    twin = Twin(
        id=uuid4(),
        organization_id=org.id,
        talent_user_id=user.id,
        alcm_twin_id=uuid4(),
        display_name="Marcus Rivera",
        public_name="Marcus Rivera",
        bio="Multi-platinum Latin music artist, songwriter, and entrepreneur. Known for a genre-blending sound that fuses reggaeton, trap, and R&B. With 47M+ followers across platforms and 3 Billboard #1 hits, Marcus has become one of the most influential voices in Latin music. His brand partnerships span gaming, fashion, and audio technology.",
        identity_category=["ENTERTAINMENT", "MUSIC"],
        clone_type="PUBLIC_FIGURE",
        status="ACTIVE",
        health_status="HEALTHY",
        health_last_computed=now,
        last_training_activity=now - timedelta(days=2),
        talent_authorization_at=now - timedelta(days=45),
        stage_1_completed_at=now - timedelta(days=60),
        fee_free_window_expires=now + timedelta(days=30),
        platform_fee_active=False,
        certified_at=now - timedelta(days=30),
    )
    db.add(twin)
    db.flush()
    print(f"  Twin: {twin.display_name} ({twin.status})")

    # ---- Guardrail Config ----
    guardrail = GuardrailConfig(
        id=uuid4(),
        twin_id=twin.id,
        version=1,
        configured_by=user.id,
        blocked_topics=["politics", "religion", "personal relationships", "competitor products"],
        restricted_topics={"controversy": "Avoid unless directly asked", "legal matters": "Redirect to management"},
        language_restrictions=[],
        min_formality=30,
        max_controversy=40,
        humor_permitted=True,
        humor_blacklist=["offensive stereotypes", "cultural mockery"],
        require_ai_disclosure=True,
        disclosure_text="This response was generated by Marcus Rivera's AI identity, managed through AIV.",
        is_active=True,
        approved_at=now - timedelta(days=40),
    )
    db.add(guardrail)
    print(f"  Guardrails: v{guardrail.version} ({len(guardrail.blocked_topics)} blocked topics)")

    # ---- Licensing Rules Config ----
    licensing_rules = LicensingRulesConfig(
        id=uuid4(),
        twin_id=twin.id,
        version=1,
        configured_by=user.id,
        pricing_floor=Decimal("25000"),
        currency="USD",
        territory_restrictions=[],
        blacklisted_use_cases=["tobacco", "gambling", "firearms", "adult content"],
        permitted_use_cases=["BRAND_CAMPAIGN", "GAMING", "CONTENT_LICENSE", "EDUCATIONAL", "API_INTEGRATION"],
        exclusivity_available=False,
        auto_approve_threshold=0.85,
        escalate_below=0.6,
        block_below=0.3,
        default_grace_period_hours=72,
        is_active=True,
    )
    db.add(licensing_rules)
    print(f"  Licensing Rules: v{licensing_rules.version} (floor ${licensing_rules.pricing_floor:,})")

    # ---- Client Orgs ----
    beats_org = Organization(id=uuid4(), name="Beats by Dre (Apple Inc.)", type="CLIENT")
    ubisoft_org = Organization(id=uuid4(), name="Ubisoft Montreal", type="CLIENT")
    spotify_org = Organization(id=uuid4(), name="Spotify Studios", type="CLIENT")
    db.add_all([beats_org, ubisoft_org, spotify_org])
    db.flush()

    # ---- Deal 1: Beats by Dre — ACTIVE ----
    deal1 = Deal(
        id=uuid4(),
        twin_id=twin.id,
        client_organization_id=beats_org.id,
        deal_number=1,
        deal_type="BRAND_CAMPAIGN",
        value=Decimal("150000"),
        currency="USD",
        commission_rate=Decimal("0.30"),
        commission_amount=Decimal("45000"),
        territory=["Global"],
        exclusivity=False,
        start_date=(now - timedelta(days=15)).date(),
        end_date=(now + timedelta(days=165)).date(),
        terms_summary="6-month global voice + identity licensing for Beats Studio Pro campaign. Includes: in-app voice assistant integration, social media content generation (3 posts/month), and gaming NPC voice for promotional game experience.",
        data_scope=["identity_profile", "voice_identity"],
        package_version_at_exec=1,
        grace_period_hours=72,
        status="ACTIVE",
        approved_by=user.id,
        executed_at=now - timedelta(days=15),
    )
    db.add(deal1)
    db.flush()

    # Deal 1: Contract (signed by both)
    contract1 = DealContract(
        id=uuid4(), deal_id=deal1.id, version=1,
        contract_url="https://storage.aiv.chat/contracts/beats-rivera-2026.pdf",
        signed_by_talent_at=now - timedelta(days=16),
        signed_by_client_at=now - timedelta(days=15),
    )
    db.add(contract1)

    # Deal 1: Milestones
    db.add(DealMilestone(
        id=uuid4(), deal_id=deal1.id, title="Voice Model Integration",
        description="Integrate Marcus Rivera voice model into Beats Studio Pro app experience",
        due_date=(now + timedelta(days=30)).date(), sort_order=0,
    ))
    db.add(DealMilestone(
        id=uuid4(), deal_id=deal1.id, title="Campaign Launch",
        description="Launch social media campaign with AI-generated content featuring Marcus Rivera's digital identity",
        due_date=(now + timedelta(days=60)).date(), sort_order=1,
    ))

    # Deal 1: PUL opening declaration
    db.add(PermittedUseRecord(
        id=uuid4(), deal_id=deal1.id,
        record_type="OPENING_DECLARATION",
        submitted_by=user.id,
        content_produced={"type": "voice_integration", "platform": "Beats Studio Pro App"},
        platforms_used=["Instagram", "TikTok", "YouTube", "Beats App"],
        territories_reached=["Global"],
        production_partners=["Apple Creative Services"],
        ai_tools_used=["AIV ALCM Engine", "ElevenLabs Voice Synthesis"],
        period_start=(now - timedelta(days=15)).date(),
        period_end=(now + timedelta(days=165)).date(),
    ))

    # Deal 1: RDA
    db.add(ReferenceDataAgreement(
        id=uuid4(), deal_id=deal1.id,
        data_manifest={"identity_profile": True, "voice_identity": True, "knowledge_base": False, "visual_identity": False},
        recipient_org="Apple Inc. — Beats Division",
        recipient_contact="partnerships@beatsbydre.com",
        purpose="Voice + identity integration for Beats Studio Pro campaign",
        restrictions={"no_sublicensing": True, "no_raw_data_export": True},
        signed_at=now - timedelta(days=15),
        data_delivered_at=now - timedelta(days=14),
        delivery_confirmed=True,
    ))

    # Deal 1: Invoice + Payout
    db.add(Invoice(
        id=uuid4(), organization_id=beats_org.id,
        type="COMMISSION", amount=Decimal("45000"), currency="USD",
        deal_id=deal1.id, status="PAID",
        due_date=(now + timedelta(days=15)).date(),
        paid_at=now - timedelta(days=5),
    ))
    db.add(Payout(
        id=uuid4(), organization_id=org.id,
        deal_id=deal1.id,
        gross_amount=Decimal("150000"),
        commission_amount=Decimal("45000"),
        net_amount=Decimal("105000"),
        status="COMPLETED",
        processed_at=now - timedelta(days=5),
    ))

    print(f"  Deal #1: Beats by Dre — $150,000 (ACTIVE)")

    # ---- Deal 2: Ubisoft — CONTRACT_SENT ----
    deal2 = Deal(
        id=uuid4(),
        twin_id=twin.id,
        client_organization_id=ubisoft_org.id,
        deal_number=2,
        deal_type="GAMING",
        value=Decimal("85000"),
        currency="USD",
        commission_rate=Decimal("0.25"),
        commission_amount=Decimal("21250"),
        territory=["North America", "Europe", "Latin America"],
        exclusivity=False,
        start_date=(now + timedelta(days=30)).date(),
        end_date=(now + timedelta(days=395)).date(),
        terms_summary="Voice identity licensing for NPC character in upcoming AAA title. Marcus Rivera's voice and personality data will power an in-game music producer mentor character.",
        data_scope=["identity_profile", "voice_identity", "knowledge_base"],
        grace_period_hours=72,
        status="CONTRACT_SENT",
    )
    db.add(deal2)
    db.flush()

    # Deal 2: Contract (uploaded, not signed)
    db.add(DealContract(
        id=uuid4(), deal_id=deal2.id, version=1,
        contract_url="https://storage.aiv.chat/contracts/ubisoft-rivera-2026-draft.pdf",
    ))

    print(f"  Deal #2: Ubisoft Montreal — $85,000 (CONTRACT_SENT)")

    # ---- Deal 3: Spotify — SUBMITTED (fresh inquiry) ----
    deal3 = Deal(
        id=uuid4(),
        twin_id=twin.id,
        client_organization_id=spotify_org.id,
        deal_number=3,
        deal_type="CONTENT_LICENSE",
        value=Decimal("40000"),
        currency="USD",
        commission_rate=Decimal("0.20"),
        commission_amount=Decimal("8000"),
        territory=["Global"],
        exclusivity=False,
        terms_summary="AI-powered personalized playlist commentary and artist insights for Spotify's new 'Artist Voice' feature. Marcus Rivera's personality and music knowledge would generate authentic commentary for his top playlists.",
        data_scope=["identity_profile", "knowledge_base"],
        grace_period_hours=72,
        status="SUBMITTED",
    )
    db.add(deal3)
    db.flush()
    print(f"  Deal #3: Spotify Studios — $40,000 (SUBMITTED)")

    # ---- Consent Records ----
    for ctype in ["PUBLIC_SCRAPING", "DATA_PROCESSING", "VOICE_LICENSING", "VISUAL_LICENSING", "LIKENESS_LICENSING"]:
        db.add(ConsentRecord(
            id=uuid4(), twin_id=twin.id, user_id=user.id,
            consent_type=ctype, action="GRANTED",
            scope="Full commercial authorization",
        ))
    print(f"  Consents: 5 types granted")

    # ---- Identity Package ----
    seal_data = json.dumps({"twin": str(twin.id), "version": 1}, sort_keys=True)
    seal_hash = hashlib.sha256(seal_data.encode()).hexdigest()

    db.add(IdentityPackageVersion(
        id=uuid4(), twin_id=twin.id, version_number=1,
        alcm_snapshot_ref=str(uuid4()),
        change_summary="Initial identity package — full profile capture",
        change_categories=["identity_profile", "voice_identity", "knowledge_base"],
        seal_id=uuid4(), seal_hash=seal_hash,
        tx_hash="0x" + "a" * 64,
        block_number="12345678",
        network="polygon-amoy",
        is_current=True, created_by=user.id,
    ))
    print(f"  Package: v1 (seal: {seal_hash[:16]}...)")

    # ---- Notifications ----
    db.add(Notification(
        id=uuid4(), user_id=user.id,
        type="DEAL_EXECUTED", title="Deal Executed: Beats by Dre",
        body="Your $150,000 voice + identity licensing deal with Beats by Dre has been fully executed. Both parties signed. Commission: $45,000 (30%). Net to you: $105,000.",
        action_url=f"/deals/{deal1.id}",
        entity_type="deal", entity_id=deal1.id,
        read=True, read_at=now - timedelta(days=14),
    ))
    db.add(Notification(
        id=uuid4(), user_id=user.id,
        type="DEAL_SUBMITTED", title="New Inquiry: Ubisoft Montreal",
        body="Ubisoft Montreal has submitted an $85,000 gaming deal inquiry. Voice identity licensing for an NPC character in an upcoming AAA title. Review the inquiry to proceed.",
        action_url=f"/deals/{deal2.id}",
        entity_type="deal", entity_id=deal2.id,
        read=False,
    ))
    db.add(Notification(
        id=uuid4(), user_id=user.id,
        type="DEAL_SUBMITTED", title="New Inquiry: Spotify Studios",
        body="Spotify Studios has submitted a $40,000 content licensing inquiry. AI-powered playlist commentary using your voice and personality. Review the inquiry to proceed.",
        action_url=f"/deals/{deal3.id}",
        entity_type="deal", entity_id=deal3.id,
        read=False,
    ))
    print(f"  Notifications: 3 (1 read, 2 unread)")

    # ---- Audit Logs ----
    events = [
        (now - timedelta(days=60), "CREATE", "twin", "Digital identity created"),
        (now - timedelta(days=45), "APPROVE", "gate_2_authorization", "Talent personal authorization — Gate 2 complete"),
        (now - timedelta(days=40), "CREATE", "guardrail_config", "Behavioral guardrails configured (v1)"),
        (now - timedelta(days=15), "DELIVER", "deal", "Identity package delivered to Beats by Dre"),
        (now - timedelta(days=30), "CREATE", "identity_package_version", "Identity sealed — AIV Seal v1 anchored on Polygon"),
    ]
    for ts, action, entity, detail in events:
        db.add(AuditLog(
            id=uuid4(), actor_id=user.id, actor_type="TALENT",
            action=action, entity_type=entity, twin_id=twin.id,
            details={"description": detail},
        ))
    print(f"  Audit logs: {len(events)} entries")

    db.commit()

print("\n" + "=" * 60)
print("Demo seeded successfully!")
print()
print("Demo credentials:")
print(f"  Email:    demo@aiv.chat")
print(f"  Password: AIVDemo#2026")
print(f"  Twin:     Marcus Rivera (ACTIVE, HEALTHY)")
print(f"  Deals:    3 ($150K active, $85K negotiating, $40K inquiry)")
print(f"  Revenue:  $275K gross, $74.25K commission, $200.75K net")
print("=" * 60)
