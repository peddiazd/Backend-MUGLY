
from decimal import Decimal

from app import db
from app.dominios.pedidos.modelos import (
    Pedido,
    DetallePedido,
    HistorialEstadoPedido,
)
from app.dominios.pedidos.repositorios import PedidoRepositorio
from app.dominios.productos.modelos import Producto


class PedidoNoEncontradoError(Exception):
    """Error cuando un pedido no existe o no es accesible."""


class ProductoPedidoNoDisponibleError(Exception):
    """Error cuando un producto no existe o no tiene stock suficiente."""


class TransicionEstadoInvalidaError(Exception):
    """Error cuando el cambio de estado no está permitido."""


class DatosEnvioRequeridosError(Exception):
    """Error cuando se envía un pedido sin transportadora o guía."""


# Transiciones permitidas (MGL-REQ-002, RF17)
TRANSICIONES = {
    "pendiente": {"pagado", "cancelado"},
    "pagado": {"enviado"},
    "enviado": {"entregado"},
    "entregado": set(),
    "cancelado": set(),
}


class PedidoServicio:
    """Lógica de negocio para los pedidos de MUGLY."""

    def crear_pedido(self, usuario_id, datos):
        """
        Crea un pedido pendiente validando disponibilidad e inventario.

        No descuenta stock: eso ocurre cuando el administrador
        confirma el pago (D1, D3).
        """

        pedido = Pedido(
            usuario_id=usuario_id,
            estado="pendiente",
            tipo="catalogo",
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
        pedido.historial.append(
            HistorialEstadoPedido(estado="pendiente", usuario_id=usuario_id)
        )
        return PedidoRepositorio.guardar(pedido)

    def crear_pedido_personalizado(self, admin_id, datos):
        """Registra un pedido personalizado acordado por WhatsApp (D4a)."""
        from app.dominios.usuarios.repositorios import UsuarioRepositorio
        from app.dominios.usuarios.servicios import UsuarioNoEncontradoError

        if not UsuarioRepositorio.obtener_por_id(datos["usuario_id"]):
            raise UsuarioNoEncontradoError(
                f"Usuario con ID {datos['usuario_id']} no encontrado."
            )

        pedido = Pedido(
            usuario_id=datos["usuario_id"],
            estado="pendiente",
            tipo="personalizado",
            descripcion=datos["descripcion"],
            total=datos["total"],
        )
        pedido.historial.append(
            HistorialEstadoPedido(estado="pendiente", usuario_id=admin_id)
        )
        PedidoRepositorio.guardar(pedido)
        return self._serializar_pedido(pedido)

    def cambiar_estado(self, pedido_id, admin_id, datos):
        """
        Cambia el estado de un pedido según las transiciones permitidas.

        pendiente → pagado descuenta el inventario una sola vez (RF16).
        pagado → enviado exige transportadora y guía (RF19, RF20).
        """
        nuevo = datos["estado"]

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

            if nuevo not in TRANSICIONES[pedido.estado]:
                raise TransicionEstadoInvalidaError(
                    f"No se puede pasar un pedido de '{pedido.estado}' "
                    f"a '{nuevo}'."
                )

            if nuevo == "pagado" and pedido.tipo == "catalogo":
                self._descontar_inventario(pedido)

            if nuevo == "enviado":
                transportadora = (datos.get("transportadora") or "").strip()
                numero_guia = (datos.get("numero_guia") or "").strip()

                if not transportadora or not numero_guia:
                    raise DatosEnvioRequeridosError(
                        "Para enviar el pedido debe indicar la "
                        "transportadora y el número de guía."
                    )

                pedido.transportadora = transportadora
                pedido.numero_guia = numero_guia

            pedido.estado = nuevo
            pedido.historial.append(
                HistorialEstadoPedido(estado=nuevo, usuario_id=admin_id)
            )

            db.session.commit()
            return self._serializar_pedido(pedido)

        except Exception:
            db.session.rollback()
            raise

    @staticmethod
    def _descontar_inventario(pedido):
        """Verifica y descuenta el stock de cada producto del pedido."""
        productos = {}

        for detalle in pedido.detalles:
            producto = (
                db.session.query(Producto)
                .filter_by(id=detalle.producto_id)
                .with_for_update()
                .first()
            )

            if producto is None or producto.cantidad_stock < detalle.cantidad:
                nombre = producto.nombre if producto else detalle.producto_id
                existencias = producto.cantidad_stock if producto else 0
                raise ProductoPedidoNoDisponibleError(
                    f"Stock insuficiente para el producto '{nombre}'. "
                    f"Existencias disponibles: {existencias}."
                )

            productos[detalle.id] = producto

        for detalle in pedido.detalles:
            productos[detalle.id].cantidad_stock -= detalle.cantidad

    def listar_todos_los_pedidos(self):
        """Lista todos los pedidos registrados en MUGLY."""
        pedidos = PedidoRepositorio.obtener_todos()

        return [
            self._serializar_pedido(pedido)
            for pedido in pedidos
        ]

    def obtener_pedido_admin(self, pedido_id):
        """Obtiene cualquier pedido (vista administrativa)."""
        pedido = PedidoRepositorio.obtener_por_id(pedido_id)

        if pedido is None:
            raise PedidoNoEncontradoError(
                f"Pedido con ID {pedido_id} no encontrado."
            )

        return self._serializar_pedido(pedido)

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
        """Convierte el pedido, sus detalles y su historial en un diccionario."""
        return {
            "id": pedido.id,
            "usuario_id": pedido.usuario_id,
            "estado": pedido.estado,
            "tipo": pedido.tipo,
            "descripcion": pedido.descripcion,
            "transportadora": pedido.transportadora,
            "numero_guia": pedido.numero_guia,
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
            "historial": [
                {
                    "estado": h.estado,
                    "fecha": h.fecha.isoformat() if h.fecha else None,
                }
                for h in pedido.historial
            ],
        }
