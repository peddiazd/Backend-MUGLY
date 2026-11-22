from flask import Blueprint, request, jsonify
from marshmallow import ValidationError

from app.dominios.usuarios.dtos import (
    BusquedaClientesDTO,
    RegistroUsuarioDTO,
    ActualizarPerfilDTO,
    AdminActualizarUsuarioDTO,
    AdminCrearClienteDTO,
    EnlaceAccesoDTO,
    RestablecerContrasenaDTO,
    CambiarContrasenaDTO,
)
from app.seguridad import requiere_token, requiere_admin

usuarios_bp = Blueprint("usuarios", __name__)
admin_bp = Blueprint("admin", __name__)

# El app factory asigna el servicio al crear la aplicación.
usuario_servicio = None


@usuarios_bp.route("/registro", methods=["POST"])
def registro():
    datos = request.get_json(silent=True) or {}
    dto = RegistroUsuarioDTO()

    try:
        datos_validados = dto.load(datos)
    except ValidationError as err:
        return (
            jsonify(
                {
                    "success": False,
                    "error": {
                        "message": "Datos de entrada inválidos.",
                        "details": err.messages,
                    },
                }
            ),
            400,
        )

    usuario = usuario_servicio.registrar_usuario(datos_validados)

    return (
        jsonify(
            {
                "success": True,
                "message": "Usuario creado con éxito.",
                "data": {
                    "id": usuario.id,
                    "correo": usuario.correo,
                },
            }
        ),
        201,
    )


@usuarios_bp.route("/login", methods=["POST"])
def login():
    datos = request.get_json(silent=True) or {}

    if not datos.get("correo") or not datos.get("contrasena"):
        return (
            jsonify(
                {
                    "success": False,
                    "error": {
                        "message": "Correo y contraseña son obligatorios.",
                    },
                }
            ),
            400,
        )

    resultado = usuario_servicio.iniciar_sesion(datos)

    return (
        jsonify(
            {
                "success": True,
                "message": "Inicio de sesión exitoso.",
                "data": resultado,
            }
        ),
        200,
    )


@usuarios_bp.route("/perfil", methods=["GET"])
@requiere_token
def obtener_perfil(usuario_id):
    """Obtener el perfil del usuario autenticado."""
    perfil = usuario_servicio.obtener_perfil(usuario_id)

    return (
        jsonify(
            {
                "success": True,
                "message": "Perfil obtenido.",
                "data": perfil,
            }
        ),
        200,
    )


@usuarios_bp.route("/perfil", methods=["PATCH"])
@requiere_token
def actualizar_perfil(usuario_id):
    datos = request.get_json(silent=True) or {}
    dto = ActualizarPerfilDTO()

    try:
        datos_validados = dto.load(datos)
    except ValidationError as err:
        return (
            jsonify(
                {
                    "success": False,
                    "error": {
                        "message": "Datos de entrada inválidos.",
                        "details": err.messages,
                    },
                }
            ),
            400,
        )

    perfil = usuario_servicio.actualizar_perfil(
        usuario_id,
        datos_validados,
    )

    return (
        jsonify(
            {
                "success": True,
                "message": "Perfil actualizado.",
                "data": perfil,
            }
        ),
        200,
    )


# ============================================================
# Blueprint de administración
# ============================================================


@admin_bp.route("/usuarios", methods=["GET"])
@requiere_admin
def listar_usuarios(usuario_id):
    """Listar usuarios (solo admin).

    Sin parámetros devuelve la lista completa (compatibilidad). Con parámetros
    (q, estado, pedidos, registro, orden, pagina, por_pagina) hace la búsqueda
    paginada de clientes en el servidor.
    """
    if request.args:
        try:
            parametros = BusquedaClientesDTO().load(request.args.to_dict())
        except ValidationError as err:
            return (
                jsonify({"success": False, "error": {"message": "Parámetros de búsqueda inválidos.", "details": err.messages}}),
                400,
            )
        return (
            jsonify({"success": True, "message": "Búsqueda de clientes.", "data": usuario_servicio.buscar_clientes(parametros)}),
            200,
        )

    lista = usuario_servicio.listar_todos_los_usuarios()

    return (
        jsonify(
            {
                "success": True,
                "message": "Lista de usuarios.",
                "data": lista,
            }
        ),
        200,
    )


@admin_bp.route("/usuarios/<int:cliente_id>", methods=["GET"])
@requiere_admin
def obtener_usuario(usuario_id, cliente_id):
    """Consultar un usuario con su perfil (solo admin)."""
    datos = usuario_servicio.obtener_usuario_admin(cliente_id)

    return (
        jsonify({"success": True, "message": "Detalle del usuario.", "data": datos}),
        200,
    )


@admin_bp.route("/usuarios/<int:cliente_id>", methods=["PATCH"])
@requiere_admin
def actualizar_usuario(usuario_id, cliente_id):
    """Editar el perfil de un usuario y activarlo o desactivarlo (solo admin)."""
    datos = request.get_json(silent=True) or {}

    try:
        datos_validados = AdminActualizarUsuarioDTO().load(datos)
    except ValidationError as err:
        return (
            jsonify(
                {
                    "success": False,
                    "error": {
                        "message": "Datos de entrada inválidos.",
                        "details": err.messages,
                    },
                }
            ),
            400,
        )

    resultado = usuario_servicio.actualizar_usuario_admin(
        usuario_id,
        cliente_id,
        datos_validados,
    )

    return (
        jsonify({"success": True, "message": "Usuario actualizado.", "data": resultado}),
        200,
    )


# ============================================================
# CR-02 (v1.3.0): clientes desde el panel y enlaces de acceso
# ============================================================


def _ok(datos, mensaje, codigo=200):
    return jsonify({"success": True, "message": mensaje, "data": datos}), codigo


def _invalido(err):
    return jsonify({"success": False, "error": {"message": "Datos de entrada inválidos.", "details": err.messages}}), 400


@admin_bp.route("/usuarios", methods=["POST"])
@requiere_admin
def crear_cliente(usuario_id):
    """Registrar un cliente que compra por WhatsApp (RF29)."""
    try:
        datos = AdminCrearClienteDTO().load(request.get_json(silent=True) or {})
    except ValidationError as err:
        return _invalido(err)
    return _ok(usuario_servicio.crear_cliente_admin(datos), "Cliente creado.", 201)


@admin_bp.route("/usuarios/<int:cliente_id>", methods=["DELETE"])
@requiere_admin
def eliminar_cliente(usuario_id, cliente_id):
    """Eliminar un cliente sin pedidos (RN24)."""
    usuario_servicio.eliminar_cliente_admin(usuario_id, cliente_id)
    return "", 204


@admin_bp.route("/usuarios/<int:cliente_id>/enlace-acceso", methods=["POST"])
@requiere_admin
def enlace_acceso(usuario_id, cliente_id):
    """Enlace de un solo uso para crear o restablecer la contraseña del cliente."""
    try:
        datos = EnlaceAccesoDTO().load(request.get_json(silent=True) or {})
    except ValidationError as err:
        return _invalido(err)
    return _ok(usuario_servicio.generar_enlace_acceso(cliente_id, datos["tipo"]), "Enlace generado.", 201)


@usuarios_bp.route("/restablecer-contrasena", methods=["POST"])
def restablecer_contrasena():
    """Pantalla pública del enlace: el cliente crea o cambia su contraseña."""
    try:
        datos = RestablecerContrasenaDTO().load(request.get_json(silent=True) or {})
    except ValidationError as err:
        return _invalido(err)
    return _ok(usuario_servicio.restablecer_contrasena(datos["token"], datos["contrasena"]), "Contraseña guardada.")


@usuarios_bp.route("/contrasena", methods=["PATCH"])
@requiere_token
def cambiar_contrasena(usuario_id):
    """Cambio de contraseña del usuario autenticado."""
    try:
        datos = CambiarContrasenaDTO().load(request.get_json(silent=True) or {})
    except ValidationError as err:
        return _invalido(err)
    usuario_servicio.cambiar_contrasena(usuario_id, datos["actual"], datos["nueva"])
    return _ok(None, "Contraseña actualizada.")
