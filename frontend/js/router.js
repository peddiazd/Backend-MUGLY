// Enrutador por hash (#/ruta) de la SPA (ADR-007).
import { estado, esAdmin } from './estado.js';

const rutas = [];
let paginaNoEncontrada = null;

/**
 * Registra una ruta. Los segmentos ":nombre" son parametros.
 * opciones.auth: exige sesion; opciones.admin: exige rol admin.
 */
export function ruta(patron, render, opciones = {}) {
  const claves = [];
  const expresion = new RegExp(
    '^' + patron.replace(/:(\w+)/g, (_, clave) => {
      claves.push(clave);
      return '([^/]+)';
    }) + '/?$'
  );
  rutas.push({ expresion, claves, render, opciones });
}

export function noEncontrada(render) {
  paginaNoEncontrada = render;
}

export function navegar(destino) {
  if (location.hash === `#${destino}`) resolver();
  else location.hash = destino;
}

export function rutaActual() {
  return location.hash.slice(1) || '/';
}

export async function resolver() {
  const [camino, consulta = ''] = rutaActual().split('?');
  const query = Object.fromEntries(new URLSearchParams(consulta));
  const app = document.getElementById('app');

  for (const r of rutas) {
    const coincidencia = camino.match(r.expresion);
    if (!coincidencia) continue;

    if ((r.opciones.auth || r.opciones.admin) && !estado.token) {
      navegar(`/ingresar?volver=${encodeURIComponent(rutaActual())}`);
      return;
    }
    if (r.opciones.admin && !esAdmin()) {
      app.innerHTML = `
        <div class="container py-5 text-center">
          <h1 class="h3">Acceso restringido</h1>
          <p class="text-suave">Esta sección es solo para administradores.</p>
          <a class="btn btn-primary" href="#/">Ir al inicio</a>
        </div>`;
      return;
    }

    const params = {};
    r.claves.forEach((clave, i) => { params[clave] = decodeURIComponent(coincidencia[i + 1]); });

    window.scrollTo(0, 0);
    await r.render(app, { params, query });
    document.dispatchEvent(new CustomEvent('mugly:ruta', { detail: camino }));
    return;
  }

  if (paginaNoEncontrada) await paginaNoEncontrada(app);
}

export function iniciarRouter() {
  window.addEventListener('hashchange', resolver);
  resolver();
}
