
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
