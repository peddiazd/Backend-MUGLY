// Nosotros: quiénes somos y cómo compras en MUGLY. Solo hechos del sistema.
import { esc, enlaceWhatsApp, icono } from '../componentes/ui.js';
import { CONFIG } from '../config.js';
import { instalarDefinicionesMug, mugSVG } from '../componentes/mockups.js';
import { obtenerContenido } from '../componentes/contenidoTienda.js';

export async function render(app, { query = {} } = {}) {
  instalarDefinicionesMug();
  let textos = {
    titulo: 'Hecho para ti, de principio a fin.',
    texto: 'MUGLY reúne en un solo lugar el catálogo, tus compras y tus pedidos. ¿Tienes una idea especial? La diseñamos contigo por WhatsApp.',
  };
  try {
    const c = await obtenerContenido({ borrador: query.vista === 'borrador' });
    textos = { ...textos, ...(c.paginas?.nosotros || {}) };
  } catch {
    /* se muestran los textos de siempre */
  }
  const telefono = `+${CONFIG.WHATSAPP.slice(0, 2)} ${CONFIG.WHATSAPP.slice(2, 5)} ${CONFIG.WHATSAPP.slice(5, 8)} ${CONFIG.WHATSAPP.slice(8)}`;

  app.innerHTML = `
    <section class="container">
      <div class="row g-5 align-items-center mg-cabecera-pagina">
        <div class="col-lg-6">
          <h1>${esc(textos.titulo)}</h1>
          <p>${esc(textos.texto)}</p>
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
        <a class="btn btn-primary btn-lg" target="_blank" rel="noopener" href="${esc(enlaceWhatsApp(CONFIG.WHATSAPP, `Hola ${CONFIG.NOMBRE}, tengo una pregunta.`))}">${icono('chat')} Escribir por WhatsApp</a>
      </div>
    </section>`;
}
