from app import db
from app.dominios.productos.modelos import Producto


class ProductoRepositorio:
    """Capa de acceso a datos para productos."""

    @staticmethod
    def guardar(producto):
        """Guarda un producto nuevo o actualizado."""
        db.session.add(producto)
        db.session.commit()
        return producto

    @staticmethod
    def obtener_por_id(producto_id):
        """Busca un producto por su ID."""
        return db.session.get(Producto, producto_id)

    @staticmethod
    def obtener_todos():
        """Devuelve todos los productos."""
        return db.session.query(Producto).all()

    @staticmethod
    def obtener_disponibles():
        """Devuelve solo los productos disponibles para la venta."""
        return db.session.query(Producto).filter_by(disponible=True).all()

    @staticmethod
    def tiene_pedidos(producto_id):
        """Indica si el producto aparece en algun pedido."""
        from app.dominios.pedidos.modelos import DetallePedido

        return (
            db.session.query(DetallePedido.id)
            .filter_by(producto_id=producto_id)
            .first()
            is not None
        )

    @staticmethod
    def eliminar(producto):
        """Elimina un producto de la base de datos."""
        db.session.delete(producto)
        db.session.commit()
