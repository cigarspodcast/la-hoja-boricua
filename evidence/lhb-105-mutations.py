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
    ('site/sync.js', 'a pass starts during a switch (no check after the epoch read)', "  if(await switching())return {fail:'switching'};\n", ''),
    ('site/sync.js', 'the switch is not marked', "try{D.ls.set(mine,JSON.stringify({v:1,t:D.nowMs()}))}catch(e){return false}", ''),
    ('site/sync.js', 'a switch that cannot be marked goes ahead unmarked', "try{D.ls.set(mine,JSON.stringify({v:1,t:D.nowMs()}))}catch(e){return false}", "try{D.ls.set(mine,JSON.stringify({v:1,t:D.nowMs()}))}catch(e){}"),
    ('site/sync.js', 'the mark stays after the switch ends', "try{D.ls.remove(mine)}catch(e){unmark=mine}", ''),
    ('site/sync.js', 'the mark of a tab that closed mid-switch never lapses', "SWITCH_TTL=30e3", "SWITCH_TTL=1e15"),
    ('site/sync.js', 'Codex r1: a live tab asleep past the lapse no longer counts', "(held&&held.has(TABLOCK+m.tab))", "false"),
    ('site/sync.js', 'Codex r1: the pass switches the copy before it checks for another tab mid-switch', "  if(await switching())return {fail:'switching',at:'start'};\n", ''),
    ('site/sync.js', 'Codex r1: isolate starts while another tab is mid-switch', "if(ms.some(liveNow))return false;", ''),
    ('site/sync.js', 'Codex r1: a mark that could not be removed is not retried', "catch(e){unmark=mine}", "catch(e){}"),
    ('site/sync.js', 'Codex r1: a switch that wakes after another tab switched still clears the copy', "   if(cur!==e2)return false;\n   applying=true;", "   applying=true;"),
    ('site/sync.js', 'Codex r1: the mark of a closed tab is left behind', "try{D.ls.remove(m.k)}catch(e){}", ''),
    ('site/sync.js', 'Codex r2: without Web Locks, an expired mark is removed without moving the epoch', "if(!held&&!gone){if(!newEpoch()){live=true;continue}gone=true}", ''),
    ('site/sync.js', 'Codex r2: isolate goes by recent marks only, not by live tabs', "if(ms.some(liveNow))return false;", "if(ms.some(fresh))return false;"),
    ('site/sync.js', 'Codex r2: before the first lock query, an old mark counts as dead', "(heldKnown===null||heldAt<m.t+SWITCH_TTL||heldKnown.has(TABLOCK+m.tab))", "(heldKnown!==null&&(heldAt<m.t+SWITCH_TTL||heldKnown.has(TABLOCK+m.tab)))"),
    ('site/sync.js', 'Codex r3: every switch of a tab marks the same key', "const mine=SWITCH+TAB+'.'+(++seq);", "const mine=SWITCH+TAB+'.0';"),
    ('site/sync.js', 'Codex r3: a lock query from before the mark went stale still decides', "heldAt<m.t+SWITCH_TTL||", ""),
    ('site/sync.js', 'Codex r4: a failed epoch read before the clear leaves the new epoch', "let cur;try{cur=D.ls.get(EPOCH)}catch(e){return back()}", "let cur;try{cur=D.ls.get(EPOCH)}catch(e){return false}"),
    ('site/sync.js', 'Codex r2: a switch that throws leaves its mark', "inIso=true;try{return iso1(acc,old)}finally{inIso=false;try{D.ls.remove(mine)}catch(e){unmark=mine}}}", "inIso=true;let out;try{out=iso1(acc,old)}finally{inIso=false}try{D.ls.remove(mine)}catch(e){unmark=mine}return out}"),
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
