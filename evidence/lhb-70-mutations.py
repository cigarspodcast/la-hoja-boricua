"""LHB-70 proof, on a scratch copy of the worktree: break the icon set one way at a time and see the LHB-70 / v13 tests red.
usage: python evidence/lhb-70-mutations.py WORKTREE SCRATCH"""
import io, os, re, shutil, subprocess, sys
from PIL import Image

WT, D = sys.argv[1], sys.argv[2]
if os.path.exists(D):
    shutil.rmtree(D)
shutil.copytree(WT, D, ignore=shutil.ignore_patterns('.git', 'node_modules', 'evidence'))
PAT = 'LHB-70|v13'
P = lambda rel: os.path.join(D, rel)


def runp():
    return subprocess.run(['node', '--test', '--test-timeout=60000', '--test-name-pattern=' + PAT, 'test/site.test.js'], cwd=D, capture_output=True, text=True, encoding='utf-8', errors='replace')


def tally(r):
    f = re.findall(r'^ℹ fail (\d+)', r.stdout, re.M)
    return f[-1] if f else '?'


def delete(rel):
    os.remove(P(rel))


def resize(rel, n):
    Image.open(P(rel)).resize((n, n)).save(P(rel))


def sw_extra():
    s = open(P('site/sw.js'), encoding='utf-8').read()
    open(P('site/sw.js'), 'w', encoding='utf-8').write(s.replace("'icons/favicon-16.png',", "'icons/favicon-16.png','icons/favicon-64.png',", 1))


def old_svg():
    b = subprocess.run(['git', 'show', 'dc2361e:site/icons/icon.svg'], cwd=WT, capture_output=True).stdout
    open(P('site/icons/icon.svg'), 'wb').write(b)


def og_small():
    Image.open(P('site/og.jpg')).resize((1200, 600)).save(P('site/og.jpg'), quality=80)


def no_link():
    s = open(P('site/index.html'), encoding='utf-8').read()
    open(P('site/index.html'), 'w', encoding='utf-8').write(re.sub(r'<link rel="icon" type="image/png" sizes="16x16" href="icons/favicon-16.png">\r?\n', '', s, count=1))


M = [
    ('I1 a listed icon deleted (icon-maskable-512.png)', lambda: delete('site/icons/icon-maskable-512.png')),
    ('I2 an icon at the wrong size (icon-192.png at 180)', lambda: resize('site/icons/icon-192.png', 180)),
    ('I3 the cache lists an icon that is not there', sw_extra),
    ('I4 an icon present but not cached (favicon-16.png deleted from the list)', lambda: (lambda s: open(P('site/sw.js'), 'w', encoding='utf-8').write(s.replace("'icons/favicon-16.png',", '', 1)))(open(P('site/sw.js'), encoding='utf-8').read())),
    ('I5 the old leaf-and-flag icon.svg', old_svg),
    ('I6 the share image at 1200 by 600', og_small),
    ('I7 index.html without the 16 px favicon', no_link),
]
FILES = ['site/sw.js', 'site/index.html', 'site/og.jpg'] + ['site/icons/' + f for f in os.listdir(P('site/icons'))]
red = 0
for name, mut in M:
    snap = {rel: open(P(rel), 'rb').read() for rel in FILES}
    try:
        mut()
        r = runp()
        ok = r.returncode != 0 and tally(r) not in ('?', '0')
        red += ok
        print('%-72s rc %d fail %s -> %s' % (name, r.returncode, tally(r), 'RED' if ok else 'SURVIVED'), flush=True)
    finally:
        for rel, b in snap.items():
            open(P(rel), 'wb').write(b)
r = runp()
print('baseline after restore: rc %d fail %s' % (r.returncode, tally(r)))
print('RESULT %d of %d mutations red' % (red, len(M)))
