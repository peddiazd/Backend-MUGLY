from datetime import datetime

from app import db


class Usuario(db.Model):
    """Modelo de usuario de la plataforma."""

    __tablename__ = "usuarios"

    id = db.Column(db.Integer, primary_key=True)
    correo = db.Column(db.String(255), unique=True, nullable=False)
    contrasena = db.Column(db.String(255), nullable=False)
    fecha_creacion = db.Column(db.DateTime, default=datetime.utcnow)
    rol = db.Column(
        db.String(20),
        nullable=False,
        server_default="usuario",
    )
    # Un usuario desactivado no puede iniciar sesion ni usar su token.
    activo = db.Column(
        db.Boolean,
        nullable=False,
        default=True,
        server_default=db.true(),
    )

    perfil = db.relationship(
        "PerfilUsuario",
        back_populates="usuario",
        uselist=False,
        cascade="all, delete-orphan",
        lazy="select",
    )

    def to_dict(self):
        return {
            "id": self.id,
            "correo": self.correo,
            "fecha_creacion": (
                self.fecha_creacion.isoformat() if self.fecha_creacion else None
            ),
            "rol": self.rol,
            "activo": self.activo,
        }


class PerfilUsuario(db.Model):
    """Perfil complementario del usuario."""

    __tablename__ = "perfiles"

    id = db.Column(db.Integer, primary_key=True)
    nombre = db.Column(db.String(50))
    apellido = db.Column(db.String(50))
    telefono = db.Column(db.String(20))
    # Datos para enviar los pedidos (RF29, CR-02)
    tipo_documento = db.Column(db.String(4))
    numero_documento = db.Column(db.String(20))
    departamento = db.Column(db.String(60))
    ciudad = db.Column(db.String(60))
    direccion = db.Column(db.String(120))
    complemento = db.Column(db.String(80))
    usuario_id = db.Column(
        db.Integer,
        db.ForeignKey("usuarios.id"),
        unique=True,
    )

    usuario = db.relationship("Usuario", back_populates="perfil")

    def to_dict(self):
        return {
            "id": self.id,
            "nombre": self.nombre,
            "apellido": self.apellido,
            "telefono": self.telefono,
            "tipo_documento": self.tipo_documento,
            "numero_documento": self.numero_documento,
            "departamento": self.departamento,
            "ciudad": self.ciudad,
            "direccion": self.direccion,
            "complemento": self.complemento,
            "usuario_id": self.usuario_id,
        }
