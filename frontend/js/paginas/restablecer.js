// Crear o restablecer la contraseña con el enlace que envía la tienda por
// WhatsApp (v1.3.0, CR-02, RF29). El enlace sirve una sola vez y vence.
import { api, textoError } from '../api.js';
import { alerta, avisar } from '../componentes/ui.js';
import { navegar } from '../router.js';

export async function render(app, { query }) {
  const token = query.t || '';
  app.innerHTML = `
    <div class="container py-5" style="max-width: 460px">
      <div class="mg-tarjeta p-4 p-md-5">
        <h1 class="h3 mb-1">Crea tu contraseña</h1>
        <p class="text-suave">Elige la contraseña con la que vas a ingresar a la tienda.</p>
        <div id="errores">${token ? '' : alerta('El enlace no es válido. Pide uno nuevo a la tienda por WhatsApp.')}</div>
        <form id="formClave" novalidate class="d-flex flex-column gap-3" ${token ? '' : 'hidden'}>
          <div>
            <label for="clave" class="form-label">Contraseña nueva</label>
            <input id="clave" type="password" class="form-control" autocomplete="new-password" minlength="6" required>
            <div class="invalid-feedback">Usa al menos 6 caracteres.</div>
          </div>
          <div>
            <label for="clave2" class="form-label">Repite la contraseña</label>
            <input id="clave2" type="password" class="form-control" autocomplete="new-password" required>
            <div class="invalid-feedback">Las contraseñas no coinciden.</div>
          </div>
          <button class="btn btn-primary" type="submit">Guardar contraseña</button>
        </form>
      </div>
    </div>`;

  const form = document.getElementById('formClave');
  form.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const c1 = form.querySelector('#clave'), c2 = form.querySelector('#clave2');
    const ok1 = c1.value.length >= 6, ok2 = ok1 && c2.value === c1.value;
    c1.classList.toggle('is-invalid', !ok1); c2.classList.toggle('is-invalid', !ok2);
    if (!ok1 || !ok2) return;
    const boton = form.querySelector('button'); boton.disabled = true;
    try {
      const datos = await api('/usuarios/restablecer-contrasena', { metodo: 'POST', cuerpo: { token, contrasena: c1.value } });
      avisar('Contraseña guardada. Ya puedes ingresar.');
      navegar(`/ingresar?correo=${encodeURIComponent(datos.correo)}`);
    } catch (error) {
      boton.disabled = false;
      document.getElementById('errores').innerHTML = alerta(textoError(error));
    }
  });
}
