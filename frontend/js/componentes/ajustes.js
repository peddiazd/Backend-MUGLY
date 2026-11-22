// Estructura de ajustes (v1.3.0, CR-02, RF34), tomada de la configuración de
// Claude: buscador y grupos en el menú lateral; secciones con filas
// "etiqueta y descripción | valor y botón". Cada cambio se hace con su botón.
import { esc } from './ui.js';
import { ic } from './adminUI.js';

export const sxRow = (t, d, c) => `<div class="sx-row"><div class="k"><b>${t}</b>${d ? `<span class="d">${d}</span>` : ''}</div><div class="c">${c}</div></div>`;
export const sxSec = (t, filas, accion = '') => `<section class="sx-sec"><div class="sx-sec-h"><h2>${t}</h2>${accion}</div>${filas}</section>`;
export const btnEd = (act, k, txt, lbl) => `<button type="button" class="btn btn-sec btn-sm" data-act="${act}" data-k="${k}" aria-label="${esc(lbl)}">${txt}</button>`;
export const fijo = (tip) => `<span class="sx-fixed" tabindex="0" data-tip="${esc(tip)}">Fijo</span>`;
export const PEND_NAV = '<span class="pend" style="margin-left:auto;height:18px;font-size:10.5px">Pendiente</span>';

// grupos: [[[clave, texto, icono, palabras, insignia], ...], ...]
export function sxShell(grupos, actual, act, cuerpo, q, onBuscar) {
  const t = (q || '').toLowerCase().trim();
  const vis = grupos.map((g) => g.filter((x) => !t || `${x[1]} ${x[3] || ''}`.toLowerCase().includes(t)));
  const nav = vis.map((g) => g.map(([k, txt, icn, , badge]) => `<button type="button" data-act="${act}" data-k="${k}" aria-current="${actual === k}">${ic(icn, 17)}${txt}${badge || ''}</button>`).join('')).filter(Boolean).join('<hr>');
  return `<section class="card sx">
    <nav class="sx-nav" aria-label="Secciones">
      <div class="field-s">${ic('search', 15, 1.9)}<label class="sr" for="sxq">Buscar ajuste</label><input id="sxq" type="search" placeholder="Buscar ajuste" value="${esc(q || '')}" autocomplete="off" data-buscar="${onBuscar}"></div>
      ${nav || '<span class="none">Ningún ajuste coincide</span>'}
    </nav>
    <div class="sx-body" id="sxBody">${cuerpo}</div></section>`;
}
