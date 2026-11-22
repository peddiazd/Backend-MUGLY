// Estructura del panel de administración (v1.3.0, CR-02): menú lateral verde
// que se contrae, barra superior con el nombre de la tienda y área de trabajo.
// Cada sección del menú es su propia página de la SPA (#/admin/...).
import { estado, cerrarSesion } from '../estado.js';
import { navegar } from '../router.js';
import { CONFIG } from '../config.js';
import { esc } from './ui.js';
import { ic, instalarCapas, cerrarDrawer, cerrarPop, ocultarTip } from './adminUI.js';

const SECCIONES = [
  ['Gestión', [['/admin', 'Inicio', 'home'], ['/admin/pedidos', 'Pedidos', 'bag'], ['/admin/productos', 'Productos e inventario', 'mug'], ['/admin/clientes', 'Clientes', 'users']]],
  ['Tienda y negocio', [['/admin/contenido', 'Contenido de la tienda', 'layout'], ['/admin/finanzas', 'Finanzas y pagos', 'chart']]],
  ['Sistema', [['/admin/configuracion', 'Configuración', 'gear'], ['/admin/cuenta', 'Mi cuenta', 'user']]],
];

const LOGO = `<svg viewBox="0 0 40 40" aria-hidden="true"><path d="M8 15h20v10a9 9 0 0 1-9 9h-2a9 9 0 0 1-9-9z" fill="#fff"/><path d="M28 18h1.5a4.5 4.5 0 0 1 0 9H28" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round"/><path d="M18 29.5s-5.5-3.2-5.5-6.6a3 3 0 0 1 5.5-1.7 3 3 0 0 1 5.5 1.7c0 3.4-5.5 6.6-5.5 6.6z" fill="#F2C94C"/><path d="M14 5.5c-1.4 1.6 1.4 2.9 0 4.6M19 4c-1.4 1.6 1.4 2.9 0 4.6M24 5.5c-1.4 1.6 1.4 2.9 0 4.6" fill="none" stroke="#B7C5A4" stroke-width="2.2" stroke-linecap="round"/></svg>`;

let menuMin = false;

/** Dibuja el panel y devuelve el contenedor de la página. activa: ruta actual. */
export function adminLayout(app, activa) {
  document.body.classList.add('modo-admin');
  instalarCapas();
  cerrarDrawer(); cerrarPop(); ocultarTip();
  const correo = estado.usuario?.correo ?? '';

  app.innerHTML = `
    <div class="mga-app ${menuMin ? 'side-min' : ''}" id="panelAdmin">
      <aside class="mga-side" aria-label="Administración">
        <a class="mga-logo" href="#/admin">${LOGO}<span>mugly <small>ADMIN</small></span></a>
        <nav class="mga-nav">
          ${SECCIONES.map(([t, s]) => `<p class="mga-nav-t">${t}</p>${s.map(([r, txt, icn]) => `<a href="#${r}" ${r === activa ? 'aria-current="page"' : ''} data-tipside="r" data-tip="${txt}">${ic(icn)}<span class="lbl">${txt}</span></a>`).join('')}`).join('')}
        </nav>
        <div class="mga-side-foot">
          <button type="button" data-salir data-tipside="r" data-tip="Cerrar sesión">${ic('logout')}<span class="lbl">Cerrar sesión</span></button>
        </div>
      </aside>
      <div class="mga-main">
        <header class="mga-top">
          <button class="ib mga-menu-btn" type="button" data-menu aria-label="Abrir menú" data-tip="Abrir menú">${ic('menu', 20)}</button>
          <button class="ib mga-collapse-btn" type="button" data-min aria-label="Contraer menú lateral" data-tip="Contraer o expandir el menú">${ic('sidebar')}</button>
          <a class="mga-store" href="#/" data-tip="Ver la tienda (el nombre viene de Configuración)">${ic('store', 16)}<span>${esc(CONFIG.NOMBRE || 'MUGLY')}</span><small>· Ver la tienda</small></a>
          <div class="mga-top-r"><a class="avatar" href="#/admin/cuenta" aria-label="Mi cuenta" data-tip="Mi cuenta · ${esc(correo)}">${esc(correo.charAt(0).toUpperCase())}</a></div>
        </header>
        <main class="mga-content" id="mgaContent" tabindex="-1"><div class="mga-content-in" id="adminContenido"></div></main>
      </div>
    </div>`;

  const panel = document.getElementById('panelAdmin');
  panel.querySelector('[data-salir]').addEventListener('click', () => { document.body.classList.remove('modo-admin'); cerrarSesion(); navegar('/ingresar'); });
  panel.querySelector('[data-menu]').addEventListener('click', () => panel.classList.add('side-open'));
  panel.querySelector('[data-min]').addEventListener('click', () => { menuMin = !menuMin; panel.classList.toggle('side-min', menuMin); });
  panel.querySelector('.mga-side').addEventListener('click', (ev) => { if (ev.target.closest('a')) panel.classList.remove('side-open'); });
  return document.getElementById('adminContenido');
}

// Encabezado de cada página del panel.
export const encabezadoAdmin = (titulo, descripcion = '', acciones = '') => `
  <div class="ph"><div><h1>${titulo}</h1>${descripcion ? `<p>${descripcion}</p>` : ''}</div>${acciones ? `<div class="ph-act">${acciones}</div>` : ''}</div>`;
