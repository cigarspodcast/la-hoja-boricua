"""LHB-104 proof, on a scratch copy of the worktree: each part of the shared record of unanswered uploads (lhb_mihoja_v1_pend) broken one
at a time, each expected to turn the LHB-104 (or LHB-80, LHB-28) tests red. The copy is restored after each.
usage: python evidence/lhb-104-mutations.py WORKTREE SCRATCH"""
import os, shutil, subprocess, sys

WT, D = sys.argv[1], sys.argv[2]
if os.path.exists(D):
    shutil.rmtree(D)
shutil.copytree(WT, D, ignore=shutil.ignore_patterns('.git', 'node_modules', 'evidence'))
PAT = 'LHB-104|LHB-80|LHB-28'
SY = 'site/sync.js'

MUTS = [
    (SY, 'settled ignores the other tabs (before LHB-104)', "  try{if(shRead().some(e=>e.s===acc.sub))return {ok:false,why:'pending'}}catch(e){return {ok:false,why:'pending'}}", ''),
    (SY, 'the upload is not recorded for the other tabs', 'const op=newOp(),sk=shAdd(uid,rev,op);', 'const op=newOp(),sk=null;'),
    (SY, 'no fence for an upload of another tab', '||evict.get(uid)===rev||shLive;', '||evict.get(uid)===rev;'),
    (SY, 'an upload of another tab that may have landed keeps the base', 'e.r+1>=g.body.opsFrom))voided=true}}', 'e.r+1>=g.body.opsFrom)){}}}'),
    (SY, 'the uploads of other tabs are never asked about', 'other=room?oth.slice(-room).map(e=>e.o):[]', 'other=[]'),
    (SY, 'more ids are asked than the server takes', 'other=room?oth.slice(-room).map(e=>e.o):[]', 'other=oth.slice(-OPS_ASK).map(e=>e.o)'),
    (SY, 'this tab counts its own dropped uploads as another tab', 'if(!(e.o&&mineOps.has(e.o))&&!own){', 'if(!(e.o&&mineOps.has(e.o))){'),
    (SY, 'a 200 leaves the older uploads of the other tabs listed', '    for(const e of shRead())if(e.s===uid&&e.r<=rev)shDel(e)}', '    }'),
    (SY, 'a clear rejection leaves the upload listed', '{pend=pend.filter(x=>x.op!==op);if(sk===PEND+op)shDel({k:sk})}', '{pend=pend.filter(x=>x.op!==op)}'),
    (SY, 'an upload past the account rev stays listed', 'if(e.r>=rev){if(e.r===rev)shLive=true;continue}', 'if(true){if(e.r===rev)shLive=true;continue}'),
    (SY, 'r1: sign-out does not look at the uploads again behind its fence', 'if(sh.some(e=>subs.includes(e.s)))return back()', ''),
    (SY, 'r1: the evidence is removed before the base is struck', 'if(gone.length){if(voided&&!poison())return {fail:\'storage\'};', 'if(gone.length){'),
    (SY, 'r1: no bound on the uploads listed for one If-Match', 'const full=shRead().filter(e=>e.s===uid&&e.r===rev).length>=OPS_ASK;', 'const full=false;'),
    (SY, 'r1: the overflow key of this tab counts as another tab', 'const own=e.o?myOps.delete(e.o):myX.delete(e.k);', 'const own=e.o?myOps.delete(e.o):false;'),
    (SY, 'r1: no second look at the fence after the upload is listed', "  if(fenced()){if(!had){try{D.ls.remove(k)}catch(e){}}throw new Error('fenced')}", ''),
    ('site/hoja.js', 'r1: the page gives the engine no list of keys', 'keys:()=>{const o=[];for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);if(k!=null)o.push(k)}return o}', 'keys:()=>[]'),
]

EQUIV = {}


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
surv = 0
for rel, name, a, b in MUTS:
    edit(rel, a, b)
    t = tally(runp())
    ok = t['fail'] > 0
    red += ok
    print('%-60s %s (fail %d)' % (name, 'RED (caught)' if ok else ('GREEN (equivalent: ' + EQUIV[name] + ')' if name in EQUIV else 'GREEN (survived)'), t['fail']))
    surv += (not ok) and name not in EQUIV
    restore(rel)
print('RESULT %d of %d red; %d named equivalent; %d unexpected survivors' % (red, len(MUTS), len([m for m in MUTS if m[1] in EQUIV]), surv))
sys.exit(1 if surv else 0)
