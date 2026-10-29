"""LHB-98 proof, on a scratch copy of the worktree: each part of the Web Locks gate broken one at a time, each expected to turn the
LHB-98 (or LHB-34 and LHB-28) tests red. The copy is restored after each.
usage: python evidence/lhb-98-mutations.py WORKTREE SCRATCH"""
import os, shutil, subprocess, sys

WT, D = sys.argv[1], sys.argv[2]
if os.path.exists(D):
    shutil.rmtree(D)
shutil.copytree(WT, D, ignore=shutil.ignore_patterns('.git', 'node_modules', 'evidence'))
PAT = 'LHB-98|LHB-34|LHB-28'
SY, HJ = 'site/sync.js', 'site/hoja.js'
MUTS = [
    (SY, 'writes ignore the lock (the state before this ticket)', 'if(D.closed&&D.closed())return true;', ''),
    (HJ, 'r1: quiet writes skip the lock', "if(quiet&&typeof wlClosed==='function'&&wlClosed())return true;", ''),
    (HJ, 'a tab does not yield on the fence', "if(e.key==='lhb_mihoja_v1_saliendo'&&e.newValue)wlYield();", ''),
    (HJ, 'a tab that yielded never asks again', 'if(!w||!w.lm||!w.have)return;wlDrop(w);wlTake()}', 'if(!w||!w.lm||!w.have)return;wlDrop(w)}'),
    (HJ, 'sign-out without the exclusive', 'const ok=await wlOnly(async()=>{\n   if(!outDone)', 'const ok=await (async f=>f())(async()=>{\n   if(!outDone)'),
    (HJ, 'account deletion without the exclusive', 'await wlOnly(async()=>{await dropLocal();', 'await (async f=>f())(async()=>{await dropLocal();'),
    (HJ, 'the fence goes up before the exclusive is asked', 'try{const p=w.lm.request(', 'try{SYNC.fenceUp();const p=w.lm.request('),
    (HJ, 'r1: sign-out runs without the exclusive after WL_WAIT', 'wlTake();return out}', 'if(!ran&&!onWait)out=await f();wlTake();return out}'),
    (HJ, 'r1: deletion gives up at WL_WAIT', 'const ac=!onWait&&typeof AbortController', 'const ac=typeof AbortController'),
    (HJ, 'r1: deletion waits without a word', 'else if(onWait)onWait()}', 'else if(0)onWait()}'),
    (HJ, 'r1: a refused sign-out says nothing', "if(ok===WL_NO)acMsg(tt('ac.wlBusy'))", "if(0)acMsg(tt('ac.wlBusy'))"),
    (HJ, 'the page does not take the shared lock back', 'wlTake();return out}', 'return out}'),
    (HJ, 'closed without Web Locks', 'function wlClosed(){const w=WLS;return !!(w&&w.lm)&&!w.have}', 'function wlClosed(){const w=WLS;return !w||!w.have}'),
    (HJ, 'the page never takes the shared lock', ' WLS={lm,have:false,ask:false,free:null,mine:false};wlTake()}', ' WLS={lm,have:false,ask:false,free:null,mine:false}}'),
]


def runp():
    return subprocess.run(['node', '--test', '--test-timeout=20000', '--test-name-pattern=' + PAT, 'test/site.test.js'], cwd=D, capture_output=True, text=True, encoding='utf-8', errors='replace')


def tally(r):
    t = {k: 0 for k in ('pass', 'fail')}
    for l in r.stdout.splitlines():
        for k in t:
            if l.startswith('ℹ ' + k + ' '):
                t[k] = int(l.split()[-1])
    return t


def edit(rel, old, new):
    p = os.path.join(D, rel)
    s = open(p, 'rb').read().decode('utf-8')
    if '\r\n' in s:
        old, new = old.replace('\n', '\r\n'), new.replace('\n', '\r\n')
    assert s.count(old) == 1, (rel, old[:80], s.count(old))
    open(p, 'wb').write(s.replace(old, new).encode('utf-8'))


def restore(rel):
    shutil.copy(os.path.join(WT, rel), os.path.join(D, rel))


t = tally(runp())
print('baseline (no mutation): pass %d fail %d' % (t['pass'], t['fail']))
assert t['fail'] == 0 and t['pass'] > 0
red = 0
for rel, name, a, b in MUTS:
    edit(rel, a, b)
    t = tally(runp())
    ok = t['fail'] > 0
    red += ok
    print('%-56s %s (fail %d)' % (name, 'RED (caught)' if ok else 'GREEN (survived)', t['fail']))
    restore(rel)
print('RESULT %d of %d red' % (red, len(MUTS)))
