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
    def eliminar(producto):
        """Elimina un producto de la base de datos."""
        db.session.delete(producto)
        db.session.commit()
