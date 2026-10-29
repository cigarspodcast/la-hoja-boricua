"""LHB-73 proof: each mutation breaks one rule of the About screen, the Ver intro link or the intro credits on a scratch copy of
the worktree, runs the LHB-73 tests plus the tests they touch, and must turn them red; the copy is restored after each.
usage: python evidence/lhb-73-mutations.py WORKTREE SCRATCH"""
import os, re, shutil, subprocess, sys

WT, D = sys.argv[1], sys.argv[2]
if os.path.exists(D):
    shutil.rmtree(D)
shutil.copytree(WT, D, ignore=shutil.ignore_patterns('.git', 'node_modules', 'evidence'))
# the LHB-27 test reads its before-count from evidence/: copy that one file
os.makedirs(os.path.join(D, 'evidence'))
shutil.copyfile(os.path.join(WT, 'evidence', 'lhb-27-scan-before.txt'), os.path.join(D, 'evidence', 'lhb-27-scan-before.txt'))
PAT = 'LHB-73|LHB-71: el menú|LHB-27: cada clave|LHB-27: ningún texto'
AP, I18 = 'site/app.js', 'site/i18n.js'
FILES = (AP, I18)


def runp():
    return subprocess.run(['node', '--test', '--test-timeout=60000', '--test-name-pattern=' + PAT, 'test/site.test.js'], cwd=D, capture_output=True, text=True, encoding='utf-8', errors='replace')


def edit(rel, old, new):
    p = os.path.join(D, rel)
    s = open(p, 'rb').read().decode('utf-8')
    if '\r\n' in s:  # a checkout with autocrlf writes CRLF: the anchors follow the file
        old, new = old.replace('\r\n', '\n').replace('\n', '\r\n'), new.replace('\r\n', '\n').replace('\n', '\r\n')
    assert s.count(old) == 1, (rel, old, s.count(old))
    open(p, 'wb').write(s.replace(old, new).encode('utf-8'))


SELVA = " {id:'selva',part:()=>tt('cred.selva'),title:'Jungle, Tropical birds and insects',author:'myrinvp',href:'https://freesound.org/people/myrinvp/sounds/423711/',license:'CC0 1.0',licenseHref:'https://creativecommons.org/publicdomain/zero/1.0/',changes:()=>tt('cred.selvaChanges')}],"
M = [
    ('K1 the nature bed entry is removed', lambda: (edit(AP, ",\n" + SELVA, '],'), edit(AP, "['motor','selva'],'assets/intro/intro-landscape.mp4':['motor','selva']", "['motor'],'assets/intro/intro-landscape.mp4':['motor']"))),
    ('K2 one video has no credits', lambda: edit(AP, ",'assets/intro/intro-landscape.mp4':['motor','selva']}", '}')),
    ('K3 the engine license is misstated', lambda: edit(AP, "license:'CC BY 4.0'", "license:'CC BY-SA 4.0'")),
    ('K4 a credit loses its license link', lambda: edit(AP, "${tt('cred.license')}: ${ext(c.licenseHref,esc(c.license))}", "${tt('cred.license')}: ${esc(c.license)}")),
    ('K5 Ver intro without intro=1', lambda: edit(AP, 'href="/?intro=1#/acerca" data-intro-replay', 'href="/#/acerca" data-intro-replay')),
    ('K6 About is not in the menu', lambda: edit(AP, "{r:'acerca',go:()=>vAcerca(),menu:[['app','info','menu.acerca','menu.acercaSub']]}", "{r:'acerca',go:()=>vAcerca()}")),
    ('K7 the credits page is not a detail of About', lambda: edit(AP, "{r:'creditos',go:()=>vCreditos(),of:'acerca'}", "{r:'creditos',go:()=>vCreditos(),of:'buscar'}")),
    ('K8 Ver intro offered with reduced motion', lambda: edit(AP, "const off=matchMedia('(prefers-reduced-motion: reduce)').matches||", 'const off=')),
    ('K9 the bus credit drops the artist link', lambda: edit(AP, "${ext('https://callepomarrosas.com/',tt('intro.creditName'))}", "${tt('intro.creditName')}")),
    ('K10 no endorsement note', lambda: edit(AP, '<p class="hint cred-endorse">${tt(\'cred.endorse\')}</p>', '')),
    ('K11 the credit claims the plate', lambda: edit(I18, ' "cred.bus": "La guagua de la intro es una versión en 3D, hecha para esta app, de una ilustración original de",', ' "cred.bus": "La guagua de la intro, con su tablilla, es una versión en 3D de una ilustración original de",')),
    ('K12 Ver intro has no English value', lambda: edit(I18, ' "about.replay": "Watch intro",\n', '')),
    ('K13 the back button goes elsewhere', lambda: edit(AP, "$('[data-back]').onclick=()=>{location.hash='#/acerca'}", "$('[data-back]').onclick=()=>{location.hash='#/catalogo'}")),
]
red = 0
for name, mut in M:
    snap = {rel: open(os.path.join(D, rel), 'rb').read() for rel in FILES}
    try:
        mut()
        r = runp()
        fails = re.findall(r'^ℹ fail (\d+)', r.stdout, re.M)
        ok = r.returncode != 0 and fails and int(fails[-1]) > 0
        red += bool(ok)
        print('%-60s rc %d fail %s -> %s' % (name, r.returncode, fails[-1] if fails else '?', 'RED' if ok else 'SURVIVED'), flush=True)
    finally:
        for rel, b in snap.items():
            open(os.path.join(D, rel), 'wb').write(b)
r = runp()
n = re.findall(r'^ℹ pass (\d+)', r.stdout, re.M)
f = re.findall(r'^ℹ fail (\d+)', r.stdout, re.M)
print('baseline after restore: rc %d pass %s fail %s' % (r.returncode, n[-1] if n else '?', f[-1] if f else '?'))
print('RESULT %d of %d mutations red' % (red, len(M)))
