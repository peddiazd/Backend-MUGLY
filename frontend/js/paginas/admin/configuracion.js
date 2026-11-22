// Configuración (RF28; v1.3.0 CR-02, RF34): ajustes de la tienda con la
// estructura aprobada. El nombre se aplica en la tienda (título, pie y
// mensajes de WhatsApp). Envíos, pagos y notificaciones quedan pendientes:
// necesitan servicios o datos que no están aprobados (D8).
import { api, textoError } from '../../api.js';
import { CONFIG } from '../../config.js';
import { adminLayout, encabezadoAdmin } from '../../componentes/adminLayout.js';
import { invalidarContenido } from '../../componentes/contenidoTienda.js';
import { esc, avisar, ic, ib, pend, acciones, editarValor, fld, marcar } from '../../componentes/adminUI.js';
import { sxRow, sxSec, btnEd, fijo, sxShell, PEND_NAV } from '../../componentes/ajustes.js';

const NAV = [
  [['general', 'General', 'store', 'nombre tienda moneda zona horaria'], ['contacto', 'Contacto', 'chat', 'whatsapp telefono enlace numero'], ['inventario', 'Inventario', 'box', 'stock umbral bajo agotado alerta reponer']],
  [['apariencia', 'Apariencia', 'palette', 'colores color logo tipografia paleta estados contraste']],
  [['envios', 'Envíos', 'truck', 'transportadora costo tarifa', PEND_NAV], ['pagos', 'Pagos', 'card', 'pasarela mensaje', PEND_NAV], ['notificaciones', 'Notificaciones', 'bell', 'correo avisos', PEND_NAV]],
];
const s = { sec: 'general', q: '' };
const telWa = (n) => `+${n.slice(0, 2)} ${n.slice(2, 5)} ${n.slice(5, 8)} ${n.slice(8)}`;

// Guía de color: tokens de frontend/css/estilos.css (una sola paleta para tienda y panel)
const BASE = [['--mg-blanco', '#FFFFFF', 'Blanco', 'Fondo de la tienda, tarjetas y superficies'], ['--mg-salvia', '#B7C5A4', 'Verde salvia', 'Selecciones, menú activo, estados que van bien'], ['--mg-verde', '#344B36', 'Verde profundo', 'Marca, menú lateral, títulos, botón principal del panel'], ['--mg-amarillo', '#F2C94C', 'Amarillo', 'Acción principal y precios'], ['--mg-tinta', '#292929', 'Gris oscuro', 'Texto principal']];
const TONOS = [['--mg-salvia-50', '#F3F6EF', 'Fondo del panel'], ['--mg-salvia-100', '#E6ECDD', 'Chips y estado “Pagado”'], ['--mg-salvia-300', '#CBD6BF', 'Bordes de controles'], ['--mg-borde', '#E3E8DC', 'Líneas y separadores'], ['--mg-verde-700', '#2A3D2C', 'Hover del verde'], ['--mg-amarillo-50', '#FDF6DE', 'Avisos y “Pendiente”'], ['--mg-amarillo-600', '#E6B830', 'Hover del amarillo'], ['--mg-amarillo-800', '#6B5208', 'Texto sobre amarillo'], ['--mg-tinta-suave', '#575C54', 'Texto secundario'], ['--mg-tinta-tenue', '#6B7067', 'Fechas y ayudas'], ['--mg-neutro-50', '#F1F1EF', 'Estados cerrados'], ['--mg-error', '#9F4642', 'Errores, eliminar y “Agotado” (único color fuera de la paleta)']];
function lum(h) { const c = [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255).map((x) => (x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4)); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; }
const contraste = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
const ratio = (hex) => { const r = Math.max(contraste(hex, '#FFFFFF'), contraste(hex, '#292929')); return `<span class="tab-n" style="font-size:12px;color:${r >= 4.5 ? 'var(--verde)' : 'var(--err)'};font-weight:600" data-tip="Contraste del texto sobre este color: ${r.toFixed(2)}:1 (mínimo 4,5:1)">${r.toFixed(1)}:1</span>`; };
const sw = ([tok, hex, nom, uso]) => sxRow(`<span class="swatch" style="background:${hex}"></span>${uso ? nom : tok.replace('--mg-', '')}`, uso || nom, `<code style="font-size:12px;color:var(--tinta-2)">${tok}</code><span class="sx-val mono" style="font-size:13px">${hex}</span>${ratio(hex)}`);

export async function render(app) {
  const cont = adminLayout(app, '/admin/configuracion');
  let c = null;

  function cuerpo() {
    if (s.sec === 'general') return sxSec('Tienda',
      sxRow('Nombre de la tienda', 'Se muestra en la pestaña del navegador, el pie de página y los mensajes de WhatsApp.', `<span class="sx-val box">${esc(c.nombre)}</span>${btnEd('editar', 'nombre', 'Editar', 'Editar nombre de la tienda')}`)
      + sxRow('Moneda', 'Precios, pedidos y reportes.', `<span class="sx-val">COP · peso colombiano</span>${fijo('Definida en el sistema.')}`)
      + sxRow('Zona horaria', 'Fechas de pedidos y reportes.', `<span class="sx-val">Colombia (UTC−5)</span>${fijo('Definida en el sistema.')}`));
    if (s.sec === 'contacto') return sxSec('WhatsApp',
      sxRow('Número del negocio', 'Por aquí los clientes pagan y piden mugs personalizados. Aparece en el encabezado y en Nosotros.', `<span class="sx-val box mono">${esc(telWa(c.whatsapp))}</span>${btnEd('editar', 'whatsapp', 'Editar', 'Editar número de WhatsApp')}`)
      + sxRow('Enlace directo', 'El que usan los botones “Pagar por WhatsApp” y los personalizados.', `<span class="sx-val mono">wa.me/${esc(c.whatsapp)}</span>${ib('copy', 'Copiar enlace', 'copiar-txt', `data-txt="https://wa.me/${esc(c.whatsapp)}"`)}`));
    if (s.sec === 'inventario') return sxSec('Alertas de inventario',
      sxRow('Aviso de inventario bajo', 'Un producto visible con esta cantidad o menos se marca “Bajo · reponer”. Con 0 unidades, “Agotado”.', `<span class="sx-val box">${c.umbral_inventario_bajo} unidades o menos</span>${btnEd('editar', 'umbral', 'Editar', 'Editar aviso de inventario bajo')}`)
      + sxRow('Productos en alerta', 'Revisa los productos que necesitan reposición.', '<a class="btn btn-sec btn-sm" href="#/admin/productos?bajo=1">Ver productos</a>'));
    if (s.sec === 'apariencia') return `<div class="note" style="margin-bottom:14px">${ic('palette', 16)}<span><b>Una sola paleta para la tienda y el panel.</b> Son los tokens de <code>frontend/css/estilos.css</code>; el panel no define colores propios. Se cambian en el código.</span></div>`
      + sxSec('Paleta oficial', BASE.map(sw).join(''), fijo('Fijada por los propietarios.'))
      + sxSec('Tonos derivados y color funcional', TONOS.map(([t, h, u]) => sw([t, h, u])).join(''))
      + sxSec('Reglas de uso', `<ul style="margin:6px 0 0;padding-left:18px;display:grid;gap:6px;font-size:13.5px;color:var(--tinta-2)">
          <li><b style="color:var(--tinta)">El blanco predomina</b> en la tienda; en el panel el fondo es salvia 50 y las tarjetas son blancas.</li>
          <li><b style="color:var(--tinta)">Verde profundo</b> construye la marca: menú lateral, títulos, botón principal del panel y gráficas.</li>
          <li><b style="color:var(--tinta)">Amarillo</b> solo para la acción más importante, los precios y lo pendiente.</li>
          <li><b style="color:var(--tinta)">Rojo terroso</b> solo para errores, eliminar y productos agotados. Cancelado va en gris.</li>
          <li>Ningún estado se distingue solo por color: siempre lleva icono y texto.</li></ul>`);
    const P = {
      envios: ['Envíos', 'Costos de envío y transportadoras configurables. Hoy el envío se coordina por WhatsApp y la transportadora se escribe al registrar la guía.'],
      pagos: ['Pagos', 'Pasarela de pagos (RF21) y textos de pago editables. Hoy el pago se coordina por WhatsApp y el administrador lo confirma (D3, D8).'],
      notificaciones: ['Notificaciones', 'Avisos por correo al administrador y al cliente. MUGLY no tiene un servicio de correo aprobado.'],
    }[s.sec];
    return sxSec(P[0], `<div class="note warn">${ic('alert', 16)}<span><b>Pendiente.</b> ${P[1]} Queda registrado fuera del alcance de la versión 1.3.0 (MGL-CR-002).</span></div>`, pend('Fuera del alcance de v1.3.0'));
  }
  function pintar() {
    cont.innerHTML = `${encabezadoAdmin('Configuración', 'Ajustes de la tienda. Cada cambio se hace con su botón y se aplica al guardar.')}${sxShell(NAV, s.sec, 'sec', cuerpo(), s.q, 'cfg')}`;
    cont.querySelector('#sxq').addEventListener('input', (e) => { s.q = e.target.value; const pos = e.target.selectionStart; pintar(); const n = cont.querySelector('#sxq'); n.focus(); n.setSelectionRange(pos, pos); });
  }
  const guardar = async (datos) => { c = await api('/admin/configuracion', { metodo: 'PATCH', cuerpo: { datos } }); CONFIG.WHATSAPP = c.whatsapp; CONFIG.NOMBRE = c.nombre; document.title = `${c.nombre} · Tienda de mugs`; invalidarContenido(); };

  acciones({
    sec: (el) => { s.sec = el.dataset.k; pintar(); cont.querySelector(`[data-act="sec"][data-k="${s.sec}"]`)?.focus(); },
    editar: (el) => {
      const k = el.dataset.k;
      if (k === 'nombre') editarValor({ titulo: 'Nombre de la tienda', cuerpo: `${fld('m-v', 'Nombre', { valor: c.nombre, max: 60, req: true, err: 'Escribe un nombre de 1 a 60 caracteres.' })}<div class="note" id="mUso">${ic('globe', 16)}<span></span></div>`,
        alPintar: (f) => { const u = () => { const n = esc(f['m-v'].value.trim() || '—'); f.querySelector('#mUso span').innerHTML = `Pestaña: <b>${n} · Tienda de mugs</b> · Pie: <b>© ${new Date().getFullYear()} ${n}</b> · WhatsApp: <b>Hola ${n}, quiero pagar mi pedido…</b>`; }; u(); f['m-v'].addEventListener('input', u); },
        validar: (f) => marcar(f, 'm-v', !!f['m-v'].value.trim()), guardar: async (f) => { await guardar({ nombre: f['m-v'].value.trim() }); location.reload(); }, okMsg: 'Nombre guardado. Ya se aplica en la tienda.' });
      if (k === 'whatsapp') editarValor({ titulo: 'WhatsApp del negocio', cuerpo: `<div class="fld"><label for="m-v">Número con indicativo del país</label><div class="pre-in"><span>+</span><input id="m-v" name="m-v" class="inp" inputmode="numeric" maxlength="15" value="${esc(c.whatsapp)}"></div><span class="help">Solo dígitos. 57 para Colombia, seguido del celular.</span><span class="errm">Escribe solo dígitos, entre 10 y 15.</span></div>`,
        alPintar: (f) => f['m-v'].addEventListener('input', () => { f['m-v'].value = f['m-v'].value.replace(/\D/g, ''); }),
        validar: (f) => marcar(f, 'm-v', /^\d{10,15}$/.test(f['m-v'].value)), guardar: async (f) => { await guardar({ whatsapp: f['m-v'].value }); pintar(); }, okMsg: 'WhatsApp guardado.' });
      if (k === 'umbral') editarValor({ titulo: 'Aviso de inventario bajo', cuerpo: fld('m-v', 'Avisar con (unidades o menos)', { tipo: 'number', valor: c.umbral_inventario_bajo, req: true, attrs: 'min="0" max="1000" step="1" inputmode="numeric"', err: 'Escribe un número entero entre 0 y 1000.' }),
        validar: (f) => { const u = Number(f['m-v'].value); return marcar(f, 'm-v', f['m-v'].value !== '' && Number.isInteger(u) && u >= 0 && u <= 1000); }, guardar: async (f) => { await guardar({ umbral_inventario_bajo: Number(f['m-v'].value) }); pintar(); }, okMsg: 'Umbral guardado. Las alertas de inventario ya lo usan.' });
    },
  });

  cont.innerHTML = '<div class="sk" style="height:26px;width:200px"></div>';
  try { c = await api('/admin/configuracion'); pintar(); } catch (error) { avisar(textoError(error), 'danger'); }
}
