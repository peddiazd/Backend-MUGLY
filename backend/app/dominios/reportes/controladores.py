from flask import Response, jsonify, request
from marshmallow import ValidationError

from app.dominios.reportes.dtos import RangoFechasDTO
from app.dominios.reportes.servicios import ReporteServicio
from app.dominios.usuarios.controladores import admin_bp
from app.fechas import hoy_local
from app.seguridad import requiere_admin

reporte_servicio = ReporteServicio()


def _rango():
    """Lee y valida desde/hasta/agrupar; devuelve (datos, respuesta_de_error)."""
    try:
        return RangoFechasDTO().load(request.args.to_dict()), None
    except ValidationError as err:
        return None, (
            jsonify({"success": False, "error": {"message": "Período inválido.", "details": err.messages}}),
            400,
        )


def _descarga(texto, nombre):
    return Response(
        texto,
        mimetype="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{nombre}"'},
    )


@admin_bp.route("/resumen", methods=["GET"])
@requiere_admin
def resumen_admin(usuario_id):
    """Indicadores del dashboard administrativo."""
    return jsonify({"success": True, "message": "Resumen del negocio.", "data": reporte_servicio.resumen()}), 200


@admin_bp.route("/reportes/ventas", methods=["GET"])
@requiere_admin
def reporte_ventas(usuario_id):
    """Ventas, pagos, pendientes y cancelados del período, con serie y productos."""
    datos, error = _rango()
    if error:
        return error
    reporte = reporte_servicio.reporte_ventas(datos["desde"], datos["hasta"], datos["agrupar"])
    return jsonify({"success": True, "message": "Reporte de ventas.", "data": reporte}), 200


@admin_bp.route("/reportes/productos/<int:producto_id>", methods=["GET"])
@requiere_admin
def reporte_producto(usuario_id, producto_id):
    """Análisis de ventas de un producto en el período (RF33)."""
    datos, error = _rango()
    if error:
        return error
    reporte = reporte_servicio.detalle_producto(producto_id, datos["desde"], datos["hasta"], datos["agrupar"])
    return jsonify({"success": True, "message": "Análisis del producto.", "data": reporte}), 200


@admin_bp.route("/reportes/ventas.csv", methods=["GET"])
@requiere_admin
def exportar_ventas(usuario_id):
    datos, error = _rango()
    if error:
        return error
    return _descarga(reporte_servicio.csv_ventas(datos["desde"], datos["hasta"]), f"mugly-ventas-{hoy_local()}.csv")


@admin_bp.route("/reportes/pedidos.csv", methods=["GET"])
@requiere_admin
def exportar_pedidos(usuario_id):
    datos, error = _rango()
    if error:
        return error
    return _descarga(reporte_servicio.csv_pedidos(datos["desde"], datos["hasta"]), f"mugly-pedidos-{hoy_local()}.csv")


@admin_bp.route("/reportes/clientes.csv", methods=["GET"])
@requiere_admin
def exportar_clientes(usuario_id):
    return _descarga(reporte_servicio.csv_clientes(), f"mugly-clientes-{hoy_local()}.csv")
