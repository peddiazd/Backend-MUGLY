// Registro de clientes (RF01). Tras registrarse, inicia sesion automaticamente.
import { api, textoError } from '../api.js';
import { iniciarSesion } from '../estado.js';
import { alerta, avisar } from '../componentes/ui.js';
import { navegar } from '../router.js';

const CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function render(app, { query }) {
  const volver = query.volver && query.volver.startsWith('/') && !query.volver.startsWith('//') ? query.volver : null;

  app.innerHTML = `
    <div class="container py-5" style="max-width: 460px">
      <div class="mg-tarjeta p-4 p-md-5">
        <h1 class="h3 mb-1">Crear cuenta</h1>
        <p class="text-suave">Regístrate para comprar y seguir tus pedidos.</p>
        <div id="errores"></div>
        <form id="formRegistro" novalidate class="d-flex flex-column gap-3">
          <div>
            <label for="correo" class="form-label">Correo</label>
            <input id="correo" type="email" class="form-control" autocomplete="email" required>
            <div class="invalid-feedback">Ingresa un correo válido.</div>
          </div>
          <div>
            <label for="contrasena" class="form-label">Contraseña</label>
            <input id="contrasena" type="password" class="form-control" autocomplete="new-password" minlength="6" required aria-describedby="ayudaContrasena">
            <div id="ayudaContrasena" class="form-text">Mínimo 6 caracteres.</div>
            <div class="invalid-feedback">La contraseña debe tener al menos 6 caracteres.</div>
          </div>
          <div>
            <label for="confirmacion" class="form-label">Confirmar contraseña</label>
            <input id="confirmacion" type="password" class="form-control" autocomplete="new-password" required>
            <div class="invalid-feedback">Las contraseñas no coinciden.</div>
          </div>
          <button class="btn btn-primary" type="submit">Crear cuenta</button>
        </form>
        <p class="small text-suave mt-3 mb-0">¿Ya tienes cuenta? <a href="#/ingresar">Ingresa</a></p>
      </div>
    </div>`;

  const form = document.getElementById('formRegistro');
  form.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const correo = document.getElementById('correo');
    const contrasena = document.getElementById('contrasena');
    const confirmacion = document.getElementById('confirmacion');

    correo.classList.toggle('is-invalid', !CORREO.test(correo.value.trim()));
    contrasena.classList.toggle('is-invalid', contrasena.value.length < 6);
    confirmacion.classList.toggle('is-invalid', !confirmacion.value || confirmacion.value !== contrasena.value);
    if (form.querySelector('.is-invalid')) return;

    const boton = form.querySelector('button');
    boton.disabled = true;
    document.getElementById('errores').innerHTML = '';
    const credenciales = { correo: correo.value.trim(), contrasena: contrasena.value };
    try {
      await api('/usuarios/registro', { metodo: 'POST', cuerpo: credenciales });
      const datos = await api('/usuarios/login', { metodo: 'POST', cuerpo: credenciales });
      iniciarSesion(datos.access_token, datos.usuario);
      avisar('Cuenta creada. ¡Bienvenido a MUGLY!');
      navegar(volver ?? '/');
    } catch (error) {
      document.getElementById('errores').innerHTML = alerta(textoError(error));
      boton.disabled = false;
    }
  });
}
