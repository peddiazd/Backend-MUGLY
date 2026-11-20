// Inicio de sesion de clientes y administradores (RF02, RF13).
import { api } from '../api.js';
import { iniciarSesion } from '../estado.js';
import { alerta, avisar } from '../componentes/ui.js';
import { navegar } from '../router.js';

const CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function destinoSeguro(volver) {
  // Solo rutas internas de la SPA.
  return volver && volver.startsWith('/') && !volver.startsWith('//') ? volver : null;
}

export async function render(app, { query }) {
  const volver = destinoSeguro(query.volver);

  app.innerHTML = `
    <div class="container py-5" style="max-width: 460px">
      <div class="mg-tarjeta p-4 p-md-5">
        <h1 class="h3 mb-1">Ingresar</h1>
        <p class="text-suave">Accede para comprar y seguir tus pedidos.</p>
        <div id="errores"></div>
        <form id="formIngresar" novalidate class="d-flex flex-column gap-3">
          <div>
            <label for="correo" class="form-label">Correo</label>
            <input id="correo" type="email" class="form-control" autocomplete="username" required>
            <div class="invalid-feedback">Ingresa un correo válido.</div>
          </div>
          <div>
            <label for="contrasena" class="form-label">Contraseña</label>
            <input id="contrasena" type="password" class="form-control" autocomplete="current-password" required>
            <div class="invalid-feedback">Ingresa tu contraseña.</div>
          </div>
          <button class="btn btn-primary" type="submit">Ingresar</button>
        </form>
        <p class="small text-suave mt-3 mb-0">¿No tienes cuenta? <a href="#/registro${volver ? `?volver=${encodeURIComponent(volver)}` : ''}">Regístrate</a></p>
      </div>
    </div>`;

  const form = document.getElementById('formIngresar');
  form.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const correo = document.getElementById('correo');
    const contrasena = document.getElementById('contrasena');
    correo.classList.toggle('is-invalid', !CORREO.test(correo.value.trim()));
    contrasena.classList.toggle('is-invalid', !contrasena.value);
    if (form.querySelector('.is-invalid')) return;

    const boton = form.querySelector('button');
    boton.disabled = true;
    document.getElementById('errores').innerHTML = '';
    try {
      const datos = await api('/usuarios/login', {
        metodo: 'POST',
        cuerpo: { correo: correo.value.trim(), contrasena: contrasena.value },
      });
      iniciarSesion(datos.access_token, datos.usuario);
      avisar('Sesión iniciada.');
      navegar(volver ?? (datos.usuario.rol === 'admin' ? '/admin/pedidos' : '/'));
    } catch (error) {
      document.getElementById('errores').innerHTML = alerta(error.message);
      boton.disabled = false;
    }
  });
}
