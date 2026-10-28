"""LHB-89 mutation proof: each mutation breaks one rule of nameClerkDialog / watchClerkDialog in a scratch copy of hoja.js,
runs the LHB-89 test, and must turn it red; the file is restored after each. usage: python evidence/lhb-89-mutations.py WORKTREE SCRATCH"""
import os, re, shutil, subprocess, sys

WT, D = sys.argv[1], sys.argv[2]
if os.path.exists(D):
    shutil.rmtree(D)
shutil.copytree(WT, D, ignore=shutil.ignore_patterns('.git', 'node_modules'))
P = os.path.join(D, 'site', 'hoja.js')
M = [
    ('M1 never sets aria-labelledby', "if(d.getAttribute('aria-labelledby')!==h.id)d.setAttribute('aria-labelledby',h.id);", ''),
    ('M2 looks for the wrong heading class', "d.querySelector('.cl-headerTitle')", "d.querySelector('.cl-header')"),
    ('M3 names the dialog with an empty title', "if(!h||!String(h.textContent||'').trim())continue;", 'if(!h)continue;'),
    ('M4 overwrites a heading id it already has', "if(!h.id)h.id=", 'h.id='),
    ('M5 ignores a name Clerk already gave', "if(d.getAttribute('aria-label'))continue;", ''),
    ('M6 one id for every title', "'lhb-clerk-title-'+(nameClerkDialog.k=(nameClerkDialog.k||0)+1)", "'lhb-clerk-title'"),
    ('M7 opening sign-in does not watch the dialog', "signUpForceRedirectUrl:location.href});watchClerkDialog()}", 'signUpForceRedirectUrl:location.href})}'),
    ('M8 the watcher never lets go', "else if(seen&&!document.querySelector('.cl-modalContent'))mo.disconnect()});", '});'),
]
orig = open(P, 'rb').read()
red = 0
for name, old, new in M:
    s = orig.decode('utf-8')
    assert s.count(old) == 1, (name, s.count(old))
    try:
        open(P, 'wb').write(s.replace(old, new).encode('utf-8'))
        r = subprocess.run(['node', '--test', '--test-timeout=60000', '--test-name-pattern=LHB-89', 'test/site.test.js'], cwd=D, capture_output=True, text=True, encoding='utf-8', errors='replace')
        fails = re.findall(r'^ℹ fail (\d+)', r.stdout, re.M)
        ok = r.returncode != 0 and fails and int(fails[-1]) > 0
        red += bool(ok)
        print('%-48s rc %d fail %s -> %s' % (name, r.returncode, fails[-1] if fails else '?', 'RED' if ok else 'SURVIVED'), flush=True)
    finally:
        open(P, 'wb').write(orig)
r = subprocess.run(['node', '--test', '--test-timeout=60000', '--test-name-pattern=LHB-89', 'test/site.test.js'], cwd=D, capture_output=True, text=True, encoding='utf-8', errors='replace')
print('baseline after restore: rc %d' % r.returncode)
print('RESULT %d of %d mutations red' % (red, len(M)))
