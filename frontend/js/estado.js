// Estado global de la SPA: sesion y carrito, persistidos en localStorage.
const CLAVE_SESION = 'mugly_sesion';
const CLAVE_CARRITO = 'mugly_carrito';

function leer(clave, porDefecto) {
  try {
    const valor = JSON.parse(localStorage.getItem(clave));
    return valor ?? porDefecto;
  } catch {
    return porDefecto;
  }
}

function guardar(clave, valor) {
  try {
    if (valor === null) localStorage.removeItem(clave);
    else localStorage.setItem(clave, JSON.stringify(valor));
  } catch {
    // Sin almacenamiento: la app sigue funcionando en memoria.
  }
}

const sesion = leer(CLAVE_SESION, null);

export const estado = {
  token: sesion?.token ?? null,
  usuario: sesion?.usuario ?? null,
  carrito: leer(CLAVE_CARRITO, []),
};

const oyentes = new Set();

export function suscribir(fn) {
  oyentes.add(fn);
  return () => oyentes.delete(fn);
}

function notificar() {
  oyentes.forEach((fn) => fn(estado));
}

// ---- Sesion ----
export function iniciarSesion(token, usuario) {
  estado.token = token;
  estado.usuario = usuario;
  guardar(CLAVE_SESION, { token, usuario });
  notificar();
}

export function cerrarSesion() {
  estado.token = null;
  estado.usuario = null;
  guardar(CLAVE_SESION, null);
  notificar();
}

export const haySesion = () => Boolean(estado.token);
export const esAdmin = () => estado.usuario?.rol === 'admin';

// ---- Carrito ----
function guardarCarrito() {
  guardar(CLAVE_CARRITO, estado.carrito);
  notificar();
}

export function agregarAlCarrito(producto, cantidad) {
  const item = estado.carrito.find((i) => i.producto_id === producto.id);
  const actual = item ? item.cantidad : 0;
  const nueva = Math.min(producto.cantidad_stock, actual + cantidad);

  if (item) {
    Object.assign(item, {
      nombre: producto.nombre,
      precio: producto.precio,
      imagen: producto.imagen,
      stock: producto.cantidad_stock,
      cantidad: nueva,
    });
  } else {
    estado.carrito.push({
      producto_id: producto.id,
      nombre: producto.nombre,
      precio: producto.precio,
      imagen: producto.imagen,
      stock: producto.cantidad_stock,
      cantidad: nueva,
    });
  }
  guardarCarrito();
  return nueva - actual;
}

export function cambiarCantidad(productoId, cantidad) {
  const item = estado.carrito.find((i) => i.producto_id === productoId);
  if (!item) return;
  item.cantidad = Math.max(1, Math.min(item.stock, cantidad));
  guardarCarrito();
}

export function actualizarItem(productoId, datos) {
  const item = estado.carrito.find((i) => i.producto_id === productoId);
  if (!item) return;
  Object.assign(item, datos);
  guardarCarrito();
}

export function quitarDelCarrito(productoId) {
  estado.carrito = estado.carrito.filter((i) => i.producto_id !== productoId);
  guardarCarrito();
}

export function vaciarCarrito() {
  estado.carrito = [];
  guardarCarrito();
}

export const unidadesCarrito = () => estado.carrito.reduce((s, i) => s + i.cantidad, 0);
export const totalCarrito = () => estado.carrito.reduce((s, i) => s + i.precio * i.cantidad, 0);
