"""CR-02 (v1.3.0): datos de envío, referencia y tipos de mug, archivo y reembolsos

Revision ID: c7e3a1d9f204
Revises: b4f2c8a91d3e
Create Date: 2026-11-21

- perfiles: documento y dirección de envío (RF29)
- tipos_producto + productos.referencia/tipo_id (RF30, RN26, RN27)
- pedidos: dirección de envío, archivado y datos acordados del personalizado (RF31)
- reembolsos_pedido (RF32, RN22)
"""
from alembic import op
import sqlalchemy as sa


revision = "c7e3a1d9f204"
down_revision = "b4f2c8a91d3e"
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table("perfiles") as t:
        t.add_column(sa.Column("tipo_documento", sa.String(4), nullable=True))
        t.add_column(sa.Column("numero_documento", sa.String(20), nullable=True))
        t.add_column(sa.Column("departamento", sa.String(60), nullable=True))
        t.add_column(sa.Column("ciudad", sa.String(60), nullable=True))
        t.add_column(sa.Column("direccion", sa.String(120), nullable=True))
        t.add_column(sa.Column("complemento", sa.String(80), nullable=True))

    tipos = op.create_table(
        "tipos_producto",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("nombre", sa.String(40), nullable=False, unique=True),
        sa.Column("descripcion", sa.String(120), nullable=True),
    )
    op.bulk_insert(tipos, [
        {"id": 1, "nombre": "Clásico", "descripcion": "Mug de cerámica tradicional"},
        {"id": 2, "nombre": "Mágico", "descripcion": "Revela el diseño con bebidas calientes"},
    ])

    with op.batch_alter_table("productos") as t:
        t.add_column(sa.Column("referencia", sa.String(30), nullable=True))
        t.add_column(sa.Column("tipo_id", sa.Integer(), nullable=True))
        t.create_unique_constraint("uq_productos_referencia", ["referencia"])
        t.create_foreign_key("fk_productos_tipo", "tipos_producto", ["tipo_id"], ["id"])
    # Productos existentes: tipo Clásico y referencia MG-<id>
    op.execute("UPDATE productos SET tipo_id = 1 WHERE tipo_id IS NULL")
    op.execute("UPDATE productos SET referencia = CONCAT('MG-', LPAD(id, 3, '0')) WHERE referencia IS NULL")

    with op.batch_alter_table("pedidos") as t:
        t.add_column(sa.Column("envio_departamento", sa.String(60), nullable=True))
        t.add_column(sa.Column("envio_ciudad", sa.String(60), nullable=True))
        t.add_column(sa.Column("envio_direccion", sa.String(120), nullable=True))
        t.add_column(sa.Column("envio_complemento", sa.String(80), nullable=True))
        t.add_column(sa.Column("archivado", sa.Boolean(), nullable=False, server_default=sa.false()))
        t.add_column(sa.Column("cantidad_personalizado", sa.Integer(), nullable=True))
        t.add_column(sa.Column("mug_base", sa.String(40), nullable=True))
        t.add_column(sa.Column("transportadora_acordada", sa.String(100), nullable=True))
        t.add_column(sa.Column("entrega_acordada", sa.Date(), nullable=True))

    op.create_table(
        "reembolsos_pedido",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("pedido_id", sa.Integer(), sa.ForeignKey("pedidos.id"), nullable=False),
        sa.Column("tipo", sa.String(20), nullable=False),
        sa.Column("monto", sa.Numeric(10, 2), nullable=False),
        sa.Column("motivo", sa.String(120), nullable=False),
        sa.Column("detalle", sa.Text(), nullable=True),
        sa.Column("unidades_reingresadas", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("usuario_id", sa.Integer(), sa.ForeignKey("usuarios.id"), nullable=False),
        sa.Column("fecha", sa.DateTime(), nullable=False),
    )


def downgrade():
    op.drop_table("reembolsos_pedido")
    with op.batch_alter_table("pedidos") as t:
        for c in ("entrega_acordada", "transportadora_acordada", "mug_base", "cantidad_personalizado",
                  "archivado", "envio_complemento", "envio_direccion", "envio_ciudad", "envio_departamento"):
            t.drop_column(c)
    with op.batch_alter_table("productos") as t:
        t.drop_constraint("fk_productos_tipo", type_="foreignkey")
        t.drop_constraint("uq_productos_referencia", type_="unique")
        t.drop_column("tipo_id")
        t.drop_column("referencia")
    op.drop_table("tipos_producto")
    with op.batch_alter_table("perfiles") as t:
        for c in ("complemento", "direccion", "ciudad", "departamento", "numero_documento", "tipo_documento"):
            t.drop_column(c)
