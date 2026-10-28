"""LHB-29 mutation check: each mutation must turn the suite red; the tree is restored after each.
usage: python evidence/lhb-29-mutations.py REPO_ROOT"""
import os, re, subprocess, sys
R = sys.argv[1] if len(sys.argv) > 1 else os.getcwd()
S = os.path.join(R, 'site')
def run():
    p = subprocess.run(['node', '--test', '--test-timeout=60000', 'test/site.test.js'], cwd=R, capture_output=True, text=True, encoding='utf-8')
    return re.search(r'^ℹ fail (\d+)', p.stdout, re.M).group(1), sorted(set(re.findall(r'^✖ (.+?) \(\d', p.stdout, re.M)) - {'failing tests:'})
def edit(f, a, b, after=None):
    p = os.path.join(S, f); s = open(p, encoding='utf-8', newline='').read()
    at = s.index(after) if after else 0
    assert s.count(a, at) >= 1, (f, a)
    open(p, 'w', encoding='utf-8', newline='').write(s[:at] + s[at:].replace(a, b, 1))
FILES = ['i18n.js', 'hoja.js', 'art.js', 'index.html']
SNAP = {f: open(os.path.join(S, f), encoding='utf-8', newline='').read() for f in FILES}
def restore():
    for f, s in SNAP.items(): open(os.path.join(S, f), 'w', encoding='utf-8', newline='').write(s)
muts = [
    ('M1 a Spanish literal written back into a hoja.js view', lambda: edit('hoja.js', "dr.nombre||tt('h.sinNombre')", "dr.nombre||'Sin nombre'")),
    ('M2 a Spanish literal written back into art.js', lambda: edit('art.js', "aria-label=\"${tt('a.coqui')}\"", 'aria-label="Coquí"')),
    ('M3 a stored value loses its English label', lambda: edit('i18n.js', ' "val.Aceitosa": "Oily",', '', after='\nen:')),
    ('M4 lab() shows the stored value as is', lambda: edit('hoja.js', "const lab=v=>tt('val.'+v,null,v);", 'const lab=v=>v;')),
    ('M5 a tasting option shown without lab()', lambda: edit('hoja.js', '${esc(lab(o))}</button>', '${esc(o)}</button>')),
    ('M6 the region option loses its stored value', lambda: edit('hoja.js', '<option value="${r}" ', '<option ')),
    ('M7 an index.html text loses its data-i18n mark', lambda: edit('index.html', '<span class="brand-sub" data-i18n="ix.brandSub">', '<span class="brand-sub">')),
    ('M8 the Spanish of an index.html key differs from the markup', lambda: edit('i18n.js', ' "ix.brandSub": "Hecho en Borinquen",', ' "ix.brandSub": "Hecho en Borinquén",')),
    ('M9 English never applied to index.html', lambda: edit('i18n.js', 'function wire(){apply(w.document);', 'function wire(){')),
    ('M10 apply() touches the page in Spanish too', lambda: edit('i18n.js', "function apply(d){if(lang==='es')return;", 'function apply(d){')),
    ('M11 art.js reads tt before i18n.js defines it', lambda: edit('art.js', 'const tt=window.LHB_I18N.t;', 'const tt=k=>k;')),
    ('M12 hoja.js uses tt without defining it', lambda: edit('hoja.js', 'const tt=window.LHB_I18N.t;', '')),
    ('M13 an unused key left in both tables', lambda: (edit('i18n.js', ' "ix.tabs": "Secciones",', ' "ix.tabs": "Secciones",\n "ix.sobra": "Sobra",'), edit('i18n.js', ' "ix.tabs": "Sections",', ' "ix.tabs": "Sections",\n "ix.sobra": "Extra",'))),
    # Codex round 1: prose with a semicolon, and a lone "o" between tags, were invisible to the scan
    ('M14 a tasting instruction with a semicolon written back in Spanish', lambda: edit('hoja.js', "e:tt('h.tuestaElPieCon')", "e:'Usa fósforo de madera, cedro o llama de butano; los encendedores de gasolina dejan olor.'")),
    ('M15 the "o" separator written back in Spanish', lambda: edit('hoja.js', "<div class=\"or\">${tt('h.o')}</div>", '<div class="or">o</div>')),
]
print('baseline', run())
for name, f in muts:
    f(); print(name, '->', run()); restore()
print('restored', run())
