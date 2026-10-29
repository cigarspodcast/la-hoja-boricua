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
AP, I18, TS = 'site/app.js', 'site/i18n.js', 'test/site.test.js'
FILES = (AP, I18, TS)


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
    ('K14 (Codex r1) the census goes back to the byte regex', lambda: edit(TS, "if(KIND73(fs.readFileSync(p))!=='silent')out.push(p)", "if(/hdlr[\\s\\S]{8}soun/.test(fs.readFileSync(p).toString('latin1')))out.push(p)")),
    ('K15 (Codex r1) the box walker ignores 64-bit sizes', lambda: edit(TS, 'if(n===1){if(e-o<16)return null;const big=b.readBigUInt64BE(o+8);if(big>BigInt(e-o))return null;n=Number(big);h=16}else ', '')),
    ('K16 (Codex r2) an unknown file counts as silent', lambda: edit(TS, "if(KIND73(fs.readFileSync(p))!=='silent')out.push(p)", "if(KIND73(fs.readFileSync(p))==='sound')out.push(p)")),
    ('K18 (Codex r2) compressed cmov is read as silent', lambda: edit(TS, "if(!mk||mk.some(x=>x.ty==='cmov'))return 'unknown';", "if(!mk)return 'unknown';")),
    ('K19 (Codex r2) ftyp must be the first box', lambda: edit(TS, "if(!top||!top.some(x=>x.ty==='ftyp'))return 'unknown';", "if(!top||top[0].ty!=='ftyp')return 'unknown';")),
    ('K20 (Codex r2) a track of another kind counts as silent', lambda: edit(TS, "else if(!['vide','pict','auxv'].includes(ht))return 'unknown'", '')),
    ('K21 (Codex r2) any binary file counts as silent', lambda: edit(TS, " return 'unknown'}\n/* los archivos de site/assets", " return 'silent'}\n/* los archivos de site/assets")),
    ('K22 (Codex r3) signatures before the MP4 reading, with TrueType and ICO', lambda: edit(TS, "function KIND73(b){const r=SOUND73(b);if(r!=='unknown')return r;const h=b.toString('latin1',0,12);\n if(h.startsWith('\\x89PNG\\r\\n\\x1a\\n')||(b[0]===0xFF&&b[1]===0xD8&&b[2]===0xFF)||/^GIF8[79]a/.test(h)||/^RIFF....WEBP/s.test(h)||/^(wOFF|wOF2|OTTO)/.test(h))return 'silent';", "function KIND73(b){const h=b.toString('latin1',0,12),u=b.length>=4?b.readUInt32BE(0):-1;\n if(h.startsWith('\\x89PNG')||(b[0]===0xFF&&b[1]===0xD8&&b[2]===0xFF)||h.startsWith('GIF8')||/^RIFF....WEBP/s.test(h)||/^(wOFF|wOF2|OTTO)/.test(h)||u===0x00010000||u===0x00000100)return 'silent';")),
    ('K23 (Codex r4) PNG judged by six bytes', lambda: edit(TS, "h.startsWith('\\x89PNG\\r\\n\\x1a\\n')||", "h.startsWith('\\x89PNG\\r\\n')||")),
    ('K17 (Codex r1) the credits view drops the focus', lambda: edit(AP, "$('[data-back]').onclick=()=>{location.hash='#/acerca'};keepFocus()}", "$('[data-back]').onclick=()=>{location.hash='#/acerca'}}")),
    ('K13 the back button goes elsewhere', lambda: edit(AP, "$('[data-back]').onclick=()=>{location.hash='#/acerca'};", "$('[data-back]').onclick=()=>{location.hash='#/catalogo'};")),
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
