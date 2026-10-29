"""LHB-65: the old color token names, defined and read, in every site/*.css, *.js and *.html (top level), and the new tokens with their values.
With --rev REV it also runs the LHB-65 tests with REV's site files (the red-before run). usage: python evidence/lhb-65-names.py WORKTREE [--rev REV SCRATCH]"""
import os, re, shutil, subprocess, sys
WT = sys.argv[1]
S = os.path.join(WT, 'site')
OLD = ['bg', 'bg2', 'card2', 'cream', 'cream2', 'gold', 'flam', 'flam2', 'ado', 'ado-d', 'rosa', 'amarillo', 'turq', 'verde', 'lila', 'pr-red', 'pr-blue']
files = sorted(f for f in os.listdir(S) if re.search(r'\.(css|js|html)$', f))
print('files searched (site/ top level, css js html):', len(files))
tot = 0
for o in OLD:
    reads = defs = 0
    for f in files:
        x = open(os.path.join(S, f), encoding='utf-8').read()
        reads += x.count('var(--' + o + ')')
        defs += len(re.findall(r'--' + re.escape(o) + r'\s*:', x))
    tot += reads + defs
    print('--%-9s read %d defined %d' % (o, reads, defs))
print('old names read or defined, total:', tot)
css = open(os.path.join(S, 'styles.css'), encoding='utf-8').read()
root = re.sub(r'/\*.*?\*/', '', re.search(r':root\{([^}]*)\}', css).group(1), flags=re.S)
print('tokens in :root:')
for m in re.finditer(r'--([a-z0-9-]+):([^;]+);', root):
    print('  --%s: %s' % (m.group(1), m.group(2).strip()))
if '--rev' in sys.argv:
    rev, D = sys.argv[sys.argv.index('--rev') + 1], sys.argv[sys.argv.index('--rev') + 2]
    if os.path.exists(D):
        shutil.rmtree(D)
    shutil.copytree(WT, D, ignore=shutil.ignore_patterns('.git', 'node_modules'))
    for rel in ('site/styles.css', 'site/app.js', 'site/hoja.js', 'site/i18n.js', 'site/manifest.webmanifest', 'site/sw.js'):
        open(os.path.join(D, rel), 'wb').write(subprocess.run(['git', 'show', rev + ':' + rel], cwd=WT, capture_output=True, check=True).stdout)
    r = subprocess.run(['node', '--test', '--test-timeout=60000', '--test-name-pattern=LHB-65', 'test/site.test.js'], cwd=D, capture_output=True, text=True, encoding='utf-8', errors='replace')
    print('red-before with', rev, 'site files:')
    for line in r.stdout.splitlines():
        if line[:1] in ('✔', '✖') or re.match(r'^ℹ (tests|pass|fail|contraste)', line):
            print(line)
    print('rc', r.returncode)
