"""LHB-93 mutation proof: each mutation breaks one thing on a scratch copy of the worktree, runs the LHB-93 test, and
must turn it red; the copy is restored after each. usage: python evidence/lhb-93-mutations.py WORKTREE SCRATCH"""
import os, re, shutil, subprocess, sys

WT, D = sys.argv[1], sys.argv[2]
if os.path.exists(D):
    shutil.rmtree(D)
shutil.copytree(WT, D, ignore=shutil.ignore_patterns('.git', 'node_modules'))
BTN = '<button class="lang-switch" type="button" id="langSwitch" lang="en" aria-label="English">'


def edit(rel, old, new):
    p = os.path.join(D, rel)
    s = open(p, 'rb').read().decode('utf-8')
    assert s.count(old) == 1, (rel, old, s.count(old))
    open(p, 'wb').write(s.replace(old, new).encode('utf-8'))


M = [
    ('M1 the button ships hidden again', lambda: edit('site/index.html', BTN, BTN.replace('aria-label="English">', 'aria-label="English" hidden>'))),
    ('M2 the HTML label differs from what wire() writes', lambda: edit('site/index.html', '<span class="ls-long">English</span>', '<span class="ls-long">Ingl&eacute;s</span>')),
    ('M3 the HTML short code differs', lambda: edit('site/index.html', 'aria-hidden="true">EN</span></button>', 'aria-hidden="true">IN</span></button>')),
    ('M4 the HTML lang differs', lambda: edit('site/index.html', 'id="langSwitch" lang="en"', 'id="langSwitch" lang="es"')),
    ('M5 switched off, wire() leaves it visible', lambda: edit('site/i18n.js', 'if(!ENABLED){b.hidden=true;return}', 'if(!ENABLED){return}')),
    ('M6 min-width under the widest name (70px)', lambda: edit('site/styles.css', 'min-width:74px;padding:0 12px', 'min-width:70px;padding:0 12px')),
    ('M7 min-width far over it (80px, a visible change)', lambda: edit('site/styles.css', 'min-width:74px;padding:0 12px', 'min-width:80px;padding:0 12px')),
    ('M8 the short min-width under EN (36px)', lambda: edit('site/styles.css', 'min-width:40px;padding:0 10px', 'min-width:36px;padding:0 10px')),
    ('M9 no global border-box', lambda: edit('site/styles.css', '*{box-sizing:border-box}', '*{box-sizing:content-box}')),
]
red = 0
for name, mut in M:
    snap = {rel: open(os.path.join(D, rel), 'rb').read() for rel in ('site/index.html', 'site/i18n.js', 'site/styles.css')}
    try:
        mut()
        r = subprocess.run(['node', '--test', '--test-timeout=60000', '--test-name-pattern=LHB-93', 'test/site.test.js'], cwd=D, capture_output=True, text=True, encoding='utf-8', errors='replace')
        fails = re.findall(r'^ℹ fail (\d+)', r.stdout, re.M)
        ok = r.returncode != 0 and fails and int(fails[-1]) > 0
        red += bool(ok)
        print('%-56s rc %d fail %s -> %s' % (name, r.returncode, fails[-1] if fails else '?', 'RED' if ok else 'SURVIVED'), flush=True)
    finally:
        for rel, b in snap.items():
            open(os.path.join(D, rel), 'wb').write(b)
r = subprocess.run(['node', '--test', '--test-timeout=60000', '--test-name-pattern=LHB-93', 'test/site.test.js'], cwd=D, capture_output=True, text=True, encoding='utf-8', errors='replace')
print('baseline after restore: rc %d' % r.returncode)
print('RESULT %d of %d mutations red' % (red, len(M)))
