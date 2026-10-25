# Datos estructurados compartidos por los generadores de páginas (LHB-44): JSON-LD y migas de pan.
import json
HOST = 'https://lahojaboricua.com'
INICIO = ('La Hoja Boricua', HOST + '/')
LUGARES = ('Cigar lounges en Puerto Rico', HOST + '/lugares/')
ARTESANOS = ('Artesanos de cigarros en Puerto Rico', HOST + '/artesanos/')
CIGARROS = ('Cigarros hechos por artesanos boricuas', HOST + '/cigarros/')

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
        if u.startswith('http') and 'wa.me' not in u and 'whatsapp' not in u and u not in out: out.append(u)
    return out
