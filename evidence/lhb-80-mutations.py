"""LHB-80 proof, on a scratch copy of the worktree: each part of the upload id (X-Op, GET ?op=) broken one at a time, each expected to
turn the LHB-80 (or LHB-28) tests red. The first two are the state before this ticket on each side. The copy is restored after each.
usage: python evidence/lhb-80-mutations.py WORKTREE SCRATCH"""
import os, shutil, subprocess, sys

WT, D = sys.argv[1], sys.argv[2]
if os.path.exists(D):
    shutil.rmtree(D)
shutil.copytree(WT, D, ignore=shutil.ignore_patterns('.git', 'node_modules', 'evidence'))
PAT = 'LHB-80|LHB-28'
LB, AP, SY = 'functions/_lib/mihoja.js', 'functions/api/mihoja.js', 'site/sync.js'

MUTS = [
    (SY, 'the client never asks about a lost upload (before LHB-80)', "'/api/mihoja'+(ask.length?'?'+ask.map(x=>'op='+encodeURIComponent(x.op)).join('&'):'')", "'/api/mihoja'"),
    (AP, 'GET never says whether an upload landed (before LHB-80)', '      if (cols) {\n', '      if (false) {\n'),
    (AP, 'PUT does not record its id', '    if (opH !== null) {\n      try {', '    if (false) {\n      try {'),
    (AP, 'PUT records the old rev', "OPS_NEXT('?6', 'rev + 1', OPS_KEEP)", "OPS_NEXT('?6', 'rev', OPS_KEEP)"),
    (AP, 'the first PUT records rev 0', 'json_array(json_array(?6, 1))', 'json_array(json_array(?6, 0))'),
    (AP, 'every id is kept', "json_array_length(ops) >= ${keep} ", "json_array_length(ops) >= ${keep + 1000} "),
    (AP, 'a bad id is accepted on PUT', "if (opH !== null && !OP.test(opH)) return json({ error: 'bad-op' }, 400);", ''),
    (AP, 'a bad id is accepted on GET', 'ids.some(x => !OP.test(x))', 'false'),
    (AP, 'r1: any number of ids is asked', 'ids.length > OPS_ASK || ', ''),
    (AP, 'r1: GET answers only the first id', 'const ops = ids.map(', 'const ops = ids.slice(0, 1).map('),
    (AP, 'r1: GET never says from which rev the list can tell', 'opsFrom: row ? opsFloor(row.ops) : null', 'opsFrom: null'),
    (LB, 'r1: the floor is the newest record, not the oldest', '(m === null || x[1] < m)', '(m === null || x[1] > m)'),
    (AP, 'GET without the column fails', 'catch (e) { if (!noOps(e)) throw e; cols = false; }', 'catch (e) { throw e; }'),
    (AP, 'PUT without the column fails', 'catch (e) { if (!noOps(e)) throw e; r = await plain(); }', 'catch (e) { throw e; }'),
    (LB, 'any recorded id answers', 'x[0] === id && ', ''),
    (SY, 'the PUT does not send its id', ",'X-Op':op})", "})"),
    (SY, 'a landed upload is not the base', 'if(best){meta={sub:uid,rev:best.rev,base:best.sent,at:(meta&&meta.at)||null,dirty:true};mem={sub:uid,base:best.sent,rev:best.rev};staleBase=!writeMeta(meta)}', ''),
    (SY, 'an upload that cannot land any more is asked about forever', 'else if(o.rev===null&&rev>x.rev){pend=pend.filter(y=>y!==x);', 'else if(0){'),
    (SY, 'r1: a missing id is trusted outside the recorded range', 'if(!(Number.isInteger(g.body.opsFrom)&&x.rev+1>=g.body.opsFrom))voided=true', ''),
    (SY, 'an answer about another id is believed', 'const o=oks.find(y=>isObj(y)&&y.id===x.op);', 'const o=oks[0];'),
    (SY, 'r1: a 409 forgets every unresolved upload', 'pend=pend.filter(x=>x.op!==op);', 'pend=pend.filter(x=>x.sub!==uid);'),
    (SY, 'r1: a pass without a PUT forgets an upload that can still land', 'if(!opsSeen)pend=pend.filter(x=>x.sub!==uid);', 'pend=pend.filter(x=>x.sub!==uid);'),
    (SY, 'r1: a new upload replaces the unresolved one', 'pend.push({sub:uid,rev,op,sent:merged});', 'pend=[{sub:uid,rev,op,sent:merged}];'),
    (SY, 'r2: no fence while an upload can still land', 'canon(merged)!==canon(remote)||fence){', 'canon(merged)!==canon(remote)){'),
    (SY, 'r2: an evicted upload leaves no trace', '{const x=mine[0];pend=pend.filter(y=>y!==x);if(!evict.has(uid)||x.rev>evict.get(uid))evict.set(uid,x.rev)}', '{const x=mine[0];pend=pend.filter(y=>y!==x)}'),
    (SY, 'r2: an evicted upload never voids the base', 'if(!(oks&&won===evict.get(uid)+1))voided=true;', ''),
    (SY, 'r2: an evicted upload always voids the base', 'if(!(oks&&won===evict.get(uid)+1))voided=true;', 'voided=true;'),
    (SY, 'r2: a 200 at the evicted If-Match keeps it', 'if(evict.has(uid)&&evict.get(uid)<=rev)evict.delete(uid);', ''),
    (SY, 'r2: settled ignores uploads that can still land', "  if(pend.some(x=>x.sub===acc.sub)||evict.has(acc.sub))return {ok:false,why:'pending'};", ''),
    (SY, 'r3: the OPS_ASK limit counts every account', 'const mine=pend.filter(x=>x.sub===uid);', 'const mine=pend;'),
    (SY, 'r3: one eviction record for every account', 'evict.set(uid,x.rev)', 'evict.clear(),evict.set(uid,x.rev)'),
]


# Codex r2: with the fence, a completed pass never ends with an unresolved upload at the account's current rev (it uploads with that If-Match; a lost answer ends
# the pass offline), and every upload below that rev is resolved by the pass's GET. These two lines can then change no outcome through the public API: they are kept
# as a second guard and expected to survive. Named here so a survivor is never read as caught, and any OTHER survivor fails the proof.
EQUIV = {
    'r1: a pass without a PUT forgets an upload that can still land': 'the fence leaves nothing unresolved at the current rev when a pass completes',
    'r2: settled ignores uploads that can still land': 'settled() needs an ok pass, and an ok pass ends with nothing unresolved (the fence)',
}


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
