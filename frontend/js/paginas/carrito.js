// Carrito (RF05) y confirmacion de la compra (RF06, RF08).
// El pedido queda pendiente; el pago se coordina por WhatsApp (D1, D3).
import { api, urlImagen } from '../api.js';
import {
  estado, esAdmin, haySesion, cambiarCantidad, quitarDelCarrito, actualizarItem,
  vaciarCarrito, totalCarrito, unidadesCarrito,
} from '../estado.js';
import { esc, moneda, cargando, alerta, avisar, enlaceWhatsApp } from '../componentes/ui.js';
import { navegar } from '../router.js';
import { CONFIG } from '../config.js';

// Actualiza precio y stock de cada item; marca los que ya no estan disponibles.
async function refrescarItems() {
  await Promise.all(estado.carrito.map(async (item) => {
    try {
      const p = await api(`/productos/${item.producto_id}`);
      actualizarItem(item.producto_id, {
        nombre: p.nombre, precio: p.precio, imagen: p.imagen, stock: p.cantidad_stock,
        cantidad: Math.min(item.cantidad, Math.max(p.cantidad_stock, 0)), noDisponible: p.cantidad_stock < 1,
      });
    } catch (error) {
      if (error.status === 404) actualizarItem(item.producto_id, { noDisponible: true });
    }
  }));
}

function fila(item) {
  return `
    <article class="mg-tarjeta p-3 d-flex flex-wrap align-items-center gap-3 ${item.noDisponible ? 'opacity-75' : ''}">
      <img src="${esc(urlImagen(item.imagen))}" alt="" class="rounded-3" style="width: 88px; height: 88px; object-fit: cover">
      <div class="flex-grow-1" style="min-width: 180px">
        <h2 class="h6 mb-1">${esc(item.nombre)}</h2>
        <p class="small text-suave mb-0">${item.noDisponible
          ? '<span class="text-danger fw-semibold">Ya no está disponible. Quítalo para continuar.</span>'
          : `${moneda(item.precio)} c/u · ${item.stock} disponibles`}</p>
      </div>
      ${item.noDisponible ? '' : `
      <div class="input-group" style="width: 140px">
        <button class="btn btn-outline-secondary" type="button" data-menos="${item.producto_id}" aria-label="Disminuir cantidad de ${esc(item.nombre)}" ${item.cantidad <= 1 ? 'disabled' : ''}>−</button>
        <span class="form-control text-center" aria-live="polite">${item.cantidad}</span>
        <button class="btn btn-outline-secondary" type="button" data-mas="${item.producto_id}" aria-label="Aumentar cantidad de ${esc(item.nombre)}" ${item.cantidad >= item.stock ? 'disabled' : ''}>+</button>
      </div>
      <span class="fw-semibold mg-precio text-end" style="width: 120px">${moneda(item.precio * item.cantidad)}</span>`}
      <button class="btn btn-link text-secondary" type="button" data-quitar="${item.producto_id}" aria-label="Quitar ${esc(item.nombre)} del carrito">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/></svg>
      </button>
    </article>`;
}

function pedidoCreado(app, pedido) {
  const mensaje = `Hola MUGLY, quiero pagar mi pedido #${pedido.id} por ${moneda(pedido.total)}.`;
  app.innerHTML = `
    <div class="container py-5" style="max-width: 760px">
      <div class="mg-hero rounded-4 p-4 p-md-5 d-flex flex-column gap-3">
        <p class="mg-eyebrow mb-0">Pedido registrado</p>
        <h1 class="h2 mb-0">Pedido #${pedido.id} · pendiente de pago</h1>
        <p class="text-suave mb-0">Total: <strong>${moneda(pedido.total)}</strong>. Escríbenos por WhatsApp para coordinar el pago.
          Cuando lo confirmemos, tu pedido pasará a “Pagado”.</p>
        <div class="d-flex flex-wrap gap-2">
          <a class="btn btn-primary" target="_blank" rel="noopener" href="${esc(enlaceWhatsApp(CONFIG.WHATSAPP, mensaje))}">Pagar por WhatsApp</a>
          <a class="btn btn-outline-primary" href="#/mis-pedidos/${pedido.id}">Ver mi pedido</a>
        </div>
      </div>
    </div>`;
}

export async function render(app) {
  // El administrador gestiona la tienda desde su panel; no realiza compras.
  if (esAdmin()) {
    app.innerHTML = `<div class="container py-5" style="max-width:640px">
      <h1 class="h3">El carrito es para clientes</h1>
      <p class="text-suave">Con una cuenta de administrador se gestiona la tienda, no se compra. Para probar una compra, ingresa con una cuenta de cliente.</p>
      <a class="btn btn-primary" href="#/admin">Volver al panel</a></div>`;
    return;
  }
  app.innerHTML = `<div class="container py-5">${cargando('Revisando tu carrito…')}</div>`;
  await refrescarItems();

  const pintar = () => {
    if (!estado.carrito.length) {
      app.innerHTML = `
        <div class="container py-5 text-center">
          <h1 class="h3">Tu carrito está vacío</h1>
          <p class="text-suave">Explora el catálogo y agrega tus mugs favoritos.</p>
          <a class="btn btn-primary" href="#/catalogo">Ir al catálogo</a>
        </div>`;
      return;
    }

    const hayNoDisponibles = estado.carrito.some((i) => i.noDisponible);
    const unidades = unidadesCarrito();

    app.innerHTML = `
      <div class="container py-5">
        <h1 class="mb-4">Tu carrito</h1>
        <div class="row g-4 align-items-start">
          <section class="col-lg-8 d-flex flex-column gap-3" aria-label="Productos del carrito" id="lista">
            ${estado.carrito.map(fila).join('')}
          </section>
          <aside class="col-lg-4" aria-label="Resumen de la compra">
            <div class="mg-tarjeta p-4 d-flex flex-column gap-3">
              <h2 class="h5 mb-0">Resumen</h2>
              <div class="d-flex justify-content-between text-suave"><span>${unidades} ${unidades === 1 ? 'producto' : 'productos'}</span><span>${moneda(totalCarrito())}</span></div>
              <div class="d-flex justify-content-between border-top pt-3 h5 mb-0"><span>Total</span><span class="mg-precio">${moneda(totalCarrito())}</span></div>
              <div id="errorCompra"></div>
              <button class="btn btn-acento btn-lg" type="button" id="confirmar" ${hayNoDisponibles ? 'disabled' : ''}>Confirmar pedido</button>
              <p class="small text-suave mb-0">${haySesion()
                ? 'Tu pedido quedará pendiente hasta que confirmemos el pago por WhatsApp.'
                : 'Necesitas iniciar sesión para confirmar el pedido.'}</p>
            </div>
          </aside>
        </div>
      </div>`;

    document.getElementById('lista').addEventListener('click', (ev) => {
      const b = ev.target.closest('button');
      if (!b) return;
      if (b.dataset.menos) cambiarCantidad(Number(b.dataset.menos), estado.carrito.find((i) => i.producto_id === Number(b.dataset.menos)).cantidad - 1);
      if (b.dataset.mas) cambiarCantidad(Number(b.dataset.mas), estado.carrito.find((i) => i.producto_id === Number(b.dataset.mas)).cantidad + 1);
      if (b.dataset.quitar) quitarDelCarrito(Number(b.dataset.quitar));
      pintar();
    });

    document.getElementById('confirmar').addEventListener('click', async (ev) => {
      if (!haySesion()) {
        navegar('/ingresar?volver=%2Fcarrito');
        return;
      }
      ev.target.disabled = true;
      try {
        const pedido = await api('/pedidos', {
          metodo: 'POST',
          cuerpo: { detalles: estado.carrito.map((i) => ({ producto_id: i.producto_id, cantidad: i.cantidad })) },
        });
        vaciarCarrito();
        avisar(`Pedido #${pedido.id} creado.`);
        pedidoCreado(app, pedido);
      } catch (error) {
        document.getElementById('errorCompra').innerHTML = alerta(error.message);
        ev.target.disabled = false;
      }
    });
  };

  pintar();
}
