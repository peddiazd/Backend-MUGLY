// Finanzas y pagos (RF26; v1.3.0 CR-02, RF32–RF33): consulta histórica.
// Resumen con reembolsos y ventas netas (RN23), ventas por período con
// comparación, historial de pagos de solo consulta y análisis por producto.
// No es contabilidad formal; no se calcula utilidad sin costos (RN20).
import { api, descargar, textoError } from '../../api.js';
import { adminLayout, encabezadoAdmin } from '../../componentes/adminLayout.js';
import {
  esc, moneda, avisar, ic, ib, pend, vacio, sr, badge, ESTADOS, fecha, fechaC, hora, DIAS, acciones, abrirPop, cerrarPop, abrirDrawer,
  rango, periodoBtn, periodoPop, nomPeriodo, nomAgrupar, grafico, etiquetaPeriodo, trend, opts, filtroBtn, pieTabla, tipoMug,
} from '../../componentes/adminUI.js';

const TABS = [['resumen', 'Resumen'], ['periodo', 'Ventas por período'], ['pagos', 'Historial de pagos'], ['productos', 'Ventas por producto']];
const PAGO = { todos: ['Todos', ''], conf: ['Confirmados', 'pagado,enviado,entregado'], por: ['Por confirmar', 'pendiente'], no: ['No concretados', 'cancelado'], reemb: ['Reembolsados', 'reembolsado'] };
const s = { tab: 'resumen', estado: 'todos', q: '', pagina: 1, prod: null };

const pct = (a, b) => (b ? Math.round(((a - b) / b) * 100) : null);
const vt = (d, tip = '') => (d == null ? '<span class="trend eq">—</span>' : `<span class="trend ${d > 0 ? 'up' : d < 0 ? 'down' : 'eq'}" ${tip ? `tabindex="0" data-tip="${esc(tip)}"` : ''}>${d > 0 ? ic('up', 13, 2.4) : d < 0 ? ic('down', 13, 2.4) : ''}${d > 0 ? '+' : ''}${d} %</span>`);
const estadoPago = (p) => (p.estado === 'reembolsado' ? `<span class="st st-reembolsado">${ic('undo', 14, 2)}Reembolsado</span>`
  : p.reembolsos?.length ? `<span class="st st-reembolso_parcial">${ic('undo', 14, 2)}Reembolso parcial</span>`
    : p.estado === 'pendiente' ? `<span class="st st-pendiente">${ic('clock', 14, 2)}Por confirmar</span>`
      : p.estado === 'cancelado' ? `<span class="st st-cancelado">${ic('ban', 14, 2)}No concretado</span>` : `<span class="st st-pagado">${ic('coin', 14, 2)}Confirmado</span>`);

export async function render(app, { query = {} } = {}) {
  const cont = adminLayout(app, '/admin/finanzas');
  if (query.tab) s.tab = query.tab;
  if (query.producto) { s.tab = 'productos'; s.prod = Number(query.producto); }
  let rep = null;

  const serie = (r) => r.serie.map((x) => ({ l: etiquetaPeriodo(x.periodo), lt: x.periodo, v: x.ventas, n: x.pedidos }));

  function resumen() {
    const i = rep.indicadores, totalE = Math.max(1, ...Object.values(rep.por_estado));
    return `
      <section class="card kpis k5" aria-label="Indicadores">
        <div class="kpi"><div class="l">Ventas confirmadas</div><div class="v">${moneda(i.ventas_confirmadas.valor)}</div><div class="s">${i.ventas_confirmadas.pedidos} pedidos · netas ${moneda(i.ventas_netas)}</div></div>
        <div class="kpi"><div class="l">Reembolsos</div><div class="v">${moneda(i.reembolsos.valor)}</div><div class="s">${i.reembolsos.cantidad} en el período · se restan de las ventas</div></div>
        <div class="kpi"><div class="l">Pendiente de cobro</div><div class="v">${moneda(i.pendiente_de_cobro.valor)}</div><div class="s">${i.pendiente_de_cobro.pedidos} pedidos · aún no es dinero recibido</div></div>
        <div class="kpi"><div class="l">Cancelados</div><div class="v">${moneda(i.cancelados.valor)}</div><div class="s">${i.cancelados.pedidos} pedidos · nunca suman a ventas</div></div>
        <div class="kpi"><div class="l">Valor promedio de compra</div><div class="v">${moneda(i.ticket_promedio)}</div><div class="s">ventas ÷ pedidos confirmados</div></div>
      </section>
      <div class="grid-2">
        <section class="card"><div class="card-h"><h2>Ventas confirmadas por ${nomAgrupar(rep.agrupar)}</h2></div><div class="card-b">${grafico(serie(rep), { alto: 230 })}</div></section>
        <section class="card"><div class="card-h"><h2>Pedidos por estado</h2><span class="muted" style="font-size:12px">${i.pedidos} en el período</span></div><div class="card-b"><ul class="list">
          ${Object.entries(rep.por_estado).map(([e, n]) => `<li>${badge(e)}<span class="grow"></span><span class="hbar"><i style="width:${(n / totalE) * 100}%;background:${e === 'cancelado' ? 'var(--neutral)' : e === 'pendiente' ? 'var(--amarillo-600)' : 'var(--verde)'}"></i></span><span class="tab-n" style="width:28px;text-align:right;font-weight:600">${n}</span></li>`).join('')}
        </ul></div></section>
      </div>
      <div class="grid-2e">
        <section class="card"><div class="card-h"><h2>Utilidad</h2></div><div class="card-b"><div class="note">${ic('info', 16)}<span>No se calcula: MUGLY no registra costos ni gastos (regla RN20). Mostrarla sin esos datos sería un número inventado.</span></div></div></section>
        <section class="card"><div class="card-h"><h2>Pasarela de pagos</h2>${pend('RF21 está diferido por la decisión D8 de los propietarios.', 'Diferida · RF21')}</div><div class="card-b"><p style="margin:0;font-size:13px;color:var(--tinta-2)">El pago se coordina por WhatsApp y el administrador lo confirma en Pedidos. Con una pasarela, aquí se verían el método, el identificador de transacción y los pagos rechazados.</p></div></section>
      </div>`;
  }

  function periodo(r) {
    const i = rep.indicadores, a = rep.anterior.indicadores, per = `${fechaC(rep.anterior.desde)} – ${fechaC(rep.anterior.hasta)}`;
    const uAct = rep.por_producto.reduce((x, p) => x + p.unidades, 0), uPrev = rep.por_producto.reduce((x, p) => x + p.unidades_anterior, 0);
    const b = serie(rep);
    const subieron = rep.por_producto.filter((f) => f.unidades > f.unidades_anterior).sort((x, y) => (y.unidades - y.unidades_anterior) - (x.unidades - x.unidades_anterior));
    const bajaron = rep.por_producto.filter((f) => f.unidades < f.unidades_anterior).sort((x, y) => (x.unidades - x.unidades_anterior) - (y.unidades - y.unidades_anterior));
    const seguir = rep.por_producto.filter((f) => f.disponible).map((f) => {
      const m = [];
      if (f.unidades_anterior > 0 && f.unidades <= f.unidades_anterior * 0.7) m.push(`bajó ${Math.round(((f.unidades_anterior - f.unidades) / f.unidades_anterior) * 100)} %`);
      if (f.unidades === 0) m.push('sin ventas en el período');
      const ritmo = f.unidades / r.dias; if (ritmo > 0 && f.stock / ritmo < 14) m.push(`stock para ≈ ${Math.round(f.stock / ritmo)} días`);
      return { f, m };
    }).filter((x) => x.m.length);
    const item = (f) => `<li><span class="grow">${esc(f.producto)}</span><span class="d">${f.unidades_anterior} → ${f.unidades} u.</span>${vt(pct(f.unidades, f.unidades_anterior))}</li>`;
    return `
      <section class="card kpis" aria-label="Indicadores frente al período anterior">
        <div class="kpi"><div class="l">Ventas confirmadas</div><div class="v">${moneda(i.ventas_confirmadas.valor)}</div><div class="s">${vt(pct(i.ventas_confirmadas.valor, a.ventas_confirmadas.valor), `Período anterior (${per}): ${moneda(a.ventas_confirmadas.valor)}`)} vs. período anterior</div></div>
        <div class="kpi"><div class="l">Pedidos confirmados</div><div class="v">${i.ventas_confirmadas.pedidos}</div><div class="s">${vt(pct(i.ventas_confirmadas.pedidos, a.ventas_confirmadas.pedidos), `Período anterior: ${a.ventas_confirmadas.pedidos}`)} vs. período anterior</div></div>
        <div class="kpi"><div class="l">Unidades vendidas</div><div class="v">${uAct}</div><div class="s">${vt(pct(uAct, uPrev), `Período anterior: ${uPrev}`)} vs. período anterior</div></div>
        <div class="kpi"><div class="l">Valor promedio de compra</div><div class="v">${moneda(i.ticket_promedio)}</div><div class="s">${vt(pct(i.ticket_promedio, a.ticket_promedio), `Período anterior: ${moneda(a.ticket_promedio)}`)} vs. período anterior</div></div>
      </section>
      <div class="grid-2e">
        <section class="card"><div class="card-h"><h2>Ventas confirmadas por ${nomAgrupar(rep.agrupar)}</h2></div><div class="card-b">${grafico(b, { alto: 250 })}</div></section>
        <section class="card"><div class="card-h"><h2>Detalle por ${nomAgrupar(rep.agrupar)}</h2><span class="muted" style="font-size:12px">${b.length}</span></div>
          <div class="tw" style="padding-top:8px;max-height:300px;overflow-y:auto"><table class="t"><thead><tr><th>Período</th><th class="num">Pedidos</th><th class="num">Ventas</th><th class="num">Valor promedio</th><th>Variación</th></tr></thead><tbody>
          ${b.map((x, k) => `<tr><td>${rep.agrupar === 'mes' ? x.l + ' ' + x.lt.slice(0, 4) : rep.agrupar === 'semana' ? `Semana del ${fechaC(x.lt)}` : fecha(x.lt)}</td><td class="num">${x.n}</td><td class="num">${moneda(x.v)}</td><td class="num">${x.n ? moneda(Math.round(x.v / x.n)) : sr}</td><td>${k ? vt(pct(x.v, b[k - 1].v), `Anterior: ${moneda(b[k - 1].v)}`) : sr}</td></tr>`).join('')}
          </tbody></table></div></section>
      </div>
      <div class="grid-3">
        <section class="card"><div class="card-h"><h2>${ic('up', 16, 2.4)} Subieron</h2><span class="muted" style="font-size:12px">vs. ${per}</span></div><div class="card-b">${subieron.length ? `<ul class="list mov-list">${subieron.map(item).join('')}</ul>` : vacio('chart', 'Ninguno subió', 'Compara con otro período.')}</div></section>
        <section class="card"><div class="card-h"><h2>${ic('down', 16, 2.4)} Bajaron</h2><span class="muted" style="font-size:12px">vs. ${per}</span></div><div class="card-b">${bajaron.length ? `<ul class="list mov-list">${bajaron.map(item).join('')}</ul>` : vacio('check-c', 'Ninguno bajó', 'Ningún producto vendió menos que antes.')}</div></section>
        <section class="card"><div class="card-h"><h2>${ic('eye', 16)} Hacer seguimiento</h2><span class="pend" tabindex="0" data-tip="Productos visibles que bajaron 30 % o más, no vendieron en el período o tienen stock para menos de 14 días al ritmo actual.">Regla</span></div><div class="card-b">${seguir.length ? `<ul class="list mov-list">${seguir.map(({ f, m }) => `<li><span class="grow">${esc(f.producto)}</span><span class="d" style="white-space:normal;text-align:right">${m.join(' · ')}</span>${ib('chart', `Analizar ${f.producto}`, 'ver-prod', `data-id="${f.producto_id}"`)}</li>`).join('')}</ul>` : vacio('check-c', 'Nada que vigilar', 'Ningún producto cumple la regla de seguimiento.')}</div></section>
      </div>`;
  }

  async function pagos(r) {
    const params = new URLSearchParams({ vista: 'todos', desde: r.desde, hasta: r.hasta, q: s.q, pagina: s.pagina, por_pagina: 20 });
    if (PAGO[s.estado][1]) params.set('estados', PAGO[s.estado][1]);
    const datos = await api(`/admin/pedidos?${params}`);
    pagos.items = datos.items;
    return `<div class="tb">
        <div class="field-s">${ic('search', 16, 1.9)}<label class="sr" for="fq">Buscar pago</label><input id="fq" type="search" placeholder="Pedido #, nombre o documento" value="${esc(s.q)}" autocomplete="off"></div>
        ${filtroBtn('fin-filtros', s.estado !== 'todos' ? 1 : 0, 'Filtrar por estado del pago')}
        ${s.estado !== 'todos' ? `<div class="chips"><span class="chip">Pago: ${PAGO[s.estado][0]}<button type="button" data-act="pago-todos" aria-label="Quitar filtro" data-tip="Quitar">${ic('x', 12, 2.4)}</button></span></div>` : ''}</div>
      <div class="note">${ic('info', 16)}<span>Historial de solo consulta. Los pagos se confirman o cancelan en <a href="#/admin/pedidos" style="color:var(--verde);font-weight:600">Pedidos</a>. Un pago es la confirmación registrada en el pedido; no hay un identificador de pago propio.</span></div>
      <section class="card">${datos.items.length ? `<div class="tw"><table class="t"><thead><tr><th>Pedido</th><th>Nombre</th><th>Apellido</th><th>Documento</th><th>Fecha del pedido</th><th>Confirmado el</th><th>Hora</th><th class="num">Valor</th><th>Estado del pago</th><th class="ac"><span class="sr">Ver</span></th></tr></thead><tbody>
        ${datos.items.map((p) => { const c = p.cliente_datos || {}; const h = p.historial.find((x) => x.estado === 'pagado'); return `<tr><td class="id">#${p.id}</td><td>${esc(c.nombre) || sr}</td><td>${esc(c.apellido) || sr}</td><td class="tab-n">${c.numero_documento ? esc(`${c.tipo_documento || ''} ${c.numero_documento}`) : sr}</td><td class="tab-n">${fecha(p.fecha_creacion)}</td><td class="tab-n">${h ? fecha(h.fecha) : sr}</td><td class="tab-n">${h ? hora(h.fecha) : sr}</td><td class="num">${moneda(p.total)}</td><td>${estadoPago(p)}</td><td class="ac">${ib('eye', `Consultar pago del pedido #${p.id}`, 'ver-pago', `data-id="${p.id}"`)}</td></tr>`; }).join('')}
      </tbody></table></div>${pieTabla(datos, 'pagina')}` : vacio('coin', 'Sin pagos que coincidan', 'Cambia el período, el filtro o la búsqueda.')}</section>`;
  }

  async function productos(r) {
    const filas = rep.por_producto;
    const activos = filas.filter((f) => f.disponible || f.unidades > 0);
    const prom = activos.length ? activos.reduce((a, f) => a + f.unidades, 0) / activos.length : 0;
    const totU = filas.reduce((a, f) => a + f.unidades, 0);
    const rot = (u) => (u === 0 ? ['sin', 'Sin ventas'] : u >= prom * 1.25 ? ['alta', 'Alta'] : u >= prom * 0.75 ? ['media', 'Media'] : ['baja', 'Baja']);
    const rotTip = `Rotación según unidades del período frente al promedio de los productos (${prom.toLocaleString('es-CO', { maximumFractionDigits: 1 })} u.): alta ≥ 125 %, media 75–125 %, baja < 75 %.`;
    if (!filas.length) return vacio('mug', 'Sin productos', 'Agrega productos para analizar sus ventas.');
    if (!s.prod || !filas.some((f) => f.producto_id === s.prod)) s.prod = filas[0].producto_id;
    const d = await api(`/admin/reportes/productos/${s.prod}?desde=${r.desde}&hasta=${r.hasta}&agrupar=${r.agrupar}`);
    const pr = d.producto;
    const maxH = d.por_hora.reduce((m, x, k) => (x.unidades > d.por_hora[m].unidades ? k : m), 0);
    const horas = d.por_hora.slice(7, 23).map((x) => ({ l: `${x.hora}h`, v: x.unidades, n: null }));
    const maxC = Math.max(1, ...d.ciudades.map((c) => c.unidades));
    return `
      <section class="card"><div class="card-h"><h2>Ranking de productos · ${esc(nomPeriodo())}</h2><span class="muted" style="font-size:12px">${totU} unidades en pedidos confirmados</span></div>
        <div class="tw" style="padding-top:8px"><table class="t"><thead><tr><th>Referencia</th><th>Producto</th><th>Tipo</th><th class="num">Unidades</th><th class="num">% del total</th><th class="num">Ingresos</th><th class="num">Pedidos</th><th class="num">Clientes</th><th>Última venta</th><th>Tendencia</th><th>Rotación</th></tr></thead><tbody>
        ${filas.map((f) => { const [rk, rt] = rot(f.unidades); return `<tr class="click ${f.producto_id === s.prod ? 'sel' : ''}" data-act="sel-prod" data-id="${f.producto_id}" tabindex="0" aria-label="Analizar ${esc(f.producto)}"><td><span class="ref">${esc(f.referencia) || sr}</span></td><td>${esc(f.producto)}${f.disponible ? '' : ' <span class="tag">Retirado</span>'}</td><td>${tipoMug(f.tipo)}</td><td class="num"><b>${f.unidades}</b></td><td class="num">${totU ? Math.round((f.unidades / totU) * 100) : 0} %</td><td class="num">${moneda(f.ingresos)}</td><td class="num">${f.pedidos}</td><td class="num">${f.clientes}</td><td class="tab-n">${f.ultima_venta ? fechaC(f.ultima_venta) : sr}</td><td>${trend(f.unidades, f.unidades_anterior)}</td><td><span class="rot rot-${rk}" tabindex="0" data-tip="${esc(rotTip)}">${rt}</span></td></tr>`; }).join('')}
        </tbody></table></div></section>
      <section class="card">
        <div class="card-h" style="padding-bottom:12px"><div><h2>${esc(pr.nombre)}</h2><span class="muted" style="font-size:12px"><span class="ref">${esc(pr.referencia || '')}</span> · ${esc(pr.tipo?.nombre || '')} · ${moneda(pr.precio)}</span></div>
          <label class="sr" for="fpSel">Producto a analizar</label><select class="sel" id="fpSel">${filas.map((f) => `<option value="${f.producto_id}" ${f.producto_id === s.prod ? 'selected' : ''}>${esc(f.referencia || '')} · ${esc(f.producto)}</option>`).join('')}</select></div>
        <div class="mini-kv">
          <div><div class="l">Unidades vendidas</div><div class="v">${d.unidades}</div><div class="s">${trend(d.unidades, filas.find((f) => f.producto_id === s.prod)?.unidades_anterior || 0)} vs. período anterior</div></div>
          <div><div class="l">Ingresos</div><div class="v">${moneda(d.ingresos)}</div><div class="s">${totU ? Math.round((d.unidades / totU) * 100) : 0} % de las unidades vendidas</div></div>
          <div><div class="l">Clientes distintos</div><div class="v">${d.clientes}</div><div class="s">${d.recompra} lo compraron más de una vez</div></div>
          <div><div class="l">Ritmo de venta</div><div class="v">${d.ritmo_semanal.toLocaleString('es-CO')} <small style="font:500 12px var(--f-ui)">u./semana</small></div><div class="s">promedio del período</div></div>
          <div><div class="l">Stock actual</div><div class="v">${pr.cantidad_stock}</div><div class="s">${d.dias_de_stock == null ? 'sin ventas para estimar' : `alcanza para ≈ ${d.dias_de_stock} días`}</div></div>
        </div></section>
      <div class="grid-2">
        <section class="card"><div class="card-h"><h2>Unidades vendidas por ${nomAgrupar(d.agrupar)}</h2></div><div class="card-b">${d.unidades ? grafico(d.serie.map((x) => ({ l: etiquetaPeriodo(x.periodo), lt: x.periodo, v: x.unidades, n: null })), { unidad: 'u', etiqueta: 'Unidades vendidas' }) : vacio('chart', 'Sin ventas en el período', 'Prueba con un período más largo.')}</div></section>
        <section class="card"><div class="card-h"><h2>A quién se vende</h2><span class="muted" style="font-size:12px">${d.clientes} clientes</span></div><div class="card-b">${d.compradores.length ? `<ul class="list">${d.compradores.slice(0, 6).map((x) => `<li><span class="grow">${esc(x.cliente)}</span><span class="muted tab-n" style="font-size:12px">${moneda(x.ingresos)}</span><span class="tab-n" style="width:44px;text-align:right;font-weight:600">${x.unidades} u.</span></li>`).join('')}</ul>` : vacio('users', 'Sin compradores', 'Nadie lo compró en este período.')}</div></section>
      </div>
      <div class="grid-3">
        <section class="card"><div class="card-h"><h2>Hora de compra</h2><span class="muted" style="font-size:12px">${d.unidades ? `más ventas a las ${d.por_hora[maxH].hora}h` : ''}</span></div><div class="card-b">${grafico(horas, { alto: 170, unidad: 'u', hl: d.unidades ? maxH - 7 : -1, etiqueta: 'Unidades por hora del día' })}</div></section>
        <section class="card"><div class="card-h"><h2>Día de la semana</h2></div><div class="card-b">${grafico(d.por_dia_semana.map((x) => ({ l: DIAS[x.dia], v: x.unidades, n: null })), { alto: 170, unidad: 'u', etiqueta: 'Unidades por día de la semana' })}</div></section>
        <section class="card"><div class="card-h"><h2>Ciudades</h2></div><div class="card-b">${d.ciudades.length ? `<ul class="list">${d.ciudades.slice(0, 6).map((c) => `<li><span class="grow">${esc(c.ciudad)}</span><span class="hbar"><i style="width:${(c.unidades / maxC) * 100}%"></i></span><span class="tab-n" style="width:36px;text-align:right;font-weight:600">${c.unidades}</span></li>`).join('')}</ul>` : vacio('map', 'Sin datos', 'No hay ventas con ciudad registrada en el período.')}</div></section>
      </div>
      <section class="card"><div class="card-h"><h2>Ventas de ${esc(pr.nombre)}</h2><span class="muted" style="font-size:12px">${d.ventas.length} registros</span></div>
        ${d.ventas.length ? `<div class="tw" style="padding-top:8px"><table class="t"><thead><tr><th>Fecha</th><th>Hora</th><th>Pedido</th><th>Cliente</th><th>Ciudad</th><th class="num">Cant.</th><th class="num">Valor</th><th>Estado</th></tr></thead><tbody>
        ${d.ventas.slice(0, 12).map((x) => `<tr><td class="tab-n">${fecha(x.fecha)}</td><td class="tab-n">${hora(x.fecha)}</td><td class="id">#${x.pedido}</td><td>${esc(x.cliente)}</td><td>${esc(x.ciudad) || sr}</td><td class="num">${x.cantidad}</td><td class="num">${moneda(x.valor)}</td><td>${badge(x.estado)}</td></tr>`).join('')}
        </tbody></table></div>` : `<div class="card-b">${vacio('mug', 'Sin ventas', 'No se vendió en el período elegido.')}</div>`}</section>`;
  }

  async function pintar() {
    const r = rango();
    const y = document.getElementById('mgaContent')?.scrollTop || 0;
    try {
      rep = await api(`/admin/reportes/ventas?desde=${r.desde}&hasta=${r.hasta}&agrupar=${r.agrupar}`);
      const cuerpo = s.tab === 'resumen' ? resumen() : s.tab === 'periodo' ? periodo(r) : s.tab === 'pagos' ? await pagos(r) : await productos(r);
      cont.innerHTML = `
        ${encabezadoAdmin('Finanzas y pagos', `Consulta histórica · ${fecha(rep.desde)} – ${fecha(rep.hasta)} · comparado con ${fecha(rep.anterior.desde)} – ${fecha(rep.anterior.hasta)} · no es contabilidad formal`,
          `${periodoBtn()}${ib('download', 'Exportar ventas del período (CSV)', 'exportar')}`)}
        <div class="seg" role="tablist" aria-label="Secciones de finanzas" style="justify-self:start">${TABS.map(([v, t]) => `<button type="button" role="tab" data-act="tab" data-v="${v}" aria-pressed="${s.tab === v}" aria-selected="${s.tab === v}">${t}</button>`).join('')}</div>
        ${cuerpo}`;
      document.getElementById('mgaContent').scrollTop = y;
      cont.querySelector('#fq')?.addEventListener('input', (e) => { s.q = e.target.value.trim(); s.pagina = 1; clearTimeout(pintar.t); pintar.t = setTimeout(async () => { await pintar(); const n = cont.querySelector('#fq'); n?.focus(); n?.setSelectionRange(s.q.length, s.q.length); }, 350); });
      cont.querySelector('#fpSel')?.addEventListener('change', (e) => { s.prod = Number(e.target.value); pintar(); });
    } catch (error) {
      cont.innerHTML = `${encabezadoAdmin('Finanzas y pagos', '', periodoBtn())}<div class="note err">${ic('alert', 16, 2)}<span>${esc(textoError(error))}</span></div>`;
    }
  }

  acciones({
    'periodo-pop': (el) => periodoPop(el, () => { s.pagina = 1; pintar(); }),
    tab: (el) => { s.tab = el.dataset.v; s.pagina = 1; pintar(); },
    pagina: (el) => { s.pagina = Number(el.dataset.v); pintar(); },
    'sel-prod': (el) => { s.prod = Number(el.dataset.id); pintar(); },
    'ver-prod': (el) => { s.tab = 'productos'; s.prod = Number(el.dataset.id); pintar(); },
    'pago-todos': () => { s.estado = 'todos'; s.pagina = 1; pintar(); },
    exportar: async () => { const r = rango(); try { await descargar(`/admin/reportes/ventas.csv?desde=${r.desde}&hasta=${r.hasta}`, `mugly-ventas-${r.desde}-a-${r.hasta}.csv`); } catch (e) { avisar(textoError(e), 'danger'); } },
    'fin-filtros': (el) => {
      const p = abrirPop(el, `<form class="form" id="ff" style="width:280px"><b style="font-size:13.5px">Filtrar pagos</b><div class="fld"><label>Estado del pago</label>${opts('ff-e', s.estado, Object.entries(PAGO).map(([k, [t]]) => [k, t]))}</div><div class="pop-f"><button type="button" class="btn btn-sec" id="ffL">Limpiar</button><button type="submit" class="btn btn-green">Aplicar</button></div></form>`);
      p.querySelector('#ffL').addEventListener('click', () => { s.estado = 'todos'; s.pagina = 1; cerrarPop(); pintar(); });
      p.querySelector('#ff').addEventListener('submit', (e) => { e.preventDefault(); s.estado = p.querySelector('[name=ff-e]:checked').value; s.pagina = 1; cerrarPop(); pintar(); });
    },
    'ver-pago': (el) => {
      const p = pagos.items.find((x) => x.id === Number(el.dataset.id)); const c = p.cliente_datos || {}; const h = p.historial.find((x) => x.estado === 'pagado');
      abrirDrawer({ titulo: `Pago del pedido #${p.id}`, sub: `${badge(p.estado)}<span class="tag">Solo consulta</span>`,
        cuerpo: () => `<dl class="kv"><dt>Cliente</dt><dd>${esc([c.nombre, c.apellido].filter(Boolean).join(' ') || c.correo)}</dd><dt>Estado del pago</dt><dd>${estadoPago(p)}</dd>
          ${h ? `<dt>Confirmado el</dt><dd>${fecha(h.fecha)} · ${hora(h.fecha)}</dd>` : ''}<dt>Valor</dt><dd>${moneda(p.total)}</dd><dt>Reembolsado</dt><dd>${moneda(p.reembolsado)}</dd>
          <dt>Método</dt><dd>WhatsApp ${pend('Sin pasarela de pagos (RF21 diferido, D8).', 'Sin pasarela')}</dd></dl>
          ${p.reembolsos.length ? `<p class="sec-t">Reembolsos</p><ul class="list">${p.reembolsos.map((x) => `<li><span class="grow">${esc(x.motivo)}</span><span class="tab-n">${moneda(x.monto)}</span></li>`).join('')}</ul>` : ''}`,
        pie: () => `<span class="l muted" style="font-size:12.5px">Los cambios se hacen en Pedidos.</span><a class="btn btn-sec" href="#/admin/pedidos?q=${p.id}">Abrir en Pedidos</a>` });
    },
  });

  cont.innerHTML = '<div class="sk" style="height:26px;width:220px"></div>';
  await pintar();
}
