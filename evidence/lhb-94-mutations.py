"""LHB-94 mutation proof: each mutation breaks one thing on a scratch copy of the worktree, runs the LHB-94, LHB-27 and
LHB-25 tests, and must turn them red; the copy is restored after each.
usage: python evidence/lhb-94-mutations.py WORKTREE SCRATCH"""
import os, re, shutil, subprocess, sys

WT, D = sys.argv[1], sys.argv[2]
if os.path.exists(D):
    shutil.rmtree(D)
shutil.copytree(WT, D, ignore=shutil.ignore_patterns('.git', 'node_modules'))
PAT = 'LHB-94|LHB-27|LHB-25'
FILES = ('site/cuenta.js', 'site/i18n.js')


def edit(rel, old, new):
    p = os.path.join(D, rel)
    s = open(p, 'rb').read().decode('utf-8')
    assert s.count(old) == 1, (rel, old, s.count(old))
    open(p, 'wb').write(s.replace(old, new).encode('utf-8'))


M = [
    ('M1 a card title written in Spanish again', lambda: edit('site/cuenta.js', "show(tt('cu.gate.h'),", "show('Entra para usar Mi Hoja',")),
    ('M2 a button label written in Spanish again', lambda: edit('site/cuenta.js', "{label:tt('cu.again.b'),", "{label:'Entrar',")),
    ('M3 tt always Spanish', lambda: edit('site/cuenta.js', "const tt=(k,v)=>window.LHB_I18N.t(k,v);", "const tt=(k,v)=>window.LHB_I18N.T.es[k];")),
    ('M4 an English key missing', lambda: edit('site/i18n.js', ' "cu.saved": "Profile saved.",\r\n', '')),
    ('M5 English left in Spanish', lambda: edit('site/i18n.js', ' "cu.retry": "Try again",', ' "cu.retry": "Intentar otra vez",')),
    ('M6 the Spanish text changed', lambda: edit('site/i18n.js', ' "cu.gate.h": "Entra para usar Mi Hoja",', ' "cu.gate.h": "Entra para usar tu Hoja",')),
    ('M7 the space before the phone sentence lost', lambda: edit('site/cuenta.js', "?' '+tt('cu.gate.local'):''", "?tt('cu.gate.local'):''")),
    ('M8 a key misspelled in cuenta.js', lambda: edit('site/cuenta.js', "D.ui.toast(tt('cu.saved'))", "D.ui.toast(tt('cu.save'))")),
    ('M9 an unused key in both languages', lambda: (edit('site/i18n.js', ' "cu.retry": "Intentar otra vez",', ' "cu.retry": "Intentar otra vez",\r\n "cu.extra": "x",'),
                                                   edit('site/i18n.js', ' "cu.retry": "Try again",', ' "cu.retry": "Try again",\r\n "cu.extra": "y",'))),
    ('M10 the English gate title in Spanish words', lambda: edit('site/i18n.js', ' "cu.gate.h": "Sign in to use Mi Hoja",', ' "cu.gate.h": "Entrá para usar Mi Hoja",')),
]
red = 0
for name, mut in M:
    snap = {rel: open(os.path.join(D, rel), 'rb').read() for rel in FILES}
    try:
        mut()
        r = subprocess.run(['node', '--test', '--test-timeout=60000', '--test-name-pattern=' + PAT, 'test/site.test.js'], cwd=D, capture_output=True, text=True, encoding='utf-8', errors='replace')
        fails = re.findall(r'^ℹ fail (\d+)', r.stdout, re.M)
        ok = r.returncode != 0 and fails and int(fails[-1]) > 0
        red += bool(ok)
        print('%-46s rc %d fail %s -> %s' % (name, r.returncode, fails[-1] if fails else '?', 'RED' if ok else 'SURVIVED'), flush=True)
    finally:
        for rel, b in snap.items():
            open(os.path.join(D, rel), 'wb').write(b)
r = subprocess.run(['node', '--test', '--test-timeout=60000', '--test-name-pattern=' + PAT, 'test/site.test.js'], cwd=D, capture_output=True, text=True, encoding='utf-8', errors='replace')
n = re.findall(r'^ℹ pass (\d+)', r.stdout, re.M)
print('baseline after restore: rc %d pass %s' % (r.returncode, n[-1] if n else '?'))
print('RESULT %d of %d mutations red' % (red, len(M)))
