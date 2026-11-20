// Catálogo (RF03): página propia con búsqueda y orden. Datos reales de la API.
import { api } from '../api.js';
import { esc, cargando, alerta } from '../componentes/ui.js';
import { tarjetaProducto, enlazarAgregar } from '../componentes/producto.js';

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
    <section class="container">
      <header class="mg-cabecera-pagina d-flex flex-wrap align-items-end justify-content-between gap-3">
        <div>
          <h1>${busqueda ? `Resultados para “${esc(busqueda)}”` : 'Catálogo'}</h1>
          <p id="conteo">Cada mug en su repisa, con su precio a la vista.</p>
        </div>
        <div class="d-flex align-items-center gap-2">
          <label for="orden" class="text-suave text-nowrap">Ordenar por</label>
          <select id="orden" class="form-select" style="border-radius:999px">
            <option value="recientes">Más recientes</option>
            <option value="precio-asc">Precio: menor a mayor</option>
            <option value="precio-desc">Precio: mayor a menor</option>
          </select>
        </div>
      </header>
      <div id="productos" class="pb-5">${cargando('Cargando catálogo…')}</div>
    </section>`;

  let productos;
  try {
    productos = await api('/productos');
  } catch (error) {
    document.getElementById('productos').innerHTML = alerta(error.message);
    return;
  }

  const filtrados = busqueda
    ? productos.filter((p) => `${p.nombre} ${p.descripcion}`.toLowerCase().includes(busqueda.toLowerCase()))
    : productos;

  const cont = document.getElementById('productos');
  const pintar = () => {
    const lista = ordenar(filtrados, document.getElementById('orden').value);
    document.getElementById('conteo').textContent =
      `${lista.length} ${lista.length === 1 ? 'mug disponible' : 'mugs disponibles'}`;
    cont.innerHTML = lista.length
      ? `<div class="row row-cols-2 row-cols-md-3 row-cols-lg-4 g-3 g-lg-4 gy-5">${lista.map((p) => `<div class="col">${tarjetaProducto(p)}</div>`).join('')}</div>`
      : `<div class="mg-tarjeta p-4 p-md-5 text-center">
           <p class="h3 mb-2">${busqueda ? 'No encontramos mugs con esa búsqueda.' : 'Aún no hay mugs en el catálogo.'}</p>
           <a class="btn btn-primary mt-2" href="#/catalogo">Ver todo el catálogo</a></div>`;
  };

  pintar();
  document.getElementById('orden').addEventListener('change', pintar);
  enlazarAgregar(cont, productos);
}
