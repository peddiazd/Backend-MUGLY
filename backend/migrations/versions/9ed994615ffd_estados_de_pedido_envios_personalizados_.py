"""estados de pedido, envios, personalizados, imagen y clientes activos

Implementa ADR-004 (un solo estado de pedido con historial), ADR-006
(imagen de producto), envios (RF19-RF20), pedidos personalizados (D4a)
y desactivacion de clientes (D5).

Revision ID: 9ed994615ffd
Revises: e5d10d2eef4a
Create Date: 2026-11-19 21:48:55.350866

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '9ed994615ffd'
down_revision = 'e5d10d2eef4a'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table('historial_estados_pedido',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('pedido_id', sa.Integer(), nullable=False),
    sa.Column('estado', sa.String(length=30), nullable=False),
    sa.Column('fecha', sa.DateTime(), nullable=False),
    sa.Column('usuario_id', sa.Integer(), nullable=False),
    sa.ForeignKeyConstraint(['pedido_id'], ['pedidos.id'], ),
    sa.ForeignKeyConstraint(['usuario_id'], ['usuarios.id'], ),
    sa.PrimaryKeyConstraint('id')
    )

    with op.batch_alter_table('pedidos', schema=None) as batch_op:
        batch_op.add_column(sa.Column('tipo', sa.String(length=20), server_default='catalogo', nullable=False))
        batch_op.add_column(sa.Column('descripcion', sa.Text(), nullable=True))
        batch_op.add_column(sa.Column('transportadora', sa.String(length=100), nullable=True))
        batch_op.add_column(sa.Column('numero_guia', sa.String(length=100), nullable=True))

    # Trasladar el resultado de pago al estado unico antes de borrar la columna
    op.execute("UPDATE pedidos SET estado = 'pagado' WHERE estado_pago = 'confirmado'")
    op.execute("UPDATE pedidos SET estado = 'cancelado' WHERE estado_pago = 'rechazado'")

    with op.batch_alter_table('pedidos', schema=None) as batch_op:
        batch_op.drop_column('estado_pago')

    with op.batch_alter_table('productos', schema=None) as batch_op:
        batch_op.add_column(sa.Column('imagen', sa.String(length=255), nullable=True))

    with op.batch_alter_table('usuarios', schema=None) as batch_op:
        batch_op.add_column(sa.Column('activo', sa.Boolean(), server_default=sa.text('true'), nullable=False))


def downgrade():
    with op.batch_alter_table('usuarios', schema=None) as batch_op:
        batch_op.drop_column('activo')

    with op.batch_alter_table('productos', schema=None) as batch_op:
        batch_op.drop_column('imagen')

    with op.batch_alter_table('pedidos', schema=None) as batch_op:
        batch_op.add_column(sa.Column('estado_pago', sa.String(length=30), server_default='pendiente', nullable=False))

    # Reconstruir estado_pago a partir del estado unico
    op.execute("UPDATE pedidos SET estado_pago = 'confirmado' WHERE estado IN ('pagado', 'enviado', 'entregado')")
    op.execute("UPDATE pedidos SET estado_pago = 'rechazado' WHERE estado = 'cancelado'")
    op.execute("UPDATE pedidos SET estado = 'pendiente'")

    with op.batch_alter_table('pedidos', schema=None) as batch_op:
        batch_op.drop_column('numero_guia')
        batch_op.drop_column('transportadora')
        batch_op.drop_column('descripcion')
        batch_op.drop_column('tipo')

    op.drop_table('historial_estados_pedido')
