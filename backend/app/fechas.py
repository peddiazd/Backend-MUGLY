"""Fechas del negocio en hora de Colombia.

La base guarda las fechas en UTC (datetime.utcnow). Los reportes se piden por
día calendario de Colombia (UTC-5, sin horario de verano), así que un rango
de días locales se convierte a un rango UTC semiabierto [inicio, fin).
"""
from datetime import date, datetime, timedelta

DESFASE = timedelta(hours=-5)


def hoy_local():
    return (datetime.utcnow() + DESFASE).date()


def rango_utc(desde, hasta):
    """Días locales [desde, hasta] (incluidos) -> datetimes UTC [inicio, fin)."""
    inicio = datetime.combine(desde, datetime.min.time()) - DESFASE
    fin = datetime.combine(hasta + timedelta(days=1), datetime.min.time()) - DESFASE
    return inicio, fin


def dia_local(fecha_utc):
    return (fecha_utc + DESFASE).date()


def inicio_de_mes(dia):
    return date(dia.year, dia.month, 1)
