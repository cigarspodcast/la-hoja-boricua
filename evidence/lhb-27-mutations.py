"""LHB-27 mutation check: each mutation must turn the suite red; the tree is restored after each."""
import os, re, subprocess
R = r'C:\Users\Owner\la-hoja-boricua'
S = os.path.join(R, 'site')
def run():
    p = subprocess.run(['node', '--test', 'test/site.test.js'], cwd=R, capture_output=True, text=True, encoding='utf-8')
    return re.search(r'^ℹ fail (\d+)', p.stdout, re.M).group(1), sorted(set(re.findall(r'^✖ (.+?) \(\d', p.stdout, re.M)) - {'failing tests:'})
def edit(f, a, b):
    p = os.path.join(S, f); s = open(p, encoding='utf-8', newline='').read(); assert s.count(a) >= 1, (f, a)
    open(p, 'w', encoding='utf-8', newline='').write(s.replace(a, b, 1))
FILES = ['i18n.js', 'app.js', 'sw.js', 'index.html']
SNAP = {f: open(os.path.join(S, f), encoding='utf-8', newline='').read() for f in FILES}
def restore():
    for f, s in SNAP.items(): open(os.path.join(S, f), 'w', encoding='utf-8', newline='').write(s)
en_at = SNAP['i18n.js'].index('\nen:')
muts = [
    ('M1 one key removed from the English table', lambda: open(os.path.join(S, 'i18n.js'), 'w', encoding='utf-8', newline='').write(SNAP['i18n.js'][:en_at] + SNAP['i18n.js'][en_at:].replace('"pf.title": "My profile",', '', 1))),
    ('M2 one key removed from the Spanish table', lambda: edit('i18n.js', '"pf.title": "Mi perfil",', '')),
    ('M3 a Spanish literal written back into a view', lambda: edit('app.js', "<h2>${tt('pf.title')}</h2>", '<h2>Mi perfil</h2>')),
    ('M4 the switch flag turned on', lambda: edit('i18n.js', 'const ENABLED=false;', 'const ENABLED=true;')),
    ('M5 i18n.js dropped from the sw shell', lambda: edit('sw.js', "'i18n.js',", '')),
    ('M6 i18n.js loaded after app.js', lambda: (edit('index.html', '<script src="i18n.js" defer></script>\r\n', ''), edit('index.html', '<script src="app.js" defer></script>', '<script src="app.js" defer></script>\r\n<script src="i18n.js" defer></script>'))),
]
print('baseline', run())
for name, f in muts:
    f(); print(name, '->', run()); restore()
print('restored', run())
