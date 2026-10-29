"""LHB-102 proof: on a scratch copy of the worktree, first put back the original main code (origin/main's app.js and hoja.js) and see the
test red; then break each part of the fix one at a time and see it red; the copy is restored after each.
usage: python evidence/lhb-102-mutations.py WORKTREE SCRATCH"""
import os, re, shutil, subprocess, sys

WT, D = sys.argv[1], sys.argv[2]
if os.path.exists(D):
    shutil.rmtree(D)
shutil.copytree(WT, D, ignore=shutil.ignore_patterns('.git', 'node_modules', 'evidence'))
PAT = 'LHB-102'
APP, HJ = 'site/app.js', 'site/hoja.js'
FILES = (APP, HJ)


def runp():
    return subprocess.run(['node', '--test', '--test-timeout=60000', '--test-name-pattern=' + PAT, 'test/site.test.js'], cwd=D, capture_output=True, text=True, encoding='utf-8', errors='replace')


def edit(rel, old, new):
    p = os.path.join(D, rel)
    s = open(p, 'rb').read().decode('utf-8')
    if '\r\n' in s:
        old, new = old.replace('\r\n', '\n').replace('\n', '\r\n'), new.replace('\r\n', '\n').replace('\n', '\r\n')
    assert s.count(old) == 1, (rel, old[:80], s.count(old))
    open(p, 'wb').write(s.replace(old, new).encode('utf-8'))


def original():
    for rel in FILES:
        b = subprocess.run(['git', 'show', 'origin/main:' + rel], cwd=WT, capture_output=True).stdout
        open(os.path.join(D, rel), 'wb').write(b)


M = [
    ('U0 the original main code (uploads() trusts what is stored)', original),
    ('U1 uploads() does not check for a list', lambda: edit(APP, "return Array.isArray(v)?v.filter(u=>u&&typeof u==='object'&&!Array.isArray(u)):[]}", "return v||[]}")),
    ('U2 uploads() keeps the junk inside a list', lambda: edit(APP, "v.filter(u=>u&&typeof u==='object'&&!Array.isArray(u))", 'v')),
    ('U3 reading rewrites what is stored', lambda: edit(APP, "const uploads=()=>{const v=LS.get('uploads',[]);", "const uploads=()=>{const v0=LS.get('uploads',[]);const v=Array.isArray(v0)?v0:[];LS.set('uploads',v);")),
    ('U4 the backup exports the broken value', lambda: edit(HJ, "subidas:legacyList('uploads')}", "subidas:legacy('uploads')||[]}")),
    ('U5 the import merge reads the broken value', lambda: edit(HJ, "byId(legacyList('uploads'),x.subidas)", "byId(legacy('uploads')||[],x.subidas)")),
]
red = 0
for name, mut in M:
    snap = {rel: open(os.path.join(D, rel), 'rb').read() for rel in FILES}
    try:
        mut()
        r = runp()
        fails = re.findall(r'^ℹ fail (\d+)', r.stdout, re.M)
        ok = r.returncode != 0 and fails and int(fails[-1]) > 0
        red += bool(ok)
        print('%-62s rc %d fail %s -> %s' % (name, r.returncode, fails[-1] if fails else '?', 'RED' if ok else 'SURVIVED'), flush=True)
    finally:
        for rel, b in snap.items():
            open(os.path.join(D, rel), 'wb').write(b)
r = runp()
n = re.findall(r'^ℹ pass (\d+)', r.stdout, re.M)
f = re.findall(r'^ℹ fail (\d+)', r.stdout, re.M)
print('baseline after restore: rc %d pass %s fail %s' % (r.returncode, n[-1] if n else '?', f[-1] if f else '?'))
print('RESULT %d of %d mutations red' % (red, len(M)))
