
from flask import Blueprint, jsonify, request
from marshmallow import ValidationError

from app.dominios.pedidos.dtos import (
    BusquedaPedidosDTO,
    CrearPedidoDTO,
    CambiarEstadoPedidoDTO,
    CrearPedidoPersonalizadoDTO,
    ArchivoPedidoDTO,
    ReembolsoDTO,
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
    """Consultar pedidos (solo administradores).

    Sin parámetros devuelve todos (compatibilidad). Con parámetros
    (q, estado, tipo, desde, hasta, pagina, por_pagina) busca y pagina.
    """
    if request.args:
        try:
            parametros = BusquedaPedidosDTO().load(request.args.to_dict())
        except ValidationError as err:
            return (
                jsonify({"success": False, "error": {"message": "Parámetros de búsqueda inválidos.", "details": err.messages}}),
                400,
            )
        return (
            jsonify({"success": True, "message": "Búsqueda de pedidos.", "data": pedido_servicio.buscar_pedidos(parametros)}),
            200,
        )

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


# ============================================================
# CR-02: archivo y reembolsos
# ============================================================


@admin_bp.route("/pedidos/<int:pedido_id>/archivo", methods=["PATCH"])
@requiere_admin
def archivar_pedido(usuario_id, pedido_id):
    """Archivar o restaurar un pedido cerrado (RN25)."""
    try:
        datos = ArchivoPedidoDTO().load(request.get_json(silent=True) or {})
    except ValidationError as err:
        return _error_validacion(err)
    pedido = pedido_servicio.archivar(pedido_id, datos["archivado"])
    return jsonify({"success": True, "message": "Pedido archivado." if datos["archivado"] else "Pedido restaurado.", "data": pedido}), 200


@admin_bp.route("/pedidos/archivar-cerrados", methods=["POST"])
@requiere_admin
def archivar_cerrados(usuario_id):
    """Archivar de una vez todos los pedidos cerrados."""
    return jsonify({"success": True, "message": "Pedidos archivados.", "data": pedido_servicio.archivar_cerrados()}), 200


@admin_bp.route("/pedidos/<int:pedido_id>/reembolsos", methods=["POST"])
@requiere_admin
def reembolsar_pedido(usuario_id, pedido_id):
    """Registrar un reembolso o devolución (RF32, RN22)."""
    try:
        datos = ReembolsoDTO().load(request.get_json(silent=True) or {})
    except ValidationError as err:
        return _error_validacion(err)
    pedido = pedido_servicio.reembolsar(pedido_id, usuario_id, datos)
    return jsonify({"success": True, "message": "Reembolso registrado.", "data": pedido}), 201
