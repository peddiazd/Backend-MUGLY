
from decimal import Decimal

from marshmallow import Schema, fields, validate


class CrearDetallePedidoDTO(Schema):
    """Valida los productos incluidos en un pedido."""

    producto_id = fields.Integer(
        required=True,
        validate=validate.Range(min=1),
    )

    cantidad = fields.Integer(
        required=True,
        validate=validate.Range(min=1),
    )


class CrearPedidoDTO(Schema):
    """Valida los datos de entrada para crear un pedido."""

    detalles = fields.List(
        fields.Nested(CrearDetallePedidoDTO),
        required=True,
        validate=validate.Length(min=1),
    )


class CambiarEstadoPedidoDTO(Schema):
    """Valida el cambio de estado que realiza el administrador."""

    estado = fields.String(
        required=True,
        validate=validate.OneOf(["pagado", "enviado", "entregado", "cancelado"]),
    )

    transportadora = fields.String(
        load_default=None,
        allow_none=True,
        validate=validate.Length(max=100),
    )

    numero_guia = fields.String(
        load_default=None,
        allow_none=True,
        validate=validate.Length(max=100),
    )


class CrearPedidoPersonalizadoDTO(Schema):
    """Valida el registro de un pedido personalizado acordado por WhatsApp."""

    usuario_id = fields.Integer(
        required=True,
        validate=validate.Range(min=1),
    )

    descripcion = fields.String(
        required=True,
        validate=validate.Length(min=1, max=2000),
    )

    total = fields.Decimal(
        required=True,
        places=2,
        validate=validate.Range(min=Decimal("0.01")),
    )
