
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
    def buscar(q="", estado="todos", tipo="todos", inicio=None, fin=None):
        """Pedidos con el correo del cliente, filtrados en la base.

        q acepta un número de pedido (con o sin #) o parte del correo.
        inicio/fin son datetimes UTC del rango [inicio, fin).
        """
        from app.dominios.usuarios.modelos import Usuario

        consulta = (
            db.session.query(Pedido, Usuario.correo)
            .join(Usuario, Usuario.id == Pedido.usuario_id)
        )
        texto = (q or "").strip()
        if texto:
            if texto.lstrip("#").isdigit():
                consulta = consulta.filter(Pedido.id == int(texto.lstrip("#")))
            else:
                consulta = consulta.filter(Usuario.correo.ilike(f"%{texto}%"))
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
    def contar_por_estado():
        """Número de pedidos en cada estado (para los filtros del panel)."""
        from sqlalchemy import func

        return dict(
            db.session.query(Pedido.estado, func.count(Pedido.id))
            .group_by(Pedido.estado)
            .all()
        )
