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
una **copia completa de la tienda** en `backend/datos_demo/`: usuarios con sus
contraseñas cifradas, productos con sus fotos, pedidos con su historial y el
contenido de la página. Lo que no trae es el archivo `.env`, porque guarda las
claves de cada equipo. En un equipo nuevo, siga estos pasos en orden y la tienda
quedará igual a la original, con los mismos inicios de sesión.

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
python scripts/copia_tienda.py importar         # carga usuarios, productos, pedidos, contenido y fotos
```

El último comando deja la tienda igual a la del equipo original: las mismas cuentas
(por ejemplo `admin@mugly.com` y `cliente@mugly.com`) con **las mismas contraseñas**,
los mismos productos con sus fotos y los mismos pedidos. Solo se ejecuta sobre una
base vacía, para no pisar datos.

**Actualizar la copia.** Si en el equipo original se agregan datos y se quieren
llevar al otro equipo, en el original ejecute `python scripts/copia_tienda.py exportar`
y suba a GitHub los cambios de `backend/datos_demo/`.

**Tienda limpia (opcional).** Si en lugar de la copia se quiere una tienda nueva,
solo con los 6 mugs y un administrador propio, use
`python scripts/cargar_datos_demo.py --admin admin@mugly.com` (pide la contraseña).

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
| El catálogo sale vacío («0 mugs») | La base es nueva y no se importó la copia | `python scripts/copia_tienda.py importar` |
| «La base ya tiene datos» al importar | La copia solo se carga en una base vacía | Use una base nueva (cambie `DB_NAME` en `.env` y repita los pasos) |
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
