"""LHB-97 on facelift (after the merge b956eb5), on a scratch copy of the worktree. Facelift's sheet() (LHB-64) always takes focus into the
sheet, so the HOJA58 mock follows it there and the ticket's focus mutation (F1) is unreachable on this branch: it is run and expected to
survive. Every other part of the fix is broken one at a time and expected red; F0 puts back facelift's hoja.js from before the merge.
usage: python evidence/facelift-lhb97-mutations.py WORKTREE SCRATCH"""
import os, re, shutil, subprocess, sys

WT, D = sys.argv[1], sys.argv[2]
BASE = 'dc2361e'
if os.path.exists(D):
    shutil.rmtree(D)
shutil.copytree(WT, D, ignore=shutil.ignore_patterns('.git', 'node_modules', 'evidence'))
PAT = 'LHB-97|LHB-58|LHB-64'
HJ, TS = 'site/hoja.js', 'test/site.test.js'
FILES = (HJ, TS)
FOCUS_OLD = "if(kf){const n=pfFind(o,d,kf);"
KEY = "JSON.stringify([typeof x.id==='string'&&x.id?x.id:null,e])"
FOCUS_BAD ="if(kf&&!document.body.classList.contains('sheet-on')){const n=pfFind(o,d,kf);"


def runp():
    return subprocess.run(['node', '--test', '--test-timeout=60000', '--test-name-pattern=' + PAT, 'test/site.test.js'], cwd=D, capture_output=True, text=True, encoding='utf-8', errors='replace')


def edit(rel, old, new):
    p = os.path.join(D, rel)
    s = open(p, 'rb').read().decode('utf-8')
    if '\r\n' in s:
        old, new = old.replace('\r\n', '\n').replace('\n', '\r\n'), new.replace('\r\n', '\n').replace('\n', '\r\n')
    assert s.count(old) == 1, (rel, old[:80], s.count(old))
    open(p, 'wb').write(s.replace(old, new).encode('utf-8'))


def base(rel):
    b = subprocess.run(['git', 'show', BASE + ':' + rel], cwd=WT, capture_output=True).stdout
    assert b, rel
    open(os.path.join(D, rel), 'wb').write(b)


def tally(r):
    p = re.findall(r'^ℹ pass (\d+)', r.stdout, re.M)
    f = re.findall(r'^ℹ fail (\d+)', r.stdout, re.M)
    return (p[-1] if p else '?'), (f[-1] if f else '?')


def trial(name, mut):
    snap = {rel: open(os.path.join(D, rel), 'rb').read() for rel in FILES}
    try:
        mut()
        r = runp()
        p, f = tally(r)
        return r.returncode != 0 and f not in ('?', '0'), r.returncode, p, f
    finally:
        for rel, b in snap.items():
            open(os.path.join(D, rel), 'wb').write(b)


M = [
    ('F0 the code of %s (key by what the card shows)' % BASE, lambda: base(HJ)),
    ('F2 pfKey/pfFind key by what the card shows again', lambda: (
        edit(HJ, "const k=b&&o.d&&o.d.keys&&o.d.keys[+b.dataset.pfres];return k?{res:k}:null};", "const e=b&&o.d&&o.d.resenas[+b.dataset.pfres];return e?{res:JSON.stringify(e)}:null};"),
        edit(HJ, "const i=k.res?d.keys.indexOf(k.res):-1;", "const i=k.res?d.resenas.findIndex(e=>JSON.stringify(e)===k.res):-1;"))),
    ('F3 no count for twins with the same key', lambda: edit(HJ, "return {e,k:k+'#'+c}", "return {e,k}")),
    ('F4 the id is ignored (key by what the card shows, counted)', lambda: edit(HJ, KEY, "JSON.stringify([null,e])")),
    ('F6 Codex r1: the id alone, counted (order acts as id for a shared id)', lambda: edit(HJ, KEY, "typeof x.id==='string'&&x.id?'id:'+x.id:'e:'+JSON.stringify(e)")),
    ('F5 the key leaks into the reviews shown', lambda: edit(HJ, "const myResenas=s=>myResenasK(s).map(x=>x.e);", "const myResenas=s=>myResenasK(s).map(x=>({...x.e,k:x.k}));")),
]
n_red = 0
for name, mut in M:
    red, rc, p, f = trial(name, mut)
    n_red += bool(red)
    print('%-74s rc %d pass %s fail %s -> %s' % (name, rc, p, f, 'RED' if red else 'SURVIVED'), flush=True)
red, rc, p, f = trial('F1', lambda: edit(HJ, FOCUS_OLD, FOCUS_BAD))
print('%-74s rc %d pass %s fail %s -> %s' % ('F1 the ticket: focus skipped while a sheet is open (unreachable here)', rc, p, f, 'RED' if red else 'SURVIVED, expected: the sheet holds focus on facelift'), flush=True)
r = runp()
p, f = tally(r)
print('baseline after restore: rc %d pass %s fail %s' % (r.returncode, p, f))
print('RESULT %d of %d mutations red' % (n_red, len(M)))
