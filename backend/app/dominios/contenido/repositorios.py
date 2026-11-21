from app import db
from app.dominios.contenido.modelos import ContenidoBloque


class ContenidoRepositorio:
    """Capa de acceso a datos para los bloques de contenido."""

    @staticmethod
    def listar():
        return db.session.query(ContenidoBloque).all()

    @staticmethod
    def obtener(clave):
        return db.session.query(ContenidoBloque).filter_by(clave=clave).first()

    @staticmethod
    def agregar(bloque):
        db.session.add(bloque)

    @staticmethod
    def confirmar():
        db.session.commit()
