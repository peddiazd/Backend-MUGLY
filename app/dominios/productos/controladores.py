from flask import Blueprint, jsonify, request
from marshmallow import ValidationError

from app.dominios.productos.dtos import (
    CrearProductoDTO,
    ActualizarProductoDTO,
)
from app.seguridad import requiere_admin

productos_bp = Blueprint("productos", __name__)

producto_servicio = None


@productos_bp.route("", methods=["POST"])
@requiere_admin
def crear_producto(usuario_id):
    """Crear un producto (requiere autenticación)."""
    datos = request.get_json(silent=True) or {}

    try:
        datos_validados = CrearProductoDTO().load(datos)
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

    producto = producto_servicio.crear_producto(datos_validados)

    return (
        jsonify(
            {
                "success": True,
                "message": "Producto creado con éxito.",
                "data": producto.to_dict(),
            }
        ),
        201,
    )


@productos_bp.route("", methods=["GET"])
def listar_productos():
    """Listar todos los productos (público)."""
    lista = producto_servicio.listar_todos()

    return (
        jsonify(
            {
                "success": True,
                "message": "Lista de productos.",
                "data": lista,
            }
        ),
        200,
    )


@productos_bp.route("/<int:producto_id>", methods=["GET"])
def obtener_detalle(producto_id):
    """Consultar el detalle de un producto (público)."""
    detalle = producto_servicio.obtener_detalle(producto_id)

    return (
        jsonify(
            {
                "success": True,
                "message": "Detalle del producto.",
                "data": detalle,
            }
        ),
        200,
    )


@productos_bp.route("/<int:producto_id>", methods=["PATCH"])
@requiere_admin
def actualizar_producto(usuario_id, producto_id):
    """Actualizar parcialmente un producto (requiere autenticación)."""
    datos = request.get_json(silent=True) or {}

    try:
        datos_validados = ActualizarProductoDTO().load(datos)
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

    resultado = producto_servicio.actualizar_producto(
        producto_id,
        datos_validados,
    )

    return (
        jsonify(
            {
                "success": True,
                "message": "Producto actualizado.",
                "data": resultado,
            }
        ),
        200,
    )


@productos_bp.route("/<int:producto_id>", methods=["DELETE"])
@requiere_admin
def eliminar_producto(usuario_id, producto_id):
    """Eliminar un producto (requiere autenticación)."""
    producto_servicio.eliminar_producto(producto_id)

    return "", 204
