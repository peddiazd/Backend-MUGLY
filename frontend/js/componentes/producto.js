// Tarjeta de producto "repisa": el mug descansa en su repisa y el precio
// cuelga en una etiqueta. Datos reales de la API (RF03, RF05).
import { urlImagen } from '../api.js';
import { agregarAlCarrito } from '../estado.js';
import { esc, moneda, avisar, icono } from './ui.js';

function stock(n) {
  if (n <= 0) return '<span class="mg-stock agotado">Agotado</span>';
  if (n <= 3) return `<span class="mg-stock pocas">Últimas ${n} unidades</span>`;
  return '<span class="mg-stock">Disponible</span>';
}

export function tarjetaProducto(p) {
  const hay = p.cantidad_stock > 0;
  return `
    <article class="mg-producto ${hay ? '' : 'sin-stock'}">
      <a class="mg-vitrina" href="#/producto/${p.id}" aria-label="${esc(p.nombre)}">
        <img src="${esc(urlImagen(p.imagen))}" alt="${esc(p.nombre)}" loading="lazy">
      </a>
      <div class="mg-etiqueta"><small>Precio</small><strong class="num">${moneda(p.precio)}</strong></div>
      <div class="mg-info">
        <div>
          <h2 class="mg-producto-titulo"><a href="#/producto/${p.id}">${esc(p.nombre)}</a></h2>
          <p>${esc(p.descripcion)}</p>
          ${stock(p.cantidad_stock)}
        </div>
        <button class="btn btn-acento mg-mas" type="button" data-agregar="${p.id}" aria-label="Agregar ${esc(p.nombre)} al carrito" ${hay ? '' : 'disabled'}>${icono('mas')}</button>
      </div>
    </article>`;
}

// Pulso breve en el contador del carrito: confirma dónde quedó el producto.
export function pulsoCarrito() {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  requestAnimationFrame(() => {
    const ins = document.querySelector('.mg-carrito .mg-insignia');
    if (!ins) return;
    ins.classList.remove('mg-insignia-pulso');
    void ins.offsetWidth;
    ins.classList.add('mg-insignia-pulso');
  });
}

// Conecta los botones "agregar" de un contenedor con el carrito.
export function enlazarAgregar(contenedor, productos) {
  contenedor.addEventListener('click', (ev) => {
    const boton = ev.target.closest('[data-agregar]');
    if (!boton) return;
    const producto = productos.find((p) => p.id === Number(boton.dataset.agregar));
    if (!producto) return;
    const agregadas = agregarAlCarrito(producto, 1);
    avisar(agregadas ? `${producto.nombre} quedó en tu carrito.` : 'Ya tienes en el carrito todas las unidades disponibles.',
      agregadas ? 'success' : 'warning');
    if (agregadas) pulsoCarrito();
  });
}
