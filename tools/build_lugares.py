#!/usr/bin/env python3
# Genera páginas estáticas (SEO) para cada lugar: site/lugares/<id>.html, site/lugares/index.html,
# site/sitemap.xml y site/robots.txt. Solo usa datos de data/places.json.
# Correr después de cambiar places.json:  python3 tools/build_lugares.py
import json, os, re, html, datetime
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SITE = os.path.join(ROOT, 'site'); OUT = os.path.join(SITE, 'lugares')
HOST = 'https://lahojaboricua.com'
P = json.load(open(os.path.join(ROOT, 'data', 'places.json'), encoding='utf-8'))
e = lambda s: html.escape(str(s or ''), quote=True)
import sys; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from schema import ld, crumbs, same_as, INICIO, LUGARES, ARTESANOS, CIGARROS  # LHB-44
from schema import alt_links, en_head, fx, LUGARES_EN  # LHB-32
OUT_EN = os.path.join(SITE, 'en', 'lugares')
SJ = {'Viejo San Juan', 'Santurce', 'Miramar', 'Condado', 'San Juan'}

def municipio(p):
    pu = p['pueblo']; m = re.match(r'(.+?)\s*\((.+)\)', pu)
    if m:
        a, b = m.group(1).strip(), m.group(2).strip()
        return 'San Juan' if b == 'San Juan' else a
    return 'San Juan' if pu in SJ else pu

def pueblo_txt(p):
    m = re.match(r'(.+?)\s*\((.+)\)', p['pueblo'])
    return f'{m.group(1).strip()}, {m.group(2).strip()}' if m else p['pueblo']

def etiqueta(p, en=False):
    t = p['tipo'].lower()
    if p['categoria'] == 'lounge':
        if 'lounge' in t or 'cigar bar' in t: return 'Cigar lounge'
        return 'Where to smoke cigars' if en else 'Dónde fumar cigarros'
    return 'Cigar shop' if en else 'Tienda de cigarros'

def schema_type(p):
    t = p['tipo'].lower()
    if p['categoria'] == 'venta': return 'Store'
    if 'restaurante' in t: return 'Restaurant'
    return 'BarOrPub'

HEAD = """<!doctype html>
<html lang="es-PR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{title}</title>
<meta name="description" content="{desc}">
<link rel="canonical" href="{url}">
{alt}<meta property="og:image" content="HOSTX/og.jpg">
<link rel="stylesheet" href="l.css">
{ld}</head>
<body>
<header><a class="brand" href="../">La Hoja <em>Boricua</em></a><a class="app" href="../#/lugares">Abrir en la app</a></header>
<main>
""".replace('HOSTX', HOST)
FOOT = """</main>
<footer><a href="./">Cigar lounges en Puerto Rico</a> · <a href="../">La Hoja Boricua</a></footer>
</body>
</html>
"""
HEAD_EN = en_head(HEAD)
FOOT_EN = """</main>
<footer><a href="./">Cigar lounges in Puerto Rico</a> · <a href="../../">La Hoja Boricua</a></footer>
</body>
</html>
"""

def page(p, vecinos, en=False):
    pid = p['id']; url = f'{HOST}/{"en/" if en else ""}lugares/{pid}'; nom = p['nombre']; pt = pueblo_txt(p); et = etiqueta(p, en)
    tipo = fx(p, 'tipo') if en else p['tipo']; dirc = (p.get('direccion') or '').strip()
    if en:
        title = f'{nom} · {et} in {pt}, Puerto Rico | La Hoja Boricua'
        desc = f'{nom}: {tipo.lower()} in {pt}, Puerto Rico.' + (f' Address: {dirc.rstrip(".")}.' if dirc else '') + ' Map and links on La Hoja Boricua.'
    else:
        title = f'{nom} · {et} en {pt}, Puerto Rico | La Hoja Boricua'
        desc = f'{nom}: {tipo.lower()} en {pt}, Puerto Rico.' + (f' Dirección: {dirc.rstrip(".")}.' if dirc else '') + ' Mapa y enlaces en La Hoja Boricua.'
    sameas = same_as(p)
    addr = {'@type': 'PostalAddress', 'addressLocality': municipio(p), 'addressRegion': 'PR'}
    if dirc:
        addr['streetAddress'] = dirc
        z = re.search(r'\b(00\d{3})\b', dirc)
        if z: addr['postalCode'] = z.group(1)
    obj = {'@context': 'https://schema.org', '@type': schema_type(p), 'name': nom, 'url': url, 'address': addr}
    if p.get('lat') is not None and not p.get('lat_lng_aprox'):
        obj['geo'] = {'@type': 'GeoCoordinates', 'latitude': p['lat'], 'longitude': p['lng']}
    if sameas: obj['sameAs'] = sameas
    hd = HEAD_EN if en else HEAD
    h = hd.format(title=e(title), desc=e(desc), url=url, alt=alt_links(f'lugares/{pid}'), ogt=e(f'{nom} · {pt}'),
                  ld=ld(obj, crumbs(INICIO, LUGARES_EN if en else LUGARES, (nom, url))))
    h += f'<h1>{e(nom)}</h1>\n<p class="tag">{e(et)} · {e(pt)}, Puerto Rico</p>\n'
    if en:
        verbo = 'enjoy a cigar' if p['categoria'] == 'lounge' else 'buy cigars'
        blurb = f'{nom} is a place in {pt}, Puerto Rico, where you can {verbo}.'
        L = ('Type', 'Address', 'Hours', 'Directions (Google Maps)', 'Website', 'Confirm hours and rules with the place before you go.', 'More places in')
    else:
        verbo = 'disfrutar un cigarro' if p['categoria'] == 'lounge' else 'comprar cigarros'
        blurb = f'{nom} es un lugar en {pt}, Puerto Rico, donde puedes {verbo}.'
        L = ('Tipo', 'Dirección', 'Horario', 'Cómo llegar (Google Maps)', 'Sitio web', 'Confirma horario y reglas con el lugar antes de ir.', 'Más lugares en')
    h += f'<p>{e(blurb)}</p>\n<dl>\n<dt>{L[0]}</dt><dd>{e(tipo)}</dd>\n'
    if dirc: h += f'<dt>{L[1]}</dt><dd>{e(dirc)}</dd>\n'
    if p.get('horario'): h += f'<dt>{L[2]}</dt><dd>{e(fx(p, "horario") if en else p["horario"])}</dd>\n'
    h += '</dl>\n<p class="links">'
    links = []
    if p.get('maps'): links.append(f'<a href="{e(p["maps"])}">{L[3]}</a>')
    if p.get('web'): links.append(f'<a href="{e(p["web"])}">{L[4]}</a>')
    if p.get('instagram'): links.append(f'<a href="{e(p["instagram"])}">Instagram</a>')
    h += ' '.join(links) + f'</p>\n<p class="note">{L[5]}</p>\n'
    if vecinos:
        h += f'<h2>{L[6]} {e(municipio(p))}</h2>\n<ul>' + ''.join(f'<li><a href="{v["id"]}.html">{e(v["nombre"])}</a></li>' for v in vecinos) + '</ul>\n'
    return h + (FOOT_EN if en else FOOT)

def grupos(lst):
    g = {}
    for p in lst: g.setdefault(municipio(p), []).append(p)
    s = ''
    for m in sorted(g, key=lambda x: (x != 'San Juan', x)):
        s += f'<h3>{e(m)}</h3>\n<ul>'
        for p in sorted(g[m], key=lambda x: x['nombre'].lower()):
            sub = pueblo_txt(p)
            s += f'<li><a href="{p["id"]}.html">{e(p["nombre"])}</a>' + (f' <span>{e(sub)}</span>' if sub != m else '') + '</li>'
        s += '</ul>\n'
    return s

def index(L, V, en=False):
    url = HOST + ('/en' if en else '') + '/lugares/'
    if en:
        desc = f'Guide to {len(L)} cigar lounges and places to smoke cigars in Puerto Rico: San Juan, Condado, Old San Juan, Ponce, Caguas and more. Address, map and links for each one.'
        T = ('Cigar lounges in Puerto Rico', 'Cigar lounges in Puerto Rico · Where to smoke cigars | La Hoja Boricua',
             f'{len(L)} lounges, bars and places to smoke cigars in Puerto Rico, by town. Further down, {len(V)} shops where you can buy cigars.',
             'Lounges and places to smoke', 'Cigar shops', 'Cigar artisans in Puerto Rico')
    else:
        desc = f'Guía de {len(L)} cigar lounges y lugares para fumar cigarros en Puerto Rico: San Juan, Condado, Viejo San Juan, Ponce, Caguas y más. Dirección, mapa y enlaces de cada uno.'
        T = ('Cigar lounges en Puerto Rico', 'Cigar lounges en Puerto Rico · Dónde fumar cigarros | La Hoja Boricua',
             f'{len(L)} lounges, bares y lugares donde fumar cigarros en Puerto Rico, por pueblo. Más abajo, {len(V)} tiendas donde comprar cigarros.',
             'Lounges y lugares para fumar', 'Tiendas de cigarros', 'Artesanos de cigarros en Puerto Rico')
    items = {'@context': 'https://schema.org', '@type': 'ItemList', 'name': T[0],
             'itemListElement': [{'@type': 'ListItem', 'position': i + 1, 'url': f'{url}{p["id"]}', 'name': p['nombre']} for i, p in enumerate(L)]}
    h = (HEAD_EN if en else HEAD).format(title=T[1], desc=e(desc), url=url, alt=alt_links('lugares/'),
                    ogt=T[0], ld=ld(items, crumbs(INICIO, LUGARES_EN if en else LUGARES)))
    h += f'<h1>{T[0]}</h1>\n<p>{T[2]}</p>\n'
    h += f'<h2>{T[3]}</h2>\n' + grupos(L) + f'<h2>{T[4]}</h2>\n' + grupos(V)
    h += f'<p><a href="../artesanos/">{T[5]}</a></p>\n'
    return h + (FOOT_EN if en else FOOT)

def build():
    by_mun = {}
    for p in P: by_mun.setdefault(municipio(p), []).append(p)
    L = [p for p in P if p['categoria'] == 'lounge']; V = [p for p in P if p['categoria'] != 'lounge']
    for out, en in ((OUT, False), (OUT_EN, True)):  # LHB-32: cada página en español y su gemela en inglés
        os.makedirs(out, exist_ok=True)
        for f in os.listdir(out):
            if f.endswith('.html'): os.remove(os.path.join(out, f))
        for p in P:
            vec = [v for v in by_mun[municipio(p)] if v['id'] != p['id']][:3]
            open(os.path.join(out, p['id'] + '.html'), 'w', encoding='utf-8').write(page(p, vec, en))
        open(os.path.join(out, 'index.html'), 'w', encoding='utf-8').write(index(L, V, en))
    import sys; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    from build_artesanos import write_sitemap
    write_sitemap()
    open(os.path.join(SITE, 'robots.txt'), 'w').write(f'User-agent: *\nAllow: /\n\nSitemap: {HOST}/sitemap.xml\n')
    import build_llms; build_llms.build()  # LHB-42: site/llms.txt con las mismas páginas del sitemap
    print('páginas', len(P), 'lounges', len(L), 'venta', len(V))

if __name__ == '__main__':
    build()
