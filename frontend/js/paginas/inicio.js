// Inicio · THE MUG EXPERIENCE
// Presentación de producto controlada por scroll (motor scrollcraft, skill
// scroll-craft). El catálogo, personalizados y nosotros son páginas propias.
import { api, urlImagen } from '../api.js';
import { esc, cargando, alerta, icono } from '../componentes/ui.js';
import { obtenerContenido } from '../componentes/contenidoTienda.js';
import { instalarDefinicionesMug, mugSVG, ESTILOS } from '../componentes/mockups.js';
import { tarjetaProducto, enlazarAgregar } from '../componentes/producto.js';
import { montarEscena, desmontarEscena, seguirProgreso, suave, tramo } from '../componentes/escena.js';

// Elementos gráficos del diseño anime que se despliegan alrededor del mug.
const FRAGMENTOS = [
  { svg: '<path d="M32 4l7 17 17 7-17 7-7 17-7-17-17-7 17-7z" fill="#5EB8F2"/>', a: -150, r: 1.0 },
  { svg: '<path d="M32 54C14 42 4 30 10 18c5-9 17-9 22 0 5-9 17-9 22 0 6 12-4 24-22 36z" fill="#FF8FA8"/>', a: -95, r: 1.12 },
  { svg: '<path d="M20 8c-8 10 8 16 0 26M34 4c-8 10 8 16 0 26M48 8c-8 10 8 16 0 26" fill="none" stroke="#344B36" stroke-width="5" stroke-linecap="round"/>', a: -40, r: 1.05 },
  { svg: '<circle cx="32" cy="32" r="22" fill="#F2C94C"/><path d="M22 34q10 10 20 0" fill="none" stroke="#292929" stroke-width="4" stroke-linecap="round"/><circle cx="25" cy="26" r="3.5" fill="#292929"/><circle cx="39" cy="26" r="3.5" fill="#292929"/>', a: 10, r: 1.15 },
  { svg: '<path d="M32 4l7 17 17 7-17 7-7 17-7-17-17-7 17-7z" fill="#F2C94C"/>', a: 55, r: .98 },
  { svg: '<g fill="none" stroke="#292929" stroke-width="4" stroke-linecap="round"><path d="M6 20h30M12 32h44M4 44h26"/></g>', a: 110, r: 1.1 },
  { svg: '<path d="M32 54C14 42 4 30 10 18c5-9 17-9 22 0 5-9 17-9 22 0 6 12-4 24-22 36z" fill="#B7C5A4"/>', a: 160, r: 1.02 },
  { svg: '<rect x="10" y="10" width="44" height="44" rx="6" fill="#FFFFFF" stroke="#292929" stroke-width="4"/><circle cx="32" cy="32" r="8" fill="#292929"/>', a: 205, r: 1.14 },
];

// Fotogramas de cámara: p, escala, desplazamiento x / y (% del ancho del mug).
const CAMARA = [
  { p: 0, s: .74, x: 0, y: 6 },
  { p: .12, s: .74, x: 0, y: 6 },
  { p: .36, s: 1, x: 0, y: 0 },
  { p: .54, s: 1, x: 0, y: 0 },
  { p: .64, s: 1.85, x: 2, y: -5 },
  { p: .72, s: 1.85, x: 2, y: -5 },
  { p: .79, s: 1.6, x: 46, y: -3 },
  { p: .85, s: 1.6, x: 46, y: -3 },
  { p: .92, s: 1, x: 0, y: 0 },
  { p: 1, s: 1, x: 0, y: 0 },
];


function camara(p) {
  for (let i = 1; i < CAMARA.length; i++) {
    const A = CAMARA[i - 1], B = CAMARA[i];
    if (p <= B.p) {
      const t = suave(tramo(p, A.p, B.p));
      return { s: A.s + (B.s - A.s) * t, x: A.x + (B.x - A.x) * t, y: A.y + (B.y - A.y) * t };
    }
  }
  return CAMARA[CAMARA.length - 1];
}

function escenaProtagonista(acto, id) {
  const reducir = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const cam = acto.querySelector('.xp-camara');
  const tres = acto.querySelector('.xp-vista-tres');
  const corte = acto.querySelector('.xp-vista-frente .mg-corte');
  const calor = acto.querySelector('.xp-vista-frente .mg-calor');
  const frags = [...acto.querySelectorAll('.xp-frag')];
  const chips = [...acto.querySelectorAll('.xp-detalle')];
  const X0 = 196, X1 = 444;

  function pintar(p) {
    // Cámara: acercamiento, detalle del diseño, recorrido al asa y regreso.
    const c = reducir ? { s: 1, x: 0, y: 0 } : { ...camara(p) };
    if (innerWidth < 860) { c.s = 1 + (c.s - 1) * .7; c.x *= .7; }   // celular: menos intensidad
    cam.style.transform = `translate3d(${c.x}%, ${c.y}%, 0) scale(${c.s.toFixed(4)})`;

    // La prensa: la línea de calor deja el diseño impreso a su paso.
    const imp = reducir ? 1 : suave(tramo(p, .14, .36));
    corte.setAttribute('width', (X0 + (X1 - X0) * imp).toFixed(1));
    calor.setAttribute('x', (X0 + (X1 - X0) * imp - 5).toFixed(1));
    calor.setAttribute('opacity', imp > 0 && imp < 1 ? '.95' : '0');

    // Fragmentos: llegan desde la profundidad, orbitan y se dispersan.
    const llega = suave(tramo(p, .3, .48));
    const sale = suave(tramo(p, .52, .62));
    const radio = cam.offsetWidth * .62;
    frags.forEach((f, i) => {
      if (reducir) { f.style.opacity = 0; return; }
      const ang = (FRAGMENTOS[i].a + p * 40) * Math.PI / 180;
      const lejos = 2.6 - 1.6 * llega + sale * 1.2;
      const r = radio * FRAGMENTOS[i].r * (lejos > 1 ? 1 + (lejos - 1) * 1.4 : 1);
      const z = (1 - llega) * 1.8 + 1 + sale * .6;
      f.style.transform = `translate3d(${(Math.cos(ang) * r).toFixed(1)}px, ${(Math.sin(ang) * r * .82).toFixed(1)}px, 0) scale(${z.toFixed(3)}) rotate(${(i * 23 + p * 90).toFixed(1)}deg)`;
      f.style.opacity = (llega * (1 - sale)).toFixed(3);
      f.style.filter = llega < .98 ? `blur(${((1 - llega) * 6).toFixed(1)}px)` : 'none';
    });

    // Cambio de perspectiva: de frente a tres cuartos.
    // Relevo escalonado (no fundido simultáneo): primero se va el frente,
    // luego entra la vista de tres cuartos; el desenfoque disimula el cambio.
    const sale1 = reducir ? 0 : suave(tramo(p, .85, .88));
    const entra2 = reducir ? 0 : suave(tramo(p, .875, .92));
    const frente = acto.querySelector('.xp-vista-frente');
    frente.style.opacity = (1 - sale1).toFixed(3);
    frente.style.filter = sale1 > 0 && sale1 < 1 ? `blur(${(sale1 * 8).toFixed(1)}px)` : 'none';
    tres.style.opacity = entra2.toFixed(3);
    tres.style.filter = entra2 > 0 && entra2 < 1 ? `blur(${((1 - entra2) * 8).toFixed(1)}px)` : 'none';
    tres.style.transform = `perspective(900px) rotateY(${((1 - entra2) * -18).toFixed(2)}deg) scale(${(.94 + entra2 * .06).toFixed(3)})`;

    // Etiquetas de detalle y halo.
    chips[0].style.opacity = reducir ? 0 : (tramo(p, .6, .64) * (1 - tramo(p, .72, .75))).toFixed(3);
    chips[1].style.opacity = reducir ? 0 : (tramo(p, .79, .81) * (1 - tramo(p, .85, .87))).toFixed(3);
    acto.style.setProperty('--halo', (.8 + p * .35).toFixed(3));
    acto.style.setProperty('--avance', p.toFixed(3));
  }

  seguirProgreso(acto, id, pintar);
}

// Texto con la palabra resaltada envuelta en <em> (el subrayado amarillo).
function tituloResaltado(titulo, resaltado) {
  const seguro = esc(titulo);
  const palabra = esc(resaltado || '');
  if (!palabra || !seguro.includes(palabra)) return seguro;
  return seguro.replace(palabra, `<em>${palabra}</em>`);
}

const HOJAS = `<svg viewBox="0 0 220 260" width="100%"><g fill="none" stroke="#344B36" stroke-width="3" stroke-linecap="round"><path d="M40 258C70 190 110 120 190 40"/><path d="M110 258c10-60 40-110 90-150"/></g>
  <g fill="#7E9B6E"><ellipse cx="78" cy="180" rx="26" ry="11" transform="rotate(-50 78 180)"/><ellipse cx="112" cy="128" rx="26" ry="11" transform="rotate(-40 112 128)"/><ellipse cx="150" cy="84" rx="24" ry="10" transform="rotate(-35 150 84)"/></g>
  <g fill="#B7C5A4"><ellipse cx="62" cy="214" rx="24" ry="10" transform="rotate(30 62 214)"/><ellipse cx="98" cy="156" rx="24" ry="10" transform="rotate(35 98 156)"/><ellipse cx="136" cy="104" rx="22" ry="9" transform="rotate(40 136 104)"/><ellipse cx="146" cy="172" rx="22" ry="9" transform="rotate(-30 146 172)"/></g>
  <g fill="#344B36"><ellipse cx="128" cy="214" rx="20" ry="8" transform="rotate(30 128 214)"/><ellipse cx="164" cy="104" rx="18" ry="7" transform="rotate(-50 164 104)"/></g></svg>`;

// Cada sección de Inicio se arma con su contenido administrable.
const SECCIONES = {
  portada: (d) => `
    <section class="xp-portada" data-sc-act="flow">
      <div class="container">
        <div class="xp-copy">
          <h1>${tituloResaltado(d.titulo, d.resaltado)}</h1>
          <p class="lead">${esc(d.subtitulo)}</p>
          <div class="xp-acciones">
            <a class="btn btn-acento btn-lg" href="#/catalogo">${esc(d.boton)} ${icono('flecha', 18)}</a>
            <a class="xp-enlace" href="#/personalizados">${esc(d.enlace_secundario)} ${icono('flecha', 18)}</a>
          </div>
        </div>
        <div class="xp-escena" aria-label="Producto destacado sobre la repisa">
          <div class="xp-plano xp-arco" data-sc-parallax="0.10"></div>
          <div class="xp-plano xp-mug-portada" data-sc-parallax="-0.06">${d.imagen
            ? `<img src="${esc(urlImagen(d.imagen))}" alt="${esc(d.etiqueta || 'Producto destacado')}" style="width:100%;height:auto;display:block">`
            : mugSVG('anime', 'frente', { etiqueta: 'Mug blanco con diseño anime Ohayō' })}</div>
          <div class="xp-plano xp-repisa"></div>
          <div class="xp-plano xp-hojas" data-sc-parallax="-0.22" aria-hidden="true">${HOJAS}</div>
          ${d.etiqueta ? `<div class="mg-etiqueta"><small>Estilo</small><strong>${esc(d.etiqueta)}</strong></div>` : ''}
        </div>
      </div>
    </section>`,

  escena: () => `
    <section class="xp-show" id="protagonista" data-sc-act="pin" data-sc-span="5.2">
      <div data-sc-stage>
        <div class="xp-lienzo">
          <div class="xp-halo" aria-hidden="true"></div>
          ${FRAGMENTOS.map((f) => `<div class="xp-frag" aria-hidden="true"><svg viewBox="0 0 64 64">${f.svg}</svg></div>`).join('')}
          <div class="xp-camara">
            <div class="xp-vista xp-vista-frente">${mugSVG('anime', 'frente', { prensa: true, etiqueta: 'Mug blanco que recibe el diseño anime Ohayō' })}</div>
            <div class="xp-vista xp-vista-tres">${mugSVG('anime', 'tres', { etiqueta: 'Mug Ohayō visto de tres cuartos' })}</div>
          </div>
          <span class="xp-detalle" style="right:16%;top:24%">El diseño</span>
          <span class="xp-detalle" style="left:44%;top:20%">El asa</span>
        </div>
        <div class="xp-textos">
          <div data-sc-cue="0 0.14 0"><h2>Un mug en blanco.</h2><p>El punto de partida de cada diseño.</p></div>
          <div data-sc-cue="0.12 0.34"><h2>Le ponemos tu estilo.</h2><p>El diseño queda en el frente del mug, de borde a borde.</p></div>
          <div data-sc-cue="0.32 0.54"><h2>Cada pieza en su lugar.</h2><p>Los elementos del diseño se reúnen alrededor del mug.</p></div>
          <div data-sc-cue="0.54 0.74"><h2>De cerca.</h2><p>Los trazos y colores del diseño, tal como se ven en el mug.</p></div>
          <div data-sc-cue="0.74 0.87"><h2>El asa.</h2><p>Del mismo blanco que el resto del mug.</p></div>
          <div data-sc-cue="0.87"><h2>Ohayō, estilo anime.</h2><p>Uno de seis estilos. Pídelo por WhatsApp o mira el catálogo.</p>
            <div class="d-flex flex-wrap gap-2 mt-3">
              <a class="btn btn-acento" href="#/personalizados?estilo=anime">${icono('chat', 18)} Pedir este estilo</a>
              <a class="btn btn-outline-primary" href="#/catalogo">Ver catálogo</a>
            </div></div>
        </div>
        <div class="xp-avance" aria-hidden="true"></div>
      </div>
    </section>`,

  coleccion: (d) => `
    <section class="xp-coleccion" data-sc-act="pan" data-sc-span="3.4">
      <div data-sc-stage>
        <div class="xp-riel" data-sc-pan="0.08">
          <div class="xp-cabeza">
            <h2>${esc(d.titulo)}</h2>
            <p>${esc(d.texto)}</p>
          </div>
          ${ESTILOS.map((e) => `
            <article class="xp-estilo">
              <div class="xp-vitrina" style="--fondo:${e.fondo};--piso:${e.piso}" data-sc-tilt="6">${mugSVG(e.id, e.vista, { etiqueta: `Mug blanco con diseño ${e.nombre} ${e.diseno}` })}</div>
              <div><h3>${e.nombre}</h3><p>${e.texto}</p></div>
              <a class="btn btn-acento btn-sm" style="justify-self:start" href="#/personalizados?estilo=${e.id}">${icono('chat', 16)} ${e.id === 'personalizado' ? 'Cuéntanos tu idea' : 'Lo quiero'}</a>
            </article>`).join('')}
        </div>
      </div>
    </section>`,

  banner: (d) => (d.titulo || d.imagen ? `
    <section class="container py-5" data-sc-act="flow">
      <div class="xp-bloque" style="grid-template-columns:${d.imagen ? '1.2fr .8fr' : '1fr'}">
        <div data-sc-in>
          ${d.titulo ? `<h2>${esc(d.titulo)}</h2>` : ''}
          ${d.texto ? `<p class="lead">${esc(d.texto)}</p>` : ''}
          ${d.boton && d.enlace ? `<a class="btn btn-acento btn-lg mt-3" href="${esc(d.enlace)}" ${d.enlace.startsWith('https://') ? 'target="_blank" rel="noopener"' : ''}>${esc(d.boton)}</a>` : ''}
        </div>
        ${d.imagen ? `<figure class="m-0" data-sc-in><img src="${esc(urlImagen(d.imagen))}" alt="${esc(d.titulo || 'Promoción')}" style="width:100%;height:auto;border-radius:20px;background:#fff"></figure>` : ''}
      </div>
    </section>` : ''),

  personaliza: (d) => `
    <section class="xp-personaliza container" data-sc-act="flow">
      <div class="xp-bloque">
        <div data-sc-in>
          <h2>${esc(d.titulo)}</h2>
          <p class="lead">${esc(d.texto)}</p>
          <ol class="xp-pasos" data-sc-in data-sc-stagger="70">
            <li><span class="ic">${icono('chat')}</span><div><b>Escríbenos por WhatsApp</b><span>Cuéntanos tu idea y envía tu imagen.</span></div></li>
            <li><span class="ic">${icono('lapiz')}</span><div><b>Definimos diseño y valor</b><span>Te mostramos cómo queda y acordamos el pago.</span></div></li>
            <li><span class="ic">${icono('ruta')}</span><div><b>Sigue tu pedido</b><span>Lo verás en Mis pedidos con su guía de envío.</span></div></li>
          </ol>
          <a class="btn btn-acento btn-lg" href="#/personalizados">${icono('chat', 18)} ${esc(d.boton)}</a>
        </div>
        <figure data-sc-reveal="up" data-sc-reveal-at="0.12 0.5">
          ${mugSVG('personalizado', 'tres', { etiqueta: 'Ejemplo de mug personalizado con foto' })}
          <figcaption>Ejemplo ilustrativo de un mug personalizado</figcaption>
        </figure>
      </div>
    </section>`,

  catalogo: (d) => `
    <section class="xp-catalogo container" data-sc-act="flow">
      <div class="d-flex flex-wrap align-items-end justify-content-between gap-3 mb-4">
        <h2 class="mb-0">${esc(d.titulo)}</h2>
        <a class="xp-enlace" href="#/catalogo">Ver todo el catálogo ${icono('flecha', 18)}</a>
      </div>
      <div id="destacados" data-cantidad="${Number(d.cantidad) || 4}">${cargando('Cargando mugs…')}</div>
    </section>`,
};

// Contenido inicial si la API de contenido no responde (mismos textos de siempre).
const RESPALDO = {
  secciones: [
    { clave: 'portada', datos: { titulo: 'Un mug para cada estilo, y para cada mañana.', resaltado: 'estilo', subtitulo: 'Anime, kawaii, gamer, naturaleza, frases o tu propia foto. Elige el tuyo en el catálogo o pídelo personalizado por WhatsApp.', boton: 'Ver catálogo', enlace_secundario: 'Quiero uno personalizado', etiqueta: 'Anime · Ohayō' } },
    { clave: 'escena', datos: {} },
    { clave: 'coleccion', datos: { titulo: 'Una colección para cada estilo.', texto: 'Seis estilos sobre el mismo mug blanco. Desliza y elige el tuyo.' } },
    { clave: 'personaliza', datos: { titulo: 'Tu idea, en tu mug.', texto: 'Una foto, una frase, el logo de tu marca. Lo diseñamos contigo y queda registrado para que lo sigas aquí.', boton: 'Pedir un personalizado' } },
    { clave: 'catalogo', datos: { titulo: 'Del catálogo', cantidad: 4 } },
  ],
};

export async function render(app, { query = {} } = {}) {
  desmontarEscena();
  instalarDefinicionesMug();

  // Contenido publicado; con ?vista=borrador el administrador ve su borrador.
  let contenido;
  try {
    contenido = await obtenerContenido({ borrador: query.vista === 'borrador' });
  } catch {
    contenido = RESPALDO;
  }

  const aviso = query.vista === 'borrador'
    ? '<div class="mg-tienda-admin" role="status">Vista previa del borrador: así se verá Inicio al publicar.</div>' : '';
  app.innerHTML = `<span data-sc-progress aria-hidden="true"></span>${aviso}
    ${contenido.secciones.map((s) => (SECCIONES[s.clave] ? SECCIONES[s.clave](s.datos || {}) : '')).join('')}`;

  try {
    const id = await montarEscena(app, '/');
    const protagonista = document.getElementById('protagonista');
    if (protagonista) escenaProtagonista(protagonista, id);
  } catch (error) {
    console.error(error);
  }

  // Productos reales de la API.
  const cont = document.getElementById('destacados');
  if (!cont) return;
  try {
    const productos = await api('/productos');
    const cantidad = Number(cont.dataset.cantidad) || 4;
    const lista = [...productos].sort((a, b) => b.id - a.id).slice(0, cantidad);
    cont.innerHTML = lista.length
      ? `<div class="row row-cols-2 row-cols-lg-4 g-3 g-lg-4 gy-5" data-sc-in data-sc-stagger="70">${lista.map((p) => `<div class="col">${tarjetaProducto(p)}</div>`).join('')}</div>`
      : '<p class="text-suave">Aún no hay mugs en el catálogo.</p>';
    enlazarAgregar(cont, productos);
    // El contenido llegó después del montaje: se revela sin esperar al motor.
    requestAnimationFrame(() => cont.querySelectorAll('[data-sc-in], [data-sc-stagger] > *').forEach((el, i) => {
      el.style.transitionDelay = `${i * 70}ms`; el.classList.add('sc-in');
    }));
  } catch (error) {
    cont.innerHTML = alerta(error.message);
  }
}
