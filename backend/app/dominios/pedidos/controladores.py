
from flask import Blueprint, jsonify, request
from marshmallow import ValidationError

from app.dominios.pedidos.dtos import CrearPedidoDTO
from app.dominios.pedidos.servicios import (
    PedidoServicio,
    PedidoNoEncontradoError,
    ProductoPedidoNoDisponibleError,
    PedidoPagoYaProcesadoError,
    ResultadoPagoInvalidoError,
)
from app.dominios.usuarios.controladores import admin_bp
from app.seguridad import requiere_token, requiere_admin


pedidos_bp = Blueprint("pedidos", __name__)

pedido_servicio = None


@pedidos_bp.route("", methods=["POST"])
@requiere_token
def crear_pedido(usuario_id):
    """Crear un pedido para el usuario autenticado."""
    datos = request.get_json(silent=True) or {}

    try:
        datos_validados = CrearPedidoDTO().load(datos)
    except ValidationError as err:
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

    try:
        pedido = pedido_servicio.crear_pedido(
            usuario_id,
            datos_validados,
        )
    except ProductoPedidoNoDisponibleError as err:
        return (
            jsonify({
                "success": False,
                "error": {"message": str(err)},
            }),
            400,
        )

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


@pedidos_bp.route(
    "/<int:pedido_id>/resultado-pago",
    methods=["POST"],
)
@requiere_token
def registrar_resultado_pago(usuario_id, pedido_id):
    """
    Registrar el resultado del pago de un pedido propio.

    Esta ruta es provisional: no sustituye la verificación
    de autenticidad que deberá realizar la futura pasarela.
    """
    pedido = pedido_servicio.obtener_pedido_usuario(
        pedido_id,
        usuario_id,
    )

    datos = request.get_json(silent=True) or {}
    resultado = datos.get("resultado")

    try:
        pedido_actualizado = pedido_servicio.registrar_resultado_pago(
            pedido["id"],
            resultado,
        )
    except PedidoPagoYaProcesadoError as err:
        return (
            jsonify({
                "success": False,
                "error": {"message": str(err)},
            }),
            400,
        )
    except ResultadoPagoInvalidoError as err:
        return (
            jsonify({
                "success": False,
                "error": {"message": str(err)},
            }),
            400,
        )
    except ProductoPedidoNoDisponibleError as err:
        return (
            jsonify({
                "success": False,
                "error": {"message": str(err)},
            }),
            400,
        )

    return (
        jsonify({
            "success": True,
            "message": "Resultado del pago registrado.",
            "data": pedido_actualizado,
        }),
        200,
    )


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
