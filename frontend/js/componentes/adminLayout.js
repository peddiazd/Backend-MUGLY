// Estructura comun del panel de administracion: menu lateral y contenido.
const SECCIONES = [
  { ruta: '/admin/pedidos', texto: 'Pedidos' },
  { ruta: '/admin/productos', texto: 'Productos e inventario' },
  { ruta: '/admin/clientes', texto: 'Clientes' },
];

export function adminLayout(app, activa) {
  app.innerHTML = `
    <div class="mg-admin">
      <nav class="mg-admin-menu" aria-label="Administración">
        <p class="text-white fw-bold px-2 mb-3" style="font-family: 'Space Grotesk', sans-serif">Administración</p>
        ${SECCIONES.map((s) => `<a href="#${s.ruta}" class="${s.ruta === activa ? 'active' : ''}" ${s.ruta === activa ? 'aria-current="page"' : ''}>${s.texto}</a>`).join('')}
      </nav>
      <div class="mg-admin-contenido" id="adminContenido"></div>
    </div>`;
  return document.getElementById('adminContenido');
}
