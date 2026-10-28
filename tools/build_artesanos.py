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
import sys; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from schema import ld, crumbs, same_as, INICIO, LUGARES, ARTESANOS, CIGARROS  # LHB-44
from schema import alternates, alt_links, en_head, fx, ARTESANOS_EN  # LHB-32
OUT_EN = os.path.join(SITE, 'en', 'artesanos')

HEAD = """<!doctype html>
<html lang="es-PR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{title}</title>
<meta name="description" content="{desc}">
<link rel="canonical" href="{url}">
{alt}<meta property="og:title" content="{ogt}">
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
HEAD_EN = en_head(HEAD)
FOOT_EN = """</main>
<footer><a href="./">Cigar artisans in Puerto Rico</a> · <a href="../lugares/">Cigar lounges in Puerto Rico</a> · <a href="../../">La Hoja Boricua</a></footer>
</body>
</html>
"""
FORT = {'suave': 'Suave', 'media': 'Media', 'fuerte': 'Fuerte'}
FORT_EN = {'suave': 'Mild', 'media': 'Medium', 'fuerte': 'Full'}  # como fort.* en site/i18n.js

def links_of(a, en=False):
    out = []
    for k, lab in (('web', 'Website' if en else 'Sitio web'), ('instagram', 'Instagram'), ('facebook', 'Facebook'), ('youtube', 'YouTube')):
        u = (a.get(k) or '').strip()
        if u.startswith('http') and 'wa.me' not in u and 'whatsapp' not in u: out.append((lab, u))
    return out

def hecho_pr(a, en=False):
    # Solo si el JSON lo dice Y trae fuente.
    f = (a.get('hecho_en_pr_fuente') or '').strip()
    if a.get('hecho_en_pr') is True and f:
        if en:
            if f.startswith('http'): return f'<p class="note">Rolled in Puerto Rico, according to <a href="{e(f)}">this source</a>.</p>\n'
            return '<p class="note">Rolled in Puerto Rico, according to Cigars Podcast.</p>\n'
        if f.startswith('http'): return f'<p class="note">Torcidos en Puerto Rico, según <a href="{e(f)}">esta fuente</a>.</p>\n'
        return '<p class="note">Torcidos en Puerto Rico, según Cigars Podcast.</p>\n'
    return ''

def page(a, cig, en=False):
    aid = a['id']; url = f'{HOST}/{"en/" if en else ""}artesanos/{aid}'; nom = a['nombre']; pu = (a.get('pueblo') or '').strip()
    tipo = ((fx(a, 'tipo') if en else a.get('tipo')) or '').strip()
    donde = (f' in {pu}' if en else f' en {pu}') if pu else ''
    s = "s" if len(cig) != 1 else ""
    if en:
        title = f'{nom} · Handmade cigars{donde}, Puerto Rico | La Hoja Boricua'
        desc = f'{nom}: {tipo.lower() or "cigar artisan"}{donde}, Puerto Rico.'
        if cig: desc += f' {len(cig)} cigar{s} in the guide: ' + ', '.join(c['nombre'] for c in cig[:3]) + ('…' if len(cig) > 3 else '.')
        else: desc += ' Links and more on La Hoja Boricua.'
    else:
        title = f'{nom} · Cigarros artesanales{donde}, Puerto Rico | La Hoja Boricua'
        desc = f'{nom}: {tipo.lower() or "artesano de cigarros"}{donde}, Puerto Rico.'
        if cig: desc += f' {len(cig)} cigarro{s} en la guía: ' + ', '.join(c['nombre'] for c in cig[:3]) + ('…' if len(cig) > 3 else '.')
        else: desc += ' Enlaces y más en La Hoja Boricua.'
    ln = links_of(a, en)
    obj = {'@context': 'https://schema.org', '@type': 'Organization', 'name': nom, 'url': url}
    if pu: obj['address'] = {'@type': 'PostalAddress', 'addressLocality': pu, 'addressRegion': 'PR'}
    if ln: obj['sameAs'] = [u for _, u in ln]
    logo = os.path.exists(os.path.join(SITE, 'img', 'logos', aid + '.webp'))
    if logo: obj['logo'] = f'{HOST}/img/logos/{aid}.webp'
    up = '../../' if en else '../'
    h = (HEAD_EN if en else HEAD).format(title=e(title), desc=e(desc), url=url, alt=alt_links(f'artesanos/{aid}'), ogt=e(f'{nom} · La Hoja Boricua'),
                                         ld=ld(obj, crumbs(INICIO, ARTESANOS_EN if en else ARTESANOS, (nom, url))), app=f'{up}#/a/{e(aid)}')
    if logo: h += f'<img class="logo" src="{up}img/logos/{e(aid)}.webp" width="72" height="72" alt="{e(nom) + " logo" if en else "Logo de " + e(nom)}">\n'
    h += f'<h1>{e(nom)}</h1>\n<p class="tag">{e(tipo or ("Cigar artisan" if en else "Artesano de cigarros"))}{" · " + e(pu) if pu else ""}, Puerto Rico</p>\n'
    if en:
        blurb = f'{nom} appears in La Hoja Boricua, the guide to cigars by Puerto Rican artisans'
        blurb += f', with {len(cig)} cigar{s} in the catalog.' if cig else '.'
    else:
        blurb = f'{nom} aparece en La Hoja Boricua, la guía de cigarros de artesanos boricuas'
        blurb += f', con {len(cig)} cigarro{s} en el catálogo.' if cig else '.'
    h += f'<p>{e(blurb)}</p>\n' + hecho_pr(a, en)
    if cig:
        h += '<h2>Their cigars</h2>\n<ul>' if en else '<h2>Sus cigarros</h2>\n<ul>'
        for c in cig:
            bits = []
            if c.get('vitolas'): bits.append('Vitolas: ' + ', '.join(c['vitolas']))
            if c.get('fortaleza'): bits.append(('Strength: ' + FORT_EN.get(c['fortaleza'], c['fortaleza'])) if en else ('Fortaleza: ' + FORT.get(c['fortaleza'], c['fortaleza'])))
            h += f'<li><a href="../cigarros/{e(c["id"])}.html">{e(c["nombre"])}</a>' + (f' <span>{e(" · ".join(bits))}</span>' if bits else '') + '</li>'
        h += '</ul>\n'
    if ln: h += '<p class="links">' + ' '.join(f'<a href="{e(u)}" rel="noopener">{lab}</a>' for lab, u in ln) + '</p>\n'
    return h + (FOOT_EN if en else FOOT)

def write_sitemap():
    P = load('places.json'); A = load('artesanos.json') if os.path.exists(os.path.join(ROOT, 'data', 'artesanos.json')) else []
    tails = ['lugares/'] + [f'lugares/{p["id"]}' for p in P]
    if A: tails += ['artesanos/'] + [f'artesanos/{a["id"]}' for a in A]
    C = load('cigarros.json') if os.path.exists(os.path.join(ROOT, 'data', 'cigarros.json')) else []
    if C: tails += ['cigarros/'] + [f'cigarros/{c["id"]}' for c in C]
    # LHB-32: cada página en español y su gemela en inglés, las dos con sus alternativas hreflang
    alt = lambda t: ''.join(f'<xhtml:link rel="alternate" hreflang="{l}" href="{u}"/>' for l, u in alternates(t))
    urls = [f'<url><loc>{HOST}/</loc></url>\n'] + [f'<url><loc>{HOST}/{t}</loc>{alt(t)}</url>\n' for t in tails] + [f'<url><loc>{HOST}/en/{t}</loc>{alt(t)}</url>\n' for t in tails]
    sm = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n' + ''.join(urls) + '</urlset>\n'
    open(os.path.join(SITE, 'sitemap.xml'), 'w').write(sm)
    return len(urls)

def index(A, en=False):
    url = HOST + ('/en' if en else '') + '/artesanos/'
    if en:
        desc = f'{len(A)} cigar artisans, rollers and tobacco factories in Puerto Rico: Río Grande, Caguas, Mayagüez, Cidra, Santa Isabel and more. Their cigars, vitolas and links.'
        T = ('Cigar artisans in Puerto Rico', 'Cigar artisans in Puerto Rico · Puerto Rican cigars | La Hoja Boricua',
             f'{len(A)} Puerto Rican artisans, rollers, brands and tobacco factories in the guide, with their cigars.')
    else:
        desc = f'{len(A)} artesanos, torcedores y tabacaleras de cigarros en Puerto Rico: Río Grande, Caguas, Mayagüez, Cidra, Santa Isabel y más. Sus cigarros, vitolas y enlaces.'
        T = ('Artesanos de cigarros en Puerto Rico', 'Artesanos de cigarros en Puerto Rico · Cigarros boricuas | La Hoja Boricua',
             f'{len(A)} artesanos, torcedores, marcas y tabacaleras boricuas en la guía, con sus cigarros.')
    h = (HEAD_EN if en else HEAD).format(title=T[1], desc=e(desc), url=url, alt=alt_links('artesanos/'),
                    ogt=T[0], ld=ld(crumbs(INICIO, ARTESANOS_EN if en else ARTESANOS)), app=('../../' if en else '../') + '#/artesanos')
    h += f'<h1>{T[0]}</h1>\n<p>{T[2]}</p>\n<ul>'
    for a in sorted(A, key=lambda x: x['nombre'].lower()):
        pu = (a.get('pueblo') or '').strip()
        h += f'<li><a href="{a["id"]}.html">{e(a["nombre"])}</a>' + (f' <span>{e(pu)}</span>' if pu else '') + '</li>'
    h += '</ul>\n'
    return h + (FOOT_EN if en else FOOT)

def build():
    A = load('artesanos.json'); C = load('cigarros.json')
    by = {}
    for c in C: by.setdefault(c.get('artesano_id'), []).append(c)
    for out, en in ((OUT, False), (OUT_EN, True)):  # LHB-32: cada página en español y su gemela en inglés
        os.makedirs(out, exist_ok=True)
        for f in os.listdir(out):
            if f.endswith('.html'): os.remove(os.path.join(out, f))
        for a in A:
            open(os.path.join(out, a['id'] + '.html'), 'w', encoding='utf-8').write(page(a, by.get(a['id'], []), en))
        open(os.path.join(out, 'index.html'), 'w', encoding='utf-8').write(index(A, en))
    import build_cigarros; build_cigarros.build()
    n = write_sitemap()
    print('artesanos', len(A), 'sitemap urls', n)

if __name__ == '__main__':
    build()
