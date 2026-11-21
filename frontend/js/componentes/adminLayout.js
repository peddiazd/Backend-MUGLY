// Estructura del panel de administración: experiencia propia, separada de la
// tienda (sin su menú ni su pie). Menú lateral, encabezado y contenido.
import { estado, cerrarSesion } from '../estado.js';
import { navegar } from '../router.js';
import { esc } from './ui.js';

const ICONOS = {
  inicio: '<path d="M4 11l8-6 8 6v8a1 1 0 0 1-1 1h-4v-5h-6v5H5a1 1 0 0 1-1-1z"/>',
  pedidos: '<path d="M6 4h12l1 4H5z"/><path d="M5 8h14v11a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1z"/><path d="M9 12h6"/>',
  productos: '<path d="M5 9h11v6a4 4 0 0 1-4 4H9a4 4 0 0 1-4-4z"/><path d="M16 10.5h1.2a2.5 2.5 0 0 1 0 5H16"/><path d="M9 4.5c-.8 1 .8 1.8 0 3M12.5 4.5c-.8 1 .8 1.8 0 3"/>',
  clientes: '<circle cx="9" cy="8" r="3.2"/><path d="M3.5 19a5.5 5.5 0 0 1 11 0"/><path d="M16 5.5a3 3 0 0 1 0 5.6M17.5 14.2A5.5 5.5 0 0 1 20.5 19"/>',
  contenido: '<rect x="3.5" y="4.5" width="17" height="15" rx="2"/><path d="M3.5 15l5-5 4 4 3-3 5 5"/><circle cx="15.5" cy="8.5" r="1.4"/>',
  finanzas: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
  configuracion: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1 7 17M17 7l2.1-2.1"/>',
  cuenta: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  tienda: '<path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>',
  salir: '<path d="M15 4h4a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-4M10 16l4-4-4-4M14 12H4"/>',
  menu: '<path d="M4 7h16M4 12h16M4 17h10"/>',
};
export const iconoAdmin = (nombre, tam = 19) =>
  `<svg width="${tam}" height="${tam}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONOS[nombre]}</svg>`;

const GRUPOS = [
  { titulo: 'Gestión', secciones: [
    { ruta: '/admin', texto: 'Inicio', icono: 'inicio' },
    { ruta: '/admin/pedidos', texto: 'Pedidos', icono: 'pedidos' },
    { ruta: '/admin/productos', texto: 'Productos e inventario', icono: 'productos' },
    { ruta: '/admin/clientes', texto: 'Clientes', icono: 'clientes' },
  ] },
  { titulo: 'Tienda y negocio', secciones: [
    { ruta: '/admin/contenido', texto: 'Contenido de la tienda', icono: 'contenido' },
    { ruta: '/admin/finanzas', texto: 'Finanzas y reportes', icono: 'finanzas' },
  ] },
  { titulo: 'Sistema', secciones: [
    { ruta: '/admin/configuracion', texto: 'Configuración', icono: 'configuracion' },
    { ruta: '/admin/cuenta', texto: 'Mi cuenta', icono: 'cuenta' },
  ] },
];

const LOGO = `<svg viewBox="0 0 40 40" aria-hidden="true"><path d="M8 15h20v10a9 9 0 0 1-9 9h-2a9 9 0 0 1-9-9z" fill="#fff"/>
  <path d="M28 18h1.5a4.5 4.5 0 0 1 0 9H28" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round"/>
  <path d="M18 29.5s-5.5-3.2-5.5-6.6a3 3 0 0 1 5.5-1.7 3 3 0 0 1 5.5 1.7c0 3.4-5.5 6.6-5.5 6.6z" fill="#F2C94C"/>
  <path d="M14 5.5c-1.4 1.6 1.4 2.9 0 4.6M19 4c-1.4 1.6 1.4 2.9 0 4.6M24 5.5c-1.4 1.6 1.4 2.9 0 4.6" fill="none" stroke="#B7C5A4" stroke-width="2.2" stroke-linecap="round"/></svg>`;

/**
 * Dibuja el panel y devuelve el contenedor de la página.
 * activa: ruta de la sección actual (para marcarla en el menú).
 */
export function adminLayout(app, activa) {
  document.body.classList.add('modo-admin');
  const correo = estado.usuario?.correo ?? '';

  app.innerHTML = `
    <div class="mg-admin" id="panelAdmin">
      <aside class="mg-admin-menu" aria-label="Administración">
        <a class="mg-admin-marca" href="#/admin">${LOGO}mugly <small>ADMIN</small></a>
        <nav>
          ${GRUPOS.map((g) => `
            <p class="mg-admin-titulo">${g.titulo}</p>
            ${g.secciones.map((s) => `<a href="#${s.ruta}" class="mg-admin-enlace ${s.ruta === activa ? 'active' : ''}" ${s.ruta === activa ? 'aria-current="page"' : ''}>${iconoAdmin(s.icono)}${s.texto}</a>`).join('')}`).join('')}
        </nav>
        <div class="mg-admin-pie">
          <a class="mg-admin-enlace" href="#/">${iconoAdmin('tienda')}Ver la tienda</a>
          <button class="mg-admin-enlace" type="button" data-salir>${iconoAdmin('salir')}Cerrar sesión</button>
        </div>
      </aside>
      <div class="mg-admin-principal">
        <header class="mg-admin-cabecera">
          <button class="btn btn-light mg-admin-menu-movil" type="button" data-menu aria-label="Abrir menú de administración">${iconoAdmin('menu', 20)}</button>
          <form role="search" data-buscar-global>
            <label for="buscarAdmin" class="visually-hidden">Buscar un pedido por número o un cliente</label>
            <input id="buscarAdmin" class="form-control" type="search" placeholder="Buscar pedido # o cliente" autocomplete="off">
          </form>
          <div class="mg-admin-acciones">
            <a class="btn btn-acento btn-sm" href="#/admin/productos?nuevo=1">+ Nuevo producto</a>
            <a class="mg-avatar" href="#/admin/cuenta" title="${esc(correo)}" aria-label="Mi cuenta: ${esc(correo)}">${esc(correo.charAt(0).toUpperCase())}</a>
          </div>
        </header>
        <main class="mg-admin-contenido" id="adminContenido"></main>
      </div>
    </div>`;

  const panel = document.getElementById('panelAdmin');
  panel.querySelector('[data-salir]').addEventListener('click', () => {
    cerrarSesion();
    navegar('/ingresar');
  });
  panel.querySelector('[data-menu]').addEventListener('click', () => panel.classList.toggle('menu-abierto'));
  panel.querySelector('.mg-admin-menu').addEventListener('click', (ev) => {
    if (ev.target.closest('a')) panel.classList.remove('menu-abierto');
  });
  // Búsqueda global: un número abre el pedido; cualquier otro texto busca clientes.
  panel.querySelector('[data-buscar-global]').addEventListener('submit', (ev) => {
    ev.preventDefault();
    const texto = panel.querySelector('#buscarAdmin').value.trim();
    if (!texto) return;
    const numero = texto.replace(/^#/, '');
    navegar(/^\d+$/.test(numero)
      ? `/admin/pedidos?q=${encodeURIComponent(numero)}`
      : `/admin/clientes?q=${encodeURIComponent(texto)}`);
  });
  return document.getElementById('adminContenido');
}

// Encabezado de cada página del panel.
export const encabezadoAdmin = (titulo, descripcion = '', acciones = '') => `
  <div class="mg-admin-encabezado">
    <div><h1>${titulo}</h1>${descripcion ? `<p>${descripcion}</p>` : ''}</div>
    ${acciones ? `<div class="d-flex flex-wrap gap-2">${acciones}</div>` : ''}
  </div>`;
