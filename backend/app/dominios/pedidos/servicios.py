
from decimal import Decimal

from app import db
from app.dominios.pedidos.modelos import Pedido, DetallePedido
from app.dominios.pedidos.repositorios import PedidoRepositorio
from app.dominios.productos.modelos import Producto


class PedidoNoEncontradoError(Exception):
    """Error cuando un pedido no existe o no es accesible."""


class ProductoPedidoNoDisponibleError(Exception):
    """Error cuando un producto no existe o no tiene stock suficiente."""


class PedidoPagoYaProcesadoError(Exception):
    """Error cuando un pedido ya tiene un resultado de pago."""


class ResultadoPagoInvalidoError(Exception):
    """Error cuando el resultado del pago no es válido."""


class PedidoServicio:
    """Lógica de negocio para los pedidos de MUGLY."""

    def crear_pedido(self, usuario_id, datos):
        """Crea un pedido validando disponibilidad e inventario."""

        pedido = Pedido(
            usuario_id=usuario_id,
            estado="pendiente",
            total=Decimal("0.00"),
        )

        total = Decimal("0.00")

        for item in datos["detalles"]:
            producto = db.session.get(
                Producto,
                item["producto_id"],
            )

            if producto is None or not producto.disponible:
                raise ProductoPedidoNoDisponibleError(
                    f"El producto con ID {item['producto_id']} "
                    "no existe o no está disponible."
                )

            cantidad = item["cantidad"]

            if producto.cantidad_stock < cantidad:
                raise ProductoPedidoNoDisponibleError(
                    f"Stock insuficiente para el producto "
                    f"'{producto.nombre}'. "
                    f"Existencias disponibles: {producto.cantidad_stock}."
                )

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

    def registrar_resultado_pago(self, pedido_id, resultado):
        """
        Registra el resultado recibido de la pasarela.

        Esta operación debe ser invocada únicamente por un proceso
        de confianza que haya verificado el resultado del pago.
        """

        if resultado not in ("confirmado", "rechazado"):
            raise ResultadoPagoInvalidoError(
                "El resultado del pago debe ser confirmado o rechazado."
            )

        try:
            pedido = (
                db.session.query(Pedido)
                .filter_by(id=pedido_id)
                .with_for_update()
                .first()
            )

            if pedido is None:
                raise PedidoNoEncontradoError(
                    f"Pedido con ID {pedido_id} no encontrado."
                )

            if pedido.estado_pago != "pendiente":
                raise PedidoPagoYaProcesadoError(
                    "El pedido ya tiene un resultado de pago registrado."
                )

            if resultado == "rechazado":
                pedido.estado_pago = "rechazado"
                db.session.commit()

                return self._serializar_pedido(pedido)

            detalles = list(pedido.detalles)
            productos = {}

            for detalle in detalles:
                producto = (
                    db.session.query(Producto)
                    .filter_by(id=detalle.producto_id)
                    .with_for_update()
                    .first()
                )

                if producto is None or not producto.disponible:
                    raise ProductoPedidoNoDisponibleError(
                        f"El producto con ID {detalle.producto_id} "
                        "ya no está disponible."
                    )

                if producto.cantidad_stock < detalle.cantidad:
                    raise ProductoPedidoNoDisponibleError(
                        f"Stock insuficiente para el producto "
                        f"'{producto.nombre}'. "
                        f"Existencias disponibles: "
                        f"{producto.cantidad_stock}."
                    )

                productos[detalle.producto_id] = producto

            for detalle in detalles:
                producto = productos[detalle.producto_id]
                producto.cantidad_stock -= detalle.cantidad

            pedido.estado_pago = "confirmado"

            db.session.commit()

            return self._serializar_pedido(pedido)

        except Exception:
            db.session.rollback()
            raise

    def listar_todos_los_pedidos(self):
        """Lista todos los pedidos registrados en MUGLY."""
        pedidos = PedidoRepositorio.obtener_todos()

        return [
            self._serializar_pedido(pedido)
            for pedido in pedidos
        ]

    def listar_pedidos_usuario(self, usuario_id):
        """Lista únicamente los pedidos del usuario autenticado."""
        pedidos = PedidoRepositorio.obtener_por_usuario(usuario_id)

        return [
            self._serializar_pedido(pedido)
            for pedido in pedidos
        ]

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
            "estado_pago": pedido.estado_pago,
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
