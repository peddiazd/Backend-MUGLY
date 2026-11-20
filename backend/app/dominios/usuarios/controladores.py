from flask import Blueprint, request, jsonify
from marshmallow import ValidationError

from app.dominios.usuarios.dtos import (
    RegistroUsuarioDTO,
    ActualizarPerfilDTO,
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
    """Listar todos los usuarios del sistema (solo admin)."""
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
