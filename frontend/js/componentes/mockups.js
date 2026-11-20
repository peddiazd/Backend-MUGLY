// Mockups de mugs: fotos reales de mug blanco + diseños originales.
// Dos tipos de diseño:
//   impresos   -> en el frente del mug (caja 230 x 290)
//   envolventes -> cubren todo el cuerpo (caja 300 x 370), p. ej. color sólido
// La foto se superpone en modo "multiply" para que el diseño tome sus luces
// y sombras. Sin filtros de desplazamiento: el texto queda nítido.

const FOTO_FRENTE = 'assets/img/mugs/mug-frente.png';
const FOTO_TRES = 'assets/img/mugs/mug-tres-cuartos.png';
const AJUSTE_FOTO = 'filter:brightness(1.07) contrast(1.03)';

export function instalarDefinicionesMug() {
  if (document.getElementById('mg-defs-mug')) return;
  document.body.insertAdjacentHTML('afterbegin', `
    <svg id="mg-defs-mug" width="0" height="0" style="position:absolute" aria-hidden="true" focusable="false"><defs>
      <filter id="mg-difuso" x="-20%" y="-200%" width="140%" height="500%"><feGaussianBlur stdDeviation="8"/></filter>
      <clipPath id="mg-zona-frente"><rect x="200" y="112" width="240" height="306" rx="10"/></clipPath>
      <clipPath id="mg-zona-espejo"><rect x="60" y="112" width="240" height="306" rx="10"/></clipPath>
      <clipPath id="mg-zona-tres"><rect x="200" y="128" width="116" height="140" rx="6"/></clipPath>
      <clipPath id="mg-cuerpo-frente"><path d="M170 90Q318 114 466 90V428Q466 452 444 456Q318 470 192 456Q170 452 170 428Z"/></clipPath>
      <clipPath id="mg-cuerpo-espejo"><path d="M34 90Q182 114 330 90V428Q330 452 308 456Q182 470 56 456Q34 452 34 428Z"/></clipPath>
      <clipPath id="mg-cuerpo-tres"><path d="M196 120Q258 132 320 120V262Q320 280 306 283Q258 290 210 283Q196 280 196 262Z"/></clipPath>
      <linearGradient id="mg-luz"><stop offset="0" stop-color="#000" stop-opacity=".26"/><stop offset=".16" stop-color="#000" stop-opacity="0"/><stop offset=".3" stop-color="#fff" stop-opacity=".2"/><stop offset=".42" stop-color="#fff" stop-opacity="0"/><stop offset=".78" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".3"/></linearGradient>
      <pattern id="mg-trama" width="7" height="7" patternUnits="userSpaceOnUse"><circle cx="3.5" cy="3.5" r="1.3" fill="#1D1D1F" opacity=".35"/></pattern>
      <pattern id="mg-motas" width="23" height="19" patternUnits="userSpaceOnUse"><circle cx="4" cy="5" r="1.4" fill="#fff" opacity=".55"/><circle cx="15" cy="13" r="1" fill="#fff" opacity=".4"/><circle cx="19" cy="3" r=".8" fill="#0F2D4A" opacity=".5"/></pattern>
    </defs></svg>`);
}

const estrella = (x, y, r, c = '#E9C46A') =>
  `<path transform="translate(${x} ${y}) scale(${r})" d="M0-10L2.6-2.6 10 0 2.6 2.6 0 10-2.6 2.6-10 0-2.6-2.6Z" fill="${c}"/>`;

// Diseños impresos en el frente (230 x 290).
const IMPRESOS = {
  anime: `
    <rect x="4" y="4" width="222" height="282" rx="6" fill="#FFFFFF" stroke="#1D1D1F" stroke-width="5"/>
    <rect x="4" y="4" width="222" height="96" rx="6" fill="url(#mg-trama)"/>
    <text x="115" y="72" text-anchor="middle" font-family="'Noto Sans JP', sans-serif" font-weight="900" font-size="44" fill="#1D1D1F" stroke="#FFFFFF" stroke-width="6" paint-order="stroke">おはよう！</text>
    <g stroke="#1D1D1F" stroke-width="2" stroke-linecap="round" opacity=".55"><path d="M14 132h40M10 150h56M16 168h34M176 132h40M164 150h56M180 168h34"/></g>
    <g transform="translate(58 112)">
      <path d="M92 34h10a18 18 0 0 1 0 36H92" fill="none" stroke="#1D1D1F" stroke-width="6" stroke-linecap="round"/>
      <path d="M2 18h94v62a28 28 0 0 1-28 28H30A28 28 0 0 1 2 80z" fill="#FFF4C7" stroke="#1D1D1F" stroke-width="5" stroke-linejoin="round"/>
      <ellipse cx="49" cy="18" rx="47" ry="9" fill="#8B5A3C" stroke="#1D1D1F" stroke-width="4"/>
      <ellipse cx="31" cy="56" rx="9" ry="12.5" fill="#1D1D1F"/><ellipse cx="67" cy="56" rx="9" ry="12.5" fill="#1D1D1F"/>
      <circle cx="34" cy="51" r="3.6" fill="#fff"/><circle cx="70" cy="51" r="3.6" fill="#fff"/><circle cx="28.5" cy="61" r="1.8" fill="#fff"/><circle cx="64.5" cy="61" r="1.8" fill="#fff"/>
      <ellipse cx="18" cy="74" rx="8" ry="4.5" fill="#FF8FA8" opacity=".85"/><ellipse cx="80" cy="74" rx="8" ry="4.5" fill="#FF8FA8" opacity=".85"/>
      <path d="M42 76q3.5 4 7 0q3.5 4 7 0" fill="none" stroke="#1D1D1F" stroke-width="3" stroke-linecap="round"/>
      <path d="M30 -4c-4 5 4 8 0 13M50 -10c-4 5 4 8 0 13M70 -4c-4 5 4 8 0 13" fill="none" stroke="#1D1D1F" stroke-width="3" stroke-linecap="round"/>
    </g>
    <g fill="#5EB8F2"><path d="M30 214l3 7 7 3-7 3-3 7-3-7-7-3 7-3z"/><path d="M196 206l2.4 5.6 5.6 2.4-5.6 2.4-2.4 5.6-2.4-5.6-5.6-2.4 5.6-2.4z"/></g>
    <rect x="66" y="244" width="98" height="26" rx="4" fill="#1D1D1F"/>
    <text x="115" y="262" text-anchor="middle" font-family="Figtree, sans-serif" font-weight="800" font-size="13" letter-spacing="3" fill="#FFFFFF">OHAYŌ</text>`,
  kawaii: `
    <g transform="translate(115 150)">
      <path d="M-78 -18 L-70 -86 L-30 -52 Q0 -62 30 -52 L70 -86 L78 -18 Q86 50 0 62 Q-86 50 -78 -18z" fill="#FFE3EA" stroke="#3A2E39" stroke-width="5" stroke-linejoin="round"/>
      <path d="M-62 -40 L-62 -70 L-42 -52z M62 -40 L62 -70 L42 -52z" fill="#FF9DB4"/>
      <path d="M-44 0q12 -14 24 0M20 0q12 -14 24 0" fill="none" stroke="#3A2E39" stroke-width="5" stroke-linecap="round"/>
      <path d="M-7 14h14l-7 8z" fill="#FF7A9C"/>
      <path d="M-12 28q6 7 12 0q6 7 12 0" fill="none" stroke="#3A2E39" stroke-width="3.5" stroke-linecap="round"/>
      <ellipse cx="-50" cy="22" rx="12" ry="7" fill="#FF9DB4" opacity=".8"/><ellipse cx="50" cy="22" rx="12" ry="7" fill="#FF9DB4" opacity=".8"/>
      <g stroke="#3A2E39" stroke-width="3" stroke-linecap="round"><path d="M-70 14h-26M-70 26l-24 6M70 14h26M70 26l24 6"/></g>
    </g>
    <path d="M115 52c-6-10-24-6-20 8 3 9 20 18 20 18s17-9 20-18c4-14-14-18-20-8z" fill="#FF7A9C"/>
    <path d="M40 72c-3-5-12-3-10 4 1.5 4.5 10 9 10 9s8.5-4.5 10-9c2-7-7-9-10-4zM190 70c-3-5-12-3-10 4 1.5 4.5 10 9 10 9s8.5-4.5 10-9c2-7-7-9-10-4z" fill="#FFB8C8"/>
    <text x="115" y="262" text-anchor="middle" font-family="'Bricolage Grotesque', sans-serif" font-weight="800" font-size="34" fill="#3A2E39">miau</text>`,
  naturaleza: `
    <g fill="none" stroke="#3F5E45" stroke-width="3.5" stroke-linecap="round"><path d="M115 200C110 150 120 100 115 30"/><path d="M115 160c-20-16-38-20-62-18"/><path d="M115 120c20-14 38-18 60-16"/></g>
    <g fill="#7E9B6E"><ellipse cx="96" cy="58" rx="20" ry="9" transform="rotate(-35 96 58)"/><ellipse cx="136" cy="76" rx="20" ry="9" transform="rotate(35 136 76)"/><ellipse cx="94" cy="104" rx="22" ry="10" transform="rotate(-30 94 104)"/><ellipse cx="160" cy="98" rx="20" ry="9" transform="rotate(-10 160 98)"/></g>
    <g fill="#B7C5A4"><ellipse cx="66" cy="136" rx="22" ry="10" transform="rotate(15 66 136)"/><ellipse cx="138" cy="138" rx="22" ry="10" transform="rotate(30 138 138)"/><ellipse cx="88" cy="168" rx="20" ry="9" transform="rotate(-25 88 168)"/></g>
    <g fill="#3F5E45"><ellipse cx="134" cy="42" rx="16" ry="7" transform="rotate(40 134 42)"/><ellipse cx="44" cy="146" rx="16" ry="7" transform="rotate(-10 44 146)"/><ellipse cx="186" cy="110" rx="15" ry="6.5" transform="rotate(20 186 110)"/></g>
    <text x="115" y="246" text-anchor="middle" font-family="'Bricolage Grotesque', sans-serif" font-weight="700" font-size="38" fill="#3F5E45">respira</text>
    <text x="115" y="272" text-anchor="middle" font-family="Figtree, sans-serif" font-weight="600" font-size="13" letter-spacing="2" fill="#6E8B5E">HOJAS DE DOMINGO</text>`,
  gamer: `
    <rect x="8" y="8" width="214" height="274" rx="18" fill="#1E1B2E"/>
    <g fill="#FF5577">${[0, 1, 2].map((i) => `<path transform="translate(${62 + i * 38} 30) scale(3)" d="M1 0h2v1h2V0h2v1h1v3H7v1H6v1H5v1H3V6H2V5H1V4H0V1h1z"/>`).join('')}</g>
    <g transform="translate(23 92)">
      <path d="M24 0h136v8h16v16h8v48h-8v16h-24v-8h-16v-8H48v8H32v8H8V72H0V24h8V8h16z" fill="#8FE388"/>
      <path d="M24 24h8v8h8v8h-8v8h-8v-8h-8v-8h8z" fill="#1E1B2E"/>
      <rect x="128" y="24" width="12" height="12" fill="#F2C94C"/><rect x="148" y="36" width="12" height="12" fill="#FF5577"/><rect x="128" y="48" width="12" height="12" fill="#5EB8F2"/><rect x="108" y="36" width="12" height="12" fill="#1E1B2E"/>
      <rect x="72" y="40" width="12" height="6" fill="#1E1B2E"/><rect x="92" y="40" width="12" height="6" fill="#1E1B2E"/>
    </g>
    <text x="115" y="222" text-anchor="middle" font-family="'Press Start 2P', monospace" font-size="15" fill="#FFFFFF">PLAYER 1</text>
    <text x="115" y="252" text-anchor="middle" font-family="'Press Start 2P', monospace" font-size="11" fill="#F2C94C">READY?</text>`,
  frases: `
    <text x="16" y="96" font-family="'Bricolage Grotesque', sans-serif" font-weight="800" font-size="56" letter-spacing="-2" fill="#292929">Primero</text>
    <text x="16" y="156" font-family="'Bricolage Grotesque', sans-serif" font-weight="800" font-size="56" letter-spacing="-2" fill="#292929">el café.</text>
    <rect x="16" y="168" width="118" height="10" rx="3" fill="#F2C94C"/>
    <g transform="translate(200 262) rotate(-25) scale(.7)"><ellipse rx="22" ry="30" fill="#6B4A3A"/><path d="M0 -26c-10 14 10 34 0 52" fill="none" stroke="#3E2A20" stroke-width="4" stroke-linecap="round"/></g>
    <text x="18" y="214" font-family="Figtree, sans-serif" font-weight="600" font-size="16" fill="#575C54">después, todo lo demás</text>`,
  personalizado: `
    <rect x="22" y="18" width="186" height="168" rx="10" fill="#FFFFFF" stroke="#292929" stroke-width="3"/>
    <rect x="32" y="28" width="166" height="148" rx="4" fill="#CFE3F2"/>
    <circle cx="160" cy="62" r="16" fill="#F2C94C"/>
    <path d="M32 150c30-34 56-42 84-24s42 4 82-20v70H32z" fill="#7E9B6E"/>
    <path d="M32 176c40-30 80-30 166-10v10z" fill="#344B36"/>
    <path d="M86 128c-4-8-18-5-15 6 2 6 15 13 15 13s13-7 15-13c3-11-11-14-15-6z" fill="#FF7A9C"/>
    <text x="115" y="236" text-anchor="middle" font-family="'Bricolage Grotesque', sans-serif" font-weight="800" font-size="32" fill="#292929">Tu nombre</text>
    <text x="115" y="266" text-anchor="middle" font-family="Figtree, sans-serif" font-weight="700" font-size="16" fill="#575C54">tu foto, tu frase o tu logo</text>`,
};

// Diseños envolventes (300 x 370, cubren el cuerpo completo).
const ENVOLVENTES = {
  magico: `<rect width="300" height="370" fill="#1F4A58"/>
    <rect width="300" height="370" fill="url(#mg-motas)" opacity=".35"/>
    ${estrella(70, 80, 2.2)}${estrella(200, 60, 1.2)}${estrella(150, 160, 2.8)}${estrella(240, 200, 1.6)}
    ${estrella(90, 250, 1.4)}${estrella(190, 300, 2.1)}${estrella(40, 330, 1)}${estrella(260, 120, .9)}${estrella(120, 40, .8)}`,
  rosa: '<rect width="300" height="370" fill="#F2B8C2"/>',
  esmaltado: `<rect width="300" height="370" fill="#2F5D8C"/><rect width="300" height="370" fill="url(#mg-motas)"/>`,
  negro: '<rect width="300" height="370" fill="#3A3A3A"/>',
};

export const DISENOS = { ...IMPRESOS, ...ENVOLVENTES };

// Los seis estilos de la vitrina de Inicio. Sin precios: se piden por WhatsApp.
export const ESTILOS = [
  { id: 'anime', nombre: 'Anime', diseno: 'Ohayō', texto: 'Una taza con ojos grandes que te da los buenos días.', vista: 'frente', fondo: '#EAF4FC', piso: '#BFD9EE' },
  { id: 'kawaii', nombre: 'Kawaii', diseno: 'Miau', texto: 'Gatito rosa con mejillas sonrojadas.', vista: 'espejo', fondo: '#FFF0F3', piso: '#F6CAD4' },
  { id: 'gamer', nombre: 'Gamer', diseno: 'Player 1', texto: 'Pixel art para las partidas largas.', vista: 'frente', fondo: '#ECEAF5', piso: '#C9C3E3' },
  { id: 'naturaleza', nombre: 'Naturaleza', diseno: 'Respira', texto: 'Ramas y hojas en tonos de bosque.', vista: 'espejo', fondo: '#F3F6EF', piso: '#B7C5A4' },
  { id: 'frases', nombre: 'Frases', diseno: 'Primero el café', texto: 'Para quien no habla antes del primer sorbo.', vista: 'frente', fondo: '#FDF6DE', piso: '#F2DE96' },
  { id: 'personalizado', nombre: 'Personalizado', diseno: 'Tu idea', texto: 'Tu foto, tu frase o tu logo.', vista: 'espejo', fondo: '#F3F6EF', piso: '#B7C5A4' },
];

let contador = 0;

function capa(nombre, vista) {
  const envolvente = nombre in ENVOLVENTES;
  if (vista === 'tres') {
    return envolvente
      ? { clip: 'mg-cuerpo-tres', contenido: `<g transform="translate(194 120) scale(.43)">${ENVOLVENTES[nombre]}</g>` }
      : { clip: 'mg-zona-tres', contenido: `<g transform="translate(202 130) scale(.48)">${IMPRESOS[nombre]}</g>` };
  }
  const espejo = vista === 'espejo';
  if (envolvente) {
    return { clip: `mg-cuerpo-${espejo ? 'espejo' : 'frente'}`, contenido: `<g transform="translate(${espejo ? 32 : 168} 92)">${ENVOLVENTES[nombre]}</g>` };
  }
  return { clip: `mg-zona-${espejo ? 'espejo' : 'frente'}`, contenido: `<g transform="translate(${espejo ? 65 : 205} 116)">${IMPRESOS[nombre] || ''}</g>` };
}

/**
 * SVG del mockup.
 * vista: 'frente' (asa izquierda), 'espejo' (asa derecha) o 'tres' (tres cuartos).
 * diseno: nombre de DISENOS, o 'blanco' para el mug liso.
 * opciones.prensa: cada capa queda oculta tras un recorte (.mg-corte[data-capa]) que se anima desde afuera.
 * opciones.capas: varios diseños apilados (para la prensa de Personalizados).
 */
export function mugSVG(diseno, vista = 'frente', opciones = {}) {
  const id = `mgmug${++contador}`;
  const etiqueta = opciones.etiqueta || `Mug blanco con diseño ${diseno}`;
  const nombres = (opciones.capas || [diseno]).filter((n) => n && n !== 'blanco');
  const tres = vista === 'tres';
  const espejo = vista === 'espejo';
  const base = espejo ? 'transform="translate(500 0) scale(-1 1)"' : '';
  const foto = tres ? `<image href="${FOTO_TRES}" width="525" height="350" style="${AJUSTE_FOTO}"/>`
    : `<image href="${FOTO_FRENTE}" width="500" height="500" ${base} style="${AJUSTE_FOTO}"/>`;
  const sombraFoto = tres ? `<image href="${FOTO_TRES}" width="525" height="350" style="mix-blend-mode:multiply" opacity=".85"/>`
    : `<image href="${FOTO_FRENTE}" width="500" height="500" ${base} style="mix-blend-mode:multiply" opacity=".88"/>`;

  const recortes = opciones.prensa
    ? nombres.map((_, i) => `<clipPath id="${id}r${i}"><rect class="mg-corte" data-capa="${i}" x="0" y="0" width="0" height="600"/></clipPath>`).join('') : '';
  const capas = nombres.map((n, i) => {
    const c = capa(n, vista);
    const recorte = opciones.prensa ? ` clip-path="url(#${id}r${i})"` : '';
    // En una secuencia, cada diseño impreso tapa al anterior con fondo blanco.
    const fondo = opciones.capas && !(n in ENVOLVENTES) ? foto : '';
    return `<g${recorte}><g clip-path="url(#${c.clip})">${fondo}${c.contenido}</g></g>`;
  }).join('');
  const calor = opciones.prensa && !tres ? '<rect class="mg-calor" x="0" y="96" width="10" height="356" rx="5" fill="#F2C94C" opacity="0"/>' : '';
  const cuerpo = tres ? { c: 'mg-cuerpo-tres', x: 196, w: 124, y: 112, h: 180 } : { c: `mg-cuerpo-${espejo ? 'espejo' : 'frente'}`, x: espejo ? 34 : 170, w: 296, y: 84, h: 390 };
  const luz = nombres.some((n) => n in ENVOLVENTES) ? `<g clip-path="url(#${cuerpo.c})" style="pointer-events:none"><rect x="${cuerpo.x}" y="${cuerpo.y}" width="${cuerpo.w}" height="${cuerpo.h}" fill="url(#mg-luz)"/></g>` : '';
  const sombra = tres
    ? '<ellipse cx="262" cy="286" rx="78" ry="7" fill="#000" opacity=".16" filter="url(#mg-difuso)"/>'
    : `<ellipse cx="${espejo ? 182 : 318}" cy="462" rx="150" ry="12" fill="#000" opacity=".18" filter="url(#mg-difuso)"/>`;

  return `<svg class="mg-mug" viewBox="${tres ? '170 88 236 214' : '0 20 500 470'}" role="img" aria-label="${etiqueta}">
    <defs>${recortes}</defs>${sombra}${foto}${capas}${luz}${sombraFoto}${calor}
  </svg>`;
}
