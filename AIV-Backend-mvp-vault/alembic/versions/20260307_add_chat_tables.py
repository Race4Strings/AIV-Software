"""Add chat, chat_participant, and chat_message tables

Revision ID: b2c3d4e5f6a7
Revises: a1b2c3d4e5f6
Create Date: 2026-03-07
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
from sqlalchemy import inspect as sa_inspect

revision = 'b2c3d4e5f6a7'
down_revision = 'a1b2c3d4e5f6'
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa_inspect(bind)
    existing_tables = inspector.get_table_names()

    # Create enums safely (idempotent)
    op.execute("DO $$ BEGIN CREATE TYPE chattype AS ENUM ('direct', 'group'); EXCEPTION WHEN duplicate_object THEN NULL; END $$")
    op.execute("DO $$ BEGIN CREATE TYPE participantrole AS ENUM ('owner', 'member'); EXCEPTION WHEN duplicate_object THEN NULL; END $$")
    op.execute("DO $$ BEGIN CREATE TYPE messagetype AS ENUM ('text', 'system'); EXCEPTION WHEN duplicate_object THEN NULL; END $$")

    chat_type_enum = postgresql.ENUM('direct', 'group', name='chattype', create_type=False)
    participant_role_enum = postgresql.ENUM('owner', 'member', name='participantrole', create_type=False)
    message_type_enum = postgresql.ENUM('text', 'system', name='messagetype', create_type=False)

    if 'chat_table' not in existing_tables:
        op.create_table(
            'chat_table',
            sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
            sa.Column('workspace_id', postgresql.UUID(as_uuid=True),
                      sa.ForeignKey('workspace_table.id', ondelete='CASCADE'), nullable=False, index=True),
            sa.Column('creator_id', postgresql.UUID(as_uuid=True),
                      sa.ForeignKey('user_table.id'), nullable=False, index=True),
            sa.Column('title', sa.String(200), nullable=True),
            sa.Column('chat_type', chat_type_enum, nullable=False, server_default='direct'),
            sa.Column('is_archived', sa.Boolean(), nullable=False, server_default=sa.text('false')),
            sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        )

    if 'chat_participant_table' not in existing_tables:
        op.create_table(
            'chat_participant_table',
            sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
            sa.Column('chat_id', postgresql.UUID(as_uuid=True),
                      sa.ForeignKey('chat_table.id', ondelete='CASCADE'), nullable=False, index=True),
            sa.Column('user_id', postgresql.UUID(as_uuid=True),
                      sa.ForeignKey('user_table.id'), nullable=True, index=True),
            sa.Column('twin_id', postgresql.UUID(as_uuid=True),
                      sa.ForeignKey('twins.id'), nullable=True, index=True),
            sa.Column('role', participant_role_enum, nullable=False, server_default='member'),
            sa.Column('joined_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        )

    if 'chat_message_table' not in existing_tables:
        op.create_table(
            'chat_message_table',
            sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
            sa.Column('chat_id', postgresql.UUID(as_uuid=True),
                      sa.ForeignKey('chat_table.id', ondelete='CASCADE'), nullable=False, index=True),
            sa.Column('sender_user_id', postgresql.UUID(as_uuid=True),
                      sa.ForeignKey('user_table.id'), nullable=True, index=True),
            sa.Column('sender_twin_id', postgresql.UUID(as_uuid=True),
                      sa.ForeignKey('twins.id'), nullable=True, index=True),
            sa.Column('content', sa.Text(), nullable=False),
            sa.Column('message_type', message_type_enum, nullable=False, server_default='text'),
            sa.Column('mentions', postgresql.JSONB(), nullable=True),
            sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        )


def downgrade() -> None:
    op.drop_table('chat_message_table')
    op.drop_table('chat_participant_table')
    op.drop_table('chat_table')
    op.execute("DROP TYPE IF EXISTS messagetype")
    op.execute("DROP TYPE IF EXISTS participantrole")
    op.execute("DROP TYPE IF EXISTS chattype")
