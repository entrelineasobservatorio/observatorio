---
name: nuevo-analisis
description: Convierte un resumen en .docx (carpeta resumenes/) en la ficha de análisis de un proyecto de ley (content/posts/pl-N-AAAA.md) para la web EntreLíneas. Úsala cuando pidan agregar, actualizar o regenerar un análisis/ficha de PL a partir de un docx.
---

# Nuevo análisis de PL

Entrada: `resumenes/PL_<N>-<AAAA>-<AAAA>-CD.docx` + su fila en `resumenes/enlaces.csv` (columnas `pl,drive,congreso`; la columna `pl` es el nombre del docx sin extensión).
Salida: `content/posts/pl-<N>-<AAAA>.md` (ej. `PL_39-2026-2031-CD` → `pl-39-2026.md`). El slug es el número del PL, nunca el tema: la URL no debe cambiar si se reformula el título.

Ignora los `~$*.docx` (temporales de Word).

## Pasos

1. Lee la fila del CSV. Si falta el PL en el CSV, pide los links; no inventes ninguno.
2. `python .claude/skills/nuevo-analisis/leer_docx.py resumenes/<archivo>.docx` para ver el contenido.
3. Escribe el `.md` con el formato de abajo. Modelo de referencia: `content/posts/pl-39-2026.md`.
4. `python .claude/skills/nuevo-analisis/verificar.py resumenes/<archivo>.docx content/posts/pl-N-AAAA.md`. Debe decir OK; revisa cualquier FALTA/SOBRA.
5. `python freeze.py` y revisa la página en local (`python app.py` → `/analisis/post/pl-N-AAAA/`).
6. Informa al usuario las decisiones de criterio (ver "Qué reportar"). No hagas commit ni push salvo que lo pida.

## Fidelidad al texto

La primera línea del docx (el "tema": "Ley Porky", "Salida de la CADH"…) **no se publica**: la web no muestra subtítulo porque resultaba redundante con el título.

Copia el resto del texto del docx **tal cual**. Solo se permiten cambios mecánicos: comillas rectas `"` → tipográficas “ ”, espacios dobles/no separables → uno, quitar el punto final de los encabezados `##`. No corrijas ni reescribas nada más: si ves un error (gramática, cifras, un dato dudoso), déjalo y repórtalo.

## Formato del .md

Cabecera YAML (termina en la primera línea en blanco: **no dejes líneas en blanco dentro de ella**), luego el cuerpo en Markdown.

```
title: "La reforma que permitiría salirse de la Corte IDH"   # título del docx tras "PL N-...:", con mayúscula inicial
plantilla: "resumen"
numero: "PL 39"
expediente: "Proyecto de Ley 39-2026-2031-CD"
date: "2026-08-14"                  # fecha de PRESENTACIÓN del PL, ISO, entre comillas (ordena la tabla)
categoria: "Democracia"             # ver mapa de ejes
eje: "institucionalidad"            # nombre del ícono en static/img/ejes/blanco/
eje_nombre: "Institucionalidad democrática"
autor: "Equipo EntreLíneas"
descripcion: >-                     # 1-2 frases para la tabla y para compartir; basada en la entrada
  ...
entrada: >-                         # primer párrafo del docx, completo
  ...
frase: >-                           # párrafo "En una frase", completo
  ...
ficha:
  - {etiqueta: "Proyecto", valor: "PL 39-2026-2031-CD"}
  - {etiqueta: "Presentado", valor: "14 de agosto de 2026"}
  - {etiqueta: "Autor", valor: "..."}
  - {etiqueta: "Bancada", valor: "..."}
etapas: ["Presentado", "En comisión", "Dictamen", "Debate en el Pleno", "Aprobado o archivado"]
etapa_actual: 1                     # 1 = Presentado, 2 = En comisión ... 5 = Aprobado o archivado
                                    # Si el PL salió del flujo normal (ej. retirado por su autor), usa una lista propia:
                                    # etapas: ["Presentado", "Retirado por su autor"] con etapa_actual: 2
pdf_url: "<drive del CSV, tal cual>"   # el sitio lo convierte a descarga directa
congreso_url: "<congreso del CSV>"
```

Cuerpo (todo lo que hay entre la entrada y "En una frase"):

- `## Título de sección` para cada encabezado del docx (sin punto final).
- Argumentos: `### Primera frase del argumento` y, en la línea inmediata siguiente (sin línea en blanco), el resto del párrafo. El estilo de la web une el `###` con el párrafo que le sigue (barra rosa), así que **el párrafo debe ir justo después del `###`**, sin nada en medio. En los docx no hay negritas: el título del argumento es la primera frase/idea del párrafo (ej. "Es inconstitucional."). Si hay duda de dónde corta, decide con criterio y repórtalo.
- Párrafos normales tal cual; listas con `- `; citas con `>` (segunda línea de la cita = atribución).
- Bancadas/partidos enumerados: opcionalmente como fichas con
  ```
  <div class="res-bancadas" markdown="1">
  - Perú Libre
  - ...
  </div>
  ```

## Ejes

| Tema | `eje` | `eje_nombre` | `categoria` |
|---|---|---|---|
| Instituciones, reformas constitucionales, protesta, libertades | `institucionalidad` | Institucionalidad democrática | Democracia |
| Policía, penal, detenciones, seguridad | `seguridad_ciudadana` | Seguridad ciudadana | Seguridad ciudadana |
| Género | `genero` | Género | Género |
| Ambiente | `medio_ambiente` | Medio ambiente | Medio ambiente |

## Ficha

Autor, bancada y fecha de presentación salen del primer párrafo del docx. Si algún dato no está, **pregunta**; no lo inventes. Si el autor es uno más varios, usa "Nombre y otros N diputados/congresistas".

## Qué reportar al terminar

- Eje elegido cuando no era obvio.
- `etapa_actual: 1` es un valor por defecto: el docx no dice en qué etapa está el PL. Pídele al usuario que lo confirme.
- Errores o dudas detectados en el texto (no corregidos).
- Dónde cortaste los títulos de argumento si no estaba claro.

## Si el .md ya existe

Regenera el contenido pero conserva `etapa_actual` y cualquier campo que el usuario haya editado a mano (compara antes de sobrescribir y avisa de las diferencias).
