// Utilidades de interfaz reutilizables.

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
