"""Sync missing model columns: posts.ext_id + interaction telemetry fields

Revision ID: sync_model_columns
Revises: shortnote_extid_source
Create Date: 2026-07-18 00:00:00.000000

These columns exist on the SQLAlchemy models but were never migrated onto the
live DB (model drift):
  * posts.ext_id            — integer bridge to the ML content_id (not unique;
                              organic posts are NULL)
  * interactions.quiz_answered / quiz_correct / card_flipped / flip_time_sec
                            — per-content-type telemetry (nullable)
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'sync_model_columns'
down_revision: Union[str, Sequence[str], None] = 'shortnote_extid_source'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('posts', sa.Column('ext_id', sa.Integer(), nullable=True))
    op.create_index(op.f('ix_posts_ext_id'), 'posts', ['ext_id'], unique=False)

    op.add_column('interactions', sa.Column('quiz_answered', sa.Boolean(), nullable=True))
    op.add_column('interactions', sa.Column('quiz_correct', sa.Boolean(), nullable=True))
    op.add_column('interactions', sa.Column('card_flipped', sa.Boolean(), nullable=True))
    op.add_column('interactions', sa.Column('flip_time_sec', sa.Float(), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('interactions', 'flip_time_sec')
    op.drop_column('interactions', 'card_flipped')
    op.drop_column('interactions', 'quiz_correct')
    op.drop_column('interactions', 'quiz_answered')

    op.drop_index(op.f('ix_posts_ext_id'), table_name='posts')
    op.drop_column('posts', 'ext_id')
