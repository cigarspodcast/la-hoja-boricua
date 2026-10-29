"""LHB-74 proof: each mutation breaks one rule of the passport colors, the stamp celebration or the public profile on a scratch copy of
the worktree, runs the LHB-74 tests plus the tests they touch, and must turn them red; the copy is restored after each.
Round 2 (Codex r2): the celebration code was rewritten so it survives repaints; the mutations follow the new code (L2, L5, L6, L8, L9,
L11 and L15 now target it, L16 to L19 are new).
usage: python evidence/lhb-74-mutations.py WORKTREE SCRATCH"""
import os, re, shutil, subprocess, sys

WT, D = sys.argv[1], sys.argv[2]
if os.path.exists(D):
    shutil.rmtree(D)
shutil.copytree(WT, D, ignore=shutil.ignore_patterns('.git', 'node_modules', 'evidence'))
# tests that read a file under evidence/: copy those files
os.makedirs(os.path.join(D, 'evidence'))
shutil.copyfile(os.path.join(WT, 'evidence', 'lhb-27-scan-before.txt'), os.path.join(D, 'evidence', 'lhb-27-scan-before.txt'))
PAT = 'LHB-74|LHB-48|LHB-65|LHB-67'
HJ, CSS, PP = 'site/hoja.js', 'site/styles.css', 'functions/_lib/passport.js'
FILES = (HJ, CSS, PP)


def runp():
    return subprocess.run(['node', '--test', '--test-timeout=60000', '--test-name-pattern=' + PAT, 'test/site.test.js'], cwd=D, capture_output=True, text=True, encoding='utf-8', errors='replace')


def edit(rel, old, new):
    p = os.path.join(D, rel)
    s = open(p, 'rb').read().decode('utf-8')
    if '\r\n' in s:  # a checkout with autocrlf writes CRLF: the anchors follow the file
        old, new = old.replace('\r\n', '\n').replace('\n', '\r\n'), new.replace('\r\n', '\n').replace('\n', '\r\n')
    assert s.count(old) == 1, (rel, old, s.count(old))
    open(p, 'wb').write(s.replace(old, new).encode('utf-8'))


M = [
    ('L1 the celebration ignores reduced motion', lambda: edit(HJ, "const lessMotion=()=>!!(window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches);", 'const lessMotion=()=>false;')),
    ('L2 a repaint restarts the animation (no clock carried over)', lambda: edit(HJ, "e.style.setProperty('--cel-at',(c.start-now)+'ms');", '')),
    ('L3 the animation loops', lambda: edit(CSS, '{animation:lhb-stamp .58s cubic-bezier(.2,.75,.3,1) var(--cel-at,0ms) 1}', '{animation:lhb-stamp .58s cubic-bezier(.2,.75,.3,1) var(--cel-at,0ms) infinite}')),
    ('L4 no reduced-motion rule in the CSS', lambda: edit(CSS, '@media (prefers-reduced-motion:reduce){.stamp.is-new::after,.stampbtn.is-new svg,.badge.is-new .bico{animation:none}}\n', '')),
    ('L5 a celebration that never started never expires', lambda: edit(HJ, "setTimeout(()=>{if(LIVE.has(c)&&c.start==null)celDrop(c)},CEL_WAIT)", '0')),
    ('L6 removing a stamp is celebrated', lambda: edit(HJ, 'if(!on||lessMotion())return;', 'if(lessMotion())return;')),
    ('L7 the stamp handler does not call it', lambda: edit(HJ, '  celebrate(arg,on,nb[0]);\n', '')),
    ('L8 the class is never removed', lambda: edit(HJ, 'setTimeout(()=>{if(LIVE.has(c))celDrop(c)},CEL_OFF)', '0')),
    ('L9 the earned badge is not celebrated', lambda: edit(HJ, " if(badge)add(`[data-badge=\"${CSS.escape(badge)}\"]`,e=>e.classList.contains('on'));\n", '')),
    ('L10 one cycle color has the wrong surface', lambda: edit(CSS, '.stamps .stamp:nth-child(4n)[aria-pressed="true"]{border-color:var(--warn-ink);background:var(--warn-soft)}', '.stamps .stamp:nth-child(4n)[aria-pressed="true"]{border-color:var(--warn-ink);background:var(--info-soft)}')),
    ('L11 the celebration is stored', lambda: edit(HJ, "if(!on||lessMotion())return;", "try{localStorage.setItem('vb_celeb',arg)}catch(e){}if(!on||lessMotion())return;")),
    ('L12 the public profile gains a field', lambda: edit(PP, 'avatar_key: av.error ? null : av.avatar_key', 'avatar_key: av.error ? null : av.avatar_key, insignias: 0')),
    ('L13 the hero text on celeste loses its color', lambda: edit(CSS, '.pass-hero h2,.pass-hero p{color:var(--on-info)}', '.pass-hero h2,.pass-hero p{color:var(--muted)}')),
    ('L14 a badge ink too light for its text', lambda: edit(CSS, '.badges .badge.on:nth-child(4n) span{color:var(--warn-ink)}', '.badges .badge.on:nth-child(4n) span{color:var(--warn)}')),
    ('L15 (Codex r1) one cleanup clears every celebration on the page', lambda: edit(HJ, "function celDrop(c){LIVE.delete(c);document.querySelectorAll(c.sel)", "function celDrop(c){LIVE.delete(c);document.querySelectorAll('.is-new')")),
    ('L16 (Codex r2) a repaint is not marked again', lambda: edit(HJ, "celObs.observe(document.body,{childList:true,subtree:true})", '0')),
    ('L17 (Codex r2) a new stamp drops the one still celebrating', lambda: edit(HJ, '[...LIVE].filter(c=>c.arg===arg).forEach(celDrop);', '[...LIVE].forEach(celDrop);')),
    ('L18 (Codex r2) the badge starts before it shows earned', lambda: edit(HJ, "e=>e.classList.contains('on'));", '()=>true);')),
    ('L19 (Codex r2) a stale cleanup cuts a stamp put again', lambda: edit(HJ, 'setTimeout(()=>{if(LIVE.has(c))celDrop(c)},CEL_OFF)', 'setTimeout(()=>celDrop(c),CEL_OFF)')),
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
f = re.findall(r'^ℹ fail (\d+)', r.stdout, re.M)
print('baseline after restore: rc %d pass %s fail %s' % (r.returncode, n[-1] if n else '?', f[-1] if f else '?'))
print('RESULT %d of %d mutations red' % (red, len(M)))
