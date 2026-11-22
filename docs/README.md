# Documentacion del Proyecto MUGLY

## Resumen

**MUGLY** es una API REST de comercio electrónico construida con **Flask 3**, enfocada en la gestión de usuarios, productos (tipo "mug") y pedidos. Sigue una arquitectura por capas dentro de cada dominio, separando controladores, servicios, repositorios, modelos y DTOs.

---

## Arquitectura del Sistema

El sistema está organizado en capas que separan la presentación, la lógica de negocio y el acceso a datos.

Diagrama: [`arquitectura.drawio.xml`](./arquitectura.drawio.xml)

### Capas

| Capa | Responsabilidad | Archivos clave |
|------|----------------|----------------|
| **Cliente / Frontend** | Consume la API mediante HTTP | - |
| **Capa API (Controladores)** | Define rutas, valida entrada con marshmallow, devuelve respuestas JSON | `controladores.py` |
| **Capa de Servicio** | Lógica de negocio, reglas de dominio, manejo de transacciones | `servicios.py` |
| **Capa de Repositorio** | Acceso directo a la base de datos con SQLAlchemy | `repositorios.py` |
| **Base de datos** | MySQL (desarrollo) / SQLite (pruebas) | SQLAlchemy modelos |

### Modulos secundarios

- **Seguridad:** JWT (HS256), hash de contraseñas con Werkzeug, decoradores `requiere_token` y `requiere_admin` (`app/seguridad.py`)
- **Configuracion:** Variables de entorno cargadas con `python-dotenv` (`app/config.py`)
- **Utilidades compartidas:** validación de imágenes (`app/archivos.py`), paginación (`app/paginacion.py`) y fechas en hora de Colombia (`app/fechas.py`)
- **Migraciones:** Alembic para versionado del esquema (`migrations/`)
- **Pruebas:** pytest con SQLite en memoria (`tests/`)

---

## Modelo de Datos

Diagrama: [`base_datos.drawio.xml`](./base_datos.drawio.xml)

### Entidades

| Tabla | Campos principales | Relaciones |
|-------|-------------------|------------|
| `usuarios` | id (PK), correo (UK), contrasena, fecha_creacion, rol, activo | 1:1 con `perfiles`, 1:N con `pedidos` |
| `perfiles` | id (PK), nombre, apellido, telefono, usuario_id (FK, UK) | N:1 con `usuarios` |
| `productos` | id (PK), nombre, descripcion, precio, disponible, cantidad_stock, imagen | 1:N con `detalles_pedido` |
| `pedidos` | id (PK), usuario_id (FK), estado, tipo, descripcion, transportadora, numero_guia, total, fecha_creacion | N:1 con `usuarios`, 1:N con `detalles_pedido` e `historial_estados_pedido` |
| `detalles_pedido` | id (PK), pedido_id (FK), producto_id (FK), cantidad, precio_unitario | N:1 con `pedidos`, N:1 con `productos` |
| `historial_estados_pedido` | id (PK), pedido_id (FK), estado, fecha, usuario_id (FK) | N:1 con `pedidos` |
| `contenido_bloques` | id (PK), clave (UK), borrador (JSON), publicado (JSON), actualizado_en, actualizado_por (FK, SET NULL), publicado_en | N:1 con `usuarios` |

### Estados de pedido (ADR-004)

`pendiente` → `pagado` → `enviado` → `entregado`. Un pedido `pendiente` también puede pasar a `cancelado`.

- `tipo`: `catalogo` (compra desde el catálogo) o `personalizado` (acordado por WhatsApp y registrado por el administrador).
- Cada cambio de estado queda en `historial_estados_pedido` con fecha y usuario.

---

## Endpoints de la API

Diagrama: [`endpoints.drawio.xml`](./endpoints.drawio.xml)

Prefijo base: `/api/v1`

### Usuarios (`/usuarios`)

| Método | Endpoint | Descripcion | Auth | Rol |
|--------|----------|-------------|------|-----|
| POST | `/registro` | Registrar nuevo usuario | No | - |
| POST | `/login` | Iniciar sesion y obtener JWT | No | - |
| GET | `/perfil` | Obtener perfil autenticado | Si (token) | usuario |
| PATCH | `/perfil` | Actualizar perfil parcial | Si (token) | usuario |

Un usuario desactivado recibe `403` al iniciar sesión o al usar su token.

### Productos (`/productos`)

| Método | Endpoint | Descripcion | Auth | Rol |
|--------|----------|-------------|------|-----|
| GET | `` | Catálogo: solo productos disponibles | No | - |
| GET | `/:id` | Detalle de un producto disponible | No | - |
| POST | `` | Crear producto | Si (token) | admin |
| PATCH | `/:id` | Actualizar producto e inventario | Si (token) | admin |
| DELETE | `/:id` | Eliminar (204) o retirar si tiene pedidos (200) | Si (token) | admin |
| POST | `/:id/imagen` | Subir foto (multipart, campo `imagen`; JPG/PNG/WEBP, máx. 5 MB) | Si (token) | admin |

### Pedidos (`/pedidos`)

| Método | Endpoint | Descripcion | Auth | Rol |
|--------|----------|-------------|------|-----|
| POST | `` | Crear pedido (queda `pendiente`) | Si (token) | usuario |
| GET | `` | Listar pedidos del usuario | Si (token) | usuario |
| GET | `/:id` | Detalle de pedido propio (estado, envío, historial) | Si (token) | usuario |

### Administración (`/admin`)

| Método | Endpoint | Descripcion |
|--------|----------|-------------|
| GET | `/usuarios` | Listar usuarios; con parámetros (`q`, `estado`, `pedidos`, `registro`, `orden`, `pagina`, `por_pagina`) busca clientes paginados |
| GET | `/usuarios/:id` | Detalle de usuario con perfil |
| PATCH | `/usuarios/:id` | Editar perfil y activar/desactivar (`activo`) |
| GET | `/productos` | Todos los productos, incluidos los no disponibles |
| GET | `/pedidos` | Todos los pedidos; con parámetros (`q`, `estado`, `tipo`, `desde`, `hasta`, `pagina`, `por_pagina`) busca paginado |
| GET | `/pedidos/:id` | Detalle de cualquier pedido |
| PATCH | `/pedidos/:id/estado` | Cambiar estado (`pagado` descuenta inventario; `enviado` exige `transportadora` y `numero_guia`) |
| POST | `/pedidos/personalizados` | Registrar pedido personalizado (`usuario_id`, `descripcion`, `total`) |
| GET | `/resumen` | Indicadores del inicio del panel |
| GET | `/reportes/ventas` | Reporte por rango (`desde`, `hasta`, `agrupar` = dia o mes) |
| GET | `/reportes/ventas.csv` · `/reportes/pedidos.csv` · `/reportes/clientes.csv` | Exportaciones CSV para Excel |
| GET | `/contenido` · `/contenido/vista-previa` | Contenido con borrador y publicado; vista previa del borrador |
| PATCH | `/contenido/:clave` | Guardar el borrador de una sección |
| PUT | `/contenido/orden` | Orden de las secciones de Inicio |
| POST · DELETE | `/contenido/:clave/imagen` | Subir o quitar la imagen de una sección |
| POST | `/contenido/publicar` · `/contenido/descartar` | Publicar el borrador o volver a lo publicado |
| GET · PATCH | `/configuracion` | Nombre de la tienda, WhatsApp y umbral de inventario bajo |

Todas requieren token de un usuario con rol `admin`. Las definiciones de los reportes (ventas confirmadas, pagos confirmados, pendiente de cobro, cancelados) están en `app/dominios/reportes/servicios.py`; no se calcula utilidad porque no hay costos registrados.

### Otros

| Método | Endpoint | Descripcion | Auth |
|--------|----------|-------------|------|
| GET | `/health` | Health check del servicio | No |
| GET | `/api/v1/contenido` | Contenido publicado de la tienda | No |
| GET | `/uploads/:archivo` | Imagen de producto | No |

### Formato de respuesta

Todas las respuestas siguen este formato:

```json
{
  "success": true,
  "message": "Descripcion de la operacion",
  "data": { ... }
}
```

En caso de error:

```json
{
  "success": false,
  "error": {
    "message": "Mensaje de error",
    "details": { ... }
  }
}
```

---

## Flujos Clave

### Autenticacion y Autorizacion

Diagrama: [`flujo_autenticacion.drawio.xml`](./flujo_autenticacion.drawio.xml)

1. **Registro:** El cliente envia correo y contraseña. El sistema hashea la contraseña con Werkzeug y guarda al usuario en BD.
2. **Login:** El cliente envia credenciales. Si son validas, se genera un JWT firmado con HS256 y se devuelve un `access_token`.
3. **Request protegido:** El cliente envia el token en el header `Authorization: Bearer <token>`. El sistema valida el JWT y, para rutas de admin, verifica que el rol sea `admin`.

### Creacion y Pago de Pedidos

Diagrama: [`flujo_pedido.drawio.xml`](./flujo_pedido.drawio.xml)

1. **Crear pedido:** El usuario autenticado envia una lista de productos con cantidades. El sistema valida que cada producto exista, este disponible y tenga stock suficiente. Se crea el pedido en estado `pendiente`. **El stock no se descuenta todavia.**
2. **Pago por WhatsApp:** No hay pasarela en esta version (D8). El cliente coordina el pago por WhatsApp y el **administrador** registra la confirmacion: `pendiente → pagado`. En ese momento se descuenta el stock una sola vez. Si el pago no se concreta, el administrador lo pasa a `cancelado`.
3. **Envio:** El administrador pasa el pedido a `enviado` indicando transportadora y numero de guia, y luego a `entregado`. El cliente ve el estado, la transportadora y la guia.
4. Se utiliza bloqueo `SELECT ... FOR UPDATE` para evitar condiciones de carrera al descontar inventario.

---

## Estructura del Proyecto

```
MUGLY/
├── frontend/                   # SPA en HTML, CSS y JavaScript Vanilla (Bootstrap)
├── docs/                       # Documentacion y diagramas (este directorio)
└── backend/
├── app.py                      # Punto de entrada de la app Flask
├── app/
│   ├── __init__.py             # App factory, registro de blueprints y extensiones
│   ├── config.py               # Configuracion (variables de entorno, BD, CORS)
│   ├── seguridad.py            # Decoradores JWT y validacion de tokens
│   └── dominios/
│       ├── usuarios/           # Dominio de usuarios
│       │   ├── controladores.py
│       │   ├── servicios.py
│       │   ├── repositorios.py
│       │   ├── modelos.py      # Usuario, PerfilUsuario
│       │   └── dtos.py         # RegistroUsuarioDTO, ActualizarPerfilDTO
│       ├── productos/          # Dominio de productos
│       │   ├── controladores.py
│       │   ├── servicios.py
│       │   ├── repositorios.py
│       │   ├── modelos.py      # Producto
│       │   └── dtos.py         # CrearProductoDTO, ActualizarProductoDTO
│       ├── pedidos/            # Dominio de pedidos
│       │   ├── controladores.py
│       │   ├── servicios.py
│       │   ├── repositorios.py
│       │   ├── modelos.py      # Pedido, DetallePedido, HistorialEstadoPedido
│       │   └── dtos.py         # CrearPedidoDTO, CambiarEstadoPedidoDTO, BusquedaPedidosDTO
│       ├── contenido/          # Contenido administrable de la tienda (v1.2.0)
│       │   ├── controladores.py
│       │   ├── servicios.py
│       │   ├── repositorios.py
│       │   ├── modelos.py      # ContenidoBloque
│       │   └── dtos.py         # dto_bloque, OrdenSeccionesDTO
│       └── reportes/           # Dashboard, finanzas y exportes CSV (v1.2.0)
│           ├── controladores.py
│           ├── servicios.py
│           ├── repositorios.py
│           └── dtos.py         # RangoFechasDTO
├── migrations/                 # Migraciones de Alembic
│   └── versions/
├── scripts/
│   ├── create_db.py            # Crear base de datos MySQL
│   ├── generate_secret.py      # Generar SECRET_KEY
│   └── promover_admin.py       # Asignar rol admin a un usuario
├── tests/                      # Pruebas de integración (pytest)
│   ├── conftest.py
│   ├── test_usuarios.py
│   ├── test_productos.py
│   └── test_pedidos.py
├── uploads/                    # Archivos subidos (imagenes de productos)
├── requirements.txt            # Dependencias de Python
├── pytest.ini                  # Configuracion de pytest
└── .env.example                # Ejemplo de variables de entorno
```

Todo lo listado bajo `backend/` vive dentro de esa carpeta; los comandos
del backend se ejecutan desde `backend/`.

---

## Instalacion y Ejecucion

### Requisitos previos

- Python 3.10+
- MySQL (para desarrollo) o SQLite (para pruebas)
- pip

### Pasos

1. **Clonar el repositorio**

```bash
git clone <url-del-repositorio>
cd MUGLY/backend
```

Todos los pasos siguientes se ejecutan dentro de `backend/`.

2. **Crear y activar entorno virtual**

```bash
python -m venv venv
.\venv\Scripts\Activate.ps1   # Windows
source venv/bin/activate      # Linux/Mac
```

3. **Instalar dependencias**

```bash
pip install -r requirements.txt
```

4. **Configurar variables de entorno**

Copia `.env.example` a `.env` y ajusta los valores:

```bash
copy .env.example .env        # Windows
cp .env.example .env          # Linux/Mac
```

Edita `.env` con tus credenciales de MySQL y genera una `SECRET_KEY`:

```bash
python scripts/generate_secret.py
```

5. **Crear la base de datos**

```bash
python scripts/create_db.py
```

6. **Ejecutar migraciones**

```bash
flask --app "app:crear_app()" db upgrade
```

7. **Iniciar la aplicacion**

```bash
python app.py
```

La API estara disponible en `http://localhost:5000`.

### Ejecutar pruebas

```bash
set FLASK_TESTING=true        # Windows
export FLASK_TESTING=true     # Linux/Mac
python -m pytest -q
```

Se esperan **107 pruebas pasando**.

---

## Scripts Utilitarios

| Script | Uso | Descripcion |
|--------|-----|-------------|
| `scripts/generate_secret.py` | `python scripts/generate_secret.py` | Genera una SECRET_KEY segura para JWT |
| `scripts/create_db.py` | `python scripts/create_db.py` | Crea la base de datos MySQL si no existe |
| `scripts/promover_admin.py` | `python scripts/promover_admin.py correo@ejemplo.com` | Asigna rol de administrador a un usuario |

---

## Tecnologias

| Tecnologia | Version | Uso |
|------------|---------|-----|
| Flask | 3.1.3 | Framework web |
| Flask-SQLAlchemy | 3.1.1 | ORM para base de datos |
| Flask-CORS | 6.0.2 | Control de origen cruzado |
| Flask-Migrate | 4.1.0 | Migraciones con Alembic |
| PyMySQL | 1.1.2 | Driver MySQL |
| python-dotenv | 1.2.2 | Variables de entorno |
| SQLAlchemy | 2.0.49 | ORM base |
| Werkzeug | 3.1.8 | Hash de contraseñas |
| marshmallow | 3.23.2 | Validacion y serializacion |
| pytest | 9.0.3 | Framework de pruebas |
| PyJWT | 2.10.1 | Tokens JWT |

---

## Diagramas de arquitectura (SVG)

Los diagramas del informe están en [`diagramas/`](./diagramas/) como archivos
SVG que se abren en cualquier navegador. Se generan desde el código del
script, para que todos tengan el mismo estilo y coincidan con la implementación:

```bash
python docs/diagramas/generar_diagramas.py     # regenera los .svg
python docs/informe/construir_informe.py       # regenera el informe HTML
```

| Diagrama | Archivo |
|----------|---------|
| C4 nivel 1 · contexto | `c4_contexto.svg` |
| C4 nivel 2 · contenedores | `c4_contenedores.svg` |
| C4 nivel 3 · componentes de la API | `c4_componentes.svg` |
| Arquitectura lógica por capas | `arquitectura_logica.svg` |
| UML · casos de uso | `uml_casos_uso.svg` |
| UML · clases del dominio | `uml_clases.svg` |
| UML · clases por capas (pedidos) | `uml_clases_pedidos.svg` |
| UML · secuencia de confirmación del pago | `uml_secuencia_pago.svg` |
| UML · máquina de estados del pedido | `uml_estados_pedido.svg` |
| Despliegue (arquitectura computacional) | `despliegue.svg` |
| Modelo lógico de datos | `bd_logico.svg` |
| Modelo físico en MySQL | `bd_fisico.svg` |
| Seguridad: autenticación y autorización | `seguridad.svg` |

El informe [`Informe_Proyecto_Final_MUGLY.html`](./Informe_Proyecto_Final_MUGLY.html)
se construye a partir de [`informe/plantilla.html`](./informe/plantilla.html):
incrusta estos SVG, las capturas de [`informe/capturas/`](./informe/capturas/) y
extrae los fragmentos de código directamente del repositorio. Para regenerarlo:

```bash
python docs/diagramas/generar_diagramas.py
python docs/informe/construir_informe.py
```

Las imágenes de los productos de muestra están en
[`recursos/imagenes-productos/`](./recursos/imagenes-productos/).

## Diagramas iniciales (draw.io)

| Diagrama | Archivo | Contenido |
|----------|---------|-----------|
| Arquitectura | `arquitectura.drawio.xml` | Frontend SPA, capas del backend y módulos secundarios |
| Modelo de datos | `base_datos.drawio.xml` | Entidades y relaciones, incluido el historial de estados |
| Endpoints | `endpoints.drawio.xml` | Rutas de la API por dominio y de administración |
| Autenticación | `flujo_autenticacion.drawio.xml` | Login, JWT y autorización por rol |
| Pedidos | `flujo_pedido.drawio.xml` | Ciclo del pedido, pago confirmado por el administrador y envío |

Para editarlos, abre el archivo en [diagrams.net](https://app.diagrams.net/) (Archivo → Abrir desde → Dispositivo) o con la extensión de draw.io para VS Code.


## Versión v1.3.0 · solicitud de cambio CR-02

Rediseño del panel administrativo aprobado sobre un prototipo navegable y
datos que faltaban para operar (MGL-CR-002, épica MUG-37).

- **Base de datos** (migración `c7e3a1d9f204`): `tipos_producto`,
  `reembolsos_pedido`; documento y dirección en `perfiles`; `referencia` y
  `tipo_id` en `productos`; dirección de envío copiada, `archivado` y datos
  acordados de personalizados en `pedidos`.
- **Endpoints nuevos**: `POST/DELETE /admin/usuarios`,
  `POST /admin/usuarios/{id}/enlace-acceso`, `POST /usuarios/restablecer-contrasena`,
  `PATCH /usuarios/contrasena`, `/admin/tipos-producto` (CRUD),
  `PATCH /admin/pedidos/{id}/archivo`, `POST /admin/pedidos/archivar-cerrados`,
  `POST /admin/pedidos/{id}/reembolsos`, `GET /admin/reportes/productos/{id}`.
- **Reglas nuevas**: RN22 (reembolsos), RN23 (ventas netas), RN24 (clientes con
  pedidos no se borran), RN25 (archivo), RN26 (tipos en uso), RN27 (referencia única).
- **Frontend**: `css/admin.css` (solo tokens `--mg-*` de `estilos.css`),
  `js/componentes/adminUI.js`, `js/componentes/ajustes.js`,
  `assets/img/iconos-admin.svg` y la página pública `#/restablecer`.
- **Pendiente**: verificación de correo y celular, notificaciones, pasarela de
  pagos (RF21) y configuración de envíos y pagos.
