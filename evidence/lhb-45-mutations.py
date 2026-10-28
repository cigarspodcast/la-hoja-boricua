"""LHB-45 mutation check: each mutation must turn the suite red; the copy is restored after each.
It runs on a COPY of the repository (DEST), so the working tree is never touched. M1 is the ticket's proof:
a guide page names a lugar or cigar that is not in the data.
usage: python evidence/lhb-45-mutations.py REPO_ROOT DEST"""
import os, re, shutil, subprocess, sys
SRC, R = sys.argv[1], sys.argv[2]
if os.path.exists(R): shutil.rmtree(R)
shutil.copytree(SRC, R, ignore=shutil.ignore_patterns('.git', 'node_modules'))  # evidence/ stays: LHB-27 and LHB-29 read files there
def run():
    p = subprocess.run(['node', '--test', '--test-timeout=60000', 'test/site.test.js'], cwd=R, capture_output=True, text=True, encoding='utf-8')
    return re.search(r'^ℹ fail (\d+)', p.stdout, re.M).group(1), sorted(set(re.findall(r'^✖ (.+?) \(\d', p.stdout, re.M)) - {'failing tests:'})
G = 'site/guias/'
FILES = [G + 'donde-fumar-cigarros-en-san-juan.html', G + 'donde-fumar-cigarros-en-caguas.html', G + 'que-es-un-cigarro-hecho-en-puerto-rico.html',
         G + 'artesanos-de-cigarros-por-pueblo.html', G + 'index.html', 'site/sitemap.xml', 'site/llms.txt', 'site/sw.js']
SNAP = {f: open(os.path.join(R, f), 'rb').read() for f in FILES}
def restore():
    for f, s in SNAP.items(): open(os.path.join(R, f), 'wb').write(s)
def sub(f, pat, rep):
    p = os.path.join(R, f); s = open(p, encoding='utf-8', newline='').read(); s2 = re.sub(pat, rep, s, count=1); assert s2 != s, (f, pat)
    open(p, 'w', encoding='utf-8', newline='').write(s2)
SJ = G + 'donde-fumar-cigarros-en-san-juan.html'
muts = [
    ('M1 a guide names a lugar that is not in the data', lambda: sub(SJ, r'(<ul>)', r'\1<li><a href="../lugares/lounge-fantasma.html">Lounge Fantasma</a> <span>Cigar lounge</span></li>')),
    ('M2 a guide names a cigar that is not in the data', lambda: sub(G + 'que-es-un-cigarro-hecho-en-puerto-rico.html', r'(</h2>\r?\n)', r'\1<ul><li><a href="../cigarros/cigarro-fantasma.html">Cigarro Fantasma</a></li></ul>')),
    ('M3 a real lugar shown under a wrong name', lambda: sub(SJ, r'(<li><a href="\.\./lugares/[^"]+\.html">)[^<]+', r'\1Nombre Inventado')),
    ('M4 a lugar dropped from its town guide', lambda: sub(SJ, r'<li><a href="\.\./lugares/[^"]+\.html">[^<]*</a> <span>[^<]*</span></li>', '')),
    ('M5 a lugar of another town listed in a town guide', lambda: sub(G + 'donde-fumar-cigarros-en-caguas.html', r'(<ul>)', r'\1<li><a href="../lugares/612-c-lounge-arecibo.html">612-C Lounge</a> <span>x</span></li>')),
    ('M6 the FAQPage answer differs from the first paragraph', lambda: sub(SJ, r'("acceptedAnswer":\{"@type":"Answer","text":")', r'\1Respuesta distinta. ')),
    ('M7 a guide without its FAQPage', lambda: sub(SJ, r'<script type="application/ld\+json">\{"@context":"https://schema.org","@type":"FAQPage".*?</script>\r?\n', '')),
    ('M8 an artisan without a source on the made-in-PR guide', lambda: sub(G + 'que-es-un-cigarro-hecho-en-puerto-rico.html', r'(<h2><a href="\.\./artesanos/)[^"]+(\.html">)', r'\1cohoba-cigars\2')),
    ('M9 an origin claim with no source on the by-town guide', lambda: sub(G + 'artesanos-de-cigarros-por-pueblo.html', r'(<li><a href="\.\./artesanos/cohoba-cigars\.html">[^<]*</a>) <span>[^<]*</span>', r'\1 <span>Hecho en Puerto Rico</span>')),
    ('M10 a guide missing from the sitemap', lambda: sub('site/sitemap.xml', r'<url><loc>https://lahojaboricua\.com/guias/donde-fumar[^<]*</loc></url>\r?\n', '')),
    ('M11 a guide missing from llms.txt', lambda: sub('site/llms.txt', r'- \[¿Dónde fumar cigarros en San Juan\?\][^\n]*\n', '')),
    ('M12 the service worker caches a guide as the shell', lambda: sub('site/sw.js', re.escape("&&!url.pathname.includes('/guias/')"), '')),
    ('M13 the index does not link a guide', lambda: sub(G + 'index.html', r'<li><a href="donde-fumar-cigarros-en-caguas\.html">[^<]*</a></li>', '')),
]
print('copy of', SRC, 'at', R)
print('baseline', run())
for name, f in muts:
    f(); print(name, '->', run()); restore()
print('restored', run())
