
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
    CORS(app, origins=app.config["CORS_ALLOWED_ORIGINS"] or [
        "http://localhost:3000",
        "http://localhost:5173",
    ])

    # Endpoint de salud (público, sin autenticación)
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

    return app
