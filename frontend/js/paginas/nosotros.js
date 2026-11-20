// Nosotros: quiénes somos y cómo compras en MUGLY. Solo hechos del sistema.
import { esc, enlaceWhatsApp, icono } from '../componentes/ui.js';
import { CONFIG } from '../config.js';
import { instalarDefinicionesMug, mugSVG } from '../componentes/mockups.js';

export async function render(app) {
  instalarDefinicionesMug();
  const telefono = `+${CONFIG.WHATSAPP.slice(0, 2)} ${CONFIG.WHATSAPP.slice(2, 5)} ${CONFIG.WHATSAPP.slice(5, 8)} ${CONFIG.WHATSAPP.slice(8)}`;

  app.innerHTML = `
    <section class="container">
      <div class="row g-5 align-items-center mg-cabecera-pagina">
        <div class="col-lg-6">
          <h1>Hecho para ti, de principio a fin.</h1>
          <p>MUGLY reúne en un solo lugar el catálogo, tus compras y tus pedidos. ¿Tienes una idea especial? La diseñamos contigo por WhatsApp.</p>
          <div class="d-flex flex-wrap gap-3 mt-4">
            <a class="btn btn-acento btn-lg" href="#/catalogo">Ver catálogo</a>
            <a class="btn btn-outline-primary btn-lg" href="#/personalizados">Pedir un personalizado</a>
          </div>
        </div>
        <div class="col-lg-6">
          <div class="mg-trio" role="img" aria-label="Tres mugs MUGLY sobre una repisa: frase, anime y kawaii">
            <div class="mg-trio-mug lado">${mugSVG('frases', 'frente', { etiqueta: '' })}</div>
            <div class="mg-trio-mug centro">${mugSVG('anime', 'espejo', { etiqueta: '' })}</div>
            <div class="mg-trio-mug lado">${mugSVG('kawaii', 'espejo', { etiqueta: '' })}</div>
            <div class="mg-trio-repisa"></div>
          </div>
        </div>
      </div>
    </section>

    <section class="container pb-5">
      <h2 class="mb-4">Cómo compras en MUGLY</h2>
      <ul class="mg-hechos">
        <li>${icono('caja', 28)}<div><b>Stock real</b><span>Solo ves los mugs que están disponibles.</span></div></li>
        <li>${icono('chat', 28)}<div><b>Pago por WhatsApp</b><span>Tu pedido queda pendiente y coordinamos el pago contigo.</span></div></li>
        <li>${icono('ruta', 28)}<div><b>Sigue tu pedido</b><span>Estado, transportadora y número de guía en Mis pedidos.</span></div></li>
      </ul>
      <div class="mg-hero rounded-4 p-4 p-md-5 mt-5 d-flex flex-wrap align-items-center justify-content-between gap-3">
        <div>
          <h2 class="h3 mb-1">¿Hablamos?</h2>
          <p class="text-suave mb-0">WhatsApp ${esc(telefono)}</p>
        </div>
        <a class="btn btn-primary btn-lg" target="_blank" rel="noopener" href="${esc(enlaceWhatsApp(CONFIG.WHATSAPP, 'Hola MUGLY, tengo una pregunta.'))}">${icono('chat')} Escribir por WhatsApp</a>
      </div>
    </section>`;
}
