"""store encrypted channel API keys for owner copy

Revision ID: b2f4c8d91a6e
Revises: 8c4e1b9f2d7a
Create Date: 2026-11-07

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "b2f4c8d91a6e"
down_revision: Union[str, Sequence[str], None] = "8c4e1b9f2d7a"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("api_keys", sa.Column("key_ciphertext", sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column("api_keys", "key_ciphertext")
