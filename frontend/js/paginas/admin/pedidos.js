// Administracion de pedidos: estados, confirmacion de pago, envio y
// pedidos personalizados (RF07, RF16, RF17, RF19, RF20, D3, D4a).
import { api, textoError } from '../../api.js';
import { adminLayout } from '../../componentes/adminLayout.js';
import {
  esc, moneda, fecha, cargando, alerta, avisar, insigniaEstado, nombreEstado, modal, confirmar,
} from '../../componentes/ui.js';

const FILTROS = ['todos', 'pendiente', 'pagado', 'enviado', 'entregado', 'cancelado'];

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

function detallePedido(p, correo) {
  return `
    <p class="mb-2">${insigniaEstado(p.estado)} <span class="small text-suave ms-2">${p.tipo === 'personalizado' ? 'Personalizado' : 'Catálogo'}</span></p>
    <p class="mb-1"><strong>Cliente:</strong> ${esc(correo)}</p>
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

export async function render(app) {
  const cont = adminLayout(app, '/admin/pedidos');
  let filtro = 'todos';
  let pedidos = [];
  let usuarios = [];

  const correoDe = (id) => usuarios.find((u) => u.id === id)?.correo ?? `Usuario #${id}`;

  async function cargar() {
    [pedidos, usuarios] = await Promise.all([api('/admin/pedidos'), api('/admin/usuarios')]);
    pedidos.sort((a, b) => b.id - a.id);
  }

  function pintar() {
    const lista = filtro === 'todos' ? pedidos : pedidos.filter((p) => p.estado === filtro);
    cont.innerHTML = `
      <div class="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-4">
        <h1 class="h2 mb-0">Pedidos</h1>
        <button class="btn btn-primary" type="button" data-accion="personalizado">Registrar personalizado</button>
      </div>
      <div class="d-flex flex-wrap gap-2 mb-3" role="group" aria-label="Filtrar por estado">
        ${FILTROS.map((f) => {
          const n = f === 'todos' ? pedidos.length : pedidos.filter((p) => p.estado === f).length;
          return `<button type="button" class="btn btn-sm ${f === filtro ? 'btn-primary' : 'btn-outline-secondary'}" data-filtro="${f}" aria-pressed="${f === filtro}">
            ${f === 'todos' ? 'Todos' : nombreEstado(f)} (${n})</button>`;
        }).join('')}
      </div>
      <div class="bg-white rounded-4 table-responsive">
        <table class="table mb-0">
          <thead class="table-light small">
            <tr><th scope="col">Pedido</th><th scope="col">Cliente</th><th scope="col">Tipo</th><th scope="col">Fecha</th>
                <th scope="col">Total</th><th scope="col">Estado</th><th scope="col">Acciones</th></tr>
          </thead>
          <tbody>
            ${lista.length ? lista.map((p) => `
              <tr>
                <td><button class="btn btn-link p-0 fw-semibold" data-accion="ver" data-id="${p.id}">#${p.id}</button></td>
                <td>${esc(correoDe(p.usuario_id))}</td>
                <td>${p.tipo === 'personalizado' ? 'Personalizado' : 'Catálogo'}</td>
                <td class="small">${fecha(p.fecha_creacion)}</td>
                <td>${moneda(p.total)}</td>
                <td>${insigniaEstado(p.estado)}</td>
                <td><div class="d-flex flex-wrap gap-1">${acciones(p)}</div></td>
              </tr>`).join('')
              : '<tr><td colspan="7" class="text-center text-suave py-4">No hay pedidos en este estado.</td></tr>'}
          </tbody>
        </table>
      </div>`;
  }

  async function recargar(mensaje) {
    await cargar();
    pintar();
    if (mensaje) avisar(mensaje);
  }

  cont.innerHTML = cargando('Cargando pedidos…');
  try {
    await cargar();
  } catch (error) {
    cont.innerHTML = alerta(error.message);
    return;
  }
  pintar();

  cont.addEventListener('click', async (ev) => {
    const b = ev.target.closest('button');
    if (!b) return;

    if (b.dataset.filtro) {
      filtro = b.dataset.filtro;
      pintar();
      return;
    }

    const id = Number(b.dataset.id);
    const pedido = pedidos.find((p) => p.id === id);

    try {
      switch (b.dataset.accion) {
        case 'ver':
          await modal({ titulo: `Pedido #${id}`, contenido: detallePedido(pedido, correoDe(pedido.usuario_id)), textoAceptar: 'Cerrar' });
          break;

        case 'pagar':
          if (await confirmar('Confirmar pago',
            `¿Confirmas que recibiste el pago del pedido #${id} por ${moneda(pedido.total)}? Se descontará el inventario.`, 'Confirmar pago')) {
            await cambiarEstado(id, { estado: 'pagado' });
            await recargar(`Pedido #${id} marcado como pagado.`);
          }
          break;

        case 'cancelar':
          if (await confirmar('Cancelar pedido', `¿Cancelar el pedido #${id}? Esta acción no se puede deshacer.`, 'Cancelar pedido', 'btn-danger')) {
            await cambiarEstado(id, { estado: 'cancelado' });
            await recargar(`Pedido #${id} cancelado.`);
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
          if (ok) await recargar(`Pedido #${id} marcado como enviado.`);
          break;
        }

        case 'entregar':
          if (await confirmar('Marcar entregado', `¿El pedido #${id} ya fue entregado al cliente?`, 'Marcar entregado')) {
            await cambiarEstado(id, { estado: 'entregado' });
            await recargar(`Pedido #${id} marcado como entregado.`);
          }
          break;

        case 'personalizado': {
          const clientes = usuarios.filter((u) => u.rol !== 'admin' && u.activo);
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
              const creado = await api('/admin/pedidos/personalizados', { metodo: 'POST', cuerpo: { usuario_id, descripcion, total } });
              return creado;
            },
          });
          if (ok && ok.id) await recargar(`Pedido personalizado #${ok.id} registrado.`);
          break;
        }
        default:
      }
    } catch (error) {
      avisar(textoError(error), 'danger');
    }
  });
}
