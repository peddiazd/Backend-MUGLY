from marshmallow import Schema, fields, validate

# Enlaces permitidos: rutas internas de la SPA (#/...) o páginas https.
ENLACE = validate.Regexp(
    r"^(#/[\w\-/?=&.]*|https://[^\s<>\"']+)$",
    error="Use una ruta de la tienda (#/catalogo) o una dirección https://.",
)


def _texto(maximo):
    return fields.String(validate=validate.Length(max=maximo))


# Campos editables de cada bloque. Solo estos se aceptan (lo demás es 400).
CAMPOS = {
    "portada": {
        "titulo": _texto(120),
        "resaltado": _texto(40),
        "subtitulo": _texto(300),
        "boton": _texto(40),
        "enlace_secundario": _texto(60),
        "etiqueta": _texto(40),
    },
    "escena": {},
    "coleccion": {"titulo": _texto(120), "texto": _texto(300)},
    "banner": {
        "titulo": _texto(120),
        "texto": _texto(300),
        "boton": _texto(40),
        "enlace": fields.String(validate=[validate.Length(max=200), ENLACE]),
    },
    "personaliza": {"titulo": _texto(120), "texto": _texto(300), "boton": _texto(40)},
    "catalogo": {"titulo": _texto(120), "cantidad": fields.Integer(validate=validate.Range(min=2, max=8))},
    "nosotros": {"titulo": _texto(120), "texto": _texto(500)},
    "tienda": {
        "nombre": fields.String(validate=validate.Length(min=1, max=60)),
        "whatsapp": fields.String(validate=validate.Regexp(r"^\d{10,15}$", error="Solo dígitos, con indicativo de país (10 a 15).")),
        "umbral_inventario_bajo": fields.Integer(validate=validate.Range(min=0, max=1000)),
    },
}


def dto_bloque(clave, con_visible=True):
    """DTO para editar un bloque: 'datos' parcial con sus campos y 'visible'."""
    datos = Schema.from_dict(dict(CAMPOS[clave]), name=f"Datos_{clave}")
    campos = {"datos": fields.Nested(datos)}
    if con_visible:
        campos["visible"] = fields.Boolean()
    return Schema.from_dict(campos, name=f"Bloque_{clave}")


class OrdenSeccionesDTO(Schema):
    """Nuevo orden de las secciones de Inicio (lista completa de claves)."""

    orden = fields.List(fields.String(validate=validate.Length(max=40)), required=True)
