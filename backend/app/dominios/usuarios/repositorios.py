from datetime import datetime, timedelta

from sqlalchemy import case, func, or_

from app import db
from app.dominios.usuarios.modelos import Usuario, PerfilUsuario


class UsuarioRepositorio:
    """Capa de acceso a datos para usuarios y perfiles."""

    @staticmethod
    def guardar_usuario(usuario):
        db.session.add(usuario)
        db.session.commit()
        return usuario

    @staticmethod
    def obtener_por_correo(correo):
        return db.session.query(Usuario).filter_by(correo=correo).first()

    @staticmethod
    def obtener_por_id(usuario_id):
        return db.session.get(Usuario, usuario_id)

    @staticmethod
    def obtener_perfil_por_usuario_id(usuario_id):
        return db.session.query(PerfilUsuario).filter_by(usuario_id=usuario_id).first()

    @staticmethod
    def guardar_perfil(perfil):
        db.session.add(perfil)
        db.session.commit()
        return perfil

    @staticmethod
    def listar_todos():
        """Consulta todos los usuarios registrados."""
        return db.session.query(Usuario).all()

    @staticmethod
    def actualizar_usuario():
        """Guarda los cambios realizados a un usuario."""
        db.session.commit()

    @staticmethod
    def buscar_clientes(q="", estado="todos", pedidos="todos", registro="todos", orden="recientes"):
        """Consulta de clientes con su número de pedidos y su compra confirmada.

        Filtra y ordena en la base (no en el navegador) para que escale con
        muchos clientes; la paginación se aplica con app.paginacion.
        """
        from app.dominios.pedidos.modelos import Pedido, ESTADOS_CONFIRMADOS

        resumen = (
            db.session.query(
                Pedido.usuario_id.label("uid"),
                func.count(Pedido.id).label("n"),
                func.sum(
                    case((Pedido.estado.in_(ESTADOS_CONFIRMADOS), Pedido.total), else_=0)
                ).label("compra"),
            )
            .group_by(Pedido.usuario_id)
            .subquery()
        )
        num_pedidos = func.coalesce(resumen.c.n, 0)
        compra = func.coalesce(resumen.c.compra, 0)

        consulta = (
            db.session.query(Usuario, PerfilUsuario, num_pedidos.label("pedidos"), compra.label("compra"))
            .outerjoin(PerfilUsuario, PerfilUsuario.usuario_id == Usuario.id)
            .outerjoin(resumen, resumen.c.uid == Usuario.id)
            .filter(Usuario.rol == "usuario")
        )

        texto = (q or "").strip()
        if texto:
            patron = f"%{texto}%"
            condiciones = [
                Usuario.correo.ilike(patron),
                PerfilUsuario.nombre.ilike(patron),
                PerfilUsuario.apellido.ilike(patron),
                PerfilUsuario.telefono.ilike(patron),
                (PerfilUsuario.nombre + " " + PerfilUsuario.apellido).ilike(patron),
            ]
            if texto.lstrip("#").isdigit():
                condiciones.append(Usuario.id == int(texto.lstrip("#")))
            consulta = consulta.filter(or_(*condiciones))

        if estado == "activos":
            consulta = consulta.filter(Usuario.activo.is_(True))
        elif estado == "desactivados":
            consulta = consulta.filter(Usuario.activo.is_(False))

        if pedidos == "con":
            consulta = consulta.filter(resumen.c.n.isnot(None))
        elif pedidos == "sin":
            consulta = consulta.filter(resumen.c.n.is_(None))

        ahora = datetime.utcnow()
        if registro == "30d":
            consulta = consulta.filter(Usuario.fecha_creacion >= ahora - timedelta(days=30))
        elif registro == "anio":
            consulta = consulta.filter(Usuario.fecha_creacion >= datetime(ahora.year, 1, 1))

        if orden == "pedidos":
            consulta = consulta.order_by(num_pedidos.desc(), Usuario.id.desc())
        elif orden == "compra":
            consulta = consulta.order_by(compra.desc(), Usuario.id.desc())
        else:
            consulta = consulta.order_by(Usuario.fecha_creacion.desc(), Usuario.id.desc())

        return consulta
