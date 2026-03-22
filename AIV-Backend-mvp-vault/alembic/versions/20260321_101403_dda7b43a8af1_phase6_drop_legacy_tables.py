"""phase6_drop_legacy_tables

Drop legacy tables that have been replaced by the new schema:
- certifications → identity_package_versions
- documents → deal_contracts, reference_data_agreements
- workspace_table → removed (assistant sessions replace workspaces)
- workspace_documents → removed
- chat_table → agent_sessions
- chat_participant_table → removed (sessions are per-user)
- chat_message_table → agent_messages
- training_submissions → training_contributions

Also drops legacy columns from twins table:
- alcm_data, voice_id, voice_status, voice_sample_url
- commercial_terms, governance, completeness_score, version, name, category

Revision ID: dda7b43a8af1
Revises: 572ffe12d7dd
Create Date: 2026-03-21 10:14:03.604492
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'dda7b43a8af1'
down_revision: Union[str, None] = '572ffe12d7dd'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Drop legacy tables (order matters for foreign keys)
    op.drop_table('chat_message_table')
    op.drop_table('chat_participant_table')
    op.drop_table('chat_table')
    op.drop_table('workspace_documents')
    op.drop_table('workspace_table')
    op.drop_table('certifications')
    op.drop_table('documents')
    op.drop_table('training_submissions')


def downgrade() -> None:
    # Not reversible — legacy data is gone
    pass
