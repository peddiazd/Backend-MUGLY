# MUGLY

Tienda virtual de mugs: catálogo, compras, pedidos, inventario, envíos y
administración del negocio.

## Estructura del repositorio

| Carpeta | Contenido |
|---------|-----------|
| `backend/` | API REST en Python + Flask (monolito modular por dominios), MySQL, migraciones y pruebas |
| `frontend/` | SPA en HTML5, CSS3 y JavaScript Vanilla con Bootstrap |
| `docs/` | Documentación técnica y diagramas |

## Ejecutar MUGLY en un computador nuevo

El repositorio (o el ZIP descargado de GitHub) trae el código, las migraciones y
las fotos de los productos, pero **no trae datos ni el archivo `.env`**: los datos
viven en la base MySQL de cada equipo y el `.env` guarda claves locales. Por eso,
en un equipo nuevo, siga estos pasos en orden.

### Requisitos

- **Python 3.11 o superior** (`python --version`).
- **MySQL Server 8.0** instalado y en ejecución, con un usuario que pueda crear bases
  (por ejemplo `root`) y su contraseña.

### 1. Backend: entorno, configuración y base de datos

Abra una terminal en la carpeta `backend/` del proyecto.

| Paso | PowerShell o CMD (Windows) | Git Bash, Linux o macOS |
|---|---|---|
| Entorno virtual | `python -m venv venv` | `python -m venv venv` |
| Activarlo | `venv\Scripts\activate` | `source venv/Scripts/activate` (Linux/macOS: `source venv/bin/activate`) |
| Dependencias | `pip install -r requirements.txt` | `pip install -r requirements.txt` |
| Configuración | `copy .env.example .env` | `cp .env.example .env` |

Abra `backend/.env` y complete:

- `DB_USER` y `DB_PASSWORD`: el usuario y la contraseña de MySQL **de ese equipo**.
- `SECRET_KEY`: genere una con `python scripts/generate_secret.py` y péguela.

Con el entorno virtual activo y desde `backend/`:

```bash
python scripts/create_db.py                     # crea la base mugly_db
flask --app "app:crear_app()" db upgrade        # crea las tablas (7 migraciones)
python scripts/cargar_datos_demo.py --admin admin@mugly.com
```

El último comando carga los 6 mugs del catálogo con sus fotos y crea la cuenta de
administrador `admin@mugly.com`, cuya contraseña pide por teclado. Se puede ejecutar
de nuevo sin duplicar nada. Las cuentas de cliente se crean desde la página
(«Regístrate»).

Inicie la API y deje esa terminal abierta:

```bash
python app.py                                    # http://localhost:5000
```

### 2. Frontend

En **otra** terminal, desde la carpeta `frontend/`:

```bash
python -m http.server 5173
```

Abra **http://localhost:5173** en el navegador.

### Si algo no carga

| Síntoma | Causa | Solución |
|---|---|---|
| El catálogo sale vacío («0 mugs») | La base es nueva y no tiene productos | `python scripts/cargar_datos_demo.py` |
| «No se pudo conectar con el servidor» | La API no está corriendo, o el `.env` tiene mal la contraseña de MySQL | Revise la terminal de `python app.py` y el `.env` |
| La página queda en blanco | Se abrió `index.html` con doble clic (`file://`) | Ábrala siempre en `http://localhost:5173` |
| `flask` no se reconoce | El entorno virtual no está activo | Active `venv` (paso 1) |
| `Access denied for user` | Usuario o contraseña de MySQL incorrectos | Corrija `DB_USER` y `DB_PASSWORD` en `.env` |

### Pruebas automáticas

```bash
cd backend
python -m pytest -q        # usan SQLite en memoria; no tocan mugly_db
```

La documentación completa (arquitectura, endpoints, modelo de datos y flujos)
está en [`docs/README.md`](docs/README.md). La SPA no necesita compilación:
Bootstrap 5.3.3 está incluido en `frontend/assets/vendor/`, y la URL de la API y
el número de WhatsApp se configuran en `frontend/js/config.js`
([`frontend/README.md`](frontend/README.md)).

## Informe del proyecto

El informe final está en
[`docs/Informe_Proyecto_Final_MUGLY.html`](docs/Informe_Proyecto_Final_MUGLY.html):
un solo archivo que se abre en el navegador, con los diagramas y las capturas
de la aplicación incluidos. Corresponde a la versión v1.2.0 (panel administrativo) e incluye una matriz
de cumplimiento con cada punto solicitado para la entrega.
