"""Add failed_login_attempts and locked_until columns to users table.

Run with: python migrations/add_lockout_columns.py

Safe to run multiple times — checks if columns exist before adding.
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from dotenv import load_dotenv
load_dotenv()

from sqlalchemy import create_engine, text

database_url = os.getenv("DATABASE_URL_SYNC")
if not database_url:
    # Use psycopg3 driver (installed as psycopg[binary] in requirements.txt)
    database_url = os.getenv("DATABASE_URL", "").replace("+asyncpg", "+psycopg").replace("postgresql+asyncpg", "postgresql+psycopg")

engine = create_engine(database_url, echo=False)

with engine.connect() as conn:
    # Check if columns already exist
    result = conn.execute(text("""
        SELECT column_name FROM information_schema.columns
        WHERE table_name = 'users' AND column_name IN ('failed_login_attempts', 'locked_until')
    """))
    existing = {row[0] for row in result}

    if "failed_login_attempts" not in existing:
        conn.execute(text("ALTER TABLE users ADD COLUMN failed_login_attempts INTEGER NOT NULL DEFAULT 0"))
        print("Added: failed_login_attempts")
    else:
        print("Exists: failed_login_attempts")

    if "locked_until" not in existing:
        conn.execute(text("ALTER TABLE users ADD COLUMN locked_until TIMESTAMPTZ"))
        print("Added: locked_until")
    else:
        print("Exists: locked_until")

    conn.commit()
    print("Migration complete.")
