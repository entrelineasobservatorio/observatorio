"""Compara palabra por palabra el texto de un .docx con el .md generado a partir de él.

Uso: python verificar.py resumenes/PL_39-2026-2031-CD.docx content/posts/pl-39-2026.md

Ignora mayúsculas, puntuación, comillas y guiones. Se saltan las dos primeras líneas del docx
(tema y título), que el .md reparte en otros campos: revísalas a mano. Informa:
  FALTA  -> texto del docx que no está (o cambió) en el .md
  SOBRA  -> texto del .md que no viene del docx
Termina con código 1 si hay diferencias.
"""
import difflib
import os
import re
import sys
import unicodedata

import yaml

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from leer_docx import leer  # noqa: E402


def palabras(texto):
    texto = unicodedata.normalize("NFKC", texto).lower()
    return re.findall(r"\w+", texto)


def texto_md(ruta):
    crudo = open(ruta, encoding="utf-8").read().replace("\r\n", "\n")
    cabecera, _, cuerpo = crudo.partition("\n\n")
    meta = yaml.safe_load(cabecera) or {}
    cuerpo = re.sub(r"<[^>]+>", " ", cuerpo)
    cuerpo = re.sub(r"\]\(https?://[^)]*\)", "]", cuerpo)
    return " ".join([str(meta.get("entrada", "")), cuerpo, str(meta.get("frase", ""))])


def main(docx, md):
    lineas_docx = [l for l in leer(docx)[2:] if palabras(l) != ["en", "una", "frase"]]  # rótulo que pone la plantilla
    a = palabras(" ".join(lineas_docx))
    b = palabras(texto_md(md))
    sm = difflib.SequenceMatcher(None, a, b, autojunk=False)
    hay = False
    for op, i1, i2, j1, j2 in sm.get_opcodes():
        if op == "equal":
            continue
        hay = True
        antes = " ".join(a[max(0, i1 - 4):i1])
        if i2 > i1:
            print(f"FALTA/CAMBIÓ  ...{antes} [[ {' '.join(a[i1:i2])} ]]")
        if j2 > j1:
            print(f"SOBRA/NUEVO   ...{antes} [[ {' '.join(b[j1:j2])} ]]")
    print("OK: el .md contiene todo el texto del docx." if not hay else "\nHay diferencias: revísalas.")
    return 1 if hay else 0


if __name__ == "__main__":
    if len(sys.argv) != 3:
        sys.exit(__doc__)
    sys.stdout.reconfigure(encoding="utf-8")
    sys.exit(main(sys.argv[1], sys.argv[2]))
