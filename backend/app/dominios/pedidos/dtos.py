
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

    # Datos acordados por WhatsApp (RF31, CR-02)
    cantidad = fields.Integer(load_default=1, validate=validate.Range(min=1, max=1000))
    mug_base = fields.String(load_default=None, allow_none=True, validate=validate.Length(max=40))
    transportadora_acordada = fields.String(load_default=None, allow_none=True, validate=validate.Length(max=100))
    entrega_acordada = fields.Date(load_default=None, allow_none=True)
    pagado = fields.Boolean(load_default=False)


class BusquedaPedidosDTO(Schema):
    """Parámetros de la búsqueda paginada de pedidos (vista administrativa)."""

    q = fields.String(load_default="", validate=validate.Length(max=100))
    estado = fields.String(
        load_default="todos",
        validate=validate.OneOf(["todos", "pendiente", "pagado", "enviado", "entregado", "cancelado", "reembolsado"]),
    )
    # CR-02: varios estados separados por coma, vista activos/archivo, ciudad y tipo de mug
    estados = fields.String(load_default="", validate=validate.Regexp(r"^[a-z,]*$"))
    vista = fields.String(load_default="todos", validate=validate.OneOf(["todos", "activos", "archivo"]))
    ciudad = fields.String(load_default="", validate=validate.Length(max=60))
    tipo_mug = fields.Integer(load_default=None, allow_none=True)
    tipo = fields.String(
        load_default="todos", validate=validate.OneOf(["todos", "catalogo", "personalizado"])
    )
    desde = fields.Date(load_default=None)
    hasta = fields.Date(load_default=None)
    pagina = fields.Integer(load_default=1, validate=validate.Range(min=1))
    por_pagina = fields.Integer(load_default=20, validate=validate.Range(min=1, max=100))


class ArchivoPedidoDTO(Schema):
    archivado = fields.Boolean(required=True)


class ReembolsoDTO(Schema):
    """Reembolso o devolución (RF32, RN22)."""

    tipo = fields.String(required=True, validate=validate.OneOf(["reembolso", "devolucion"]))
    monto = fields.Decimal(load_default=None, allow_none=True, places=2, validate=validate.Range(min=Decimal("0.01")))
    motivo = fields.String(required=True, validate=validate.Length(min=1, max=120))
    detalle = fields.String(load_default=None, allow_none=True, validate=validate.Length(max=1000))
    reingresar = fields.Boolean(load_default=False)
