"""Imprime el contenido de un .docx como texto con marcas simples (solo librería estándar).

Uso: python leer_docx.py ruta/al/archivo.docx
Marcas: [Estilo] al inicio de cada párrafo; **negrita** y *cursiva* en línea;
"- " para viñetas; tablas como filas separadas por " | ".
"""
import re
import sys
import zipfile
import xml.etree.ElementTree as ET

W = "{http://schemas.openxmlformats.org/wordprocessingml/2006/main}"


def texto_run(run):
    partes = []
    for el in run:
        if el.tag == W + "t":
            partes.append(el.text or "")
        elif el.tag == W + "tab":
            partes.append("\t")
        elif el.tag in (W + "br", W + "cr"):
            partes.append("\n")
    t = "".join(partes)
    if not t.strip():
        return t
    props = run.find(W + "rPr")
    negrita = props is not None and props.find(W + "b") is not None and props.find(W + "b").get(W + "val") not in ("0", "false")
    cursiva = props is not None and props.find(W + "i") is not None and props.find(W + "i").get(W + "val") not in ("0", "false")
    if negrita and cursiva:
        return f"***{t}***"
    if negrita:
        return f"**{t}**"
    if cursiva:
        return f"*{t}*"
    return t


def texto_parrafo(p, enlaces):
    out = []
    for el in p:
        if el.tag == W + "r":
            out.append(texto_run(el))
        elif el.tag == W + "hyperlink":
            rid = el.get("{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id")
            inner = "".join(texto_run(r) for r in el.findall(W + "r"))
            url = enlaces.get(rid)
            out.append(f"[{inner}]({url})" if url else inner)
    texto = "".join(out)
    return re.sub(r"(\*\*)(\s*)\1|(?<!\*)\*\*\*\*(?!\*)", r"\2", texto)


def leer(ruta):
    """Devuelve el contenido del docx como lista de líneas (ver marcas en el docstring del módulo)."""
    lineas = []
    with zipfile.ZipFile(ruta) as z:
        doc = ET.fromstring(z.read("word/document.xml"))
        enlaces = {}
        if "word/_rels/document.xml.rels" in z.namelist():
            rels = ET.fromstring(z.read("word/_rels/document.xml.rels"))
            for r in rels:
                if r.get("Type", "").endswith("/hyperlink"):
                    enlaces[r.get("Id")] = r.get("Target")
        estilos = {}
        if "word/styles.xml" in z.namelist():
            for s in ET.fromstring(z.read("word/styles.xml")).findall(W + "style"):
                nombre = s.find(W + "name")
                if nombre is not None:
                    estilos[s.get(W + "styleId")] = nombre.get(W + "val")

    cuerpo = doc.find(W + "body")
    for el in cuerpo:
        if el.tag == W + "p":
            ppr = el.find(W + "pPr")
            estilo = ""
            lista = False
            if ppr is not None:
                ps = ppr.find(W + "pStyle")
                if ps is not None:
                    estilo = estilos.get(ps.get(W + "val"), ps.get(W + "val"))
                lista = ppr.find(W + "numPr") is not None
            t = texto_parrafo(el, enlaces).strip()
            if not t:
                continue
            prefijo = "- " if lista else ""
            etiqueta = f"[{estilo}] " if estilo and estilo != "Normal" else ""
            lineas.append(f"{etiqueta}{prefijo}{t}")
        elif el.tag == W + "tbl":
            for fila in el.iter(W + "tr"):
                celdas = []
                for c in fila.findall(W + "tc"):
                    celdas.append(" ".join(texto_parrafo(p, enlaces).strip() for p in c.iter(W + "p")).strip())
                lineas.append("[Tabla] " + " | ".join(celdas))
    return lineas


if __name__ == "__main__":
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    sys.stdout.reconfigure(encoding="utf-8")
    print("\n".join(leer(sys.argv[1])))
