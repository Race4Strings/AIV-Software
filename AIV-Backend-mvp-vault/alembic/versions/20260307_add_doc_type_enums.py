"""Add governance and commercial to documenttype enum

Revision ID: c3d4e5f6a7b8
Revises: b2c3d4e5f6a7
Create Date: 2026-03-07
"""
from alembic import op

revision = 'c3d4e5f6a7b8'
down_revision = 'b2c3d4e5f6a7'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add new values to the documenttype enum if it exists,
    # or to the varchar column if no enum is used
    op.execute("ALTER TYPE documenttype ADD VALUE IF NOT EXISTS 'governance'")
    op.execute("ALTER TYPE documenttype ADD VALUE IF NOT EXISTS 'commercial'")


def downgrade() -> None:
    # PostgreSQL doesn't support removing enum values easily
    pass
