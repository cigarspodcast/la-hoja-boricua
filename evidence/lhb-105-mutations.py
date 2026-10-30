"""LHB-105 proof, on a scratch copy of the worktree: each mutant takes back one piece of the account-switch marker, and an LHB-105 test must
turn red. The copy is restored after each.
usage: python evidence/lhb-105-mutations.py WORKTREE SCRATCH"""
import os, re, shutil, subprocess, sys

WT, D = sys.argv[1], sys.argv[2]
if os.path.exists(D):
    shutil.rmtree(D)
shutil.copytree(WT, D, ignore=shutil.ignore_patterns('.git', 'node_modules', 'evidence'))
PAT = 'LHB-105'
MUTS = [
    ('site/sync.js', 'a pass starts during a switch (no check at the start)', "if(switching())return {fail:'switching'};", ''),
    ('site/sync.js', 'the switch is not marked', "try{D.ls.set(mine,JSON.stringify({v:1,t:D.nowMs()}))}catch(e){return false}", ''),
    ('site/sync.js', 'a switch that cannot be marked goes ahead unmarked', "try{D.ls.set(mine,JSON.stringify({v:1,t:D.nowMs()}))}catch(e){return false}", "try{D.ls.set(mine,JSON.stringify({v:1,t:D.nowMs()}))}catch(e){}"),
    ('site/sync.js', 'the mark stays after the switch ends', "  try{D.ls.remove(mine)}catch(e){}\n", ''),
    ('site/sync.js', 'the mark of a tab that closed mid-switch never lapses', "SWITCH_TTL=30e3", "SWITCH_TTL=1e15"),
]


def runp():
    r = subprocess.run(['node', '--test', '--test-timeout=60000', '--test-name-pattern=' + PAT, 'test/site.test.js'], cwd=D, capture_output=True, text=True, encoding='utf-8', errors='replace')
    out = r.stdout + r.stderr
    g = lambda k: int((re.search(r'^ℹ ' + k + r' (\d+)', out, re.M) or [0, 0])[1])
    return {'pass': g('pass'), 'fail': g('fail')}


def edit(rel, old, new):
    p = os.path.join(D, rel)
    s = open(p, 'rb').read().decode('utf-8').replace('\r\n', '\n')
    assert s.count(old) == 1, (rel, old[:80], s.count(old))
    open(p, 'wb').write(s.replace(old, new).encode('utf-8'))


t = runp()
print('baseline (no mutation): pass %d fail %d' % (t['pass'], t['fail']))
assert t['fail'] == 0 and t['pass'] > 0
red = 0
for rel, name, a, b in MUTS:
    edit(rel, a, b)
    t = runp()
    ok = t['fail'] > 0
    red += ok
    print('%-72s %s (fail %d)' % (name, 'RED (caught)' if ok else 'GREEN (survived)', t['fail']))
    shutil.copy(os.path.join(WT, rel), os.path.join(D, rel))
print('RESULT %d of %d red' % (red, len(MUTS)))
sys.exit(0 if red == len(MUTS) else 1)
