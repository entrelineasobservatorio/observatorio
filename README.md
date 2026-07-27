# Entrelineas — Observatorio de Proyectos de Ley

Sitio web del observatorio legislativo Entrelineas, construido con Flask y Flask-FlatPages.
Publicado como sitio estático en **GitHub Pages** via Frozen-Flask.

🔗 **URL pública:** https://luciadiazs.github.io/entre_lineas/

---

## Correr localmente

```bash
# 1. Crear entorno virtual
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # Linux/Mac

# 2. Instalar dependencias
pip install -r requirements.txt

# 3. Servidor de desarrollo
python app.py
# Abre http://localhost:5000
```

---

## Publicar en GitHub Pages

### Primera vez (configuración)
1. Sube el repo a GitHub:
   ```bash
   git init
   git add .
   git commit -m "primer commit"
   git remote add origin https://github.com/luciadiazs/entre_lineas.git
   git push -u origin main
   ```
2. En GitHub → **Settings → Pages → Source**: selecciona `main` branch, carpeta `/docs`.
3. Guarda. En ~30 segundos aparece la URL pública.

### Cada vez que actualizas el sitio
```bash
python freeze.py          # genera /docs con HTML estático
git add docs/
git commit -m "actualizar sitio"
git push
# GitHub Pages se actualiza en ~30 segundos
```

---

## Agregar un análisis nuevo

Crea un archivo `.md` en `content/posts/` con este encabezado:

```markdown
title: "Título del análisis"
date: "2025-06-01"
categoria: "DDHH"
autor: "Nombre Apellido"
descripcion: "Resumen breve visible en la grilla."

Contenido en Markdown...
```

Categorías disponibles: `Género`, `Democracia`, `Medio ambiente`, `Pueblos indígenas`, `Seguridad ciudadana`, `DDHH`.

Luego corre `python freeze.py` y haz push.

---

## Estructura

```
entrelineas/
├── app.py                  # Rutas Flask
├── freeze.py               # Genera el sitio estático en /docs
├── content/posts/          # Análisis en Markdown
├── docs/                   # HTML generado (GitHub Pages lo sirve desde aquí)
├── static/
│   ├── css/style.css
│   ├── js/main.js
│   └── img/logo.png
└── templates/
```
