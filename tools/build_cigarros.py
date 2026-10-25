#!/usr/bin/env python3
# Genera páginas estáticas (SEO) por cigarro: site/cigarros/<id>.html y site/cigarros/index.html.
# Solo usa datos de data/cigarros.json y data/artesanos.json. tools/build_artesanos.py lo llama,
# así que el comando de publicación de Cloudflare Pages no cambia (LHB-41).
# Correr después de cambiar cigarros:  python3 tools/build_artesanos.py
import json, os, html, re
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SITE = os.path.join(ROOT, 'site'); OUT = os.path.join(SITE, 'cigarros')
HOST = 'https://lahojaboricua.com'
e = lambda s: html.escape(str(s or ''), quote=True)
load = lambda n: json.load(open(os.path.join(ROOT, 'data', n), encoding='utf-8'))
PRICE = re.compile(r'\$\s?\d|precio', re.I)
FORT = {'suave': 'Suave', 'media': 'Media', 'fuerte': 'Fuerte'}

HEAD = """<!doctype html>
<html lang="es-PR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{title}</title>
<meta name="description" content="{desc}">
<link rel="canonical" href="{url}">
<meta property="og:title" content="{ogt}">
<meta property="og:image" content="{img}">
<link rel="stylesheet" href="../lugares/l.css">
{ld}</head>
<body>
<header><a class="brand" href="../">La Hoja <em>Boricua</em></a><a class="app" href="{app}">Abrir en la app</a></header>
<main>
"""
FOOT = """</main>
<footer><a href="./">Cigarros hechos por artesanos boricuas</a> · <a href="../artesanos/">Artesanos de cigarros en Puerto Rico</a> · <a href="../">La Hoja Boricua</a></footer>
</body>
</html>
"""

def ld(obj):
    return '<script type="application/ld+json">' + json.dumps(obj, ensure_ascii=False, separators=(',', ':')).replace('</', '<\\/') + '</script>\n'

def foto(cid):
    return f'img/cigarros/{cid}.webp' if os.path.exists(os.path.join(SITE, 'img', 'cigarros', cid + '.webp')) else None

def page(c, a):
    cid = c['id']; url = f'{HOST}/cigarros/{cid}'; nom = c['nombre']; art = a['nombre'] if a else ''
    pu = (c.get('pueblo') or (a or {}).get('pueblo') or '').strip()
    fort = FORT.get(c.get('fortaleza') or '', '')
    capa = (c.get('capa') or '').strip(); vit = c.get('vitolas') or []
    title = f'{nom}{" de " + art if art else ""} · Cigarro de artesano boricua | La Hoja Boricua'
    bits = [b for b in (f'capa {capa}' if capa else '', f'fortaleza {fort.lower()}' if fort else '', ('vitolas: ' + ', '.join(vit)) if vit else '') if b]
    desc = f'{nom}{", de " + art if art else ""}{" (" + pu + ")" if pu else ""}, cigarro de un artesano boricua' + (': ' + '; '.join(bits) + '.' if bits else '.')
    img = foto(cid)
    obj = {'@context': 'https://schema.org', '@type': 'Product', 'name': nom, 'url': url, 'category': 'Cigarro'}
    if art: obj['brand'] = {'@type': 'Brand', 'name': art}
    if a: obj['manufacturer'] = {'@type': 'Organization', 'name': art, 'url': f'{HOST}/artesanos/{a["id"]}'}
    # sin precios en los datos estructurados: las oraciones con un precio se quedan solo en el texto visible
    nd = ' '.join(x for x in re.split(r'(?<=\.)\s+', (c.get('notas') or '').strip()) if x and not PRICE.search(x))
    if nd: obj['description'] = nd
    if img: obj['image'] = f'{HOST}/{img}'
    props = [('Capa', capa), ('Fortaleza', fort), ('Vitolas', ', '.join(vit)), ('Pueblo', pu)]
    props = [{'@type': 'PropertyValue', 'name': k, 'value': v} for k, v in props if v]
    if props: obj['additionalProperty'] = props
    h = HEAD.format(title=e(title), desc=e(desc), url=url, ogt=e(f'{nom} · La Hoja Boricua'),
                    img=f'{HOST}/{img}' if img else f'{HOST}/og.jpg', ld=ld(obj), app=f'../#/c/{e(cid)}')
    if img: h += f'<img class="logo" src="../{e(img)}" width="160" height="160" alt="{e(nom)}">\n'
    h += f'<h1>{e(nom)}</h1>\n'
    if art: h += f'<p class="tag">De <a href="../artesanos/{e(a["id"])}.html">{e(art)}</a>{" · " + e(pu) if pu else ""}, Puerto Rico</p>\n'
    if (c.get('notas') or '').strip(): h += f'<p>{e(c["notas"].strip())}</p>\n'
    h += '<ul>'
    for k, v in (('Capa', capa), ('Fortaleza', fort), ('Vitolas', ', '.join(vit))):
        if v: h += f'<li>{k}: <span>{e(v)}</span></li>'
    h += '</ul>\n'
    src = [u for u in (c.get('fuentes') or []) if str(u).startswith('http')]
    if src: h += '<p class="links">Fuentes: ' + ' '.join(f'<a href="{e(u)}" rel="noopener">{i}</a>' for i, u in enumerate(src, 1)) + '</p>\n'
    h += f'<p class="note"><a href="../#/c/{e(cid)}">Ver {e(nom)} en la app</a>, califícalo y guárdalo en Mi Hoja.</p>\n'
    return h + FOOT

def build():
    C = load('cigarros.json'); A = {a['id']: a for a in load('artesanos.json')}
    os.makedirs(OUT, exist_ok=True)
    for f in os.listdir(OUT):
        if f.endswith('.html'): os.remove(os.path.join(OUT, f))
    for c in C:
        open(os.path.join(OUT, c['id'] + '.html'), 'w', encoding='utf-8').write(page(c, A.get(c.get('artesano_id'))))
    url = HOST + '/cigarros/'
    desc = f'{len(C)} cigarros hechos por artesanos boricuas: capa, fortaleza y vitolas de cada uno, con su artesano.'
    h = HEAD.format(title='Cigarros hechos por artesanos boricuas · Catálogo | La Hoja Boricua', desc=e(desc), url=url,
                    ogt='Cigarros hechos por artesanos boricuas', img=f'{HOST}/og.jpg', ld='', app='../#/catalogo')
    h += f'<h1>Cigarros hechos por artesanos boricuas</h1>\n<p>{len(C)} cigarros en la guía, por artesano.</p>\n'
    by = {}
    for c in C: by.setdefault(c.get('artesano_id'), []).append(c)
    for aid in sorted(by, key=lambda k: (A.get(k) or {'nombre': k})['nombre'].lower()):
        h += f'<h2>{e((A.get(aid) or {"nombre": aid})["nombre"])}</h2>\n<ul>'
        for c in sorted(by[aid], key=lambda x: x['nombre'].lower()):
            h += f'<li><a href="{e(c["id"])}.html">{e(c["nombre"])}</a></li>'
        h += '</ul>\n'
    open(os.path.join(OUT, 'index.html'), 'w', encoding='utf-8').write(h + FOOT)
    print('cigarros', len(C))
    return len(C)

if __name__ == '__main__':
    build()
