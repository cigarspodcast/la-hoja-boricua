"""LHB-36 mutation check: each mutation must turn the suite red; the copy is restored after each.
It runs on a COPY of the repository (DEST), so the working tree is never touched.
usage: python evidence/lhb-36-mutations.py REPO_ROOT DEST"""
import os, re, shutil, subprocess, sys
SRC, R = sys.argv[1], sys.argv[2]
if os.path.exists(R): shutil.rmtree(R)
shutil.copytree(SRC, R, ignore=shutil.ignore_patterns('.git', 'node_modules'))  # evidence/ stays: LHB-27 and LHB-29 read files there
def run():
    p = subprocess.run(['node', '--test', '--test-timeout=60000', 'test/site.test.js'], cwd=R, capture_output=True, text=True, encoding='utf-8')
    return re.search(r'^ℹ fail (\d+)', p.stdout, re.M).group(1), sorted(set(re.findall(r'^✖ (.+?) \(\d', p.stdout, re.M)) - {'failing tests:'})
FILES = ['site/i18n.js', 'site/styles.css', 'site/index.html']
SNAP = {f: open(os.path.join(R, f), 'rb').read() for f in FILES}
def restore():
    for f, s in SNAP.items(): open(os.path.join(R, f), 'wb').write(s)
def edit(f, a, b):
    p = os.path.join(R, f); s = open(p, encoding='utf-8', newline='').read(); assert s.count(a) == 1, (f, a)
    open(p, 'w', encoding='utf-8', newline='').write(s.replace(a, b))
muts = [
    ('M1 the switch left off', lambda: edit('site/i18n.js', 'const ENABLED=true;', 'const ENABLED=false;')),
    ('M2 the switch shown without its lang attribute', lambda: edit('site/i18n.js', "b.lang=lang==='en'?'es':'en';", '')),
    ('M3 the switch names the current language instead of the other', lambda: edit('site/i18n.js', "b.textContent=lang==='en'?'Español':'English';", "b.textContent=lang==='en'?'English':'Español';")),
    ('M4 the choice is not remembered', lambda: edit('site/i18n.js', "w.localStorage.setItem('lhb_lang',l)", "void l")),
    ('M5 the switch style forces display and so ignores hidden', lambda: edit('site/styles.css', '.lang-switch{height:36px;', '.lang-switch{display:inline-flex;height:36px;')),
    ('M6 the switch has no style', lambda: edit('site/styles.css', '.lang-switch{', '.lang-switch-x{')),
    ('M7 the English footer keeps the Spanish link', lambda: edit('site/i18n.js', '"ix.footLugHref": "en/lugares/",', '"ix.footLugHref": "lugares/",')),
    ('M8 the footer link is not marked for English', lambda: edit('site/index.html', ' data-i18n-attr="href:ix.footArtHref"', '')),
]
print('copy of', SRC, 'at', R)
print('baseline', run())
for name, f in muts:
    f(); print(name, '->', run()); restore()
print('restored', run())
