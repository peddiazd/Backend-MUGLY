// Kit de interfaz del panel administrativo (v1.3.0, CR-02).
// Diseño aprobado en el prototipo navegable: iconos con tooltip, panel
// lateral (cerrar, minimizar, expandir), diálogos con cerrar y maximizar,
// menús ⋯, filtros en un solo botón, selector de período y gráficos.
// Los colores salen de los tokens --mg-* de estilos.css (css/admin.css).
import { esc, moneda, avisar } from './ui.js';

export { esc, moneda, avisar };

/* ------------------------------------------------------------- fechas */
const MES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sept', 'oct', 'nov', 'dic'];
export const DIAS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
// La API devuelve fechas UTC sin zona; se muestran en hora local del navegador.
export const aFecha = (iso) => {
  if (iso instanceof Date) return iso;
  if (iso.length <= 10) return new Date(`${iso}T12:00:00`);
  return new Date(/[zZ]|[+-]\d\d:\d\d$/.test(iso) ? iso : `${iso}Z`);
};
export const fecha = (iso) => { const d = aFecha(iso); return `${d.getDate()} ${MES[d.getMonth()]} ${d.getFullYear()}`; };
export const fechaC = (iso) => { const d = aFecha(iso); return `${d.getDate()} ${MES[d.getMonth()]}`; };
export const hora = (iso) => { const d = aFecha(iso); return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; };
export const diaISO = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const diaLocal = (s) => new Date(`${s}T12:00:00`);
export const nombreMes = (i) => MES[i];

/* ------------------------------------------------------------- iconos */
const SPRITE = 'assets/img/iconos-admin.svg';
export const ic = (n, s = 18, sw = 1.75) => `<svg class="i" width="${s}" height="${s}" stroke-width="${sw}" aria-hidden="true"><use href="${SPRITE}#i-${n}"/></svg>`;
export const ib = (icon, label, act, data = '', cls = '', dis = false) =>
  `<button type="button" class="ib ${cls}" data-act="${act}" ${data} aria-label="${esc(label)}" data-tip="${esc(label)}" ${dis ? 'disabled' : ''}>${ic(icon)}</button>`;
export const pend = (tip, txt = 'Pendiente') => `<span class="pend" tabindex="0" data-tip="${esc(tip)}">${txt}</span>`;
export const vacio = (icono, t, s) => `<div class="empty"><span class="ic-e">${ic(icono, 20)}</span><b>${t}</b><span>${s}</span></div>`;
export const SPIN = () => ic('loader', 14, 2.2).replace('class="i"', 'class="i spin"');
export const sr = '<span class="faint">—</span>';

/* ------------------------------------------------------ estados del pedido */
export const ESTADOS = {
  pendiente: { t: 'Pendiente', ic: 'clock', tip: 'Esperando que el administrador confirme el pago' },
  pagado: { t: 'Pagado', ic: 'coin', tip: 'Pago confirmado por el administrador' },
  enviado: { t: 'Enviado', ic: 'truck', tip: 'Entregado a la transportadora con guía' },
  entregado: { t: 'Entregado', ic: 'check', tip: 'El cliente recibió el pedido' },
  cancelado: { t: 'Cancelado', ic: 'ban', tip: 'Pago no concretado o el cliente desistió' },
  reembolsado: { t: 'Reembolsado', ic: 'undo', tip: 'Se devolvió todo el dinero' },
};
export const EVENTOS = { ...ESTADOS, reembolso_parcial: { t: 'Reembolso parcial', ic: 'undo' } };
export const CONFIRMADOS = ['pagado', 'enviado', 'entregado'];
export const CERRADOS = ['entregado', 'cancelado', 'reembolsado'];
export const badge = (e) => { const x = ESTADOS[e] || { t: e, ic: 'info', tip: '' }; return `<span class="st st-${e}" data-tip="${x.tip}">${ic(x.ic, 14, 2)}${x.t}</span>`; };
export const tipoMug = (t) => !t ? sr : t === 'Mágico' ? `<span class="tipo magico">${ic('spark', 14, 2)}Mágico</span>` : `<span class="tipo">${esc(t)}</span>`;

/* ------------------------------------------------------------- tooltip */
let tipT = null; let tipUltimo = 0; let tipEl = null;
const tip = () => document.getElementById('mgaTip');
function mostrarTip(el) {
  const t = tip(); const txt = el.getAttribute('data-tip'); if (!t || !txt) return;
  tipEl = el; t.textContent = txt;
  const r = el.getBoundingClientRect();
  t.style.left = '0px'; t.style.top = '0px';
  const tw = t.offsetWidth, th = t.offsetHeight;
  let x, y;
  if (el.dataset.tipside === 'r' && document.querySelector('.mga-app.side-min')) { x = r.right + 8; y = r.top + r.height / 2 - th / 2; }
  else { x = r.left + r.width / 2 - tw / 2; y = r.top - th - 8; if (y < 8) y = r.bottom + 8; }
  t.style.left = `${Math.max(8, Math.min(x, innerWidth - tw - 8))}px`; t.style.top = `${y}px`;
  t.classList.toggle('instant', Date.now() - tipUltimo < 500);
  t.classList.add('show');
}
export function ocultarTip() { clearTimeout(tipT); const t = tip(); if (t?.classList.contains('show')) tipUltimo = Date.now(); t?.classList.remove('show'); tipEl = null; }

/* --------------------------------------------- acciones (delegación de eventos) */
let accionesPagina = {};
const accionesComunes = {};
export function acciones(mapa) { accionesPagina = mapa; }
export function accionComun(nombre, fn) { accionesComunes[nombre] = fn; }
export const ejecutar = (nombre, el, ev) => (accionesPagina[nombre] || accionesComunes[nombre])?.(el, ev);

/* ---------------------------------------------------- capas (una sola vez) */
let instalado = false;
export function instalarCapas() {
  if (instalado) return;
  instalado = true;
  document.body.insertAdjacentHTML('beforeend', `
    <div class="scrim" id="mgaScrim"></div>
    <aside class="drawer" id="mgaDrawer" aria-hidden="true" role="dialog" aria-labelledby="drTitle"></aside>
    <div class="dock" id="mgaDock"></div>
    <div class="ovl" id="mgaOvl"><div class="dlg" role="alertdialog" aria-modal="true" aria-labelledby="dlgT" id="mgaDlg"></div></div>
    <div class="tip" id="mgaTip" role="tooltip"></div>`);
  document.addEventListener('pointerover', (e) => {
    if (e.pointerType === 'touch' || !document.body.classList.contains('modo-admin')) return;
    const el = e.target.closest('[data-tip]');
    if (el === tipEl) return;
    ocultarTip();
    if (!el) return;
    if (el.dataset.tipside === 'r' && !document.querySelector('.mga-app.side-min')) return;
    tipT = setTimeout(() => mostrarTip(el), Date.now() - tipUltimo < 500 ? 0 : 420);
  });
  document.addEventListener('focusin', (e) => { const el = e.target.closest?.('[data-tip]'); if (el && el.matches(':focus-visible') && document.body.classList.contains('modo-admin')) { ocultarTip(); mostrarTip(el); } });
  document.addEventListener('focusout', ocultarTip);
  document.addEventListener('scroll', ocultarTip, true);
  document.addEventListener('pointerdown', (e) => {
    ocultarTip();
    if (popAbierto && !popAbierto.el.contains(e.target) && !popAbierto.trigger.contains(e.target)) cerrarPop();
  });
  document.addEventListener('click', (e) => {
    if (!document.body.classList.contains('modo-admin')) return;
    const el = e.target.closest('[data-act]');
    if (!el || el.disabled || el.getAttribute('aria-disabled') === 'true') return;
    const nombre = el.dataset.act;
    if (!accionesPagina[nombre] && !accionesComunes[nombre]) return;
    if (el.closest('.pop .menu')) cerrarPop();
    if (el.tagName === 'BUTTON' || el.dataset.prevent) e.preventDefault();
    ejecutar(nombre, el, e);
  });
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape' || !document.body.classList.contains('modo-admin')) return;
    if (document.getElementById('mgaOvl').classList.contains('show')) return cerrarDialogo();
    if (popAbierto) { const t = popAbierto.trigger; cerrarPop(); return t.focus(); }
    if (drawerEstado && document.getElementById('mgaDrawer').classList.contains('open')) return cerrarDrawer();
    document.querySelector('.mga-app')?.classList.remove('side-open');
  });
  document.getElementById('mgaScrim').addEventListener('click', () => cerrarDrawer());
  accionComun('dr-close', () => cerrarDrawer());
  accionComun('dr-min', () => minimizarDrawer());
  accionComun('dr-restore', () => restaurarDrawer());
  accionComun('dr-wide', () => { drawerEstado.wide = !drawerEstado.wide; pintarDrawer(); document.querySelector('#mgaDrawer [data-act="dr-wide"]')?.focus(); });
  accionComun('dr-tab', (el) => { drawerEstado.tab = el.dataset.tab; pintarDrawer(); document.querySelector(`#mgaDrawer [data-tab="${el.dataset.tab}"]`)?.focus(); });
  accionComun('dlg-no', () => cerrarDialogo());
  accionComun('dlg-max', (el) => { const d = document.getElementById('mgaDlg'); d.classList.toggle('max'); const m = d.classList.contains('max'); el.innerHTML = ic(m ? 'shrink' : 'expand'); el.setAttribute('aria-label', m ? 'Restaurar tamaño' : 'Maximizar'); el.dataset.tip = el.getAttribute('aria-label'); });
  accionComun('dlg-si', async (el) => {
    const cb = confirmCb; if (!cb) return;
    el.disabled = true; el.innerHTML = `${SPIN()}Procesando…`;
    try { await cb(); cerrarDialogo(); } catch (err) { cerrarDialogo(); avisar(err.message, 'danger'); }
  });
  accionComun('copiar', async (el) => { const inp = document.getElementById(el.dataset.for); try { await navigator.clipboard.writeText(inp.value); avisar('Enlace copiado.'); } catch { inp.select(); avisar('Selecciona el enlace y cópialo con Ctrl+C.', 'warning'); } });
  accionComun('copiar-txt', async (el) => { try { await navigator.clipboard.writeText(el.dataset.txt); avisar('Copiado.'); } catch { avisar(`Copia manualmente: ${el.dataset.txt}`, 'warning'); } });
}

/* ------------------------------------------------------- diálogos */
let confirmCb = null; let confirmFoco = null;
export function dialogo(html, clase = 'dlg') {
  if (!document.getElementById('mgaOvl').classList.contains('show')) confirmFoco = document.activeElement;
  const d = document.getElementById('mgaDlg'); d.className = clase; d.innerHTML = html;
  document.getElementById('mgaOvl').classList.add('show');
  setTimeout(() => d.querySelector('[data-act="dlg-no"]')?.focus(), 30);
}
export function cerrarDialogo() { document.getElementById('mgaOvl').classList.remove('show'); confirmCb = null; confirmFoco?.focus?.(); }
export function confirmarAccion({ titulo, texto, ok = 'Confirmar', peligro = false, icono = 'alert' }, cb) {
  dialogo(`<div class="dlg-h" style="margin-bottom:8px"><h3 id="dlgT"><span class="ic-c" style="background:${peligro ? 'var(--err-bg)' : 'var(--salvia-100)'};color:${peligro ? 'var(--err)' : 'var(--verde)'};border-radius:50%">${ic(icono, 18, 2)}</span>${esc(titulo)}</h3><div class="ctl">${ib('x', 'Cerrar', 'dlg-no')}</div></div>
    <p>${texto}</p>
    <div class="dlg-f"><button class="btn btn-sec" type="button" data-act="dlg-no">Cancelar</button>${ok ? `<button class="btn ${peligro ? 'btn-danger' : 'btn-green'}" type="button" data-act="dlg-si">${esc(ok)}</button>` : ''}</div>`);
  confirmCb = cb;
}
export const pieModal = (ok = 'Guardar') => `<button class="btn btn-sec" type="button" data-act="dlg-no">Cancelar</button><button class="btn btn-green" type="submit">${ok}</button>`;
export function modal({ titulo, cuerpo, pie, alPintar, onSubmit }) {
  confirmCb = null;
  dialogo(`<form id="mForm" class="mform" novalidate><div class="dlg-h"><h3 id="dlgT">${titulo}</h3><div class="ctl">${ib('expand', 'Maximizar', 'dlg-max')}${ib('x', 'Cerrar', 'dlg-no')}</div></div><div class="form" id="mBody">${cuerpo}</div><div class="dlg-f">${pie}</div></form>`, 'dlg wide');
  const f = document.getElementById('mForm');
  f.addEventListener('submit', async (e) => { e.preventDefault(); await onSubmit?.(f); });
  f.querySelectorAll('input, textarea, select').forEach((el) => el.addEventListener('input', () => { el.closest('.fld')?.classList.remove('bad'); contador(el); }));
  alPintar?.(f);
  setTimeout(() => (f.querySelector('.fld input:not([type=checkbox]):not([type=radio]), .fld textarea') || f.querySelector('[data-act="dlg-no"]'))?.focus(), 40);
}
// Edición de un valor en un diálogo: valida, llama al servidor y avisa.
export function editarValor({ titulo, cuerpo, validar, guardar, okMsg = 'Cambios guardados.', alPintar, ok = 'Guardar' }) {
  modal({ titulo, cuerpo, alPintar, pie: pieModal(ok), onSubmit: async (f) => {
    if (!validar(f)) { f.querySelector('.fld.bad input, .fld.bad textarea, .fld.bad select')?.focus(); return; }
    const b = f.querySelector('[type=submit]'); b.disabled = true; b.innerHTML = `${SPIN()}Guardando…`; f.querySelector('.note.err')?.remove();
    try { await guardar(f); cerrarDialogo(); avisar(okMsg); }
    catch (err) { b.disabled = false; b.textContent = ok; document.getElementById('mBody').insertAdjacentHTML('afterbegin', `<div class="note err" role="alert">${ic('alert', 16, 2)}<span>No se guardó. ${esc(err.message)}</span></div>`); }
  } });
}

/* ------------------------------------------------------- popover / menú */
let popAbierto = null;
export function abrirPop(trigger, html) {
  cerrarPop();
  const p = document.createElement('div');
  p.className = 'pop'; p.innerHTML = html; p.setAttribute('role', 'dialog');
  document.body.appendChild(p);
  const r = trigger.getBoundingClientRect();
  const w = p.offsetWidth, h = p.offsetHeight;
  let x = r.right - w, y = r.bottom + 6;
  if (x < 8) x = Math.min(8 + r.left, innerWidth - w - 8);
  if (y + h > innerHeight - 8) { y = r.top - h - 6; p.style.transformOrigin = 'bottom right'; }
  p.style.left = `${Math.max(8, x)}px`; p.style.top = `${Math.max(8, y)}px`;
  requestAnimationFrame(() => p.classList.add('show'));
  popAbierto = { el: p, trigger };
  trigger.setAttribute('aria-expanded', 'true');
  setTimeout(() => p.querySelector('input,select,button:not(:disabled)')?.focus(), 20);
  return p;
}
export function cerrarPop() { if (!popAbierto) return; popAbierto.trigger.setAttribute('aria-expanded', 'false'); popAbierto.el.remove(); popAbierto = null; }
export const itemMenu = (ok, icon, txt, act, data, motivo = '', cls = '') => ok
  ? `<button type="button" role="menuitem" class="${cls}" data-act="${act}" ${data}>${ic(icon, 16)}<span>${txt}</span></button>`
  : `<button type="button" role="menuitem" disabled>${ic(icon, 16)}<span>${txt}<small>${esc(motivo)}</small></span></button>`;

/* ------------------------------------------------------- panel lateral */
let drawerEstado = null; let drawerFoco = null;
export const drawerActual = () => drawerEstado;
export function abrirDrawer(cfg) {
  const dr = document.getElementById('mgaDrawer');
  if (!dr.classList.contains('open')) drawerFoco = document.activeElement;
  drawerEstado = { ...cfg, tab: cfg.tab || (cfg.tabs ? cfg.tabs[0][0] : null), wide: !!cfg.ancho };
  pintarDrawer();
  document.getElementById('mgaDock').classList.remove('show');
  dr.classList.add('open'); dr.setAttribute('aria-hidden', 'false');
  document.getElementById('mgaScrim').classList.toggle('show', innerWidth < 960 || !!cfg.form);
  setTimeout(() => (dr.querySelector('.dr-b input:not(.sr):not([type=checkbox]):not([type=radio]), .dr-b textarea, .dr-b select') || dr.querySelector('[data-act="dr-close"]'))?.focus(), 60);
}
export function pintarDrawer() {
  const d = drawerEstado; if (!d) return;
  const dr = document.getElementById('mgaDrawer');
  dr.classList.toggle('wide', d.wide);
  const pie = d.pie ? d.pie(d.tab) : '';
  dr.innerHTML = `
    <div class="dr-h"><div class="tt"><h2 id="drTitle">${d.titulo}</h2>${d.sub ? `<div class="sub">${d.sub}</div>` : ''}</div>
      <div class="ctl">${d.form ? '' : ib('min', 'Minimizar panel', 'dr-min')}${d.form ? '' : ib(d.wide ? 'shrink' : 'expand', d.wide ? 'Reducir panel' : 'Expandir panel', 'dr-wide')}${ib('x', 'Cerrar panel', 'dr-close')}</div></div>
    ${d.tabs ? `<div class="dr-tabs" role="tablist">${d.tabs.map(([id, t]) => `<button type="button" role="tab" data-act="dr-tab" data-tab="${id}" aria-selected="${id === d.tab}">${t}</button>`).join('')}</div>` : ''}
    ${d.form ? '<form class="dr-form" novalidate style="display:contents">' : ''}
    <div class="dr-b" role="${d.tabs ? 'tabpanel' : 'region'}">${d.cuerpo(d.tab)}</div>
    ${pie ? `<div class="dr-f">${pie}</div>` : ''}
    ${d.form ? '</form>' : ''}`;
  d.alPintar?.(dr);
  if (!d.form) return;
  const f = dr.querySelector('.dr-form');
  f.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = f.querySelector('[type=submit]');
    if (!d.validar(f)) { f.querySelector('.fld.bad input, .fld.bad textarea, .fld.bad select')?.focus(); return; }
    btn.disabled = true; const txt = btn.innerHTML; btn.innerHTML = `${SPIN()}Guardando…`;
    f.querySelector('.note.err')?.remove();
    try { const r = await d.guardar(f); cerrarDrawer(); if (d.okMsg) avisar(d.okMsg); d.despues?.(r); }
    catch (err) { btn.disabled = false; btn.innerHTML = txt; f.querySelector('.dr-b').insertAdjacentHTML('afterbegin', `<div class="note err" role="alert" style="margin-bottom:14px">${ic('alert', 16, 2)}<span>No se guardó. ${esc(err.message)} Tus datos siguen en el formulario.</span></div>`); f.querySelector('.dr-b').scrollTop = 0; }
  });
  f.querySelectorAll('input, textarea, select').forEach((el) => el.addEventListener('input', () => { el.closest('.fld')?.classList.remove('bad'); contador(el); }));
}
export function cerrarDrawer() {
  const dr = document.getElementById('mgaDrawer'); if (!dr) return;
  dr.classList.remove('open'); dr.setAttribute('aria-hidden', 'true');
  document.getElementById('mgaDock').classList.remove('show'); document.getElementById('mgaScrim').classList.remove('show');
  drawerEstado = null; document.querySelectorAll('.t tr.sel').forEach((r) => r.classList.remove('sel'));
  drawerFoco?.focus?.();
}
function minimizarDrawer() {
  document.getElementById('mgaDrawer').classList.remove('open'); document.getElementById('mgaScrim').classList.remove('show');
  const dock = document.getElementById('mgaDock');
  dock.innerHTML = `${ic('restore', 16, 2)}<span>${drawerEstado.titulo}</span>${ib('expand', 'Restaurar panel', 'dr-restore')}${ib('x', 'Cerrar panel', 'dr-close')}`;
  dock.classList.add('show');
  setTimeout(() => dock.querySelector('[data-act="dr-restore"]').focus(), 40);
}
function restaurarDrawer() { document.getElementById('mgaDock').classList.remove('show'); document.getElementById('mgaDrawer').classList.add('open'); if (innerWidth < 960) document.getElementById('mgaScrim').classList.add('show'); }

/* ------------------------------------------------------- formularios */
export function contador(el) { const c = el.closest('.fld')?.querySelector('.cnt'); if (c && el.maxLength > 0) c.textContent = `${el.value.length}/${el.maxLength}`; }
export const fld = (id, label, { tipo = 'text', valor = '', max = 0, req = false, help = '', err = 'Revisa este campo.', area = false, attrs = '', opciones = null, extra = '' } = {}) => `
  <div class="fld"><label for="${id}"><span>${label}${req ? '' : ' <span class="muted" style="font-weight:400">(opcional)</span>'}${extra}</span>${max && tipo !== 'number' ? `<span class="cnt">${String(valor ?? '').length}/${max}</span>` : ''}</label>
  ${opciones ? `<select id="${id}" name="${id}" ${attrs}>${opciones.map(([v, t]) => `<option value="${esc(v)}" ${String(v) === String(valor ?? '') ? 'selected' : ''}>${esc(t)}</option>`).join('')}</select>`
    : area ? `<textarea id="${id}" name="${id}" ${max ? `maxlength="${max}"` : ''} ${attrs}>${esc(valor ?? '')}</textarea>`
      : `<input id="${id}" name="${id}" type="${tipo}" value="${esc(valor ?? '')}" ${max && tipo !== 'number' ? `maxlength="${max}"` : ''} ${attrs}>`}
  ${help ? `<span class="help">${help}</span>` : ''}<span class="errm">${err}</span></div>`;
export const marcar = (f, id, ok) => { f.querySelector(`#${id}`).closest('.fld').classList.toggle('bad', !ok); return ok; };
export const pieForm = (ok = 'Guardar') => `<button class="btn btn-sec" type="button" data-act="dr-close">Cancelar</button><button class="btn btn-green" type="submit">${ok}</button>`;
export const opts = (name, valor, lista, tipo = 'radio') => `<div class="opt-list ${lista.length > 3 ? 'cols2' : ''}">${lista.map(([v, t, n]) => `<label class="opt"><input type="${tipo}" name="${name}" value="${esc(v)}" ${(Array.isArray(valor) ? valor.includes(String(v)) : String(valor) === String(v)) ? 'checked' : ''}><span>${t}</span>${n != null ? `<small>${n}</small>` : ''}</label>`).join('')}</div>`;
export const TEL = /^[0-9+\s-]{7,20}$/;
export const CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/* ------------------------------------------------------- filtros */
export function chipsHtml(m, lista) {
  if (!lista.length) return '';
  return `<div class="chips" aria-label="Filtros aplicados">${lista.map(([t, k, v]) => `<span class="chip">${esc(t)}<button type="button" data-act="quitar-filtro" data-m="${m}" data-k="${k}" ${v != null ? `data-v="${esc(v)}"` : ''} aria-label="Quitar filtro ${esc(t)}" data-tip="Quitar">${ic('x', 12, 2.4)}</button></span>`).join('')}${lista.length > 1 ? `<button type="button" class="lnk-btn" data-act="quitar-filtro" data-m="${m}" data-k="*">Quitar todos</button>` : ''}</div>`;
}
export const filtroBtn = (act, n, tipTxt) => `<button type="button" class="ib outline" data-act="${act}" aria-label="Filtros${n ? ` (${n} aplicados)` : ''}" data-tip="${tipTxt}" aria-haspopup="dialog">${ic('filter')}${n ? `<span class="dot">${n}</span>` : ''}</button>`;
export function pieTabla(meta, act) {
  const { pagina = 1, paginas = 1, total = 0, por_pagina: pp = 20 } = meta;
  const ini = total ? (pagina - 1) * pp + 1 : 0;
  return `<div class="foot"><span>Mostrando ${ini}–${Math.min(pagina * pp, total)} de ${total}</span><span class="pg">${ib('chev-l', 'Página anterior', act, `data-v="${pagina - 1}"`, '', pagina <= 1)}<span class="tab-n" style="padding:0 6px">${pagina} / ${Math.max(1, paginas)}</span>${ib('chev-r', 'Página siguiente', act, `data-v="${pagina + 1}"`, '', pagina >= paginas)}</span></div>`;
}

/* ------------------------------------------------------- período */
export const PERIODOS = [['7d', 'Últimos 7 días'], ['30d', 'Últimos 30 días'], ['mes', 'Este mes'], ['mesant', 'Mes anterior'], ['trim', 'Últimos 90 días'], ['anio', 'Este año']];
const CLAVE = 'mga-periodo';
function leerPeriodo() { try { return JSON.parse(sessionStorage.getItem(CLAVE)) || null; } catch { return null; } }
export const periodo = leerPeriodo() || { p: 'mes', desde: '', hasta: '', agrupar: 'auto' };
function guardarPeriodo() { try { sessionStorage.setItem(CLAVE, JSON.stringify(periodo)); } catch { /* sin almacenamiento */ } }
export function rango(p = periodo.p) {
  const hoy = new Date(); hoy.setHours(12, 0, 0, 0);
  let ini = new Date(hoy), fin = new Date(hoy);
  if (p === '7d') ini.setDate(ini.getDate() - 6);
  else if (p === '30d') ini.setDate(ini.getDate() - 29);
  else if (p === 'trim') ini.setDate(ini.getDate() - 89);
  else if (p === 'mes') ini.setDate(1);
  else if (p === 'mesant') { ini = new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1, 12); fin = new Date(hoy.getFullYear(), hoy.getMonth(), 0, 12); }
  else if (p === 'anio') { ini = new Date(hoy.getFullYear(), 0, 1, 12); }
  else if (p === 'custom' && periodo.desde) { ini = diaLocal(periodo.desde); fin = diaLocal(periodo.hasta); }
  const dias = Math.round((fin - ini) / 864e5) + 1;
  const agrupar = periodo.agrupar !== 'auto' ? periodo.agrupar : dias <= 31 ? 'dia' : dias <= 120 ? 'semana' : 'mes';
  return { desde: diaISO(ini), hasta: diaISO(fin), dias, agrupar };
}
export const nomAgrupar = (a) => ({ dia: 'día', semana: 'semana', mes: 'mes' }[a]);
export const nomPeriodo = () => (periodo.p === 'custom' ? `${fechaC(periodo.desde)} – ${fechaC(periodo.hasta)}` : PERIODOS.find((x) => x[0] === periodo.p)[1]);
export const periodoBtn = () => `<button type="button" class="btn btn-sec fbtn" data-act="periodo-pop" aria-haspopup="dialog" aria-label="Período: ${esc(nomPeriodo())}. Cambiar" data-tip="Cambiar período y agrupación">${ic('cal', 16)}<span>${esc(nomPeriodo())}</span>${periodo.agrupar !== 'auto' ? `<span class="tag">por ${nomAgrupar(periodo.agrupar)}</span>` : ''}${ic('down', 14, 2)}</button>`;
export function periodoPop(el, alAplicar) {
  const r = (v) => { const x = rango(v); return `${fechaC(x.desde)} – ${fechaC(x.hasta)}`; };
  const hoy = diaISO(new Date());
  const p = abrirPop(el, `<form class="form" id="perF" style="width:320px"><b style="font-size:13.5px">Período</b>
    <div class="opt-list" role="radiogroup" aria-label="Período">${PERIODOS.map(([v, t]) => `<label class="opt"><input type="radio" name="per" value="${v}" ${periodo.p === v ? 'checked' : ''}><span>${t}</span><small>${r(v)}</small></label>`).join('')}
      <label class="opt"><input type="radio" name="per" value="custom" ${periodo.p === 'custom' ? 'checked' : ''}><span>Personalizado</span><small>elige las fechas</small></label></div>
    <div class="row2" id="perC">${fld('per-d', 'Desde', { tipo: 'date', valor: periodo.desde || rango().desde, req: true, attrs: `max="${hoy}"`, err: 'Elige la fecha inicial.' })}${fld('per-h', 'Hasta', { tipo: 'date', valor: periodo.hasta || rango().hasta, req: true, attrs: `max="${hoy}"`, err: 'Debe ser igual o posterior a la inicial.' })}</div>
    <div class="fld"><label>Agrupar gráficas por</label><div class="seg" role="group" aria-label="Agrupar por">${[['auto', 'Automático'], ['dia', 'Día'], ['semana', 'Semana'], ['mes', 'Mes']].map(([v, t]) => `<button type="button" data-g="${v}" aria-pressed="${periodo.agrupar === v}">${t}</button>`).join('')}</div></div>
    <div class="pop-f"><button type="button" class="btn btn-sec" id="perNo">Cancelar</button><button type="submit" class="btn btn-green">Aplicar</button></div></form>`);
  let g = periodo.agrupar;
  p.querySelectorAll('[data-g]').forEach((b) => b.addEventListener('click', () => { g = b.dataset.g; p.querySelectorAll('[data-g]').forEach((x) => x.setAttribute('aria-pressed', x === b)); }));
  p.querySelectorAll('#perC input').forEach((i) => i.addEventListener('focus', () => { p.querySelector('input[value=custom]').checked = true; }));
  p.querySelector('#perNo').addEventListener('click', cerrarPop);
  p.querySelector('#perF').addEventListener('submit', (e) => {
    e.preventDefault();
    const v = p.querySelector('input[name=per]:checked').value;
    if (v === 'custom') {
      const d = p.querySelector('#per-d').value, h = p.querySelector('#per-h').value;
      const okd = !!d, okh = !!h && h >= d;
      p.querySelector('#per-d').closest('.fld').classList.toggle('bad', !okd); p.querySelector('#per-h').closest('.fld').classList.toggle('bad', !okh);
      if (!okd || !okh) return;
      periodo.desde = d; periodo.hasta = h;
    }
    periodo.p = v; periodo.agrupar = g; guardarPeriodo(); cerrarPop(); alAplicar();
  });
}

/* ------------------------------------------------------- gráficos */
function niceMax(v) { if (v <= 0) return 1; const e = 10 ** Math.floor(Math.log10(v)); const f = v / e; return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * e; }
const corto = (v) => (v >= 1e6 ? `${(v / 1e6).toLocaleString('es-CO', { maximumFractionDigits: 1 })} M` : v >= 1000 ? `${Math.round(v / 1000)} mil` : String(Math.round(v * 10) / 10));
// Etiqueta corta de un período de la API ("2026-11-21" o "2026-11")
export const etiquetaPeriodo = (k) => (k.length === 7 ? MES[Number(k.slice(5)) - 1] : fechaC(k));
export function grafico(serie, { alto = 210, unidad = 'money', hl = -1, etiqueta = 'Ventas' } = {}) {
  const W = 720, H = alto, L = 58, R = 8, T = 12, B = 26;
  const maxV = Math.max(0, ...serie.map((s) => s.v));
  const max = unidad === 'money' ? niceMax(maxV) : Math.max(4, Math.ceil(maxV / 4) * 4);
  const n = serie.length || 1, cw = (W - L - R) / n, bw = Math.min(28, cw * 0.62);
  const paso = Math.ceil(n / 12);
  const y = (v) => T + (H - T - B) * (1 - v / max);
  const fmt = (v) => (unidad === 'money' ? moneda(v) : `${v} ${v === 1 ? 'unidad' : 'unidades'}`);
  let g = '';
  for (let i = 0; i <= 4; i++) { const v = (max * i) / 4; g += `<line class="gl" x1="${L}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}"/><text x="${L - 8}" y="${y(v) + 4}" text-anchor="end">${unidad === 'money' ? corto(v) : Math.round(v * 10) / 10}</text>`; }
  serie.forEach((s, i) => {
    const x = L + cw * i + (cw - bw) / 2;
    if (s.v > 0) g += `<rect class="b ${i === hl ? 'hl' : ''}" x="${x}" y="${y(s.v)}" width="${bw}" height="${H - B - y(s.v)}" rx="3" data-tip="${esc(s.lt || s.l)}: ${fmt(s.v)}${s.n != null ? ` · ${s.n} ${s.n === 1 ? 'pedido' : 'pedidos'}` : ''}"/>`;
    else g += `<rect class="z" x="${x}" y="${H - B - 2}" width="${bw}" height="2" rx="1"/>`;
    if (i % paso === 0 || i === n - 1) g += `<text x="${x + bw / 2}" y="${H - 8}" text-anchor="middle">${esc(s.l)}</text>`;
  });
  return `<div class="chart"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(etiqueta)}">${g}</svg></div>`;
}
export const trend = (u, up) => {
  if (!up && !u) return '<span class="trend eq">—</span>';
  if (!up) return '<span class="trend up" data-tip="Sin datos en el período anterior">Nuevo</span>';
  const d = Math.round(((u - up) / up) * 100);
  return `<span class="trend ${d > 0 ? 'up' : d < 0 ? 'down' : 'eq'}" tabindex="0" data-tip="Período anterior: ${up}">${d > 0 ? ic('up', 13, 2.4) : d < 0 ? ic('down', 13, 2.4) : ''}${d > 0 ? '+' : ''}${d} %</span>`;
};
