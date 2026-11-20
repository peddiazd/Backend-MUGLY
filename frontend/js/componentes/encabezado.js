// Encabezado y pie de pagina, que se actualizan con el estado global.
import { estado, suscribir, esAdmin, unidadesCarrito, cerrarSesion } from '../estado.js';
import { navegar, rutaActual } from '../router.js';
import { esc } from './ui.js';
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
         <button class="btn btn-light btn-sm dropdown-toggle" type="button" data-bs-toggle="dropdown" aria-expanded="false">
           ${esc(usuario.correo)}
         </button>
         <ul class="dropdown-menu dropdown-menu-end">
           <li><a class="dropdown-item" href="#/mis-pedidos">Mis pedidos</a></li>
           ${esAdmin() ? '<li><a class="dropdown-item" href="#/admin/pedidos">Panel de administración</a></li>' : ''}
           <li><hr class="dropdown-divider"></li>
           <li><button class="dropdown-item" type="button" data-accion="salir">Cerrar sesión</button></li>
         </ul>
       </div>`
    : '<a class="btn btn-light btn-sm" href="#/ingresar">Ingresar</a>';

  document.getElementById('encabezado').innerHTML = `
    <nav class="navbar navbar-expand-lg navbar-dark mg-nav" aria-label="Principal">
      <div class="container">
        <a class="navbar-brand" href="#/">MUGLY</a>
        <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#menuPrincipal"
                aria-controls="menuPrincipal" aria-expanded="false" aria-label="Abrir menú">
          <span class="navbar-toggler-icon"></span>
        </button>
        <div class="collapse navbar-collapse" id="menuPrincipal">
          <ul class="navbar-nav me-auto">
            ${ENLACES.map((e) => `<li class="nav-item"><a class="nav-link ${activo(e.ruta) ? 'active' : ''}" href="#${e.ruta}">${e.texto}</a></li>`).join('')}
            ${usuario ? `<li class="nav-item"><a class="nav-link ${activo('/mis-pedidos') ? 'active' : ''}" href="#/mis-pedidos">Mis pedidos</a></li>` : ''}
            ${esAdmin() ? `<li class="nav-item"><a class="nav-link ${activo('/admin') ? 'active' : ''}" href="#/admin/pedidos">Administración</a></li>` : ''}
          </ul>
          <form class="d-flex my-2 my-lg-0 me-lg-3" role="search" id="formBuscar">
            <label for="buscar" class="visually-hidden">Buscar mugs</label>
            <input class="form-control" type="search" id="buscar" placeholder="Buscar mugs…">
          </form>
          <div class="d-flex align-items-center gap-2">
            <a href="#/carrito" class="btn btn-link text-white position-relative px-2" aria-label="Carrito, ${unidades} unidades">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M3 4h2l2.4 11h10.2L20 7H6.2"/><circle cx="9" cy="19" r="1.4"/><circle cx="17" cy="19" r="1.4"/></svg>
              ${unidades ? `<span class="position-absolute top-0 start-100 translate-middle badge rounded-pill mg-insignia">${unidades}</span>` : ''}
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
  document.getElementById('pie').innerHTML = `
    <div class="container py-4 d-flex flex-wrap justify-content-between gap-3 small text-suave">
      <span><strong class="text-body">MUGLY</strong> · Tienda de mugs</span>
      <span>WhatsApp: +${CONFIG.WHATSAPP.slice(0, 2)} ${CONFIG.WHATSAPP.slice(2, 5)} ${CONFIG.WHATSAPP.slice(5, 8)} ${CONFIG.WHATSAPP.slice(8)}</span>
    </div>`;
}

export function iniciarEncabezado() {
  renderEncabezado();
  renderPie();
  suscribir(renderEncabezado);
  document.addEventListener('mugly:ruta', renderEncabezado);
}
