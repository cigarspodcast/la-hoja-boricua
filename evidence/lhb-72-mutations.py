"""LHB-72 proof: each mutation breaks one rule of the intro player, its play policy, or the splash removal on a scratch copy of the worktree,
runs the LHB-72 tests plus the old tests rewritten for it, and must turn them red; the copy is restored after each.
usage: python evidence/lhb-72-mutations.py WORKTREE SCRATCH"""
import os, re, shutil, subprocess, sys

WT, D = sys.argv[1], sys.argv[2]
if os.path.exists(D):
    shutil.rmtree(D)
shutil.copytree(WT, D, ignore=shutil.ignore_patterns('.git', 'node_modules', 'evidence', '*.mp4'))
# the size test reads the videos: copy them small-for-real is not possible, so link the real files in
for f in ('intro-portrait.mp4', 'intro-landscape.mp4'):
    shutil.copyfile(os.path.join(WT, 'site', 'assets', 'intro', f), os.path.join(D, 'site', 'assets', 'intro', f))
PAT = 'LHB-72|v8:|v9:|v12:|v16:|v28|LHB-27: cada clave|LHB-67: ningún color'
IJ, IX, CSS, SW, I18 = 'site/intro.js', 'site/index.html', 'site/styles.css', 'site/sw.js', 'site/i18n.js'
FILES = (IJ, IX, CSS, SW, I18)


def runp():
    return subprocess.run(['node', '--test', '--test-timeout=60000', '--test-name-pattern=' + PAT, 'test/site.test.js'], cwd=D, capture_output=True, text=True, encoding='utf-8', errors='replace')


def edit(rel, old, new):
    p = os.path.join(D, rel)
    s = open(p, 'rb').read().decode('utf-8')
    assert s.count(old) == 1, (rel, old, s.count(old))
    open(p, 'wb').write(s.replace(old, new).encode('utf-8'))


M = [
    ('J1 every 13 days (day 13 plays)', lambda: edit(IJ, 'EVERY=14;', 'EVERY=13;')),
    ('J2 strictly more than 14 days (day 14 does not play)', lambda: edit(IJ, "o.now-o.last>=EVERY*DAY?'play':'recent'", "o.now-o.last>EVERY*DAY?'play':'recent'")),
    ('J3 no same-session rule', lambda: edit(IJ, " if(o.session)return 'session';\n", '')),
    ('J4 reduced motion ignored', lambda: edit(IJ, " if(o.reduced)return 'reduced';\n", '')),
    ('J5 data saver ignored', lambda: edit(IJ, " if(o.saveData)return 'saveData';\n", '')),
    ('J6 every link counts as the home (deep links play)', lambda: edit(IJ, "deep:!!h&&!/^#\\/?(catalogo\\/?)?$/.test(h)", 'deep:false')),
    ('J7 the installed app replays it', lambda: edit(IJ, " if(o.standalone)return 'standalone';\n", '')),
    ('J8 playing does not note the date', lambda: edit(IJ, "try{w.localStorage.setItem(KEY,String(now));w.sessionStorage.setItem(SKEY,'1')}catch(e){return}", "try{w.sessionStorage.setItem(SKEY,'1')}catch(e){return}")),
    ('J9 the video loops', lambda: edit(IJ, 'v.loop=false;', 'v.loop=true;')),
    ('J10 Escape does nothing', lambda: edit(IJ, "if(e.key==='Escape'){e.preventDefault();finish();return}", '')),
    ('J11 no load time limit', lambda: edit(IJ, 'tLoad=setTimeout(finish,1800);', '')),
    ('J12 a future or broken date counts', lambda: edit(IJ, 'if(Number.isFinite(n)&&n>0&&n<=now)last=n;', 'if(n)last=n;')),
    ('J13 blocked storage plays every visit', lambda: edit(IJ, " if(o.storage===false)return 'storage';\n", '')),
    ('J14 the service worker caches the videos', lambda: edit(SW, "\n if(url.pathname.startsWith('/assets/intro/'))return;", '')),
    ('J15 the intro loads after the app', lambda: (edit(IX, '<script src="intro.js" defer></script>', ''), edit(IX, '<script src="app.js" defer></script>', '<script src="app.js" defer></script><script src="intro.js" defer></script>'))),
    ('J16 a splash rule comes back', lambda: edit(CSS, '/* LHB-72: la intro (intro.js).', '.splash{display:none}\n/* LHB-72: la intro (intro.js).')),
    ('J18 no stall limit after it starts', lambda: edit(IJ, "v.addEventListener('waiting',()=>{if(started){clearTimeout(tStall);tStall=setTimeout(finish,700)}});", '')),
    ('J19 no 9 s ceiling', lambda: edit(IJ, 'tMax=setTimeout(finish,9000);', '')),
    ('J17 an intro key without its English value', lambda: edit(I18, ' "intro.skip": "Skip intro",', '')),
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
print('baseline after restore: rc %d pass %s' % (r.returncode, n[-1] if n else '?'))
print('RESULT %d of %d mutations red' % (red, len(M)))
