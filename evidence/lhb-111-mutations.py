"""LHB-111 proof, on a scratch copy of the worktree: each mutant brings back one piece of art from outside the line-art set, and the
LHB-111 test must turn red. The copy is restored after each.
usage: python evidence/lhb-111-mutations.py WORKTREE SCRATCH"""
import os, re, shutil, subprocess, sys

WT, D = sys.argv[1], sys.argv[2]
if os.path.exists(D):
    shutil.rmtree(D)
shutil.copytree(WT, D, ignore=shutil.ignore_patterns('.git', 'node_modules', 'evidence'))
PAT = 'LHB-111'
MUTS = [
    ('site/hoja.js', 'a header with a drawing outside the set', "VBArt.banda())}", "VBArt.leaf('#8fd162'))}"),
    ('site/app.js', 'a photo-less cigar card without the silhouette', ':`<div class="ph sin-foto" ${c.foto?`data-photo="${esc(c.foto)}"`:\'\'}>${cigarSVG(c)}</div>`', ':`<div class="ph sin-foto" ${c.foto?`data-photo="${esc(c.foto)}"`:\'\'}>${VBArt.leaf(\'#8fd162\')}</div>`'),
    ('site/hoja.js', 'the humidor without the silhouette', "${VBArt.silueta('')}</span>`}", "${VBArt.leaf('#a9c487')}</span>`}"),
    ('site/app.js', 'a decorative bitmap back in a view', "${cigarSVG(c)}</div>`)(fotoOf(c))}", "${cigarSVG(c)}<img src=\"img/guagua/guagua_recorte.webp\" alt=\"\"></div>`)(fotoOf(c))}"),
    ('site/art.js', 'a drawing with its own colour', '<circle class="ac" cx="98" cy="22" r="8"/>', '<circle fill="#ffd25a" cx="98" cy="22" r="8"/>'),
    ('site/art.js', 'a drawing without its accent', '<rect class="ac" x="42" y="54" width="36" height="6" rx="3"/>', '<rect x="42" y="54" width="36" height="6" rx="3"/>'),
    ('site/styles.css', 'the empty state with a different drawing', "M36 68H64V80H36Z", "M36 68H64V82H36Z"),
    ('site/styles.css', 'the silhouette ink that follows the theme on the fixed light frame', '.lart.sil,.lart.aqui{--art-ink:var(--fixed-text)}', '.lart.aqui{--art-ink:var(--fixed-text)}'),
]


def runp():
    r = subprocess.run(['node', '--test', '--test-timeout=60000', '--test-name-pattern=' + PAT, 'test/site.test.js'], cwd=D, capture_output=True, text=True, encoding='utf-8', errors='replace')
    out = r.stdout + r.stderr
    g = lambda k: int((re.search(r'^ℹ ' + k + r' (\d+)', out, re.M) or [0, 0])[1])
    return {'pass': g('pass'), 'fail': g('fail')}


def edit(rel, old, new):
    p = os.path.join(D, rel)
    s = open(p, 'rb').read().decode('utf-8')
    assert s.count(old) >= 1, (rel, old[:80], s.count(old))
    open(p, 'wb').write(s.replace(old, new).encode('utf-8'))


t = runp()
print('baseline (no mutation): pass %d fail %d' % (t['pass'], t['fail']))
assert t['fail'] == 0 and t['pass'] > 0
red = 0
for rel, name, a, b in MUTS:
    edit(rel, a, b)
    t = runp()
    ok = t['fail'] > 0
    red += ok
    print('%-72s %s (fail %d)' % (name, 'RED (caught)' if ok else 'GREEN (survived)', t['fail']))
    shutil.copy(os.path.join(WT, rel), os.path.join(D, rel))
print('RESULT %d of %d red' % (red, len(MUTS)))
sys.exit(0 if red == len(MUTS) else 1)
