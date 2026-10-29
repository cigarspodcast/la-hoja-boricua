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
    ('H6 a mirror drifts from its token (unearned leaf)', lambda: edit(HJ, "VBArt.leaf(on?b.c:'#D7D8CC')", "VBArt.leaf(on?b.c:'#D7D8CD')")),
    ('H7 the sale pin back to its old green (LEAFC mirror)', lambda: edit(AP, "venta:'#1EA8D7'", "venta:'#7fae55'")),
    ('H8 a new leaf icon color the list does not count', lambda: edit(AP, "VBArt.leaf('#8fd162')}<b>", "VBArt.leaf('#123456')}<b>VBArt.leaf('#8fd162')}<b>")),
    ('H9 Instagram gradient back to its pale end (white text 2.3)', lambda: edit(CS, 'linear-gradient(135deg,#6e3b8f,#b23a30)', 'linear-gradient(135deg,#6e3b8f,#c2453a 60%,#d9a75a)')),
    ('H10 dark ink on the red flag initials', lambda: edit(AP, "color:${red?'var(--on-danger)':'var(--on-surface)'}", "color:${red?'var(--on-surface)':'var(--on-surface)'}")),
    ('H11 the white watermark on the red initials', lambda: edit(AP, "fill=\"${red?'#000':'#fff'}\"", "fill=\"${red?'#fff':'#fff'}\"")),
    ('H12 a dark flavor in the wheel (chip text fails)', lambda: edit(HJ, "c:'#cbbd9f'", "c:'#5a4330'")),
    ('H13 a soft tint too dark for the inks (--danger-soft)', lambda: edit(CS, '--danger-soft:#F6DEDA;', '--danger-soft:#E8A89F;')),
    ('H14 the flag facade back to the old blue', lambda: edit(AP, "const FACADE=['#1EA8D7'", "const FACADE=['#0050f0'")),
    ('H15 the chip fallback back to a literal', lambda: edit(HJ, "||'var(--card-2)'", "||'#dde3dc'")),
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
        print('%-62s rc %d fail %s -> %s' % (name, r.returncode, fails[-1] if fails else '?', 'RED' if ok else 'SURVIVED'), flush=True)
    finally:
        for rel, b in snap.items():
            open(os.path.join(D, rel), 'wb').write(b)
r = runp()
n = re.findall(r'^ℹ pass (\d+)', r.stdout, re.M)
print('baseline after restore: rc %d pass %s' % (r.returncode, n[-1] if n else '?'))
print('RESULT %d of %d mutations red' % (red, len(M)))
