// Inicio, catalogo (RF03) y seccion Nosotros.
import { api, urlImagen } from '../api.js';
import { agregarAlCarrito } from '../estado.js';
import { esc, moneda, cargando, alerta, avisar } from '../componentes/ui.js';
import { rutaActual } from '../router.js';

function tarjeta(p) {
  return `
    <div class="col">
      <article class="card mg-tarjeta mg-tarjeta-producto h-100">
        <a href="#/producto/${p.id}"><img src="${esc(urlImagen(p.imagen))}" class="card-img-top" alt="${esc(p.nombre)}"></a>
        <div class="card-body d-flex flex-column gap-2">
          <h3 class="h6 mb-0"><a class="text-body text-decoration-none" href="#/producto/${p.id}">${esc(p.nombre)}</a></h3>
          <p class="small text-suave mb-0 flex-grow-1">${esc(p.descripcion)}</p>
          <div class="d-flex align-items-center justify-content-between mt-2">
            <span class="mg-precio">${moneda(p.precio)}</span>
            ${p.cantidad_stock > 0
              ? `<button class="btn btn-acento btn-sm" type="button" data-agregar="${p.id}">Agregar</button>`
              : '<span class="small text-suave">Agotado</span>'}
          </div>
        </div>
      </article>
    </div>`;
}

function ordenar(lista, criterio) {
  const copia = [...lista];
  if (criterio === 'precio-asc') copia.sort((a, b) => a.precio - b.precio);
  else if (criterio === 'precio-desc') copia.sort((a, b) => b.precio - a.precio);
  else copia.sort((a, b) => b.id - a.id);
  return copia;
}

export async function render(app, { query }) {
  const busqueda = (query.q || '').trim();

  app.innerHTML = `
    <section class="mg-hero">
      <div class="container py-5">
        <div class="row align-items-center g-5">
          <div class="col-lg-6 d-flex flex-column gap-3">
            <p class="mg-eyebrow mb-0">Tienda de mugs</p>
            <h1 class="display-5 mb-0" style="color: var(--mg-primario)">Mugs para cada momento del día</h1>
            <p class="lead text-suave mb-0">Elige tu favorito del catálogo o pide uno personalizado con tu diseño.</p>
            <div class="d-flex flex-wrap gap-2">
              <a class="btn btn-primary" href="#/catalogo">Ver catálogo</a>
              <a class="btn btn-outline-primary" href="#/personalizados">Quiero uno personalizado</a>
            </div>
          </div>
          <div class="col-lg-6" id="destacados"></div>
        </div>
      </div>
    </section>

    <section id="catalogo" class="container py-5">
      <div class="d-flex flex-wrap align-items-end justify-content-between gap-3 mb-4">
        <div>
          <h2 class="h2 mb-1">${busqueda ? `Resultados para “${esc(busqueda)}”` : 'Catálogo'}</h2>
          <p class="text-suave mb-0" id="conteo"></p>
        </div>
        <div class="d-flex align-items-center gap-2">
          <label for="orden" class="small text-suave text-nowrap">Ordenar por</label>
          <select id="orden" class="form-select">
            <option value="recientes">Más recientes</option>
            <option value="precio-asc">Precio: menor a mayor</option>
            <option value="precio-desc">Precio: mayor a menor</option>
          </select>
        </div>
      </div>
      <div id="productos">${cargando('Cargando catálogo…')}</div>
    </section>

    <section id="nosotros" class="bg-white border-top">
      <div class="container py-5 row g-4 mx-auto">
        <div class="col-md-7">
          <h2 class="h4">Nosotros</h2>
          <p class="text-suave mb-0">MUGLY es una tienda de mugs que centraliza en una sola plataforma el catálogo,
            las compras y los pedidos. Compra un mug del catálogo o diseña uno personalizado con nosotros.</p>
        </div>
        <div class="col-md-5">
          <h2 class="h6">¿Dudas o pedidos especiales?</h2>
          <a href="#/personalizados">Escríbenos por WhatsApp</a>
        </div>
      </div>
    </section>`;

  let productos;
  try {
    productos = await api('/productos');
  } catch (error) {
    document.getElementById('productos').innerHTML = alerta(error.message);
    return;
  }

  const destacados = productos.filter((p) => p.imagen).slice(0, 2);
  document.getElementById('destacados').innerHTML = destacados.length
    ? `<div class="row g-3">${destacados.map((p, i) => `
        <div class="col-6 ${i ? 'pt-5' : ''}"><a href="#/producto/${p.id}">
          <img class="mg-img-cuadrada" src="${esc(urlImagen(p.imagen))}" alt="${esc(p.nombre)}"></a></div>`).join('')}</div>`
    : '';

  const filtrados = busqueda
    ? productos.filter((p) => `${p.nombre} ${p.descripcion}`.toLowerCase().includes(busqueda.toLowerCase()))
    : productos;

  const pintar = () => {
    const lista = ordenar(filtrados, document.getElementById('orden').value);
    document.getElementById('conteo').textContent =
      `${lista.length} ${lista.length === 1 ? 'mug disponible' : 'mugs disponibles'}`;
    document.getElementById('productos').innerHTML = lista.length
      ? `<div class="row row-cols-1 row-cols-sm-2 row-cols-lg-3 row-cols-xl-4 g-4">${lista.map(tarjeta).join('')}</div>`
      : `<p class="text-suave">${busqueda ? 'No encontramos mugs con esa búsqueda.' : 'Aún no hay mugs en el catálogo.'}</p>`;
  };

  pintar();
  document.getElementById('orden').addEventListener('change', pintar);

  document.getElementById('productos').addEventListener('click', (ev) => {
    const boton = ev.target.closest('[data-agregar]');
    if (!boton) return;
    const producto = productos.find((p) => p.id === Number(boton.dataset.agregar));
    const agregadas = agregarAlCarrito(producto, 1);
    avisar(agregadas ? `“${producto.nombre}” agregado al carrito.` : 'Ya tienes en el carrito todas las unidades disponibles.',
      agregadas ? 'success' : 'warning');
  });

  const destino = rutaActual().split('?')[0];
  if (destino === '/catalogo' || destino === '/nosotros') {
    document.getElementById(destino.slice(1)).scrollIntoView();
  }
}
