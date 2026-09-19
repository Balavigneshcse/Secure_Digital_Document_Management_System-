"""add_department_and_post

Revision ID: ad14ed7bf049
Revises: 5401d82c287c
Create Date: 2026-09-19 14:02:20.369666

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'ad14ed7bf049'
down_revision: Union[str, None] = '5401d82c287c'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('users', sa.Column('department', sa.String(), nullable=True))
    op.add_column('users', sa.Column('post', sa.String(), nullable=True))


def downgrade() -> None:
    op.drop_column('users', 'post')
    op.drop_column('users', 'department')
