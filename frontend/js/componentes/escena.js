// Montaje del motor de scroll (scrollcraft) para páginas con escenas.
// Se monta al entrar a la ruta y se desmonta al salir: sin fugas entre rutas.
const MOTOR = 'assets/vendor/scrollcraft/scrollcraft.js';
let instancia = null;
let ciclo = 0;

function cargarMotor() {
  if (window.ScrollCraft) return Promise.resolve();
  return new Promise((ok, falla) => {
    const s = document.createElement('script');
    s.src = MOTOR;
    s.onload = ok;
    s.onerror = () => falla(new Error('No se pudo cargar el motor de animación.'));
    document.head.appendChild(s);
  });
}

export function desmontarEscena() {
  ciclo += 1;
  if (instancia) { instancia.destroy(); instancia = null; }
}

/** Monta el motor sobre `raiz` y devuelve el identificador del montaje. */
export async function montarEscena(raiz, ruta) {
  desmontarEscena();
  const mio = ciclo;
  await cargarMotor();
  if (mio !== ciclo) return mio;
  instancia = window.ScrollCraft.mount(raiz);
  const alSalir = (ev) => {
    if (ev.detail === ruta) return;
    if (mio === ciclo) desmontarEscena();
    document.removeEventListener('mugly:ruta', alSalir);
  };
  document.addEventListener('mugly:ruta', alSalir);
  return mio;
}

export const montajeVigente = (id) => id === ciclo;

/** Llama a `pintar(p)` en cada cuadro mientras el montaje siga vigente. */
export function seguirProgreso(acto, id, pintar) {
  let ultimo = -1;
  function bucle() {
    if (!montajeVigente(id)) return;
    const p = parseFloat(getComputedStyle(acto).getPropertyValue('--sc-p')) || 0;
    if (Math.abs(p - ultimo) > .0005) { ultimo = p; pintar(p); }
    requestAnimationFrame(bucle);
  }
  pintar(0);
  requestAnimationFrame(bucle);
}

export const suave = (t) => t * t * (3 - 2 * t);
export const tramo = (p, a, b) => Math.min(1, Math.max(0, (p - a) / (b - a)));
export const reducirMovimiento = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
