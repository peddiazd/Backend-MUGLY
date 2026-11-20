from functools import wraps

import jwt
from flask import request, jsonify, current_app


def _extraer_y_validar_token():
    """Extrae y valida el token JWT."""
    auth_header = request.headers.get("Authorization")

    if not auth_header:
        return None, (
            jsonify(
                {"success": False, "error": {"message": "Token no proporcionado."}}
            ),
            401,
        )

    partes = auth_header.split()

    if len(partes) != 2 or partes[0].lower() != "bearer":
        return None, (
            jsonify(
                {
                    "success": False,
                    "error": {
                        "message": "Formato de token invalido. Use: Bearer <token>"
                    },
                }
            ),
            401,
        )

    token = partes[1]

    try:
        payload = jwt.decode(
            token,
            current_app.config["SECRET_KEY"],
            algorithms=["HS256"],
        )
        return int(payload["sub"]), None

    except jwt.ExpiredSignatureError:
        return None, (
            jsonify({"success": False, "error": {"message": "Token expirado."}}),
            401,
        )

    except jwt.InvalidTokenError:
        return None, (
            jsonify({"success": False, "error": {"message": "Token invalido."}}),
            401,
        )


def requiere_token(f):
    """Exige un token JWT valido."""

    @wraps(f)
    def wrapper(*args, **kwargs):
        usuario_id, error = _extraer_y_validar_token()

        if error:
            return error

        return f(*args, usuario_id=usuario_id, **kwargs)

    return wrapper


def requiere_admin(f):
    """Exige un token valido y el rol de administrador."""

    @wraps(f)
    def wrapper(*args, **kwargs):
        usuario_id, error = _extraer_y_validar_token()

        if error:
            return error

        from app.dominios.usuarios.repositorios import UsuarioRepositorio
        from app.dominios.usuarios.servicios import PermisoDenegadoError

        usuario = UsuarioRepositorio.obtener_por_id(usuario_id)

        if not usuario or usuario.rol != "admin":
            raise PermisoDenegadoError(
                "Permiso denegado. Se requiere rol de administrador."
            )

        return f(*args, usuario_id=usuario_id, **kwargs)

    return wrapper
