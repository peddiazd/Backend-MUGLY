# MUGLY — Frontend

Aplicación de una sola página (SPA) construida con:

- HTML5, CSS3 y JavaScript Vanilla con módulos ES (sin React, Angular ni Vue).
- Bootstrap 5.3.3 en copia local (`assets/vendor/bootstrap/`).
- Consumo de la API REST del backend (`backend/`) con `fetch`.

## Ejecutar

1. Inicia la API (desde `backend/`): `python app.py` → `http://localhost:5000`.
2. Sirve esta carpeta en el puerto 5173 (permitido por CORS en la API):

```bash
cd frontend
python -m http.server 5173
```

3. Abre `http://localhost:5173`.

No requiere compilación ni `npm`. Los módulos ES necesitan un servidor HTTP:
abrir `index.html` con doble clic no funciona.

## Estructura

| Ruta | Responsabilidad |
|------|-----------------|
| `index.html` | Documento único de la SPA |
| `css/estilos.css` | Identidad visual. **Los colores se cambian en las variables de `:root`** |
| `js/config.js` | URL de la API y número de WhatsApp |
| `js/app.js` | Registro de rutas y arranque |
| `js/router.js` | Enrutador por hash (`#/ruta`) con rutas protegidas por sesión y rol |
| `js/estado.js` | Estado global: sesión y carrito (persistidos en `localStorage`) |
| `js/api.js` | Cliente HTTP único: token, errores y sesión vencida |
| `js/componentes/` | Encabezado, pie y utilidades de interfaz (modales, avisos, insignias de estado) |
| `js/paginas/` | Una página por pantalla; `admin/` para el panel de administración |

## Rutas

| Ruta | Pantalla | Acceso |
|------|----------|--------|
| `#/` · `#/catalogo` · `#/nosotros` | Inicio y catálogo | Público |
| `#/producto/:id` | Detalle del producto | Público |
| `#/carrito` | Carrito y confirmación del pedido | Público (confirmar exige sesión) |
| `#/personalizados` | Pedido personalizado por WhatsApp | Público |
| `#/ingresar` · `#/registro` | Acceso y registro | Público |
| `#/mis-pedidos[/:id]` | Pedidos del cliente | Cliente |
| `#/admin/pedidos` · `/productos` · `/clientes` | Administración | Administrador |
