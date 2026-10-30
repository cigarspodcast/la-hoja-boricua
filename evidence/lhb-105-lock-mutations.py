"""LHB-105 proof for the rebuild on the sync lock, on a scratch copy of the worktree: each mutant takes back one piece of the switch under
the lock, and an LHB-105 test must turn red. The copy is restored after each. (The first design's runner, lhb-105-mutations.py, is kept as the record.)
usage: python evidence/lhb-105-lock-mutations.py WORKTREE SCRATCH"""
import os, re, shutil, subprocess, sys

WT, D = sys.argv[1], sys.argv[2]
if os.path.exists(D):
    shutil.rmtree(D)
shutil.copytree(WT, D, ignore=shutil.ignore_patterns('.git', 'node_modules', 'evidence'))
PAT = 'LHB-105|LHB-98'
MUTS = [
    ('site/sync.js', 'the switch runs at once even while another tab holds the lock', "if(D.locks&&!inSwitch){switchSoon();return false}", ''),
    ('site/sync.js', 'the switch is never asked for (isolate just says no)', "if(D.locks&&!inSwitch){switchSoon();return false}", "if(D.locks&&!inSwitch)return false;"),
    ('site/sync.js', 'the switch skips the sync lock', "const body=()=>D.lock(async()=>{inSwitch=true;try{return isolate()}finally{inSwitch=false}});", "const body=async()=>{inSwitch=true;try{return isolate()}finally{inSwitch=false}};"),
    ('site/sync.js', 'Codex r6: the switch skips the write lock', "D.switchLock?D.switchLock(body):body()", "body()"),
    ('site/sync.js', 'Codex r6: a pass switches inline (any isolate inside the sync lock)', "  if(!isolate())return {fail:'park'};", "  {inSwitch=true;let k;try{k=isolate()}finally{inSwitch=false}if(!k)return {fail:'park'}}"),
    ('site/sync.js', 'the switch flag is never cleared', "inSwitch=true;try{return isolate()}finally{inSwitch=false}", "inSwitch=true;return isolate()"),
    ('site/sync.js', 'the screen is not repainted after the switch', "if(ok&&a&&ownerOf()===a.sub&&D.onApplied){try{D.onApplied()}catch(e){}}", ''),
    ('site/sync.js', 'the screen is repainted after a failed switch', "if(ok&&a&&ownerOf()===a.sub&&D.onApplied)", "if(D.onApplied)"),
    ('site/sync.js', 'switching() always says no', "switching:()=>!!swP,", "switching:()=>false,"),
    ('site/sync.js', 'two requests start two switches', "function switchSoon(){if(swP)return swP;", "function switchSoon(){"),
    ('site/hoja.js', 'hoja.js does not tell sync.js about Web Locks', "locks:typeof navigator!=='undefined'&&!!navigator.locks&&typeof navigator.locks.request==='function',switchLock:f=>wlSwitch(f),", "switchLock:f=>wlSwitch(f),"),
    ('site/hoja.js', 'Codex r6: hoja.js gives sync.js no write lock for the switch', "switchLock:f=>wlSwitch(f),", ""),
    ('site/hoja.js', 'Codex r6: other tabs do not yield on a switch', "||e.key==='lhb_mihoja_v1_cambiando'&&e.newValue)wlYield();", ")wlYield();"),
    ('site/hoja.js', 'Codex r6: the switching tab cannot write while it holds the exclusive', "&&!w.have&&!w.sw}", "&&!w.have}"),
    ('site/hoja.js', 'Codex r6: the switch takes the write lock shared, not exclusive', "w.lm.request('lhb_mihoja',{mode:'exclusive'},async()=>{w.sw=true;", "w.lm.request('lhb_mihoja',{mode:'shared'},async()=>{w.sw=true;"),
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
