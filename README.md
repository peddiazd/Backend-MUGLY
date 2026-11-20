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

## Frontend

En construcción. Ver [`frontend/README.md`](frontend/README.md).
