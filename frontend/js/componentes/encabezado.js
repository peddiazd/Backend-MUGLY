// Encabezado y pie de pagina, que se actualizan con el estado global.
import { estado, suscribir, esAdmin, unidadesCarrito, cerrarSesion } from '../estado.js';
import { navegar, rutaActual } from '../router.js';
import { esc, logo } from './ui.js';
import { CONFIG } from '../config.js';

const ENLACES = [
  { ruta: '/', texto: 'Inicio' },
  { ruta: '/catalogo', texto: 'Catálogo' },
  { ruta: '/personalizados', texto: 'Personalizados' },
  { ruta: '/nosotros', texto: 'Nosotros' },
];

function activo(rutaEnlace) {
  const actual = rutaActual().split('?')[0];
  if (rutaEnlace === '/') return actual === '/';
  return actual.startsWith(rutaEnlace);
}

function renderEncabezado() {
  const unidades = unidadesCarrito();
  const usuario = estado.usuario;

  const cuenta = usuario
    ? `<div class="dropdown">
         <button class="btn btn-light dropdown-toggle d-flex align-items-center gap-2 px-2" type="button" data-bs-toggle="dropdown" aria-expanded="false" aria-label="Mi cuenta: ${esc(usuario.correo)}">
           <span class="mg-avatar" aria-hidden="true">${esc(usuario.correo.charAt(0).toUpperCase())}</span>
         </button>
         <ul class="dropdown-menu dropdown-menu-end">
           <li><span class="dropdown-item-text small text-suave text-truncate d-block" style="max-width:240px">${esc(usuario.correo)}</span></li>
           <li><a class="dropdown-item" href="#/mis-pedidos">Mis pedidos</a></li>
           ${esAdmin() ? '<li><a class="dropdown-item" href="#/admin/pedidos">Panel de administración</a></li>' : ''}
           <li><hr class="dropdown-divider"></li>
           <li><button class="dropdown-item" type="button" data-accion="salir">Cerrar sesión</button></li>
         </ul>
       </div>`
    : '<a class="btn btn-primary" href="#/ingresar">Ingresar</a>';

  document.getElementById('encabezado').innerHTML = `
    <nav class="navbar navbar-expand-xl mg-nav" aria-label="Principal">
      <div class="container">
        <span class="navbar-brand me-4 py-0">${logo()}</span>
        <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#menuPrincipal"
                aria-controls="menuPrincipal" aria-expanded="false" aria-label="Abrir menú">
          <span class="navbar-toggler-icon"></span>
        </button>
        <div class="collapse navbar-collapse" id="menuPrincipal">
          <ul class="navbar-nav me-auto">
            ${ENLACES.map((e) => `<li class="nav-item"><a class="nav-link ${activo(e.ruta) ? 'active' : ''}" ${activo(e.ruta) ? 'aria-current="page"' : ''} href="#${e.ruta}">${e.texto}</a></li>`).join('')}
            ${usuario ? `<li class="nav-item"><a class="nav-link ${activo('/mis-pedidos') ? 'active' : ''}" href="#/mis-pedidos">Mis pedidos</a></li>` : ''}
            ${esAdmin() ? `<li class="nav-item"><a class="nav-link ${activo('/admin') ? 'active' : ''}" href="#/admin/pedidos">Administración</a></li>` : ''}
          </ul>
          <form class="d-flex my-2 my-xl-0 me-xl-3" role="search" id="formBuscar">
            <label for="buscar" class="visually-hidden">Buscar mugs</label>
            <input class="form-control" type="search" id="buscar" placeholder="Buscar mugs…">
          </form>
          <div class="d-flex align-items-center gap-2">
            <a href="#/carrito" class="mg-carrito" aria-label="Carrito, ${unidades} unidades">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 4h2l2.4 11h10.2L20 7H6.2"/><circle cx="9" cy="19.5" r="1.4"/><circle cx="17" cy="19.5" r="1.4"/></svg>
              ${unidades ? `<span class="position-absolute top-0 start-100 translate-middle badge rounded-pill mg-insignia" style="margin-left:-6px;margin-top:6px">${unidades}</span>` : ''}
            </a>
            ${cuenta}
          </div>
        </div>
      </div>
    </nav>`;

  document.getElementById('formBuscar').addEventListener('submit', (ev) => {
    ev.preventDefault();
    const texto = document.getElementById('buscar').value.trim();
    navegar(texto ? `/catalogo?q=${encodeURIComponent(texto)}` : '/catalogo');
  });

  document.querySelector('[data-accion="salir"]')?.addEventListener('click', () => {
    cerrarSesion();
    navegar('/');
  });
}

function renderPie() {
  const telefono = `+${CONFIG.WHATSAPP.slice(0, 2)} ${CONFIG.WHATSAPP.slice(2, 5)} ${CONFIG.WHATSAPP.slice(5, 8)} ${CONFIG.WHATSAPP.slice(8)}`;
  document.getElementById('pie').innerHTML = `
    <div class="container py-5">
      <div class="row g-4 align-items-start">
        <div class="col-md-5 d-flex flex-column gap-2">
          ${logo()}
          <p class="text-suave small mb-0" style="max-width:34ch">Mugs para cada momento del día y diseños personalizados hechos contigo.</p>
        </div>
        <div class="col-6 col-md-3 mg-pie-enlaces small d-flex flex-column gap-2">
          <strong class="text-body">Tienda</strong>
          <a href="#/catalogo">Catálogo</a><a href="#/personalizados">Personalizados</a><a href="#/nosotros">Nosotros</a>
        </div>
        <div class="col-6 col-md-4 mg-pie-enlaces small d-flex flex-column gap-2">
          <strong class="text-body">Contacto</strong>
          <span class="text-suave">WhatsApp: ${telefono}</span>
          <a href="#/mis-pedidos">Sigue tu pedido</a>
        </div>
      </div>
      <p class="small text-suave mt-4 mb-0">© ${new Date().getFullYear()} MUGLY · Tienda de mugs</p>
    </div>`;
}

export function iniciarEncabezado() {
  renderEncabezado();
  renderPie();
  suscribir(renderEncabezado);
  document.addEventListener('mugly:ruta', renderEncabezado);
}
