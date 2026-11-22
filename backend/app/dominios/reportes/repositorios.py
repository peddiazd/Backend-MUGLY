from sqlalchemy import func

from app import db
from app.dominios.pedidos.modelos import (
    ESTADOS_CONFIRMADOS,
    DetallePedido,
    HistorialEstadoPedido,
    Pedido,
    ReembolsoPedido,
)
from app.dominios.productos.modelos import Producto
from app.dominios.usuarios.modelos import Usuario


class ReporteRepositorio:
    """Consultas de lectura para el dashboard y los reportes financieros."""

    @staticmethod
    def pedidos_creados(inicio=None, fin=None):
        """(id, estado, tipo, total, fecha_creacion) de pedidos creados en [inicio, fin)."""
        consulta = db.session.query(
            Pedido.id, Pedido.estado, Pedido.tipo, Pedido.total, Pedido.fecha_creacion
        )
        if inicio is not None:
            consulta = consulta.filter(Pedido.fecha_creacion >= inicio)
        if fin is not None:
            consulta = consulta.filter(Pedido.fecha_creacion < fin)
        return consulta.all()

    @staticmethod
    def pagos_confirmados(inicio, fin):
        """(pedido_id, total, fecha) del paso a 'pagado' ocurrido en [inicio, fin).

        Un pedido pasa a pagado una sola vez (no hay vuelta atrás), así que no
        se cuenta dos veces.
        """
        return (
            db.session.query(Pedido.id, Pedido.total, HistorialEstadoPedido.fecha)
            .join(HistorialEstadoPedido, HistorialEstadoPedido.pedido_id == Pedido.id)
            .filter(HistorialEstadoPedido.estado == "pagado")
            .filter(HistorialEstadoPedido.fecha >= inicio, HistorialEstadoPedido.fecha < fin)
            .all()
        )

    @staticmethod
    def ventas_por_producto(inicio=None, fin=None):
        """Unidades e ingresos por producto en pedidos confirmados creados en el rango."""
        consulta = (
            db.session.query(
                DetallePedido.producto_id,
                func.sum(DetallePedido.cantidad),
                func.sum(DetallePedido.cantidad * DetallePedido.precio_unitario),
            )
            .join(Pedido, Pedido.id == DetallePedido.pedido_id)
            .filter(Pedido.estado.in_(ESTADOS_CONFIRMADOS))
        )
        if inicio is not None:
            consulta = consulta.filter(Pedido.fecha_creacion >= inicio)
        if fin is not None:
            consulta = consulta.filter(Pedido.fecha_creacion < fin)
        return consulta.group_by(DetallePedido.producto_id).all()

    @staticmethod
    def productos():
        return db.session.query(Producto).order_by(Producto.nombre).all()

    @staticmethod
    def clientes():
        """(total, activos) de cuentas con rol cliente."""
        total = db.session.query(func.count(Usuario.id)).filter(Usuario.rol == "usuario").scalar()
        activos = (
            db.session.query(func.count(Usuario.id))
            .filter(Usuario.rol == "usuario", Usuario.activo.is_(True))
            .scalar()
        )
        return int(total or 0), int(activos or 0)

    @staticmethod
    def pedidos_con_cliente(estado=None, limite=None, inicio=None, fin=None):
        """Pedidos (más recientes primero) con el correo del cliente."""
        consulta = db.session.query(Pedido, Usuario.correo).join(Usuario, Usuario.id == Pedido.usuario_id)
        if estado:
            consulta = consulta.filter(Pedido.estado == estado)
        if inicio is not None:
            consulta = consulta.filter(Pedido.fecha_creacion >= inicio)
        if fin is not None:
            consulta = consulta.filter(Pedido.fecha_creacion < fin)
        consulta = consulta.order_by(Pedido.id.desc())
        if limite:
            consulta = consulta.limit(limite)
        return consulta.all()

    # ------------------------------------------------------------ CR-02
    @staticmethod
    def reembolsos(inicio=None, fin=None):
        """(pedido_id, monto, fecha) de los reembolsos registrados en [inicio, fin)."""
        consulta = db.session.query(ReembolsoPedido.pedido_id, ReembolsoPedido.monto, ReembolsoPedido.fecha)
        if inicio is not None:
            consulta = consulta.filter(ReembolsoPedido.fecha >= inicio)
        if fin is not None:
            consulta = consulta.filter(ReembolsoPedido.fecha < fin)
        return consulta.all()

    @staticmethod
    def lineas_vendidas(inicio=None, fin=None, producto_id=None):
        """Detalles de pedidos confirmados con cliente y ciudad de envío (análisis por producto)."""
        from app.dominios.usuarios.modelos import PerfilUsuario

        consulta = (
            db.session.query(
                DetallePedido.producto_id, Pedido.id, Pedido.usuario_id, DetallePedido.cantidad,
                DetallePedido.cantidad * DetallePedido.precio_unitario, Pedido.fecha_creacion,
                Pedido.envio_ciudad, PerfilUsuario.nombre, PerfilUsuario.apellido, Usuario.correo, Pedido.estado,
            )
            .join(Pedido, Pedido.id == DetallePedido.pedido_id)
            .join(Usuario, Usuario.id == Pedido.usuario_id)
            .outerjoin(PerfilUsuario, PerfilUsuario.usuario_id == Usuario.id)
            .filter(Pedido.estado.in_(ESTADOS_CONFIRMADOS))
        )
        if producto_id is not None:
            consulta = consulta.filter(DetallePedido.producto_id == producto_id)
        if inicio is not None:
            consulta = consulta.filter(Pedido.fecha_creacion >= inicio)
        if fin is not None:
            consulta = consulta.filter(Pedido.fecha_creacion < fin)
        return consulta.order_by(Pedido.fecha_creacion.desc()).all()
