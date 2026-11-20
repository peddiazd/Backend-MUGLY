// Detalle del producto (RF04) y agregar al carrito (RF05).
import { api, urlImagen } from '../api.js';
import { agregarAlCarrito, estado } from '../estado.js';
import { esc, moneda, cargando, alerta, avisar } from '../componentes/ui.js';

export async function render(app, { params }) {
  app.innerHTML = `<div class="container py-5">${cargando()}</div>`;

  let p;
  try {
    p = await api(`/productos/${encodeURIComponent(params.id)}`);
  } catch (error) {
    app.innerHTML = `<div class="container py-5">
      ${alerta(error.status === 404 ? 'Este producto no existe o ya no está disponible.' : error.message)}
      <a class="btn btn-primary" href="#/catalogo">Volver al catálogo</a></div>`;
    return;
  }

  const enCarrito = estado.carrito.find((i) => i.producto_id === p.id)?.cantidad ?? 0;
  const maximo = Math.max(0, p.cantidad_stock - enCarrito);

  app.innerHTML = `
    <div class="container py-4">
      <nav aria-label="Ruta" class="small mb-4">
        <a href="#/catalogo">Catálogo</a> <span class="text-suave" aria-hidden="true">/</span>
        <span class="text-suave">${esc(p.nombre)}</span>
      </nav>
      <div class="row g-5">
        <div class="col-lg-6">
          <img class="mg-img-cuadrada" src="${esc(urlImagen(p.imagen))}" alt="${esc(p.nombre)}">
        </div>
        <div class="col-lg-6 d-flex flex-column gap-3">
          <span class="estado ${p.cantidad_stock > 0 ? 'estado-entregado' : 'estado-cancelado'} align-self-start">
            ${p.cantidad_stock > 0 ? `Disponible · ${p.cantidad_stock} unidades` : 'Agotado'}
          </span>
          <h1 class="display-6 mb-0">${esc(p.nombre)}</h1>
          <p class="h3 mg-precio mb-0">${moneda(p.precio)}</p>
          <p class="text-suave" style="white-space: pre-line">${esc(p.descripcion)}</p>

          ${maximo > 0 ? `
          <form id="formAgregar" class="d-flex flex-wrap align-items-end gap-3" novalidate>
            <div>
              <label for="cantidad" class="form-label">Cantidad</label>
              <input id="cantidad" class="form-control" type="number" min="1" max="${maximo}" value="1" style="width: 110px">
            </div>
            <button class="btn btn-acento flex-grow-1" type="submit">Agregar al carrito</button>
          </form>
          <p class="small text-suave mb-0">Puedes agregar hasta ${maximo} ${maximo === 1 ? 'unidad' : 'unidades'}${enCarrito ? ` (ya tienes ${enCarrito} en el carrito)` : ''}.</p>
          <div id="errorCantidad"></div>`
          : `<p class="text-suave mb-0">${p.cantidad_stock > 0 ? 'Ya tienes en el carrito todas las unidades disponibles.' : 'Este mug está agotado por ahora.'}</p>`}

          <div class="border-top pt-3 mt-2">
            <p class="fw-semibold mb-1">¿Lo quieres con tu diseño?</p>
            <a href="#/personalizados">Pide un mug personalizado por WhatsApp</a>
          </div>
        </div>
      </div>
    </div>`;

  document.getElementById('formAgregar')?.addEventListener('submit', (ev) => {
    ev.preventDefault();
    const cantidad = Number(document.getElementById('cantidad').value);
    const zona = document.getElementById('errorCantidad');
    if (!Number.isInteger(cantidad) || cantidad < 1 || cantidad > maximo) {
      zona.innerHTML = alerta(`Ingresa una cantidad entre 1 y ${maximo}.`, 'warning');
      return;
    }
    agregarAlCarrito(p, cantidad);
    avisar(`“${p.nombre}” agregado al carrito.`);
    render(app, { params });
  });
}
