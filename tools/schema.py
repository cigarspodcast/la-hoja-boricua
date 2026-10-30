# Datos estructurados compartidos por los generadores de páginas (LHB-44): JSON-LD y migas de pan.
import json
from urllib.parse import urlparse
HOST = 'https://lahojaboricua.com'
INICIO = ('La Hoja Boricua', HOST + '/')
LUGARES = ('Cigar lounges en Puerto Rico', HOST + '/lugares/')
ARTESANOS = ('Artesanos de cigarros en Puerto Rico', HOST + '/artesanos/')
CIGARROS = ('Cigarros hechos por artesanos boricuas', HOST + '/cigarros/')
GUIAS = ('Guías de cigarros en Puerto Rico', HOST + '/guias/')  # LHB-45: solo en español
# LHB-32: las páginas en inglés viven en /en/<sección>/, gemelas de las páginas en español
EN = HOST + '/en'
LUGARES_EN = ('Cigar lounges in Puerto Rico', EN + '/lugares/')
ARTESANOS_EN = ('Cigar artisans in Puerto Rico', EN + '/artesanos/')
CIGARROS_EN = ('Cigars made by Puerto Rican artisans', EN + '/cigarros/')

def alternates(tail):
    # tail: 'lugares/<id>' o 'lugares/'; el español es el x-default
    es, en = f'{HOST}/{tail}', f'{EN}/{tail}'
    return (('es', es), ('en', en), ('x-default', es))

def alt_links(tail):
    return ''.join(f'<link rel="alternate" hreflang="{l}" href="{u}">\n' for l, u in alternates(tail))

def en_head(head):
    # la cabecera de una página en /en/<sección>/: en inglés y un nivel más abajo
    out = head.replace('<html lang="es-PR">', '<html lang="en">').replace('href="l.css"', 'href="../lugares/l.css"')
    out = out.replace('href="../', 'href="../../').replace('src="../icons/', 'src="../../icons/').replace('>Abrir en la app<', '>Open in the app<')
    assert out.count('href="../../') >= 2 and 'lang="en"' in out, 'en_head: la cabecera no tiene la forma esperada'
    return out

def fx(r, k):
    # el inglés del registro si hay uno, si no el español (como fx() en site/app.js, LHB-30)
    v = r.get(k + '_en')
    return v if isinstance(v, str) and v.strip() else r.get(k)

def ld(*objs):
    # un <script> por objeto; el principal va primero
    return ''.join('<script type="application/ld+json">' + json.dumps(o, ensure_ascii=False, separators=(',', ':')).replace('</', '<\\/') + '</script>\n' for o in objs)

def crumbs(*pairs):
    # pairs: (nombre, url) desde el inicio hasta la página actual
    return {'@context': 'https://schema.org', '@type': 'BreadcrumbList',
            'itemListElement': [{'@type': 'ListItem', 'position': i + 1, 'name': n, 'item': u} for i, (n, u) in enumerate(pairs)]}

def same_as(rec, keys=('web', 'instagram', 'facebook', 'youtube')):
    # perfiles del mismo negocio o artesano, en el orden de keys, sin repetir
    out = []
    for k in keys:
        u = (rec.get(k) or '').strip()
        if u.startswith('http') and not contacto(u) and u not in out: out.append(u)
    return out

def contacto(u):
    # WhatsApp es un enlace de contacto, no un perfil: nunca va en sameAs (sin importar mayúsculas)
    host = urlparse(u).hostname or ''
    return host == 'wa.me' or host.endswith('.wa.me') or 'whatsapp' in host or 'whatsapp' in u.lower()
