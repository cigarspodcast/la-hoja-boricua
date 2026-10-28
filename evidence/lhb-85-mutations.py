"""LHB-85 mutation proof: each mutation breaks one thing on a scratch copy of the worktree, runs the LHB-85 tests, and
must turn them red; the copy is restored after each. usage: python evidence/lhb-85-mutations.py WORKTREE SCRATCH"""
import os, re, shutil, subprocess, sys
from PIL import Image

WT, D = sys.argv[1], sys.argv[2]
if os.path.exists(D):
    shutil.rmtree(D)
shutil.copytree(WT, D, ignore=shutil.ignore_patterns('.git', 'node_modules'))
C = os.path.join(D, 'site', 'img', 'cigarros')


def edit(rel, old, new):
    p = os.path.join(D, rel)
    s = open(p, 'rb').read().decode('utf-8')
    assert s.count(old) == 1, (rel, old, s.count(old))
    open(p, 'wb').write(s.replace(old, new).encode('utf-8'))


def resave(name, size, q):
    p = os.path.join(C, name)
    Image.open(os.path.join(C, name.replace('_thumb-s.webp', '.webp'))).convert('RGB').resize(size).save(p, 'WEBP', quality=q)


M = [
    ('M1 one twin at 330 x 165', lambda: resave('turro-cartucho_thumb-s.webp', (330, 165), 75)),
    ('M2 one twin heavier than its large thumbnail (quality 100)', lambda: resave('yambo_a_oscuro_thumb-s.webp', (320, 160), 100)),
    ('M3 one twin missing', lambda: os.remove(os.path.join(C, 'galiz-spirit_thumb-s.webp'))),
    ('M4 one twin left out of the precache', lambda: edit('site/sw.js', ",'img/cigarros/hoja-boricua_thumb-s.webp'", '')),
    ('M5 the card asks for the large thumbnail as src', lambda: edit('site/app.js', '<img src="${esc(thumbS(f.thumb))}" srcset', '<img src="${esc(f.thumb)}" srcset')),
    ('M6 the card without the large candidate in srcset', lambda: edit('site/app.js', ' 320w, ${esc(f.thumb)} 600w"', ' 320w"')),
    ('M7 the card sizes says 100vw', lambda: edit('site/app.js', 'calc(50vw - 32px)"', '100vw"')),
    ('M8 the gallery back to the large thumbnail', lambda: edit('site/app.js', '<img src="${esc(thumbS(g.thumb))}" alt=""', '<img src="${esc(g.thumb)}" alt=""')),
    ('M9 thumbS returns its input', lambda: edit('site/app.js', ".replace(/_thumb\\.webp$/,'_thumb-s.webp');", ';')),
]
red = 0
for name, mut in M:
    snap = {}
    for rel in ('site/sw.js', 'site/app.js'):
        snap[rel] = open(os.path.join(D, rel), 'rb').read()
    imgs = {n: open(os.path.join(C, n), 'rb').read() for n in os.listdir(C) if n.endswith('_thumb-s.webp')}
    try:
        mut()
        r = subprocess.run(['node', '--test', '--test-timeout=60000', '--test-name-pattern=LHB-85', 'test/site.test.js'], cwd=D, capture_output=True, text=True, encoding='utf-8', errors='replace')
        fails = re.findall(r'^ℹ fail (\d+)', r.stdout, re.M)
        ok = r.returncode != 0 and fails and int(fails[-1]) > 0
        red += bool(ok)
        print('%-62s rc %d fail %s -> %s' % (name, r.returncode, fails[-1] if fails else '?', 'RED' if ok else 'SURVIVED'), flush=True)
    finally:
        for rel, b in snap.items():
            open(os.path.join(D, rel), 'wb').write(b)
        for n in [n for n in os.listdir(C) if n.endswith('_thumb-s.webp')]:
            os.remove(os.path.join(C, n))
        for n, b in imgs.items():
            open(os.path.join(C, n), 'wb').write(b)
r = subprocess.run(['node', '--test', '--test-timeout=60000', '--test-name-pattern=LHB-85', 'test/site.test.js'], cwd=D, capture_output=True, text=True, encoding='utf-8', errors='replace')
print('baseline after restore: rc %d' % r.returncode)
print('RESULT %d of %d mutations red' % (red, len(M)))
