"""Submission timestamps for progress tracking; existing accounts count as verified.

Revision ID: 0004_progress_and_verified_login
Revises: 0003_add_is_verified
Create Date: 2026-09-25
"""
from alembic import op
import sqlalchemy as sa

revision = "0004_progress_and_verified_login"
down_revision = "0003_add_is_verified"
branch_labels = None
depends_on = None


def upgrade():
    # Existing rows keep NULL: their real submission time is unknown.
    op.add_column("submissions", sa.Column("submitted_at", sa.DateTime(timezone=True), nullable=True))
    # Login now requires a confirmed email. Accounts created before that rule are
    # treated as confirmed so nobody is locked out by the upgrade.
    op.execute("UPDATE users SET is_verified = true WHERE is_verified = false")


def downgrade():
    op.drop_column("submissions", "submitted_at")
