"""Paginación en el servidor para listados administrativos."""
import math


def paginar(consulta, pagina, por_pagina):
    """Aplica LIMIT/OFFSET y devuelve (filas, metadatos de paginación)."""
    total = consulta.order_by(None).count()
    filas = consulta.limit(por_pagina).offset((pagina - 1) * por_pagina).all()
    return filas, {
        "total": total,
        "pagina": pagina,
        "por_pagina": por_pagina,
        "paginas": max(1, math.ceil(total / por_pagina)),
    }
