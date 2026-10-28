"""LHB-30 mutation check: each mutation must turn the suite red; the tree is restored after each.
usage: python evidence/lhb-30-mutations.py REPO_ROOT"""
import os, re, subprocess, sys
R = sys.argv[1] if len(sys.argv) > 1 else os.getcwd()
def run():
    p = subprocess.run(['node', '--test', '--test-timeout=60000', 'test/site.test.js'], cwd=R, capture_output=True, text=True, encoding='utf-8')
    return re.search(r'^ℹ fail (\d+)', p.stdout, re.M).group(1), sorted(set(re.findall(r'^✖ (.+?) \(\d', p.stdout, re.M)) - {'failing tests:'})
FILES = ['data/artesanos.json', 'data/cigarros.json', 'site/data/bundle.js', 'site/app.js', 'site/hoja.js', 'test/lhb-30-sin-traducir.txt']
SNAP = {f: open(os.path.join(R, f), encoding='utf-8', newline='').read() for f in FILES}
def restore():
    for f, s in SNAP.items(): open(os.path.join(R, f), 'w', encoding='utf-8', newline='').write(s)
def edit(f, a, b):
    p = os.path.join(R, f); s = open(p, encoding='utf-8', newline='').read(); assert s.count(a) >= 1, (f, a)
    open(p, 'w', encoding='utf-8', newline='').write(s.replace(a, b, 1))
def sub(f, pat, rep):
    p = os.path.join(R, f); s = open(p, encoding='utf-8', newline='').read(); s2 = re.sub(pat, rep, s, count=1); assert s2 != s, (f, pat)
    open(p, 'w', encoding='utf-8', newline='').write(s2)
muts = [
    ('M1 one historia_en removed from the data', lambda: sub('data/artesanos.json', r'\r?\n    "historia_en": "[^"]*",', '')),
    ('M2 one record loses traduccion', lambda: sub('data/cigarros.json', r',\r?\n    "traduccion": "borrador"', '')),
    ('M3 an _en for a field that is never translated (a name)', lambda: sub('data/artesanos.json', r'("nombre": "[^"]*",)', r'\1 "nombre_en": "X",')),
    ('M4 an em-dash in an English value', lambda: sub('data/artesanos.json', r'("tipo_en": ")', '\\1\u2014 ')),
    ('M5 the bundle not rebuilt after an English edit', lambda: sub('site/data/bundle.js', r'("historia_en":")', r'\1X')),
    ('M6 fx shows Spanish in English', lambda: edit('site/app.js', "if(window.LHB_I18N.lang!=='en')return v;", 'return v;')),
    ('M7 fx does not fall back on a blank _en', lambda: edit('site/app.js', "return typeof e==='string'&&e.trim()?e:v", "return e===undefined?v:e")),
    ('M8 Spanish search also reads the English', lambda: edit('site/app.js', "const fq=(r,k)=>window.LHB_I18N.lang==='en'?", "const fq=(r,k)=>true?")),
    ('M9 the story shown without fx', lambda: edit('site/app.js', "${esc(fx(a,'historia'))}", '${esc(a.historia)}')),
    ('M10 the capa filter option loses its Spanish value', lambda: edit('site/app.js', '<option value="${esc(x)}" ${state.capa===x', '<option ${state.capa===x')),
    ('M11 the hoja.js search reads only the Spanish', lambda: edit('site/hoja.js', "A.fq(a,'tipo'),A.fq(a,'historia')", 'a.tipo,a.historia')),
    ('M12 a translated record also listed as Spanish-only', lambda: open(os.path.join(R, 'test/lhb-30-sin-traducir.txt'), 'a', encoding='utf-8', newline='').write('artesanos/jfc-hoja-boricua\r\n')),
]
print('baseline', run())
for name, f in muts:
    f(); print(name, '->', run()); restore()
print('restored', run())
