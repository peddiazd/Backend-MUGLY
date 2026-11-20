
"""agregar estado de pago a pedidos

Revision ID: e5d10d2eef4a
Revises: 2098e2ff6c39
Create Date: 2026-10-30 16:08:20.953632

"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "e5d10d2eef4a"
down_revision = "2098e2ff6c39"
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table("pedidos", schema=None) as batch_op:
        batch_op.add_column(
            sa.Column(
                "estado_pago",
                sa.String(length=30),
                nullable=False,
                server_default="pendiente",
            )
        )


def downgrade():
    with op.batch_alter_table("pedidos", schema=None) as batch_op:
        batch_op.drop_column("estado_pago")
