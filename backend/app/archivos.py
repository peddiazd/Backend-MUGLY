"""Subida segura de imágenes, compartida por productos y contenido (ADR-006)."""
import os
import uuid

EXTENSIONES_IMAGEN = {"jpg", "jpeg", "png", "webp"}


class ImagenInvalidaError(Exception):
    """Error cuando el archivo de imagen no es valido."""


def guardar_imagen(archivo, carpeta):
    """Valida el archivo, lo guarda con un nombre UUID y devuelve ese nombre.

    El tamaño máximo (5 MB) lo controla MAX_CONTENT_LENGTH en la configuración.
    """
    if archivo is None or not archivo.filename:
        raise ImagenInvalidaError("Debe adjuntar un archivo de imagen.")

    extension = archivo.filename.rsplit(".", 1)[-1].lower()

    if "." not in archivo.filename or extension not in EXTENSIONES_IMAGEN:
        raise ImagenInvalidaError("Formato no permitido. Use JPG, PNG o WEBP.")

    if not (archivo.mimetype or "").startswith("image/"):
        raise ImagenInvalidaError("El archivo no es una imagen.")

    os.makedirs(carpeta, exist_ok=True)
    nombre = f"{uuid.uuid4().hex}.{extension}"
    archivo.save(os.path.join(carpeta, nombre))
    return nombre
