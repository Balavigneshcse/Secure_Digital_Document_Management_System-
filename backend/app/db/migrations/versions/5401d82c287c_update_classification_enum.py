"""update classification enum

Revision ID: 5401d82c287c
Revises: 2bfeb2a2ba50
Create Date: 2026-09-19 09:38:32.004210

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '5401d82c287c'
down_revision: Union[str, None] = '2bfeb2a2ba50'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Update enum values using ALTER TYPE
    # op.execute("ALTER TYPE classificationenum ADD VALUE IF NOT EXISTS 'WITNESS_STATEMENT'")
    # op.execute("ALTER TYPE classificationenum ADD VALUE IF NOT EXISTS 'FORENSIC_REPORT'")
    # op.execute("ALTER TYPE classificationenum ADD VALUE IF NOT EXISTS 'COURT_FILING'")
    # op.execute("ALTER TYPE classificationenum ADD VALUE IF NOT EXISTS 'MEDICAL_REPORT'")
    # op.execute("ALTER TYPE classificationenum ADD VALUE IF NOT EXISTS 'ARREST_WARRANT'")
    pass


def downgrade() -> None:
    pass
