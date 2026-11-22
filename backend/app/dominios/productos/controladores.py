from flask import Blueprint, jsonify, request, current_app
from marshmallow import ValidationError

from app.dominios.productos.dtos import (
    CrearProductoDTO,
    ActualizarProductoDTO,
    TipoProductoDTO,
)
from app.dominios.productos.servicios import TipoProductoServicio
from app.dominios.usuarios.controladores import admin_bp
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
    """Catálogo público: solo productos disponibles."""
    lista = producto_servicio.listar_disponibles()

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
    """Consultar el detalle de un producto disponible (público)."""
    detalle = producto_servicio.obtener_detalle(
        producto_id,
        solo_disponibles=True,
    )

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
    """Eliminar un producto, o retirarlo si ya tiene pedidos (solo admin)."""
    retirado = producto_servicio.eliminar_producto(
        producto_id,
        current_app.config["UPLOAD_FOLDER"],
    )

    if retirado is None:
        return "", 204

    return (
        jsonify(
            {
                "success": True,
                "message": (
                    "El producto tiene pedidos asociados: se retiró del "
                    "catálogo en lugar de eliminarse."
                ),
                "data": retirado,
            }
        ),
        200,
    )


@productos_bp.route("/<int:producto_id>/imagen", methods=["POST"])
@requiere_admin
def subir_imagen(usuario_id, producto_id):
    """Subir o reemplazar la foto de un producto (solo admin)."""
    producto = producto_servicio.guardar_imagen(
        producto_id,
        request.files.get("imagen"),
        current_app.config["UPLOAD_FOLDER"],
    )

    return (
        jsonify(
            {
                "success": True,
                "message": "Imagen actualizada.",
                "data": producto,
            }
        ),
        200,
    )


@admin_bp.route("/productos", methods=["GET"])
@requiere_admin
def listar_productos_admin(usuario_id):
    """Listar todos los productos, incluidos los no disponibles (solo admin)."""
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


# ============================================================
# Tipos de mug (RF30, CR-02)
# ============================================================
tipo_servicio = TipoProductoServicio()


def _tipo_datos():
    return TipoProductoDTO().load(request.get_json(silent=True) or {})


def _invalido(err):
    return jsonify({"success": False, "error": {"message": "Datos de entrada inválidos.", "details": err.messages}}), 400


@admin_bp.route("/tipos-producto", methods=["GET"])
@requiere_admin
def listar_tipos(usuario_id):
    return jsonify({"success": True, "message": "Tipos de mug.", "data": tipo_servicio.listar()}), 200


@admin_bp.route("/tipos-producto", methods=["POST"])
@requiere_admin
def crear_tipo(usuario_id):
    try:
        datos = _tipo_datos()
    except ValidationError as err:
        return _invalido(err)
    return jsonify({"success": True, "message": "Tipo creado.", "data": tipo_servicio.crear(datos)}), 201


@admin_bp.route("/tipos-producto/<int:tipo_id>", methods=["PATCH"])
@requiere_admin
def editar_tipo(usuario_id, tipo_id):
    try:
        datos = _tipo_datos()
    except ValidationError as err:
        return _invalido(err)
    return jsonify({"success": True, "message": "Tipo actualizado.", "data": tipo_servicio.actualizar(tipo_id, datos)}), 200


@admin_bp.route("/tipos-producto/<int:tipo_id>", methods=["DELETE"])
@requiere_admin
def eliminar_tipo(usuario_id, tipo_id):
    tipo_servicio.eliminar(tipo_id)
    return "", 204
