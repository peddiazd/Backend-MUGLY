"""contenido administrable de la tienda

Crea la tabla contenido_bloques: secciones de Inicio, página Nosotros y
configuración de la tienda, cada una con borrador y versión publicada.
El contenido inicial lo crea el servicio la primera vez que se consulta.

Revision ID: b4f2c8a91d3e
Revises: 9ed994615ffd
Create Date: 2026-11-21 10:00:00
"""
from alembic import op
import sqlalchemy as sa


revision = 'b4f2c8a91d3e'
down_revision = '9ed994615ffd'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'contenido_bloques',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('clave', sa.String(length=40), nullable=False),
        sa.Column('borrador', sa.JSON(), nullable=False),
        sa.Column('publicado', sa.JSON(), nullable=False),
        sa.Column('actualizado_en', sa.DateTime(), nullable=False),
        sa.Column('actualizado_por', sa.Integer(), nullable=True),
        sa.Column('publicado_en', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['actualizado_por'], ['usuarios.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('clave'),
    )


def downgrade():
    op.drop_table('contenido_bloques')
