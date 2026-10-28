"""LHB-95 proof: each mutation moves a rendered width on a scratch copy of site/, runs tools/widths.mjs against it, and
must make it exit 1 with at least one FAIL line; the copy is restored after each. The unmutated copy must pass.
usage: python evidence/lhb-95-mutations.py WORKTREE SCRATCH"""
import os, re, shutil, subprocess, sys

WT, D = sys.argv[1], sys.argv[2]
if os.path.exists(D):
    shutil.rmtree(D)
shutil.copytree(os.path.join(WT, 'site'), os.path.join(D, 'site'))
TOOL = os.path.join(WT, 'tools', 'widths.mjs')
FILES = ('site/styles.css', 'site/app.js')


def edit(rel, old, new):
    p = os.path.join(D, rel)
    s = open(p, 'rb').read().decode('utf-8')
    assert s.count(old) == 1, (rel, old, s.count(old))
    open(p, 'wb').write(s.replace(old, new).encode('utf-8'))


def append(rel, text):
    p = os.path.join(D, rel)
    open(p, 'ab').write(text.encode('utf-8'))


def run():
    r = subprocess.run(['node', TOOL, os.path.join(D, 'site')], capture_output=True, text=True, encoding='utf-8', errors='replace')
    fails = [l for l in r.stdout.splitlines() if l.startswith('FAIL ')]
    last = r.stdout.strip().splitlines()[-1] if r.stdout.strip() else '?'
    return r.returncode, fails, last


M = [
    ('M1 the ticket example: card padding 9px', lambda: append('site/styles.css', '\n.card{padding:9px 9px 0}\n')),
    ('M2 the ticket example: switch min-width 0', lambda: append('site/styles.css', '\n.lang-switch{min-width:0}\n')),
    ('M3 a media rule narrows the card at 412', lambda: append('site/styles.css', '\n@media (min-width:400px) and (max-width:420px){.grid .card .ph img{width:90%}}\n')),
    ('M4 SIZES_GRID below the drawn width (blurry)', lambda: edit('site/app.js', "const SIZES_GRID='(min-width:760px) 211px,", "const SIZES_GRID='(min-width:760px) 205px,")),
    ('M5 SIZES_GRID far above the drawn width', lambda: edit('site/app.js', "calc(50vw - 45px)'", "calc(50vw - 30px)'")),
    ('M6 SIZES_MINI below the drawn width', lambda: edit('site/app.js', "SIZES_MINI='116px'", "SIZES_MINI='110px'")),
    ('M7 the page scrolls sideways at 320', lambda: append('site/styles.css', '\n.top-actions{margin-right:-40px}\n')),
]
red = 0
for name, mut in M:
    snap = {rel: open(os.path.join(D, rel), 'rb').read() for rel in FILES}
    try:
        mut()
        rc, fails, last = run()
        ok = rc == 1 and len(fails) > 0
        red += ok
        print('%-48s rc %d fails %d -> %s' % (name, rc, len(fails), 'RED' if ok else 'SURVIVED'), flush=True)
        for l in fails[:3]:
            print('    ' + l, flush=True)
    finally:
        for rel, b in snap.items():
            open(os.path.join(D, rel), 'wb').write(b)
rc, fails, last = run()
print('baseline after restore: rc %d, %s' % (rc, last))
print('RESULT %d of %d mutations red' % (red, len(M)))
