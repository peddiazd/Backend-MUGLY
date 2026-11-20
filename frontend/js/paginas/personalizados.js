// Mugs personalizados: el cliente inicia la solicitud y continua por WhatsApp
// (RF11, RF12, RF22). El administrador registra luego el pedido (D4a).
// Escena con scroll: el mismo mug recibe varios diseños, uno tras otro.
import { estado } from '../estado.js';
import { esc, enlaceWhatsApp, icono } from '../componentes/ui.js';
import { CONFIG } from '../config.js';
import { instalarDefinicionesMug, mugSVG, ESTILOS } from '../componentes/mockups.js';
import { montarEscena, desmontarEscena, seguirProgreso, suave, tramo, reducirMovimiento } from '../componentes/escena.js';

// Secuencia de diseños que se imprimen sobre el mismo mug.
const SECUENCIA = [
  { d: 'personalizado', titulo: 'Tu foto.', texto: 'Un recuerdo, tu familia, tu mascota.' },
  { d: 'frases', titulo: 'Tu frase.', texto: 'La que dices cada mañana, o la que nadie entiende.' },
  { d: 'kawaii', titulo: 'Algo tierno.', texto: 'Para regalar, o para darte un gusto.' },
  { d: 'gamer', titulo: 'Tu juego.', texto: 'Pixel art para las partidas largas.' },
  { d: 'anime', titulo: 'Tu estilo.', texto: 'El que te represente. Lo diseñamos contigo.' },
];
const INICIO = .08, PASO = .16, IMPRIME = .09;

function escenaSecuencia(acto, id) {
  const reducir = reducirMovimiento();
  const cam = acto.querySelector('.xp-camara');
  const cortes = [...acto.querySelectorAll('.mg-corte')];
  const calor = acto.querySelector('.mg-calor');
  const X0 = 56, X1 = 304;

  seguirProgreso(acto, id, (p) => {
    let activa = -1, pulso = 0;
    cortes.forEach((corte, i) => {
      const a = INICIO + i * PASO;
      const imp = reducir ? (i === cortes.length - 1 ? 1 : 0) : suave(tramo(p, a, a + IMPRIME));
      corte.setAttribute('width', (X0 + (X1 - X0) * imp).toFixed(1));
      if (imp > 0 && imp < 1) { activa = i; pulso = Math.sin(imp * Math.PI); }
      // Una vez impreso el siguiente, el anterior ya no hace falta.
      const siguiente = INICIO + (i + 1) * PASO + IMPRIME;
      if (!reducir && i < cortes.length - 1 && p > siguiente) corte.setAttribute('width', '0');
    });
    const imp = activa >= 0 ? suave(tramo(p, INICIO + activa * PASO, INICIO + activa * PASO + IMPRIME)) : 0;
    calor.setAttribute('x', (X0 + (X1 - X0) * imp - 5).toFixed(1));
    calor.setAttribute('opacity', activa >= 0 && !reducir ? '.95' : '0');

    // Cámara: entra desde lejos y "respira" con cada impresión.
    const llegada = reducir ? 1 : suave(tramo(p, 0, INICIO));
    const s = (.82 + .18 * llegada) * (1 + pulso * .05);
    cam.style.transform = `translate3d(0, ${((1 - llegada) * 6).toFixed(2)}%, 0) scale(${s.toFixed(4)})`;
    acto.style.setProperty('--halo', (.82 + p * .3).toFixed(3));
    acto.style.setProperty('--avance', p.toFixed(3));
  });
}

export async function render(app, { query = {} } = {}) {
  desmontarEscena();
  instalarDefinicionesMug();
  const estilo = ESTILOS.find((e) => e.id === query.estilo && e.id !== 'personalizado');
  const base = estilo ? `Hola MUGLY, me interesa un mug estilo ${estilo.nombre} (${estilo.diseno}).` : 'Hola MUGLY, quiero un mug personalizado.';
  const mensaje = estado.usuario ? `${base} Mi cuenta es ${estado.usuario.correo}.` : base;
  const whatsapp = esc(enlaceWhatsApp(CONFIG.WHATSAPP, mensaje));
  const fin = INICIO + SECUENCIA.length * PASO;

  app.innerHTML = `
    <span data-sc-progress aria-hidden="true"></span>

    <section class="xp-show xp-perso" id="secuencia" data-sc-act="pin" data-sc-span="4.4">
      <div data-sc-stage>
        <div class="xp-lienzo">
          <div class="xp-halo" aria-hidden="true"></div>
          <div class="xp-camara">${mugSVG(SECUENCIA[0].d, 'espejo', { prensa: true, capas: SECUENCIA.map((s) => s.d), etiqueta: 'Mug blanco que recibe diferentes diseños personalizados' })}</div>
        </div>
        <div class="xp-textos">
          <div data-sc-cue="0 ${INICIO + .02} 0">
            <h1 class="xp-titulo-pagina">${estilo ? `Tu mug estilo ${esc(estilo.nombre)}` : 'Tu idea, en un mug hecho para ti.'}</h1>
            <p>Una foto, un nombre, una frase o un logo. Baja y mira cómo queda.</p>
            <a class="btn btn-acento mt-3" target="_blank" rel="noopener" href="${whatsapp}">${icono('chat', 18)} Escribir por WhatsApp</a>
          </div>
          ${SECUENCIA.map((s, i) => {
            const a = INICIO + i * PASO;
            return `<div data-sc-cue="${a.toFixed(2)} ${(a + PASO + .01).toFixed(2)}"><h2>${s.titulo}</h2><p>${s.texto}</p></div>`;
          }).join('')}
          <div data-sc-cue="${(fin - .02).toFixed(2)}">
            <h2>Cuéntanos tu idea.</h2>
            <p>Definimos juntos el diseño y el valor por WhatsApp, y registramos tu pedido para que lo sigas aquí.</p>
            <a class="btn btn-acento mt-3" target="_blank" rel="noopener" href="${whatsapp}">${icono('chat', 18)} Escribir por WhatsApp</a>
          </div>
        </div>
        <div class="xp-avance" aria-hidden="true"></div>
      </div>
    </section>

    <section class="container py-5">
      <div class="mg-hero rounded-4 p-4 p-md-5 d-flex flex-wrap align-items-center justify-content-between gap-4">
        <div>
          <h2 class="h3 mb-3">Cómo funciona</h2>
          <ol class="xp-pasos m-0" style="color:var(--mg-tinta)">
            <li><span class="mg-punto">${icono('chat')}</span><div><b>Escríbenos</b> desde el botón y cuéntanos tu idea.</div></li>
            <li><span class="mg-punto">${icono('lapiz')}</span><div><b>Definimos el diseño</b>, el valor y el pago por WhatsApp.</div></li>
            <li><span class="mg-punto">${icono('ruta')}</span><div><b>Sigue tu pedido</b>: lo registramos y lo ves en <a href="#/mis-pedidos">Mis pedidos</a>.</div></li>
          </ol>
        </div>
        <div class="d-flex flex-column align-items-start gap-2">
          <a class="btn btn-acento btn-lg" target="_blank" rel="noopener" href="${whatsapp}">${icono('chat', 18)} Escribir por WhatsApp</a>
          <span class="text-suave">+57 313 361 2247</span>
          ${estado.usuario ? '' : '<span class="small text-suave">Para ver tu pedido aquí, <a href="#/registro">crea tu cuenta</a>.</span>'}
        </div>
      </div>
    </section>`;

  try {
    const id = await montarEscena(app, '/personalizados');
    escenaSecuencia(document.getElementById('secuencia'), id);
  } catch (error) {
    console.error(error);
  }
}
