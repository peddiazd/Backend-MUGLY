// Mugs personalizados: el cliente inicia la solicitud y continua por WhatsApp
// (RF11, RF12, RF22). El administrador registra luego el pedido (D4a).
import { estado } from '../estado.js';
import { esc, enlaceWhatsApp } from '../componentes/ui.js';
import { CONFIG } from '../config.js';

export async function render(app) {
  const mensaje = estado.usuario
    ? `Hola MUGLY, quiero un mug personalizado. Mi cuenta es ${estado.usuario.correo}.`
    : 'Hola MUGLY, quiero un mug personalizado.';

  app.innerHTML = `
    <div class="container py-5 d-flex flex-column gap-5">
      <section class="row g-5 align-items-center">
        <div class="col-lg-7 d-flex flex-column gap-3">
          <p class="mg-eyebrow mb-0">Mugs personalizados</p>
          <h1 class="display-5 mb-0" style="color: var(--mg-primario)">Tu idea, en un mug hecho para ti</h1>
          <p class="lead text-suave mb-0">Cuéntanos qué quieres: una foto, un nombre, una frase o un logo.
            Definimos juntos los detalles por WhatsApp y registramos tu pedido para que puedas seguirlo aquí.</p>
          <div class="d-flex flex-wrap align-items-center gap-3">
            <a class="btn btn-primary btn-lg" target="_blank" rel="noopener" href="${esc(enlaceWhatsApp(CONFIG.WHATSAPP, mensaje))}">Escribir por WhatsApp</a>
            <span class="text-suave">+57 313 361 2247</span>
          </div>
          ${estado.usuario ? '' : `<p class="small text-suave mb-0">Para poder ver tu pedido en MUGLY, <a href="#/registro">crea tu cuenta</a> e indícanos tu correo.</p>`}
        </div>
        <div class="col-lg-5">
          <div class="mg-hero rounded-4 p-4 d-flex flex-column gap-3">
            <h2 class="h5 mb-0">Cómo funciona</h2>
            <ol class="mb-0 d-flex flex-column gap-2 ps-3">
              <li><strong>Escríbenos</strong> desde el botón y cuéntanos tu idea.</li>
              <li><strong>Definimos el diseño</strong>, el valor y el pago por WhatsApp.</li>
              <li><strong>Sigue tu pedido</strong>: lo registramos y lo ves en <a href="#/mis-pedidos">Mis pedidos</a>.</li>
            </ol>
          </div>
        </div>
      </section>
    </div>`;
}
