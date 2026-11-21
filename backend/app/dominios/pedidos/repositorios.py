
from app import db
from app.dominios.pedidos.modelos import Pedido, DetallePedido


class PedidoRepositorio:
    """Capa de acceso a datos para pedidos."""

    @staticmethod
    def guardar(pedido):
        """Guarda un pedido nuevo o actualizado."""
        db.session.add(pedido)
        db.session.commit()
        return pedido

    @staticmethod
    def obtener_por_id(pedido_id):
        """Busca un pedido por su ID."""
        return db.session.get(Pedido, pedido_id)

    @staticmethod
    def obtener_todos():
        """Devuelve todos los pedidos."""
        return db.session.query(Pedido).all()

    @staticmethod
    def obtener_por_usuario(usuario_id):
        """Devuelve los pedidos de un usuario."""
        return (
            db.session.query(Pedido)
            .filter_by(usuario_id=usuario_id)
            .all()
        )

    @staticmethod
    def guardar_detalle(detalle):
        """Guarda un detalle de pedido."""
        db.session.add(detalle)
        db.session.commit()
        return detalle

    @staticmethod
    def buscar(q="", estado="todos", tipo="todos", inicio=None, fin=None,
               estados=None, vista="todos", ciudad="", tipo_mug=None):
        """Pedidos con los datos del cliente, filtrados en la base.

        q acepta número de pedido, documento, nombre, apellido, correo o
        referencia de producto. inicio/fin son datetimes UTC [inicio, fin).
        """
        from sqlalchemy import or_, select
        from app.dominios.productos.modelos import Producto
        from app.dominios.usuarios.modelos import PerfilUsuario, Usuario

        consulta = (
            db.session.query(Pedido, Usuario.correo, PerfilUsuario)
            .join(Usuario, Usuario.id == Pedido.usuario_id)
            .outerjoin(PerfilUsuario, PerfilUsuario.usuario_id == Usuario.id)
        )
        texto = (q or "").strip().lstrip("#")
        if texto:
            patron = f"%{texto}%"
            con_ref = select(DetallePedido.pedido_id).join(Producto, Producto.id == DetallePedido.producto_id).filter(Producto.referencia.ilike(patron))
            condiciones = [
                Usuario.correo.ilike(patron), PerfilUsuario.nombre.ilike(patron), PerfilUsuario.apellido.ilike(patron),
                (PerfilUsuario.nombre + " " + PerfilUsuario.apellido).ilike(patron),
                PerfilUsuario.numero_documento.ilike(patron), Pedido.id.in_(con_ref),
            ]
            if texto.isdigit():
                # Un número es un pedido o un documento, no parte de un correo
                condiciones = [Pedido.id == int(texto), PerfilUsuario.numero_documento.ilike(patron)]
            consulta = consulta.filter(or_(*condiciones))
        if estados:
            consulta = consulta.filter(Pedido.estado.in_(estados))
        if vista == "activos":
            consulta = consulta.filter(Pedido.archivado.is_(False))
        elif vista == "archivo":
            consulta = consulta.filter(Pedido.archivado.is_(True))
        if ciudad:
            consulta = consulta.filter(Pedido.envio_ciudad == ciudad)
        if tipo_mug:
            con_tipo = select(DetallePedido.pedido_id).join(Producto, Producto.id == DetallePedido.producto_id).filter(Producto.tipo_id == tipo_mug)
            consulta = consulta.filter(Pedido.id.in_(con_tipo))
        if estado != "todos":
            consulta = consulta.filter(Pedido.estado == estado)
        if tipo != "todos":
            consulta = consulta.filter(Pedido.tipo == tipo)
        if inicio is not None:
            consulta = consulta.filter(Pedido.fecha_creacion >= inicio)
        if fin is not None:
            consulta = consulta.filter(Pedido.fecha_creacion < fin)
        return consulta.order_by(Pedido.id.desc())

    @staticmethod
    def contar_por_estado(vista="todos"):
        """Número de pedidos en cada estado (para los filtros del panel)."""
        from sqlalchemy import func

        consulta = db.session.query(Pedido.estado, func.count(Pedido.id))
        if vista == "activos":
            consulta = consulta.filter(Pedido.archivado.is_(False))
        elif vista == "archivo":
            consulta = consulta.filter(Pedido.archivado.is_(True))
        return dict(consulta.group_by(Pedido.estado).all())

    @staticmethod
    def contar_archivo():
        from sqlalchemy import func
        return dict(db.session.query(Pedido.archivado, func.count(Pedido.id)).group_by(Pedido.archivado).all())

    @staticmethod
    def cerrados_activos():
        from app.dominios.pedidos.modelos import ESTADOS_CERRADOS
        return db.session.query(Pedido).filter(Pedido.estado.in_(ESTADOS_CERRADOS), Pedido.archivado.is_(False)).all()

    @staticmethod
    def ciudades():
        return [c for (c,) in db.session.query(Pedido.envio_ciudad).filter(Pedido.envio_ciudad.isnot(None)).distinct().order_by(Pedido.envio_ciudad).all()]
