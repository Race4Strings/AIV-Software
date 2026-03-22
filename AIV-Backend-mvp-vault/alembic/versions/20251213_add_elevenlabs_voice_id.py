"""Add elevenlabs_voice_id column

Revision ID: add_elevenlabs_voice_id
Revises: 
Create Date: 2025-12-13
"""
from alembic import op
import sqlalchemy as sa


# revision identifiers
revision = 'add_elevenlabs_voice_id'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('clone_table', sa.Column('elevenlabs_voice_id', sa.String(255), nullable=True))


def downgrade() -> None:
    op.drop_column('clone_table', 'elevenlabs_voice_id')
