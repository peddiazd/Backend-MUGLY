
from datetime import datetime

from app import db


# Ciclo de vida del pedido (MGL-REU-003, D1/D2; ADR-004)
ESTADOS_PEDIDO = ("pendiente", "pagado", "enviado", "entregado", "cancelado", "reembolsado")
TIPOS_PEDIDO = ("catalogo", "personalizado")
# Pedidos con pago confirmado por el administrador (un pagado no puede
# cancelarse: TRANSICIONES en servicios.py). Base de las ventas confirmadas.
ESTADOS_CONFIRMADOS = ("pagado", "enviado", "entregado")
# Pedidos que se pagaron alguna vez: base de las ventas confirmadas en los
# reportes (RN23). Los reembolsos se restan aparte para obtener ventas netas.
ESTADOS_VENDIDOS = ESTADOS_CONFIRMADOS + ("reembolsado",)
# Pedidos cerrados: los únicos que se pueden archivar (RN25).
ESTADOS_CERRADOS = ("entregado", "cancelado", "reembolsado")


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

    # catalogo: compra desde el catalogo; personalizado: acordado por WhatsApp
    tipo = db.Column(
        db.String(20),
        nullable=False,
        default="catalogo",
        server_default="catalogo",
    )

    # Descripcion del mug personalizado acordado con el cliente
    descripcion = db.Column(db.Text, nullable=True)

    # Informacion de envio (RF19, RF20)
    transportadora = db.Column(db.String(100), nullable=True)
    numero_guia = db.Column(db.String(100), nullable=True)

    total = db.Column(
        db.Numeric(10, 2),
        nullable=False,
        default=0,
    )

    # Dirección de envío copiada del perfil al crear el pedido (RF31)
    envio_departamento = db.Column(db.String(60), nullable=True)
    envio_ciudad = db.Column(db.String(60), nullable=True)
    envio_direccion = db.Column(db.String(120), nullable=True)
    envio_complemento = db.Column(db.String(80), nullable=True)

    # Archivo de pedidos cerrados (RF31, RN25): no cambia el estado
    archivado = db.Column(db.Boolean, nullable=False, default=False, server_default=db.false())

    # Datos acordados por WhatsApp para pedidos personalizados (RF31)
    cantidad_personalizado = db.Column(db.Integer, nullable=True)
    mug_base = db.Column(db.String(40), nullable=True)
    transportadora_acordada = db.Column(db.String(100), nullable=True)
    entrega_acordada = db.Column(db.Date, nullable=True)

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

    historial = db.relationship(
        "HistorialEstadoPedido",
        back_populates="pedido",
        cascade="all, delete-orphan",
        order_by="HistorialEstadoPedido.id",
        lazy=True,
    )

    reembolsos = db.relationship(
        "ReembolsoPedido",
        back_populates="pedido",
        cascade="all, delete-orphan",
        order_by="ReembolsoPedido.id",
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


class HistorialEstadoPedido(db.Model):
    """Registro de cada cambio de estado de un pedido (ADR-004, riesgo R7)."""

    __tablename__ = "historial_estados_pedido"

    id = db.Column(db.Integer, primary_key=True)

    pedido_id = db.Column(
        db.Integer,
        db.ForeignKey("pedidos.id"),
        nullable=False,
    )

    estado = db.Column(db.String(30), nullable=False)

    fecha = db.Column(
        db.DateTime,
        nullable=False,
        default=datetime.utcnow,
    )

    usuario_id = db.Column(
        db.Integer,
        db.ForeignKey("usuarios.id"),
        nullable=False,
    )

    pedido = db.relationship("Pedido", back_populates="historial")


class ReembolsoPedido(db.Model):
    """Reembolso o devolución registrada por el administrador (RF32, RN22).

    MUGLY no mueve dinero: el pago se devuelve por fuera (WhatsApp) y aquí
    queda el registro.
    """

    __tablename__ = "reembolsos_pedido"

    id = db.Column(db.Integer, primary_key=True)
    pedido_id = db.Column(db.Integer, db.ForeignKey("pedidos.id"), nullable=False)
    tipo = db.Column(db.String(20), nullable=False)  # reembolso | devolucion
    monto = db.Column(db.Numeric(10, 2), nullable=False)
    motivo = db.Column(db.String(120), nullable=False)
    detalle = db.Column(db.Text, nullable=True)
    unidades_reingresadas = db.Column(db.Integer, nullable=False, default=0)
    usuario_id = db.Column(db.Integer, db.ForeignKey("usuarios.id"), nullable=False)
    fecha = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)

    pedido = db.relationship("Pedido", back_populates="reembolsos")
