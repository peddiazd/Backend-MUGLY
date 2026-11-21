"""
Primitivas de dibujo SVG para los diagramas de MUGLY.

Sin dependencias externas: cada diagrama es un archivo .svg que el navegador
muestra sin internet y que el informe incrusta tal cual.
"""
from html import escape

FUENTE = "Inter, 'Segoe UI', Roboto, Arial, sans-serif"
MONO = "'JetBrains Mono', Consolas, 'Courier New', monospace"

# Paleta de la marca (frontend/css/estilos.css)
C = {
    "primario": "#344B36",
    "primario2": "#4A6550",
    "acento": "#7A5C08",
    "texto": "#292929",
    "calido": "#E6ECDD",
    "calido2": "#F3F6EF",
    "gris": "#6E736A",
    "gris_claro": "#EEF1EA",
    "linea": "#4F5B52",
    "blanco": "#FFFFFF",
    "suave": "#E6ECDD",
    "verde": "#2F6B3C",
    "rojo": "#A23B3B",
}


def esc(t):
    return escape(str(t), quote=True)


def ancho_texto(t, tam):
    """Ancho aproximado de un texto en píxeles."""
    return len(t) * tam * 0.56


def envolver(texto, ancho, tam):
    """Parte un texto en líneas que caben en 'ancho' píxeles."""
    lineas = []
    for parrafo in str(texto).split("\n"):
        actual = ""
        for palabra in parrafo.split(" "):
            prueba = (actual + " " + palabra).strip()
            if ancho_texto(prueba, tam) <= ancho or not actual:
                actual = prueba
            else:
                lineas.append(actual)
                actual = palabra
        lineas.append(actual)
    return lineas


class Diagrama:
    def __init__(self, nombre, ancho, alto, titulo):
        self.nombre = nombre
        self.ancho = ancho
        self.alto = alto
        self.titulo = titulo
        self.capas = {"fondo": [], "lineas": [], "cajas": [], "sobre": [], "textos": []}

    # ------------------------------------------------------------ utilidades
    def _add(self, capa, s):
        self.capas[capa].append(s)

    def texto(self, x, y, t, tam=12, color=None, peso=400, ancla="middle",
              cursiva=False, fuente=None, capa="textos"):
        estilo = ' font-style="italic"' if cursiva else ""
        self._add(capa,
                  f'<text x="{x:.1f}" y="{y:.1f}" font-family="{fuente or FUENTE}" '
                  f'font-size="{tam}" font-weight="{peso}" fill="{color or C["texto"]}" '
                  f'text-anchor="{ancla}"{estilo}>{esc(t)}</text>')

    def lineas_texto(self, x, y, lineas, tam=12, color=None, peso=400,
                     ancla="middle", cursiva=False, interlineado=1.32, fuente=None):
        for i, l in enumerate(lineas):
            self.texto(x, y + i * tam * interlineado, l, tam, color, peso,
                       ancla, cursiva, fuente)
        return len(lineas) * tam * interlineado

    def rect(self, x, y, w, h, relleno, borde=None, radio=10, grosor=1.4,
             discontinuo=False, capa="cajas", opacidad=1):
        d = ' stroke-dasharray="7 5"' if discontinuo else ""
        b = f' stroke="{borde}" stroke-width="{grosor}"' if borde else ""
        o = f' fill-opacity="{opacidad}"' if opacidad != 1 else ""
        self._add(capa, f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{radio}" '
                        f'fill="{relleno}"{o}{b}{d}/>')

    # ------------------------------------------------------------ elementos C4
    def caja(self, x, y, w, h, titulo, tipo=None, desc=None, relleno=None,
             borde=None, color=None, discontinuo=False, tam_titulo=15, tam_desc=12,
             radio=10, tam_tipo=11):
        relleno = relleno or C["primario"]
        color = color or C["blanco"]
        self.rect(x, y, w, h, relleno, borde or relleno, radio, 1.6, discontinuo)
        bloques = [(envolver(titulo, w - 24, tam_titulo), tam_titulo, 700, False)]
        if tipo:
            bloques.append((envolver(tipo, w - 24, tam_tipo), tam_tipo, 400, True))
        if desc:
            bloques.append((envolver(desc, w - 28, tam_desc), tam_desc, 400, False))
        alto = sum(len(l) * t * 1.32 for l, t, _, _ in bloques) + 6 * (len(bloques) - 1)
        cy = y + (h - alto) / 2 + bloques[0][1] * 0.95
        for lineas, tam, peso, cur in bloques:
            usado = self.lineas_texto(x + w / 2, cy, lineas, tam, color, peso, cursiva=cur)
            cy += usado + 6

    def persona(self, cx, y, w, h, titulo, desc=None, relleno=None):
        relleno = relleno or "#2A3D2C"
        self._add("cajas", f'<circle cx="{cx}" cy="{y + 24}" r="22" fill="{relleno}"/>')
        self.caja(cx - w / 2, y + 40, w, h, titulo, "[Persona]", desc, relleno,
                  radio=18)

    def cilindro(self, x, y, w, h, titulo, tipo=None, desc=None, relleno=None,
                 color=None):
        relleno = relleno or C["primario2"]
        color = color or C["blanco"]
        ry = 12
        self._add("cajas",
                  f'<path d="M{x},{y + ry} a{w / 2},{ry} 0 0,0 {w},0 v{h - 2 * ry} '
                  f'a{w / 2},{ry} 0 0,1 {-w},0 z" fill="{relleno}" stroke="{relleno}"/>')
        self._add("cajas",
                  f'<ellipse cx="{x + w / 2}" cy="{y + ry}" rx="{w / 2}" ry="{ry}" '
                  f'fill="{relleno}" stroke="{C["blanco"]}" stroke-opacity=".55" stroke-width="1.4"/>')
        bloques = [(envolver(titulo, w - 20, 14), 14, 700, False)]
        if tipo:
            bloques.append((envolver(tipo, w - 20, 11), 11, 400, True))
        if desc:
            bloques.append((envolver(desc, w - 24, 11.5), 11.5, 400, False))
        alto = sum(len(l) * t * 1.32 for l, t, _, _ in bloques) + 5 * (len(bloques) - 1)
        cy = y + ry + (h - ry - alto) / 2 + 13
        for lineas, tam, peso, cur in bloques:
            cy += self.lineas_texto(x + w / 2, cy, lineas, tam, color, peso, cursiva=cur) + 5

    def frontera(self, x, y, w, h, etiqueta, color=None):
        color = color or C["gris"]
        self.rect(x, y, w, h, "none", color, 14, 1.4, True, capa="fondo")
        self.texto(x + 16, y + h - 14, etiqueta, 12.5, color, 700, "start", capa="fondo")

    # ------------------------------------------------------------ conectores
    def _marcadores(self):
        n = self.nombre
        return (
            f'<marker id="{n}-flecha" viewBox="0 0 10 10" refX="9" refY="5" '
            f'markerWidth="9" markerHeight="9" orient="auto-start-reverse">'
            f'<path d="M0,0 L10,5 L0,10 z" fill="{C["linea"]}"/></marker>'
            f'<marker id="{n}-abierta" viewBox="0 0 10 10" refX="9" refY="5" '
            f'markerWidth="10" markerHeight="10" orient="auto-start-reverse">'
            f'<path d="M0,0 L10,5 L0,10" fill="none" stroke="{C["linea"]}" stroke-width="1.3"/></marker>'
            f'<marker id="{n}-rombo" viewBox="0 0 16 10" refX="1" refY="5" '
            f'markerWidth="16" markerHeight="10" orient="auto-start-reverse">'
            f'<path d="M1,5 L8,1 L15,5 L8,9 z" fill="{C["linea"]}"/></marker>'
        )

    def flecha(self, puntos, etiqueta=None, lx=None, ly=None, discontinuo=False,
               color=None, punta="flecha", inicio=None, tam=11, grosor=1.4,
               color_texto=None, capa="lineas"):
        color = color or C["linea"]
        d = " ".join(f"{'M' if i == 0 else 'L'}{x},{y}" for i, (x, y) in enumerate(puntos))
        guion = ' stroke-dasharray="6 4"' if discontinuo else ""
        fin = f' marker-end="url(#{self.nombre}-{punta})"' if punta else ""
        ini = f' marker-start="url(#{self.nombre}-{inicio})"' if inicio else ""
        self._add(capa, f'<path d="{d}" fill="none" stroke="{color}" '
                            f'stroke-width="{grosor}"{guion}{fin}{ini}/>')
        if etiqueta:
            if lx is None:
                i = (len(puntos) - 1) // 2
                (x1, y1), (x2, y2) = puntos[i], puntos[i + 1]
                lx, ly = (x1 + x2) / 2, (y1 + y2) / 2
            self.etiqueta(lx, ly, etiqueta, tam, color_texto)

    def etiqueta(self, x, y, texto, tam=11, color=None, fondo=None):
        lineas = texto.split("\n")
        alto = len(lineas) * tam * 1.3
        ancho = max(ancho_texto(l, tam) for l in lineas) + 10
        self._add("textos", f'<rect x="{x - ancho / 2:.1f}" y="{y - alto / 2 - 2:.1f}" '
                            f'width="{ancho:.1f}" height="{alto + 4:.1f}" rx="4" '
                            f'fill="{fondo or C["blanco"]}" fill-opacity=".94"/>')
        self.lineas_texto(x, y - alto / 2 + tam * 0.98, lineas, tam,
                          color or C["texto"], 400, interlineado=1.3)

    # ------------------------------------------------------------ UML
    def clase(self, x, y, w, nombre, atributos, metodos=None, estereotipo=None,
              relleno=None, tam=11.5):
        """Clase UML con compartimentos. Devuelve el alto."""
        relleno = relleno or C["blanco"]
        cab = 44 if estereotipo else 32
        fila = tam * 1.62
        h_attr = (len(atributos) * fila + 10) if (atributos or not metodos) else 0
        h_met = (len(metodos) * fila + 10) if metodos else 0
        h = cab + h_attr + h_met
        self.rect(x, y, w, h, relleno, C["primario"], 6, 1.4)
        self._add("cajas", f'<path d="M{x},{y + 6} a6,6 0 0,1 6,-6 h{w - 12} a6,6 0 0,1 6,6 '
                           f'v{cab - 6} h{-w} z" fill="{C["primario"]}"/>')
        if estereotipo:
            self.texto(x + w / 2, y + 16, f"«{estereotipo}»", 10.5, C["calido"], 400, cursiva=True)
            self.texto(x + w / 2, y + 34, nombre, 13.5, C["blanco"], 700)
        else:
            self.texto(x + w / 2, y + 21, nombre, 13.5, C["blanco"], 700)
        cy = y + cab + fila - 2
        for a in atributos:
            self.texto(x + 10, cy, a, tam, C["texto"], 400, "start", fuente=MONO)
            cy += fila
        if metodos:
            sep = y + cab + h_attr
            if h_attr:
                self._add("lineas", f'<line x1="{x}" y1="{sep}" x2="{x + w}" y2="{sep}" '
                                    f'stroke="{C["primario"]}" stroke-width="1"/>')
            cy = sep + fila - 2
            for m in metodos:
                self.texto(x + 10, cy, m, tam, C["texto"], 400, "start", fuente=MONO)
                cy += fila
        return h

    def actor(self, cx, y, etiqueta, color=None):
        c = color or C["texto"]
        s = f'stroke="{c}" stroke-width="2" fill="none" stroke-linecap="round"'
        self._add("cajas", f'<circle cx="{cx}" cy="{y + 14}" r="13" {s}/>'
                           f'<line x1="{cx}" y1="{y + 27}" x2="{cx}" y2="{y + 68}" {s}/>'
                           f'<line x1="{cx - 24}" y1="{y + 40}" x2="{cx + 24}" y2="{y + 40}" {s}/>'
                           f'<line x1="{cx}" y1="{y + 68}" x2="{cx - 20}" y2="{y + 98}" {s}/>'
                           f'<line x1="{cx}" y1="{y + 68}" x2="{cx + 20}" y2="{y + 98}" {s}/>')
        self.lineas_texto(cx, y + 118, etiqueta.split("\n"), 13, c, 700)

    def caso_uso(self, cx, cy, rx, ry, texto, relleno=None, borde=None):
        self._add("cajas", f'<ellipse cx="{cx}" cy="{cy}" rx="{rx}" ry="{ry}" '
                           f'fill="{relleno or C["suave"]}" stroke="{borde or C["primario"]}" stroke-width="1.4"/>')
        lineas = envolver(texto, rx * 1.65, 11.5)
        alto = len(lineas) * 11.5 * 1.25
        self.lineas_texto(cx, cy - alto / 2 + 10.5, lineas, 11.5, C["texto"], 600, interlineado=1.25)

    def nota(self, x, y, w, texto, tam=11, relleno=None):
        lineas = envolver(texto, w - 22, tam)
        h = len(lineas) * tam * 1.35 + 16
        relleno = relleno or "#FDF6DE"
        self._add("cajas", f'<path d="M{x},{y} h{w - 14} l14,14 v{h - 14} h{-w} z" '
                           f'fill="{relleno}" stroke="{C["acento"]}" stroke-width="1.2"/>'
                           f'<path d="M{x + w - 14},{y} v14 h14" fill="none" stroke="{C["acento"]}" stroke-width="1.2"/>')
        self.lineas_texto(x + 11, y + 8 + tam, lineas, tam, C["texto"], 400, "start", interlineado=1.35)
        return h

    def nodo(self, x, y, w, h, titulo, estereotipo=None, relleno=None, prof=12):
        """Nodo UML de despliegue (caja 3D)."""
        relleno = relleno or C["calido2"]
        borde = C["primario"]
        self._add("cajas",
                  f'<path d="M{x},{y + prof} l{prof},{-prof} h{w} v{h} l{-prof},{prof}" '
                  f'fill="{C["calido"]}" stroke="{borde}" stroke-width="1.4"/>'
                  f'<line x1="{x + w}" y1="{y + prof}" x2="{x + w + prof}" y2="{y}" stroke="{borde}" stroke-width="1.4"/>')
        self.rect(x, y + prof, w, h, relleno, borde, 0, 1.4)
        ty = y + prof + 20
        if estereotipo:
            self.texto(x + 12, ty, f"«{estereotipo}»", 10.5, C["gris"], 400, "start", cursiva=True)
            ty += 17
        self.texto(x + 12, ty, titulo, 13.5, C["primario"], 700, "start")

    def artefacto(self, x, y, w, h, titulo, desc=None):
        self.rect(x, y, w, h, C["blanco"], C["primario2"], 6, 1.3)
        self._add("cajas", f'<path d="M{x + w - 22},{y + 8} h8 l6,6 v12 h-14 z" fill="none" '
                           f'stroke="{C["primario2"]}" stroke-width="1"/>')
        self.texto(x + 10, y + 18, "«artefacto»", 10, C["gris"], 400, "start", cursiva=True)
        lineas = envolver(titulo, w - 40, 12.5)
        cy = y + 35
        cy += self.lineas_texto(x + 10, cy, lineas, 12.5, C["texto"], 700, "start")
        if desc:
            self.lineas_texto(x + 10, cy + 2, envolver(desc, w - 20, 11), 11, C["gris"], 400, "start")

    # ------------------------------------------------------------ salida
    def svg(self):
        cuerpo = "".join(self.capas["fondo"] + self.capas["lineas"] +
                         self.capas["cajas"] + self.capas["sobre"] + self.capas["textos"])
        return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {self.ancho} {self.alto}" '
                f'role="img" aria-label="{esc(self.titulo)}" font-family="{FUENTE}">'
                f'<title>{esc(self.titulo)}</title>'
                f'<defs>{self._marcadores()}</defs>'
                f'<rect width="{self.ancho}" height="{self.alto}" fill="{C["blanco"]}"/>'
                f'{cuerpo}</svg>\n')
