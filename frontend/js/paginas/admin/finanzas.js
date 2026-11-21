// Finanzas y reportes: control financiero interno (no es contabilidad formal).
import { api, descargar, textoError } from '../../api.js';
import { adminLayout, encabezadoAdmin } from '../../componentes/adminLayout.js';
import { esc, moneda, cargando, alerta, avisar, nombreEstado } from '../../componentes/ui.js';
import { barrasVerticales } from '../../componentes/graficos.js';

const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const etiqueta = (periodo) => {
  const [a, m, d] = periodo.split('-');
  return d ? `${Number(d)} ${MESES[Number(m) - 1]}` : `${MESES[Number(m) - 1]} ${a.slice(2)}`;
};

function rango(preset) {
  const hoy = new Date();
  const desde = new Date(hoy);
  if (preset === 'hoy') return [iso(hoy), iso(hoy)];
  if (preset === 'semana') { desde.setDate(hoy.getDate() - 6); return [iso(desde), iso(hoy)]; }
  if (preset === 'anio') return [`${hoy.getFullYear()}-01-01`, iso(hoy)];
  return [iso(new Date(hoy.getFullYear(), hoy.getMonth(), 1)), iso(hoy)];
}

export async function render(app) {
  const cont = adminLayout(app, '/admin/finanzas');
  let [desde, hasta] = rango('mes');
  let preset = 'mes';

  cont.innerHTML = `
    ${encabezadoAdmin('Finanzas y reportes', 'Control financiero interno. No es contabilidad formal, libros contables ni facturación electrónica.',
      `<button class="btn btn-outline-primary" type="button" data-exportar="ventas">Exportar ventas CSV</button>
       <button class="btn btn-outline-primary" type="button" data-exportar="pedidos">Exportar pedidos CSV</button>`)}
    <form class="mg-filtros" data-periodo aria-label="Período del reporte">
      <div class="btn-group" role="group" aria-label="Período rápido">
        ${[['hoy', 'Hoy'], ['semana', 'Últimos 7 días'], ['mes', 'Este mes'], ['anio', 'Este año']].map(([v, t]) =>
          `<button type="button" class="btn btn-sm ${v === preset ? 'btn-primary' : 'btn-outline-secondary'}" data-preset="${v}">${t}</button>`).join('')}
      </div>
      <label class="small text-suave" for="fdesde">Desde</label>
      <input id="fdesde" class="form-control" type="date" value="${desde}">
      <label class="small text-suave" for="fhasta">Hasta</label>
      <input id="fhasta" class="form-control" type="date" value="${hasta}">
      <button class="btn btn-primary btn-sm" type="submit">Consultar</button>
    </form>
    <div id="reporte" aria-live="polite"></div>`;

  const zona = cont.querySelector('#reporte');

  async function consultar() {
    zona.innerHTML = cargando('Calculando el reporte…');
    const dias = (new Date(hasta) - new Date(desde)) / 86400000;
    const agrupar = dias > 62 ? 'mes' : 'dia';
    let r;
    try {
      r = await api(`/admin/reportes/ventas?desde=${desde}&hasta=${hasta}&agrupar=${agrupar}`);
    } catch (error) {
      zona.innerHTML = alerta(textoError(error));
      return;
    }
    const i = r.indicadores;
    const vendidos = r.por_producto.filter((p) => p.unidades > 0);
    zona.innerHTML = `
      <div class="mg-kpis">
        <div class="mg-kpi"><span>Ventas confirmadas</span><b>${moneda(i.ventas_confirmadas.valor)}</b><small>${i.ventas_confirmadas.pedidos} pedidos pagados, enviados o entregados</small></div>
        <div class="mg-kpi"><span>Pagos confirmados</span><b>${moneda(i.pagos_confirmados.valor)}</b><small>${i.pagos_confirmados.pedidos} marcados como pagados en el período</small></div>
        <div class="mg-kpi ${i.pendiente_de_cobro.pedidos ? 'alerta' : ''}"><span>Pendiente de cobro</span><b>${moneda(i.pendiente_de_cobro.valor)}</b><small>${i.pendiente_de_cobro.pedidos} pedidos sin pago</small></div>
        <div class="mg-kpi"><span>Cancelados</span><b>${moneda(i.cancelados.valor)}</b><small>${i.cancelados.pedidos} pedidos · no suman a ventas</small></div>
        <div class="mg-kpi"><span>Pedidos creados</span><b>${i.pedidos}</b><small>en el período</small></div>
        <div class="mg-kpi"><span>Ticket promedio</span><b>${moneda(i.ticket_promedio)}</b><small>ventas ÷ pedidos confirmados</small></div>
      </div>

      <div class="mg-paneles">
        <section class="mg-panel"><div class="mg-panel-cab"><h2>Ventas confirmadas por ${agrupar === 'dia' ? 'día' : 'mes'}</h2></div><div id="gserie"></div></section>
        <section class="mg-panel">
          <div class="mg-panel-cab"><h2>Utilidad</h2></div>
          <div class="mg-vacio"><b>No disponible todavía</b>MUGLY no registra el costo de cada mug ni los gastos del negocio. Sin esos datos la utilidad no se puede calcular, y no se muestra una cifra estimada.</div>
          <p class="mg-nota mb-0">Para calcularla haría falta: <b>costo unitario</b> por producto, y un registro de <b>gastos</b> (envíos asumidos por la tienda, insumos y otros).</p>
        </section>
      </div>

      <div class="mg-paneles">
        <section class="mg-panel">
          <div class="mg-panel-cab"><h2>Ventas por producto</h2><span class="small text-suave">pedidos confirmados del período</span></div>
          <div class="table-responsive"><table class="table mb-0">
            <thead class="table-light small"><tr><th scope="col">Producto</th><th scope="col">Unidades</th><th scope="col">Ingresos confirmados</th><th scope="col">Stock actual</th></tr></thead>
            <tbody>${r.por_producto.map((p) => `<tr><td>${esc(p.producto)}${p.disponible ? '' : ' <span class="small text-suave">(retirado)</span>'}</td><td class="num">${p.unidades}</td><td class="num">${moneda(p.ingresos)}</td>
              <td class="num">${p.stock} ${p.inventario_bajo ? '<span class="estado estado-pendiente ms-1">Bajo</span>' : ''}</td></tr>`).join('')}</tbody>
          </table></div>
          ${vendidos.length ? '' : '<p class="mg-nota mb-0">No hubo ventas confirmadas en este período.</p>'}
        </section>
        <section class="mg-panel">
          <div class="mg-panel-cab"><h2>Pedidos por estado</h2></div>
          <div class="table-responsive"><table class="table table-sm mb-3"><tbody>
            ${Object.entries(r.por_estado).map(([e, n]) => `<tr><td>${nombreEstado(e)}</td><td class="num text-end">${n}</td></tr>`).join('')}
          </tbody></table></div>
          <h3 class="h6">Cómo se calcula</h3>
          <ul class="small text-suave mb-0 ps-3">
            <li><b>Ventas confirmadas:</b> total de los pedidos creados en el período cuyo estado actual es pagado, enviado o entregado. Cada pedido cuenta una vez.</li>
            <li><b>Pagos confirmados:</b> pedidos marcados como pagados en el período. Los marca el administrador tras verificar el pago por WhatsApp; no hay pasarela que lo certifique.</li>
            <li><b>Pendiente de cobro:</b> pedidos del período en estado pendiente.</li>
            <li><b>Cancelados:</b> se informan aparte y nunca suman a las ventas. Un pedido pagado no puede cancelarse.</li>
            <li>MUGLY no maneja reembolsos, por eso no se reportan.</li>
          </ul>
        </section>
      </div>`;

    barrasVerticales(zona.querySelector('#gserie'),
      r.serie.map((s) => ({ etiqueta: etiqueta(s.periodo), valor: s.ventas, detalle: `${s.pedidos} ${s.pedidos === 1 ? 'pedido' : 'pedidos'}` })),
      { titulo: 'Ventas confirmadas del período' });
  }

  const form = cont.querySelector('[data-periodo]');
  form.addEventListener('click', (ev) => {
    const b = ev.target.closest('[data-preset]');
    if (!b) return;
    preset = b.dataset.preset;
    [desde, hasta] = rango(preset);
    form.querySelector('#fdesde').value = desde;
    form.querySelector('#fhasta').value = hasta;
    form.querySelectorAll('[data-preset]').forEach((x) => { x.className = `btn btn-sm ${x === b ? 'btn-primary' : 'btn-outline-secondary'}`; });
    consultar();
  });
  form.addEventListener('submit', (ev) => {
    ev.preventDefault();
    const d = form.querySelector('#fdesde').value;
    const h = form.querySelector('#fhasta').value;
    if (!d || !h) { avisar('Indica las dos fechas del período.', 'warning'); return; }
    if (d > h) { avisar('La fecha inicial no puede ser posterior a la final.', 'warning'); return; }
    [desde, hasta] = [d, h];
    form.querySelectorAll('[data-preset]').forEach((x) => { x.className = 'btn btn-sm btn-outline-secondary'; });
    consultar();
  });

  cont.addEventListener('click', async (ev) => {
    const b = ev.target.closest('[data-exportar]');
    if (!b) return;
    try {
      await descargar(`/admin/reportes/${b.dataset.exportar}.csv?desde=${desde}&hasta=${hasta}`, `mugly-${b.dataset.exportar}-${desde}-a-${hasta}.csv`);
    } catch (error) {
      avisar(textoError(error), 'danger');
    }
  });

  await consultar();
}
