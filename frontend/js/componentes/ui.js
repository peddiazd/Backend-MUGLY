// Utilidades de interfaz reutilizables.

// Logotipo de MUGLY: mug verde con corazón amarillo y vapor salvia.
export function logo(destino = '#/') {
  return `<a class="mg-logo" href="${destino}" aria-label="MUGLY, ir al inicio">
      <span class="mg-logo-icono" aria-hidden="true">
        <svg viewBox="0 0 40 40">
          <path d="M8 15h20v10a9 9 0 0 1-9 9h-2a9 9 0 0 1-9-9z" fill="#344B36"/>
          <path d="M28 18h1.5a4.5 4.5 0 0 1 0 9H28" fill="none" stroke="#344B36" stroke-width="3" stroke-linecap="round"/>
          <path d="M18 29.5s-5.5-3.2-5.5-6.6a3 3 0 0 1 5.5-1.7 3 3 0 0 1 5.5 1.7c0 3.4-5.5 6.6-5.5 6.6z" fill="#F2C94C"/>
          <path d="M14 5.5c-1.4 1.6 1.4 2.9 0 4.6M19 4c-1.4 1.6 1.4 2.9 0 4.6M24 5.5c-1.4 1.6 1.4 2.9 0 4.6" fill="none" stroke="#B7C5A4" stroke-width="2.2" stroke-linecap="round"/>
        </svg>
      </span>
      <span class="mg-logo-texto">mugly</span>
    </a>`;
}

// Iconos de línea compartidos (un solo trazo y grosor).
const TRAZOS = {
  mas: '<path d="M12 5v14M5 12h14" stroke-width="2.6"/>',
  flecha: '<path d="M5 12h14m-6-6 6 6-6 6" stroke-width="2.2"/>',
  chat: '<path d="M5 19l1.3-3.4A7.5 7.5 0 1 1 9.3 19.4z"/>',
  lapiz: '<path d="M4 20h4L19 9l-4-4L4 16v4zM13.5 6.5l4 4"/>',
  ruta: '<circle cx="6" cy="18" r="2"/><circle cx="18" cy="6" r="2"/><path d="M8 18h6a3 3 0 0 0 0-6h-4a3 3 0 0 1 0-6h6"/>',
  caja: '<path d="M4 8l8-4 8 4-8 4-8-4z"/><path d="M4 8v8l8 4 8-4V8"/><path d="M12 12v8"/>',
  carrito: '<path d="M3 4h2l2.4 11h10.2L20 7H6.2"/><circle cx="9" cy="19.5" r="1.4"/><circle cx="17" cy="19.5" r="1.4"/>',
};
export const icono = (nombre, tam = 20) =>
  `<svg width="${tam}" height="${tam}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${TRAZOS[nombre]}</svg>`;

// Escapa texto para insertarlo con seguridad en plantillas HTML.
export function esc(valor) {
  return String(valor ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

const formatoMoneda = new Intl.NumberFormat('es-CO', {
  style: 'currency', currency: 'COP', maximumFractionDigits: 0,
});
export const moneda = (n) => formatoMoneda.format(Number(n) || 0);

export function fecha(iso) {
  if (!iso) return '—';
  const d = new Date(iso.endsWith('Z') ? iso : `${iso}Z`);
  return d.toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' });
}

const NOMBRES_ESTADO = {
  pendiente: 'Pendiente', pagado: 'Pagado', enviado: 'Enviado',
  entregado: 'Entregado', cancelado: 'Cancelado',
};
export const nombreEstado = (e) => NOMBRES_ESTADO[e] ?? e;

export function insigniaEstado(estadoPedido) {
  return `<span class="estado estado-${esc(estadoPedido)}">${esc(nombreEstado(estadoPedido))}</span>`;
}

export function cargando(texto = 'Cargando…') {
  return `<div class="d-flex align-items-center gap-2 text-suave py-5 justify-content-center" role="status">
      <span class="spinner-border spinner-border-sm" aria-hidden="true"></span><span>${esc(texto)}</span>
    </div>`;
}

export function alerta(mensaje, tipo = 'danger') {
  return `<div class="alert alert-${tipo}" role="alert">${esc(mensaje)}</div>`;
}

export function avisar(mensaje, tipo = 'success') {
  const cont = document.getElementById('toasts');
  const el = document.createElement('div');
  el.className = `toast align-items-center text-bg-${tipo} border-0`;
  el.setAttribute('role', 'status');
  el.setAttribute('aria-live', 'polite');
  el.innerHTML = `<div class="d-flex"><div class="toast-body">${esc(mensaje)}</div>
    <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Cerrar"></button></div>`;
  cont.appendChild(el);
  const toast = new bootstrap.Toast(el, { delay: 3500 });
  el.addEventListener('hidden.bs.toast', () => el.remove());
  toast.show();
}

/**
 * Muestra un modal de Bootstrap y devuelve una promesa.
 * contenido: HTML del cuerpo. Si alAceptar existe, se ejecuta al confirmar;
 * si lanza un error, el modal sigue abierto mostrando el mensaje.
 */
export function modal({ titulo, contenido, textoAceptar = 'Aceptar', claseAceptar = 'btn-primary', alAceptar }) {
  return new Promise((resolve) => {
    const el = document.createElement('div');
    el.className = 'modal fade';
    el.tabIndex = -1;
    el.innerHTML = `
      <div class="modal-dialog modal-dialog-centered">
        <form class="modal-content" novalidate>
          <div class="modal-header">
            <h2 class="modal-title h5">${esc(titulo)}</h2>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Cerrar"></button>
          </div>
          <div class="modal-body">${contenido}<div class="mg-modal-error mt-3"></div></div>
          <div class="modal-footer">
            <button type="button" class="btn btn-outline-secondary" data-bs-dismiss="modal">Cancelar</button>
            <button type="submit" class="btn ${claseAceptar}">${esc(textoAceptar)}</button>
          </div>
        </form>
      </div>`;
    document.body.appendChild(el);
    const instancia = new bootstrap.Modal(el);
    let resultado = null;

    el.querySelector('form').addEventListener('submit', async (ev) => {
      ev.preventDefault();
      const boton = el.querySelector('[type=submit]');
      const zonaError = el.querySelector('.mg-modal-error');
      zonaError.innerHTML = '';
      boton.disabled = true;
      try {
        resultado = alAceptar ? await alAceptar(el) : true;
        if (resultado === false) return;
        instancia.hide();
      } catch (error) {
        zonaError.innerHTML = alerta(error.message);
      } finally {
        boton.disabled = false;
      }
    });
    el.addEventListener('hidden.bs.modal', () => { el.remove(); resolve(resultado); });
    instancia.show();
  });
}

export const confirmar = (titulo, mensaje, textoAceptar = 'Confirmar', claseAceptar = 'btn-primary') =>
  modal({ titulo, contenido: `<p class="mb-0">${esc(mensaje)}</p>`, textoAceptar, claseAceptar });

export const enlaceWhatsApp = (numero, mensaje) =>
  `https://wa.me/${numero}?text=${encodeURIComponent(mensaje)}`;
