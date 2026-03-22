"""Fix chat tables — drop and recreate with correct schema

Revision ID: d4e5f6a7b8c9
Revises: c3d4e5f6a7b8
Create Date: 2026-03-07
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = 'd4e5f6a7b8c9'
down_revision = 'c3d4e5f6a7b8'
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()

    # Drop existing chat tables (may have been created by create_all with wrong schema)
    op.execute("DROP TABLE IF EXISTS chat_message_table CASCADE")
    op.execute("DROP TABLE IF EXISTS chat_participant_table CASCADE")
    op.execute("DROP TABLE IF EXISTS chat_table CASCADE")

    # Drop and recreate enums cleanly
    op.execute("DROP TYPE IF EXISTS chattype CASCADE")
    op.execute("DROP TYPE IF EXISTS participantrole CASCADE")
    op.execute("DROP TYPE IF EXISTS messagetype CASCADE")
    op.execute("CREATE TYPE chattype AS ENUM ('direct', 'group')")
    op.execute("CREATE TYPE participantrole AS ENUM ('owner', 'member')")
    op.execute("CREATE TYPE messagetype AS ENUM ('text', 'system')")

    op.create_table(
        'chat_table',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True,
                  server_default=sa.text('gen_random_uuid()')),
        sa.Column('workspace_id', postgresql.UUID(as_uuid=True),
                  sa.ForeignKey('workspace_table.id', ondelete='CASCADE'),
                  nullable=False, index=True),
        sa.Column('creator_id', postgresql.UUID(as_uuid=True),
                  sa.ForeignKey('user_table.id'), nullable=False, index=True),
        sa.Column('title', sa.String(200), nullable=True),
        sa.Column('chat_type', sa.Text(), nullable=False, server_default='direct'),
        sa.Column('is_archived', sa.Boolean(), nullable=False, server_default=sa.text('false')),
        sa.Column('created_at', sa.DateTime(timezone=True),
                  server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True),
                  server_default=sa.func.now(), nullable=False),
    )

    op.create_table(
        'chat_participant_table',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True,
                  server_default=sa.text('gen_random_uuid()')),
        sa.Column('chat_id', postgresql.UUID(as_uuid=True),
                  sa.ForeignKey('chat_table.id', ondelete='CASCADE'),
                  nullable=False, index=True),
        sa.Column('user_id', postgresql.UUID(as_uuid=True),
                  sa.ForeignKey('user_table.id'), nullable=True, index=True),
        sa.Column('twin_id', postgresql.UUID(as_uuid=True),
                  sa.ForeignKey('twins.id'), nullable=True, index=True),
        sa.Column('role', sa.Text(), nullable=False, server_default='member'),
        sa.Column('joined_at', sa.DateTime(timezone=True),
                  server_default=sa.func.now(), nullable=False),
    )

    op.create_table(
        'chat_message_table',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True,
                  server_default=sa.text('gen_random_uuid()')),
        sa.Column('chat_id', postgresql.UUID(as_uuid=True),
                  sa.ForeignKey('chat_table.id', ondelete='CASCADE'),
                  nullable=False, index=True),
        sa.Column('sender_user_id', postgresql.UUID(as_uuid=True),
                  sa.ForeignKey('user_table.id'), nullable=True, index=True),
        sa.Column('sender_twin_id', postgresql.UUID(as_uuid=True),
                  sa.ForeignKey('twins.id'), nullable=True, index=True),
        sa.Column('content', sa.Text(), nullable=False),
        sa.Column('message_type', sa.Text(), nullable=False, server_default='text'),
        sa.Column('mentions', postgresql.JSONB(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True),
                  server_default=sa.func.now(), nullable=False),
    )


def downgrade() -> None:
    op.drop_table('chat_message_table')
    op.drop_table('chat_participant_table')
    op.drop_table('chat_table')
    op.execute("DROP TYPE IF EXISTS messagetype")
    op.execute("DROP TYPE IF EXISTS participantrole")
    op.execute("DROP TYPE IF EXISTS chattype")
