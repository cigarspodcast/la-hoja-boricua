"""LHB-97 proof, on a scratch copy of the worktree.
First the hole the ticket names: the code and tests of f487421 (before this ticket) with the ticket's focus mutation, which the old sheet
mock let pass. Then this branch: the code of f487421 put back, and each part of the fix broken one at a time, each expected red.
The copy is restored after each.
usage: python evidence/lhb-97-mutations.py WORKTREE SCRATCH"""
import os, re, shutil, subprocess, sys

WT, D = sys.argv[1], sys.argv[2]
BASE = 'f487421'
if os.path.exists(D):
    shutil.rmtree(D)
shutil.copytree(WT, D, ignore=shutil.ignore_patterns('.git', 'node_modules', 'evidence'))
PAT = 'LHB-97|LHB-58'
HJ, TS = 'site/hoja.js', 'test/site.test.js'
FILES = (HJ, TS)
FOCUS_OLD = "if(kf){const n=pfFind(o,d,kf);"
FOCUS_BAD = "if(kf&&!document.body.classList.contains('sheet-on')){const n=pfFind(o,d,kf);"


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


# the hole: before this ticket, the ticket's mutation passes every profile test
def hole():
    base(HJ)
    base(TS)
    edit(HJ, FOCUS_OLD, FOCUS_BAD)


red, rc, p, f = trial('hole', hole)
print('%-74s rc %d pass %s fail %s -> %s' % ('HOLE %s code and tests, focus skipped while a sheet is open' % BASE, rc, p, f, 'RED' if red else 'GREEN (the hole the ticket names)'), flush=True)
hole_ok = not red

M = [
    ('F0 the code of %s (key by what the card shows)' % BASE, lambda: base(HJ)),
    ('F1 the ticket: focus skipped while a sheet is open', lambda: edit(HJ, FOCUS_OLD, FOCUS_BAD)),
    ('F2 pfKey/pfFind key by what the card shows again', lambda: (
        edit(HJ, "const k=b&&o.d&&o.d.keys&&o.d.keys[+b.dataset.pfres];return k?{res:k}:null};", "const e=b&&o.d&&o.d.resenas[+b.dataset.pfres];return e?{res:JSON.stringify(e)}:null};"),
        edit(HJ, "const i=k.res?d.keys.indexOf(k.res):-1;", "const i=k.res?d.resenas.findIndex(e=>JSON.stringify(e)===k.res):-1;"))),
    ('F3 no count for twins with the same key', lambda: edit(HJ, "return {e,k:k+'#'+c}", "return {e,k}")),
    ('F4 the id is ignored (key by what the card shows, counted)', lambda: edit(HJ, "typeof x.id==='string'&&x.id?'id:'+x.id:'e:'+JSON.stringify(e)", "'e:'+JSON.stringify(e)")),
    ('F5 the key leaks into the reviews shown', lambda: edit(HJ, "const myResenas=s=>myResenasK(s).map(x=>x.e);", "const myResenas=s=>myResenasK(s).map(x=>({...x.e,k:x.k}));")),
]
n_red = 0
for name, mut in M:
    red, rc, p, f = trial(name, mut)
    n_red += bool(red)
    print('%-74s rc %d pass %s fail %s -> %s' % (name, rc, p, f, 'RED' if red else 'SURVIVED'), flush=True)
r = runp()
p, f = tally(r)
print('baseline after restore: rc %d pass %s fail %s' % (r.returncode, p, f))
print('hole reproduced on %s: %s' % (BASE, 'yes' if hole_ok else 'NO'))
print('RESULT %d of %d mutations red' % (n_red, len(M)))
