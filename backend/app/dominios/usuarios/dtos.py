from marshmallow import Schema, fields, validate

TIPOS_DOCUMENTO = ["CC", "CE", "TI", "PA"]
DOCUMENTO = validate.Regexp(r"^[0-9A-Za-z]{5,15}$", error="Escriba entre 5 y 15 dígitos o letras, sin puntos.")


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
    # Datos de envío (RF29, CR-02)
    tipo_documento = fields.String(load_default=None, allow_none=True, validate=validate.OneOf(TIPOS_DOCUMENTO))
    numero_documento = fields.String(load_default=None, allow_none=True, validate=DOCUMENTO)
    departamento = fields.String(load_default=None, allow_none=True, validate=validate.Length(max=60))
    ciudad = fields.String(load_default=None, allow_none=True, validate=validate.Length(max=60))
    direccion = fields.String(load_default=None, allow_none=True, validate=validate.Length(max=120))
    complemento = fields.String(load_default=None, allow_none=True, validate=validate.Length(max=80))


class AdminActualizarUsuarioDTO(ActualizarPerfilDTO):
    """DTO para que el administrador edite y active/desactive clientes."""

    activo = fields.Boolean(load_default=None, allow_none=True)
    correo = fields.Email(load_default=None, allow_none=True)


class AdminCrearClienteDTO(Schema):
    """Cliente creado por el administrador (compra por WhatsApp sin registrarse). RF29."""

    correo = fields.Email(required=True)
    nombre = fields.String(required=True, validate=validate.Length(min=1, max=50))
    apellido = fields.String(required=True, validate=validate.Length(min=1, max=50))
    telefono = fields.String(required=True, validate=validate.Length(min=7, max=20))
    tipo_documento = fields.String(required=True, validate=validate.OneOf(TIPOS_DOCUMENTO))
    numero_documento = fields.String(required=True, validate=DOCUMENTO)
    departamento = fields.String(required=True, validate=validate.Length(min=1, max=60))
    ciudad = fields.String(required=True, validate=validate.Length(min=1, max=60))
    direccion = fields.String(required=True, validate=validate.Length(min=1, max=120))
    complemento = fields.String(load_default=None, allow_none=True, validate=validate.Length(max=80))


class EnlaceAccesoDTO(Schema):
    """Enlace de un solo uso para crear (activar) o restablecer la contraseña."""

    tipo = fields.String(load_default="restablecer", validate=validate.OneOf(["activar", "restablecer"]))


class RestablecerContrasenaDTO(Schema):
    token = fields.String(required=True)
    contrasena = fields.String(required=True, validate=validate.Length(min=6))


class CambiarContrasenaDTO(Schema):
    actual = fields.String(required=True)
    nueva = fields.String(required=True, validate=validate.Length(min=6))


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
    ciudad = fields.String(load_default="", validate=validate.Length(max=60))
    orden = fields.String(
        load_default="recientes",
        validate=validate.OneOf(["recientes", "pedidos", "compra"]),
    )
    pagina = fields.Integer(load_default=1, validate=validate.Range(min=1))
    por_pagina = fields.Integer(
        load_default=20, validate=validate.Range(min=1, max=100)
    )
