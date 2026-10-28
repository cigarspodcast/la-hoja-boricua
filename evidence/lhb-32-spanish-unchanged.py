"""LHB-32 evidence: the Spanish pages are unchanged except for the three hreflang lines each one gains.
For every site/{lugares,artesanos,cigarros}/*.html at BASE and on the branch: the branch file with its
<link rel="alternate" hreflang=...> lines removed must equal the BASE file; each page has exactly three such lines,
right after its canonical line. Also: llms.txt is unchanged, and the sitemap's Spanish entries are BASE's entries.
usage: python evidence/lhb-32-spanish-unchanged.py BASE   (run from the repo root)"""
import os, re, subprocess, sys
base = sys.argv[1] if len(sys.argv) > 1 else 'd9a247c'
show = lambda f: subprocess.run(['git', 'show', base + ':' + f], capture_output=True, check=True).stdout.decode('utf-8').replace('\r\n', '\n')
cur = lambda f: open(f, encoding='utf-8', newline='').read().replace('\r\n', '\n')
ALT = re.compile(r'^<link rel="alternate" hreflang="[^"]+" href="[^"]+">$')
print('LHB-32 Spanish-unchanged check: the branch working tree against', base)
print('counting basis: one page = one .html file in site/<section>/; lines compared after CRLF to LF')
bad = 0; tot = 0
for d in ('lugares', 'artesanos', 'cigarros'):
    old = sorted(f for f in subprocess.run(['git', 'ls-tree', '--name-only', base, 'site/' + d + '/'], capture_output=True, check=True, text=True).stdout.split() if f.endswith('.html'))
    new = sorted('site/' + d + '/' + f for f in os.listdir('site/' + d) if f.endswith('.html'))
    same_set = old == new; n_ok = 0
    for f in new:
        lines = cur(f).split('\n'); alts = [i for i, l in enumerate(lines) if ALT.match(l)]
        canon = next(i for i, l in enumerate(lines) if l.startswith('<link rel="canonical"'))
        stripped = '\n'.join(l for l in lines if not ALT.match(l))
        ok = f in old and stripped == show(f) and alts == [canon + 1, canon + 2, canon + 3]
        n_ok += ok
        if not ok: print('  DIFFERS', f)
    print('%-10s pages at base %3d  on branch %3d  same set: %s  identical except 3 hreflang lines after canonical: %d' % (d, len(old), len(new), same_set, n_ok))
    tot += len(new); bad += (not same_set) + (len(new) - n_ok)
llms = cur('site/llms.txt') == show('site/llms.txt')
locs = lambda s: re.findall(r'<loc>([^<]+)</loc>', s)
sm_old = locs(show('site/sitemap.xml')); sm_es = [u for u in locs(cur('site/sitemap.xml')) if not u.startswith('https://lahojaboricua.com/en/')]
print('llms.txt unchanged: %s' % llms)
print('sitemap: base entries %d, branch Spanish entries %d, same and in the same order: %s' % (len(sm_old), len(sm_es), sm_old == sm_es))
bad += (not llms) + (sm_old != sm_es)
print('TOTAL Spanish pages %d, problems %d' % (tot, bad))
sys.exit(1 if bad else 0)
