from app import db
from app.dominios.usuarios.modelos import Usuario, PerfilUsuario


class UsuarioRepositorio:
    """Capa de acceso a datos para usuarios y perfiles."""

    @staticmethod
    def guardar_usuario(usuario):
        db.session.add(usuario)
        db.session.commit()
        return usuario

    @staticmethod
    def obtener_por_correo(correo):
        return db.session.query(Usuario).filter_by(correo=correo).first()

    @staticmethod
    def obtener_por_id(usuario_id):
        return db.session.get(Usuario, usuario_id)

    @staticmethod
    def obtener_perfil_por_usuario_id(usuario_id):
        return db.session.query(PerfilUsuario).filter_by(usuario_id=usuario_id).first()

    @staticmethod
    def guardar_perfil(perfil):
        db.session.add(perfil)
        db.session.commit()
        return perfil

    @staticmethod
    def listar_todos():
        """Consulta todos los usuarios registrados."""
        return db.session.query(Usuario).all()

    @staticmethod
    def actualizar_usuario():
        """Guarda los cambios realizados a un usuario."""
        db.session.commit()
