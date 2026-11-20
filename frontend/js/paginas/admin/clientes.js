// Administracion de clientes: consultar, editar y desactivar (RF18, D5).
import { api, textoError } from '../../api.js';
import { estado } from '../../estado.js';
import { adminLayout } from '../../componentes/adminLayout.js';
import { esc, fecha, cargando, alerta, avisar, modal, confirmar } from '../../componentes/ui.js';

export async function render(app) {
  const cont = adminLayout(app, '/admin/clientes');
  let usuarios = [];

  async function cargar() {
    const lista = await api('/admin/usuarios');
    usuarios = await Promise.all(lista.map((u) => api(`/admin/usuarios/${u.id}`)));
    usuarios.sort((a, b) => b.id - a.id);
  }

  function pintar() {
    cont.innerHTML = `
      <h1 class="h2 mb-4">Clientes</h1>
      <div class="bg-white rounded-4 table-responsive">
        <table class="table mb-0">
          <thead class="table-light small">
            <tr><th scope="col">Correo</th><th scope="col">Nombre</th><th scope="col">Teléfono</th><th scope="col">Rol</th>
                <th scope="col">Registro</th><th scope="col">Estado</th><th scope="col">Acciones</th></tr>
          </thead>
          <tbody>
            ${usuarios.map((u) => {
              const perfil = u.perfil ?? {};
              const nombre = [perfil.nombre, perfil.apellido].filter(Boolean).join(' ');
              const propio = u.id === estado.usuario?.id;
              return `
              <tr>
                <td>${esc(u.correo)}${propio ? ' <span class="small text-suave">(tú)</span>' : ''}</td>
                <td>${esc(nombre || '—')}</td>
                <td>${esc(perfil.telefono || '—')}</td>
                <td>${u.rol === 'admin' ? 'Administrador' : 'Cliente'}</td>
                <td class="small">${fecha(u.fecha_creacion)}</td>
                <td><span class="estado ${u.activo ? 'estado-entregado' : 'estado-cancelado'}">${u.activo ? 'Activo' : 'Desactivado'}</span></td>
                <td><div class="d-flex flex-wrap gap-1">
                  <button class="btn btn-outline-secondary btn-sm" data-accion="editar" data-id="${u.id}">Editar</button>
                  ${propio ? '' : `<button class="btn btn-sm ${u.activo ? 'btn-outline-danger' : 'btn-outline-primary'}" data-accion="${u.activo ? 'desactivar' : 'activar'}" data-id="${u.id}">${u.activo ? 'Desactivar' : 'Activar'}</button>`}
                </div></td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>
      <p class="small text-suave mt-3 mb-0">Un cliente desactivado no puede iniciar sesión. Su cuenta y sus pedidos se conservan.</p>`;
  }

  async function recargar(mensaje) {
    await cargar();
    pintar();
    if (mensaje) avisar(mensaje);
  }

  cont.innerHTML = cargando('Cargando clientes…');
  try {
    await cargar();
  } catch (error) {
    cont.innerHTML = alerta(error.message);
    return;
  }
  pintar();

  cont.addEventListener('click', async (ev) => {
    const b = ev.target.closest('button[data-accion]');
    if (!b) return;
    const id = Number(b.dataset.id);
    const u = usuarios.find((x) => x.id === id);
    const perfil = u.perfil ?? {};

    try {
      if (b.dataset.accion === 'editar') {
        const ok = await modal({
          titulo: `Editar · ${u.correo}`,
          textoAceptar: 'Guardar',
          contenido: `
            <div class="row g-3">
              <div class="col-6"><label for="nombre" class="form-label">Nombre</label>
                <input id="nombre" class="form-control" maxlength="50" value="${esc(perfil.nombre ?? '')}"></div>
              <div class="col-6"><label for="apellido" class="form-label">Apellido</label>
                <input id="apellido" class="form-control" maxlength="50" value="${esc(perfil.apellido ?? '')}"></div>
              <div class="col-12"><label for="telefono" class="form-label">Teléfono</label>
                <input id="telefono" class="form-control" type="tel" maxlength="20" value="${esc(perfil.telefono ?? '')}"></div>
            </div>`,
          alAceptar: async (el) => {
            const cuerpo = {
              nombre: el.querySelector('#nombre').value.trim(),
              apellido: el.querySelector('#apellido').value.trim(),
              telefono: el.querySelector('#telefono').value.trim(),
            };
            if (cuerpo.telefono && !/^[0-9+\s-]{7,20}$/.test(cuerpo.telefono)) {
              throw new Error('El teléfono solo puede tener números, espacios, + o guiones (7 a 20 caracteres).');
            }
            await api(`/admin/usuarios/${id}`, { metodo: 'PATCH', cuerpo });
            return true;
          },
        });
        if (ok) await recargar('Datos del cliente actualizados.');
      }

      if (b.dataset.accion === 'desactivar' || b.dataset.accion === 'activar') {
        const activar = b.dataset.accion === 'activar';
        const ok = await confirmar(
          activar ? 'Activar cliente' : 'Desactivar cliente',
          activar ? `¿Permitir que ${u.correo} vuelva a iniciar sesión?` : `¿Desactivar a ${u.correo}? No podrá iniciar sesión; su cuenta y sus pedidos se conservan.`,
          activar ? 'Activar' : 'Desactivar',
          activar ? 'btn-primary' : 'btn-danger',
        );
        if (ok) {
          await api(`/admin/usuarios/${id}`, { metodo: 'PATCH', cuerpo: { activo: activar } });
          await recargar(activar ? 'Cliente activado.' : 'Cliente desactivado.');
        }
      }
    } catch (error) {
      avisar(textoError(error), 'danger');
    }
  });
}
