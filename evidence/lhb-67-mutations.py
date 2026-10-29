"""LHB-67 proof: each mutation brings back one color literal or breaks one rule of the remaining ones, on a scratch copy of the worktree,
runs the LHB-67 tests (with LHB-65's pair test and the two older tests this ticket updated), and must turn them red; the copy is restored
after each. usage: python evidence/lhb-67-mutations.py WORKTREE SCRATCH"""
import os, re, shutil, subprocess, sys

WT, D = sys.argv[1], sys.argv[2]
if os.path.exists(D):
    shutil.rmtree(D)
shutil.copytree(WT, D, ignore=shutil.ignore_patterns('.git', 'node_modules'))
PAT = 'LHB-67|LHB-65|v16: paleta|LHB-52: el error del formulario'
CS, AP, HJ, CU = 'site/styles.css', 'site/app.js', 'site/hoja.js', 'site/cuenta.js'
FILES = (CS, AP, HJ, CU)


def runp():
    return subprocess.run(['node', '--test', '--test-timeout=60000', '--test-name-pattern=' + PAT, 'test/site.test.js'], cwd=D, capture_output=True, text=True, encoding='utf-8', errors='replace')


def edit(rel, old, new):
    p = os.path.join(D, rel)
    s = open(p, 'rb').read().decode('utf-8')
    assert s.count(old) == 1, (rel, old, s.count(old))
    open(p, 'wb').write(s.replace(old, new).encode('utf-8'))


def append(rel, text):
    p = os.path.join(D, rel)
    open(p, 'ab').write(text.encode('utf-8'))


M = [
    ('H1 an injected #fff in styles.css (the Proof case)', lambda: append(CS, '\n.lhb67x{color:#fff}\n')),
    ('H2 a dark literal back in a rule (.remind background)', lambda: edit(CS, '.remind{', '.remind{background:#21452f;')),
    ('H3 the share image paints a literal again (stat box)', lambda: edit(HJ, "x.fillStyle=tk('card');rr(x,X,by,bw,110,18);", "x.fillStyle='rgba(23,58,38,.92)';rr(x,X,by,bw,110,18);")),
    ('H4 the form error box back to its rgba (hoja.js)', lambda: edit(HJ, 'background:var(--danger-soft);color:var(--on-surface);', 'background:rgba(209,42,27,.1);color:var(--on-surface);')),
    ('H5 a literal in cuenta.js', lambda: append(CU, "\nconst lhb67x='#fff';\n")),
    ('H6 a mirror drifts from its token (the tk() fallback ink)', lambda: edit(HJ, "return v||'#263723'", "return v||'#263724'")),
    ('H7 the sale pin back to its old green (LEAFC)', lambda: edit(AP, "venta:'var(--info)'", "venta:'#7fae55'")),
    ('H8 a new leaf icon color the list does not count', lambda: edit(AP, "VBArt.leaf('#8fd162')}<b>", "VBArt.leaf('#123456')}<b>VBArt.leaf('#8fd162')}<b>")),
    ('H9 Instagram gradient back to its pale end (white text 2.3)', lambda: edit(CS, 'linear-gradient(135deg,#6e3b8f,#b23a30)', 'linear-gradient(135deg,#6e3b8f,#c2453a 60%,#d9a75a)')),
    ('H10 dark ink on the red flag initials', lambda: edit(AP, "color:${red?'var(--on-danger)':'var(--on-surface)'}", "color:${red?'var(--on-surface)':'var(--on-surface)'}")),
    ('H11 the white watermark on the red initials', lambda: edit(AP, "fill=\"${red?'#000':'#fff'}\"", "fill=\"${red?'#fff':'#fff'}\"")),
    ('H12 a dark flavor in the wheel (chip text fails)', lambda: edit(HJ, "c:'#cbbd9f'", "c:'#5a4330'")),
    ('H13 a soft tint too dark for the inks (--danger-soft)', lambda: edit(CS, '--danger-soft:#F6DEDA;', '--danger-soft:#E8A89F;')),
    ('H14 the flag facade back to the old blue', lambda: edit(AP, "const FACADE=['#1EA8D7'", "const FACADE=['#0050f0'")),
    ('H15 the chip fallback back to a literal', lambda: edit(HJ, "||'var(--card-2)'", "||'#dde3dc'")),
    ('H16 the empty-state flag back to its old blue (Codex round 1)', lambda: edit(CS, '%231EA8D7', '%235FB4E5')),
    ('H17 an encoded color in a new data URI (Codex round 1)', lambda: append(CS, '\n.lhb67y{background:url("data:image/svg+xml,%3Csvg%3E%3Crect fill=%22%23fff%22/%3E%3C/svg%3E")}\n')),
    ('H18 the unearned leaf back to a literal (Codex round 1)', lambda: edit(HJ, "VBArt.leaf(on?b.c:'var(--line)')", "VBArt.leaf(on?b.c:'#D7D8CC')")),
]
# LHB-99: one mutation per syntax the scan did not see before (hsl(), uppercase RGB(), named colors where they paint, a partly encoded #)
M99 = [
    ('H19 hsl() in styles.css (LHB-99)', lambda: append(CS, '\n.lhb99a{color:hsl(0 100% 50%)}\n')),
    ('H20 uppercase RGB() in hoja.js (LHB-99)', lambda: append(HJ, "\nconst lhb99b='RGB(1,2,3)';\n")),
    ('H21 uppercase HSLA() in cuenta.js (LHB-99)', lambda: append(CU, "\nconst lhb99c='HSLA(0,0%,0%,.5)';\n")),
    ('H22 a named color in a CSS border (LHB-99)', lambda: append(CS, '\n.lhb99d{border:1px solid red}\n')),
    ('H23 a named color in a style attribute in app.js (LHB-99)', lambda: append(AP, '\nconst lhb99e=`<b style="color:white">`;\n')),
    ('H24 a named color in an SVG fill in hoja.js (LHB-99)', lambda: append(HJ, "\nconst lhb99f='<path fill=\"navy\"/>';\n")),
    ('H25 a quoted name inside ${} on the flag initials (LHB-99)', lambda: edit(AP, "color:${red?'var(--on-danger)':'var(--on-surface)'}", "color:${red?'white':'var(--on-surface)'}")),
    ('H26 a partly encoded # in a new data URI (LHB-99)', lambda: append(CS, '\n.lhb99g{background:url("data:image/svg+xml,%3Csvg%3E%3Crect fill=%22%23%31EA8D7%22/%3E%3C/svg%3E")}\n')),
    ('H27 the share image paints a named color (fillStyle, LHB-99)', lambda: edit(HJ, "x.fillStyle=tk('card');rr(x,X,by,bw,110,18);", "x.fillStyle='white';rr(x,X,by,bw,110,18);")),
]
M = M + M99
red = 0
for name, mut in M:
    snap = {rel: open(os.path.join(D, rel), 'rb').read() for rel in FILES}
    try:
        mut()
        r = runp()
        fails = re.findall(r'^ℹ fail (\d+)', r.stdout, re.M)
        ok = r.returncode != 0 and fails and int(fails[-1]) > 0
        red += bool(ok)
        print('%-62s rc %d fail %s -> %s' % (name, r.returncode, fails[-1] if fails else '?', 'RED' if ok else 'SURVIVED'), flush=True)
    finally:
        for rel, b in snap.items():
            open(os.path.join(D, rel), 'wb').write(b)
r = runp()
n = re.findall(r'^ℹ pass (\d+)', r.stdout, re.M)
print('baseline after restore: rc %d pass %s' % (r.returncode, n[-1] if n else '?'))
print('RESULT %d of %d mutations red' % (red, len(M)))
# LHB-99 before: the same new mutations against the test file as it was before LHB-99 (c1b7b99); they are expected to SURVIVE there,
# which is the gap the ticket reports. This is a record, not a pass condition.
TF = os.path.join(D, 'test', 'site.test.js')
cur = open(TF, 'rb').read()
open(TF, 'wb').write(subprocess.run(['git', 'show', 'c1b7b99:test/site.test.js'], cwd=WT, capture_output=True, check=True).stdout)
survived = 0
try:
    for name, mut in M99:
        snap = {rel: open(os.path.join(D, rel), 'rb').read() for rel in FILES}
        try:
            mut()
            r = runp()
            fails = re.findall(r'^ℹ fail (\d+)', r.stdout, re.M)
            ok = r.returncode != 0 and fails and int(fails[-1]) > 0
            survived += not ok
            print('before LHB-99: %-48s rc %d fail %s -> %s' % (name, r.returncode, fails[-1] if fails else '?', 'RED' if ok else 'SURVIVED'), flush=True)
        finally:
            for rel, b in snap.items():
                open(os.path.join(D, rel), 'wb').write(b)
finally:
    open(TF, 'wb').write(cur)
print('BEFORE LHB-99: %d of %d new mutations survived the old scan' % (survived, len(M99)))
