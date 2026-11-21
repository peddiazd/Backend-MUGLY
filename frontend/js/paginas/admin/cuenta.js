// Mi cuenta del administrador: datos del perfil (GET/PATCH /usuarios/perfil).
import { api, textoError } from '../../api.js';
import { estado } from '../../estado.js';
import { adminLayout, encabezadoAdmin } from '../../componentes/adminLayout.js';
import { esc, cargando, alerta, avisar } from '../../componentes/ui.js';

export async function render(app) {
  const cont = adminLayout(app, '/admin/cuenta');
  cont.innerHTML = cargando('Cargando tu cuenta…');

  let perfil;
  try {
    perfil = await api('/usuarios/perfil');
  } catch (error) {
    if (error.status !== 404) {
      cont.innerHTML = alerta(textoError(error));
      return;
    }
    perfil = {};  // Sin perfil todavía: se crea al guardar.
  }

  cont.innerHTML = `
    ${encabezadoAdmin('Mi cuenta', `${esc(estado.usuario?.correo ?? '')} · Administrador`)}
    <section class="mg-panel" style="max-width:640px">
      <form id="formCuenta" novalidate class="row g-3">
        <div class="col-sm-6"><label for="nombre" class="form-label">Nombre</label>
          <input id="nombre" class="form-control" maxlength="50" value="${esc(perfil.nombre ?? '')}"></div>
        <div class="col-sm-6"><label for="apellido" class="form-label">Apellido</label>
          <input id="apellido" class="form-control" maxlength="50" value="${esc(perfil.apellido ?? '')}"></div>
        <div class="col-12"><label for="telefono" class="form-label">Teléfono</label>
          <input id="telefono" class="form-control" type="tel" maxlength="20" value="${esc(perfil.telefono ?? '')}">
          <div class="invalid-feedback">Solo números, espacios, + o guiones (7 a 20 caracteres).</div></div>
        <div class="col-12"><button class="btn btn-primary" type="submit">Guardar</button></div>
      </form>
      <p class="mg-nota mb-0">El correo y la contraseña no se cambian desde aquí.</p>
    </section>`;

  cont.querySelector('#formCuenta').addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const f = ev.target;
    const tel = f.querySelector('#telefono');
    const telOk = !tel.value.trim() || /^[0-9+\s-]{7,20}$/.test(tel.value.trim());
    tel.classList.toggle('is-invalid', !telOk);
    if (!telOk) return;
    try {
      await api('/usuarios/perfil', {
        metodo: 'PATCH',
        cuerpo: { nombre: f.querySelector('#nombre').value.trim(), apellido: f.querySelector('#apellido').value.trim(), telefono: tel.value.trim() },
      });
      avisar('Tu cuenta se actualizó.');
    } catch (error) {
      avisar(textoError(error), 'danger');
    }
  });
}
