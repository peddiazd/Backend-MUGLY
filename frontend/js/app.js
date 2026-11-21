// Punto de entrada de la SPA de MUGLY.
import { ruta, noEncontrada, iniciarRouter, navegar, rutaActual } from './router.js';
import { iniciarEncabezado } from './componentes/encabezado.js';
import { cerrarSesion } from './estado.js';
import { alerta, avisar } from './componentes/ui.js';
import { cargarConfiguracionTienda } from './componentes/contenidoTienda.js';

// Cada pagina se carga bajo demanda y exporta una funcion "render".
const pagina = (modulo) => async (app, ctx) => {
  // El panel de administración tiene su propia interfaz; las demás
  // páginas vuelven a la de la tienda (adminLayout la reactiva).
  document.body.classList.remove('modo-admin');
  try {
    const { render } = await import(modulo);
    await render(app, ctx);
  } catch (error) {
    console.error(error);
    app.innerHTML = `<div class="container py-5">${alerta('No se pudo cargar esta página.')}</div>`;
  }
};

// Cliente
ruta('/', pagina('./paginas/inicio.js'));
ruta('/catalogo', pagina('./paginas/catalogo.js'));
ruta('/nosotros', pagina('./paginas/nosotros.js'));
ruta('/producto/:id', pagina('./paginas/detalle.js'));
ruta('/carrito', pagina('./paginas/carrito.js'));
ruta('/personalizados', pagina('./paginas/personalizados.js'));
ruta('/ingresar', pagina('./paginas/ingresar.js'));
ruta('/registro', pagina('./paginas/registro.js'));
ruta('/mis-pedidos', pagina('./paginas/misPedidos.js'), { auth: true });
ruta('/mis-pedidos/:id', pagina('./paginas/misPedidos.js'), { auth: true });

// Administracion: experiencia propia con su menú lateral
ruta('/admin', pagina('./paginas/admin/dashboard.js'), { admin: true });
ruta('/admin/pedidos', pagina('./paginas/admin/pedidos.js'), { admin: true });
ruta('/admin/productos', pagina('./paginas/admin/productos.js'), { admin: true });
ruta('/admin/clientes', pagina('./paginas/admin/clientes.js'), { admin: true });
ruta('/admin/contenido', pagina('./paginas/admin/contenido.js'), { admin: true });
ruta('/admin/finanzas', pagina('./paginas/admin/finanzas.js'), { admin: true });
ruta('/admin/configuracion', pagina('./paginas/admin/configuracion.js'), { admin: true });
ruta('/admin/cuenta', pagina('./paginas/admin/cuenta.js'), { admin: true });

noEncontrada((app) => {
  app.innerHTML = `
    <div class="container py-5 text-center">
      <h1 class="h3">Página no encontrada</h1>
      <p class="text-suave">La dirección no existe.</p>
      <a class="btn btn-primary" href="#/">Ir al inicio</a>
    </div>`;
});

// Token vencido, invalido o cuenta desactivada: cerrar sesion.
window.addEventListener('mugly:sesion-invalida', (ev) => {
  cerrarSesion();
  avisar(ev.detail || 'Tu sesión terminó. Ingresa de nuevo.', 'warning');
  navegar(`/ingresar?volver=${encodeURIComponent(rutaActual())}`);
});

// Primero la configuración publicada (WhatsApp), luego encabezado y rutas.
cargarConfiguracionTienda().finally(() => {
  iniciarEncabezado();
  iniciarRouter();
});
