"""LHB-68 proof: each mutation breaks one rule of the static pages' look (l.css, u.css, a page) on a scratch copy of the worktree, runs the
LHB-68 tests, and must turn them red; the copy is restored after each. With --rev REV it instead puts back REV's l.css and u.css and runs
the same tests once (the red-before run). usage: python evidence/lhb-68-mutations.py WORKTREE SCRATCH [--rev REV]"""
import os, re, shutil, subprocess, sys

WT, D = sys.argv[1], sys.argv[2]
if os.path.exists(D):
    shutil.rmtree(D)
shutil.copytree(WT, D, ignore=shutil.ignore_patterns('.git', 'node_modules'))
PAT = 'LHB-68'
LC, UC, PV, PG, UH = 'site/lugares/l.css', 'site/u.css', 'site/privacidad.html', 'site/lugares/612-c-lounge-arecibo.html', 'functions/u/[handle].js'
FILES = (LC, UC, PV, PG, UH)


def runp():
    return subprocess.run(['node', '--test', '--test-timeout=60000', '--test-name-pattern=' + PAT, 'test/site.test.js'], cwd=D, capture_output=True, text=True, encoding='utf-8', errors='replace')


if len(sys.argv) > 4 and sys.argv[3] == '--rev':
    for rel in (LC, UC):
        open(os.path.join(D, rel), 'wb').write(subprocess.run(['git', 'show', sys.argv[4] + ':' + rel], cwd=WT, capture_output=True, check=True).stdout)
    r = runp()
    for line in r.stdout.splitlines():
        if line[:1] in ('✔', '✖') or re.match(r'^ℹ (tests|pass|fail|lugares|u\.css)', line):
            print(line)
    print('rc', r.returncode)
    sys.exit(0)


def edit(rel, old, new):
    p = os.path.join(D, rel)
    s = open(p, 'rb').read().decode('utf-8')
    assert s.count(old) == 1, (rel, old, s.count(old))
    open(p, 'wb').write(s.replace(old, new).encode('utf-8'))


M = [
    ('G1 l.css keeps a dark literal (body background)', lambda: edit(LC, 'body{margin:0;background:var(--surface);', 'body{margin:0;background:#0e2417;')),
    ('G2 a token value drifts from the app (l.css --muted)', lambda: edit(LC, '--muted:#59614F;', '--muted:#59614E;')),
    ('G3 pale stars on the public passport (u.css --warn-ink as sun)', lambda: edit(UC, '--warn-ink:#7A5C00;', '--warn-ink:#EAB91B;')),
    ('G4 a light accent ink fails contrast and the app value (l.css)', lambda: edit(LC, '--accent-ink:#344C31;', '--accent-ink:#8fd162;')),
    ('G5 headings back to Georgia alone (l.css h1)', lambda: edit(LC, "h1{font:600 30px/1.2 'Fraunces',Georgia,serif;", 'h1{font:600 30px/1.2 Georgia,serif;')),
    ('G6 a token the app does not have (u.css --gold)', lambda: edit(UC, '--focus:#146780;--scrim:', '--focus:#146780;--gold:#344C31;--scrim:')),
    ('G7 the dark color scheme (l.css)', lambda: edit(LC, ';color-scheme:light}', ';color-scheme:dark}')),
    ('G8 privacy page carries its own <style>', lambda: edit(PV, '<link rel="stylesheet" href="/lugares/l.css">', '<link rel="stylesheet" href="/lugares/l.css"><style>body{color:red}</style>')),
    ('G9 a lounge page with an inline color', lambda: edit(PG, '<body>', '<body style="background:#0e2417">')),
    ('G10 a lounge page without l.css', lambda: edit(PG, '<link rel="stylesheet" href="l.css">', '')),
    ('G11 white text on the scrim card (u.css .pp-x)', lambda: edit(UC, '.pp-x{position:absolute;top:8px;right:12px;font-size:28px;line-height:1;text-decoration:none;color:var(--on-surface);', '.pp-x{position:absolute;top:8px;right:12px;font-size:28px;line-height:1;text-decoration:none;color:#FFFFFF;')),
    ('G12 the passport CSP without font-src (Codex round 1)', lambda: edit(UH, "font-src 'self'; ", '')),
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
