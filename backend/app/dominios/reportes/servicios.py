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
  - Reembolsos (CR-02, RN22-RN23): un pedido reembolsado se pagó, así que
    cuenta en ventas confirmadas; los reembolsos registrados en el período se
    restan aparte para obtener las ventas netas.
  - No hay costos registrados: no se calcula utilidad (RN20).

Esto es control financiero interno, no contabilidad formal ni facturación.
"""
import csv
import io
from collections import OrderedDict
from datetime import timedelta

from app.dominios.contenido.servicios import ContenidoServicio
from app.dominios.pedidos.modelos import ESTADOS_CONFIRMADOS, ESTADOS_PEDIDO, ESTADOS_VENDIDOS
from app.dominios.reportes.repositorios import ReporteRepositorio
from app.fechas import dia_local, hora_local, hoy_local, inicio_de_mes, rango_utc


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
    def _indicadores(pedidos, pagos, reembolsos=()):
        confirmados = [p for p in pedidos if p.estado in ESTADOS_VENDIDOS]
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
            "reembolsos": {"valor": sum(_num(r[1]) for r in reembolsos), "cantidad": len(reembolsos)},
            "ventas_netas": ventas - sum(_num(r[1]) for r in reembolsos),
        }

    @staticmethod
    def _serie(pedidos, desde, hasta, agrupar):
        """Ventas confirmadas por día, semana (desde el primer día) o mes, con los vacíos en cero."""
        def clave_de(dia):
            if agrupar == "dia":
                return dia.isoformat()
            if agrupar == "semana":
                return (desde + timedelta(days=((dia - desde).days // 7) * 7)).isoformat()
            return dia.strftime("%Y-%m")

        cubetas = OrderedDict()
        dia = desde
        while dia <= hasta:
            clave = clave_de(dia)
            cubetas.setdefault(clave, {"periodo": clave, "ventas": 0.0, "pedidos": 0})
            dia += timedelta(days=1)
        for p in pedidos:
            if p.estado not in ESTADOS_VENDIDOS:
                continue
            local = dia_local(p.fecha_creacion)
            clave = clave_de(local)
            if clave in cubetas:
                cubetas[clave]["ventas"] += _num(p.total)
                cubetas[clave]["pedidos"] += 1
        return list(cubetas.values())

    def _por_producto(self, inicio=None, fin=None, anterior=None):
        vendidos = {pid: (int(u or 0), _num(i)) for pid, u, i in ReporteRepositorio.ventas_por_producto(inicio, fin)}
        previos = {}
        if anterior:
            previos = {pid: int(u or 0) for pid, u, _ in ReporteRepositorio.ventas_por_producto(*anterior)}
        lineas = {}
        for pid, pedido_id, uid, *_resto in ReporteRepositorio.lineas_vendidas(inicio, fin):
            info = lineas.setdefault(pid, {"pedidos": set(), "clientes": set(), "ultima": None})
            info["pedidos"].add(pedido_id)
            info["clientes"].add(uid)
            fecha = _resto[2]
            if info["ultima"] is None or fecha > info["ultima"]:
                info["ultima"] = fecha
        umbral = self.contenido.umbral_inventario_bajo()
        filas = []
        for prod in ReporteRepositorio.productos():
            unidades, ingresos = vendidos.get(prod.id, (0, 0.0))
            info = lineas.get(prod.id, {"pedidos": set(), "clientes": set(), "ultima": None})
            filas.append({
                "producto_id": prod.id,
                "producto": prod.nombre,
                "referencia": prod.referencia,
                "tipo": prod.tipo.nombre if prod.tipo else None,
                "unidades": unidades,
                "unidades_anterior": previos.get(prod.id, 0),
                "ingresos": ingresos,
                "pedidos": len(info["pedidos"]),
                "clientes": len(info["clientes"]),
                "ultima_venta": info["ultima"].isoformat() if info["ultima"] else None,
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
        reembolsos = ReporteRepositorio.reembolsos(inicio, fin)
        por_estado = {e: 0 for e in ESTADOS_PEDIDO}
        for p in pedidos:
            por_estado[p.estado] += 1
        # Período anterior de la misma duración (comparación, RF33)
        dias = (hasta - desde).days + 1
        a_hasta = desde - timedelta(days=1)
        a_desde = a_hasta - timedelta(days=dias - 1)
        a_inicio, a_fin = rango_utc(a_desde, a_hasta)
        anteriores = ReporteRepositorio.pedidos_creados(a_inicio, a_fin)
        return {
            "desde": desde.isoformat(),
            "hasta": hasta.isoformat(),
            "agrupar": agrupar,
            "indicadores": self._indicadores(pedidos, pagos, reembolsos),
            "anterior": {
                "desde": a_desde.isoformat(),
                "hasta": a_hasta.isoformat(),
                "indicadores": self._indicadores(
                    anteriores, ReporteRepositorio.pagos_confirmados(a_inicio, a_fin),
                    ReporteRepositorio.reembolsos(a_inicio, a_fin)),
            },
            "serie": self._serie(pedidos, desde, hasta, agrupar),
            "por_estado": por_estado,
            "por_producto": self._por_producto(inicio, fin, (a_inicio, a_fin)),
        }

    def detalle_producto(self, producto_id, desde=None, hasta=None, agrupar="dia"):
        """Análisis de un producto en el período (RF33): ritmo, hora, día, compradores y ciudades."""
        from app.dominios.productos.servicios import ProductoNoEncontradoError
        from app.dominios.productos.repositorios import ProductoRepositorio

        prod = ProductoRepositorio.obtener_por_id(producto_id)
        if not prod:
            raise ProductoNoEncontradoError(f"Producto con ID {producto_id} no encontrado.")
        desde, hasta = self._rango_por_defecto(desde, hasta)
        inicio, fin = rango_utc(desde, hasta)
        lineas = ReporteRepositorio.lineas_vendidas(inicio, fin, producto_id)
        unidades = sum(int(l[3]) for l in lineas)
        dias = (hasta - desde).days + 1
        horas = {h: 0 for h in range(24)}
        semana = {d: 0 for d in range(7)}  # 0 = lunes
        compradores, ciudades = {}, {}
        for _pid, _ped, uid, cant, sub, fecha, ciudad, nom, ape, correo, _est in lineas:
            local = hora_local(fecha)
            horas[local.hour] += int(cant)
            semana[local.weekday()] += int(cant)
            c = compradores.setdefault(uid, {"cliente": " ".join(x for x in (nom, ape) if x) or correo, "unidades": 0, "ingresos": 0.0, "pedidos": set()})
            c["unidades"] += int(cant)
            c["ingresos"] += _num(sub)
            c["pedidos"].add(_ped)
            if ciudad:
                ciudades[ciudad] = ciudades.get(ciudad, 0) + int(cant)
        cubetas = OrderedDict()
        dia = desde
        while dia <= hasta:
            clave = dia.isoformat() if agrupar == "dia" else (desde + timedelta(days=((dia - desde).days // 7) * 7)).isoformat() if agrupar == "semana" else dia.strftime("%Y-%m")
            cubetas.setdefault(clave, {"periodo": clave, "unidades": 0})
            dia += timedelta(days=1)
        for l in lineas:
            d = dia_local(l[5])
            clave = d.isoformat() if agrupar == "dia" else (desde + timedelta(days=((d - desde).days // 7) * 7)).isoformat() if agrupar == "semana" else d.strftime("%Y-%m")
            if clave in cubetas:
                cubetas[clave]["unidades"] += int(l[3])
        ritmo = unidades / dias if dias else 0
        return {
            "producto": prod.to_dict(),
            "desde": desde.isoformat(), "hasta": hasta.isoformat(), "agrupar": agrupar,
            "unidades": unidades,
            "ingresos": sum(_num(l[4]) for l in lineas),
            "clientes": len(compradores),
            "recompra": sum(1 for c in compradores.values() if len(c["pedidos"]) > 1),
            "ritmo_semanal": round(ritmo * 7, 2),
            "dias_de_stock": round(prod.cantidad_stock / ritmo) if ritmo else None,
            "serie": list(cubetas.values()),
            "por_hora": [{"hora": h, "unidades": u} for h, u in horas.items()],
            "por_dia_semana": [{"dia": d, "unidades": u} for d, u in semana.items()],
            "compradores": sorted(
                [{"cliente": c["cliente"], "unidades": c["unidades"], "ingresos": c["ingresos"]} for c in compradores.values()],
                key=lambda x: -x["unidades"])[:10],
            "ciudades": sorted([{"ciudad": k, "unidades": v} for k, v in ciudades.items()], key=lambda x: -x["unidades"]),
            "ventas": [
                {"pedido": ped, "fecha": fecha.isoformat(), "cliente": " ".join(x for x in (nom, ape) if x) or correo,
                 "ciudad": ciudad, "cantidad": int(cant), "valor": _num(sub), "estado": est}
                for _pid, ped, _uid, cant, sub, fecha, ciudad, nom, ape, correo, est in lineas[:50]
            ],
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
            ["Reembolsos", f"{i['reembolsos']['valor']:.0f}", i["reembolsos"]["cantidad"]],
            ["Ventas netas", f"{i['ventas_netas']:.0f}"],
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
