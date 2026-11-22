// Mis pedidos (RF09), estado del pedido (RF10) y guia de envio (RF20).
import { api } from '../api.js';
import { esc, moneda, fecha, cargando, alerta, insigniaEstado, nombreEstado, enlaceWhatsApp } from '../componentes/ui.js';
import { CONFIG } from '../config.js';

const PASOS = ['pendiente', 'pagado', 'enviado', 'entregado'];

function progreso(pedido) {
  if (pedido.estado === 'cancelado') {
    return '<p class="mb-0 text-suave">Este pedido fue cancelado.</p>';
  }
  const alcanzado = PASOS.indexOf(pedido.estado);
  const fechaDe = (e) => pedido.historial.find((h) => h.estado === e)?.fecha;
  return `<ol class="mg-progreso" aria-label="Progreso del pedido">
    ${PASOS.map((p, i) => `
      <li class="${i <= alcanzado ? 'hecho' : ''}">
        <div class="barra mb-2"></div>
        <div class="small fw-semibold ${i <= alcanzado ? '' : 'text-suave'}">${nombreEstado(p)}${i <= alcanzado ? '<span class="visually-hidden"> (completado)</span>' : ''}</div>
        <div class="small text-suave">${i <= alcanzado ? fecha(fechaDe(p)) : '—'}</div>
      </li>`).join('')}
  </ol>`;
}

function detalle(p) {
  const pagar = `Hola ${CONFIG.NOMBRE}, quiero pagar mi pedido #${p.id} por ${moneda(p.total)}.`;
  return `
    <div class="d-flex flex-wrap align-items-center justify-content-between gap-2">
      <h2 class="h4 mb-0">Pedido #${p.id}</h2>
      ${insigniaEstado(p.estado)}
    </div>
    <p class="small text-suave mb-0">${p.tipo === 'personalizado' ? 'Pedido personalizado' : 'Compra del catálogo'} · ${fecha(p.fecha_creacion)}</p>
    ${progreso(p)}

    ${p.estado === 'pendiente' ? `
      <div class="mg-hero rounded-3 p-3 d-flex flex-wrap align-items-center justify-content-between gap-2">
        <span>Coordina el pago de este pedido por WhatsApp.</span>
        <a class="btn btn-primary btn-sm" target="_blank" rel="noopener" href="${esc(enlaceWhatsApp(CONFIG.WHATSAPP, pagar))}">Pagar por WhatsApp</a>
      </div>` : ''}

    ${p.transportadora ? `
      <div class="bg-light rounded-3 p-3 d-flex flex-wrap gap-4">
        <div><div class="small text-suave">Transportadora</div><div class="fw-semibold">${esc(p.transportadora)}</div></div>
        <div><div class="small text-suave">Número de guía</div><div class="fw-semibold font-monospace">${esc(p.numero_guia)}</div></div>
      </div>` : ''}

    ${p.tipo === 'personalizado' ? `
      <div><h3 class="h6">Descripción</h3><p class="mb-0" style="white-space: pre-line">${esc(p.descripcion)}</p></div>
      <div class="d-flex justify-content-between border-top pt-3 fw-semibold"><span>Total</span><span class="mg-precio">${moneda(p.total)}</span></div>`
    : `
      <div class="table-responsive">
        <table class="table mb-0">
          <caption class="caption-top fw-semibold text-body">Productos</caption>
          <thead><tr class="small text-suave"><th scope="col">Producto</th><th scope="col">Cant.</th><th scope="col" class="text-end">Subtotal</th></tr></thead>
          <tbody>
            ${p.detalles.map((d) => `<tr><td>${esc(d.producto)}</td><td>${d.cantidad}</td><td class="text-end">${moneda(d.subtotal)}</td></tr>`).join('')}
            <tr class="fw-semibold"><td>Total</td><td></td><td class="text-end mg-precio">${moneda(p.total)}</td></tr>
          </tbody>
        </table>
      </div>`}`;
}

export async function render(app, { params }) {
  app.innerHTML = `<div class="container py-5">${cargando('Cargando tus pedidos…')}</div>`;

  let pedidos;
  try {
    pedidos = (await api('/pedidos')).sort((a, b) => b.id - a.id);
  } catch (error) {
    app.innerHTML = `<div class="container py-5">${alerta(error.message)}</div>`;
    return;
  }

  if (!pedidos.length) {
    app.innerHTML = `
      <div class="container py-5 text-center">
        <h1 class="h3">Aún no tienes pedidos</h1>
        <p class="text-suave">Cuando hagas una compra, aquí verás su estado.</p>
        <a class="btn btn-primary" href="#/catalogo">Ir al catálogo</a>
      </div>`;
    return;
  }

  const seleccionado = pedidos.find((p) => p.id === Number(params.id)) ?? pedidos[0];

  app.innerHTML = `
    <div class="container py-5">
      <h1 class="mb-4">Mis pedidos</h1>
      ${params.id && seleccionado.id !== Number(params.id) ? alerta('No encontramos ese pedido.', 'warning') : ''}
      <div class="row g-4 align-items-start">
        <nav class="col-lg-4 d-flex flex-column gap-2" aria-label="Lista de pedidos">
          ${pedidos.map((p) => `
            <a href="#/mis-pedidos/${p.id}" class="mg-tarjeta p-3 text-decoration-none text-body d-flex justify-content-between align-items-center gap-2 ${p.id === seleccionado.id ? 'border border-2 border-primary' : ''}"
               ${p.id === seleccionado.id ? 'aria-current="true"' : ''}>
              <span><span class="fw-semibold d-block">Pedido #${p.id}</span>
                <span class="small text-suave">${fecha(p.fecha_creacion)} · ${moneda(p.total)}</span></span>
              ${insigniaEstado(p.estado)}
            </a>`).join('')}
        </nav>
        <section class="col-lg-8 mg-tarjeta p-4 d-flex flex-column gap-3" aria-label="Detalle del pedido">
          ${detalle(seleccionado)}
        </section>
      </div>
    </div>`;
}
