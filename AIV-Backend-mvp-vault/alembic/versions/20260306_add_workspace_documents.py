"""Add workspace_documents table for project knowledge base

Revision ID: a1b2c3d4e5f6
Revises: 32a008de0841
Create Date: 2026-03-06
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'a1b2c3d4e5f6'
down_revision = '32a008de0841'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'workspace_documents',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('workspace_id', postgresql.UUID(as_uuid=True),
                  sa.ForeignKey('workspace_table.id', ondelete='CASCADE'),
                  nullable=False, index=True),
        sa.Column('uploaded_by', postgresql.UUID(as_uuid=True),
                  sa.ForeignKey('user_table.id'), nullable=False),
        sa.Column('filename', sa.String(500), nullable=False),
        sa.Column('content_type', sa.String(200), nullable=True),
        sa.Column('file_size', sa.BigInteger(), nullable=True),
        sa.Column('storage_key', sa.String(1000), nullable=False),
        sa.Column('storage_url', sa.Text(), nullable=True),
        sa.Column('description', sa.String(1000), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True),
                  server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True),
                  server_default=sa.func.now(), nullable=False),
    )


def downgrade() -> None:
    op.drop_table('workspace_documents')
