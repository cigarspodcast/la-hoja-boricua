"""LHB-92 mutation proof: each mutation breaks one thing on a scratch copy of the worktree, runs the LHB-92 tests and the
LHB-87 (Codex r3) resize test, and must turn them red; the copy is restored after each.
usage: python evidence/lhb-92-mutations.py WORKTREE SCRATCH [M9,M10,...]"""
import os, re, shutil, subprocess, sys

WT, D = sys.argv[1], sys.argv[2]
if os.path.exists(D):
    shutil.rmtree(D)
shutil.copytree(WT, D, ignore=shutil.ignore_patterns('.git', 'node_modules'))
PAT = 'LHB-92|Codex r3'
FILES = ('site/app.js', 'site/styles.css', 'site/hoja.js')


def edit(rel, old, new):
    p = os.path.join(D, rel)
    s = open(p, 'rb').read().decode('utf-8')
    assert s.count(old) == 1, (rel, old, s.count(old))
    open(p, 'wb').write(s.replace(old, new).encode('utf-8'))


def append(rel, text):
    p = os.path.join(D, rel)
    open(p, 'ab').write(text.encode('utf-8'))


LZ = "${i<EAGER_CARDS?'':'loading=\"lazy\" '}"
M = [
    ('M1 no card is lazy', lambda: edit('site/app.js', LZ, '')),
    ('M2 every card is lazy', lambda: edit('site/app.js', LZ, 'loading="lazy" ')),
    ('M3 the condition inverted', lambda: edit('site/app.js', LZ, "${i<EAGER_CARDS?'loading=\"lazy\" ':''}")),
    ('M4 off by one (4 eager)', lambda: edit('site/app.js', LZ, "${i<=EAGER_CARDS?'':'loading=\"lazy\" '}")),
    ('M5 first row of 2, not 3', lambda: edit('site/app.js', 'const EAGER_CARDS=3;', 'const EAGER_CARDS=2;')),
    ('M6 lazy img without its width and height', lambda: edit('site/app.js', 'width="600" height="300" ' + LZ, LZ)),
    ('M7 the catalog grid drops the index', lambda: edit('site/app.js', 'class="grid">${list.map(cigarCard).join', 'class="grid">${list.map(c=>cigarCard(c)).join')),
    ('M8 a Mi Hoja grid drops the index', lambda: edit('site/hoja.js', "<div class=\"grid\">${cs.map(A.cigarCard).join('')}</div>`:''}", "<div class=\"grid\">${cs.map(c=>A.cigarCard(c)).join('')}</div>`:''}")),
    ('M9 pinned card CSS: mini card 150px', lambda: edit('site/styles.css', '.mini-row .card{flex:none;width:140px}', '.mini-row .card{flex:none;width:150px}')),
    ('M10 pinned card CSS: card padding 9px', lambda: edit('site/styles.css', '.card{background:var(--card);padding:7px 7px 0}', '.card{background:var(--card);padding:9px 9px 0}')),
    ('M11 pinned card CSS: a new .card .ph rule', lambda: append('site/styles.css', '\n.card .ph{border-width:8px}\n')),
    ('M12 grid 4 columns from 620px', lambda: edit('site/styles.css', '@media(min-width:620px){.grid{grid-template-columns:repeat(3,minmax(0,1fr))}}', '@media(min-width:620px){.grid{grid-template-columns:repeat(4,minmax(0,1fr))}}')),
    ('M13 switch: min-width:0 !important appended', lambda: append('site/styles.css', '\n.lang-switch{min-width:0!important}\n')),
    ('M14 switch: a later padding override', lambda: append('site/styles.css', '\n.top-actions .lang-switch{padding:0 4px}\n')),
    ('M15 fitPop updates before the new height', lambda: edit('site/app.js', '{p.options.maxHeight=popMaxH(map.getSize().y);p.update()}', '{p.update();p.options.maxHeight=popMaxH(map.getSize().y)}')),
]
ONLY = sys.argv[3].split(',') if len(sys.argv) > 3 else None
if ONLY:
    M = [x for x in M if x[0].split()[0] in ONLY]
red = 0
for name, mut in M:
    snap = {rel: open(os.path.join(D, rel), 'rb').read() for rel in FILES}
    try:
        mut()
        r = subprocess.run(['node', '--test', '--test-timeout=60000', '--test-name-pattern=' + PAT, 'test/site.test.js'], cwd=D, capture_output=True, text=True, encoding='utf-8', errors='replace')
        fails = re.findall(r'^ℹ fail (\d+)', r.stdout, re.M)
        ok = r.returncode != 0 and fails and int(fails[-1]) > 0
        red += bool(ok)
        print('%-48s rc %d fail %s -> %s' % (name, r.returncode, fails[-1] if fails else '?', 'RED' if ok else 'SURVIVED'), flush=True)
    finally:
        for rel, b in snap.items():
            open(os.path.join(D, rel), 'wb').write(b)
r = subprocess.run(['node', '--test', '--test-timeout=60000', '--test-name-pattern=' + PAT, 'test/site.test.js'], cwd=D, capture_output=True, text=True, encoding='utf-8', errors='replace')
n = re.findall(r'^ℹ pass (\d+)', r.stdout, re.M)
print('baseline after restore: rc %d pass %s (the 3 LHB-92 tests and the LHB-87 r3 test)' % (r.returncode, n[-1] if n else '?'))
print('RESULT %d of %d mutations red' % (red, len(M)))
