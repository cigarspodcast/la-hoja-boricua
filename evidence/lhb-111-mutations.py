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
    ('site/app.js', 'Codex r1: a coloured SVG in the header helper', '<div class="sec-art">${art}</div></header>`;', '<div class="sec-art">${art}<svg viewBox="0 0 50 50"><circle cx="25" cy="25" r="20" fill="#e33"/></svg></div></header>`;'),
    ('site/404.html', 'Codex r1: a decorative SVG on a static page', '</body>', '<svg viewBox="0 0 50 50"><circle cx="25" cy="25" r="20" fill="#e33"/></svg></body>'),
    ('site/styles.css', 'Codex r1: a bitmap through CSS', '.lart{', '.hero::after{background:url(img/hero/banner.webp)}.lart{'),
    ('site/styles.css', 'Codex r1: the accent not painted', '.lart .ac{fill:var(--art-ac)}', '.lart .ac{}'),
    ('site/styles.css', 'Codex r1: the empty state without its accent', 'background:radial-gradient(7px 4.9px at 50.4px 22.4px,var(--warm) 100%,var(--on-surface) 100%);', 'background:var(--on-surface);'),
    ('site/404.html', 'Codex r2: a coloured SVG with an icon viewBox on a static page', '</body>', '<svg style="width:200px;height:200px" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="11" fill="red"/><circle cx="12" cy="12" r="5" fill="blue"/></svg></body>'),
    ('site/u.css', 'Codex r2: an SVG background through u.css', ':root{', 'body{background:url("data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22%3E%3Ccircle r=%2250%22 fill=%22red%22/%3E%3C/svg%3E")}:root{'),
    ('site/hoja.js', 'Codex r2: a coloured SVG with an icon viewBox in a template', 'const CAL_ICO=', 'const CAL_X=`<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="11" fill="#e33"/></svg>`;const CAL_ICO='),
    ('site/404.html', 'Codex r3: a sized SVG with single-quoted colours and an icon viewBox on a static page', '</body>', '<svg width="200" height="200" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="11" fill=\'red\'/><circle cx="12" cy="12" r="5" fill=\'blue\'/></svg></body>'),
    ('site/hoja.js', 'Codex r3: an unquoted colour in an icon-shaped SVG in a template', 'const CAL_ICO=', 'const CAL_X=`<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="11" fill=red /></svg>`;const CAL_ICO='),
    ('site/app.js', 'Codex r3: an icon-shaped SVG with a size of its own in the header helper', '<div class="sec-art">${art}</div></header>`;', '<div class="sec-art">${art}<svg width="240" height="240" viewBox="0 0 24 24"><path d="M2 2h20v20H2z"/></svg></div></header>`;'),
    ('site/404.html', 'Codex r4: a single-quoted SVG data URI image on a static page', '</body>', '<img alt="" src=\'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg"%3E%3Ccircle cx="50" cy="50" r="40" fill="red"/%3E%3C/svg%3E\'></body>'),
    ('site/404.html', 'Codex r4: an unquoted decorative image on a static page', '</body>', '<img alt="" src=../img/guagua/campo.webp></body>'),
    ('site/404.html', 'Codex r4: a decorative image through picture and source srcset', '</body>', '<picture><source srcset="img/guagua/campo.webp 1x"><img alt="" src="icons/icon.svg"></picture></body>'),
    ('site/hoja.js', 'Codex r4: a single-quoted decorative image in a template', 'const CAL_ICO=', 'const CAL_X=`<img alt="" src=\'img/guagua/campo.webp\'>`;const CAL_ICO='),
    ('site/app.js', 'Codex r4: a decorative bitmap set from script', 'const thumbS=', 'const LHB_X=()=>{const i=new Image();i.src=\'img/guagua/campo.webp\';return i};const thumbS='),
    ('site/hoja.js', 'Codex r4: a decorative image inside an attribute that comes and goes', 'const CAL_ICO=', 'const CAL_X=x=>`<span ${x?\'data-bg="img/guagua/campo.webp"\':\'\'}></span>`;const CAL_ICO='),
    ('site/app.js', 'Codex r4: a second image data URI in a script', 'const thumbS=', 'const LHB_X=\'data:image/png;base64,iVBORw0KGgo=\';const thumbS='),
    ('site/404.html', 'Codex r5: an inline script that draws a data URI image on a static page', '</body>', '<script>const decoration=new Image();decoration.alt=\'\';decoration.src=\'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"%3E%3Ccircle cx="50" cy="50" r="40" fill="red"/%3E%3C/svg%3E\';document.body.append(decoration);</script></body>'),
    ('site/404.html', 'Codex r5: a decorative background set by a handler attribute', '<body', '<body onload="document.body.style.backgroundImage=\'url(img/adorno.webp)\'"'),
    ('site/sync.js', 'Codex r5: a decorative image named in a script outside the five', '/* La Hoja Boricua · Mi Hoja entre teléfonos', "const LHB_X='img/adorno.webp';/* La Hoja Boricua · Mi Hoja entre teléfonos"),
    ('site/app.js', 'Codex r5: a decorative image set with setAttribute', 'const thumbS=', 'const LHB_X=i=>i.setAttribute(\'src\',\'img/adorno.webp\');const thumbS='),
    ('site/sync.js', 'Codex r6: a decorative SVG inserted by a script outside the five', '/* La Hoja Boricua · Mi Hoja entre teléfonos', "document.body&&document.body.insertAdjacentHTML('beforeend','<svg width=\"200\" height=\"200\" viewBox=\"0 0 50 50\" aria-hidden=\"true\"><circle cx=\"25\" cy=\"25\" r=\"20\" fill=\"red\"/></svg>');/* La Hoja Boricua · Mi Hoja entre teléfonos"),
    ('site/sync.js', 'Codex r6: an SVG made through the DOM', '/* La Hoja Boricua · Mi Hoja entre teléfonos', "const LHB_X=()=>document.createElementNS('http://www.w3.org/2000/svg','svg');/* La Hoja Boricua · Mi Hoja entre teléfonos"),
    ('site/cuenta.js', 'Codex r6: a decorative canvas drawing', '/* La Hoja Boricua · cuenta (LHB-25)', "const LHB_X=()=>{const c=document.createElement('canvas').getContext('2d');c.fillStyle='red';c.fillRect(0,0,9,9)};/* La Hoja Boricua · cuenta (LHB-25)"),
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
