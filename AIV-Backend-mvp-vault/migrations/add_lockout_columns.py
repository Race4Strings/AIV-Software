"""Add missing columns to users table + seed demo data.

Run with: python migrations/add_lockout_columns.py

Safe to run multiple times — checks if columns/data exist before adding.
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from dotenv import load_dotenv
load_dotenv()

from sqlalchemy import create_engine, text

database_url = os.getenv("DATABASE_URL_SYNC")
if not database_url:
    database_url = os.getenv("DATABASE_URL", "").replace("+asyncpg", "").replace("postgresql+asyncpg", "postgresql")

engine = create_engine(database_url, echo=False)

with engine.connect() as conn:
    # Get all existing columns on users table
    result = conn.execute(text("""
        SELECT column_name FROM information_schema.columns
        WHERE table_name = 'users'
    """))
    existing = {row[0] for row in result}
    print(f"Existing columns: {len(existing)}")

    # Add any missing columns
    columns_to_add = {
        "failed_login_attempts": "INTEGER NOT NULL DEFAULT 0",
        "locked_until": "TIMESTAMPTZ",
        "is_verified": "BOOLEAN NOT NULL DEFAULT false",
        "stripe_customer_id": "VARCHAR(255)",
        "notification_preferences": "JSONB DEFAULT '{}'::jsonb",
    }

    for col, col_type in columns_to_add.items():
        if col not in existing:
            try:
                conn.execute(text(f"ALTER TABLE users ADD COLUMN {col} {col_type}"))
                print(f"Added: {col}")
            except Exception as e:
                print(f"Skipped {col}: {e}")
        else:
            print(f"Exists: {col}")

    conn.commit()

    # Seed demo user if not exists
    result = conn.execute(text("SELECT id FROM users WHERE user_name = 'demo' LIMIT 1"))
    demo_user = result.fetchone()

    if not demo_user:
        print("\nSeeding demo user...")
        from passlib.context import CryptContext
        pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
        hashed = pwd_context.hash("VaultDemo#2026")

        conn.execute(text("""
            INSERT INTO users (id, name, email, user_name, password, is_verified, role, created_at, updated_at, failed_login_attempts)
            VALUES (gen_random_uuid(), 'John Doe', 'demo@vault.dev', 'demo', :password, true, 'TALENT', NOW(), NOW(), 0)
        """), {"password": hashed})
        conn.commit()
        print("Demo user created: demo@vault.dev / VaultDemo#2026")
    else:
        print(f"\nDemo user exists: {demo_user[0]}")

    # Seed demo access code if not exists
    result = conn.execute(text("SELECT 1 FROM access_codes WHERE code = 'DEMO-2026' LIMIT 1"))
    if not result.fetchone():
        try:
            conn.execute(text("""
                INSERT INTO access_codes (id, code, label, is_used, created_at)
                VALUES (gen_random_uuid(), 'DEMO-2026', 'Demo', false, NOW())
            """))
            conn.commit()
            print("Demo access code created: DEMO-2026")
        except Exception as e:
            print(f"Skipped access code: {e}")
    else:
        print("Demo access code exists: DEMO-2026")

    print("\nMigration complete.")
