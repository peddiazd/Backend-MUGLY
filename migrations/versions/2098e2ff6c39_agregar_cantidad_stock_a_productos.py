"""agregar cantidad stock a productos

Revision ID: 2098e2ff6c39
Revises: 8c3748238b02
Create Date: 2026-10-30 15:20:04.341466

"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "2098e2ff6c39"
down_revision = "8c3748238b02"
branch_labels = None
depends_on = None


def upgrade():
    """Agrega el inventario y asigna cero a los productos existentes."""

    with op.batch_alter_table("productos", schema=None) as batch_op:
        batch_op.add_column(
            sa.Column("cantidad_stock", sa.Integer(), nullable=True)
        )

    op.execute(
        sa.text(
            "UPDATE productos SET cantidad_stock = 0 "
            "WHERE cantidad_stock IS NULL"
        )
    )

    with op.batch_alter_table("productos", schema=None) as batch_op:
        batch_op.alter_column(
            "cantidad_stock",
            existing_type=sa.Integer(),
            nullable=False,
        )


def downgrade():
    """Elimina la columna de inventario."""

    with op.batch_alter_table("productos", schema=None) as batch_op:
        batch_op.drop_column("cantidad_stock")