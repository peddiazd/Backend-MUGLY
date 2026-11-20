# Documentacion del Proyecto MUGLY

## Resumen

**MUGLY** es una API REST de comercio electrónico construida con **Flask 3**, enfocada en la gestión de usuarios, productos (tipo "mug") y pedidos. Sigue una arquitectura por capas dentro de cada dominio, separando controladores, servicios, repositorios, modelos y DTOs.

---

## Arquitectura del Sistema

El sistema está organizado en capas que separan la presentación, la lógica de negocio y el acceso a datos.

![Arquitectura](./arquitectura.png)

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
- **Migraciones:** Alembic para versionado del esquema (`migrations/`)
- **Pruebas:** pytest con SQLite en memoria (`tests/`)

---

## Modelo de Datos

![Base de datos](./base_datos.png)

### Entidades

| Tabla | Campos principales | Relaciones |
|-------|-------------------|------------|
| `usuarios` | id (PK), correo (UK), contrasena, fecha_creacion, rol, activo | 1:1 con `perfiles`, 1:N con `pedidos` |
| `perfiles` | id (PK), nombre, apellido, telefono, usuario_id (FK, UK) | N:1 con `usuarios` |
| `productos` | id (PK), nombre, descripcion, precio, disponible, cantidad_stock, imagen | 1:N con `detalles_pedido` |
| `pedidos` | id (PK), usuario_id (FK), estado, tipo, descripcion, transportadora, numero_guia, total, fecha_creacion | N:1 con `usuarios`, 1:N con `detalles_pedido` e `historial_estados_pedido` |
| `detalles_pedido` | id (PK), pedido_id (FK), producto_id (FK), cantidad, precio_unitario | N:1 con `pedidos`, N:1 con `productos` |
| `historial_estados_pedido` | id (PK), pedido_id (FK), estado, fecha, usuario_id (FK) | N:1 con `pedidos` |

### Estados de pedido (ADR-004)

`pendiente` → `pagado` → `enviado` → `entregado`. Un pedido `pendiente` también puede pasar a `cancelado`.

- `tipo`: `catalogo` (compra desde el catálogo) o `personalizado` (acordado por WhatsApp y registrado por el administrador).
- Cada cambio de estado queda en `historial_estados_pedido` con fecha y usuario.

---

## Endpoints de la API

![Endpoints](./endpoints.png)

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
| GET | `/usuarios` | Listar usuarios |
| GET | `/usuarios/:id` | Detalle de usuario con perfil |
| PATCH | `/usuarios/:id` | Editar perfil y activar/desactivar (`activo`) |
| GET | `/productos` | Todos los productos, incluidos los no disponibles |
| GET | `/pedidos` | Todos los pedidos |
| GET | `/pedidos/:id` | Detalle de cualquier pedido |
| PATCH | `/pedidos/:id/estado` | Cambiar estado (`pagado` descuenta inventario; `enviado` exige `transportadora` y `numero_guia`) |
| POST | `/pedidos/personalizados` | Registrar pedido personalizado (`usuario_id`, `descripcion`, `total`) |

Todas requieren token de un usuario con rol `admin`.

### Otros

| Método | Endpoint | Descripcion | Auth |
|--------|----------|-------------|------|
| GET | `/health` | Health check del servicio | No |
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

![Flujo de autenticacion](./flujo_autenticacion.png)

1. **Registro:** El cliente envia correo y contraseña. El sistema hashea la contraseña con Werkzeug y guarda al usuario en BD.
2. **Login:** El cliente envia credenciales. Si son validas, se genera un JWT firmado con HS256 y se devuelve un `access_token`.
3. **Request protegido:** El cliente envia el token en el header `Authorization: Bearer <token>`. El sistema valida el JWT y, para rutas de admin, verifica que el rol sea `admin`.

### Creacion y Pago de Pedidos

![Flujo de pedido](./flujo_pedido.png)

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
│   ├── migrate.py              # Reexport de Flask-Migrate
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
│       └── pedidos/            # Dominio de pedidos
│           ├── controladores.py
│           ├── servicios.py
│           ├── repositorios.py
│           ├── modelos.py      # Pedido, DetallePedido
│           └── dtos.py         # CrearPedidoDTO
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

Se esperan **65 pruebas pasando**.

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

## Diagramas (PlantUML + planttext.com)

Los diagramas fueron generados con **PlantUML** y renderizados a través de [planttext.com](https://www.planttext.com/).

| Diagrama | Fuente (`.puml`) | Imagen (`.png`) | Contenido |
|----------|-----------------|-----------------|-----------|
| Arquitectura | `arquitectura.puml` | `arquitectura.png` | Capas del sistema y modulos secundarios |
| Modelo de datos | `base_datos.puml` | `base_datos.png` | Entidades y relaciones (ER) |
| Endpoints | `endpoints.puml` | `endpoints.png` | Rutas de la API por dominio |
| Autenticacion | `flujo_autenticacion.puml` | `flujo_autenticacion.png` | Login, JWT, autorizacion admin |
| Pedidos | `flujo_pedido.puml` | `flujo_pedido.png` | Creacion, stock y pago de pedidos |

Para editar los diagramas, abre los archivos `.puml` en cualquier editor PlantUML o pega su contenido en [planttext.com](https://www.planttext.com/).

