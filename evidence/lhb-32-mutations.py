"""LHB-32 mutation check: each mutation must turn the suite red; the tree is restored after each.
It runs on a COPY of the repository (DEST), so the working tree is never touched.
usage: python evidence/lhb-32-mutations.py REPO_ROOT DEST"""
import json, os, re, shutil, subprocess, sys
SRC, R = sys.argv[1], sys.argv[2]
if os.path.exists(R): shutil.rmtree(R)
shutil.copytree(SRC, R, ignore=shutil.ignore_patterns('.git', 'node_modules'))  # evidence/ stays: LHB-27 and LHB-29 read files there
def run():
    p = subprocess.run(['node', '--test', '--test-timeout=60000', 'test/site.test.js'], cwd=R, capture_output=True, text=True, encoding='utf-8')
    return re.search(r'^ℹ fail (\d+)', p.stdout, re.M).group(1), sorted(set(re.findall(r'^✖ (.+?) \(\d', p.stdout, re.M)) - {'failing tests:'})
P = json.load(open(os.path.join(R, 'data', 'places.json'), encoding='utf-8'))
pl = next(p for p in P if p.get('tipo_en') and p['tipo_en'] != p['tipo'])  # a place whose English type differs
L0, A0 = sorted(f for f in os.listdir(os.path.join(R, 'site', 'en', 'lugares')) if f != 'index.html')[0], 'jfc-hoja-boricua'
C = json.load(open(os.path.join(R, 'data', 'cigarros.json'), encoding='utf-8'))
ci = next(c for c in C if c.get('capa_en') and c['capa_en'].strip() != c['capa'].strip())  # a cigar whose English wrapper differs
A = json.load(open(os.path.join(R, 'data', 'artesanos.json'), encoding='utf-8'))
ar = next(a for a in A if a.get('tipo_en') and a['tipo_en'].strip().lower() != a['tipo'].strip().lower())  # an artisan whose English type differs
FILES = ['site/en/lugares/' + L0, 'site/artesanos/' + A0 + '.html', 'site/lugares/' + L0, 'site/en/artesanos/' + A0 + '.html',
         'site/en/lugares/' + pl['id'] + '.html', 'site/sitemap.xml', 'site/sw.js', 'site/en/cigarros/hoja-boricua.html',
         'site/en/cigarros/' + ci['id'] + '.html', 'site/en/artesanos/' + ar['id'] + '.html', 'site/en/lugares/index.html']
SNAP = {f: open(os.path.join(R, f), 'rb').read() for f in FILES}
def restore():
    for f, s in SNAP.items(): open(os.path.join(R, f), 'wb').write(s)
    g = os.path.join(R, 'site', 'en', 'lugares', 'fantasma.html')
    if os.path.exists(g): os.remove(g)
def rm(f): os.remove(os.path.join(R, f))
def sub(f, pat, rep):
    p = os.path.join(R, f); s = open(p, encoding='utf-8', newline='').read(); s2 = re.sub(pat, rep, s, count=1); assert s2 != s, (f, pat)
    open(p, 'w', encoding='utf-8', newline='').write(s2)
esc = lambda s: s.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;').replace('"', '&quot;').replace("'", '&#x27;')
muts = [
    ('M1 one English page removed (its Spanish twin stays)', lambda: rm('site/en/lugares/' + L0)),
    ('M2 one Spanish page removed (its English twin stays)', lambda: rm('site/artesanos/' + A0 + '.html')),
    ('M3 a Spanish page loses its hreflang en line', lambda: sub('site/lugares/' + L0, r'<link rel="alternate" hreflang="en" [^>]*>\r?\n', '')),
    ('M4 an English page points x-default to itself', lambda: sub('site/en/artesanos/' + A0 + '.html', r'(hreflang="x-default" href="https://lahojaboricua\.com)/', r'\1/en/')),
    ('M5 an English page keeps the Spanish canonical', lambda: sub('site/en/artesanos/' + A0 + '.html', r'(<link rel="canonical" href="https://lahojaboricua\.com)/en/', r'\1/')),
    ('M6 an English page declares lang es-PR', lambda: sub('site/en/lugares/' + L0, r'<html lang="en">', '<html lang="es-PR">')),
    ('M7 the sitemap: one English entry loses its alternates', lambda: sub('site/sitemap.xml', r'(<loc>https://lahojaboricua\.com/en/[^<]+</loc>)<xhtml:link[^\n]*</url>', r'\1</url>')),
    ('M8 the sitemap: one English entry removed', lambda: sub('site/sitemap.xml', r'<url><loc>https://lahojaboricua\.com/en/[^\n]*\n', '')),
    ('M9 an English place page shows the Spanish type', lambda: sub('site/en/lugares/' + pl['id'] + '.html', re.escape('<dd>' + esc(pl['tipo_en']) + '</dd>'), '<dd>' + esc(pl['tipo']).replace('\\', '\\\\') + '</dd>')),
    ('M10 an English artisan page keeps the Spanish footer', lambda: sub('site/en/artesanos/' + A0 + '.html', r'<footer>.*</footer>', '<footer><a href="./">Artesanos de cigarros en Puerto Rico</a> · <a href="../../">La Hoja Boricua</a></footer>')),
    ('M11 an English cigar JSON-LD carries a price', lambda: sub('site/en/cigarros/hoja-boricua.html', r'("description":")', r'\1Price 12 dollars. ')),
    ('M12 the service worker loses the /en/ exclusion', lambda: sub('site/sw.js', re.escape("&&!url.pathname.startsWith('/en/')"), '')),
    ('M13 a stray English page with no Spanish twin', lambda: shutil.copy(os.path.join(R, 'site', 'en', 'lugares', L0), os.path.join(R, 'site', 'en', 'lugares', 'fantasma.html'))),
    ('M14 an English page links to a Spanish static page', lambda: sub('site/en/lugares/' + L0, r'<a href="\.\./artesanos/">', '<a href="../../artesanos/">') if 'index' in L0 else sub('site/en/artesanos/' + A0 + '.html', r'href="\.\./cigarros/', 'href="../../cigarros/')),
    # the adversarial review's mutations that the first version of the tests let through (2026-10-28)
    ('M15 an English place meta description carries the Spanish type', lambda: sub('site/en/lugares/' + pl['id'] + '.html', re.escape(esc(pl['tipo_en'].lower())) + r'(?= in )', esc(pl['tipo'].lower()).replace('\\', '\\\\'))),
    ('M16 an English cigar page lists the Spanish wrapper', lambda: sub('site/en/cigarros/' + ci['id'] + '.html', re.escape('<li>Wrapper: <span>' + esc(ci['capa_en'].strip()) + '</span>'), '<li>Wrapper: <span>' + esc(ci['capa'].strip()).replace('\\', '\\\\') + '</span>')),
    ('M17 an English logo alt in Spanish', lambda: sub('site/en/artesanos/' + A0 + '.html', r'alt="([^"]*) logo"', r'alt="Logo de \1"')),
    ('M18 the service worker /en/ rule kept only in a comment', lambda: (sub('site/sw.js', re.escape("&&!url.pathname.startsWith('/en/')"), ''), sub('site/sw.js', r'(\r?\n)$', r"/* &&!url.pathname.startsWith('/en/') */\1"))),
    ('M19 an English place page labels a field in Spanish', lambda: sub('site/en/lugares/' + L0, r'<dt>Type</dt>', '<dt>Tipo:</dt>')),
    ('M20 an English place note reworded in Spanish', lambda: sub('site/en/lugares/' + L0, r'<p class="note">[^<]*</p>', '<p class="note">Confirma el horario con el lugar.</p>')),
    ('M21 the English places index intro in Spanish', lambda: sub('site/en/lugares/index.html', r'<p>\d+ lounges, bars[^<]*</p>', '<p>Lounges y bares donde fumar en Puerto Rico.</p>')),
    ('M22 a Spanish description in an English place JSON-LD', lambda: sub('site/en/lugares/' + pl['id'] + '.html', r'(<script type="application/ld\+json">\{"@context":"https://schema.org",)', r'\1"description":"Un lugar para fumar cigarros",')),
    ('M23 an English artisan meta description carries the Spanish type', lambda: sub('site/en/artesanos/' + ar['id'] + '.html', re.escape(esc(ar['tipo_en'].strip().lower())), esc(ar['tipo'].strip().lower()).replace('\\', '\\\\'))),
]
print('copy of', SRC, 'at', R)
print('baseline', run())
for name, f in muts:
    f(); print(name, '->', run()); restore()
print('restored', run())
