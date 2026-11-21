from marshmallow import Schema, ValidationError, fields, validate, validates_schema


class RangoFechasDTO(Schema):
    """Período de un reporte en días de Colombia (ambos incluidos)."""

    desde = fields.Date(load_default=None)
    hasta = fields.Date(load_default=None)
    agrupar = fields.String(load_default="dia", validate=validate.OneOf(["dia", "mes"]))

    @validates_schema
    def validar_rango(self, datos, **kwargs):
        desde, hasta = datos.get("desde"), datos.get("hasta")
        if desde and hasta:
            if desde > hasta:
                raise ValidationError("La fecha inicial no puede ser posterior a la final.", "desde")
            if (hasta - desde).days > 366 * 3:
                raise ValidationError("El período máximo es de tres años.", "hasta")
