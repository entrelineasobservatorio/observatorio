from flask_frozen import Freezer
from app import app, pages, CATEGORIAS, tendencias

app.config['FREEZER_DESTINATION'] = 'docs'
app.config['FREEZER_BASE_URL'] = 'https://luciadiazs.github.io/entre_lineas/'
app.config['APPLICATION_ROOT'] = '/entre_lineas'

freezer = Freezer(app)


@freezer.register_generator
def post():
    for page in pages:
        yield {'slug': page.path}


@freezer.register_generator
def analisis():
    for cat in CATEGORIAS:
        yield {'categoria': cat}
    yield {}


if __name__ == '__main__':
    freezer.freeze()
    print("Sitio generado en /docs — listo para GitHub Pages.")
