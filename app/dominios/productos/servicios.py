from app.dominios.productos.modelos import Producto
from app.dominios.productos.repositorios import ProductoRepositorio


class ProductoNoEncontradoError(Exception):
    """Error cuando un producto no existe."""


class ProductoServicio:
    """Lógica de negocio para los productos de MUGLY."""

    def crear_producto(self, datos):
        """Crea un producto nuevo."""
        producto = Producto(
            nombre=datos["nombre"],
            descripcion=datos["descripcion"],
            precio=datos["precio"],
            disponible=datos.get("disponible", True),
        )

        return ProductoRepositorio.guardar(producto)

    def listar_todos(self):
        """Devuelve todos los productos."""
        productos = ProductoRepositorio.obtener_todos()
        return [producto.to_dict() for producto in productos]

    def obtener_detalle(self, producto_id):
        """Obtiene un producto por su ID."""
        producto = ProductoRepositorio.obtener_por_id(producto_id)

        if producto is None:
            raise ProductoNoEncontradoError(
                f"Producto con ID {producto_id} no encontrado."
            )

        return producto.to_dict()

    def actualizar_producto(self, producto_id, datos):
        """Actualiza parcialmente un producto."""
        producto = ProductoRepositorio.obtener_por_id(producto_id)

        if producto is None:
            raise ProductoNoEncontradoError(
                f"Producto con ID {producto_id} no encontrado."
            )

        for campo in ("nombre", "descripcion", "precio", "disponible"):
            if datos.get(campo) is not None:
                setattr(producto, campo, datos[campo])

        ProductoRepositorio.guardar(producto)
        return producto.to_dict()

    def eliminar_producto(self, producto_id):
        """Elimina un producto existente."""
        producto = ProductoRepositorio.obtener_por_id(producto_id)

        if producto is None:
            raise ProductoNoEncontradoError(
                f"Producto con ID {producto_id} no encontrado."
            )

        ProductoRepositorio.eliminar(producto)
