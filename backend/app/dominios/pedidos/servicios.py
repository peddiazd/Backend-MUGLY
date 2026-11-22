
from decimal import Decimal

from app import db
from app.dominios.pedidos.modelos import (
    ESTADOS_CERRADOS,
    ESTADOS_CONFIRMADOS,
    Pedido,
    DetallePedido,
    HistorialEstadoPedido,
    ReembolsoPedido,
)
from app.dominios.pedidos.repositorios import PedidoRepositorio
from app.dominios.productos.modelos import Producto
from app.dominios.productos.repositorios import ProductoRepositorio


class PedidoNoEncontradoError(Exception):
    """Error cuando un pedido no existe o no es accesible."""


class ProductoPedidoNoDisponibleError(Exception):
    """Error cuando un producto no existe o no tiene stock suficiente."""


class TransicionEstadoInvalidaError(Exception):
    """Error cuando el cambio de estado no está permitido."""


class DatosEnvioRequeridosError(Exception):
    """Error cuando se envía un pedido sin transportadora o guía."""


class OperacionPedidoInvalidaError(Exception):
    """Archivo o reembolso que no cumple las reglas RN22 o RN25."""


def _copiar_envio(pedido, usuario_id):
    """El pedido guarda la dirección del perfil al crearse (RF31)."""
    from app.dominios.usuarios.repositorios import UsuarioRepositorio
    perfil = UsuarioRepositorio.obtener_perfil_por_usuario_id(usuario_id)
    if perfil:
        pedido.envio_departamento = perfil.departamento
        pedido.envio_ciudad = perfil.ciudad
        pedido.envio_direccion = perfil.direccion
        pedido.envio_complemento = perfil.complemento


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
        _copiar_envio(pedido, usuario_id)

        total = Decimal("0.00")

        for item in datos["detalles"]:
            producto = ProductoRepositorio.obtener_por_id(item["producto_id"])

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
            cantidad_personalizado=datos.get("cantidad", 1),
            mug_base=datos.get("mug_base"),
            transportadora_acordada=datos.get("transportadora_acordada"),
            entrega_acordada=datos.get("entrega_acordada"),
        )
        _copiar_envio(pedido, datos["usuario_id"])
        pedido.historial.append(
            HistorialEstadoPedido(estado="pendiente", usuario_id=admin_id)
        )
        # Pago ya verificado por WhatsApp (D3): queda registrado como pagado
        if datos.get("pagado"):
            pedido.estado = "pagado"
            pedido.historial.append(HistorialEstadoPedido(estado="pagado", usuario_id=admin_id))
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

        datos = self._serializar_pedido(pedido)
        from app.dominios.usuarios.repositorios import UsuarioRepositorio
        usuario = UsuarioRepositorio.obtener_por_id(pedido.usuario_id)
        datos["cliente"] = usuario.correo if usuario else None
        datos["cliente_datos"] = self._cliente(usuario.correo if usuario else None, usuario.perfil if usuario else None)
        return datos

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

    def buscar_pedidos(self, parametros):
        """Búsqueda paginada de pedidos con el correo del cliente."""
        from app.fechas import rango_utc
        from app.paginacion import paginar

        inicio = fin = None
        if parametros["desde"] or parametros["hasta"]:
            desde = parametros["desde"] or parametros["hasta"]
            hasta = parametros["hasta"] or parametros["desde"]
            inicio, fin = rango_utc(min(desde, hasta), max(desde, hasta))

        estados = [e for e in (parametros.get("estados") or "").split(",") if e]
        consulta = PedidoRepositorio.buscar(
            q=parametros["q"],
            estado=parametros["estado"],
            tipo=parametros["tipo"],
            inicio=inicio,
            fin=fin,
            estados=estados,
            vista=parametros.get("vista", "todos"),
            ciudad=parametros.get("ciudad", ""),
            tipo_mug=parametros.get("tipo_mug"),
        )
        filas, meta = paginar(consulta, parametros["pagina"], parametros["por_pagina"])
        items = []
        for pedido, correo, perfil in filas:
            item = self._serializar_pedido(pedido)
            item["cliente"] = correo
            item["cliente_datos"] = self._cliente(correo, perfil)
            items.append(item)
        vista = parametros.get("vista", "todos")
        conteo = PedidoRepositorio.contar_por_estado(vista)
        archivo = PedidoRepositorio.contar_archivo()
        return {"items": items, "por_estado": conteo, "activos": int(archivo.get(False, 0)),
                "archivados": int(archivo.get(True, 0)), "ciudades": PedidoRepositorio.ciudades(), **meta}

    @staticmethod
    def _cliente(correo, perfil):
        p = perfil
        return {
            "correo": correo,
            "nombre": p.nombre if p else None, "apellido": p.apellido if p else None,
            "telefono": p.telefono if p else None,
            "tipo_documento": p.tipo_documento if p else None, "numero_documento": p.numero_documento if p else None,
        }

    # ------------------------------------------------------------ CR-02
    def archivar(self, pedido_id, archivado):
        """Archiva o restaura un pedido cerrado (RN25). No cambia el estado."""
        pedido = PedidoRepositorio.obtener_por_id(pedido_id)
        if pedido is None:
            raise PedidoNoEncontradoError(f"Pedido con ID {pedido_id} no encontrado.")
        if archivado and pedido.estado not in ESTADOS_CERRADOS:
            raise OperacionPedidoInvalidaError("Solo se archivan pedidos entregados, cancelados o reembolsados.")
        pedido.archivado = archivado
        PedidoRepositorio.confirmar_cambios()
        return self._serializar_pedido(pedido)

    def archivar_cerrados(self):
        pedidos = PedidoRepositorio.cerrados_activos()
        for p in pedidos:
            p.archivado = True
        PedidoRepositorio.confirmar_cambios()
        return {"archivados": len(pedidos)}

    def reembolsar(self, pedido_id, admin_id, datos):
        """Registra un reembolso o devolución (RF32, RN22). MUGLY no mueve dinero."""
        try:
            pedido = db.session.query(Pedido).filter_by(id=pedido_id).with_for_update().first()
            if pedido is None:
                raise PedidoNoEncontradoError(f"Pedido con ID {pedido_id} no encontrado.")
            if pedido.estado not in ESTADOS_CONFIRMADOS:
                raise OperacionPedidoInvalidaError("Solo se reembolsa un pedido con pago confirmado.")
            ya = sum((r.monto for r in pedido.reembolsos), Decimal("0"))
            disponible = Decimal(pedido.total) - ya
            monto = Decimal(datos["monto"]) if datos.get("monto") is not None else disponible
            if monto <= 0 or monto > disponible:
                raise OperacionPedidoInvalidaError(f"El monto debe estar entre $1 y lo disponible ({disponible:.0f}).")
            reingresadas = 0
            if datos["tipo"] == "devolucion" and datos.get("reingresar") and pedido.tipo == "catalogo":
                for d in pedido.detalles:
                    prod = db.session.query(Producto).filter_by(id=d.producto_id).with_for_update().first()
                    if prod:
                        prod.cantidad_stock += d.cantidad
                        reingresadas += d.cantidad
            pedido.reembolsos.append(ReembolsoPedido(
                tipo=datos["tipo"], monto=monto, motivo=datos["motivo"], detalle=datos.get("detalle"),
                unidades_reingresadas=reingresadas, usuario_id=admin_id,
            ))
            total = monto == disponible
            if total:
                pedido.estado = "reembolsado"
            pedido.historial.append(HistorialEstadoPedido(
                estado="reembolsado" if total else "reembolso_parcial", usuario_id=admin_id))
            db.session.commit()
            return self._serializar_pedido(pedido)
        except Exception:
            db.session.rollback()
            raise

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
            "envio": {
                "departamento": pedido.envio_departamento, "ciudad": pedido.envio_ciudad,
                "direccion": pedido.envio_direccion, "complemento": pedido.envio_complemento,
            },
            "archivado": bool(pedido.archivado),
            "cantidad_personalizado": pedido.cantidad_personalizado,
            "mug_base": pedido.mug_base,
            "transportadora_acordada": pedido.transportadora_acordada,
            "entrega_acordada": pedido.entrega_acordada.isoformat() if pedido.entrega_acordada else None,
            "reembolsado": float(sum((r.monto for r in pedido.reembolsos), Decimal("0"))),
            "reembolsos": [
                {"id": r.id, "tipo": r.tipo, "monto": float(r.monto), "motivo": r.motivo, "detalle": r.detalle,
                 "unidades_reingresadas": r.unidades_reingresadas, "fecha": r.fecha.isoformat() if r.fecha else None}
                for r in pedido.reembolsos
            ],
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
                    "referencia": detalle.producto.referencia,
                    "tipo_mug": detalle.producto.tipo.nombre if detalle.producto.tipo else None,
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
