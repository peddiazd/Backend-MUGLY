"""
Copia completa de la tienda MUGLY para llevarla a otro equipo.

    python scripts/copia_tienda.py exportar   # en el equipo original
    python scripts/copia_tienda.py importar   # en el equipo nuevo, después de db upgrade

«exportar» guarda en backend/datos_demo/ todos los datos de la base (usuarios con sus
contraseñas cifradas, perfiles, productos, pedidos, detalles, historial y contenido de
la tienda) en tienda.json, y copia las fotos que usan los productos y el contenido.

«importar» carga esa copia en una base recién migrada y pone las fotos en
backend/uploads/. Así el equipo nuevo queda igual al original, con los mismos inicios
de sesión. Solo funciona sobre una base vacía, para no pisar datos existentes.

Usa los modelos de la aplicación (SQLAlchemy), así que no depende de mysqldump.
"""

import argparse
import json
import os
import re
import shutil
import sys
from datetime import date, datetime
from decimal import Decimal

RAIZ_BACKEND = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
sys.path.insert(0, RAIZ_BACKEND)

from sqlalchemy import DateTime, Numeric, func, select, text  # noqa: E402

from app import crear_app, db  # noqa: E402

CARPETA_COPIA = os.path.join(RAIZ_BACKEND, "datos_demo")
ARCHIVO = os.path.join(CARPETA_COPIA, "tienda.json")
FOTOS = os.path.join(CARPETA_COPIA, "uploads")

# Orden que respeta las llaves foráneas.
TABLAS = ["usuarios", "perfiles", "productos", "pedidos", "detalles_pedido",
          "historial_estados_pedido", "contenido_bloques"]
PATRON_FOTO = re.compile(r"[0-9a-f]{32}\.(?:png|jpe?g|webp)")


def _a_json(valor):
    if isinstance(valor, (datetime, date)):
        return valor.isoformat()
    if isinstance(valor, Decimal):
        return str(valor)
    return valor


def _desde_json(columna, valor):
    if valor is None:
        return None
    if isinstance(columna.type, DateTime):
        return datetime.fromisoformat(valor)
    if isinstance(columna.type, Numeric):
        return Decimal(valor)
    return valor


def exportar(app):
    datos, fotos = {}, set()
    with app.app_context():
        for nombre in TABLAS:
            tabla = db.metadata.tables[nombre]
            filas = db.session.execute(select(tabla).order_by(tabla.c.id)).mappings().all()
            datos[nombre] = [{k: _a_json(v) for k, v in fila.items()} for fila in filas]
            print(f"  {nombre:26} {len(filas)} registros")
        for fila in datos["productos"]:
            if fila.get("imagen"):
                fotos.add(fila["imagen"])
        fotos.update(PATRON_FOTO.findall(json.dumps(datos["contenido_bloques"])))
        version = db.session.execute(text("SELECT version_num FROM alembic_version")).scalar()

    os.makedirs(FOTOS, exist_ok=True)
    for viejo in os.listdir(FOTOS):
        if viejo not in fotos and PATRON_FOTO.fullmatch(viejo):
            os.remove(os.path.join(FOTOS, viejo))
    faltan = []
    for nombre in sorted(fotos):
        origen = os.path.join(app.config["UPLOAD_FOLDER"], nombre)
        if os.path.exists(origen):
            shutil.copy2(origen, os.path.join(FOTOS, nombre))
        else:
            faltan.append(nombre)

    copia = {"exportado": datetime.now().isoformat(timespec="seconds"), "migracion": version, "tablas": datos}
    with open(ARCHIVO, "w", encoding="utf-8") as f:
        json.dump(copia, f, ensure_ascii=False, indent=1)
    print(f"Copia guardada en {os.path.relpath(ARCHIVO, RAIZ_BACKEND)} con {len(fotos) - len(faltan)} fotos.")
    if faltan:
        print(f"  Aviso: no se encontraron estas fotos en uploads/: {', '.join(faltan)}")


def importar(app):
    if not os.path.exists(ARCHIVO):
        sys.exit(f"No existe {ARCHIVO}. En el equipo original ejecute primero: python scripts/copia_tienda.py exportar")
    with open(ARCHIVO, encoding="utf-8") as f:
        copia = json.load(f)

    with app.app_context():
        version = db.session.execute(text("SELECT version_num FROM alembic_version")).scalar()
        if version != copia["migracion"]:
            sys.exit(f"La base está en la migración {version} y la copia en {copia['migracion']}. "
                     "Ejecute flask --app \"app:crear_app()\" db upgrade antes de importar.")
        ocupadas = [t for t in TABLAS if t != "contenido_bloques"
                    and db.session.execute(select(func.count()).select_from(db.metadata.tables[t])).scalar()]
        if ocupadas:
            sys.exit(f"La base ya tiene datos en: {', '.join(ocupadas)}. La copia solo se importa en una base vacía.")

        # El contenido inicial puede haberse creado al abrir la página: se reemplaza por el de la copia.
        db.session.execute(db.metadata.tables["contenido_bloques"].delete())
        for nombre in TABLAS:
            tabla = db.metadata.tables[nombre]
            filas = [{c: _desde_json(tabla.c[c], v) for c, v in fila.items() if c in tabla.c}
                     for fila in copia["tablas"][nombre]]
            if filas:
                db.session.execute(tabla.insert(), filas)
            print(f"  {nombre:26} {len(filas)} registros")
        db.session.commit()

    destino = app.config["UPLOAD_FOLDER"]
    os.makedirs(destino, exist_ok=True)
    copiadas = 0
    if os.path.isdir(FOTOS):
        for nombre in os.listdir(FOTOS):
            if PATRON_FOTO.fullmatch(nombre) and not os.path.exists(os.path.join(destino, nombre)):
                shutil.copy2(os.path.join(FOTOS, nombre), os.path.join(destino, nombre))
                copiadas += 1
    print(f"Fotos copiadas a uploads/: {copiadas}.")
    print(f"Listo: la tienda quedó igual a la copia del {copia['exportado']}. "
          "Las cuentas conservan las mismas contraseñas del equipo original.")


def main():
    parser = argparse.ArgumentParser(description="Exporta o importa la copia completa de la tienda MUGLY.")
    parser.add_argument("accion", choices=["exportar", "importar"])
    args = parser.parse_args()
    app = crear_app()
    print(f"{args.accion.capitalize()} · base {app.config['SQLALCHEMY_DATABASE_URI'].rsplit('/', 1)[-1].split('?')[0]}")
    exportar(app) if args.accion == "exportar" else importar(app)


if __name__ == "__main__":
    from sqlalchemy.exc import OperationalError, ProgrammingError

    try:
        main()
    except OperationalError as error:
        codigo = error.orig.args[0] if getattr(error, "orig", None) and error.orig.args else None
        print("\nNo se pudo conectar con MySQL.", file=sys.stderr)
        if codigo == 1045:
            print("  Usuario o contraseña incorrectos: revise DB_USER y DB_PASSWORD en backend/.env.", file=sys.stderr)
        elif codigo == 1049:
            print("  La base no existe: ejecute primero python scripts/create_db.py.", file=sys.stderr)
        else:
            print("  Revise que MySQL esté en ejecución y los datos DB_* de backend/.env.", file=sys.stderr)
        sys.exit(1)
    except ProgrammingError:
        print("\nFaltan las tablas: ejecute primero flask --app \"app:crear_app()\" db upgrade.", file=sys.stderr)
        sys.exit(1)
