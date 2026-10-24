from decimal import Decimal

from marshmallow import Schema, fields, validate


class CrearProductoDTO(Schema):
    """DTO para validar la creación de un producto."""

    nombre = fields.String(
        required=True,
        validate=validate.Length(min=1),
    )

    descripcion = fields.String(
        required=True,
        validate=validate.Length(min=1),
    )

    precio = fields.Decimal(
        required=True,
        validate=validate.Range(min=Decimal("0.01")),
    )

    disponible = fields.Boolean(load_default=True)


class ActualizarProductoDTO(Schema):
    """DTO para validar la actualización parcial de un producto."""

    nombre = fields.String(
        load_default=None,
        validate=validate.Length(min=1),
        allow_none=True,
    )

    descripcion = fields.String(
        load_default=None,
        validate=validate.Length(min=1),
        allow_none=True,
    )

    precio = fields.Decimal(
        load_default=None,
        validate=validate.Range(min=Decimal("0.01")),
        allow_none=True,
    )

    disponible = fields.Boolean(
        load_default=None,
        allow_none=True,
    )
