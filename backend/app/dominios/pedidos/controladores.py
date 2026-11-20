
from flask import Blueprint, jsonify, request
from marshmallow import ValidationError

from app.dominios.pedidos.dtos import (
    CrearPedidoDTO,
    CambiarEstadoPedidoDTO,
    CrearPedidoPersonalizadoDTO,
)
from app.dominios.usuarios.controladores import admin_bp
from app.seguridad import requiere_token, requiere_admin


pedidos_bp = Blueprint("pedidos", __name__)

pedido_servicio = None


def _error_validacion(err):
    return (
        jsonify({
            "success": False,
            "error": {
                "message": "Datos de entrada inválidos.",
                "details": err.messages,
            },
        }),
        400,
    )


@pedidos_bp.route("", methods=["POST"])
@requiere_token
def crear_pedido(usuario_id):
    """Crear un pedido pendiente para el usuario autenticado."""
    datos = request.get_json(silent=True) or {}

    try:
        datos_validados = CrearPedidoDTO().load(datos)
    except ValidationError as err:
        return _error_validacion(err)

    pedido = pedido_servicio.crear_pedido(usuario_id, datos_validados)

    return (
        jsonify({
            "success": True,
            "message": "Pedido creado con éxito.",
            "data": pedido_servicio.obtener_pedido_usuario(
                pedido.id,
                usuario_id,
            ),
        }),
        201,
    )


@pedidos_bp.route("", methods=["GET"])
@requiere_token
def listar_pedidos(usuario_id):
    """Listar los pedidos del usuario autenticado."""
    lista = pedido_servicio.listar_pedidos_usuario(usuario_id)

    return (
        jsonify({
            "success": True,
            "message": "Lista de pedidos.",
            "data": lista,
        }),
        200,
    )


@pedidos_bp.route("/<int:pedido_id>", methods=["GET"])
@requiere_token
def obtener_pedido(usuario_id, pedido_id):
    """Consultar un pedido propio."""
    pedido = pedido_servicio.obtener_pedido_usuario(
        pedido_id,
        usuario_id,
    )

    return (
        jsonify({
            "success": True,
            "message": "Detalle del pedido.",
            "data": pedido,
        }),
        200,
    )


# ============================================================
# Rutas administrativas de pedidos
# ============================================================


@admin_bp.route("/pedidos", methods=["GET"])
@requiere_admin
def listar_todos_los_pedidos(usuario_id):
    """Consultar todos los pedidos (solo administradores)."""
    lista = pedido_servicio.listar_todos_los_pedidos()

    return (
        jsonify({
            "success": True,
            "message": "Lista de todos los pedidos.",
            "data": lista,
        }),
        200,
    )


@admin_bp.route("/pedidos/<int:pedido_id>", methods=["GET"])
@requiere_admin
def obtener_pedido_admin(usuario_id, pedido_id):
    """Consultar cualquier pedido (solo administradores)."""
    pedido = pedido_servicio.obtener_pedido_admin(pedido_id)

    return (
        jsonify({
            "success": True,
            "message": "Detalle del pedido.",
            "data": pedido,
        }),
        200,
    )


@admin_bp.route("/pedidos/<int:pedido_id>/estado", methods=["PATCH"])
@requiere_admin
def cambiar_estado_pedido(usuario_id, pedido_id):
    """
    Cambiar el estado de un pedido (solo administradores).

    Confirmar el pago (pendiente → pagado) descuenta el inventario.
    """
    datos = request.get_json(silent=True) or {}

    try:
        datos_validados = CambiarEstadoPedidoDTO().load(datos)
    except ValidationError as err:
        return _error_validacion(err)

    pedido = pedido_servicio.cambiar_estado(
        pedido_id,
        usuario_id,
        datos_validados,
    )

    return (
        jsonify({
            "success": True,
            "message": "Estado del pedido actualizado.",
            "data": pedido,
        }),
        200,
    )


@admin_bp.route("/pedidos/personalizados", methods=["POST"])
@requiere_admin
def crear_pedido_personalizado(usuario_id):
    """Registrar un pedido personalizado acordado por WhatsApp (solo admin)."""
    datos = request.get_json(silent=True) or {}

    try:
        datos_validados = CrearPedidoPersonalizadoDTO().load(datos)
    except ValidationError as err:
        return _error_validacion(err)

    pedido = pedido_servicio.crear_pedido_personalizado(
        usuario_id,
        datos_validados,
    )

    return (
        jsonify({
            "success": True,
            "message": "Pedido personalizado registrado.",
            "data": pedido,
        }),
        201,
    )
