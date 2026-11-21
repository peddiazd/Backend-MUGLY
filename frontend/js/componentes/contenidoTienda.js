// Contenido administrable de la tienda (textos, imágenes y secciones de Inicio).
// Los clientes ven lo publicado; el administrador puede ver el borrador con
// ?vista=borrador (vista previa del panel de Contenido).
import { api } from '../api.js';
import { CONFIG } from '../config.js';
import { esAdmin } from '../estado.js';

let publicado = null;

export async function obtenerContenido({ borrador = false } = {}) {
  if (borrador && esAdmin()) return api('/admin/contenido/vista-previa');
  if (!publicado) publicado = await api('/contenido');
  return publicado;
}

// Carga la configuración pública (WhatsApp) al iniciar la aplicación.
// Si la API no responde, se conserva el valor de config.js.
export async function cargarConfiguracionTienda() {
  try {
    const c = await obtenerContenido();
    if (c?.tienda?.whatsapp) CONFIG.WHATSAPP = c.tienda.whatsapp;
  } catch {
    /* la tienda sigue funcionando con los valores por defecto */
  }
}

export function invalidarContenido() {
  publicado = null;
}

export const seccionDe = (contenido, clave) => contenido.secciones.find((s) => s.clave === clave)?.datos;
