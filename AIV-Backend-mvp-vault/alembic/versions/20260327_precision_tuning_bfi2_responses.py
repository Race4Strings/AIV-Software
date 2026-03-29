"""add bfi2_responses table for Precision Tuning

BFI-2 personality calibration — 60-item Big Five Inventory-2 questionnaire.
Stores talent self-report responses and computed domain/facet scores.
ALCM comparison is computed live, not stored.

Revision ID: a1b2c3d4e5f6
Revises: dda7b43a8af1
Create Date: 2026-03-27
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers
revision = 'a1b2c3d4e5f6'
down_revision = 'dda7b43a8af1'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'bfi2_responses',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True,
                  server_default=sa.text('gen_random_uuid()')),
        sa.Column('twin_id', postgresql.UUID(as_uuid=True),
                  sa.ForeignKey('twins.id'), nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True),
                  sa.ForeignKey('user_table.id'), nullable=False),

        # Raw responses (JSONB array of {item, value} objects)
        sa.Column('responses', postgresql.JSON, nullable=True),

        # Computed domain scores (1.0-5.0 scale)
        sa.Column('score_extraversion', sa.Float, nullable=True),
        sa.Column('score_agreeableness', sa.Float, nullable=True),
        sa.Column('score_conscientiousness', sa.Float, nullable=True),
        sa.Column('score_negative_emotionality', sa.Float, nullable=True),
        sa.Column('score_open_mindedness', sa.Float, nullable=True),

        # Computed facet scores (15 facets, JSONB)
        sa.Column('facet_scores', postgresql.JSON, nullable=True),

        # Progress tracking
        sa.Column('progress', sa.Integer, default=0),
        sa.Column('completed', sa.Boolean, default=False),
        sa.Column('reminded_in_training', sa.Boolean, default=False),

        # Timestamps
        sa.Column('started_at', sa.DateTime(timezone=True),
                  server_default=sa.func.now()),
        sa.Column('completed_at', sa.DateTime(timezone=True), nullable=True),

        # Source context
        sa.Column('source', sa.String(50), default='ONBOARDING_INTERSTITIAL'),

        sa.Column('created_at', sa.DateTime(timezone=True),
                  server_default=sa.func.now()),
    )
    op.create_index('idx_bfi2_twin', 'bfi2_responses', ['twin_id'])


def downgrade() -> None:
    op.drop_index('idx_bfi2_twin', table_name='bfi2_responses')
    op.drop_table('bfi2_responses')
