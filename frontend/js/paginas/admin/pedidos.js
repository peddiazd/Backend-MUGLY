// Administracion de pedidos: busqueda, estados, confirmacion de pago, envio y
// pedidos personalizados (RF07, RF16, RF17, RF19, RF20, D3, D4a).
import { api, descargar, textoError } from '../../api.js';
import { adminLayout, encabezadoAdmin } from '../../componentes/adminLayout.js';
import {
  esc, moneda, fecha, cargando, alerta, avisar, insigniaEstado, nombreEstado, modal, confirmar,
} from '../../componentes/ui.js';

const ESTADOS = ['todos', 'pendiente', 'pagado', 'enviado', 'entregado', 'cancelado'];
const POR_PAGINA = 20;

const cambiarEstado = (id, cuerpo) =>
  api(`/admin/pedidos/${id}/estado`, { metodo: 'PATCH', cuerpo });

function acciones(p) {
  switch (p.estado) {
    case 'pendiente':
      return `<button class="btn btn-primary btn-sm" data-accion="pagar" data-id="${p.id}">Confirmar pago</button>
              <button class="btn btn-outline-secondary btn-sm" data-accion="cancelar" data-id="${p.id}">Cancelar</button>`;
    case 'pagado':
      return `<button class="btn btn-primary btn-sm" data-accion="enviar" data-id="${p.id}">Marcar enviado</button>`;
    case 'enviado':
      return `<button class="btn btn-primary btn-sm" data-accion="entregar" data-id="${p.id}">Marcar entregado</button>`;
    default:
      return '';
  }
}

function detallePedido(p) {
  return `
    <p class="mb-2">${insigniaEstado(p.estado)} <span class="small text-suave ms-2">${p.tipo === 'personalizado' ? 'Personalizado' : 'Catálogo'}</span></p>
    <p class="mb-1"><strong>Cliente:</strong> ${esc(p.cliente)}</p>
    <p class="mb-3"><strong>Creado:</strong> ${fecha(p.fecha_creacion)}</p>
    ${p.tipo === 'personalizado'
      ? `<p class="mb-3" style="white-space: pre-line"><strong>Descripción:</strong> ${esc(p.descripcion)}</p>`
      : `<ul class="list-group mb-3">${p.detalles.map((d) => `
          <li class="list-group-item d-flex justify-content-between"><span>${esc(d.producto)} × ${d.cantidad}</span><span>${moneda(d.subtotal)}</span></li>`).join('')}</ul>`}
    <p class="fw-semibold">Total: ${moneda(p.total)}</p>
    ${p.transportadora ? `<p class="mb-3"><strong>Envío:</strong> ${esc(p.transportadora)} · guía <span class="font-monospace">${esc(p.numero_guia)}</span></p>` : ''}
    <h3 class="h6">Historial</h3>
    <ul class="small mb-0">${p.historial.map((h) => `<li>${nombreEstado(h.estado)} · ${fecha(h.fecha)}</li>`).join('')}</ul>`;
}

export async function render(app, { query = {} } = {}) {
  const cont = adminLayout(app, '/admin/pedidos');
  const filtros = {
    q: query.q || '', estado: ESTADOS.includes(query.estado) ? query.estado : 'todos',
    tipo: 'todos', desde: '', hasta: '', pagina: 1,
  };
  let resultado = { items: [], por_estado: {}, total: 0, pagina: 1, paginas: 1 };
  let espera = null;
  let consulta = 0;

  cont.innerHTML = `
    ${encabezadoAdmin('Pedidos', 'Busca por número o cliente, filtra por estado y fechas.',
      `<button class="btn btn-outline-primary" type="button" data-exportar>Exportar CSV</button>
       <button class="btn btn-primary" type="button" data-accion="personalizado">Registrar personalizado</button>`)}
    <form class="mg-filtros" data-filtros role="search" aria-label="Buscar pedidos">
      <label class="visually-hidden" for="pq">Número de pedido o correo del cliente</label>
      <input id="pq" name="q" class="form-control" type="search" placeholder="Pedido # o correo del cliente" value="${esc(filtros.q)}" autocomplete="off">
      <label class="visually-hidden" for="ptipo">Tipo</label>
      <select id="ptipo" name="tipo" class="form-select"><option value="todos">Todos los tipos</option><option value="catalogo">Catálogo</option><option value="personalizado">Personalizado</option></select>
      <label class="small text-suave" for="pdesde">Desde</label>
      <input id="pdesde" name="desde" class="form-control" type="date">
      <label class="small text-suave" for="phasta">Hasta</label>
      <input id="phasta" name="hasta" class="form-control" type="date">
    </form>
    <div class="d-flex flex-wrap gap-2 mb-3" role="group" aria-label="Filtrar por estado" id="estados"></div>
    <section class="mg-panel" id="lista" aria-live="polite"></section>`;

  const lista = cont.querySelector('#lista');

  function pintarEstados() {
    const conteo = resultado.por_estado || {};
    const total = Object.values(conteo).reduce((a, b) => a + b, 0);
    cont.querySelector('#estados').innerHTML = ESTADOS.map((e) => {
      const n = e === 'todos' ? total : (conteo[e] || 0);
      return `<button type="button" class="btn btn-sm ${e === filtros.estado ? 'btn-primary' : 'btn-outline-secondary'}" data-filtro="${e}" aria-pressed="${e === filtros.estado}">
        ${e === 'todos' ? 'Todos' : nombreEstado(e)} (${n})</button>`;
    }).join('');
  }

  function pintar() {
    pintarEstados();
    const r = resultado;
    if (!r.items.length) {
      lista.innerHTML = '<div class="mg-vacio"><b>Sin pedidos</b>No hay pedidos con estos filtros.</div>';
      return;
    }
    lista.innerHTML = `
      <div class="table-responsive"><table class="table mb-0">
        <thead class="table-light small">
          <tr><th scope="col">Pedido</th><th scope="col">Cliente</th><th scope="col">Tipo</th><th scope="col">Fecha</th>
              <th scope="col">Total</th><th scope="col">Estado</th><th scope="col">Acciones</th></tr>
        </thead>
        <tbody>${r.items.map((p) => `
          <tr>
            <td><button class="btn btn-link p-0 fw-semibold" data-accion="ver" data-id="${p.id}">#${p.id}</button></td>
            <td>${esc(p.cliente)}</td>
            <td>${p.tipo === 'personalizado' ? 'Personalizado' : 'Catálogo'}</td>
            <td class="small">${fecha(p.fecha_creacion)}</td>
            <td class="num">${moneda(p.total)}</td>
            <td>${insigniaEstado(p.estado)}</td>
            <td><div class="d-flex flex-wrap gap-1">${acciones(p)}</div></td>
          </tr>`).join('')}</tbody>
      </table></div>
      <nav class="mg-paginacion" aria-label="Paginación">
        <span>${r.total} ${r.total === 1 ? 'pedido' : 'pedidos'} · página ${r.pagina} de ${r.paginas}</span>
        <span class="d-flex gap-2">
          <button class="btn btn-outline-secondary btn-sm" type="button" data-pagina="${r.pagina - 1}" ${r.pagina <= 1 ? 'disabled' : ''}>Anterior</button>
          <button class="btn btn-outline-secondary btn-sm" type="button" data-pagina="${r.pagina + 1}" ${r.pagina >= r.paginas ? 'disabled' : ''}>Siguiente</button>
        </span>
      </nav>`;
  }

  async function buscar(mensaje) {
    const mia = ++consulta;
    lista.innerHTML = cargando('Cargando pedidos…');
    const params = new URLSearchParams({ q: filtros.q, estado: filtros.estado, tipo: filtros.tipo, pagina: filtros.pagina, por_pagina: POR_PAGINA });
    if (filtros.desde) params.set('desde', filtros.desde);
    if (filtros.hasta) params.set('hasta', filtros.hasta);
    try {
      const r = await api(`/admin/pedidos?${params}`);
      if (mia !== consulta) return;
      resultado = r;
      pintar();
      if (mensaje) avisar(mensaje);
    } catch (error) {
      if (mia === consulta) lista.innerHTML = alerta(textoError(error));
    }
  }

  const form = cont.querySelector('[data-filtros]');
  form.addEventListener('submit', (ev) => ev.preventDefault());
  form.addEventListener('input', (ev) => {
    filtros[ev.target.name] = ev.target.value.trim().replace(/^#/, '');
    filtros.pagina = 1;
    clearTimeout(espera);
    espera = setTimeout(() => buscar(), ev.target.name === 'q' ? 300 : 0);
  });

  cont.querySelector('[data-exportar]').addEventListener('click', async () => {
    const params = new URLSearchParams();
    if (filtros.desde) params.set('desde', filtros.desde);
    if (filtros.hasta) params.set('hasta', filtros.hasta);
    try { await descargar(`/admin/reportes/pedidos.csv?${params}`, 'mugly-pedidos.csv'); } catch (error) { avisar(textoError(error), 'danger'); }
  });

  async function registrarPersonalizado() {
    let clientes = [];
    try {
      clientes = (await api('/admin/usuarios?estado=activos&por_pagina=100')).items;
    } catch (error) {
      avisar(textoError(error), 'danger');
      return;
    }
    const ok = await modal({
      titulo: 'Registrar pedido personalizado',
      textoAceptar: 'Registrar',
      contenido: clientes.length ? `
        <p class="small text-suave">Registra el mug acordado con el cliente por WhatsApp.</p>
        <div class="mb-3"><label for="cliente" class="form-label">Cliente</label>
          <select id="cliente" class="form-select" required>
            <option value="">Selecciona el cliente…</option>
            ${clientes.map((u) => `<option value="${u.id}">${esc(u.correo)}</option>`).join('')}
          </select></div>
        <div class="mb-3"><label for="descripcion" class="form-label">Descripción del mug</label>
          <textarea id="descripcion" class="form-control" rows="3" maxlength="2000" required></textarea></div>
        <div><label for="valor" class="form-label">Valor acordado (COP)</label>
          <input id="valor" class="form-control" type="number" min="1" step="1" required></div>`
        : '<p class="mb-0">No hay clientes activos registrados. El cliente debe crear su cuenta primero.</p>',
      alAceptar: async (el) => {
        if (!clientes.length) return true;
        const usuario_id = Number(el.querySelector('#cliente').value);
        const descripcion = el.querySelector('#descripcion').value.trim();
        const total = Number(el.querySelector('#valor').value);
        if (!usuario_id || !descripcion || !(total > 0)) throw new Error('Completa el cliente, la descripción y un valor mayor a cero.');
        return api('/admin/pedidos/personalizados', { metodo: 'POST', cuerpo: { usuario_id, descripcion, total } });
      },
    });
    if (ok && ok.id) await buscar(`Pedido personalizado #${ok.id} registrado.`);
  }

  cont.addEventListener('click', async (ev) => {
    const b = ev.target.closest('button');
    if (!b || !cont.contains(b)) return;

    if (b.dataset.filtro) {
      filtros.estado = b.dataset.filtro;
      filtros.pagina = 1;
      buscar();
      return;
    }
    if (b.dataset.pagina) {
      filtros.pagina = Number(b.dataset.pagina);
      buscar();
      return;
    }

    const id = Number(b.dataset.id);
    const pedido = resultado.items.find((p) => p.id === id);

    try {
      switch (b.dataset.accion) {
        case 'ver':
          await modal({ titulo: `Pedido #${id}`, contenido: detallePedido(pedido), textoAceptar: 'Cerrar' });
          break;

        case 'pagar':
          if (await confirmar('Confirmar pago',
            `¿Confirmas que recibiste el pago del pedido #${id} por ${moneda(pedido.total)}? Se descontará el inventario.`, 'Confirmar pago')) {
            await cambiarEstado(id, { estado: 'pagado' });
            await buscar(`Pedido #${id} marcado como pagado.`);
          }
          break;

        case 'cancelar':
          if (await confirmar('Cancelar pedido', `¿Cancelar el pedido #${id}? Esta acción no se puede deshacer.`, 'Cancelar pedido', 'btn-danger')) {
            await cambiarEstado(id, { estado: 'cancelado' });
            await buscar(`Pedido #${id} cancelado.`);
          }
          break;

        case 'enviar': {
          const ok = await modal({
            titulo: `Marcar pedido #${id} como enviado`,
            textoAceptar: 'Guardar envío',
            contenido: `
              <div class="mb-3"><label for="transportadora" class="form-label">Transportadora</label>
                <input id="transportadora" class="form-control" maxlength="100" required></div>
              <div><label for="guia" class="form-label">Número de guía</label>
                <input id="guia" class="form-control" maxlength="100" required></div>`,
            alAceptar: async (el) => {
              const transportadora = el.querySelector('#transportadora').value.trim();
              const numero_guia = el.querySelector('#guia').value.trim();
              if (!transportadora || !numero_guia) throw new Error('Indica la transportadora y el número de guía.');
              await cambiarEstado(id, { estado: 'enviado', transportadora, numero_guia });
              return true;
            },
          });
          if (ok) await buscar(`Pedido #${id} marcado como enviado.`);
          break;
        }

        case 'entregar':
          if (await confirmar('Marcar entregado', `¿El pedido #${id} ya fue entregado al cliente?`, 'Marcar entregado')) {
            await cambiarEstado(id, { estado: 'entregado' });
            await buscar(`Pedido #${id} marcado como entregado.`);
          }
          break;

        case 'personalizado':
          await registrarPersonalizado();
          break;
        default:
      }
    } catch (error) {
      avisar(textoError(error), 'danger');
    }
  });

  await buscar();
  if (query.personalizado) registrarPersonalizado();
}
