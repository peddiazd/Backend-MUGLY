
"""
Configuracion de pruebas y fixtures compartidos.
"""

import os

# Estas variables deben definirse antes de importar la aplicacion.
os.environ["FLASK_TESTING"] = "true"
os.environ["SECRET_KEY"] = "test-key-for-pytest"
os.environ["JWT_EXP_MINUTES"] = "15"

import json
import uuid

import pytest

from app import crear_app, db as _db


@pytest.fixture(scope="session")
def app():
    app = crear_app()

    with app.app_context():
        _db.create_all()
        yield app
        _db.drop_all()


@pytest.fixture
def client(app):
    return app.test_client()


@pytest.fixture
def db(app):
    return _db


@pytest.fixture
def usuario_auth(client):
    email = f"auth-{uuid.uuid4().hex[:8]}@ejemplo.com"

    client.post(
        "/api/v1/usuarios/registro",
        json={"correo": email, "contrasena": "123456"},
    )

    resp = client.post(
        "/api/v1/usuarios/login",
        json={"correo": email, "contrasena": "123456"},
    )

    datos = json.loads(resp.data)
    token = datos["data"]["access_token"]

    return {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
    }
