// Administracion de productos, fotos e inventario (RF14, RF15, D6).
import { api, urlImagen, textoError } from '../../api.js';
import { adminLayout, encabezadoAdmin } from '../../componentes/adminLayout.js';
import { esc, moneda, cargando, alerta, avisar, modal, confirmar } from '../../componentes/ui.js';

const FORMATOS = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_BYTES = 5 * 1024 * 1024;

function validarImagen(archivo) {
  if (!archivo) return null;
  if (!FORMATOS.includes(archivo.type)) return 'La foto debe ser JPG, PNG o WEBP.';
  if (archivo.size > MAX_BYTES) return 'La foto supera el tamaño máximo de 5 MB.';
  return null;
}

async function subirImagen(id, archivo) {
  const datos = new FormData();
  datos.append('imagen', archivo);
  return api(`/productos/${id}/imagen`, { metodo: 'POST', formData: datos });
}

function formulario(p = {}) {
  return `
    <div class="row g-3">
      <div class="col-12"><label for="nombre" class="form-label">Nombre</label>
        <input id="nombre" class="form-control" maxlength="200" required value="${esc(p.nombre ?? '')}"></div>
      <div class="col-12"><label for="descripcion" class="form-label">Descripción</label>
        <textarea id="descripcion" class="form-control" rows="3" required>${esc(p.descripcion ?? '')}</textarea></div>
      <div class="col-6"><label for="precio" class="form-label">Precio (COP)</label>
        <input id="precio" class="form-control" type="number" min="1" step="1" required value="${p.precio ?? ''}"></div>
      <div class="col-6"><label for="stock" class="form-label">Unidades en stock</label>
        <input id="stock" class="form-control" type="number" min="0" step="1" required value="${p.cantidad_stock ?? 0}"></div>
      <div class="col-12"><div class="form-check">
        <input id="disponible" class="form-check-input" type="checkbox" ${p.disponible === false ? '' : 'checked'}>
        <label for="disponible" class="form-check-label">Visible en el catálogo</label></div></div>
      ${p.id ? '' : `<div class="col-12"><label for="foto" class="form-label">Foto (opcional)</label>
        <input id="foto" class="form-control" type="file" accept="image/jpeg,image/png,image/webp">
        <div class="form-text">JPG, PNG o WEBP, máximo 5 MB.</div></div>`}
    </div>`;
}

function leerFormulario(el) {
  const nombre = el.querySelector('#nombre').value.trim();
  const descripcion = el.querySelector('#descripcion').value.trim();
  const precio = Number(el.querySelector('#precio').value);
  const cantidad_stock = Number(el.querySelector('#stock').value);
  const disponible = el.querySelector('#disponible').checked;

  if (!nombre || !descripcion) throw new Error('El nombre y la descripción son obligatorios.');
  if (!(precio > 0)) throw new Error('El precio debe ser mayor a cero.');
  if (!Number.isInteger(cantidad_stock) || cantidad_stock < 0) throw new Error('El stock debe ser un número entero de 0 o más.');
  return { nombre, descripcion, precio, cantidad_stock, disponible };
}

export async function render(app, { query = {} } = {}) {
  const cont = adminLayout(app, '/admin/productos');
  let productos = [];
  let umbral = 3;
  let soloBajo = Boolean(query.bajo);

  async function cargar() {
    const [lista, config] = await Promise.all([api('/admin/productos'), api('/admin/configuracion')]);
    productos = lista.sort((a, b) => b.id - a.id);
    umbral = Number(config.umbral_inventario_bajo ?? 3);
  }

  function pintar() {
    const bajos = productos.filter((p) => p.disponible && p.cantidad_stock <= umbral);
    const visibles = soloBajo ? bajos : productos;
    cont.innerHTML = `
      ${encabezadoAdmin('Productos e inventario', `${productos.length} productos · inventario bajo: ${umbral} unidades o menos (se cambia en Configuración).`,
        '<button class="btn btn-acento" type="button" data-accion="nuevo">Nuevo producto</button>')}
      <div class="d-flex flex-wrap gap-2 mb-3" role="group" aria-label="Filtrar productos">
        <button type="button" class="btn btn-sm ${soloBajo ? 'btn-outline-secondary' : 'btn-primary'}" data-accion="todos" aria-pressed="${!soloBajo}">Todos (${productos.length})</button>
        <button type="button" class="btn btn-sm ${soloBajo ? 'btn-primary' : 'btn-outline-secondary'}" data-accion="bajo" aria-pressed="${soloBajo}">Inventario bajo (${bajos.length})</button>
      </div>
      <div class="table-responsive rounded-4">
        <table class="table mb-0">
          <thead class="table-light small">
            <tr><th scope="col">Producto</th><th scope="col">Precio</th><th scope="col">Stock</th>
                <th scope="col">Catálogo</th><th scope="col">Acciones</th></tr>
          </thead>
          <tbody>
            ${visibles.length ? visibles.map((p) => `
              <tr>
                <td><div class="d-flex align-items-center gap-2">
                  <img class="mg-mini" src="${esc(urlImagen(p.imagen))}" alt="">
                  <span class="fw-semibold">${esc(p.nombre)}</span></div></td>
                <td>${moneda(p.precio)}</td>
                <td>
                  <form class="d-flex gap-1 align-items-center" data-stock="${p.id}" novalidate>
                    <label class="visually-hidden" for="stock-${p.id}">Stock de ${esc(p.nombre)}</label>
                    <input id="stock-${p.id}" class="form-control form-control-sm" type="number" min="0" step="1" value="${p.cantidad_stock}" style="width: 90px; min-height: 36px">
                    <button class="btn btn-outline-secondary btn-sm" type="submit">Guardar</button>
                  </form>
                  ${p.disponible && p.cantidad_stock <= umbral ? `<span class="estado estado-pendiente mt-1">${p.cantidad_stock === 0 ? 'Agotado' : 'Inventario bajo'}</span>` : ''}
                </td>
                <td><span class="estado ${p.disponible ? 'estado-entregado' : 'estado-cancelado'}">${p.disponible ? 'Visible' : 'Retirado'}</span></td>
                <td><div class="d-flex flex-wrap gap-1">
                  <button class="btn btn-outline-secondary btn-sm" data-accion="editar" data-id="${p.id}">Editar</button>
                  <button class="btn btn-outline-secondary btn-sm" data-accion="foto" data-id="${p.id}">Foto</button>
                  <button class="btn btn-outline-danger btn-sm" data-accion="eliminar" data-id="${p.id}">Eliminar</button>
                </div></td>
              </tr>`).join('')
              : `<tr><td colspan="5" class="text-center text-suave py-4">${soloBajo ? 'Ningún producto tiene inventario bajo.' : 'Aún no hay productos. Crea el primero.'}</td></tr>`}
          </tbody>
        </table>
      </div>`;
  }

  async function recargar(mensaje) {
    await cargar();
    pintar();
    if (mensaje) avisar(mensaje);
  }

  cont.innerHTML = cargando('Cargando productos…');
  try {
    await cargar();
  } catch (error) {
    cont.innerHTML = alerta(error.message);
    return;
  }
  pintar();
  // Acceso rápido "Nuevo producto": se abre cuando los oyentes ya están listos.
  if (query.nuevo) setTimeout(() => cont.querySelector('[data-accion="nuevo"]')?.click(), 0);

  // Ajuste rapido de inventario (RF15)
  cont.addEventListener('submit', async (ev) => {
    const form = ev.target.closest('[data-stock]');
    if (!form) return;
    ev.preventDefault();
    const id = Number(form.dataset.stock);
    const valor = Number(form.querySelector('input').value);
    if (!Number.isInteger(valor) || valor < 0) {
      avisar('El stock debe ser un número entero de 0 o más.', 'danger');
      return;
    }
    try {
      await api(`/productos/${id}`, { metodo: 'PATCH', cuerpo: { cantidad_stock: valor } });
      await recargar('Inventario actualizado.');
    } catch (error) {
      avisar(textoError(error), 'danger');
    }
  });

  cont.addEventListener('click', async (ev) => {
    const b = ev.target.closest('button[data-accion]');
    if (!b) return;
    const id = Number(b.dataset.id);
    const producto = productos.find((p) => p.id === id);

    try {
      switch (b.dataset.accion) {
        case 'todos':
        case 'bajo':
          soloBajo = b.dataset.accion === 'bajo';
          pintar();
          break;

        case 'nuevo': {
          const creado = await modal({
            titulo: 'Nuevo producto',
            textoAceptar: 'Crear producto',
            contenido: formulario(),
            alAceptar: async (el) => {
              const datos = leerFormulario(el);
              const archivo = el.querySelector('#foto').files[0];
              const errorFoto = validarImagen(archivo);
              if (errorFoto) throw new Error(errorFoto);
              const nuevo = await api('/productos', { metodo: 'POST', cuerpo: datos });
              if (archivo) await subirImagen(nuevo.id, archivo);
              return nuevo;
            },
          });
          if (creado) await recargar(`“${creado.nombre}” creado.`);
          break;
        }

        case 'editar': {
          const ok = await modal({
            titulo: `Editar · ${producto.nombre}`,
            textoAceptar: 'Guardar',
            contenido: formulario(producto),
            alAceptar: async (el) => {
              await api(`/productos/${id}`, { metodo: 'PATCH', cuerpo: leerFormulario(el) });
              return true;
            },
          });
          if (ok) await recargar('Producto actualizado.');
          break;
        }

        case 'foto': {
          const ok = await modal({
            titulo: `Foto · ${producto.nombre}`,
            textoAceptar: 'Subir foto',
            contenido: `
              <img class="mg-img-cuadrada mb-3" style="max-width: 200px" src="${esc(urlImagen(producto.imagen))}" alt="Foto actual">
              <label for="foto" class="form-label d-block">Nueva foto</label>
              <input id="foto" class="form-control" type="file" accept="image/jpeg,image/png,image/webp" required>
              <div class="form-text">JPG, PNG o WEBP, máximo 5 MB. Reemplaza la foto actual.</div>`,
            alAceptar: async (el) => {
              const archivo = el.querySelector('#foto').files[0];
              if (!archivo) throw new Error('Selecciona una foto.');
              const errorFoto = validarImagen(archivo);
              if (errorFoto) throw new Error(errorFoto);
              await subirImagen(id, archivo);
              return true;
            },
          });
          if (ok) await recargar('Foto actualizada.');
          break;
        }

        case 'eliminar':
          if (await confirmar('Eliminar producto',
            `¿Eliminar “${producto.nombre}”? Si ya tiene pedidos, se retirará del catálogo en lugar de borrarse.`, 'Eliminar', 'btn-danger')) {
            const retirado = await api(`/productos/${id}`, { metodo: 'DELETE' });
            await recargar(retirado ? `“${producto.nombre}” tiene pedidos: se retiró del catálogo.` : `“${producto.nombre}” eliminado.`);
          }
          break;
        default:
      }
    } catch (error) {
      avisar(textoError(error), 'danger');
    }
  });
}
