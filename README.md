# MUGLY

Tienda virtual de mugs: catálogo, compras, pedidos, inventario, envíos y
administración del negocio.

## Estructura del repositorio

| Carpeta | Contenido |
|---------|-----------|
| `backend/` | API REST en Python + Flask (monolito modular por dominios), MySQL, migraciones y pruebas |
| `frontend/` | SPA en HTML5, CSS3 y JavaScript Vanilla con Bootstrap |
| `docs/` | Documentación técnica y diagramas |

## Backend: puesta en marcha rápida

```bash
cd backend
python -m venv venv
source venv/Scripts/activate      # Git Bash en Windows
pip install -r requirements.txt
cp .env.example .env              # completar credenciales
python scripts/create_db.py
flask --app "app:crear_app()" db upgrade
python app.py                     # http://localhost:5000
```

Pruebas:

```bash
cd backend
python -m pytest -q
```

La documentación completa (arquitectura, endpoints, modelo de datos y flujos)
está en [`docs/README.md`](docs/README.md).

## Frontend: puesta en marcha

Con la API en ejecución, en otra terminal:

```bash
cd frontend
python -m http.server 5173        # http://localhost:5173
```

La SPA no necesita compilación ni dependencias: Bootstrap 5.3.3 está incluido
en `frontend/assets/vendor/`. La URL de la API y el número de WhatsApp se
configuran en `frontend/js/config.js`. Más detalles en
[`frontend/README.md`](frontend/README.md).

## Informe del proyecto

El informe final está en
[`docs/Informe_Proyecto_Final_MUGLY.html`](docs/Informe_Proyecto_Final_MUGLY.html):
un solo archivo que se abre en el navegador, con los diagramas y las capturas
de la aplicación incluidos. Corresponde a la versión v1.1.0 e incluye una matriz
de cumplimiento con cada punto solicitado para la entrega.
