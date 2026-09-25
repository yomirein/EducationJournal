"""add is_verified field to users

Revision ID: 0002
Revises: 0001
Create Date: 2025-01-24 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '0003_add_is_verified'
down_revision: Union[str, None] = '0002_curriculum_step_types'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('users', sa.Column('is_verified', sa.Boolean(), nullable=False, server_default='false'))
    op.create_index(op.f('ix_users_is_verified'), 'users', ['is_verified'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_users_is_verified'), table_name='users')
    op.drop_column('users', 'is_verified')
