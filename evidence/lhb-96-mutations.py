"""LHB-96 proof: each mutation breaks one rule of the tag names on the public page (functions/u/[handle].js) on a scratch copy, runs the
LHB-96 and LHB-40 tests, and must turn them red; the copy is restored after each.
usage: python evidence/lhb-96-mutations.py WORKTREE SCRATCH"""
import os, re, shutil, subprocess, sys

WT, D = sys.argv[1], sys.argv[2]
if os.path.exists(D):
    shutil.rmtree(D)
shutil.copytree(WT, D, ignore=shutil.ignore_patterns('.git', 'node_modules'))
PAT = 'LHB-96|LHB-40'
U = 'functions/u/[handle].js'


def edit(rel, old, new):
    p = os.path.join(D, rel)
    s = open(p, 'rb').read().decode('utf-8')
    assert s.count(old) == 1, (rel, old, s.count(old))
    open(p, 'wb').write(s.replace(old, new).encode('utf-8'))


M = [
    ('T1 the raw id is shown', lambda: edit(U, "esc(tagName(t))", "esc(t)")),
    ('T2 a plain lookup (constructor, __proto__)', lambda: edit(U, "Object.prototype.hasOwnProperty.call(WHEEL_NAME, t) ? WHEEL_NAME[t] : t", "WHEEL_NAME[t] || t")),
    ('T3 the name is not escaped', lambda: edit(U, "esc(tagName(t))", "tagName(t)")),
    ('T4 a name differs from the app', lambda: edit(U, "cacao: 'Cacao / café'", "cacao: 'Cacao'")),
    ('T5 an id missing from the map', lambda: edit(U, ", nuez: 'Nuez' }", " }")),
    ('T6 case-blind matching (Madera typed by hand)', lambda: edit(U, "call(WHEEL_NAME, t) ? WHEEL_NAME[t] : t", "call(WHEEL_NAME, t.toLowerCase()) ? WHEEL_NAME[t.toLowerCase()] : t.toLowerCase()")),
    ('T7 case-blind match, typed text kept (Codex r1: Cacao typed by hand)', lambda: edit(U, "call(WHEEL_NAME, t) ? WHEEL_NAME[t] : t", "call(WHEEL_NAME, t.toLowerCase()) ? WHEEL_NAME[t.toLowerCase()] : t")),
]
red = 0
for name, mut in M:
    snap = open(os.path.join(D, U), 'rb').read()
    try:
        mut()
        r = subprocess.run(['node', '--test', '--test-timeout=60000', '--test-name-pattern=' + PAT, 'test/site.test.js'], cwd=D, capture_output=True, text=True, encoding='utf-8', errors='replace')
        fails = re.findall(r'^ℹ fail (\d+)', r.stdout, re.M)
        ok = r.returncode != 0 and fails and int(fails[-1]) > 0
        red += bool(ok)
        print('%-48s rc %d fail %s -> %s' % (name, r.returncode, fails[-1] if fails else '?', 'RED' if ok else 'SURVIVED'), flush=True)
    finally:
        open(os.path.join(D, U), 'wb').write(snap)
r = subprocess.run(['node', '--test', '--test-timeout=60000', '--test-name-pattern=' + PAT, 'test/site.test.js'], cwd=D, capture_output=True, text=True, encoding='utf-8', errors='replace')
n = re.findall(r'^ℹ pass (\d+)', r.stdout, re.M)
print('baseline after restore: rc %d pass %s' % (r.returncode, n[-1] if n else '?'))
print('RESULT %d of %d mutations red' % (red, len(M)))
