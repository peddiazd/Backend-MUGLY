"""Dashboard y reportes financieros internos de MUGLY.

Definiciones (iguales en la API, el panel y las exportaciones):
  - Ventas confirmadas: suma del total de los pedidos creados en el período
    cuyo estado actual es pagado, enviado o entregado. Cada pedido cuenta
    una vez. Un pedido pagado no puede cancelarse (TRANSICIONES).
  - Pagos confirmados: pedidos cuyo paso a 'pagado' ocurrió en el período.
    Lo registra el administrador tras verificar el pago por WhatsApp; no hay
    pasarela que lo certifique (D1, D8).
  - Pendiente de cobro: pedidos en estado pendiente.
  - Cancelados: se informan aparte y nunca suman a las ventas.
  - No existen reembolsos ni costos registrados: no se calcula utilidad.

Esto es control financiero interno, no contabilidad formal ni facturación.
"""
import csv
import io
from collections import OrderedDict
from datetime import timedelta

from app.dominios.contenido.servicios import ContenidoServicio
from app.dominios.pedidos.modelos import ESTADOS_CONFIRMADOS, ESTADOS_PEDIDO
from app.dominios.reportes.repositorios import ReporteRepositorio
from app.fechas import dia_local, hoy_local, inicio_de_mes, rango_utc


def _num(valor):
    return float(valor or 0)


class ReporteServicio:

    def __init__(self):
        self.contenido = ContenidoServicio()

    # ----------------------------------------------------------- utilidades
    @staticmethod
    def _rango_por_defecto(desde, hasta):
        hoy = hoy_local()
        return desde or inicio_de_mes(hoy), hasta or hoy

    @staticmethod
    def _indicadores(pedidos, pagos):
        confirmados = [p for p in pedidos if p.estado in ESTADOS_CONFIRMADOS]
        pendientes = [p for p in pedidos if p.estado == "pendiente"]
        cancelados = [p for p in pedidos if p.estado == "cancelado"]
        ventas = sum(_num(p.total) for p in confirmados)
        return {
            "ventas_confirmadas": {"valor": ventas, "pedidos": len(confirmados)},
            "pagos_confirmados": {"valor": sum(_num(p.total) for p in pagos), "pedidos": len(pagos)},
            "pendiente_de_cobro": {"valor": sum(_num(p.total) for p in pendientes), "pedidos": len(pendientes)},
            "cancelados": {"valor": sum(_num(p.total) for p in cancelados), "pedidos": len(cancelados)},
            "pedidos": len(pedidos),
            "ticket_promedio": round(ventas / len(confirmados), 2) if confirmados else 0.0,
        }

    @staticmethod
    def _serie(pedidos, desde, hasta, agrupar):
        """Ventas confirmadas por día o por mes, con los períodos vacíos en cero."""
        cubetas = OrderedDict()
        dia = desde
        while dia <= hasta:
            clave = dia.isoformat() if agrupar == "dia" else dia.strftime("%Y-%m")
            cubetas.setdefault(clave, {"periodo": clave, "ventas": 0.0, "pedidos": 0})
            dia += timedelta(days=1)
        for p in pedidos:
            if p.estado not in ESTADOS_CONFIRMADOS:
                continue
            local = dia_local(p.fecha_creacion)
            clave = local.isoformat() if agrupar == "dia" else local.strftime("%Y-%m")
            if clave in cubetas:
                cubetas[clave]["ventas"] += _num(p.total)
                cubetas[clave]["pedidos"] += 1
        return list(cubetas.values())

    def _por_producto(self, inicio=None, fin=None):
        vendidos = {pid: (int(u or 0), _num(i)) for pid, u, i in ReporteRepositorio.ventas_por_producto(inicio, fin)}
        umbral = self.contenido.umbral_inventario_bajo()
        filas = []
        for prod in ReporteRepositorio.productos():
            unidades, ingresos = vendidos.get(prod.id, (0, 0.0))
            filas.append({
                "producto_id": prod.id,
                "producto": prod.nombre,
                "unidades": unidades,
                "ingresos": ingresos,
                "stock": prod.cantidad_stock,
                "disponible": prod.disponible,
                "inventario_bajo": prod.disponible and prod.cantidad_stock <= umbral,
            })
        filas.sort(key=lambda f: (-f["unidades"], -f["ingresos"], f["producto"]))
        return filas

    @staticmethod
    def _pedido_resumido(pedido, correo):
        return {
            "id": pedido.id,
            "cliente": correo,
            "estado": pedido.estado,
            "tipo": pedido.tipo,
            "total": _num(pedido.total),
            "fecha_creacion": pedido.fecha_creacion.isoformat() if pedido.fecha_creacion else None,
        }

    # ------------------------------------------------------------- reportes
    def reporte_ventas(self, desde=None, hasta=None, agrupar="dia"):
        desde, hasta = self._rango_por_defecto(desde, hasta)
        inicio, fin = rango_utc(desde, hasta)
        pedidos = ReporteRepositorio.pedidos_creados(inicio, fin)
        pagos = ReporteRepositorio.pagos_confirmados(inicio, fin)
        por_estado = {e: 0 for e in ESTADOS_PEDIDO}
        for p in pedidos:
            por_estado[p.estado] += 1
        return {
            "desde": desde.isoformat(),
            "hasta": hasta.isoformat(),
            "agrupar": agrupar,
            "indicadores": self._indicadores(pedidos, pagos),
            "serie": self._serie(pedidos, desde, hasta, agrupar),
            "por_estado": por_estado,
            "por_producto": self._por_producto(inicio, fin),
        }

    def resumen(self):
        """Lo que el administrador necesita ver al entrar."""
        hoy = hoy_local()
        mes = self.reporte_ventas(inicio_de_mes(hoy), hoy)
        semana_desde = hoy - timedelta(days=6)
        inicio7, fin7 = rango_utc(semana_desde, hoy)
        serie7 = self._serie(ReporteRepositorio.pedidos_creados(inicio7, fin7), semana_desde, hoy, "dia")

        pendientes = ReporteRepositorio.pedidos_con_cliente(estado="pendiente")
        enviados = ReporteRepositorio.pedidos_con_cliente(estado="enviado")
        todos = ReporteRepositorio.pedidos_creados()
        clientes, activos = ReporteRepositorio.clientes()
        productos = self._por_producto()
        umbral = self.contenido.umbral_inventario_bajo()

        return {
            "fecha": hoy.isoformat(),
            "mes": {"desde": mes["desde"], "hasta": mes["hasta"], "indicadores": mes["indicadores"]},
            "pendiente_de_cobro": {
                "valor": sum(_num(p.total) for p, _ in pendientes),
                "pedidos": len(pendientes),
            },
            "ventas_historicas": self._indicadores(todos, [])["ventas_confirmadas"],
            "clientes": {"total": clientes, "activos": activos},
            "productos": {
                "activos": sum(1 for p in productos if p["disponible"]),
                "inventario_bajo": [p for p in productos if p["inventario_bajo"]],
                "umbral": umbral,
            },
            "atencion": {
                "pendientes": [self._pedido_resumido(p, c) for p, c in pendientes[:5]],
                "enviados": [self._pedido_resumido(p, c) for p, c in enviados[:5]],
            },
            "recientes": [self._pedido_resumido(p, c) for p, c in ReporteRepositorio.pedidos_con_cliente(limite=5)],
            "mas_vendidos": [p for p in productos if p["unidades"] > 0][:5],
            "ultimos_7_dias": serie7,
        }

    # --------------------------------------------------------- exportación
    @staticmethod
    def _csv(cabecera, filas):
        """CSV para Excel en español: separador ';' y BOM UTF-8."""
        salida = io.StringIO()
        salida.write("﻿")
        escritor = csv.writer(salida, delimiter=";")
        escritor.writerow(cabecera)
        escritor.writerows(filas)
        return salida.getvalue()

    def csv_ventas(self, desde=None, hasta=None):
        r = self.reporte_ventas(desde, hasta)
        filas = [[f["producto"], f["unidades"], f"{f['ingresos']:.0f}", f["stock"]] for f in r["por_producto"]]
        i = r["indicadores"]
        filas += [
            [], ["Período", f"{r['desde']} a {r['hasta']}"],
            ["Ventas confirmadas", f"{i['ventas_confirmadas']['valor']:.0f}", i["ventas_confirmadas"]["pedidos"]],
            ["Pendiente de cobro", f"{i['pendiente_de_cobro']['valor']:.0f}", i["pendiente_de_cobro"]["pedidos"]],
            ["Cancelados", f"{i['cancelados']['valor']:.0f}", i["cancelados"]["pedidos"]],
        ]
        return self._csv(["Producto", "Unidades vendidas", "Ingresos confirmados (COP)", "Stock actual"], filas)

    def csv_pedidos(self, desde=None, hasta=None):
        desde, hasta = self._rango_por_defecto(desde, hasta)
        inicio, fin = rango_utc(desde, hasta)
        filas = [
            [p.id, dia_local(p.fecha_creacion).isoformat(), correo, p.tipo, p.estado,
             f"{_num(p.total):.0f}", p.transportadora or "", p.numero_guia or ""]
            for p, correo in ReporteRepositorio.pedidos_con_cliente(inicio=inicio, fin=fin)
        ]
        return self._csv(["Pedido", "Fecha", "Cliente", "Tipo", "Estado", "Total (COP)", "Transportadora", "Guía"], filas)

    def csv_clientes(self):
        from app.dominios.usuarios.repositorios import UsuarioRepositorio

        filas = [
            [u.id, u.correo, (perfil.nombre if perfil else "") or "", (perfil.apellido if perfil else "") or "",
             (perfil.telefono if perfil else "") or "", u.fecha_creacion.date().isoformat() if u.fecha_creacion else "",
             "activo" if u.activo else "desactivado", int(n or 0), f"{_num(c):.0f}"]
            for u, perfil, n, c in UsuarioRepositorio.buscar_clientes().all()
        ]
        return self._csv(["ID", "Correo", "Nombre", "Apellido", "Teléfono", "Registro", "Estado", "Pedidos", "Compra confirmada (COP)"], filas)
