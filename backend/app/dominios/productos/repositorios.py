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
    def por_referencia(referencia):
        """Busca un producto por su referencia única (RN27)."""
        return Producto.query.filter_by(referencia=referencia).first()

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


class TipoProductoRepositorio:
    """Acceso a datos de los tipos de mug (RF30)."""

    @staticmethod
    def listar():
        from app.dominios.productos.modelos import TipoProducto
        return db.session.query(TipoProducto).order_by(TipoProducto.id).all()

    @staticmethod
    def obtener(tipo_id):
        from app.dominios.productos.modelos import TipoProducto
        return db.session.get(TipoProducto, tipo_id)

    @staticmethod
    def por_nombre(nombre):
        from sqlalchemy import func
        from app.dominios.productos.modelos import TipoProducto
        return db.session.query(TipoProducto).filter(func.lower(TipoProducto.nombre) == nombre.lower()).first()

    @staticmethod
    def contar_productos(tipo_id):
        return db.session.query(Producto).filter_by(tipo_id=tipo_id).count()

    @staticmethod
    def guardar(tipo):
        db.session.add(tipo)
        db.session.commit()
        return tipo

    @staticmethod
    def eliminar(tipo):
        db.session.delete(tipo)
        db.session.commit()
