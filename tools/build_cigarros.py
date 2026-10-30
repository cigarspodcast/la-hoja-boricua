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
import sys; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from schema import ld, crumbs, same_as, INICIO, LUGARES, ARTESANOS, CIGARROS  # LHB-44
from schema import alt_links, en_head, fx, CIGARROS_EN  # LHB-32
OUT_EN = os.path.join(SITE, 'en', 'cigarros')
PRICE = re.compile(r'\$\s?\d|precio', re.I)
PRICE_EN = re.compile(r'\$\s?\d|precio|price', re.I)
FORT = {'suave': 'Suave', 'media': 'Media', 'fuerte': 'Fuerte'}
FORT_EN = {'suave': 'Mild', 'media': 'Medium', 'fuerte': 'Full'}  # como fort.* en site/i18n.js

HEAD = """<!doctype html>
<html lang="es-PR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{title}</title>
<meta name="description" content="{desc}">
<link rel="canonical" href="{url}">
{alt}<meta property="og:title" content="{ogt}">
<meta property="og:image" content="{img}">
<link rel="stylesheet" href="../lugares/l.css">
{ld}</head>
<body>
<header><a class="brand" href="../"><img src="../icons/icon.svg" alt="" width="30" height="30"><span class="brand-text"><span class="brand-name">La Hoja <em>Boricua</em></span><span class="brand-sub" lang="es">Hecho en Borinquen</span></span></a><a class="app" href="{app}">Abrir en la app</a></header>
<main>
"""
FOOT = """</main>
<footer><a href="./">Cigarros hechos por artesanos boricuas</a> · <a href="../artesanos/">Artesanos de cigarros en Puerto Rico</a> · <a href="../">La Hoja Boricua</a></footer>
</body>
</html>
"""
HEAD_EN = en_head(HEAD)
FOOT_EN = """</main>
<footer><a href="./">Cigars made by Puerto Rican artisans</a> · <a href="../artesanos/">Cigar artisans in Puerto Rico</a> · <a href="../../">La Hoja Boricua</a></footer>
</body>
</html>
"""

def foto(cid):
    return f'img/cigarros/{cid}.webp' if os.path.exists(os.path.join(SITE, 'img', 'cigarros', cid + '.webp')) else None

def page(c, a, en=False):
    cid = c['id']; url = f'{HOST}/{"en/" if en else ""}cigarros/{cid}'; nom = c['nombre']; art = a['nombre'] if a else ''
    pu = (c.get('pueblo') or (a or {}).get('pueblo') or '').strip()
    fort = (FORT_EN if en else FORT).get(c.get('fortaleza') or '', '')
    capa = ((fx(c, 'capa') if en else c.get('capa')) or '').strip(); vit = c.get('vitolas') or []
    notas = ((fx(c, 'notas') if en else c.get('notas')) or '').strip()
    if en:
        title = f'{nom}{" by " + art if art else ""} · Cigar by a Puerto Rican artisan | La Hoja Boricua'
        bits = [b for b in (f'wrapper {capa}' if capa else '', f'strength {fort.lower()}' if fort else '', ('vitolas: ' + ', '.join(vit)) if vit else '') if b]
        desc = f'{nom}{", by " + art if art else ""}{" (" + pu + ")" if pu else ""}, a cigar by a Puerto Rican artisan' + (': ' + '; '.join(bits) + '.' if bits else '.')
        K = ('Wrapper', 'Strength', 'Vitolas', 'Town')
    else:
        title = f'{nom}{" de " + art if art else ""} · Cigarro de artesano boricua | La Hoja Boricua'
        bits = [b for b in (f'capa {capa}' if capa else '', f'fortaleza {fort.lower()}' if fort else '', ('vitolas: ' + ', '.join(vit)) if vit else '') if b]
        desc = f'{nom}{", de " + art if art else ""}{" (" + pu + ")" if pu else ""}, cigarro de un artesano boricua' + (': ' + '; '.join(bits) + '.' if bits else '.')
        K = ('Capa', 'Fortaleza', 'Vitolas', 'Pueblo')
    img = foto(cid); up = '../../' if en else '../'
    obj = {'@context': 'https://schema.org', '@type': 'Product', 'name': nom, 'url': url, 'category': 'Cigar' if en else 'Cigarro'}
    if art: obj['brand'] = {'@type': 'Brand', 'name': art}
    if a: obj['manufacturer'] = {'@type': 'Organization', 'name': art, 'url': f'{HOST}/{"en/" if en else ""}artesanos/{a["id"]}'}
    # sin precios en los datos estructurados: las oraciones con un precio se quedan solo en el texto visible
    nd = ' '.join(x for x in re.split(r'(?<=\.)\s+', notas) if x and not (PRICE_EN if en else PRICE).search(x))
    if nd: obj['description'] = nd
    if img: obj['image'] = f'{HOST}/{img}'
    props = [(K[0], capa), (K[1], fort), (K[2], ', '.join(vit)), (K[3], pu)]
    props = [{'@type': 'PropertyValue', 'name': k, 'value': v} for k, v in props if v]
    if props: obj['additionalProperty'] = props
    h = (HEAD_EN if en else HEAD).format(title=e(title), desc=e(desc), url=url, alt=alt_links(f'cigarros/{cid}'), ogt=e(f'{nom} · La Hoja Boricua'),
                    img=f'{HOST}/{img}' if img else f'{HOST}/og.jpg', ld=ld(obj, crumbs(INICIO, CIGARROS_EN if en else CIGARROS, (nom, url))), app=f'{up}#/c/{e(cid)}')
    if img: h += f'<img class="logo" src="{up}{e(img)}" width="160" height="160" alt="{e(nom)}">\n'
    h += f'<h1>{e(nom)}</h1>\n'
    if art: h += f'<p class="tag">{"By" if en else "De"} <a href="../artesanos/{e(a["id"])}.html">{e(art)}</a>{" · " + e(pu) if pu else ""}, Puerto Rico</p>\n'
    if notas: h += f'<p>{e(notas)}</p>\n'
    h += '<ul>'
    for k, v in ((K[0], capa), (K[1], fort), (K[2], ', '.join(vit))):
        if v: h += f'<li>{k}: <span>{e(v)}</span></li>'
    h += '</ul>\n'
    src = [u for u in (c.get('fuentes') or []) if str(u).startswith('http')]
    if src: h += f'<p class="links">{"Sources" if en else "Fuentes"}: ' + ' '.join(f'<a href="{e(u)}" rel="noopener">{i}</a>' for i, u in enumerate(src, 1)) + '</p>\n'
    if en: h += f'<p class="note"><a href="{up}#/c/{e(cid)}">See {e(nom)} in the app</a>, rate it and save it to Mi Hoja.</p>\n'
    else: h += f'<p class="note"><a href="../#/c/{e(cid)}">Ver {e(nom)} en la app</a>, califícalo y guárdalo en Mi Hoja.</p>\n'
    return h + (FOOT_EN if en else FOOT)

def index(C, A, en=False):
    url = HOST + ('/en' if en else '') + '/cigarros/'
    if en:
        desc = f'{len(C)} cigars made by Puerto Rican artisans: wrapper, strength and vitolas for each one, with its artisan.'
        T = ('Cigars made by Puerto Rican artisans', 'Cigars made by Puerto Rican artisans · Catalog | La Hoja Boricua', f'{len(C)} cigars in the guide, by artisan.')
    else:
        desc = f'{len(C)} cigarros hechos por artesanos boricuas: capa, fortaleza y vitolas de cada uno, con su artesano.'
        T = ('Cigarros hechos por artesanos boricuas', 'Cigarros hechos por artesanos boricuas · Catálogo | La Hoja Boricua', f'{len(C)} cigarros en la guía, por artesano.')
    h = (HEAD_EN if en else HEAD).format(title=T[1], desc=e(desc), url=url, alt=alt_links('cigarros/'),
                    ogt=T[0], img=f'{HOST}/og.jpg', ld=ld(crumbs(INICIO, CIGARROS_EN if en else CIGARROS)), app=('../../' if en else '../') + '#/catalogo')
    h += f'<h1>{T[0]}</h1>\n<p>{T[2]}</p>\n'
    by = {}
    for c in C: by.setdefault(c.get('artesano_id'), []).append(c)
    for aid in sorted(by, key=lambda k: (A.get(k) or {'nombre': k})['nombre'].lower()):
        h += f'<h2>{e((A.get(aid) or {"nombre": aid})["nombre"])}</h2>\n<ul>'
        for c in sorted(by[aid], key=lambda x: x['nombre'].lower()):
            h += f'<li><a href="{e(c["id"])}.html">{e(c["nombre"])}</a></li>'
        h += '</ul>\n'
    return h + (FOOT_EN if en else FOOT)

def build():
    C = load('cigarros.json'); A = {a['id']: a for a in load('artesanos.json')}
    for out, en in ((OUT, False), (OUT_EN, True)):  # LHB-32: cada página en español y su gemela en inglés
        os.makedirs(out, exist_ok=True)
        for f in os.listdir(out):
            if f.endswith('.html'): os.remove(os.path.join(out, f))
        for c in C:
            open(os.path.join(out, c['id'] + '.html'), 'w', encoding='utf-8').write(page(c, A.get(c.get('artesano_id')), en))
        open(os.path.join(out, 'index.html'), 'w', encoding='utf-8').write(index(C, A, en))
    print('cigarros', len(C))
    return len(C)

if __name__ == '__main__':
    build()
