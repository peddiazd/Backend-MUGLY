from datetime import datetime, timedelta, timezone

import jwt
from werkzeug.security import generate_password_hash, check_password_hash

from app.dominios.usuarios.modelos import Usuario, PerfilUsuario
from app.dominios.usuarios.repositorios import UsuarioRepositorio


class CorreoYaRegistradoError(Exception):
    pass


class CredencialesInvalidasError(Exception):
    pass


class UsuarioNoEncontradoError(Exception):
    pass


class PermisoDenegadoError(Exception):
    pass


class CuentaDesactivadaError(Exception):
    """La cuenta fue desactivada por un administrador."""


class OperacionNoPermitidaError(Exception):
    """La operacion solicitada no esta permitida."""


def _generar_access_token(usuario, secret_key, exp_minutes):
    ahora = datetime.now(timezone.utc)

    payload = {
        "sub": str(usuario.id),
        "iat": ahora,
        "exp": ahora + timedelta(minutes=exp_minutes),
    }

    token = jwt.encode(payload, secret_key, algorithm="HS256")
    return token


class UsuarioServicio:
    def __init__(self, secret_key, jwt_exp_minutes):
        self.secret_key = secret_key
        self.jwt_exp_minutes = jwt_exp_minutes

    def registrar_usuario(self, datos):
        correo = datos["correo"]

        existente = UsuarioRepositorio.obtener_por_correo(correo)
        if existente:
            raise CorreoYaRegistradoError(f"El correo {correo} ya está registrado.")

        contrasena_hash = generate_password_hash(datos["contrasena"])
        usuario = Usuario(correo=correo, contrasena=contrasena_hash)

        UsuarioRepositorio.guardar_usuario(usuario)

        perfil = PerfilUsuario(usuario_id=usuario.id)
        UsuarioRepositorio.guardar_perfil(perfil)

        return usuario

    def iniciar_sesion(self, datos):
        correo = datos.get("correo")
        contrasena = datos.get("contrasena")

        if not correo or not contrasena:
            raise CredencialesInvalidasError("Correo y contraseña son obligatorios.")

        usuario = UsuarioRepositorio.obtener_por_correo(correo)

        if not usuario or not check_password_hash(usuario.contrasena, contrasena):
            raise CredencialesInvalidasError("Credenciales inválidas.")

        if not usuario.activo:
            raise CuentaDesactivadaError(
                "La cuenta está desactivada. Contacte al administrador."
            )

        access_token = _generar_access_token(
            usuario,
            self.secret_key,
            self.jwt_exp_minutes,
        )

        return {
            "access_token": access_token,
            "usuario": usuario.to_dict(),
        }

    def obtener_perfil(self, usuario_id):
        perfil = UsuarioRepositorio.obtener_perfil_por_usuario_id(usuario_id)

        if not perfil:
            raise UsuarioNoEncontradoError("Perfil no encontrado.")

        return perfil.to_dict()

    def actualizar_perfil(self, usuario_id, datos):
        perfil = UsuarioRepositorio.obtener_perfil_por_usuario_id(usuario_id)

        if not perfil:
            perfil = PerfilUsuario(usuario_id=usuario_id)

        if datos.get("nombre") is not None:
            perfil.nombre = datos["nombre"]

        if datos.get("apellido") is not None:
            perfil.apellido = datos["apellido"]

        if datos.get("telefono") is not None:
            perfil.telefono = datos["telefono"]

        UsuarioRepositorio.guardar_perfil(perfil)
        return perfil.to_dict()

    def listar_todos_los_usuarios(self):
        """Devuelve todos los usuarios sin datos sensibles."""
        usuarios = UsuarioRepositorio.listar_todos()
        return [usuario.to_dict() for usuario in usuarios]

    def obtener_usuario_admin(self, usuario_id):
        """Devuelve un usuario con su perfil (vista administrativa)."""
        usuario = UsuarioRepositorio.obtener_por_id(usuario_id)

        if not usuario:
            raise UsuarioNoEncontradoError(
                f"Usuario con ID {usuario_id} no encontrado."
            )

        datos = usuario.to_dict()
        datos["perfil"] = usuario.perfil.to_dict() if usuario.perfil else None
        return datos

    def actualizar_usuario_admin(self, admin_id, usuario_id, datos):
        """Permite al administrador editar el perfil y activar o desactivar."""
        usuario = UsuarioRepositorio.obtener_por_id(usuario_id)

        if not usuario:
            raise UsuarioNoEncontradoError(
                f"Usuario con ID {usuario_id} no encontrado."
            )

        # Evita que el administrador se bloquee a si mismo.
        if datos.get("activo") is False and usuario.id == admin_id:
            raise OperacionNoPermitidaError(
                "No puede desactivar su propia cuenta."
            )

        if datos.get("activo") is not None:
            usuario.activo = datos["activo"]

        perfil = usuario.perfil or PerfilUsuario(usuario_id=usuario.id)

        for campo in ("nombre", "apellido", "telefono"):
            if datos.get(campo) is not None:
                setattr(perfil, campo, datos[campo])

        UsuarioRepositorio.guardar_perfil(perfil)
        return self.obtener_usuario_admin(usuario_id)

    def promover_a_admin(self, correo):
        """Promueve un usuario existente al rol de administrador."""
        usuario = UsuarioRepositorio.obtener_por_correo(correo)

        if not usuario:
            raise UsuarioNoEncontradoError(
                f"No se encontro ningun usuario con correo {correo}."
            )

        usuario.rol = "admin"
        UsuarioRepositorio.actualizar_usuario()

        return usuario
