// Pedidos (v1.3.0, CR-02): vistas Activos y Archivo, filtros en un solo botón,
// acciones en el menú ⋯, detalle en panel lateral con reembolsos (RF31, RF32),
// pedido personalizado completo con cliente nuevo (RF29, RF31).
// Estados y transiciones: RF17, D2; pago confirmado por el administrador (D3).
import { api, descargar, textoError } from '../../api.js';
import { adminLayout, encabezadoAdmin } from '../../componentes/adminLayout.js';
import {
  esc, moneda, avisar, ic, ib, pend, vacio, sr, SPIN, ESTADOS, EVENTOS, CONFIRMADOS, CERRADOS, badge, tipoMug,
  fecha, fechaC, hora, diaISO, acciones, abrirPop, itemMenu, abrirDrawer, pintarDrawer, drawerActual, cerrarDrawer,
  confirmarAccion, modal, pieModal, cerrarDialogo, dialogo, fld, marcar, pieForm, opts, chipsHtml, filtroBtn, pieTabla, TEL, CORREO,
} from '../../componentes/adminUI.js';

const DEF = { estados: [], tipo: 'todos', tipo_mug: '', ciudad: '', desde: '', hasta: '' };
const f = { q: '', vista: 'activos', pagina: 1, ...structuredClone(DEF) };
const MOTIVOS = ['Sin inventario para cumplir el pedido', 'Producto defectuoso o dañado', 'Error en el pedido (producto o diseño equivocado)', 'El pedido no llegó', 'Otro motivo'];
const DEPARTAMENTOS = ['Amazonas', 'Antioquia', 'Arauca', 'Atlántico', 'Bogotá D.C.', 'Bolívar', 'Boyacá', 'Caldas', 'Caquetá', 'Casanare', 'Cauca', 'Cesar', 'Chocó', 'Córdoba', 'Cundinamarca', 'Guainía', 'Guaviare', 'Huila', 'La Guajira', 'Magdalena', 'Meta', 'Nariño', 'Norte de Santander', 'Putumayo', 'Quindío', 'Risaralda', 'San Andrés y Providencia', 'Santander', 'Sucre', 'Tolima', 'Valle del Cauca', 'Vaupés', 'Vichada'];
export { DEPARTAMENTOS };

const cambiarEstado = (id, cuerpo) => api(`/admin/pedidos/${id}/estado`, { metodo: 'PATCH', cuerpo });
const nombre = (p) => p.cliente_datos || {};
const docFmt = (c) => (c.numero_documento ? `${c.tipo_documento || ''} ${c.numero_documento}`.trim() : '');

export async function render(app, { query = {} } = {}) {
  const cont = adminLayout(app, '/admin/pedidos');
  if (query.q) { f.q = query.q; f.vista = 'activos'; }
  if (query.estado) { Object.assign(f, structuredClone(DEF), { estados: [query.estado], vista: 'activos' }); }
  let r = { items: [], por_estado: {}, activos: 0, archivados: 0, ciudades: [], total: 0, pagina: 1, paginas: 1 };
  let tipos = [];
  let consulta = 0; let espera = null;

  const filtrosN = () => f.estados.length + (f.tipo !== 'todos') + !!f.tipo_mug + !!f.ciudad + !!f.desde + !!f.hasta;
  const chips = () => chipsHtml('ped', [
    ...f.estados.map((e) => [`Estado: ${ESTADOS[e].t}`, 'estados', e]),
    ...(f.tipo !== 'todos' ? [[`Pedido: ${f.tipo === 'catalogo' ? 'Catálogo' : 'Personalizado'}`, 'tipo']] : []),
    ...(f.tipo_mug ? [[`Mug: ${tipos.find((t) => String(t.id) === String(f.tipo_mug))?.nombre || ''}`, 'tipo_mug']] : []),
    ...(f.ciudad ? [[`Ciudad: ${f.ciudad}`, 'ciudad']] : []),
    ...(f.desde ? [[`Desde ${fecha(f.desde)}`, 'desde']] : []),
    ...(f.hasta ? [[`Hasta ${fecha(f.hasta)}`, 'hasta']] : []),
  ]);

  function tabla() {
    if (!r.items.length) return vacio('search', 'Ningún pedido coincide', 'Prueba con otro número, nombre, documento o referencia, o quita filtros.');
    return `<div class="tw"><table class="t"><thead><tr><th>Pedido</th><th>Fecha</th><th>Hora</th><th>Nombre</th><th>Apellido</th><th>Ciudad</th><th>Estado</th><th class="ac">Acciones</th></tr></thead><tbody>
      ${r.items.map((p) => { const c = nombre(p); return `<tr data-row="${p.id}" class="${drawerActual()?.ref === `p${p.id}` ? 'sel' : ''}">
        <td class="id">#${p.id}</td><td class="tab-n">${fechaC(p.fecha_creacion)}</td><td class="tab-n">${hora(p.fecha_creacion)}</td>
        <td>${esc(c.nombre) || sr}</td><td>${esc(c.apellido) || sr}</td><td>${esc(p.envio?.ciudad) || sr}</td><td>${badge(p.estado)}</td>
        <td class="ac"><div class="acts">${ib('eye', 'Ver detalles', 'ver', `data-id="${p.id}"`)}${ib('dots', 'Más acciones', 'menu', `data-id="${p.id}" aria-haspopup="menu"`)}</div></td></tr>`; }).join('')}
      </tbody></table></div>${pieTabla(r, 'pagina')}`;
  }

  function pintar() {
    const arch = f.vista === 'archivo';
    cont.innerHTML = `
      ${encabezadoAdmin('Pedidos', arch ? 'Pedidos cerrados que ya no necesitan gestión. Siguen contando en Finanzas.' : 'Aquí se confirman pagos, se registran envíos y se cancelan pedidos.',
        `<div class="seg" role="tablist" aria-label="Lista de pedidos">${[['activos', 'Activos', r.activos], ['archivo', 'Archivo', r.archivados]].map(([v, t, n]) => `<button type="button" role="tab" data-act="vista" data-v="${v}" aria-pressed="${f.vista === v}" aria-selected="${f.vista === v}">${v === 'archivo' ? ic('box', 14, 2) : ''}${t}<span class="n">${n}</span></button>`).join('')}</div>
         <span class="sep-v"></span>
         ${arch ? '' : ib('box', 'Archivar todos los pedidos cerrados', 'archivar-todos')}
         ${ib('download', 'Exportar pedidos del mes (CSV)', 'exportar')}${arch ? '' : ib('plus', 'Registrar pedido personalizado', 'nuevo', '', 'add')}`)}
      <div class="tb">
        <div class="field-s">${ic('search', 16, 1.9)}<label class="sr" for="pq">Buscar pedido</label><input id="pq" type="search" placeholder="Pedido #, nombre, documento o referencia" value="${esc(f.q)}" autocomplete="off"></div>
        ${filtroBtn('filtros', filtrosN(), 'Filtrar por estado, tipo, ciudad y fechas')}
        <span id="pedChips">${chips()}</span>
      </div>
      <section class="card" id="pedTabla" aria-live="polite">${tabla()}</section>`;
    cont.querySelector('#pq').addEventListener('input', (e) => { f.q = e.target.value.trim(); f.pagina = 1; clearTimeout(espera); espera = setTimeout(buscar, 300); });
  }

  async function buscar() {
    const mia = ++consulta;
    const params = new URLSearchParams({ q: f.q, vista: f.vista, tipo: f.tipo, pagina: f.pagina, por_pagina: 20 });
    if (f.estados.length) params.set('estados', f.estados.join(','));
    if (f.tipo_mug) params.set('tipo_mug', f.tipo_mug);
    if (f.ciudad) params.set('ciudad', f.ciudad);
    if (f.desde) params.set('desde', f.desde);
    if (f.hasta) params.set('hasta', f.hasta);
    try {
      const datos = await api(`/admin/pedidos?${params}`);
      if (mia !== consulta) return;
      r = datos;
      const tabla$ = cont.querySelector('#pedTabla');
      if (tabla$ && document.activeElement?.id === 'pq') { tabla$.innerHTML = tabla(); cont.querySelectorAll('[data-act="vista"] .n').forEach((n, i) => { n.textContent = i ? r.archivados : r.activos; }); }
      else pintar();
    } catch (error) {
      if (mia === consulta) cont.innerHTML = `${encabezadoAdmin('Pedidos')}<div class="note err">${ic('alert', 16, 2)}<span>${esc(textoError(error))}</span></div>`;
    }
  }
  const recargar = async (id, tab) => { await buscar(); if (id && drawerActual()?.ref === `p${id}`) await verPedido(id, tab); };

  /* ---------------------------------------------------------- detalle */
  async function verPedido(id, tab) {
    let p;
    try { p = await api(`/admin/pedidos/${id}`); } catch (error) { avisar(textoError(error), 'danger'); return; }
    const c = nombre(p), e = p.envio || {};
    const pagado = p.historial.find((h) => h.estado === 'pagado');
    abrirDrawer({
      ref: `p${p.id}`, titulo: `Pedido #${p.id}`, tab,
      sub: `${badge(p.estado)}<span>${fecha(p.fecha_creacion)} · ${hora(p.fecha_creacion)}</span>${p.archivado ? '<span class="tag">Archivado</span>' : ''}`,
      tabs: [['resumen', 'Cliente y envío'], ['productos', 'Mugs'], ['pago', 'Pago'], ['historial', 'Historial'], ['reembolsos', `Reembolsos${p.reembolsos.length ? ` (${p.reembolsos.length})` : ''}`]],
      cuerpo: (t) => {
        if (t === 'resumen') return `
          <p class="sec-t">Cliente</p>
          <dl class="kv"><dt>Nombre</dt><dd>${esc(c.nombre) || '<span class="muted">Sin registrar</span>'}</dd><dt>Apellido</dt><dd>${esc(c.apellido) || '<span class="muted">Sin registrar</span>'}</dd>
            <dt>Documento</dt><dd>${esc(docFmt(c)) || '<span class="muted">Sin registrar</span>'}</dd><dt>Correo</dt><dd>${esc(c.correo)}</dd><dt>Teléfono</dt><dd>${esc(c.telefono) || '<span class="muted">Sin registrar</span>'}</dd></dl>
          <p class="sec-t">Dirección de envío</p>
          ${e.direccion ? `<dl class="kv"><dt>Dirección</dt><dd>${esc(e.direccion)}${e.complemento ? `, ${esc(e.complemento)}` : ''}</dd><dt>Ciudad</dt><dd>${esc(e.ciudad)}</dd><dt>Departamento</dt><dd>${esc(e.departamento)}</dd></dl>`
            : `<div class="note">${ic('info', 16)}<span>El cliente no tenía dirección registrada cuando hizo el pedido. Se coordina por WhatsApp.</span></div>`}
          <p class="sec-t">Transporte</p>
          ${p.transportadora ? `<dl class="kv"><dt>Transportadora</dt><dd>${esc(p.transportadora)}</dd><dt>Número de guía</dt><dd class="tab-n">${esc(p.numero_guia)}</dd></dl>`
            : `<div class="note">${ic('truck', 16)}<span>${p.estado === 'cancelado' ? 'El pedido se canceló; no tendrá envío.' : `La transportadora y la guía se registran al enviar.${p.transportadora_acordada ? ` Acordada: <b>${esc(p.transportadora_acordada)}</b>.` : ''}`}</span></div>`}
          ${p.entrega_acordada ? `<dl class="kv" style="margin-top:8px"><dt>Entrega acordada</dt><dd>${fecha(p.entrega_acordada)}</dd></dl>` : ''}`;
        if (t === 'productos') return p.tipo === 'personalizado' ? `
          <p class="sec-t">Mug personalizado · acordado por WhatsApp</p><p style="margin:0 0 14px;white-space:pre-line">${esc(p.descripcion)}</p>
          <dl class="kv"><dt>Cantidad</dt><dd>${p.cantidad_personalizado || 1}</dd><dt>Mug base</dt><dd>${esc(p.mug_base) || '<span class="muted">Sin indicar</span>'}</dd><dt>Total acordado</dt><dd><b>${moneda(p.total)}</b></dd></dl>
          <div class="note" style="margin-top:12px">${ic('info', 16)}<span>Los personalizados no descuentan inventario.</span></div>` : `
          <div class="tw"><table class="t"><thead><tr><th>Mug</th><th>Tipo</th><th class="num">Cant.</th><th class="num">Precio unit.</th><th class="num">Subtotal</th></tr></thead><tbody>
          ${p.detalles.map((d) => `<tr><td><span class="ref">${esc(d.referencia || '')}</span><br>${esc(d.producto)}</td><td>${tipoMug(d.tipo_mug)}</td><td class="num">${d.cantidad}</td><td class="num">${moneda(d.precio_unitario)}</td><td class="num">${moneda(d.subtotal)}</td></tr>`).join('')}
          </tbody></table></div>
          <dl class="kv" style="margin-top:8px"><dt>Unidades</dt><dd class="num">${p.detalles.reduce((a, d) => a + d.cantidad, 0)}</dd><dt>Envío</dt><dd style="text-align:right">${pend('El costo de envío se acuerda por WhatsApp.')}</dd><dt><b>Total</b></dt><dd class="num"><b>${moneda(p.total)}</b></dd></dl>`;
        if (t === 'pago') return `
          <dl class="kv"><dt>Estado del pago</dt><dd>${estadoPago(p)}</dd>
            ${pagado ? `<dt>Confirmado el</dt><dd>${fecha(pagado.fecha)} · ${hora(pagado.fecha)}</dd>` : ''}
            <dt>Valor</dt><dd>${moneda(p.total)}</dd>
            <dt>Método</dt><dd>WhatsApp, confirmado por el administrador ${pend('Sin pasarela de pagos (RF21 diferido, D8).', 'Sin pasarela')}</dd></dl>`;
        if (t === 'reembolsos') return reembolsosHtml(p);
        return `<ol class="tl">${p.historial.slice().reverse().map((h) => { const x = EVENTOS[h.estado] || { t: h.estado, ic: 'info' }; return `<li><span class="ic st-${h.estado}">${ic(x.ic, 15, 2)}</span><div><b>${x.t}</b><small>${fecha(h.fecha)} · ${hora(h.fecha)}</small></div></li>`; }).join('')}</ol>`;
      },
    });
    cont.querySelectorAll('.t tr[data-row]').forEach((row) => row.classList.toggle('sel', row.dataset.row === String(id)));
    verPedido.ultimo = p;
  }
  const estadoPago = (p) => (p.estado === 'reembolsado' ? `<span class="st st-reembolsado">${ic('undo', 14, 2)}Reembolsado</span>`
    : p.reembolsos.length ? `<span class="st st-reembolso_parcial">${ic('undo', 14, 2)}Reembolso parcial</span>`
      : p.estado === 'pendiente' ? `<span class="st st-pendiente">${ic('clock', 14, 2)}Por confirmar</span>`
        : p.estado === 'cancelado' ? `<span class="st st-cancelado">${ic('ban', 14, 2)}No concretado</span>` : `<span class="st st-pagado">${ic('coin', 14, 2)}Confirmado</span>`);

  function reembolsosHtml(p) {
    const pagable = CONFIRMADOS.includes(p.estado) || p.estado === 'reembolsado';
    const disp = p.total - p.reembolsado;
    const lista = p.reembolsos.length ? `<ol class="tl" style="margin-top:6px">${p.reembolsos.slice().reverse().map((x) => `<li><span class="ic st-reembolsado">${ic('undo', 15, 2)}</span><div><b>${moneda(x.monto)} · ${x.tipo === 'devolucion' ? 'Devolución con reembolso' : 'Reembolso'}</b><small>${fecha(x.fecha)} · ${hora(x.fecha)}</small><div style="font-size:13px;margin-top:4px">${esc(x.motivo)}${x.detalle ? `. ${esc(x.detalle)}` : ''}</div>${x.unidades_reingresadas ? `<small>${x.unidades_reingresadas} unidad(es) volvieron al inventario</small>` : ''}</div></li>`).join('')}</ol>` : '<p class="muted" style="font-size:13px;margin:6px 0 0">Este pedido no tiene reembolsos.</p>';
    return `<p class="sec-t">Resumen</p>
      <dl class="kv"><dt>Pagado</dt><dd>${pagable ? moneda(p.total) : '<span class="muted">Sin pago confirmado</span>'}</dd><dt>Reembolsado</dt><dd>${moneda(p.reembolsado)}</dd><dt>Disponible</dt><dd><b>${moneda(pagable ? disp : 0)}</b></dd></dl>
      ${!pagable ? `<div class="note" style="margin-top:12px">${ic('info', 16)}<span>Solo se reembolsa un pedido con pago confirmado. Un pedido pendiente se cancela.</span></div>`
        : disp <= 0 ? `<div class="note" style="margin-top:12px">${ic('check-c', 16)}<span>Se reembolsó el total del pedido.</span></div>`
          : `<div style="margin-top:14px"><button type="button" class="btn btn-green" data-act="reembolso" data-id="${p.id}">${ic('undo', 16)}Emitir reembolso o devolución</button></div>`}
      <p class="sec-t">Registro</p>${lista}`;
  }

  function emitirReembolso(p) {
    const disp = p.total - p.reembolsado, cat = p.tipo === 'catalogo';
    modal({ titulo: `Reembolso del pedido #${p.id}`,
      cuerpo: `<div class="fld"><label>Tipo</label>${opts('r-tipo', 'reembolso', [['reembolso', 'Reembolso: el cliente conserva el producto (o nunca lo recibió)'], ['devolucion', 'Devolución: el cliente devuelve el producto y se le reembolsa']])}</div>
        <div class="fld"><label>Monto</label>${opts('r-monto', 'total', [['total', `Total disponible: ${moneda(disp)}`], ['parcial', 'Parcial']])}</div>
        ${fld('r-valor', 'Monto parcial (COP)', { tipo: 'number', req: true, attrs: `min="1" max="${disp}" step="100" inputmode="numeric"`, help: `Hasta ${moneda(disp)}.`, err: `Escribe un valor entre $ 1 y ${moneda(disp)}.` })}
        ${fld('r-motivo', 'Motivo', { req: true, valor: '', opciones: [['', 'Elige el motivo'], ...MOTIVOS.map((m) => [m, m])], err: 'Elige el motivo.' })}
        ${fld('r-det', 'Detalle', { area: true, max: 1000, help: 'Qué pasó y qué se acordó con el cliente.', err: 'Cuéntanos el motivo.' })}
        ${cat ? `<label class="sw" id="r-reing-l"><input type="checkbox" id="r-reing">Reingresar al inventario las unidades devueltas (${p.detalles.map((d) => `${d.cantidad} × ${esc(d.producto)}`).join(', ')})</label>` : ''}
        <div class="note">${ic('info', 16)}<span>MUGLY no mueve dinero: el reembolso se paga por transferencia coordinada por WhatsApp y aquí queda el registro. Si reembolsas el total, el pedido pasa a “Reembolsado”.</span></div>`,
      pie: pieModal('Registrar reembolso'),
      alPintar: (fm) => {
        const upd = () => {
          fm['r-valor'].closest('.fld').style.display = fm.querySelector('[name=r-monto]:checked').value === 'parcial' ? '' : 'none';
          const dev = fm.querySelector('[name=r-tipo]:checked').value === 'devolucion';
          const l = fm.querySelector('#r-reing-l'); if (l) { l.style.display = dev ? '' : 'none'; fm.querySelector('#r-reing').checked = dev; }
        };
        upd(); fm.querySelectorAll('[name=r-monto], [name=r-tipo]').forEach((x) => x.addEventListener('change', upd));
      },
      onSubmit: async (fm) => {
        const parcial = fm.querySelector('[name=r-monto]:checked').value === 'parcial';
        const monto = parcial ? Number(fm['r-valor'].value) : null;
        let ok = !parcial || marcar(fm, 'r-valor', monto > 0 && monto <= disp);
        ok = marcar(fm, 'r-motivo', !!fm['r-motivo'].value) && ok;
        ok = marcar(fm, 'r-det', fm['r-motivo'].value !== 'Otro motivo' || !!fm['r-det'].value.trim()) && ok;
        if (!ok) return;
        const b = fm.querySelector('[type=submit]'); b.disabled = true; b.innerHTML = `${SPIN()}Registrando…`;
        try {
          const tipo = fm.querySelector('[name=r-tipo]:checked').value;
          await api(`/admin/pedidos/${p.id}/reembolsos`, { metodo: 'POST', cuerpo: { tipo, monto, motivo: fm['r-motivo'].value, detalle: fm['r-det'].value.trim() || null, reingresar: !!fm.querySelector('#r-reing')?.checked } });
          cerrarDialogo(); avisar(`Reembolso registrado en el pedido #${p.id}.`); await recargar(p.id, 'reembolsos');
        } catch (error) { b.disabled = false; b.textContent = 'Registrar reembolso'; avisar(textoError(error), 'danger'); }
      } });
  }

  /* ---------------------------------------------------------- personalizado */
  async function nuevoPersonalizado() {
    let regs = [];
    try { regs = (await api('/admin/usuarios?estado=activos&por_pagina=100')).items.filter((c) => c.nombre); } catch { /* sin lista: solo cliente nuevo */ }
    let transp = ['Servientrega', 'Interrapidísimo', 'Coordinadora', 'Envía'];
    abrirDrawer({
      form: true, ancho: true, titulo: 'Registrar pedido personalizado', sub: 'Lo acordado con el cliente por WhatsApp',
      cuerpo: () => `<div class="form">
        <fieldset class="fs"><legend>Cliente</legend>
          ${opts('n-quien', 'registrado', [['registrado', 'Ya está registrado'], ['nuevo', 'Cliente nuevo (no tiene cuenta)']])}
          <div id="n-reg">${fld('f-cli', 'Cliente', { req: true, valor: '', opciones: [['', 'Elige el cliente'], ...regs.map((c) => [c.id, `${c.nombre} ${c.apellido || ''} · ${c.numero_documento || c.correo}${c.ciudad ? ` · ${c.ciudad}` : ''}`])], err: 'Elige el cliente.' })}</div>
          <div id="n-new" class="form" style="display:none">
            <div class="row2">${fld('n-nom', 'Nombre', { max: 50, req: true, err: 'Escribe el nombre.' })}${fld('n-ape', 'Apellido', { max: 50, req: true, err: 'Escribe el apellido.' })}</div>
            <div class="row-doc">${fld('n-tdoc', 'Tipo', { valor: 'CC', req: true, opciones: [['CC', 'CC'], ['CE', 'CE'], ['TI', 'TI'], ['PA', 'Pasaporte']] })}${fld('n-doc', 'Número de documento', { max: 15, req: true, attrs: 'inputmode="numeric"', err: 'Entre 5 y 15 dígitos o letras, sin puntos.' })}</div>
            <div class="row2">${fld('n-tel', 'Celular (WhatsApp)', { tipo: 'tel', max: 20, req: true, err: 'Solo números, espacios, + o guiones (7 a 20).' })}${fld('n-mail', 'Correo', { tipo: 'email', max: 255, req: true, err: 'Escribe un correo válido.' })}</div>
            <div class="row2">${fld('n-dep', 'Departamento', { req: true, valor: '', opciones: [['', 'Elige…'], ...DEPARTAMENTOS.map((d) => [d, d])], err: 'Elige el departamento.' })}${fld('n-ciu', 'Ciudad', { max: 60, req: true, err: 'Escribe la ciudad.' })}</div>
            ${fld('n-dir', 'Dirección', { max: 120, req: true, help: 'Ejemplo: Cra 15 # 85-20', err: 'Escribe la dirección.' })}
            ${fld('n-comp', 'Complemento', { max: 80, help: 'Apartamento, torre, barrio o indicaciones.' })}
            <span class="muted" style="font-size:12px">Al registrar se genera un enlace para que el cliente cree su contraseña.</span>
          </div></fieldset>
        <fieldset class="fs"><legend>Mug acordado</legend>
          ${fld('f-desc', 'Descripción', { area: true, max: 2000, req: true, help: 'Diseño, textos, colores y lo que se acordó por WhatsApp.', err: 'Describe lo acordado.' })}
          <div class="row2">${fld('n-cant', 'Cantidad de mugs', { tipo: 'number', valor: 1, req: true, attrs: 'min="1" step="1" inputmode="numeric"', err: 'Al menos 1.' })}${fld('n-base', 'Mug base', { max: 40, help: 'Ejemplo: Clásico, Mágico.' })}</div>
          ${fld('f-tot', 'Total acordado (COP)', { tipo: 'number', req: true, attrs: 'min="1" step="100" inputmode="numeric"', err: 'Debe ser mayor a cero.' })}</fieldset>
        <fieldset class="fs"><legend>Pago y envío</legend>
          ${opts('n-pago', 'pendiente', [['pendiente', 'Pendiente de pago'], ['pagado', 'El cliente ya pagó (verificado por WhatsApp)']])}
          <div class="row2">${fld('n-tr', 'Transportadora acordada', { max: 100, attrs: 'list="trs2"', help: 'La guía se registra al enviar.' })}${fld('n-fecha', 'Entrega acordada', { tipo: 'date', attrs: `min="${diaISO(new Date())}"` })}</div>
          <datalist id="trs2">${transp.map((t) => `<option>${esc(t)}</option>`).join('')}</datalist>
          <span class="muted" style="font-size:12px">Se envía a la dirección del cliente. Los personalizados no descuentan inventario.</span></fieldset></div>`,
      alPintar: (dr) => {
        const upd = () => { const n = dr.querySelector('[name=n-quien]:checked').value === 'nuevo'; dr.querySelector('#n-reg').style.display = n ? 'none' : ''; dr.querySelector('#n-new').style.display = n ? '' : 'none'; };
        dr.querySelectorAll('[name=n-quien]').forEach((x) => x.addEventListener('change', upd));
      },
      pie: () => pieForm('Registrar pedido'),
      validar: (fm) => {
        const nuevo = fm.querySelector('[name=n-quien]:checked').value === 'nuevo';
        let ok = true;
        if (nuevo) {
          ok = marcar(fm, 'n-nom', !!fm['n-nom'].value.trim()) && ok;
          ok = marcar(fm, 'n-ape', !!fm['n-ape'].value.trim()) && ok;
          ok = marcar(fm, 'n-doc', /^[0-9A-Za-z]{5,15}$/.test(fm['n-doc'].value.trim())) && ok;
          ok = marcar(fm, 'n-tel', TEL.test(fm['n-tel'].value.trim())) && ok;
          ok = marcar(fm, 'n-mail', CORREO.test(fm['n-mail'].value.trim())) && ok;
          ok = marcar(fm, 'n-dep', !!fm['n-dep'].value) && ok;
          ok = marcar(fm, 'n-ciu', !!fm['n-ciu'].value.trim()) && ok;
          ok = marcar(fm, 'n-dir', !!fm['n-dir'].value.trim()) && ok;
        } else ok = marcar(fm, 'f-cli', !!fm['f-cli'].value) && ok;
        ok = marcar(fm, 'f-desc', !!fm['f-desc'].value.trim()) && ok;
        ok = marcar(fm, 'n-cant', Number(fm['n-cant'].value) >= 1) && ok;
        return marcar(fm, 'f-tot', Number(fm['f-tot'].value) > 0) && ok;
      },
      guardar: async (fm) => {
        let uid = Number(fm['f-cli'].value), enlace = null, creado = null;
        if (fm.querySelector('[name=n-quien]:checked').value === 'nuevo') {
          creado = await api('/admin/usuarios', { metodo: 'POST', cuerpo: {
            correo: fm['n-mail'].value.trim(), nombre: fm['n-nom'].value.trim(), apellido: fm['n-ape'].value.trim(), telefono: fm['n-tel'].value.trim(),
            tipo_documento: fm['n-tdoc'].value, numero_documento: fm['n-doc'].value.trim(), departamento: fm['n-dep'].value, ciudad: fm['n-ciu'].value.trim(),
            direccion: fm['n-dir'].value.trim(), complemento: fm['n-comp'].value.trim() || null } });
          uid = creado.id; enlace = creado.enlace;
        }
        const pedido = await api('/admin/pedidos/personalizados', { metodo: 'POST', cuerpo: {
          usuario_id: uid, descripcion: fm['f-desc'].value.trim(), total: Number(fm['f-tot'].value), cantidad: Number(fm['n-cant'].value),
          mug_base: fm['n-base'].value.trim() || null, transportadora_acordada: fm['n-tr'].value.trim() || null, entrega_acordada: fm['n-fecha'].value || null,
          pagado: fm.querySelector('[name=n-pago]:checked').value === 'pagado' } });
        return { pedido, enlace, creado };
      },
      okMsg: 'Pedido personalizado registrado.',
      despues: async ({ enlace, creado }) => { await buscar(); if (enlace) enlaceDlg(creado, enlace); },
    });
  }

  /* ---------------------------------------------------------- acciones */
  acciones({
    vista: (el) => { f.vista = el.dataset.v; f.pagina = 1; cerrarDrawer(); buscar(); },
    pagina: (el) => { f.pagina = Number(el.dataset.v); buscar(); },
    ver: (el) => verPedido(Number(el.dataset.id)),
    exportar: async () => { const hoy = new Date(); const desde = diaISO(new Date(hoy.getFullYear(), hoy.getMonth(), 1)); try { await descargar(`/admin/reportes/pedidos.csv?desde=${desde}&hasta=${diaISO(hoy)}`, `mugly-pedidos-${diaISO(hoy)}.csv`); } catch (e) { avisar(textoError(e), 'danger'); } },
    nuevo: () => nuevoPersonalizado(),
    'quitar-filtro': (el) => { const k = el.dataset.k; if (k === '*') Object.assign(f, structuredClone(DEF)); else if (k === 'estados') f.estados = f.estados.filter((x) => x !== el.dataset.v); else f[k] = DEF[k]; f.pagina = 1; buscar(); },
    filtros: (el) => {
      const n = (e) => r.por_estado?.[e] ?? 0;
      const p = abrirPop(el, `<form class="form" id="pf" style="width:360px"><b style="font-size:13.5px">Filtrar pedidos</b>
        <div class="fld"><label>Estado</label>${opts('pf-e', f.estados, Object.keys(ESTADOS).map((e) => [e, `${ic(ESTADOS[e].ic, 14, 2)}${ESTADOS[e].t}`, n(e)]), 'checkbox')}</div>
        <div class="row2">${fld('pf-tipo', 'Pedido', { valor: f.tipo, req: true, opciones: [['todos', 'Todos'], ['catalogo', 'Catálogo'], ['personalizado', 'Personalizado']] })}${fld('pf-mug', 'Tipo de mug', { valor: f.tipo_mug, req: true, opciones: [['', 'Todos'], ...tipos.map((t) => [t.id, t.nombre])] })}</div>
        ${fld('pf-ciu', 'Ciudad', { valor: f.ciudad, req: true, opciones: [['', 'Todas'], ...(r.ciudades || []).map((c) => [c, c])] })}
        <div class="row2">${fld('pf-desde', 'Desde', { tipo: 'date', valor: f.desde, req: true })}${fld('pf-hasta', 'Hasta', { tipo: 'date', valor: f.hasta, req: true })}</div>
        <div class="pop-f"><button type="button" class="btn btn-sec" id="pfL">Limpiar</button><button type="submit" class="btn btn-green">Aplicar</button></div></form>`);
      p.querySelector('#pfL').addEventListener('click', () => { Object.assign(f, structuredClone(DEF)); f.pagina = 1; p.remove(); buscar(); });
      p.querySelector('#pf').addEventListener('submit', (e) => { e.preventDefault(); const t = e.target; Object.assign(f, { estados: [...t.querySelectorAll('[name=pf-e]:checked')].map((x) => x.value), tipo: t['pf-tipo'].value, tipo_mug: t['pf-mug'].value, ciudad: t['pf-ciu'].value, desde: t['pf-desde'].value, hasta: t['pf-hasta'].value, pagina: 1 }); p.remove(); buscar(); });
    },
    menu: (el) => {
      const p = r.items.find((x) => x.id === Number(el.dataset.id)); if (!p) return;
      const arch = p.archivado, d = `data-id="${p.id}"`, m = (ok, ...a) => itemMenu(ok && !arch, ...a);
      const reemb = CONFIRMADOS.includes(p.estado) && p.reembolsado < p.total;
      abrirPop(el, `<div class="menu" role="menu" aria-label="Acciones del pedido #${p.id}">
        ${m(p.estado === 'pendiente', 'check-c', 'Confirmar pago', 'pagar', d, arch ? 'Pedido archivado' : 'Solo pedidos pendientes')}
        ${m(p.estado === 'pagado', 'truck', 'Registrar envío', 'enviar', d, arch ? 'Pedido archivado' : 'Solo pedidos pagados')}
        ${m(p.estado === 'enviado', 'check', 'Marcar como entregado', 'entregar', d, arch ? 'Pedido archivado' : 'Solo pedidos enviados')}
        <hr>${m(reemb, 'undo', 'Emitir reembolso o devolución', 'menu-reembolso', d, arch ? 'Pedido archivado' : 'Requiere pago confirmado')}
        ${arch ? itemMenu(true, 'restore', 'Restaurar a activos', 'restaurar', d) : itemMenu(CERRADOS.includes(p.estado), 'box', 'Archivar', 'archivar', d, 'Cuando esté entregado, cancelado o reembolsado')}
        <hr>${m(p.estado === 'pendiente', 'ban', 'Cancelar pedido', 'cancelar', d, arch ? 'Pedido archivado' : 'Solo antes de confirmar el pago', 'danger')}</div>`);
    },
    pagar: (el) => { const p = r.items.find((x) => x.id === Number(el.dataset.id)); confirmarAccion({ titulo: `Confirmar pago del pedido #${p.id}`, icono: 'coin', ok: 'Confirmar pago', texto: `Hazlo solo después de verificar el pago de <b>${moneda(p.total)}</b> por WhatsApp. ${p.tipo === 'catalogo' ? 'Se descontará el inventario. ' : ''}Después el pedido ya no se puede cancelar.` }, async () => { await cambiarEstado(p.id, { estado: 'pagado' }); avisar(`Pedido #${p.id} marcado como pagado.`); await recargar(p.id); }); },
    cancelar: (el) => { const id = Number(el.dataset.id); confirmarAccion({ titulo: `Cancelar el pedido #${id}`, peligro: true, ok: 'Cancelar pedido', icono: 'ban', texto: 'Úsalo si el pago no se concretó o el cliente desistió. Un pedido cancelado no se puede reactivar.' }, async () => { await cambiarEstado(id, { estado: 'cancelado' }); avisar(`Pedido #${id} cancelado.`); await recargar(id); }); },
    entregar: (el) => { const p = r.items.find((x) => x.id === Number(el.dataset.id)); confirmarAccion({ titulo: `Marcar #${p.id} como entregado`, icono: 'check-c', ok: 'Marcar entregado', texto: `Confírmalo cuando ${esc(p.transportadora)} reporte la entrega (guía ${esc(p.numero_guia)}).` }, async () => { await cambiarEstado(p.id, { estado: 'entregado' }); avisar(`Pedido #${p.id} entregado.`); await recargar(p.id); }); },
    enviar: (el) => {
      const p = r.items.find((x) => x.id === Number(el.dataset.id)), e = p.envio || {};
      abrirDrawer({ form: true, titulo: `Registrar envío · #${p.id}`, sub: e.direccion ? `${esc(e.direccion)}, ${esc(e.ciudad)}` : 'Dirección coordinada por WhatsApp',
        cuerpo: () => `<div class="form">${fld('f-tr', 'Transportadora', { valor: p.transportadora_acordada || '', max: 100, req: true, err: 'Escribe la transportadora.', attrs: 'list="trs"' })}<datalist id="trs"><option>Servientrega</option><option>Interrapidísimo</option><option>Coordinadora</option><option>Envía</option></datalist>${fld('f-gu', 'Número de guía', { max: 100, req: true, err: 'Escribe el número de guía.' })}<div class="note">${ic('info', 16)}<span>El cliente verá la guía en Mis pedidos.</span></div></div>`,
        pie: () => pieForm('Marcar como enviado'),
        validar: (fm) => { const a = marcar(fm, 'f-tr', !!fm['f-tr'].value.trim()); return marcar(fm, 'f-gu', !!fm['f-gu'].value.trim()) && a; },
        guardar: (fm) => cambiarEstado(p.id, { estado: 'enviado', transportadora: fm['f-tr'].value.trim(), numero_guia: fm['f-gu'].value.trim() }),
        okMsg: `Pedido #${p.id} marcado como enviado.`, despues: () => buscar() });
    },
    'menu-reembolso': async (el) => { const id = Number(el.dataset.id); await verPedido(id, 'reembolsos'); emitirReembolso(verPedido.ultimo); },
    reembolso: () => emitirReembolso(verPedido.ultimo),
    archivar: (el) => { const id = Number(el.dataset.id); confirmarAccion({ titulo: `Archivar el pedido #${id}`, icono: 'box', ok: 'Archivar', texto: 'Sale de la lista de pedidos activos y queda en Archivo. No cambia su estado ni las cifras de Finanzas, y puedes restaurarlo cuando quieras.' }, async () => { await api(`/admin/pedidos/${id}/archivo`, { metodo: 'PATCH', cuerpo: { archivado: true } }); cerrarDrawer(); avisar(`Pedido #${id} archivado.`); await buscar(); }); },
    restaurar: async (el) => { const id = Number(el.dataset.id); try { await api(`/admin/pedidos/${id}/archivo`, { metodo: 'PATCH', cuerpo: { archivado: false } }); cerrarDrawer(); avisar(`Pedido #${id} volvió a los activos.`); await buscar(); } catch (e) { avisar(textoError(e), 'danger'); } },
    'archivar-todos': () => confirmarAccion({ titulo: 'Archivar los pedidos cerrados', icono: 'box', ok: 'Archivar', texto: 'Pasan al Archivo todos los pedidos entregados, cancelados y reembolsados. Siguen contando en Finanzas.' }, async () => { const x = await api('/admin/pedidos/archivar-cerrados', { metodo: 'POST' }); avisar(`${x.archivados} pedidos archivados.`); await buscar(); }),
  });

  cont.innerHTML = '<div class="sk" style="height:26px;width:200px"></div>';
  try { tipos = await api('/admin/tipos-producto'); } catch { tipos = []; }
  await buscar();
}

// Enlace de un solo uso para que el cliente cree o restablezca su contraseña.
export function enlaceDlg(c, enlace) {
  const nuevo = enlace.tipo === 'activar';
  const url = `${location.origin}${location.pathname}#/restablecer?t=${encodeURIComponent(enlace.token)}`;
  const tel = c.perfil?.telefono || c.telefono;
  dialogo(`<div class="dlg-h" style="margin-bottom:8px"><h3 id="dlgT"><span class="ic-c" style="border-radius:50%">${ic('link', 18, 2)}</span>${nuevo ? 'Cliente creado: falta su contraseña' : 'Enlace listo'}</h3><div class="ctl">${ib('x', 'Cerrar', 'dlg-no')}</div></div>
    <p style="margin-bottom:12px">Envíale este enlace por WhatsApp${tel ? ` (${esc(tel)})` : ''} para que ${nuevo ? 'cree su contraseña y termine su registro' : 'elija una contraseña nueva'}. Vence el ${fecha(enlace.vence)} a las ${hora(enlace.vence)} y sirve una sola vez.</p>
    <div class="link-box"><label class="sr" for="rLink">Enlace</label><input id="rLink" readonly value="${esc(url)}"><button type="button" class="btn btn-green" data-act="copiar" data-for="rLink">${ic('copy', 15)}Copiar</button></div>
    ${nuevo ? '<p style="margin-top:10px;font-size:12px">Si se pierde, en Clientes › ⋯ › Restablecer contraseña generas otro.</p>' : ''}
    <div class="dlg-f"><button class="btn btn-sec" type="button" data-act="dlg-no">Listo</button></div>`);
}
