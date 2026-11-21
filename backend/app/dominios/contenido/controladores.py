from flask import Blueprint, current_app, jsonify, request
from marshmallow import ValidationError

from app.dominios.contenido.dtos import CAMPOS, OrdenSeccionesDTO, dto_bloque
from app.dominios.contenido.servicios import ContenidoNoEncontradoError, ContenidoServicio
from app.dominios.usuarios.controladores import admin_bp
from app.seguridad import requiere_admin

contenido_bp = Blueprint("contenido", __name__)
contenido_servicio = ContenidoServicio()


def _ok(datos, mensaje, codigo=200):
    return jsonify({"success": True, "message": mensaje, "data": datos}), codigo


def _invalido(err):
    return (
        jsonify({"success": False, "error": {"message": "Datos de entrada inválidos.", "details": err.messages}}),
        400,
    )


# ============================================================ público
@contenido_bp.route("", methods=["GET"])
def contenido_publicado():
    """Contenido publicado de la tienda (lo que ven los clientes)."""
    return _ok(contenido_servicio.publico(), "Contenido de la tienda.")


# ============================================================ administración
@admin_bp.route("/contenido", methods=["GET"])
@requiere_admin
def listar_contenido(usuario_id):
    """Bloques editables con su borrador y lo publicado."""
    return _ok(contenido_servicio.listar_admin(), "Contenido de la tienda.")


@admin_bp.route("/contenido/vista-previa", methods=["GET"])
@requiere_admin
def vista_previa_contenido(usuario_id):
    """El borrador con la misma forma que el contenido público."""
    return _ok(contenido_servicio.vista_previa(), "Vista previa del borrador.")


@admin_bp.route("/contenido/<clave>", methods=["PATCH"])
@requiere_admin
def actualizar_contenido(usuario_id, clave):
    """Guarda cambios en el borrador de un bloque."""
    if clave not in CAMPOS or clave == "tienda":
        raise ContenidoNoEncontradoError(f"El bloque de contenido '{clave}' no existe.")
    try:
        cambios = dto_bloque(clave)().load(request.get_json(silent=True) or {})
    except ValidationError as err:
        return _invalido(err)
    return _ok(contenido_servicio.actualizar(clave, cambios, usuario_id), "Borrador guardado.")


@admin_bp.route("/contenido/orden", methods=["PUT"])
@requiere_admin
def ordenar_contenido(usuario_id):
    """Cambia el orden de las secciones de Inicio en el borrador."""
    try:
        datos = OrdenSeccionesDTO().load(request.get_json(silent=True) or {})
    except ValidationError as err:
        return _invalido(err)
    return _ok(contenido_servicio.ordenar(datos["orden"], usuario_id), "Orden guardado en el borrador.")


@admin_bp.route("/contenido/<clave>/imagen", methods=["POST"])
@requiere_admin
def subir_imagen_contenido(usuario_id, clave):
    """Sube la imagen de un bloque al borrador (JPG, PNG o WEBP, hasta 5 MB)."""
    datos = contenido_servicio.subir_imagen(
        clave, request.files.get("imagen"), current_app.config["UPLOAD_FOLDER"], usuario_id
    )
    return _ok(datos, "Imagen cargada en el borrador.")


@admin_bp.route("/contenido/<clave>/imagen", methods=["DELETE"])
@requiere_admin
def quitar_imagen_contenido(usuario_id, clave):
    """Quita la imagen de un bloque en el borrador."""
    return _ok(contenido_servicio.quitar_imagen(clave, usuario_id), "Imagen quitada del borrador.")


@admin_bp.route("/contenido/publicar", methods=["POST"])
@requiere_admin
def publicar_contenido(usuario_id):
    """Publica el borrador: desde ahora lo ven los clientes."""
    return _ok(contenido_servicio.publicar(usuario_id), "Cambios publicados.")


@admin_bp.route("/contenido/descartar", methods=["POST"])
@requiere_admin
def descartar_contenido(usuario_id):
    """Descarta el borrador y vuelve a lo publicado."""
    return _ok(contenido_servicio.descartar(usuario_id), "Borrador descartado.")


@admin_bp.route("/configuracion", methods=["GET"])
@requiere_admin
def obtener_configuracion(usuario_id):
    return _ok(contenido_servicio.configuracion(), "Configuración de la tienda.")


@admin_bp.route("/configuracion", methods=["PATCH"])
@requiere_admin
def actualizar_configuracion(usuario_id):
    """Actualiza nombre, WhatsApp y umbral de inventario bajo (aplica de inmediato)."""
    try:
        cambios = dto_bloque("tienda", con_visible=False)().load(request.get_json(silent=True) or {})
    except ValidationError as err:
        return _invalido(err)
    return _ok(contenido_servicio.actualizar_configuracion(cambios, usuario_id), "Configuración guardada.")
