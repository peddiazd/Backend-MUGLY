from datetime import datetime

from app import db


class ContenidoBloque(db.Model):
    """Bloque de contenido editable de la tienda (sección, página o configuración).

    Cada bloque guarda dos versiones con la misma forma
    {"visible": bool, "orden": int, "datos": {...}}:
      - borrador: lo que el administrador está editando y ve en la vista previa.
      - publicado: lo que ven los clientes.
    Publicar copia el borrador sobre lo publicado.
    """

    __tablename__ = "contenido_bloques"

    id = db.Column(db.Integer, primary_key=True)
    clave = db.Column(db.String(40), unique=True, nullable=False)
    borrador = db.Column(db.JSON, nullable=False)
    publicado = db.Column(db.JSON, nullable=False)
    actualizado_en = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    actualizado_por = db.Column(
        db.Integer,
        db.ForeignKey("usuarios.id", ondelete="SET NULL"),
        nullable=True,
    )
    publicado_en = db.Column(db.DateTime, nullable=True)
