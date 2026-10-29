"""LHB-100 and LHB-101 proof: on a scratch copy of the worktree, first put back the original main code (origin/main's site files) and
see both tests red; then break each part of the fix one at a time and see the tests red; the copy is restored after each.
usage: python evidence/lhb-100-mutations.py WORKTREE SCRATCH"""
import os, re, shutil, subprocess, sys

WT, D = sys.argv[1], sys.argv[2]
if os.path.exists(D):
    shutil.rmtree(D)
shutil.copytree(WT, D, ignore=shutil.ignore_patterns('.git', 'node_modules', 'evidence'))
PAT = 'LHB-100|LHB-101'
IX, APP, HJ, I18 = 'site/index.html', 'site/app.js', 'site/hoja.js', 'site/i18n.js'
FILES = (IX, APP, HJ, I18)


def runp():
    return subprocess.run(['node', '--test', '--test-timeout=60000', '--test-name-pattern=' + PAT, 'test/site.test.js'], cwd=D, capture_output=True, text=True, encoding='utf-8', errors='replace')


def edit(rel, old, new):
    p = os.path.join(D, rel)
    s = open(p, 'rb').read().decode('utf-8')
    if '\r\n' in s:
        old, new = old.replace('\r\n', '\n').replace('\n', '\r\n'), new.replace('\r\n', '\n').replace('\n', '\r\n')
    assert s.count(old) == 1, (rel, old[:80], s.count(old))
    open(p, 'wb').write(s.replace(old, new).encode('utf-8'))


def original():
    for rel in (IX, APP, HJ):
        b = subprocess.run(['git', 'show', 'origin/main:' + rel], cwd=WT, capture_output=True).stdout
        open(os.path.join(D, rel), 'wb').write(b)


M = [
    ('B0 the original main code (no guard, raw decode, S() unguarded)', original),
    ('B1 no ok() from app.js after the first view', lambda: edit(APP, 'route();if(window.LHB_BOOT)window.LHB_BOOT.ok();', 'route();')),
    ('B2 the guard does not act when the scripts finish loading', lambda: edit(IX, "d.addEventListener('DOMContentLoaded',function(){setTimeout(function(){if(!ok)fail()},0)});", '')),
    ('B3 no 12 s backstop', lambda: edit(IX, 'setTimeout(function(){if(ok)out();else fail()},12000)', '0')),
    ('B4 the fallback text differs from i18n.js', lambda: edit(IX, "'Recargar'", "'Reintentar'")),
    ('B5 a failed boot reloads by itself (a retry loop)', lambda: edit(IX, 'd.body.appendChild(b)}', 'd.body.appendChild(b);location.reload()}')),
    ('B6 a late boot leaves the message up', lambda: edit(IX, "w.LHB_BOOT={ok:function(){ok=true;var b=d.getElementById('bootFail');if(b&&b.parentNode)b.parentNode.removeChild(b)}};", "w.LHB_BOOT={ok:function(){ok=true}};")),
    ('B7 the splash stays on a failed boot', lambda: edit(IX, 'shown=true;out();', 'shown=true;')),
    ('R1 route() decodes without a guard', lambda: edit(APP, "let id='';if(arg){try{id=decodeURIComponent(arg)}catch(e){id=arg}}", "const id=arg?decodeURIComponent(arg):'';")),
    ('R2 S() lets a blocked read throw', lambda: edit(HJ, 'return ST}catch(e){ST=null;return DEF()}};', 'return ST}finally{}};')),
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
        print('%-66s rc %d fail %s -> %s' % (name, r.returncode, fails[-1] if fails else '?', 'RED' if ok else 'SURVIVED'), flush=True)
    finally:
        for rel, b in snap.items():
            open(os.path.join(D, rel), 'wb').write(b)
r = runp()
n = re.findall(r'^ℹ pass (\d+)', r.stdout, re.M)
f = re.findall(r'^ℹ fail (\d+)', r.stdout, re.M)
print('baseline after restore: rc %d pass %s fail %s' % (r.returncode, n[-1] if n else '?', f[-1] if f else '?'))
print('RESULT %d of %d mutations red' % (red, len(M)))
