from marshmallow import Schema, fields, validate


class RegistroUsuarioDTO(Schema):
    """DTO para validar registro de usuario."""

    correo = fields.Email(required=True)
    contrasena = fields.String(
        required=True,
        validate=validate.Length(min=6),
    )


class ActualizarPerfilDTO(Schema):
    """DTO para validar actualizacion parcial de perfil."""

    nombre = fields.String(
        load_default=None,
        validate=validate.Length(max=50),
        allow_none=True,
    )
    apellido = fields.String(
        load_default=None,
        validate=validate.Length(max=50),
        allow_none=True,
    )
    telefono = fields.String(
        load_default=None,
        validate=validate.Length(max=20),
        allow_none=True,
    )


class AdminActualizarUsuarioDTO(ActualizarPerfilDTO):
    """DTO para que el administrador edite y active/desactive clientes."""

    activo = fields.Boolean(load_default=None, allow_none=True)


class BusquedaClientesDTO(Schema):
    """Parámetros de la búsqueda paginada de clientes (vista administrativa)."""

    q = fields.String(load_default="", validate=validate.Length(max=100))
    estado = fields.String(
        load_default="todos",
        validate=validate.OneOf(["todos", "activos", "desactivados"]),
    )
    pedidos = fields.String(
        load_default="todos", validate=validate.OneOf(["todos", "con", "sin"])
    )
    registro = fields.String(
        load_default="todos", validate=validate.OneOf(["todos", "30d", "anio"])
    )
    orden = fields.String(
        load_default="recientes",
        validate=validate.OneOf(["recientes", "pedidos", "compra"]),
    )
    pagina = fields.Integer(load_default=1, validate=validate.Range(min=1))
    por_pagina = fields.Integer(
        load_default=20, validate=validate.Range(min=1, max=100)
    )
