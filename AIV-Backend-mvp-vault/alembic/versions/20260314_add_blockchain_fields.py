"""Add blockchain fields to certifications

Revision ID: 20260314_add_bc_fields
Revises: d4e5f6a7b8c9
Create Date: 2026-03-14
"""
from alembic import op
import sqlalchemy as sa

revision = '20260314_add_bc_fields'
down_revision = 'd4e5f6a7b8c9'
branch_labels = None
depends_on = None

def upgrade() -> None:
    op.add_column('certifications', sa.Column('tx_hash', sa.String(length=70), nullable=True))
    op.add_column('certifications', sa.Column('block_number', sa.String(length=20), nullable=True))
    op.add_column('certifications', sa.Column('network', sa.String(length=20), nullable=True))

def downgrade() -> None:
    op.drop_column('certifications', 'network')
    op.drop_column('certifications', 'block_number')
    op.drop_column('certifications', 'tx_hash')
