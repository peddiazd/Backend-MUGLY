"""Contenido administrable de la tienda: borrador, vista previa y publicación."""
import copy
from datetime import datetime

from app.archivos import guardar_imagen
from app.dominios.contenido.modelos import ContenidoBloque
from app.dominios.contenido.repositorios import ContenidoRepositorio


class ContenidoNoEncontradoError(Exception):
    """El bloque de contenido no existe."""


class ContenidoInvalidoError(Exception):
    """La operación no aplica a este bloque."""


# Bloques de la tienda con su contenido inicial, tomado de los textos que
# antes estaban escritos en inicio.js, nosotros.js y config.js.
# tipo: seccion (de Inicio, con orden y visibilidad), pagina o config.
BLOQUES = {
    "portada": {
        "nombre": "Portada", "tipo": "seccion", "imagen": True,
        "defecto": {"visible": True, "orden": 1, "datos": {
            "titulo": "Un mug para cada estilo, y para cada mañana.",
            "resaltado": "estilo",
            "subtitulo": "Anime, kawaii, gamer, naturaleza, frases o tu propia foto. Elige el tuyo en el catálogo o pídelo personalizado por WhatsApp.",
            "boton": "Ver catálogo",
            "enlace_secundario": "Quiero uno personalizado",
            "etiqueta": "Anime · Ohayō",
            "imagen": None,
        }},
    },
    "escena": {
        "nombre": "Escena del producto", "tipo": "seccion", "imagen": False,
        "defecto": {"visible": True, "orden": 2, "datos": {}},
    },
    "coleccion": {
        "nombre": "Colección por estilos", "tipo": "seccion", "imagen": False,
        "defecto": {"visible": True, "orden": 3, "datos": {
            "titulo": "Una colección para cada estilo.",
            "texto": "Seis estilos sobre el mismo mug blanco. Desliza y elige el tuyo.",
        }},
    },
    "banner": {
        "nombre": "Banner promocional", "tipo": "seccion", "imagen": True,
        "defecto": {"visible": False, "orden": 4, "datos": {
            "titulo": "", "texto": "", "boton": "Ver catálogo", "enlace": "#/catalogo", "imagen": None,
        }},
    },
    "personaliza": {
        "nombre": "Personaliza tu mug", "tipo": "seccion", "imagen": False,
        "defecto": {"visible": True, "orden": 5, "datos": {
            "titulo": "Tu idea, en tu mug.",
            "texto": "Una foto, una frase, el logo de tu marca. Lo diseñamos contigo y queda registrado para que lo sigas aquí.",
            "boton": "Pedir un personalizado",
        }},
    },
    "catalogo": {
        "nombre": "Del catálogo", "tipo": "seccion", "imagen": False,
        "defecto": {"visible": True, "orden": 6, "datos": {"titulo": "Del catálogo", "cantidad": 4}},
    },
    "nosotros": {
        "nombre": "Página Nosotros", "tipo": "pagina", "imagen": False,
        "defecto": {"visible": True, "orden": 0, "datos": {
            "titulo": "Hecho para ti, de principio a fin.",
            "texto": "MUGLY reúne en un solo lugar el catálogo, tus compras y tus pedidos. ¿Tienes una idea especial? La diseñamos contigo por WhatsApp.",
        }},
    },
    "tienda": {
        "nombre": "Configuración de la tienda", "tipo": "config", "imagen": False,
        "defecto": {"visible": True, "orden": 0, "datos": {
            "nombre": "MUGLY", "whatsapp": "573133612247", "umbral_inventario_bajo": 3,
        }},
    },
}

SECCIONES = [c for c, b in BLOQUES.items() if b["tipo"] == "seccion"]
EDITABLES = [c for c, b in BLOQUES.items() if b["tipo"] in ("seccion", "pagina")]


class ContenidoServicio:
    """Reglas del contenido administrable."""

    # ---------------------------------------------------------- utilidades
    @staticmethod
    def _asegurar():
        """Crea los bloques que falten con su contenido inicial."""
        existentes = {b.clave: b for b in ContenidoRepositorio.listar()}
        faltan = False
        for clave, definicion in BLOQUES.items():
            if clave not in existentes:
                bloque = ContenidoBloque(
                    clave=clave,
                    borrador=copy.deepcopy(definicion["defecto"]),
                    publicado=copy.deepcopy(definicion["defecto"]),
                )
                ContenidoRepositorio.agregar(bloque)
                existentes[clave] = bloque
                faltan = True
        if faltan:
            ContenidoRepositorio.confirmar()
        return existentes

    @staticmethod
    def _vista(bloques, version):
        """Forma pública: secciones visibles en orden, páginas y datos de la tienda."""
        secciones = sorted(
            (
                {"clave": c, "orden": getattr(bloques[c], version)["orden"], "datos": getattr(bloques[c], version)["datos"]}
                for c in SECCIONES
                if getattr(bloques[c], version)["visible"]
            ),
            key=lambda s: s["orden"],
        )
        tienda = bloques["tienda"].publicado["datos"]
        return {
            "secciones": secciones,
            "paginas": {"nosotros": getattr(bloques["nosotros"], version)["datos"]},
            "tienda": {"nombre": tienda["nombre"], "whatsapp": tienda["whatsapp"]},
        }

    def _bloque_editable(self, clave):
        bloques = self._asegurar()
        if clave not in EDITABLES:
            raise ContenidoNoEncontradoError(f"El bloque de contenido '{clave}' no existe.")
        return bloques[clave]

    @staticmethod
    def _marcar(bloque, admin_id):
        bloque.actualizado_en = datetime.utcnow()
        bloque.actualizado_por = admin_id

    # ------------------------------------------------------------ lecturas
    def publico(self):
        return self._vista(self._asegurar(), "publicado")

    def vista_previa(self):
        return self._vista(self._asegurar(), "borrador")

    def listar_admin(self):
        bloques = self._asegurar()
        lista = []
        for clave in EDITABLES:
            b = bloques[clave]
            lista.append({
                "clave": clave,
                "nombre": BLOQUES[clave]["nombre"],
                "tipo": BLOQUES[clave]["tipo"],
                "admite_imagen": BLOQUES[clave]["imagen"],
                "borrador": b.borrador,
                "publicado": b.publicado,
                "pendiente": b.borrador != b.publicado,
                "actualizado_en": b.actualizado_en.isoformat() if b.actualizado_en else None,
                "publicado_en": b.publicado_en.isoformat() if b.publicado_en else None,
            })
        return {"bloques": lista, "cambios_pendientes": sum(1 for x in lista if x["pendiente"])}

    # ----------------------------------------------------------- escrituras
    def actualizar(self, clave, cambios, admin_id):
        """Guarda cambios en el borrador (no los ven los clientes hasta publicar)."""
        bloque = self._bloque_editable(clave)
        borrador = copy.deepcopy(bloque.borrador)
        if "datos" in cambios:
            borrador["datos"].update(cambios["datos"])
        if "visible" in cambios:
            if BLOQUES[clave]["tipo"] != "seccion":
                raise ContenidoInvalidoError("Solo las secciones de Inicio se pueden ocultar.")
            borrador["visible"] = cambios["visible"]
        bloque.borrador = borrador
        self._marcar(bloque, admin_id)
        ContenidoRepositorio.confirmar()
        return self.listar_admin()

    def ordenar(self, orden, admin_id):
        if sorted(orden) != sorted(SECCIONES):
            raise ContenidoInvalidoError("El orden debe incluir cada sección de Inicio una sola vez.")
        bloques = self._asegurar()
        for posicion, clave in enumerate(orden, start=1):
            borrador = copy.deepcopy(bloques[clave].borrador)
            borrador["orden"] = posicion
            bloques[clave].borrador = borrador
            self._marcar(bloques[clave], admin_id)
        ContenidoRepositorio.confirmar()
        return self.listar_admin()

    def subir_imagen(self, clave, archivo, carpeta, admin_id):
        bloque = self._bloque_editable(clave)
        if not BLOQUES[clave]["imagen"]:
            raise ContenidoInvalidoError("Este bloque no admite imagen.")
        nombre = guardar_imagen(archivo, carpeta)
        borrador = copy.deepcopy(bloque.borrador)
        borrador["datos"]["imagen"] = f"/uploads/{nombre}"
        bloque.borrador = borrador
        self._marcar(bloque, admin_id)
        ContenidoRepositorio.confirmar()
        return self.listar_admin()

    def quitar_imagen(self, clave, admin_id):
        bloque = self._bloque_editable(clave)
        if not BLOQUES[clave]["imagen"]:
            raise ContenidoInvalidoError("Este bloque no admite imagen.")
        borrador = copy.deepcopy(bloque.borrador)
        borrador["datos"]["imagen"] = None
        bloque.borrador = borrador
        self._marcar(bloque, admin_id)
        ContenidoRepositorio.confirmar()
        return self.listar_admin()

    def publicar(self, admin_id):
        """Copia el borrador sobre lo publicado: desde ahora lo ven los clientes."""
        bloques = self._asegurar()
        ahora = datetime.utcnow()
        for clave in EDITABLES:
            b = bloques[clave]
            if b.borrador != b.publicado:
                b.publicado = copy.deepcopy(b.borrador)
                b.publicado_en = ahora
                self._marcar(b, admin_id)
        ContenidoRepositorio.confirmar()
        return self.listar_admin()

    def descartar(self, admin_id):
        """Vuelve el borrador a lo que está publicado."""
        bloques = self._asegurar()
        for clave in EDITABLES:
            b = bloques[clave]
            if b.borrador != b.publicado:
                b.borrador = copy.deepcopy(b.publicado)
                self._marcar(b, admin_id)
        ContenidoRepositorio.confirmar()
        return self.listar_admin()

    # -------------------------------------------------------- configuración
    def configuracion(self):
        return self._asegurar()["tienda"].publicado["datos"]

    def actualizar_configuracion(self, cambios, admin_id):
        """La configuración se aplica de inmediato (no tiene vista previa)."""
        bloque = self._asegurar()["tienda"]
        version = copy.deepcopy(bloque.publicado)
        version["datos"].update(cambios.get("datos", {}))
        bloque.publicado = version
        bloque.borrador = copy.deepcopy(version)
        self._marcar(bloque, admin_id)
        ContenidoRepositorio.confirmar()
        return version["datos"]

    def umbral_inventario_bajo(self):
        return int(self.configuracion().get("umbral_inventario_bajo", 3))
