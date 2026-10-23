#!/usr/bin/env python3
# Genera páginas estáticas (SEO) para cada lugar: site/lugares/<id>.html, site/lugares/index.html,
# site/sitemap.xml y site/robots.txt. Solo usa datos de data/places.json.
# Correr después de cambiar places.json:  python3 tools/build_lugares.py
import json, os, re, html, datetime
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SITE = os.path.join(ROOT, 'site'); OUT = os.path.join(SITE, 'lugares')
HOST = 'https://lahojaboricua.sites.tab.bot'
P = json.load(open(os.path.join(ROOT, 'data', 'places.json'), encoding='utf-8'))
e = lambda s: html.escape(str(s or ''), quote=True)
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

def etiqueta(p):
    t = p['tipo'].lower()
    if p['categoria'] == 'lounge':
        if 'lounge' in t or 'cigar bar' in t: return 'Cigar lounge'
        return 'Dónde fumar cigarros'
    return 'Tienda de cigarros'

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
<meta property="og:image" content="HOSTX/og.jpg">
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

def ld(obj):
    return '<script type="application/ld+json">' + json.dumps(obj, ensure_ascii=False, separators=(',', ':')).replace('</', '<\\/') + '</script>\n'

def page(p, vecinos):
    pid = p['id']; url = f'{HOST}/lugares/{pid}.html'; nom = p['nombre']; pt = pueblo_txt(p); et = etiqueta(p)
    title = f'{nom} · {et} en {pt}, Puerto Rico | La Hoja Boricua'
    tipo = p['tipo']; dirc = (p.get('direccion') or '').strip()
    desc = f'{nom}: {tipo.lower()} en {pt}, Puerto Rico.' + (f' Dirección: {dirc.rstrip(".")}.' if dirc else '') + ' Mapa y enlaces en La Hoja Boricua.'
    sameas = [u for u in (p.get('web'), p.get('instagram')) if u]
    addr = {'@type': 'PostalAddress', 'addressLocality': municipio(p), 'addressRegion': 'PR'}
    if dirc:
        addr['streetAddress'] = dirc
        z = re.search(r'\b(00\d{3})\b', dirc)
        if z: addr['postalCode'] = z.group(1)
    obj = {'@context': 'https://schema.org', '@type': schema_type(p), 'name': nom, 'url': url, 'address': addr}
    if p.get('lat') is not None and not p.get('lat_lng_aprox'):
        obj['geo'] = {'@type': 'GeoCoordinates', 'latitude': p['lat'], 'longitude': p['lng']}
    if sameas: obj['sameAs'] = sameas
    h = HEAD.format(title=e(title), desc=e(desc), url=url, ogt=e(f'{nom} · {pt}'), ld=ld(obj))
    h += f'<h1>{e(nom)}</h1>\n<p class="tag">{e(et)} · {e(pt)}, Puerto Rico</p>\n'
    verbo = 'disfrutar un cigarro' if p['categoria'] == 'lounge' else 'comprar cigarros'
    blurb = f'{nom} es un lugar en {pt}, Puerto Rico, donde puedes {verbo}.'
    h += f'<p>{e(blurb)}</p>\n<dl>\n<dt>Tipo</dt><dd>{e(tipo)}</dd>\n'
    if dirc: h += f'<dt>Dirección</dt><dd>{e(dirc)}</dd>\n'
    if p.get('horario'): h += f'<dt>Horario</dt><dd>{e(p["horario"])}</dd>\n'
    h += '</dl>\n<p class="links">'
    links = []
    if p.get('maps'): links.append(f'<a href="{e(p["maps"])}">Cómo llegar (Google Maps)</a>')
    if p.get('web'): links.append(f'<a href="{e(p["web"])}">Sitio web</a>')
    if p.get('instagram'): links.append(f'<a href="{e(p["instagram"])}">Instagram</a>')
    h += ' '.join(links) + '</p>\n<p class="note">Confirma horario y reglas con el lugar antes de ir.</p>\n'
    if vecinos:
        h += f'<h2>Más lugares en {e(municipio(p))}</h2>\n<ul>' + ''.join(f'<li><a href="{v["id"]}.html">{e(v["nombre"])}</a></li>' for v in vecinos) + '</ul>\n'
    return h + FOOT

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

def build():
    os.makedirs(OUT, exist_ok=True)
    for f in os.listdir(OUT):
        if f.endswith('.html'): os.remove(os.path.join(OUT, f))
    by_mun = {}
    for p in P: by_mun.setdefault(municipio(p), []).append(p)
    for p in P:
        vec = [v for v in by_mun[municipio(p)] if v['id'] != p['id']][:3]
        open(os.path.join(OUT, p['id'] + '.html'), 'w', encoding='utf-8').write(page(p, vec))
    url = HOST + '/lugares/'
    L = [p for p in P if p['categoria'] == 'lounge']; V = [p for p in P if p['categoria'] != 'lounge']
    desc = f'Guía de {len(L)} cigar lounges y lugares para fumar cigarros en Puerto Rico: San Juan, Condado, Viejo San Juan, Ponce, Caguas y más. Dirección, mapa y enlaces de cada uno.'
    items = {'@context': 'https://schema.org', '@type': 'ItemList', 'name': 'Cigar lounges en Puerto Rico',
             'itemListElement': [{'@type': 'ListItem', 'position': i + 1, 'url': f'{HOST}/lugares/{p["id"]}.html', 'name': p['nombre']} for i, p in enumerate(L)]}
    h = HEAD.format(title='Cigar lounges en Puerto Rico · Dónde fumar cigarros | La Hoja Boricua', desc=e(desc), url=url,
                    ogt='Cigar lounges en Puerto Rico', ld=ld(items))
    h += f'<h1>Cigar lounges en Puerto Rico</h1>\n<p>{len(L)} lounges, bares y lugares donde fumar cigarros en Puerto Rico, por pueblo. Más abajo, {len(V)} tiendas donde comprar cigarros.</p>\n'
    h += '<h2>Lounges y lugares para fumar</h2>\n' + grupos(L) + '<h2>Tiendas de cigarros</h2>\n' + grupos(V)
    open(os.path.join(OUT, 'index.html'), 'w', encoding='utf-8').write(h + FOOT)
    d = datetime.date.today().isoformat()
    urls = [HOST + '/', url] + [f'{HOST}/lugares/{p["id"]}.html' for p in P]
    sm = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + ''.join(f'<url><loc>{u}</loc></url>\n' for u in urls) + '</urlset>\n'
    open(os.path.join(SITE, 'sitemap.xml'), 'w').write(sm)
    open(os.path.join(SITE, 'robots.txt'), 'w').write(f'User-agent: *\nAllow: /\n\nSitemap: {HOST}/sitemap.xml\n')
    print('páginas', len(P), 'lounges', len(L), 'venta', len(V))

if __name__ == '__main__':
    build()
