"""LHB-65 proof: each mutation puts one bad token (or an old name, or a direct read of the palette) into a scratch copy of the worktree,
runs the LHB-65 tests, and must turn them red; the copy is restored after each. The first ones are the ticket's "seen failing against a
deliberately bad token". usage: python evidence/lhb-65-mutations.py WORKTREE SCRATCH"""
import os, re, shutil, subprocess, sys

WT, D = sys.argv[1], sys.argv[2]
if os.path.exists(D):
    shutil.rmtree(D)
shutil.copytree(WT, D, ignore=shutil.ignore_patterns('.git', 'node_modules'))
PAT = 'LHB-65'
CS, AP, MF = 'site/styles.css', 'site/app.js', 'site/manifest.webmanifest'
FILES = (CS, AP, MF)


def runp():
    return subprocess.run(['node', '--test', '--test-timeout=60000', '--test-name-pattern=' + PAT, 'test/site.test.js'], cwd=D, capture_output=True, text=True, encoding='utf-8', errors='replace')


def edit(rel, old, new):
    p = os.path.join(D, rel)
    s = open(p, 'rb').read().decode('utf-8')
    assert s.count(old) == 1, (rel, old, s.count(old))
    open(p, 'wb').write(s.replace(old, new).encode('utf-8'))


M = [
    ('T1 a pale muted text (#A0A090 on paper)', lambda: edit(CS, '--muted:#59614F;', '--muted:#A0A090;')),
    ('T2 the text on the accent is the accent', lambda: edit(CS, '--on-accent:var(--paper);', '--on-accent:var(--tobacco);')),
    ('T3 sun as text on paper', lambda: edit(CS, '--warn-ink:#7A5C00;', '--warn-ink:var(--sun);')),
    ('T4 celeste as text on paper', lambda: edit(CS, '--info-ink:#146780;', '--info-ink:var(--celeste);')),
    ('T5 white on celeste', lambda: edit(CS, '--on-info:#263723;', '--on-info:#FFFFFF;')),
    ('T6 ink on amber at the small-text threshold (no -lg)', lambda: edit(CS, '--on-warm-lg:#263723;', '--on-warm:#263723;')),
    ('T7 a dark raised surface', lambda: edit(CS, '--surface-2:#FFFDFA;', '--surface-2:#263723;')),
    ('T8 red as small text on card-2 (4.42)', lambda: edit(CS, '--danger-ink:#A52218;', '--danger-ink:var(--red);')),
    ('T9 a text token that is not a color', lambda: edit(CS, '--on-surface-2:#43513D;', '--on-surface-2:var(--nada);')),
    ('N1 an old name back (--gold as tobacco)', lambda: edit(CS, ' --focus:#146780;', ' --focus:#146780; --gold:#344C31;')),
    ('N2 a rule reads the palette directly', lambda: edit(CS, '.toast{position:fixed;', '.toast{border-color:var(--celeste);position:fixed;')),
    ('N3 a JS reader of an old name', lambda: edit(AP, 'style="color:var(--accent-ink);font-size:15px"', 'style="color:var(--gold);font-size:15px"')),
    ('N4 the manifest keeps the dark theme color', lambda: edit(MF, '"theme_color": "#F4F1EA",', '"theme_color": "#0e2417",')),
    ('N5 no light color-scheme', lambda: edit(CS, ' color-scheme:light;\r\n', '')),
    ('E1 the later .seg override keeps dark text on inverse (Codex r1 P2)', lambda: edit(CS, '.seg button[aria-pressed="true"]{color:var(--on-inverse)}', '.seg button[aria-pressed="true"]{color:#0e2417}')),
    ('E2 pale gallery captions on card-2 (Codex r1 P2)', lambda: edit(CS, 'background:var(--card-2);color:var(--on-surface);font-size:11.5px', 'background:var(--card-2);color:#f8f8f4;font-size:11.5px')),
    ('E3 the pale Suave pill (background from .pill) (Codex r1 P2)', lambda: edit(CS, '.pill.f-suave{color:var(--accent-ink)}', '.pill.f-suave{color:#cfe0b0}')),
    ('E4 the later Fuerte override (Codex r1 P2)', lambda: edit(CS, '\r\n.pill.f-fuerte{color:var(--danger-ink)}\r\n', '\r\n.pill.f-fuerte{color:#ff9a82}\r\n')),
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
        tally = re.findall(r'contraste: [^\n]*', r.stdout)
        print('%-56s rc %d fail %s -> %s  %s' % (name, r.returncode, fails[-1] if fails else '?', 'RED' if ok else 'SURVIVED', tally[-1] if tally else ''), flush=True)
    finally:
        for rel, b in snap.items():
            open(os.path.join(D, rel), 'wb').write(b)
r = runp()
n = re.findall(r'^ℹ pass (\d+)', r.stdout, re.M)
tally = re.findall(r'contraste: [^\n]*', r.stdout)
print('baseline after restore: rc %d pass %s  %s' % (r.returncode, n[-1] if n else '?', tally[-1] if tally else ''))
print('RESULT %d of %d mutations red' % (red, len(M)))
