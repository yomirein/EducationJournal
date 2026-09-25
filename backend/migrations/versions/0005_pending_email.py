"""Pending email address confirmed by a link before it replaces the current one.

Revision ID: 0005_pending_email
Revises: 0004_progress_and_verified_login
Create Date: 2026-09-26
"""
from alembic import op
import sqlalchemy as sa

revision = "0005_pending_email"
down_revision = "0004_progress_and_verified_login"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("users", sa.Column("pending_email", sa.String(320), nullable=True))


def downgrade():
    op.drop_column("users", "pending_email")
