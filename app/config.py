import os
from pathlib import Path

from dotenv import load_dotenv

# Ruta raiz del proyecto
BASE_DIR = Path(__file__).resolve().parent.parent

# Cargar variables del archivo .env
load_dotenv(BASE_DIR / ".env")


class Config:
    SECRET_KEY = os.getenv("SECRET_KEY")

    DB_USER = os.getenv("DB_USER")
    DB_PASSWORD = os.getenv("DB_PASSWORD", "")
    DB_HOST = os.getenv("DB_HOST", "localhost")
    DB_PORT = os.getenv("DB_PORT", "3306")
    DB_NAME = os.getenv("DB_NAME", "mugly_db")
    DB_CHARSET = os.getenv("DB_CHARSET", "utf8mb4")

    SQLALCHEMY_DATABASE_URI = (
        f"mysql+pymysql://{DB_USER}:{DB_PASSWORD}"
        f"@{DB_HOST}:{DB_PORT}/{DB_NAME}?charset={DB_CHARSET}"
    )

    SQLALCHEMY_TRACK_MODIFICATIONS = False

    CORS_ALLOWED_ORIGINS = os.getenv("CORS_ALLOWED_ORIGINS", "")

    # Configuracion especial para pruebas automatizadas
    if os.getenv("FLASK_TESTING", "").lower() == "true":
        TESTING = True
        SECRET_KEY = os.getenv("SECRET_KEY", "test-key-for-pytest")
        JWT_EXP_MINUTES = int(os.getenv("JWT_EXP_MINUTES", "15"))
        SQLALCHEMY_DATABASE_URI = "sqlite:///:memory:"
