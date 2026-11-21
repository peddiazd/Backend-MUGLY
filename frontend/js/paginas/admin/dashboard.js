// Dashboard administrativo: cómo va el negocio y qué requiere atención.
import { api } from '../../api.js';
import { estado } from '../../estado.js';
import { adminLayout, encabezadoAdmin, iconoAdmin } from '../../componentes/adminLayout.js';
import { esc, moneda, fecha, cargando, alerta, insigniaEstado } from '../../componentes/ui.js';
import { barrasVerticales, barrasHorizontales } from '../../componentes/graficos.js';

const DIA = new Intl.DateTimeFormat('es-CO', { day: 'numeric', month: 'short', timeZone: 'UTC' });
const etiquetaDia = (iso) => DIA.format(new Date(`${iso}T00:00:00Z`)).replace('.', '');

function saludo() {
  const h = new Date().getHours();
  return h < 12 ? 'Buenos días' : h < 19 ? 'Buenas tardes' : 'Buenas noches';
}

export async function render(app) {
  const cont = adminLayout(app, '/admin');
  cont.innerHTML = cargando('Cargando el resumen…');

  let r;
  try {
    r = await api('/admin/resumen');
  } catch (error) {
    cont.innerHTML = alerta(error.message);
    return;
  }

  const m = r.mes.indicadores;
  const bajo = r.productos.inventario_bajo;
  const pendientes = r.atencion.pendientes;
  const enviados = r.atencion.enviados;
  const nombreMes = new Intl.DateTimeFormat('es-CO', { month: 'long' }).format(new Date(`${r.mes.desde}T12:00:00`));

  const atencion = [
    ...pendientes.map((p) => `
      <li><span class="ic">${iconoAdmin('pedidos', 18)}</span>
        <div><b>Pedido #${p.id} sin pago</b><span>${p.tipo === 'personalizado' ? 'Personalizado' : 'Catálogo'} · ${moneda(p.total)} · ${esc(p.cliente)}</span></div>
        <a class="btn btn-primary btn-sm" href="#/admin/pedidos?q=${p.id}">Gestionar</a></li>`),
    enviados.length ? `
      <li><span class="ic verde">${iconoAdmin('pedidos', 18)}</span>
        <div><b>${enviados.length} ${enviados.length === 1 ? 'pedido enviado' : 'pedidos enviados'}</b><span>${enviados.map((p) => `#${p.id}`).join(', ')} · márcalos como entregados al confirmar la entrega</span></div>
        <a class="btn btn-outline-primary btn-sm" href="#/admin/pedidos?estado=enviado">Revisar</a></li>` : '',
    ...bajo.map((p) => `
      <li><span class="ic">${iconoAdmin('productos', 18)}</span>
        <div><b>${esc(p.producto)}: ${p.stock} ${p.stock === 1 ? 'unidad' : 'unidades'}</b><span>Inventario bajo (umbral ${r.productos.umbral})</span></div>
        <a class="btn btn-outline-primary btn-sm" href="#/admin/productos?bajo=1">Reponer</a></li>`),
  ].join('');

  cont.innerHTML = `
    ${encabezadoAdmin(`${saludo()}`, `Resumen de MUGLY · ${esc(estado.usuario?.correo ?? '')}`)}
    <div class="mg-kpis">
      <div class="mg-kpi"><span>Ventas confirmadas de ${esc(nombreMes)}</span><b>${moneda(m.ventas_confirmadas.valor)}</b><small>${m.ventas_confirmadas.pedidos} ${m.ventas_confirmadas.pedidos === 1 ? 'pedido' : 'pedidos'} con pago confirmado</small></div>
      <div class="mg-kpi ${r.pendiente_de_cobro.pedidos ? 'alerta' : ''}"><span>Pendiente de cobro</span><b>${moneda(r.pendiente_de_cobro.valor)}</b><small>${r.pendiente_de_cobro.pedidos} ${r.pendiente_de_cobro.pedidos === 1 ? 'pedido sin pago' : 'pedidos sin pago'}</small></div>
      <div class="mg-kpi"><span>Ticket promedio del mes</span><b>${moneda(m.ticket_promedio)}</b><small>sobre pedidos confirmados</small></div>
      <div class="mg-kpi"><span>Clientes</span><b>${r.clientes.total}</b><small>${r.clientes.activos} activos</small></div>
      <div class="mg-kpi"><span>Productos activos</span><b>${r.productos.activos}</b><small>visibles en el catálogo</small></div>
      <div class="mg-kpi ${bajo.length ? 'alerta' : ''}"><span>Inventario bajo</span><b>${bajo.length}</b><small>${r.productos.umbral} unidades o menos</small></div>
    </div>

    <div class="mg-paneles">
      <section class="mg-panel" aria-labelledby="t-7d">
        <div class="mg-panel-cab"><h2 id="t-7d">Ventas confirmadas · últimos 7 días</h2><a href="#/admin/finanzas">Ver finanzas</a></div>
        <div id="g7"></div>
      </section>
      <section class="mg-panel" aria-labelledby="t-at">
        <div class="mg-panel-cab"><h2 id="t-at">Requiere atención</h2></div>
        ${atencion ? `<ul class="mg-atencion">${atencion}</ul>` : '<div class="mg-vacio"><b>Todo al día</b>No hay pagos pendientes, envíos por cerrar ni productos con inventario bajo.</div>'}
      </section>
    </div>

    <div class="mg-paneles">
      <section class="mg-panel" aria-labelledby="t-rec">
        <div class="mg-panel-cab"><h2 id="t-rec">Pedidos recientes</h2><a href="#/admin/pedidos">Ver todos</a></div>
        ${r.recientes.length ? `<div class="table-responsive"><table class="table mb-0">
          <thead class="table-light small"><tr><th scope="col">Pedido</th><th scope="col">Cliente</th><th scope="col">Fecha</th><th scope="col">Total</th><th scope="col">Estado</th></tr></thead>
          <tbody>${r.recientes.map((p) => `<tr><td><a class="fw-bold" href="#/admin/pedidos?q=${p.id}">#${p.id}</a></td><td>${esc(p.cliente)}</td><td class="small">${fecha(p.fecha_creacion)}</td><td class="num">${moneda(p.total)}</td><td>${insigniaEstado(p.estado)}</td></tr>`).join('')}</tbody>
        </table></div>` : '<div class="mg-vacio"><b>Sin pedidos todavía</b>Cuando un cliente compre, aparecerá aquí.</div>'}
      </section>
      <section class="mg-panel" aria-labelledby="t-top">
        <div class="mg-panel-cab"><h2 id="t-top">Más vendidos</h2><span class="small text-suave">unidades en pedidos confirmados</span></div>
        <div id="gtop">${r.mas_vendidos.length ? '' : '<div class="mg-vacio"><b>Sin ventas confirmadas</b>Aún no hay productos vendidos.</div>'}</div>
      </section>
    </div>

    <section class="mg-panel" aria-labelledby="t-acc">
      <div class="mg-panel-cab"><h2 id="t-acc">Accesos rápidos</h2></div>
      <div class="mg-accesos">
        <a href="#/admin/productos?nuevo=1">${iconoAdmin('productos')}Nuevo producto</a>
        <a href="#/admin/pedidos?personalizado=1">${iconoAdmin('pedidos')}Registrar personalizado</a>
        <a href="#/admin/contenido">${iconoAdmin('contenido')}Editar la portada</a>
        <a href="#/admin/finanzas">${iconoAdmin('finanzas')}Reporte de ventas</a>
      </div>
    </section>`;

  barrasVerticales(document.getElementById('g7'),
    r.ultimos_7_dias.map((d) => ({ etiqueta: etiquetaDia(d.periodo), valor: d.ventas, detalle: `${d.pedidos} ${d.pedidos === 1 ? 'pedido' : 'pedidos'}` })),
    { titulo: 'Ventas confirmadas de los últimos 7 días' });
  if (r.mas_vendidos.length) {
    barrasHorizontales(document.getElementById('gtop'),
      r.mas_vendidos.map((p) => ({ etiqueta: p.producto, valor: p.unidades, texto: `${p.unidades} uds. · ${moneda(p.ingresos)}` })),
      { titulo: 'Productos más vendidos' });
  }
}
