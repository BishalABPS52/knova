"""Telemetry capture: unique (user, post) pair + session/snapshot/provenance columns

Revision ID: interaction_telemetry
Revises: sync_model_columns
Create Date: 2026-08-02 00:00:00.000000

Turns `interactions` into an upsert target so live telemetry can merge into one
row per (user, post) -- the shape the ML training contract expects.

Three groups of columns are added:
  * session accounting  — session_id / session_dwell_sec / view_count, which make
                          repeated flushes of the same session idempotent.
                          view_count is a gate (0 = served but never confirmed
                          seen), not a tally of views.
  * point-in-time snaps — is_interest_match / creator_followed / difficulty_gap,
                          frozen when the post is served so the export can't leak
                          future state (interests and skill both drift over time)
  * ranking provenance  — rank_source / ranker_score / model_version, for offline
                          evaluation of the ordering that was actually served

The seeder loads from a CSV that may contain several rows per (user, content),
so duplicates are collapsed before the unique constraint goes on -- otherwise the
ALTER fails on any previously-seeded database.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'interaction_telemetry'
down_revision: Union[str, Sequence[str], None] = 'sync_model_columns'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # 1. Collapse duplicate (user_id, post_id) rows, keeping the most engaged one
    #    (highest dwell, then newest). Must run before the unique constraint.
    op.execute(
        """
        DELETE FROM interactions a
        USING interactions b
        WHERE a.user_id = b.user_id
          AND a.post_id = b.post_id
          AND (
                a.dwell_time_sec < b.dwell_time_sec
             OR (a.dwell_time_sec = b.dwell_time_sec AND a.created_at < b.created_at)
             OR (a.dwell_time_sec = b.dwell_time_sec AND a.created_at = b.created_at
                 AND a.id < b.id)
          )
        """
    )

    # 2. Session accounting
    op.add_column('interactions', sa.Column('session_id', sa.String(length=64), nullable=True))
    op.create_index(op.f('ix_interactions_session_id'), 'interactions', ['session_id'], unique=False)
    op.add_column(
        'interactions',
        sa.Column('session_dwell_sec', sa.Float(), nullable=False, server_default='0'),
    )
    op.add_column(
        'interactions',
        sa.Column('view_count', sa.Integer(), nullable=False, server_default='0'),
    )

    # 3. Point-in-time snapshots
    op.add_column('interactions', sa.Column('is_interest_match', sa.Boolean(), nullable=True))
    op.add_column('interactions', sa.Column('creator_followed', sa.Boolean(), nullable=True))
    op.add_column('interactions', sa.Column('difficulty_gap', sa.Float(), nullable=True))

    # 4. Ranking provenance
    op.add_column('interactions', sa.Column('rank_source', sa.String(length=24), nullable=True))
    op.add_column('interactions', sa.Column('ranker_score', sa.Float(), nullable=True))
    op.add_column('interactions', sa.Column('model_version', sa.String(length=32), nullable=True))

    op.add_column(
        'interactions',
        sa.Column('last_event_at', sa.DateTime(timezone=True), nullable=True),
    )

    # 5. Seeded rows predate the client, but they were real (synthetic) engagement:
    #    mark them as viewed so the export doesn't discard them as unconfirmed.
    op.execute("UPDATE interactions SET view_count = 1 WHERE dwell_time_sec > 0")

    # 6. The upsert target.
    op.create_unique_constraint('uq_interaction_pair', 'interactions', ['user_id', 'post_id'])


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_constraint('uq_interaction_pair', 'interactions', type_='unique')

    op.drop_column('interactions', 'last_event_at')
    op.drop_column('interactions', 'model_version')
    op.drop_column('interactions', 'ranker_score')
    op.drop_column('interactions', 'rank_source')
    op.drop_column('interactions', 'difficulty_gap')
    op.drop_column('interactions', 'creator_followed')
    op.drop_column('interactions', 'is_interest_match')
    op.drop_column('interactions', 'view_count')
    op.drop_column('interactions', 'session_dwell_sec')
    op.drop_index(op.f('ix_interactions_session_id'), table_name='interactions')
    op.drop_column('interactions', 'session_id')
