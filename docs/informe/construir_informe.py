"""
Construye docs/Informe_Proyecto_Final_MUGLY.html a partir de plantilla.html.

Marcadores que reemplaza:
  {{svg:nombre}}                         → docs/diagramas/nombre.svg incrustado
  {{codigo:lenguaje:ruta:inicio=>fin}}   → fragmento real del código fuente,
                                           desde la línea que contiene 'inicio'
                                           hasta la que contiene 'fin' (incluida)
  {{img:archivo}}                        → docs/informe/capturas/archivo como
                                           data URI (el informe sigue siendo un
                                           solo archivo)

Uso (desde la raíz del repositorio):
    python docs/diagramas/generar_diagramas.py
    python docs/informe/construir_informe.py
"""
import base64
import html
import os
import re

RAIZ = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
PLANTILLA = os.path.join(os.path.dirname(__file__), "plantilla.html")
SALIDA = os.path.join(RAIZ, "docs", "Informe_Proyecto_Final_MUGLY.html")
DIAGRAMAS = os.path.join(RAIZ, "docs", "diagramas")

PALABRAS = {
    "python": r"\b(def|class|return|if|elif|else|for|in|not|and|or|try|except|raise|"
              r"import|from|as|with|None|True|False|is|self|lambda|pass)\b",
    "js": r"\b(export|import|from|const|let|var|function|async|await|return|if|else|"
          r"for|of|new|throw|try|catch|class|extends|null|undefined|true|false|typeof|"
          r"switch|case|break)\b",
}


def resaltar(codigo, lenguaje):
    """Resaltado sencillo: comentarios, cadenas, decoradores, palabras clave y números."""
    patrones = [
        ("com", r"#[^\n]*" if lenguaje == "python" else r"//[^\n]*|/\*[\s\S]*?\*/"),
        ("str", r'"""[\s\S]*?"""|f?"(?:\\.|[^"\\\n])*"|f?\'(?:\\.|[^\'\\\n])*\'|`(?:\\.|[^`\\])*`'),
        ("dec", r"@[A-Za-z_][\w.]*"),
        ("kw", PALABRAS[lenguaje]),
        ("num", r"\b\d+(?:\.\d+)?\b"),
    ]
    regex = re.compile("|".join(f"(?P<{n}>{p})" for n, p in patrones))
    salida, pos = [], 0
    for m in regex.finditer(codigo):
        salida.append(html.escape(codigo[pos:m.start()]))
        salida.append(f'<span class="tk-{m.lastgroup}">{html.escape(m.group())}</span>')
        pos = m.end()
    salida.append(html.escape(codigo[pos:]))
    return "".join(salida)


def fragmento(lenguaje, ruta, inicio, fin):
    with open(os.path.join(RAIZ, ruta), encoding="utf-8") as f:
        lineas = f.read().splitlines()
    a = next(i for i, l in enumerate(lineas) if inicio in l)
    b = next(i for i in range(a, len(lineas)) if fin in lineas[i])
    bloque = lineas[a:b + 1]
    sangria = min(len(l) - len(l.lstrip()) for l in bloque if l.strip())
    codigo = "\n".join(l[sangria:] for l in bloque)
    return (f'<figure class="codigo"><figcaption><span>{html.escape(ruta)}</span>'
            f'<span>líneas {a + 1}–{b + 1}</span></figcaption>'
            f'<pre><code class="lang-{lenguaje}">{resaltar(codigo, lenguaje)}</code></pre></figure>')


def svg(nombre):
    with open(os.path.join(DIAGRAMAS, f"{nombre}.svg"), encoding="utf-8") as f:
        return f.read().strip()


def imagen(archivo):
    ruta = os.path.join(os.path.dirname(__file__), "capturas", archivo)
    tipo = "image/png" if archivo.endswith(".png") else "image/jpeg"
    with open(ruta, "rb") as f:
        return f"data:{tipo};base64,{base64.b64encode(f.read()).decode('ascii')}"


def construir():
    with open(PLANTILLA, encoding="utf-8") as f:
        texto = f.read()
    texto = re.sub(r"\{\{svg:([\w]+)\}\}", lambda m: svg(m.group(1)), texto)
    texto = re.sub(r"\{\{img:([\w.-]+)\}\}", lambda m: imagen(m.group(1)), texto)
    texto = re.sub(r"\{\{codigo:(\w+):([^:]+):(.+?)=>(.+?)\}\}",
                   lambda m: fragmento(*m.groups()), texto)
    faltan = re.findall(r"\{\{[^}]+\}\}", texto)
    if faltan:
        raise SystemExit(f"Marcadores sin resolver: {faltan}")
    with open(SALIDA, "w", encoding="utf-8", newline="\n") as f:
        f.write(texto)
    print(f"Informe generado: {os.path.relpath(SALIDA, RAIZ)} ({len(texto) // 1024} KB)")


if __name__ == "__main__":
    construir()
