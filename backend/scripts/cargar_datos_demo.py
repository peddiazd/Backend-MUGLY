"""
Carga los datos de demostración de MUGLY en una base recién creada.

Crea los 6 mugs del catálogo con su foto (tomada de docs/recursos/imagenes-productos)
y, si se pide, una cuenta de administrador. Usa los servicios de la aplicación, así
que aplica las mismas reglas que la API. Se puede ejecutar varias veces: lo que ya
existe no se duplica.

Uso (desde la carpeta backend/, con el entorno virtual activo):
    python scripts/cargar_datos_demo.py
    python scripts/cargar_datos_demo.py --admin admin@mugly.com

Con --admin, la contraseña se pide por teclado (o se toma de la variable de entorno
MUGLY_ADMIN_CONTRASENA). Nunca se guarda en el repositorio.
"""

import argparse
import getpass
import mimetypes
import os
import sys

RAIZ_BACKEND = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
sys.path.insert(0, RAIZ_BACKEND)

from werkzeug.datastructures import FileStorage  # noqa: E402

from app import crear_app  # noqa: E402
from app.dominios.productos.modelos import Producto  # noqa: E402
from app.dominios.productos.servicios import ProductoServicio  # noqa: E402
from app.dominios.usuarios.repositorios import UsuarioRepositorio  # noqa: E402
from app.dominios.usuarios.servicios import UsuarioServicio  # noqa: E402

IMAGENES = os.path.abspath(os.path.join(RAIZ_BACKEND, "..", "docs", "recursos", "imagenes-productos"))

PRODUCTOS = [
    {"nombre": "Mug clásico blanco", "descripcion": "Cerámica blanca, el básico de todos los días.",
     "precio": 25000, "cantidad_stock": 23, "imagen": "producto-1-blanco.png"},
    {"nombre": "Mug negro mate", "descripcion": "Acabado mate en negro grafito.",
     "precio": 28000, "cantidad_stock": 3, "imagen": "producto-2-negro.png"},
    {"nombre": "Mug mágico", "descripcion": "Azul petróleo con estrellas doradas.",
     "precio": 35000, "cantidad_stock": 10, "imagen": "producto-3-magico.png"},
    {"nombre": "Mug pastel rosa", "descripcion": "Tono rosa suave para tu escritorio.",
     "precio": 27000, "cantidad_stock": 9, "imagen": "producto-4-rosa.png"},
    {"nombre": "Mug esmaltado azul", "descripcion": "Estilo esmaltado con borde blanco.",
     "precio": 32000, "cantidad_stock": 7, "imagen": "producto-5-esmaltado.png"},
    {"nombre": "Mug con frase", "descripcion": "Blanco con frase impresa.",
     "precio": 30000, "cantidad_stock": 14, "imagen": "producto-6-frases.png"},
]


def cargar_productos(carpeta_uploads):
    servicio = ProductoServicio()
    creados = 0
    for datos in PRODUCTOS:
        producto = Producto.query.filter_by(nombre=datos["nombre"]).first()
        if producto is None:
            producto_dict = servicio.crear_producto({k: v for k, v in datos.items() if k != "imagen"})
            producto_id = producto_dict["id"] if isinstance(producto_dict, dict) else producto_dict.id
            creados += 1
            estado = "creado"
        else:
            producto_id = producto.id
            estado = "ya existía"

        producto = Producto.query.get(producto_id)
        foto_ok = bool(producto.imagen) and os.path.exists(os.path.join(carpeta_uploads, producto.imagen))
        if not foto_ok:
            ruta = os.path.join(IMAGENES, datos["imagen"])
            tipo = mimetypes.guess_type(ruta)[0] or "image/png"
            with open(ruta, "rb") as archivo:
                servicio.guardar_imagen(producto_id, FileStorage(stream=archivo, filename=datos["imagen"], content_type=tipo),
                                        carpeta_uploads)
            estado += " · foto cargada"
        print(f"  {datos['nombre']:22} {estado}")
    return creados


def crear_admin(correo, secret_key, jwt_exp_minutes):
    servicio = UsuarioServicio(secret_key=secret_key, jwt_exp_minutes=jwt_exp_minutes)
    usuario = UsuarioRepositorio.obtener_por_correo(correo)
    if usuario is None:
        contrasena = os.getenv("MUGLY_ADMIN_CONTRASENA") or getpass.getpass(f"Contraseña para {correo} (mínimo 6 caracteres): ")
        if len(contrasena) < 6:
            print("  La contraseña debe tener al menos 6 caracteres. No se creó el administrador.")
            return
        servicio.registrar_usuario({"correo": correo, "contrasena": contrasena})
        print(f"  Cuenta {correo} creada.")
    if UsuarioRepositorio.obtener_por_correo(correo).rol != "admin":
        servicio.promover_a_admin(correo)
    print(f"  {correo} tiene rol de administrador.")


def main():
    parser = argparse.ArgumentParser(description="Carga los datos de demostración de MUGLY.")
    parser.add_argument("--admin", metavar="CORREO", help="crea (si no existe) y promueve esta cuenta a administrador")
    args = parser.parse_args()

    app = crear_app()
    with app.app_context():
        print("Productos del catálogo:")
        creados = cargar_productos(app.config["UPLOAD_FOLDER"])
        print(f"  {creados} productos nuevos.")
        if args.admin:
            print("Administrador:")
            crear_admin(args.admin, app.config["SECRET_KEY"], app.config.get("JWT_EXP_MINUTES", 15))
    print("Listo. El contenido de la tienda (textos de Inicio y Nosotros) se crea solo la primera vez que se abre la página.")


if __name__ == "__main__":
    main()
