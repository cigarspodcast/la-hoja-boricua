"""LHB-105 proof for the rebuild on the sync lock, on a scratch copy of the worktree: each mutant takes back one piece of the switch under
the lock, and an LHB-105 test must turn red. The copy is restored after each. (The first design's runner, lhb-105-mutations.py, is kept as the record.)
usage: python evidence/lhb-105-lock-mutations.py WORKTREE SCRATCH"""
import os, re, shutil, subprocess, sys

WT, D = sys.argv[1], sys.argv[2]
if os.path.exists(D):
    shutil.rmtree(D)
shutil.copytree(WT, D, ignore=shutil.ignore_patterns('.git', 'node_modules', 'evidence'))
PAT = 'LHB-105'
MUTS = [
    ('site/sync.js', 'the switch runs at once even while another tab holds the lock', "if(D.locks&&!locked){switchSoon();return false}", ''),
    ('site/sync.js', 'the switch is never asked for (isolate just says no)', "if(D.locks&&!locked){switchSoon();return false}", "if(D.locks&&!locked)return false;"),
    ('site/sync.js', 'the switch skips the lock', "swP=Promise.resolve().then(()=>withLock(()=>isolate()))", "swP=Promise.resolve().then(()=>{locked=true;try{return isolate()}finally{locked=false}})"),
    ('site/sync.js', 'a pass does not mark this tab as holding the lock (its own switch would wait for itself)', "r=await (D.lock?withLock(once):once());", "r=await (D.lock?D.lock(once):once());"),
    ('site/sync.js', 'the lock flag is never cleared', "locked=true;try{return await f()}finally{locked=false}", "locked=true;return f()"),
    ('site/sync.js', 'the screen is not repainted after the switch', "if(ok&&a&&ownerOf()===a.sub&&D.onApplied){try{D.onApplied()}catch(e){}}", ''),
    ('site/sync.js', 'the screen is repainted after a failed switch', "if(ok&&a&&ownerOf()===a.sub&&D.onApplied)", "if(D.onApplied)"),
    ('site/sync.js', 'switching() always says no', "switching:()=>!!swP,", "switching:()=>false,"),
    ('site/sync.js', 'two requests start two switches', "function switchSoon(){if(swP)return swP;", "function switchSoon(){"),
    ('site/hoja.js', 'hoja.js does not tell sync.js about Web Locks', " locks:typeof navigator!=='undefined'&&!!navigator.locks&&typeof navigator.locks.request==='function',\n", ''),
    ('site/hoja.js', 'writing during the switch says storage is full', "toast(SYNC.switching&&SYNC.switching()?tt('h.cambiandoCuenta'):tt('h.noSePudoSeparar'))", "toast(tt('h.noSePudoSeparar'))"),
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
    print('%-90s %s (fail %d)' % (name, 'RED (caught)' if ok else 'GREEN (survived)', t['fail']))
    shutil.copy(os.path.join(WT, rel), os.path.join(D, rel))
print('RESULT %d of %d red' % (red, len(MUTS)))
sys.exit(0 if red == len(MUTS) else 1)
