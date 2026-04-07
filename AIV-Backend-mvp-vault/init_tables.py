"""Initialize database tables and seed demo data for The Vault.

Usage:
    python init_tables.py

Seeds:
  - Demo user (demo@vault.dev / VaultDemo#2026)
  - Demo organization + membership
  - Demo twin (current schema — slim reference, no ALCM data)
  - Sample access code
"""
import os
import sys
import hashlib
from datetime import datetime, timezone, timedelta
from uuid import uuid4

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from dotenv import load_dotenv
load_dotenv()

from sqlalchemy import create_engine
from sqlalchemy.orm import Session
from app.database import Base

# Import all models so they register with Base.metadata
from app.models import *  # noqa
from app.models.user import User
from app.models.organization import Organization, OrganizationMembership
from app.models.twin import Twin
from app.models.access_code import AccessCode
from app.models.audit_log import AuditLog
from app.utils.password import hash_password

# Use the sync database URL
database_url = os.getenv("DATABASE_URL_SYNC")
if not database_url:
    database_url = os.getenv("DATABASE_URL", "").replace("+asyncpg", "").replace("postgresql+asyncpg", "postgresql")

print(f"Connecting to database...")
engine = create_engine(database_url, echo=False)

print("Creating database tables...")
Base.metadata.create_all(bind=engine)
print("Tables created successfully.")


# ============== Seed Logic ==============

print("\nSeeding demo data...")
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
            role="TALENT",
        )
        session.add(user)
        session.flush()

        # Create Organization
        org = Organization(name="My Vault", type="TALENT_TEAM")
        session.add(org)
        session.flush()

        # Link User to Organization via new membership model
        membership = OrganizationMembership(
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
        )
        session.add(membership)
        session.flush()
        print(f"  Demo user created: demo@vault.dev / VaultDemo#2026")
    else:
        print(f"  Demo user already exists (id: {user.id})")
        org_result = session.query(OrganizationMembership).filter_by(user_id=user.id).first()
        org = session.query(Organization).filter_by(id=org_result.organization_id).first() if org_result else None

    # --- 2. Demo Twin (current schema) ---
    twin = session.query(Twin).filter_by(talent_user_id=user.id).first()
    if not twin:
        print("  Creating demo twin...")
        now = datetime.now(timezone.utc)
        twin = Twin(
            organization_id=org.id if org else None,
            talent_user_id=user.id,
            alcm_twin_id=uuid4(),  # Mock ALCM ID for demo
            display_name="John Doe",
            public_name="JD Official",
            bio="Grammy-nominated producer and creative technologist. Building at the intersection of music and AI.",
            identity_category=["MUSIC"],
            clone_type="PERSONAL_IDENTITY",
            status="BUILDING",
            health_status="BUILDING",
            talent_authorization_at=now - timedelta(days=7),
            stage_1_completed_at=now - timedelta(days=5),
            fee_free_window_expires=now + timedelta(days=83),
        )
        session.add(twin)
        session.flush()
        print(f"  Demo twin created: {twin.display_name} (id: {twin.id})")
    else:
        print(f"  Demo twin already exists (id: {twin.id})")

    # --- 3. Demo Access Code ---
    code = session.query(AccessCode).filter_by(code="DEMO-2026").first()
    if not code:
        print("  Creating demo access code...")
        code = AccessCode(
            code="DEMO-2026",
            label="Demo",
            is_used=False,
        )
        session.add(code)
        session.flush()
        print("  Demo access code created: DEMO-2026")

    # --- 4. Audit Log Entry ---
    session.add(AuditLog(
        actor_id=user.id,
        actor_type="SYSTEM",
        action="CREATE",
        entity_type="system",
        details={"seeded_by": "init_tables.py", "schema": "vault-mvp-v2"},
    ))

    session.commit()
    print("\nDemo data seeded successfully.")

except Exception as e:
    session.rollback()
    print(f"\nError seeding data: {e}")
    raise
finally:
    session.close()

print("\nDatabase initialization complete.")
