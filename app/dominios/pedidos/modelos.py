from datetime import datetime

from app import db


class Pedido(db.Model):
    """Modelo de los pedidos realizados en MUGLY."""

    __tablename__ = "pedidos"

    id = db.Column(db.Integer, primary_key=True)

    usuario_id = db.Column(
        db.Integer,
        db.ForeignKey("usuarios.id"),
        nullable=False,
    )

    estado = db.Column(
        db.String(30),
        nullable=False,
        default="pendiente",
    )

    total = db.Column(
        db.Numeric(10, 2),
        nullable=False,
        default=0,
    )

    fecha_creacion = db.Column(
        db.DateTime,
        nullable=False,
        default=datetime.utcnow,
    )

    detalles = db.relationship(
        "DetallePedido",
        back_populates="pedido",
        cascade="all, delete-orphan",
        lazy=True,
    )


class DetallePedido(db.Model):
    """Productos incluidos en cada pedido."""

    __tablename__ = "detalles_pedido"

    id = db.Column(db.Integer, primary_key=True)

    pedido_id = db.Column(
        db.Integer,
        db.ForeignKey("pedidos.id"),
        nullable=False,
    )

    producto_id = db.Column(
        db.Integer,
        db.ForeignKey("productos.id"),
        nullable=False,
    )

    cantidad = db.Column(
        db.Integer,
        nullable=False,
    )

    precio_unitario = db.Column(
        db.Numeric(10, 2),
        nullable=False,
    )

    pedido = db.relationship(
        "Pedido",
        back_populates="detalles",
    )

    producto = db.relationship(
        "Producto",
        backref=db.backref("detalles_pedido", lazy=True),
    )