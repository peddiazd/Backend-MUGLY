
from flask import Flask, send_from_directory
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from flask_migrate import Migrate

from app.config import Config

# Version de la API
API_VERSION = "v1"

# Extensiones
db = SQLAlchemy()
migrate = Migrate()


def crear_app():
    """Crea y configura la aplicación Flask."""
    app = Flask(__name__)
    app.config.from_object(Config)

    # Inicializar extensiones
    db.init_app(app)
    migrate.init_app(app, db)

    # Registrar modelos de pedidos
    from app.dominios.pedidos.modelos import (  # noqa: F401
        Pedido,
        DetallePedido,
        HistorialEstadoPedido,
    )

    CORS(
        app,
        origins=app.config["CORS_ALLOWED_ORIGINS"]
        or [
            "http://localhost:3000",
            "http://localhost:5173",
        ],
    )

    # Registrar modulo de usuarios
    from app.dominios.usuarios import controladores as usuarios_ctrl
    from app.dominios.usuarios.servicios import UsuarioServicio

    usuarios_ctrl.usuario_servicio = UsuarioServicio(
        secret_key=app.config["SECRET_KEY"],
        jwt_exp_minutes=app.config.get("JWT_EXP_MINUTES", 15),
    )

    app.register_blueprint(
        usuarios_ctrl.usuarios_bp,
        url_prefix=f"/api/{API_VERSION}/usuarios",
    )

    # Registrar modulo de productos
    from app.dominios.productos import controladores as productos_ctrl
    from app.dominios.productos.servicios import (
        ProductoServicio,
        ProductoNoEncontradoError,
        ImagenInvalidaError,
    )

    productos_ctrl.producto_servicio = ProductoServicio()

    app.register_blueprint(
        productos_ctrl.productos_bp,
        url_prefix=f"/api/{API_VERSION}/productos",
    )

    # Registrar modulo de pedidos
    # Se importa antes de registrar admin_bp porque agrega
    # una ruta al blueprint administrativo.
    from app.dominios.pedidos import controladores as pedidos_ctrl
    from app.dominios.pedidos.servicios import PedidoServicio

    pedidos_ctrl.pedido_servicio = PedidoServicio()

    app.register_blueprint(
        pedidos_ctrl.pedidos_bp,
        url_prefix=f"/api/{API_VERSION}/pedidos",
    )

    # Contenido de la tienda y reportes: agregan rutas al blueprint
    # administrativo, por eso se importan antes de registrarlo.
    from app.dominios.contenido.modelos import ContenidoBloque  # noqa: F401
    from app.dominios.contenido import controladores as contenido_ctrl
    from app.dominios.reportes import controladores as reportes_ctrl  # noqa: F401

    app.register_blueprint(
        contenido_ctrl.contenido_bp,
        url_prefix=f"/api/{API_VERSION}/contenido",
    )

    # Registrar blueprint administrativo DESPUES de importar pedidos
    from app.dominios.usuarios.controladores import admin_bp

    app.register_blueprint(
        admin_bp,
        url_prefix=f"/api/{API_VERSION}/admin",
    )

    # Endpoint de salud
    @app.route("/health", methods=["GET"])
    def health():
        return {
            "status": "ok",
            "service": "mugly-api",
            "version": API_VERSION,
        }, 200

    # Imagenes de productos (ADR-006)
    @app.route("/uploads/<path:nombre>", methods=["GET"])
    def servir_imagen(nombre):
        return send_from_directory(app.config["UPLOAD_FOLDER"], nombre)

    # Manejadores globales de error
    @app.errorhandler(413)
    def archivo_muy_grande(error):
        return {
            "success": False,
            "error": {"message": "El archivo supera el tamaño máximo de 5 MB."},
        }, 413

    @app.errorhandler(404)
    def recurso_no_encontrado(error):
        return {
            "success": False,
            "error": {"message": "Recurso no encontrado"},
        }, 404

    @app.errorhandler(500)
    def error_interno(error):
        return {
            "success": False,
            "error": {"message": "Error interno del servidor"},
        }, 500

    # Errores propios del modulo de usuarios
    from app.dominios.usuarios.servicios import (
        CorreoYaRegistradoError,
        CredencialesInvalidasError,
        UsuarioNoEncontradoError,
        PermisoDenegadoError,
        CuentaDesactivadaError,
        OperacionNoPermitidaError,
    )

    @app.errorhandler(CuentaDesactivadaError)
    def cuenta_desactivada(error):
        return {
            "success": False,
            "error": {"message": str(error)},
        }, 403

    @app.errorhandler(OperacionNoPermitidaError)
    def operacion_no_permitida(error):
        return {
            "success": False,
            "error": {"message": str(error)},
        }, 400

    @app.errorhandler(CorreoYaRegistradoError)
    def correo_duplicado(error):
        return {
            "success": False,
            "error": {"message": str(error)},
        }, 400

    @app.errorhandler(CredencialesInvalidasError)
    def credenciales_invalidas(error):
        return {
            "success": False,
            "error": {"message": str(error)},
        }, 401

    @app.errorhandler(UsuarioNoEncontradoError)
    def usuario_no_encontrado(error):
        return {
            "success": False,
            "error": {"message": str(error)},
        }, 404

    @app.errorhandler(PermisoDenegadoError)
    def permiso_denegado(error):
        return {
            "success": False,
            "error": {"message": str(error)},
        }, 403

    # Errores propios del modulo de productos
    @app.errorhandler(ProductoNoEncontradoError)
    def producto_no_encontrado(error):
        return {
            "success": False,
            "error": {"message": str(error)},
        }, 404

    @app.errorhandler(ImagenInvalidaError)
    def imagen_invalida(error):
        return {
            "success": False,
            "error": {"message": str(error)},
        }, 400

    # Errores propios del modulo de pedidos
    from app.dominios.pedidos.servicios import (
        PedidoNoEncontradoError,
        ProductoPedidoNoDisponibleError,
        TransicionEstadoInvalidaError,
        DatosEnvioRequeridosError,
    )

    @app.errorhandler(PedidoNoEncontradoError)
    def pedido_no_encontrado(error):
        return {
            "success": False,
            "error": {"message": str(error)},
        }, 404

    @app.errorhandler(ProductoPedidoNoDisponibleError)
    def producto_pedido_no_disponible(error):
        return {
            "success": False,
            "error": {"message": str(error)},
        }, 400

    @app.errorhandler(TransicionEstadoInvalidaError)
    def transicion_invalida(error):
        return {
            "success": False,
            "error": {"message": str(error)},
        }, 400

    @app.errorhandler(DatosEnvioRequeridosError)
    def datos_envio_requeridos(error):
        return {
            "success": False,
            "error": {"message": str(error)},
        }, 400

    # Errores propios del modulo de contenido
    from app.dominios.contenido.servicios import (
        ContenidoNoEncontradoError,
        ContenidoInvalidoError,
    )

    @app.errorhandler(ContenidoNoEncontradoError)
    def contenido_no_encontrado(error):
        return {"success": False, "error": {"message": str(error)}}, 404

    @app.errorhandler(ContenidoInvalidoError)
    def contenido_invalido(error):
        return {"success": False, "error": {"message": str(error)}}, 400

    return app
