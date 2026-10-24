from flask import Flask
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

    CORS(
        app,
        origins=app.config["CORS_ALLOWED_ORIGINS"]
        or [
            "http://localhost:3000",
            "http://localhost:5173",
        ],
    )

    # Registrar modulos de usuarios y administracion
    from app.dominios.usuarios.controladores import (
        usuarios_bp,
        admin_bp,
    )
    from app.dominios.usuarios.servicios import UsuarioServicio
    from app.dominios.usuarios import controladores as usuarios_ctrl

    usuarios_ctrl.usuario_servicio = UsuarioServicio(
        secret_key=app.config["SECRET_KEY"],
        jwt_exp_minutes=app.config.get("JWT_EXP_MINUTES", 15),
    )

    app.register_blueprint(
        usuarios_bp,
        url_prefix=f"/api/{API_VERSION}/usuarios",
    )

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

    # Manejadores globales de error
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
    )

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

    return app
