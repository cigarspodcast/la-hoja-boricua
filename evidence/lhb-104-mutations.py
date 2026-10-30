"""LHB-104 proof, on a scratch copy of the worktree: each part of the shared record of unanswered uploads (lhb_mihoja_v1_pend) broken one
at a time, each expected to turn the LHB-104 (or LHB-80, LHB-28) tests red. The copy is restored after each.
usage: python evidence/lhb-104-mutations.py WORKTREE SCRATCH"""
import os, shutil, subprocess, sys

WT, D = sys.argv[1], sys.argv[2]
if os.path.exists(D):
    shutil.rmtree(D)
shutil.copytree(WT, D, ignore=shutil.ignore_patterns('.git', 'node_modules', 'evidence'))
PAT = 'LHB-104|LHB-80|LHB-31|LHB-28'
SY = 'site/sync.js'

MUTS = [
    (SY, 'settled ignores the other tabs (before LHB-104)', "  try{if(shRead().some(e=>e.s===acc.sub))return {ok:false,why:'pending'}}catch(e){return {ok:false,why:'pending'}}", ''),
    (SY, 'the upload is not recorded for the other tabs', 'const op=newOp(),sk=shAdd(uid,rev,op);', 'const op=newOp(),sk=null;'),
    (SY, 'no fence for an upload of another tab', '||evict.get(uid)===rev||shLive;', '||evict.get(uid)===rev;'),
    (SY, 'a landed upload of another tab keeps the base', 'if(o&&Number.isInteger(o.rev)&&o.rev>0){voided=true;continue}', 'if(o&&Number.isInteger(o.rev)&&o.rev>0){continue}'),
    (SY, 'an entry nobody can answer for keeps the base', '     if(wonAt.has(e.r))continue;\n     voided=true}', '     if(wonAt.has(e.r))continue;\n     }'),
    (SY, 'the uploads of other tabs are never asked about', 'other=room?oth.slice(-room).map(e=>e.o):[]', 'other=[]'),
    (SY, 'more ids are asked than the server takes', 'other=room?oth.slice(-room).map(e=>e.o):[]', 'other=oth.slice(-OPS_ASK).map(e=>e.o)'),
    (SY, 'this tab counts its own dropped uploads as another tab', 'if(e.o&&(myOps.has(e.o)||mineOps.has(e.o)))continue;', 'if(e.o&&mineOps.has(e.o))continue;'),
    (SY, 'a 200 leaves the older uploads of the other tabs listed', '   if(clean>=0)try{for(const e of shRead())if(e.s===uid&&e.r<=clean)shDel(e)}catch(e){}', ''),
    (SY, 'a clear rejection leaves the upload listed', '{pend=pend.filter(x=>x.op!==op);if(sk===PEND+op)shDel({k:sk})}', '{pend=pend.filter(x=>x.op!==op)}'),
    (SY, 'an upload past the account rev stays listed', 'if(e.r>=rev){if(e.r===rev&&live.has(e.k))shLive=true;continue}', 'if(true){if(e.r===rev&&live.has(e.k))shLive=true;continue}'),
    (SY, 'r1: sign-out does not look at the uploads again behind its fence', 'if(sh.some(e=>subs.includes(e.s)))return back()', ''),
    (SY, 'r1: the evidence is removed before the base is struck', 'if(gone.length&&(!(voided||staleBase)||poison())){', 'if(gone.length){'),
    (SY, 'r1: no bound on the uploads listed for one If-Match', 'const full=shRead().filter(e=>e.s===uid&&e.r===rev).length>=OPS_ASK;', 'const full=false;'),
    (SY, 'r1: no second look at the fence after the upload is listed', "  if(fenceOn()){if(!full){try{D.ls.remove(k)}catch(e){}}throw new Error('fenced')}", ''),
    ('site/hoja.js', 'r1: the page gives the engine no list of keys', 'keys:()=>{const o=[];for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);if(k!=null)o.push(k)}return o}', 'keys:()=>[]'),
    (SY, 'r2: the entries seen before the GET are not judged after it', 'for(const e of [...seen.values()]){', 'for(const e of now.filter(x=>x.s===uid)){'),
    (SY, 'r2: the base is read before any entry is seen', 'const seen=new Map(),see=l=>{for(const e of l)if(e.s===uid)seen.set(e.k,e)};see(shRead());', 'const seen=new Map(),see=l=>{for(const e of l)if(e.s===uid)seen.set(e.k,e)};'),
    (SY, 'r2: entries are removed while the new base is not recorded', '(!(voided||staleBase)||poison())', '(!voided||poison())'),
    (SY, 'r2: an unreadable fence counts as down', 'const fenceOn=()=>{try{return fencedHard()}catch(e){return true}};', 'const fenceOn=()=>fenced();'),
    (SY, 'r3: the base is not read again after the GET', 'if(mr!==metaRaw){metaRaw=mr;meta=pm(mr);if(meta&&Number.isInteger(meta.rev)&&meta.rev>rev)continue}', ''),
    (SY, 'r3: a 200 removes the entries before the base is recorded', '    clean=rev}', '    for(const e of shRead())if(e.s===uid&&e.r<=rev)shDel(e)}'),
    (SY, 'r3: an upload known to have landed at that If-Match does not clear the others', '     if(wonAt.has(e.r))continue;', ''),
    (SY, 'r3: one overflow key per upload, not shared', "const k=full?PEND+'x.'+rev+'.'+uid:PEND+op", "const k=full?PEND+'x.'+rev+'.'+uid+'.'+op:PEND+op"),
    (SY, 'r3: a pass whose minimal meta does not fit stops instead of keeping the entries', 'if(gone.length&&(!(voided||staleBase)||poison())){', 'if(gone.length&&(voided||staleBase)&&!poison())return {fail:\'storage\'};if(gone.length){'),
    (SY, 'r4: a GET answer older than the recorded base is used', 'if(meta&&Number.isInteger(meta.rev)&&meta.rev>rev)continue', ''),
    (SY, 'r4: the final meta overwrites a newer base', "if(m2&&Number.isInteger(m2.rev)&&m2.rev>newRev)return {fail:'conflict'}", ''),
    (SY, 'r5: a late answer for an older upload replaces a newer base', 'if(best&&!(meta&&Number.isInteger(meta.rev)&&meta.rev>best.rev)){', 'if(best){'),
    (SY, 'r5: an unreadable final meta read counts as unchanged', "catch(e){return {fail:'storage'}}if(mr!==metaRaw){const m2", 'catch(e){mr=metaRaw}if(mr!==metaRaw){const m2'),
    (SY, 'r6: the poisoned meta forgets the rev', 'return writeMeta({sub:uid,rev:topRev,base:null', 'return writeMeta({sub:uid,rev:0,base:null'),
    (SY, 'r6: the poisoned meta ignores a newer stored rev', 'try{const x=pm(D.ls.get(META));top(x&&x.rev)}catch(e){}', ''),
    (SY, 'r6: changed() replaces an unreadable meta', 'let m=null,ch=false,bad=false;try{m=readMetaHard()}catch(e){bad=true}', 'let m=readMeta(),ch=false,bad=false;'),
    (SY, 'r6: setOwner() replaces an unreadable meta', 'const m=readMetaHard();if(!m||m.sub!==uid)', 'const m=readMeta();if(!m||m.sub!==uid)'),
    (SY, 'r7: memOk ignores a newer poisoned meta', '!(meta&&Number.isInteger(meta.rev)&&meta.rev>mem.rev)', '!(meta&&meta.base&&meta.rev>mem.rev)'),
    (SY, 'r7: a meta below the high-water mark is trusted', '{...m,rev:h,base:null,seed:null,was:m.base}:m', 'm:m'),
    (SY, 'r7: the base learned from an upload writes no high-water key', 'staleBase=!(hwPut(uid,best.rev)&&writeMeta(meta))', 'staleBase=!writeMeta(meta)'),
    (SY, 'r7: the final base writes no high-water key', 'hwPut(uid,newRev)&&', 'true&&'),
    (SY, 'r7: older high-water keys are kept', '   try{for(const x of hwKeys(uid))if(x.r<newRev)D.ls.remove(x.k)}catch(e){}', ''),
    (SY, 'r7: sign-out leaves the high-water keys', 'for(const u of subs){try{for(const x of hwKeys(u))D.ls.remove(x.k)}catch(e){ok=false}}', ''),
    (SY, 'r7: the lost-copy check ignores the base set aside', 'const wb=meta&&(meta.base||meta.was)', 'const wb=meta&&meta.base'),
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
