"""LHB-44 mutation check on generated pages: each mutation must turn the suite red; pages are regenerated after each."""
import os, re, subprocess, glob
R = r'C:\Users\Owner\la-hoja-boricua'
S = os.path.join(R, 'site')
def run():
    p = subprocess.run(['node', '--test', 'test/site.test.js'], cwd=R, capture_output=True, text=True, encoding='utf-8')
    return re.search(r'^ℹ fail (\d+)', p.stdout, re.M).group(1), sorted(set(re.findall(r'^✖ (.+?) \(\d', p.stdout, re.M)) - {'failing tests:'})
def regen():
    for t in ('build_artesanos.py', 'build_lugares.py', 'rebuild_bundle.py'):
        subprocess.run(['python', 'tools/' + t], cwd=R, check=True, capture_output=True)
def edit(f, pat, rep):
    p = os.path.join(S, f); s = open(p, encoding='utf-8', newline='').read(); s2 = re.sub(pat, rep, s, count=1)
    assert s2 != s, (f, pat); open(p, 'w', encoding='utf-8', newline='').write(s2)
HOME = open(os.path.join(S, 'index.html'), encoding='utf-8', newline='').read()
muts = [
    ('M1 breadcrumbs removed from one lugar page', lambda: edit(next(f for f in sorted(os.listdir(os.path.join(S, 'lugares'))) if f != 'index.html' and f.endswith('.html')).join(['lugares/', '']), r'<script type="application/ld\+json">\{"@context":"https://schema.org","@type":"BreadcrumbList".*?</script>\n?', '')),
    ('M2 one sameAs profile dropped on an artesano page', lambda: edit('artesanos/el-club-del-turro.html', r'"sameAs":\["[^"]+",', '"sameAs":[')),
    ('M3 last breadcrumb points elsewhere', lambda: edit('cigarros/yambo-toro.html', r'"item":"https://lahojaboricua.com/cigarros/yambo-toro"', '"item":"https://lahojaboricua.com/cigarros/"')),
    ('M4 Product without brand', lambda: edit('cigarros/yambo-toro.html', r'"brand":\{[^}]*\},', '')),
    ('M5 a build-clock date added', lambda: edit('artesanos/yambo-cigars.html', r'"@type":"Organization",', '"@type":"Organization","dateModified":"2026-10-25",')),
    ('M6 home page JSON-LD removed', lambda: edit('index.html', r'<script type="application/ld\+json">.*?</script>\r?\n', '')),
]
print('baseline', run())
for name, f in muts:
    f(); print(name, '->', run())
    open(os.path.join(S, 'index.html'), 'w', encoding='utf-8', newline='').write(HOME); regen()
print('restored', run())
