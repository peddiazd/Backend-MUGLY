// Estructura comun del panel de administracion: menu lateral y contenido.
const SECCIONES = [
  {
    ruta: '/admin/pedidos', texto: 'Pedidos',
    icono: '<path d="M6 4h12l1 4H5z"/><path d="M5 8h14v11a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1z"/><path d="M9 12h6"/>',
  },
  {
    ruta: '/admin/productos', texto: 'Productos e inventario',
    icono: '<path d="M5 9h11v6a4 4 0 0 1-4 4H9a4 4 0 0 1-4-4z"/><path d="M16 10.5h1.2a2.5 2.5 0 0 1 0 5H16"/><path d="M9 4.5c-.8 1 .8 1.8 0 3M12.5 4.5c-.8 1 .8 1.8 0 3"/>',
  },
  {
    ruta: '/admin/clientes', texto: 'Clientes',
    icono: '<circle cx="9" cy="8" r="3.2"/><path d="M3.5 19a5.5 5.5 0 0 1 11 0"/><path d="M16 5.5a3 3 0 0 1 0 5.6M17.5 14.2A5.5 5.5 0 0 1 20.5 19"/>',
  },
];

export function adminLayout(app, activa) {
  app.innerHTML = `
    <div class="mg-admin">
      <nav class="mg-admin-menu" aria-label="Administración">
        <p class="mg-admin-titulo">Administración</p>
        ${SECCIONES.map((s) => `<a href="#${s.ruta}" class="${s.ruta === activa ? 'active' : ''}" ${s.ruta === activa ? 'aria-current="page"' : ''}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${s.icono}</svg>${s.texto}</a>`).join('')}
      </nav>
      <div class="mg-admin-contenido" id="adminContenido"></div>
    </div>`;
  return document.getElementById('adminContenido');
}
