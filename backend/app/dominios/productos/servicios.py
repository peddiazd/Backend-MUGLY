
import os

from app.archivos import EXTENSIONES_IMAGEN, ImagenInvalidaError, guardar_imagen  # noqa: F401
from app.dominios.productos.modelos import Producto
from app.dominios.productos.modelos import TipoProducto
from app.dominios.productos.repositorios import ProductoRepositorio, TipoProductoRepositorio


class ProductoNoEncontradoError(Exception):
    """Error cuando un producto no existe."""


class DatoDuplicadoError(Exception):
    """Referencia o nombre de tipo ya usado (RN27)."""


class TipoEnUsoError(Exception):
    """Un tipo de mug con productos no se puede eliminar (RN26)."""


def _validar_producto(datos, producto_id=None):
    """Referencia única (RN27) y tipo existente."""
    ref = (datos.get("referencia") or "").strip().upper() or None
    if ref:
        otro = ProductoRepositorio.por_referencia(ref)
        if otro and otro.id != producto_id:
            raise DatoDuplicadoError(f"La referencia {ref} ya existe.")
        datos["referencia"] = ref
    if datos.get("tipo_id") is not None and not TipoProductoRepositorio.obtener(datos["tipo_id"]):
        raise ProductoNoEncontradoError(f"El tipo de mug {datos['tipo_id']} no existe.")


class ProductoServicio:
    """Lógica de negocio para los productos de MUGLY."""

    def crear_producto(self, datos):
        """Crea un producto nuevo."""
        _validar_producto(datos)
        producto = Producto(
            referencia=datos.get("referencia"),
            tipo_id=datos.get("tipo_id"),
            nombre=datos["nombre"],
            descripcion=datos["descripcion"],
            precio=datos["precio"],
            disponible=datos.get("disponible", True),
            cantidad_stock=datos.get("cantidad_stock", 0),
        )

        return ProductoRepositorio.guardar(producto)

    def listar_disponibles(self):
        """Catálogo público: solo productos disponibles (RF03)."""
        productos = ProductoRepositorio.obtener_disponibles()
        return [producto.to_dict() for producto in productos]

    def listar_todos(self):
        """Vista administrativa: todos los productos."""
        productos = ProductoRepositorio.obtener_todos()
        return [producto.to_dict() for producto in productos]

    def obtener_detalle(self, producto_id, solo_disponibles=False):
        """Obtiene un producto por su ID."""
        producto = self._obtener(producto_id)

        if solo_disponibles and not producto.disponible:
            raise ProductoNoEncontradoError(
                f"Producto con ID {producto_id} no encontrado."
            )

        return producto.to_dict()

    def actualizar_producto(self, producto_id, datos):
        """Actualiza parcialmente un producto."""
        producto = self._obtener(producto_id)
        _validar_producto(datos, producto_id)

        for campo in (
            "referencia",
            "tipo_id",
            "nombre",
            "descripcion",
            "precio",
            "disponible",
            "cantidad_stock",
        ):
            if datos.get(campo) is not None:
                setattr(producto, campo, datos[campo])

        ProductoRepositorio.guardar(producto)
        return producto.to_dict()

    def eliminar_producto(self, producto_id, carpeta_imagenes):
        """
        Elimina un producto.

        Si el producto ya aparece en pedidos no se borra: se marca como
        no disponible para conservar el historial (RF14, RNF04).
        Devuelve None si se eliminó, o el producto retirado.
        """
        producto = self._obtener(producto_id)

        if ProductoRepositorio.tiene_pedidos(producto_id):
            producto.disponible = False
            ProductoRepositorio.guardar(producto)
            return producto.to_dict()

        imagen = producto.imagen
        ProductoRepositorio.eliminar(producto)

        if imagen:
            self.borrar_archivo(carpeta_imagenes, imagen)

        return None

    def guardar_imagen(self, producto_id, archivo, carpeta):
        """Guarda la foto del producto y reemplaza la anterior (RF14, D6)."""
        producto = self._obtener(producto_id)

        nombre = guardar_imagen(archivo, carpeta)

        anterior = producto.imagen
        producto.imagen = nombre
        ProductoRepositorio.guardar(producto)

        if anterior:
            self.borrar_archivo(carpeta, anterior)

        return producto.to_dict()

    @staticmethod
    def borrar_archivo(carpeta, nombre):
        """Borra un archivo de imagen si existe."""
        ruta = os.path.join(carpeta, nombre)
        if os.path.isfile(ruta):
            os.remove(ruta)

    @staticmethod
    def _obtener(producto_id):
        producto = ProductoRepositorio.obtener_por_id(producto_id)

        if producto is None:
            raise ProductoNoEncontradoError(
                f"Producto con ID {producto_id} no encontrado."
            )

        return producto


class TipoProductoServicio:
    """Tipos de mug administrables (RF30, RN26)."""

    def listar(self):
        return [dict(t.to_dict(), productos=TipoProductoRepositorio.contar_productos(t.id))
                for t in TipoProductoRepositorio.listar()]

    def _unico(self, nombre, tipo_id=None):
        otro = TipoProductoRepositorio.por_nombre(nombre)
        if otro and otro.id != tipo_id:
            raise DatoDuplicadoError(f"Ya existe el tipo “{nombre}”.")

    def crear(self, datos):
        nombre = datos["nombre"].strip()
        self._unico(nombre)
        tipo = TipoProductoRepositorio.guardar(TipoProducto(nombre=nombre, descripcion=datos.get("descripcion")))
        return dict(tipo.to_dict(), productos=0)

    def actualizar(self, tipo_id, datos):
        tipo = TipoProductoRepositorio.obtener(tipo_id)
        if not tipo:
            raise ProductoNoEncontradoError(f"El tipo de mug {tipo_id} no existe.")
        nombre = datos["nombre"].strip()
        self._unico(nombre, tipo_id)
        tipo.nombre, tipo.descripcion = nombre, datos.get("descripcion")
        TipoProductoRepositorio.guardar(tipo)
        return dict(tipo.to_dict(), productos=TipoProductoRepositorio.contar_productos(tipo_id))

    def eliminar(self, tipo_id):
        tipo = TipoProductoRepositorio.obtener(tipo_id)
        if not tipo:
            raise ProductoNoEncontradoError(f"El tipo de mug {tipo_id} no existe.")
        n = TipoProductoRepositorio.contar_productos(tipo_id)
        if n:
            raise TipoEnUsoError(f"No se puede eliminar: lo usan {n} producto(s).")
        TipoProductoRepositorio.eliminar(tipo)
