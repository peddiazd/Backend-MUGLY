
from decimal import Decimal

from marshmallow import Schema, fields, validate

REFERENCIA = validate.Regexp(r"^[A-Za-z0-9-]{2,30}$", error="Use letras, números y guiones (2 a 30).")


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

    cantidad_stock = fields.Integer(
        load_default=0,
        validate=validate.Range(min=0),
    )

    # RF30 (CR-02): referencia única y tipo de mug
    referencia = fields.String(load_default=None, allow_none=True, validate=REFERENCIA)
    tipo_id = fields.Integer(load_default=None, allow_none=True, validate=validate.Range(min=1))


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

    cantidad_stock = fields.Integer(
        load_default=None,
        validate=validate.Range(min=0),
        allow_none=True,
    )

    referencia = fields.String(load_default=None, allow_none=True, validate=REFERENCIA)
    tipo_id = fields.Integer(load_default=None, allow_none=True, validate=validate.Range(min=1))


class TipoProductoDTO(Schema):
    """Crear o editar un tipo de mug (RF30)."""

    nombre = fields.String(required=True, validate=validate.Length(min=1, max=40))
    descripcion = fields.String(load_default=None, allow_none=True, validate=validate.Length(max=120))
