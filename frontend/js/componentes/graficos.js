// Gráficos de barras de una sola serie, con tooltip al pasar el mouse.
// Color validado (luminosidad, saturación y contraste sobre blanco): #4A8048.
import { esc, moneda } from './ui.js';

const BARRA = '#4A8048';

function escalaMaxima(valor) {
  if (valor <= 0) return 1;
  const potencia = 10 ** Math.floor(Math.log10(valor));
  return Math.ceil(valor / potencia) * potencia;
}

function conTooltip(cont) {
  const tip = cont.querySelector('.tip');
  cont.querySelectorAll('[data-t]').forEach((g) => {
    const mostrar = (x, y) => { tip.textContent = g.dataset.t; tip.style.left = `${x}px`; tip.style.top = `${y}px`; tip.style.opacity = 1; };
    g.addEventListener('mousemove', (e) => { const r = cont.getBoundingClientRect(); mostrar(e.clientX - r.left, e.clientY - r.top); });
    g.addEventListener('mouseleave', () => { tip.style.opacity = 0; });
  });
}

/** Barras verticales: datos = [{ etiqueta, valor, detalle }] (valor en COP). */
export function barrasVerticales(cont, datos, { titulo = 'Ventas por período' } = {}) {
  const W = 620, H = 230, ml = 58, mb = 30, mt = 18;
  const max = escalaMaxima(Math.max(0, ...datos.map((d) => d.valor)));
  const ancho = (W - ml) / Math.max(1, datos.length);
  const bw = Math.max(4, Math.min(34, ancho * 0.55));
  const cadaEtiqueta = Math.ceil(datos.length / 10);
  let s = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(titulo)}">`;
  [0, 0.5, 1].forEach((f) => {
    const y = mt + (H - mt - mb) * (1 - f);
    const v = max * f;
    s += `<line x1="${ml}" x2="${W}" y1="${y}" y2="${y}" stroke="#E6ECDD"/><text x="${ml - 8}" y="${y + 4}" text-anchor="end" font-size="11" fill="#575C54">${v >= 1000 ? `${Math.round(v / 1000)}k` : Math.round(v)}</text>`;
  });
  datos.forEach((d, i) => {
    const x = ml + ancho * i + (ancho - bw) / 2;
    const h = (H - mt - mb) * (d.valor / max);
    const y = H - mb - h;
    s += `<g data-t="${esc(d.etiqueta)}: ${esc(moneda(d.valor))}${d.detalle ? ` · ${esc(d.detalle)}` : ''}"><rect x="${ml + ancho * i}" y="${mt}" width="${ancho}" height="${H - mt - mb}" fill="transparent"/>`;
    if (d.valor > 0) s += `<path d="M${x},${H - mb} V${y + 4} q0,-4 4,-4 h${Math.max(0, bw - 8)} q4,0 4,4 V${H - mb} Z" fill="${BARRA}"/>`;
    s += '</g>';
    if (i % cadaEtiqueta === 0) s += `<text x="${x + bw / 2}" y="${H - 10}" text-anchor="middle" font-size="11" fill="#575C54">${esc(d.etiqueta)}</text>`;
  });
  s += `<line x1="${ml}" x2="${W}" y1="${H - mb}" y2="${H - mb}" stroke="#B7C5A4"/></svg><div class="tip" role="status"></div>`;
  cont.innerHTML = `<div class="mg-grafico">${s}</div>`;
  conTooltip(cont.firstElementChild);
}

/** Barras horizontales: datos = [{ etiqueta, valor, texto }]. */
export function barrasHorizontales(cont, datos, { titulo = 'Comparación' } = {}) {
  const W = 440, fila = 34, ml = 150, H = datos.length * fila + 6;
  const max = Math.max(1, ...datos.map((d) => d.valor));
  let s = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(titulo)}">`;
  datos.forEach((d, i) => {
    const y = 4 + i * fila;
    const w = Math.max(6, (W - ml - 46) * (d.valor / max));
    const nombre = d.etiqueta.length > 22 ? `${d.etiqueta.slice(0, 21)}…` : d.etiqueta;
    s += `<g data-t="${esc(d.etiqueta)}: ${esc(d.texto ?? d.valor)}"><rect x="0" y="${y}" width="${W}" height="${fila - 4}" fill="transparent"/>
      <text x="${ml - 10}" y="${y + 19}" text-anchor="end" font-size="12" fill="#292929">${esc(nombre)}</text>
      <path d="M${ml},${y + 5} h${w - 4} q4,0 4,4 v12 q0,4 -4,4 h-${w - 4} Z" fill="${BARRA}"/>
      <text x="${ml + w + 8}" y="${y + 19}" font-size="12" font-weight="700" fill="#292929">${esc(d.valor)}</text></g>`;
  });
  s += '</svg><div class="tip" role="status"></div>';
  cont.innerHTML = `<div class="mg-grafico">${s}</div>`;
  conTooltip(cont.firstElementChild);
}
