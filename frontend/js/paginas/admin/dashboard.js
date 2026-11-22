// Inicio del panel (RF24; v1.3.0 CR-02): indicadores del período elegido
// (predefinido o personalizado), lo que requiere atención y lo más reciente.
import { api, textoError } from '../../api.js';
import { estado } from '../../estado.js';
import { CONFIG } from '../../config.js';
import { adminLayout, encabezadoAdmin } from '../../componentes/adminLayout.js';
import {
  esc, moneda, ic, ib, vacio, sr, badge, fecha, fechaC, acciones, rango, periodoBtn, periodoPop, nomPeriodo, grafico, etiquetaPeriodo,
} from '../../componentes/adminUI.js';

export async function render(app) {
  const cont = adminLayout(app, '/admin');

  async function pintar() {
    const r = rango();
    cont.innerHTML = '<div class="sk" style="height:26px;width:220px"></div>';
    let ventas, resumen, pedidos;
    try {
      [ventas, resumen, pedidos] = await Promise.all([
        api(`/admin/reportes/ventas?desde=${r.desde}&hasta=${r.hasta}&agrupar=${r.agrupar}`),
        api('/admin/resumen'),
        api('/admin/pedidos?vista=todos&por_pagina=6'),
      ]);
    } catch (error) {
      cont.innerHTML = `${encabezadoAdmin('Inicio')}<div class="note err">${ic('alert', 16, 2)}<span>${esc(textoError(error))}</span></div>`;
      return;
    }
    const ind = ventas.indicadores;
    const serie = ventas.serie.map((s) => ({ l: etiquetaPeriodo(s.periodo), lt: s.periodo, v: s.ventas, n: s.pedidos }));
    const bajos = resumen.productos.inventario_bajo;
    const porEstado = pedidos.por_estado || {};
    const top = ventas.por_producto.filter((x) => x.unidades > 0).slice(0, 5);
    const maxU = Math.max(1, ...top.map((x) => x.unidades));
    const fila = (href, n, color, texto) => `<li><a class="at-row" href="${href}"><span class="att-n" style="${color}">${n}</span><span class="grow">${texto}</span>${ic('chev-r', 16)}</a></li>`;

    cont.innerHTML = `
      ${encabezadoAdmin('Inicio', `Resumen de ${esc(CONFIG.NOMBRE)} · ${fecha(r.desde)} – ${fecha(r.hasta)}`, periodoBtn())}
      <section class="card kpis" aria-label="Indicadores del período">
        <div class="kpi"><div class="l">${ic('coin', 15)}Ventas confirmadas</div><div class="v">${moneda(ind.ventas_confirmadas.valor)}</div><div class="s">${ind.ventas_confirmadas.pedidos} pedidos con pago confirmado</div></div>
        <div class="kpi"><div class="l">${ic('clock', 15)}Pendiente de cobro</div><div class="v">${moneda(resumen.pendiente_de_cobro.valor)}</div><div class="s">${resumen.pendiente_de_cobro.pedidos} pedidos sin pago confirmado · no es dinero recibido</div></div>
        <div class="kpi"><div class="l">${ic('users', 15)}Clientes</div><div class="v">${resumen.clientes.total}</div><div class="s">${resumen.clientes.activos} activos</div></div>
        <div class="kpi"><div class="l">${ic('mug', 15)}Productos en catálogo</div><div class="v">${resumen.productos.activos}</div><div class="s">alerta con ${resumen.productos.umbral} unidades o menos</div></div>
      </section>
      <div class="grid-2">
        <section class="card"><div class="card-h"><h2>Ventas confirmadas · ${esc(nomPeriodo())}</h2><a class="lnk" href="#/admin/finanzas">Ver finanzas</a></div><div class="card-b">${grafico(serie)}</div></section>
        <section class="card"><div class="card-h"><h2>Requiere atención</h2></div><div class="card-b">
          <ul class="list">
            ${fila('#/admin/pedidos?estado=pendiente', porEstado.pendiente || 0, 'background:var(--warn-bg);color:var(--warn)', 'Pedidos por confirmar pago')}
            ${fila('#/admin/pedidos?estado=enviado', porEstado.enviado || 0, 'background:var(--verde);color:#fff', 'Enviados sin marcar como entregados')}
            ${fila('#/admin/productos?bajo=1', bajos.length, 'background:var(--err-bg);color:var(--err)', `Productos con inventario bajo (≤ ${resumen.productos.umbral})`)}
          </ul>
          ${bajos.length ? `<div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:10px">${bajos.map((p) => `<span class="tag">${esc(p.producto)} · ${p.stock}</span>`).join('')}</div>` : ''}
        </div></section>
      </div>
      <div class="grid-2">
        <section class="card"><div class="card-h"><h2>Pedidos recientes</h2><a class="lnk" href="#/admin/pedidos">Ver todos</a></div>
          ${pedidos.items.length ? `<div class="tw" style="padding:6px 4px 4px"><table class="t"><thead><tr><th>Pedido</th><th>Fecha</th><th>Nombre</th><th>Apellido</th><th class="num">Total</th><th>Estado</th><th class="ac"><span class="sr">Ver</span></th></tr></thead><tbody>
          ${pedidos.items.map((p) => `<tr><td class="id">#${p.id}</td><td class="tab-n">${fechaC(p.fecha_creacion)}</td><td>${esc(p.cliente_datos?.nombre) || sr}</td><td>${esc(p.cliente_datos?.apellido) || sr}</td><td class="num">${moneda(p.total)}</td><td>${badge(p.estado)}</td><td class="ac"><a class="ib" href="#/admin/pedidos?q=${p.id}" aria-label="Ver pedido #${p.id}" data-tip="Ver pedido #${p.id}">${ic('eye')}</a></td></tr>`).join('')}
          </tbody></table></div>` : `<div class="card-b">${vacio('bag', 'Aún no hay pedidos', 'Aparecerán aquí cuando los clientes compren.')}</div>`}</section>
        <section class="card"><div class="card-h"><h2>Más vendidos · ${esc(nomPeriodo())}</h2><a class="lnk" href="#/admin/finanzas?tab=productos">Ver análisis</a></div><div class="card-b">
          ${top.length ? `<ul class="list">${top.map((x) => `<li><span class="grow">${esc(x.producto)}</span><span class="hbar"><i style="width:${(x.unidades / maxU) * 100}%"></i></span><span class="tab-n" style="width:28px;text-align:right;font-weight:600">${x.unidades}</span></li>`).join('')}</ul>` : vacio('mug', 'Sin ventas confirmadas', 'En este período no hay pedidos pagados.')}
        </div></section>
      </div>`;
  }

  acciones({ 'periodo-pop': (el) => periodoPop(el, pintar) });
  if (!estado.usuario) return;
  await pintar();
}
