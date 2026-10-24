"""
Promueve un usuario existente al rol de administrador.

Uso:
python scripts/promover_admin.py correo@ejemplo.com
"""

import sys
import os

sys.path.insert(
    0,
    os.path.abspath(os.path.join(os.path.dirname(__file__), "..")),
)

from app import crear_app
from app.dominios.usuarios.servicios import (
    UsuarioServicio,
    UsuarioNoEncontradoError,
)


def promover_admin(correo, secret_key, jwt_exp_minutes):
    servicio = UsuarioServicio(
        secret_key=secret_key,
        jwt_exp_minutes=jwt_exp_minutes,
    )

    servicio.promover_a_admin(correo)

    print(f"Exito: el usuario '{correo}' ahora tiene rol de administrador.")


if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Uso: python scripts/promover_admin.py <correo>")
        sys.exit(1)

    app = crear_app()

    with app.app_context():
        try:
            promover_admin(
                correo=sys.argv[1],
                secret_key=app.config["SECRET_KEY"],
                jwt_exp_minutes=app.config.get("JWT_EXP_MINUTES", 15),
            )
        except UsuarioNoEncontradoError as error:
            print(f"Error: {error}")
            sys.exit(1)
