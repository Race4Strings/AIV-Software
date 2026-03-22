"""Script to initialize database tables and seed demo data for The Vault.

Usage:
    python init_tables.py

Seeds:
  - Demo user (demo@vault.dev / VaultDemo#2026)
  - Demo organization
  - Demo twin with full ALCM data
  - Sample certification (SHA-256 proof)
  - Sample document (brand brief)
  - Sample deal (endorsement)
"""
import os
import sys
import hashlib
import json
from datetime import datetime, timezone, timedelta

# Add the project root to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from dotenv import load_dotenv
load_dotenv()

from sqlalchemy import create_engine
from sqlalchemy.orm import Session
from app.database import Base

# Import all models so they register with Base.metadata
from app.models import *  # noqa
from app.models import (
    User, Organization, OrganizationUser,
    Twin, Certification, Document, Deal, AuditLog,
)
from app.models.twin import TwinStatus, VoiceStatus
from app.models.document import DocumentType, DocumentStatus
from app.models.deal import DealStatus
from app.utils.password import hash_password

# Use the sync database URL
database_url = os.getenv("DATABASE_URL_SYNC")
if not database_url:
    database_url = os.getenv("DATABASE_URL", "").replace("+asyncpg", "")

print(f"Connecting to database...")
engine = create_engine(database_url, echo=False)

print("Creating database tables...")
Base.metadata.create_all(bind=engine)
print("✅ Tables created successfully.")

# ============== Sample ALCM Data ==============
DEMO_ALCM_DATA = {
    "personality": {
        "communication_style": "casual yet professional",
        "values": ["authenticity", "creativity", "integrity"],
        "humor_style": "witty, dry humor",
        "no_go_topics": ["personal relationships", "politics"],
        "catchphrases": ["Let's build something incredible", "Stay authentic"],
        "emotional_range": "warm and enthusiastic, occasionally contemplative",
    },
    "knowledge": {
        "career_highlights": [
            "Grammy-nominated producer",
            "Founded independent label at age 23",
            "Collaborated with 50+ artists",
            "TEDx speaker on creative technology",
        ],
        "expertise_areas": [
            "music production",
            "creative direction",
            "brand partnerships",
            "digital media"
        ],
        "education": "Berklee College of Music, BA in Music Production",
        "awards": ["Grammy nomination 2024", "Billboard Rising Star 2023"],
    },
    "social_media": {
        "instagram": "@jdoe_official",
        "twitter": "@johnxdoe",
        "tiktok": "@johndoe",
        "linkedin": "johndoe-music",
        "follower_count": 2_500_000,
        "engagement_rate": 4.7,
    },
    "visual": {
        "style_notes": "Minimalist streetwear, monochrome palette with occasional bold accents",
        "brand_colors": ["#1a1a2e", "#6366f1", "#e0e7ff"],
        "preferred_backdrop": "studio environment or urban settings",
        "avatar_description": "Professional headshot, neutral background, slight smile",
    },
}


# ============== Seed Logic ==============

print("\n🌱 Seeding demo data...")
session = Session(engine)
try:
    # --- 1. Demo User ---
    user = session.query(User).filter_by(user_name="demo").first()
    if not user:
        print("  Creating demo user...")
        user = User(
            name="John Doe",
            email="demo@vault.dev",
            user_name="demo",
            password=hash_password("VaultDemo#2026"),
            is_verified=True,
        )
        session.add(user)
        session.flush()

        # Create Organization
        org = Organization(name="My Vault")
        session.add(org)
        session.flush()

        # Link User to Organization
        org_user = OrganizationUser(
            user_id=user.id,
            organization_id=org.id,
            role="owner",
        )
        session.add(org_user)
        session.flush()
        print(f"  ✅ Demo user created: demo@vault.dev / VaultDemo#2026")
    else:
        print(f"  ⏭️  Demo user already exists (id: {user.id})")

    # --- 2. Demo Twin ---
    twin = session.query(Twin).filter_by(user_id=user.id, name="John Doe").first()
    if not twin:
        print("  Creating demo twin...")
        twin = Twin(
            user_id=user.id,
            name="John Doe",
            public_name="JD Official",
            category="musician",
            bio="Grammy-nominated producer and creative technologist. Building at the intersection of music and AI.",
            alcm_data=DEMO_ALCM_DATA,
            voice_status=VoiceStatus.PENDING,
            commercial_terms={
                "base_rate": 5000,
                "currency": "USD",
                "min_deal_value": 10000,
                "exclusion_categories": ["tobacco", "gambling"],
                "response_time_hours": 48,
            },
            governance={
                "auto_approve_threshold": 0.8,
                "require_human_review": True,
                "allowed_actions": ["respond", "endorse", "create_content"],
                "restricted_actions": ["financial_transactions", "legal_commitments"],
            },
            status=TwinStatus.ACTIVE,
            completeness_score=0.71,
            version="1.0",
        )
        session.add(twin)
        session.flush()
        print(f"  ✅ Demo twin created: {twin.name} (id: {twin.id})")
    else:
        print(f"  ⏭️  Demo twin already exists (id: {twin.id})")

    # --- 3. Sample Certification ---
    existing_cert = session.query(Certification).filter_by(twin_id=twin.id).first()
    if not existing_cert:
        print("  Creating sample certification...")
        serialized = json.dumps(DEMO_ALCM_DATA, sort_keys=True, separators=(",", ":"))
        cert_hash = hashlib.sha256(serialized.encode("utf-8")).hexdigest()

        cert = Certification(
            twin_id=twin.id,
            version="1.0",
            hash=cert_hash,
            consent_record={
                "certified_by": str(user.id),
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "method": "seed_script",
                "algorithm": "sha256",
            },
        )
        session.add(cert)
        session.flush()
        print(f"  ✅ Certification created: v1.0 (hash: {cert_hash[:16]}...)")

        # Update twin certified_at
        twin.certified_at = datetime.now(timezone.utc)
        twin.status = TwinStatus.CERTIFIED
        session.flush()
    else:
        print(f"  ⏭️  Certification already exists")

    # --- 4. Sample Document ---
    existing_doc = session.query(Document).filter_by(twin_id=twin.id).first()
    if not existing_doc:
        print("  Creating sample document...")
        doc = Document(
            twin_id=twin.id,
            title="Brand Usage Guidelines — JD Official",
            doc_type=DocumentType.BRAND_BRIEF,
            content="""# Brand Usage Guidelines

## Voice & Tone
- Casual yet professional
- Authentic and warm
- No corporate jargon

## Visual Requirements
- Use provided brand colors only
- Minimalist layouts preferred
- No stock photography — use original content

## Restrictions
- Must not associate with tobacco, gambling, or political campaigns
- All content must be reviewed before publication
- Maximum 3 brand partnerships per quarter
""",
            status=DocumentStatus.FINAL,
            exportable=True,
            created_by=user.id,
        )
        session.add(doc)
        session.flush()
        print(f"  ✅ Document created: {doc.title}")
    else:
        print(f"  ⏭️  Document already exists")

    # --- 5. Sample Deal ---
    existing_deal = session.query(Deal).filter_by(twin_id=twin.id).first()
    if not existing_deal:
        print("  Creating sample deal...")
        deal = Deal(
            twin_id=twin.id,
            brand_name="SoundWave Audio",
            deal_type="endorsement",
            value=25000.00,
            currency="USD",
            status=DealStatus.ACTIVE,
            terms_summary="6-month social media endorsement for the SoundWave Pro headphones lineup. "
                          "3 posts per month on Instagram and TikTok.",
            notes="Partnership initiated through talent manager. Very aligned with JD's music tech brand.",
            start_date=datetime.now(timezone.utc) - timedelta(days=30),
            end_date=datetime.now(timezone.utc) + timedelta(days=150),
        )
        session.add(deal)
        session.flush()
        print(f"  ✅ Deal created: {deal.brand_name} (${deal.value:,.0f})")
    else:
        print(f"  ⏭️  Deal already exists")

    # --- 6. Audit Log ---
    audit = AuditLog(
        twin_id=twin.id,
        user_id=user.id,
        action="seed_completed",
        entity_type="system",
        details={"seeded_by": "init_tables.py", "version": "vault-mvp"},
    )
    session.add(audit)

    session.commit()
    print("\n🎉 Seeding complete!")
    print(f"\n📋 Demo credentials:")
    print(f"   Email:    demo@vault.dev")
    print(f"   Password: VaultDemo#2026")
    print(f"   Username: demo")

except Exception as e:
    session.rollback()
    print(f"\n❌ Error: {e}")
    raise
finally:
    session.close()
    engine.dispose()
