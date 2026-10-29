"""LHB-75 proof: each mutation breaks the preview noindex guard (site/_headers) on a scratch copy of the worktree, runs the LHB-75 test,
and must turn it red; the copy is restored after each.
usage: python evidence/lhb-75-mutations.py WORKTREE SCRATCH"""
import os, re, shutil, subprocess, sys

WT, D = sys.argv[1], sys.argv[2]
if os.path.exists(D):
    shutil.rmtree(D)
shutil.copytree(WT, D, ignore=shutil.ignore_patterns('.git', 'node_modules', 'evidence'))
HF = os.path.join(D, 'site', '_headers')
GOOD = open(HF, 'rb').read()


def runp():
    return subprocess.run(['node', '--test', '--test-timeout=60000', '--test-name-pattern=LHB-75', 'test/site.test.js'], cwd=D, capture_output=True, text=True, encoding='utf-8', errors='replace')


def sub(old, new):
    s = GOOD.decode('utf-8')
    assert s.count(old) == 1, old
    open(HF, 'wb').write(s.replace(old, new).encode('utf-8'))


M = [
    ('V1 the rule covers every host (production too)', lambda: sub('https://:version.:project.pages.dev/*', '/*')),
    ('V2 the rule covers the production pages.dev name instead', lambda: sub('https://:version.:project.pages.dev/*', 'https://:project.pages.dev/*')),
    ('V3 the header says index', lambda: sub('X-Robots-Tag: noindex, nofollow', 'X-Robots-Tag: index, follow')),
    ('V4 no _headers file', lambda: os.remove(HF)),
    ('V5 a second rule changes production headers', lambda: sub('  X-Robots-Tag: noindex, nofollow\n', '  X-Robots-Tag: noindex, nofollow\n/*\n  X-Frame-Options: DENY\n')),
    ('V6 the header sits on a path rule, not the preview host', lambda: sub('https://:version.:project.pages.dev/*', 'https://:version.:project.pages.dev/u/*')),
]
red = 0
for name, mut in M:
    try:
        mut()
        r = runp()
        fails = re.findall(r'^ℹ fail (\d+)', r.stdout, re.M)
        ok = r.returncode != 0 and fails and int(fails[-1]) > 0
        red += bool(ok)
        print('%-60s rc %d fail %s -> %s' % (name, r.returncode, fails[-1] if fails else '?', 'RED' if ok else 'SURVIVED'), flush=True)
    finally:
        open(HF, 'wb').write(GOOD)
r = runp()
n = re.findall(r'^ℹ pass (\d+)', r.stdout, re.M)
f = re.findall(r'^ℹ fail (\d+)', r.stdout, re.M)
print('baseline after restore: rc %d pass %s fail %s' % (r.returncode, n[-1] if n else '?', f[-1] if f else '?'))
print('RESULT %d of %d mutations red' % (red, len(M)))
