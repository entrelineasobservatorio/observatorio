import os
import re
from flask import Flask, render_template, abort
from flask_flatpages import FlatPages

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

app = Flask(__name__)
app.config.update(
    FLATPAGES_ROOT=os.path.join(BASE_DIR, "content", "posts"),
    FLATPAGES_EXTENSION=".md",
    FLATPAGES_MARKDOWN_EXTENSIONS=["meta", "fenced_code", "tables", "md_in_html"],
    FREEZER_DESTINATION=os.path.join(BASE_DIR, "docs"),
    FREEZER_BASE_URL="https://entrelineasobservatorio.github.io/observatorio/",
    APPLICATION_ROOT="/observatorio",
)

pages = FlatPages(app)

AREAS = [
    {
        "nombre": "Coordinación General",
        "miembros": [
            {"name": "Nicolle Soberón", "foto": "nicolle-soberon.jpg", "rol": "Cofundadora y Coordinadora General"},
            {"name": "Connie Pérez",    "foto": "connie-perez.jpg",    "rol": "Cofundadora y Coordinadora Subgeneral"},
        ],
    },
    {
        "nombre": "Análisis",
        "miembros": [
            {"name": "Daniela Pulido",    "foto": "daniela-pulido.jpg",    "rol": "Coordinadora General"},
            {"name": "Lucía Díaz",        "foto": "lucia-diaz.jpg",        "rol": "Subcoordinadora General"},
            {"name": "Samantha Calderón", "foto": "samantha-calderon.jpg", "rol": ""},
            {"name": "Cielo Briceño",     "foto": "cielo-briceno.jpg",     "rol": ""},
            {"name": "Ariana Alcedo",     "foto": "ariana-alcedo.jpg",     "rol": ""},
            {"name": "Yois Alejos",     "foto": "yois-alejos.jpeg",     "rol": ""},
            {"name": "Mauricio Capacyachi",     "foto": "mauricio-capacyachi.jpg",     "rol": ""},
            {"name": "Sophia Tufinio",     "foto": "sophia-tufinio.jpg",     "rol": ""},
            {"name": "Lilian Cánepa",     "foto": "lilian-canepa.jpeg",     "rol": ""},
        ],
    },
    {
        "nombre": "Seguimiento",
        "miembros": [
            {"name": "Katherin Peña", "foto": "katherin-pena.jpg", "rol": "Coordinadora General"},
            {"name": "Pierina Loayza", "foto": "pierina-loayza.jpg", "rol": ""},
            {"name": "Yasmina Yarleque", "foto": "yasmina-yarleque.jpg", "rol": ""},
            {"name": "Claudia Giron", "foto": "claudia-giron.png", "rol": ""},
            {"name": "María Fernanda Flores", "foto": "maria-fernanda-flores.png", "rol": ""},
            {"name": "Anielka Huamán", "foto": "anielka-huaman.jpg", "rol": ""},
        ],
    },
    {
        "nombre": "Medios",
        "miembros": [
            {"name": "Mayra Cárdenas", "foto": "mayra-cardenas.jpg", "rol": "Coordinadora General"},
            {"name": "Claudia Tejada", "foto": "claudia-tejada.jpg", "rol": "Coordinadora de Traducción"},
            {"name": "Jackeline Arce", "foto": "jackeline-arce.jpg", "rol": ""},
            {"name": "Matias Brito", "foto": "matias-brito.jpeg", "rol": ""},
            {"name": "Carlos Espinoza", "foto": "carlos-espinoza.jpg", "rol": ""},
        ],
    },
    {
        "nombre": "Desarrollo y Tecnología",
        "miembros": [
            {"name": "Lucía Díaz", "foto": "lucia-diaz.jpg", "rol": "Coordinadora General"},
            {"name": "Nicolás Gutiérrez", "foto": "nicolas-gutierrez.jpeg", "rol": "Subcoordinador General"},
        ],
    },
    {
        "nombre": "Relaciones Interinstitucionales y Economía",
        "miembros": [
            {"name": "Camila Marzal", "foto": "camila-marzal.jpg", "rol": "Coordinadora General"},
            {"name": "Aaron Vega",    "foto": "aaron-vega.jpg",    "rol": "Subcoordinador General"},
            {"name": "Salvador Esquivel", "foto": "salvador-esquivel.png", "rol": ""},
        ],
    },
]

TEAM = [m for area in AREAS for m in area["miembros"]]

CATEGORIAS = ["Todos", "Género", "Democracia", "Medio ambiente",
               "Pueblos indígenas", "Seguridad ciudadana"]


@app.template_filter("drive_descarga")
def drive_descarga(url):
    m = re.search(r"drive\.google\.com/file/d/([\w-]+)", url or "")
    if m:
        return f"https://drive.google.com/uc?export=download&id={m.group(1)}"
    return url


def _orden_post(p):
    num = re.search(r"\d+", str(p.meta.get("numero", "")))
    return (str(p.meta.get("date", "")), int(num.group()) if num else 0)


def get_posts(categoria=None):
    posts = [p for p in pages if not p.meta.get("borrador")]
    if categoria and categoria != "Todos":
        posts = [p for p in posts if p.meta.get("categoria") == categoria]
    posts.sort(key=_orden_post, reverse=True)
    return posts


@app.route("/")
def index():
    latest = get_posts()[:3]
    return render_template("index.html", posts=latest)


@app.route("/analisis/")
@app.route("/analisis/<categoria>/")
def analisis(categoria="Todos"):
    if categoria not in CATEGORIAS:
        abort(404)
    posts = get_posts(categoria)
    return render_template("analisis.html", posts=posts,
                           categorias=CATEGORIAS, categoria_actual=categoria)


@app.route("/analisis/post/<path:slug>/")
def post(slug):
    page = pages.get(slug)
    if page is None:
        abort(404)
    plantilla = "post_resumen.html" if page.meta.get("plantilla") == "resumen" else "post.html"
    return render_template(plantilla, post=page)


@app.route("/metodologia/")
def metodologia():
    return render_template("metodologia.html")


@app.route("/equipo/")
def equipo():
    return render_template("equipo.html", areas=AREAS)


@app.route("/nosotros/")
def nosotros():
    return render_template("nosotros.html")


@app.route("/tendencias/")
def tendencias():
    all_posts = get_posts()
    ejes = [c for c in CATEGORIAS if c != "Todos"]
    conteo = {eje: len([p for p in all_posts if p.meta.get("categoria") == eje]) for eje in ejes}
    return render_template("tendencias.html", ejes=ejes, conteo=conteo, total=len(all_posts))


if __name__ == "__main__":
    app.run(debug=True)
