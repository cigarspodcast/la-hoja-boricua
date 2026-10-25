#!/usr/bin/env python3
# Genera páginas estáticas (SEO) por artesano: site/artesanos/<id>.html y site/artesanos/index.html,
# y regenera site/sitemap.xml (lugares + artesanos). Solo usa datos de data/artesanos.json y data/cigarros.json.
# Correr después de cambiar artesanos/cigarros:  python3 tools/build_artesanos.py
# (tools/build_lugares.py también llama write_sitemap() al final.)
import json, os, html
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SITE = os.path.join(ROOT, 'site'); OUT = os.path.join(SITE, 'artesanos')
HOST = 'https://lahojaboricua.com'
e = lambda s: html.escape(str(s or ''), quote=True)
load = lambda n: json.load(open(os.path.join(ROOT, 'data', n), encoding='utf-8'))

HEAD = """<!doctype html>
<html lang="es-PR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{title}</title>
<meta name="description" content="{desc}">
<link rel="canonical" href="{url}">
<meta property="og:title" content="{ogt}">
<meta property="og:image" content="HOSTX/og.jpg">
<link rel="stylesheet" href="../lugares/l.css">
{ld}</head>
<body>
<header><a class="brand" href="../">La Hoja <em>Boricua</em></a><a class="app" href="{app}">Abrir en la app</a></header>
<main>
""".replace('HOSTX', HOST)
FOOT = """</main>
<footer><a href="./">Artesanos de cigarros en Puerto Rico</a> · <a href="../lugares/">Cigar lounges en Puerto Rico</a> · <a href="../">La Hoja Boricua</a></footer>
</body>
</html>
"""
FORT = {'suave': 'Suave', 'media': 'Media', 'fuerte': 'Fuerte'}

def ld(obj):
    return '<script type="application/ld+json">' + json.dumps(obj, ensure_ascii=False, separators=(',', ':')).replace('</', '<\\/') + '</script>\n'

def links_of(a):
    out = []
    for k, lab in (('web', 'Sitio web'), ('instagram', 'Instagram'), ('facebook', 'Facebook'), ('youtube', 'YouTube')):
        u = (a.get(k) or '').strip()
        if u.startswith('http') and 'wa.me' not in u and 'whatsapp' not in u: out.append((lab, u))
    return out

def hecho_pr(a):
    # Solo si el JSON lo dice Y trae fuente.
    f = (a.get('hecho_en_pr_fuente') or '').strip()
    if a.get('hecho_en_pr') is True and f:
        if f.startswith('http'): return f'<p class="note">Torcidos en Puerto Rico, según <a href="{e(f)}">esta fuente</a>.</p>\n'
        return '<p class="note">Torcidos en Puerto Rico, según Cigars Podcast.</p>\n'
    return ''

def page(a, cig):
    aid = a['id']; url = f'{HOST}/artesanos/{aid}'; nom = a['nombre']; pu = (a.get('pueblo') or '').strip(); tipo = (a.get('tipo') or '').strip()
    donde = f' en {pu}' if pu else ''
    title = f'{nom} · Cigarros artesanales{donde}, Puerto Rico | La Hoja Boricua'
    desc = f'{nom}: {tipo.lower() or "artesano de cigarros"}{donde}, Puerto Rico.'
    if cig: desc += f' {len(cig)} cigarro{"s" if len(cig) != 1 else ""} en la guía: ' + ', '.join(c['nombre'] for c in cig[:3]) + ('…' if len(cig) > 3 else '.')
    else: desc += ' Enlaces y más en La Hoja Boricua.'
    ln = links_of(a)
    obj = {'@context': 'https://schema.org', '@type': 'Organization', 'name': nom, 'url': url}
    if pu: obj['address'] = {'@type': 'PostalAddress', 'addressLocality': pu, 'addressRegion': 'PR'}
    if ln: obj['sameAs'] = [u for _, u in ln]
    logo = os.path.exists(os.path.join(SITE, 'img', 'logos', aid + '.webp'))
    if logo: obj['logo'] = f'{HOST}/img/logos/{aid}.webp'
    h = HEAD.format(title=e(title), desc=e(desc), url=url, ogt=e(f'{nom} · La Hoja Boricua'), ld=ld(obj), app=f'../#/a/{e(aid)}')
    if logo: h += f'<img class="logo" src="../img/logos/{e(aid)}.webp" width="72" height="72" alt="Logo de {e(nom)}">\n'
    h += f'<h1>{e(nom)}</h1>\n<p class="tag">{e(tipo or "Artesano de cigarros")}{" · " + e(pu) if pu else ""}, Puerto Rico</p>\n'
    blurb = f'{nom} aparece en La Hoja Boricua, la guía de cigarros de artesanos boricuas'
    blurb += f', con {len(cig)} cigarro{"s" if len(cig) != 1 else ""} en el catálogo.' if cig else '.'
    h += f'<p>{e(blurb)}</p>\n' + hecho_pr(a)
    if cig:
        h += '<h2>Sus cigarros</h2>\n<ul>'
        for c in cig:
            bits = []
            if c.get('vitolas'): bits.append('Vitolas: ' + ', '.join(c['vitolas']))
            if c.get('fortaleza'): bits.append('Fortaleza: ' + FORT.get(c['fortaleza'], c['fortaleza']))
            h += f'<li><a href="../#/c/{e(c["id"])}">{e(c["nombre"])}</a>' + (f' <span>{e(" · ".join(bits))}</span>' if bits else '') + '</li>'
        h += '</ul>\n'
    if ln: h += '<p class="links">' + ' '.join(f'<a href="{e(u)}" rel="noopener">{lab}</a>' for lab, u in ln) + '</p>\n'
    return h + FOOT

def write_sitemap():
    P = load('places.json'); A = load('artesanos.json') if os.path.exists(os.path.join(ROOT, 'data', 'artesanos.json')) else []
    urls = [HOST + '/', HOST + '/lugares/'] + [f'{HOST}/lugares/{p["id"]}' for p in P]
    if A: urls += [HOST + '/artesanos/'] + [f'{HOST}/artesanos/{a["id"]}' for a in A]
    sm = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + ''.join(f'<url><loc>{u}</loc></url>\n' for u in urls) + '</urlset>\n'
    open(os.path.join(SITE, 'sitemap.xml'), 'w').write(sm)
    return len(urls)

def build():
    A = load('artesanos.json'); C = load('cigarros.json')
    os.makedirs(OUT, exist_ok=True)
    for f in os.listdir(OUT):
        if f.endswith('.html'): os.remove(os.path.join(OUT, f))
    by = {}
    for c in C: by.setdefault(c.get('artesano_id'), []).append(c)
    for a in A:
        open(os.path.join(OUT, a['id'] + '.html'), 'w', encoding='utf-8').write(page(a, by.get(a['id'], [])))
    url = HOST + '/artesanos/'
    desc = f'{len(A)} artesanos, torcedores y tabacaleras de cigarros en Puerto Rico: Río Grande, Caguas, Mayagüez, Cidra, Santa Isabel y más. Sus cigarros, vitolas y enlaces.'
    h = HEAD.format(title='Artesanos de cigarros en Puerto Rico · Cigarros boricuas | La Hoja Boricua', desc=e(desc), url=url,
                    ogt='Artesanos de cigarros en Puerto Rico', ld='', app='../#/artesanos')
    h += f'<h1>Artesanos de cigarros en Puerto Rico</h1>\n<p>{len(A)} artesanos, torcedores, marcas y tabacaleras boricuas en la guía, con sus cigarros.</p>\n<ul>'
    for a in sorted(A, key=lambda x: x['nombre'].lower()):
        pu = (a.get('pueblo') or '').strip()
        h += f'<li><a href="{a["id"]}.html">{e(a["nombre"])}</a>' + (f' <span>{e(pu)}</span>' if pu else '') + '</li>'
    h += '</ul>\n'
    open(os.path.join(OUT, 'index.html'), 'w', encoding='utf-8').write(h + FOOT)
    n = write_sitemap()
    print('artesanos', len(A), 'sitemap urls', n)

if __name__ == '__main__':
    build()
