
from app import db


class TipoProducto(db.Model):
    """Tipo de mug administrable (Clásico, Mágico, ...). RF30, CR-02."""

    __tablename__ = "tipos_producto"

    id = db.Column(db.Integer, primary_key=True)
    nombre = db.Column(db.String(40), unique=True, nullable=False)
    descripcion = db.Column(db.String(120), nullable=True)

    def to_dict(self):
        return {"id": self.id, "nombre": self.nombre, "descripcion": self.descripcion}


class Producto(db.Model):
    """Modelo de los productos de la tienda MUGLY."""

    __tablename__ = "productos"

    id = db.Column(db.Integer, primary_key=True)
    nombre = db.Column(db.String(200), nullable=False)
    descripcion = db.Column(db.Text, nullable=False)
    precio = db.Column(db.Numeric(10, 2), nullable=False)
    disponible = db.Column(db.Boolean, nullable=False, default=True)
    cantidad_stock = db.Column(db.Integer, nullable=False, default=0)
    # Nombre del archivo de la foto guardada en la carpeta de uploads.
    imagen = db.Column(db.String(255), nullable=True)
    # Referencia única y tipo de mug (RF30, RN27)
    referencia = db.Column(db.String(30), unique=True, nullable=True)
    tipo_id = db.Column(db.Integer, db.ForeignKey("tipos_producto.id"), nullable=True)
    tipo = db.relationship("TipoProducto", lazy="joined")

    def to_dict(self):
        """Convierte el producto en un diccionario."""
        return {
            "id": self.id,
            "nombre": self.nombre,
            "descripcion": self.descripcion,
            "precio": float(self.precio),
            "disponible": self.disponible,
            "cantidad_stock": self.cantidad_stock,
            "imagen": f"/uploads/{self.imagen}" if self.imagen else None,
            "referencia": self.referencia,
            "tipo": self.tipo.to_dict() if self.tipo else None,
        }
