// Cliente HTTP unico para la API REST de MUGLY.
import { CONFIG } from './config.js';
import { estado } from './estado.js';

export class ApiError extends Error {
  constructor(mensaje, status, detalles) {
    super(mensaje);
    this.status = status;
    this.detalles = detalles;
  }
}

/**
 * Llama a la API.
 * @param {string} ruta   Ruta bajo /api/v1, p. ej. '/productos'.
 * @param {object} opciones { metodo, cuerpo (JSON), formData }
 * @returns {Promise<any>} el campo "data" de la respuesta, o null en 204.
 */
export async function api(ruta, { metodo = 'GET', cuerpo, formData } = {}) {
  const headers = {};
  if (estado.token) headers.Authorization = `Bearer ${estado.token}`;

  let body;
  if (formData) {
    body = formData;
  } else if (cuerpo !== undefined) {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(cuerpo);
  }

  let respuesta;
  try {
    respuesta = await fetch(`${CONFIG.API_URL}/api/v1${ruta}`, { method: metodo, headers, body });
  } catch {
    throw new ApiError('No se pudo conectar con el servidor. Verifica que la API esté en ejecución.', 0);
  }

  if (respuesta.status === 204) return null;

  let datos = null;
  try {
    datos = await respuesta.json();
  } catch {
    datos = null;
  }

  if (!respuesta.ok) {
    const mensaje = datos?.error?.message || `Error ${respuesta.status}`;
    const sesionInvalida = respuesta.status === 401 || /desactivada/i.test(mensaje);
    if (sesionInvalida && estado.token && ruta !== '/usuarios/login') {
      window.dispatchEvent(new CustomEvent('mugly:sesion-invalida', { detail: mensaje }));
    }
    throw new ApiError(mensaje, respuesta.status, datos?.error?.details);
  }

  return datos?.data ?? null;
}

// Descarga un archivo protegido (p. ej. un CSV del panel) con el token.
export async function descargar(ruta, nombre) {
  const headers = estado.token ? { Authorization: `Bearer ${estado.token}` } : {};
  let respuesta;
  try {
    respuesta = await fetch(`${CONFIG.API_URL}/api/v1${ruta}`, { headers });
  } catch {
    throw new ApiError('No se pudo conectar con el servidor.', 0);
  }
  if (!respuesta.ok) {
    let mensaje = `Error ${respuesta.status}`;
    try { mensaje = (await respuesta.json())?.error?.message || mensaje; } catch { /* sin cuerpo */ }
    throw new ApiError(mensaje, respuesta.status);
  }
  const url = URL.createObjectURL(await respuesta.blob());
  const enlace = Object.assign(document.createElement('a'), { href: url, download: nombre });
  document.body.appendChild(enlace);
  enlace.click();
  enlace.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// URL completa de una imagen servida por la API (/uploads/...).
export function urlImagen(ruta) {
  return ruta ? `${CONFIG.API_URL}${ruta}` : 'assets/img/sin-imagen.svg';
}

// Convierte los detalles de validacion del DTO en un texto legible.
export function textoError(error) {
  if (!(error instanceof ApiError) || !error.detalles) return error.message;
  const partes = Object.entries(error.detalles).map(([campo, msgs]) => {
    const texto = Array.isArray(msgs) ? msgs.join(' ') : JSON.stringify(msgs);
    return `${campo}: ${texto}`;
  });
  return `${error.message} ${partes.join(' · ')}`;
}
