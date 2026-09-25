"""Curriculum step types and passport expansion.

Revision ID: 0002_curriculum_step_types
Revises: 0001_initial
Create Date: 2026-09-24
"""
from alembic import op
import sqlalchemy as sa

revision = "0002_curriculum_step_types"
down_revision = "0001_initial"
branch_labels = None
depends_on = None


def upgrade():
    # Convert tasks.type enum to flexible VARCHAR(50) so platform accepts all step types without migration rewrite
    op.execute("ALTER TABLE tasks ALTER COLUMN type TYPE VARCHAR(50) USING type::text;")
    
    # Add step passport fields to tasks
    op.add_column("tasks", sa.Column("title", sa.String(200), nullable=True))
    op.add_column("tasks", sa.Column("step_number", sa.String(20), nullable=True))
    op.add_column("tasks", sa.Column("check_type", sa.String(100), nullable=True))
    op.add_column("tasks", sa.Column("submit_type", sa.String(100), nullable=True))
    op.add_column("tasks", sa.Column("order_index", sa.Integer(), server_default="0", nullable=False))
    
    # Add course passport fields
    op.add_column("courses", sa.Column("grades", sa.String(100), nullable=True))
    op.add_column("courses", sa.Column("volume", sa.String(100), nullable=True))
    op.add_column("courses", sa.Column("tool", sa.String(200), nullable=True))
    op.add_column("courses", sa.Column("goal", sa.Text(), nullable=True))


def downgrade():
    op.drop_column("courses", "goal")
    op.drop_column("courses", "tool")
    op.drop_column("courses", "volume")
    op.drop_column("courses", "grades")
    op.drop_column("tasks", "order_index")
    op.drop_column("tasks", "submit_type")
    op.drop_column("tasks", "check_type")
    op.drop_column("tasks", "step_number")
    op.drop_column("tasks", "title")
    op.execute("ALTER TABLE tasks ALTER COLUMN type TYPE step_types USING type::step_types;")
