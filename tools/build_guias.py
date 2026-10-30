#!/usr/bin/env python3
# Genera las guías de preguntas y respuestas (LHB-45): site/guias/<slug>.html y site/guias/index.html.
# Cada guía contesta su pregunta en el primer párrafo y después lista los lugares, artesanos o cigarros.
# Todo sale de data/ (places, artesanos, cigarros); nada se inventa. tools/build_lugares.py lo llama.
import json, os, re, html, unicodedata, sys
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SITE = os.path.join(ROOT, 'site'); OUT = os.path.join(SITE, 'guias')
HOST = 'https://lahojaboricua.com'
e = lambda s: html.escape(str(s or ''), quote=True)
load = lambda n: json.load(open(os.path.join(ROOT, 'data', n), encoding='utf-8'))
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from schema import ld, crumbs, INICIO, GUIAS
from build_lugares import municipio, pueblo_txt

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
<header><a class="brand" href="../"><img src="../icons/icon.svg" alt="" width="30" height="30"><span class="brand-text"><span class="brand-name">La Hoja <em>Boricua</em></span><span class="brand-sub" lang="es">Hecho en Borinquen</span></span></a><a class="app" href="{app}">Abrir en la app</a></header>
<main>
""".replace('HOSTX', HOST)
FOOT = """</main>
<footer><a href="./">Guías de cigarros en Puerto Rico</a> · <a href="../lugares/">Cigar lounges en Puerto Rico</a> · <a href="../artesanos/">Artesanos de cigarros en Puerto Rico</a> · <a href="../">La Hoja Boricua</a></footer>
</body>
</html>
"""
QUE_ES = ('que-es-un-cigarro-hecho-en-puerto-rico', '¿Qué es un cigarro hecho en Puerto Rico?')
POR_PUEBLO = ('artesanos-de-cigarros-por-pueblo', '¿Qué artesanos de cigarros hay en cada pueblo de Puerto Rico?')

def slug(s):
    s = unicodedata.normalize('NFKD', s).encode('ascii', 'ignore').decode()
    return re.sub(r'[^a-z0-9]+', '-', s.lower()).strip('-')

def plural(n, uno, varios):
    return f'{n} {uno if n == 1 else varios}'

def lista(items):
    # items: segmentos ya armados; 'A', 'A y B', 'A, B y C'
    out = []
    for i, x in enumerate(items):
        if i: out.append(('t', ' y ' if i == len(items) - 1 else ', '))
        out += x
    return out

def link(sec, r):
    return [('a', f'../{sec}/{r["id"]}.html', r['nombre'])]

def render(segs):
    # el mismo párrafo como HTML (con enlaces) y como texto (para el FAQPage)
    h = ''.join(e(s[1]) if s[0] == 't' else f'<a href="{e(s[1])}">{e(s[2])}</a>' for s in segs)
    t = ''.join(s[1] if s[0] == 't' else s[2] for s in segs)
    return h, t

def por_municipio(P):
    g = {}
    for p in P: g.setdefault(municipio(p), []).append(p)
    return g

def pueblo_base(a):
    # artesanos: 'Santa Isabel (Jauca)' es Santa Isabel; sin pueblo: None
    pu = (a.get('pueblo') or '').strip()
    if not pu: return None
    m = re.match(r'(.+?)\s*\(', pu)
    return m.group(1).strip() if m else pu

def pages(P=None, A=None, C=None):
    # (slug, pregunta) de cada guía, en el orden del índice; el sitemap y llms.txt usan la misma lista
    P = load('places.json') if P is None else P
    g = por_municipio(P)
    out = [(f'donde-fumar-cigarros-en-{slug(m)}', f'¿Dónde fumar cigarros en {m}?') for m in sorted(g, key=lambda x: (x != 'San Juan', slug(x)))]
    return out + [QUE_ES, POR_PUEBLO]

def page(sl, q, answer, body, app):
    url = f'{HOST}/guias/{sl}'; ah, at = render(answer)
    faq = {'@context': 'https://schema.org', '@type': 'FAQPage',
           'mainEntity': [{'@type': 'Question', 'name': q, 'acceptedAnswer': {'@type': 'Answer', 'text': at}}]}
    desc = at if len(at) <= 300 else at[:297].rsplit(' ', 1)[0] + '…'
    h = HEAD.format(title=e(q + ' | La Hoja Boricua'), desc=e(desc), url=url, ogt=e(q), ld=ld(faq, crumbs(INICIO, GUIAS, (q, url))), app=app)
    return h + f'<h1>{e(q)}</h1>\n<p class="answer">{ah}</p>\n' + body + FOOT

def item(p):
    return f'<li><a href="../lugares/{e(p["id"])}.html">{e(p["nombre"])}</a> <span>{e(p["tipo"])} · {e(pueblo_txt(p))}</span></li>'

def donde_fumar(m, ps):
    srt = lambda lst: sorted(lst, key=lambda x: x['nombre'].lower())
    L = srt([p for p in ps if p['categoria'] == 'lounge']); V = srt([p for p in ps if p['categoria'] != 'lounge'])
    if L:
        a = [('t', f'En {m}, la guía tiene {plural(len(L), "lugar", "lugares")} donde fumar cigarros: ')] + lista([link('lugares', p) for p in L]) + [('t', '.')]
        if V: a += [('t', f' Para comprar cigarros hay {plural(len(V), "tienda", "tiendas")}: ')] + lista([link('lugares', p) for p in V]) + [('t', '.')]
    else:
        a = [('t', f'La guía no tiene lounges ni lugares para fumar en {m}. Tiene {plural(len(V), "tienda", "tiendas")} donde comprar cigarros: ')] + lista([link('lugares', p) for p in V]) + [('t', '.')]
    b = ''
    if L: b += f'<h2>Lounges y lugares para fumar en {e(m)}</h2>\n<ul>' + ''.join(item(p) for p in L) + '</ul>\n'
    if V: b += f'<h2>Tiendas de cigarros en {e(m)}</h2>\n<ul>' + ''.join(item(p) for p in V) + '</ul>\n'
    b += '<p class="note">Confirma horario y reglas con cada lugar antes de ir.</p>\n'
    return a, b

def que_es(A, C):
    src = sorted([x for x in A if x.get('hecho_en_pr') is True and (x.get('hecho_en_pr_fuente') or '').strip()], key=lambda x: x['nombre'].lower())
    tiene = 'tiene una fuente que lo confirma' if len(src) == 1 else 'tienen una fuente que lo confirma'
    a = [('t', f'En La Hoja Boricua, un cigarro hecho en Puerto Rico es uno torcido en la isla. {len(src)} de los {len(A)} artesanos de la guía {tiene}: ')]
    a += lista([link('artesanos', x) for x in src]) + [('t', '. Para los demás, dónde se tuercen sus cigarros todavía no está verificado.')]
    b = ''
    for x in src:
        f = x['hecho_en_pr_fuente'].strip(); pu = (x.get('pueblo') or '').strip()
        b += f'<h2><a href="../artesanos/{e(x["id"])}.html">{e(x["nombre"])}</a></h2>\n<p>' + (f'{e(pu)}, Puerto Rico. ' if pu else '')
        b += (f'<a href="{e(f)}">La fuente</a>.' if f.startswith('http') else 'Fuente: Cigars Podcast.') + '</p>\n'
        cs = sorted([c for c in C if c.get('artesano_id') == x['id']], key=lambda c: c['nombre'].lower())
        if cs: b += '<ul>' + ''.join(f'<li><a href="../cigarros/{e(c["id"])}.html">{e(c["nombre"])}</a></li>' for c in cs) + '</ul>\n'
    b += f'<p>Todos los cigarros de la guía, por artesano: <a href="../cigarros/">Cigarros hechos por artesanos boricuas</a>.</p>\n'
    return a, b

def por_pueblo(A):
    g = {}
    for x in A: g.setdefault(pueblo_base(x), []).append(x)
    con = sorted((k for k in g if k), key=slug); sin = g.get(None, [])
    k = sum(len(g[p]) for p in con)
    a = [('t', f'La Hoja Boricua tiene {len(A)} artesanos de cigarros. {k} tienen pueblo o zona en la guía, en {len(con)} pueblos y zonas: ')]
    a += lista([[('t', f'{p} ({len(g[p])})')] for p in con]) + [('t', '.')]
    if sin: a += [('t', f' De {plural(len(sin), "artesano", "artesanos")} la guía no indica el pueblo.')]
    b = ''
    for p in con + ([None] if sin else []):
        b += f'<h2>{e(p) if p else "Sin pueblo en la guía"}</h2>\n<ul>'
        for x in sorted(g[p], key=lambda x: x['nombre'].lower()):
            t = (x.get('tipo') or '').strip()
            b += f'<li><a href="../artesanos/{e(x["id"])}.html">{e(x["nombre"])}</a>' + (f' <span>{e(t)}</span>' if t else '') + '</li>'
        b += '</ul>\n'
    return a, b

def build():
    P, A, C = load('places.json'), load('artesanos.json'), load('cigarros.json')
    os.makedirs(OUT, exist_ok=True)
    for f in os.listdir(OUT):
        if f.endswith('.html'): os.remove(os.path.join(OUT, f))
    g = por_municipio(P); ps = pages(P)
    for sl, q in ps:
        if sl == QUE_ES[0]: (a, b), app = que_es(A, C), '../#/catalogo'
        elif sl == POR_PUEBLO[0]: (a, b), app = por_pueblo(A), '../#/artesanos'
        else:
            m = next(m for m in g if f'donde-fumar-cigarros-en-{slug(m)}' == sl)
            (a, b), app = donde_fumar(m, g[m]), '../#/lugares'
        open(os.path.join(OUT, sl + '.html'), 'w', encoding='utf-8').write(page(sl, q, a, b, app))
    url = HOST + '/guias/'
    h = HEAD.format(title='Guías de cigarros en Puerto Rico · Preguntas y respuestas | La Hoja Boricua',
                    desc=e(f'{len(ps)} preguntas y respuestas sobre dónde fumar cigarros en cada pueblo, los artesanos por pueblo y qué es un cigarro hecho en Puerto Rico, con los datos de La Hoja Boricua.'),
                    url=url, ogt='Guías de cigarros en Puerto Rico', ld=ld(crumbs(INICIO, GUIAS)), app='../#/lugares')
    h += '<h1>Guías de cigarros en Puerto Rico</h1>\n<p>Preguntas y respuestas con los lugares, artesanos y cigarros de La Hoja Boricua.</p>\n<ul>'
    h += ''.join(f'<li><a href="{sl}.html">{e(q)}</a></li>' for sl, q in ps) + '</ul>\n'
    open(os.path.join(OUT, 'index.html'), 'w', encoding='utf-8').write(h + FOOT)
    print('guías', len(ps))
    return len(ps)

if __name__ == '__main__':
    build()
