
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
