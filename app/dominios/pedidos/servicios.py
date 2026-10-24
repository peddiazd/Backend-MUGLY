
from decimal import Decimal

from app.dominios.pedidos.modelos import Pedido, DetallePedido
from app.dominios.pedidos.repositorios import PedidoRepositorio
from app.dominios.productos.repositorios import ProductoRepositorio


class PedidoNoEncontradoError(Exception):
    """Error cuando un pedido no existe o no es accesible."""


class ProductoPedidoNoDisponibleError(Exception):
    """Error cuando un producto no existe o no está disponible."""


class PedidoServicio:
    """Lógica de negocio para los pedidos de MUGLY."""

    def crear_pedido(self, usuario_id, datos):
        """Crea un pedido usando los precios registrados en productos."""
        pedido = Pedido(
            usuario_id=usuario_id,
            estado="pendiente",
            total=Decimal("0.00"),
        )

        total = Decimal("0.00")

        for item in datos["detalles"]:
            producto = ProductoRepositorio.obtener_por_id(
                item["producto_id"]
            )

            if producto is None or not producto.disponible:
                raise ProductoPedidoNoDisponibleError(
                    f"El producto con ID {item['producto_id']} "
                    "no existe o no está disponible."
                )

            cantidad = item["cantidad"]
            precio = Decimal(str(producto.precio))

            detalle = DetallePedido(
                producto=producto,
                cantidad=cantidad,
                precio_unitario=precio,
            )

            pedido.detalles.append(detalle)
            total += precio * cantidad

        pedido.total = total
        return PedidoRepositorio.guardar(pedido)

    def listar_pedidos_usuario(self, usuario_id):
        """Lista únicamente los pedidos del usuario autenticado."""
        pedidos = PedidoRepositorio.obtener_por_usuario(usuario_id)
        return [self._serializar_pedido(pedido) for pedido in pedidos]

    def obtener_pedido_usuario(self, pedido_id, usuario_id):
        """Obtiene un pedido solo si pertenece al usuario autenticado."""
        pedido = PedidoRepositorio.obtener_por_id(pedido_id)

        if pedido is None or pedido.usuario_id != usuario_id:
            raise PedidoNoEncontradoError(
                f"Pedido con ID {pedido_id} no encontrado."
            )

        return self._serializar_pedido(pedido)

    @staticmethod
    def _serializar_pedido(pedido):
        """Convierte el pedido y sus detalles en un diccionario."""
        return {
            "id": pedido.id,
            "usuario_id": pedido.usuario_id,
            "estado": pedido.estado,
            "total": float(pedido.total),
            "fecha_creacion": (
                pedido.fecha_creacion.isoformat()
                if pedido.fecha_creacion
                else None
            ),
            "detalles": [
                {
                    "producto_id": detalle.producto_id,
                    "producto": detalle.producto.nombre,
                    "cantidad": detalle.cantidad,
                    "precio_unitario": float(detalle.precio_unitario),
                    "subtotal": float(
                        detalle.precio_unitario * detalle.cantidad
                    ),
                }
                for detalle in pedido.detalles
            ],
        }
