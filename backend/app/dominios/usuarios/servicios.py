import hashlib
import secrets
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


class EnlaceInvalidoError(Exception):
    """El enlace de acceso venció, ya se usó o no es válido."""


class ContrasenaActualIncorrectaError(Exception):
    """La contraseña actual no coincide."""


CAMPOS_PERFIL = ("nombre", "apellido", "telefono", "tipo_documento", "numero_documento",
                 "departamento", "ciudad", "direccion", "complemento")
# Vigencia de los enlaces de acceso (CR-02): restablecer 30 min, activar 7 días
VIGENCIA_ENLACE = {"restablecer": timedelta(minutes=30), "activar": timedelta(days=7)}


def _huella(usuario):
    """Cambia cuando cambia la contraseña: hace que el enlace sirva una sola vez."""
    return hashlib.sha256(usuario.contrasena.encode()).hexdigest()[:16]


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

        for campo in CAMPOS_PERFIL[2:]:
            if datos.get(campo) is not None:
                setattr(perfil, campo, datos[campo])

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

        # Ficha comercial: pedidos del cliente y su resumen de compra.
        from app.dominios.pedidos.modelos import ESTADOS_CONFIRMADOS
        from app.dominios.pedidos.repositorios import PedidoRepositorio

        pedidos = sorted(
            PedidoRepositorio.obtener_por_usuario(usuario_id),
            key=lambda p: p.id,
            reverse=True,
        )
        datos["pedidos"] = [
            {
                "id": p.id,
                "estado": p.estado,
                "tipo": p.tipo,
                "total": float(p.total),
                "fecha_creacion": p.fecha_creacion.isoformat() if p.fecha_creacion else None,
            }
            for p in pedidos
        ]
        datos["resumen"] = {
            "pedidos": len(pedidos),
            "compra_confirmada": float(sum(p.total for p in pedidos if p.estado in ESTADOS_CONFIRMADOS)),
            "pendiente_de_pago": float(sum(p.total for p in pedidos if p.estado == "pendiente")),
        }
        return datos

    def buscar_clientes(self, parametros):
        """Búsqueda paginada de clientes; nunca devuelve contraseñas."""
        from app.paginacion import paginar

        consulta = UsuarioRepositorio.buscar_clientes(
            q=parametros["q"],
            estado=parametros["estado"],
            pedidos=parametros["pedidos"],
            registro=parametros["registro"],
            orden=parametros["orden"],
            ciudad=parametros.get("ciudad", ""),
        )
        filas, meta = paginar(consulta, parametros["pagina"], parametros["por_pagina"])
        items = []
        for usuario, perfil, num_pedidos, compra in filas:
            item = usuario.to_dict()
            item.update(
                nombre=perfil.nombre if perfil else None,
                apellido=perfil.apellido if perfil else None,
                telefono=perfil.telefono if perfil else None,
                tipo_documento=perfil.tipo_documento if perfil else None,
                numero_documento=perfil.numero_documento if perfil else None,
                ciudad=perfil.ciudad if perfil else None,
                pedidos=int(num_pedidos or 0),
                compra_confirmada=float(compra or 0),
            )
            items.append(item)
        return {"items": items, **meta}

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

        correo = (datos.get("correo") or "").strip().lower()
        if correo and correo != usuario.correo:
            existente = UsuarioRepositorio.obtener_por_correo(correo)
            if existente and existente.id != usuario.id:
                raise CorreoYaRegistradoError(f"El correo {correo} ya está registrado.")
            usuario.correo = correo

        perfil = usuario.perfil or PerfilUsuario(usuario_id=usuario.id)

        for campo in CAMPOS_PERFIL:
            if datos.get(campo) is not None:
                setattr(perfil, campo, datos[campo])

        UsuarioRepositorio.guardar_perfil(perfil)
        return self.obtener_usuario_admin(usuario_id)

    # ---------------------------------------------------------- CR-02
    def crear_cliente_admin(self, datos):
        """El administrador registra un cliente que compra por WhatsApp (RF29).

        La cuenta nace sin contraseña conocida; se entrega un enlace de
        activación para que el cliente cree la suya.
        """
        correo = datos["correo"].strip().lower()
        if UsuarioRepositorio.obtener_por_correo(correo):
            raise CorreoYaRegistradoError(f"El correo {correo} ya está registrado.")
        usuario = Usuario(correo=correo, contrasena=generate_password_hash(secrets.token_urlsafe(32)))
        UsuarioRepositorio.guardar_usuario(usuario)
        perfil = PerfilUsuario(usuario_id=usuario.id, **{c: datos.get(c) for c in CAMPOS_PERFIL})
        UsuarioRepositorio.guardar_perfil(perfil)
        resultado = self.obtener_usuario_admin(usuario.id)
        resultado["enlace"] = self.generar_enlace_acceso(usuario.id, "activar")
        return resultado

    def eliminar_cliente_admin(self, admin_id, usuario_id):
        """Elimina un cliente sin pedidos. Con pedidos solo se desactiva (RN24, RNF04)."""
        usuario = UsuarioRepositorio.obtener_por_id(usuario_id)
        if not usuario:
            raise UsuarioNoEncontradoError(f"Usuario con ID {usuario_id} no encontrado.")
        if usuario.rol == "admin" or usuario.id == admin_id:
            raise OperacionNoPermitidaError("No se puede eliminar una cuenta de administrador.")
        n = UsuarioRepositorio.contar_pedidos(usuario_id)
        if n:
            raise OperacionNoPermitidaError(
                f"El cliente tiene {n} pedido(s): sus datos se conservan por el historial. Desactive la cuenta."
            )
        UsuarioRepositorio.eliminar_usuario(usuario)

    def generar_enlace_acceso(self, usuario_id, tipo="restablecer"):
        """Token firmado de un solo uso para crear o restablecer la contraseña."""
        usuario = UsuarioRepositorio.obtener_por_id(usuario_id)
        if not usuario:
            raise UsuarioNoEncontradoError(f"Usuario con ID {usuario_id} no encontrado.")
        vence = datetime.now(timezone.utc) + VIGENCIA_ENLACE[tipo]
        token = jwt.encode(
            {"sub": str(usuario.id), "uso": "acceso", "tipo": tipo, "fp": _huella(usuario), "exp": vence},
            self.secret_key, algorithm="HS256",
        )
        return {"token": token, "tipo": tipo, "vence": vence.isoformat()}

    def restablecer_contrasena(self, token, contrasena):
        """El cliente crea o cambia su contraseña con el enlace (pantalla pública)."""
        try:
            datos = jwt.decode(token, self.secret_key, algorithms=["HS256"])
        except jwt.PyJWTError:
            raise EnlaceInvalidoError("El enlace venció o no es válido. Pide uno nuevo a la tienda.")
        if datos.get("uso") != "acceso":
            raise EnlaceInvalidoError("El enlace no es válido.")
        usuario = UsuarioRepositorio.obtener_por_id(int(datos["sub"]))
        if not usuario or datos.get("fp") != _huella(usuario):
            raise EnlaceInvalidoError("El enlace ya se usó. Pide uno nuevo a la tienda.")
        usuario.contrasena = generate_password_hash(contrasena)
        UsuarioRepositorio.actualizar_usuario()
        return {"correo": usuario.correo}

    def cambiar_contrasena(self, usuario_id, actual, nueva):
        """Cambio de contraseña del usuario autenticado (Mi cuenta)."""
        usuario = UsuarioRepositorio.obtener_por_id(usuario_id)
        if not usuario:
            raise UsuarioNoEncontradoError("Usuario no encontrado.")
        if not check_password_hash(usuario.contrasena, actual):
            raise ContrasenaActualIncorrectaError("La contraseña actual no es correcta.")
        if actual == nueva:
            raise OperacionNoPermitidaError("La nueva contraseña debe ser distinta de la actual.")
        usuario.contrasena = generate_password_hash(nueva)
        UsuarioRepositorio.actualizar_usuario()

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
