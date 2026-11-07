"""create channels fields api keys and feeds

Revision ID: 8c4e1b9f2d7a
Revises: 45b77fa8a6f2
Create Date: 2026-11-07

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "8c4e1b9f2d7a"
down_revision: Union[str, Sequence[str], None] = "45b77fa8a6f2"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "channels",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("owner_id", sa.BigInteger(), nullable=False),
        sa.Column("name", sa.String(length=100), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["owner_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_channels_owner_id", "channels", ["owner_id"], unique=False)

    op.create_table(
        "channel_fields",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("channel_id", sa.BigInteger(), nullable=False),
        sa.Column("key", sa.String(length=16), nullable=False),
        sa.Column("name", sa.String(length=100), nullable=False),
        sa.Column("unit", sa.String(length=32), nullable=True),
        sa.Column("position", sa.Integer(), server_default="1", nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["channel_id"], ["channels.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("channel_id", "key", name="uq_channel_fields_channel_key"),
    )
    op.create_index("ix_channel_fields_channel_id", "channel_fields", ["channel_id"], unique=False)
    op.create_index("idx_channel_fields_position", "channel_fields", ["channel_id", "position"], unique=False)

    op.create_table(
        "api_keys",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("channel_id", sa.BigInteger(), nullable=False),
        sa.Column("key_type", sa.String(length=16), nullable=False),
        sa.Column("name", sa.String(length=100), nullable=False),
        sa.Column("key_hash", sa.String(length=64), nullable=False),
        sa.Column("key_prefix", sa.String(length=24), nullable=False),
        sa.Column("last_used_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("revoked_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["channel_id"], ["channels.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_api_keys_channel_id", "api_keys", ["channel_id"], unique=False)
    op.create_index("ix_api_keys_key_hash", "api_keys", ["key_hash"], unique=True)
    op.create_index(
        "idx_api_keys_channel_type_active",
        "api_keys",
        ["channel_id", "key_type", "revoked_at"],
        unique=False,
    )

    op.create_table(
        "channel_feeds",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("channel_id", sa.BigInteger(), nullable=False),
        sa.Column("values_json", sa.JSON(), nullable=False),
        sa.Column("received_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["channel_id"], ["channels.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_channel_feeds_channel_id", "channel_feeds", ["channel_id"], unique=False)
    op.create_index(
        "idx_channel_feeds_history",
        "channel_feeds",
        ["channel_id", "received_at", "id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("idx_channel_feeds_history", table_name="channel_feeds")
    op.drop_index("ix_channel_feeds_channel_id", table_name="channel_feeds")
    op.drop_table("channel_feeds")

    op.drop_index("idx_api_keys_channel_type_active", table_name="api_keys")
    op.drop_index("ix_api_keys_key_hash", table_name="api_keys")
    op.drop_index("ix_api_keys_channel_id", table_name="api_keys")
    op.drop_table("api_keys")

    op.drop_index("idx_channel_fields_position", table_name="channel_fields")
    op.drop_index("ix_channel_fields_channel_id", table_name="channel_fields")
    op.drop_table("channel_fields")

    op.drop_index("ix_channels_owner_id", table_name="channels")
    op.drop_table("channels")
