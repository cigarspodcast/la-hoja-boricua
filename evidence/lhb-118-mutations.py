"""LHB-118: each mutant breaks one promise of the Medallón rollout; the LHB-118 test must go red on every one and green on the restored tree.
usage (from the repo root): python evidence/lhb-118-mutations.py > evidence/lhb-118/mutations.txt"""
import subprocess, sys

MUTANTS = [
    ('the chosen dark theme keeps the day mark', 'site/styles.css', ':root[data-theme="dark"]{', None),
    ('a static page loses its night mark', 'site/lugares/index.html', '<img class="mark-d" src="../icons/icon-dark.svg" alt="" width="30" height="30">', ''),
    ('the share card keeps the small day mark', 'site/hoja.js', "mk.src=tk('mark-dark')==='block'?'icons/icon-full-dark.svg':'icons/icon-full.svg'", "mk.src='icons/icon.svg'"),
    ('the maskable icon crops the ring', 'tools/build_icons.py', "('icon-maskable-512.png', FULL, 512, .78, True)", "('icon-maskable-512.png', FULL, 512, .9, True)"),
    ('the intro pins display:block over the tokens', 'site/styles.css', '.intro-mark img{margin-bottom:6px;', '.intro-mark img{display:block;margin-bottom:6px;'),
    ('the static pages keep the paper tile at night', 'site/lugares/l.css', '--mark-bg:transparent;--mark-light:none;', '--mark-bg:#EFEBE2;--mark-light:none;'),
    ('the favicons come from the full master', 'tools/build_icons.py', "('favicon-16.png', SMALL,", "('favicon-16.png', FULL,"),
    ('the service worker forgets the night mark', 'site/sw.js', "'icons/icon-dark.svg',", ''),
    # Codex r1 (P3): a higher-specificity rule on the mark img would show both marks
    ('a brand img rule sets display', 'site/styles.css', '.brand img{border-radius:var(--r-s);', '.brand img{display:block;border-radius:var(--r-s);'),
    ('a static sheet sets display on the mark img', 'site/u.css', '.brand img{border-radius:var(--r-s);', '.brand img{display:inline-block;border-radius:var(--r-s);'),
]


def run():
    r = subprocess.run(['node', '--test', '--test-name-pattern=LHB-118', 'test/site.test.js'], capture_output=True, text=True, encoding='utf-8', errors='replace')
    return r.returncode


def first_dark_attr_swap(s):
    i = s.index(':root[data-theme="dark"]{')
    j = s.index('--mark-light:none;--mark-dark:block;', i)
    return s[:j] + '--mark-light:block;--mark-dark:none;' + s[j + len('--mark-light:none;--mark-dark:block;'):]


killed = 0
base = run()
print('restored tree before: rc', base)
for name, f, old, new in MUTANTS:
    src = open(f, encoding='utf-8', newline='').read()
    assert src.count(old) >= 1, (name, 'anchor missing')
    mut = first_dark_attr_swap(src) if new is None else src.replace(old, new, 1)
    assert mut != src, name
    open(f, 'w', encoding='utf-8', newline='').write(mut)
    try:
        rc = run()
    finally:
        open(f, 'w', encoding='utf-8', newline='').write(src)
    k = rc != 0
    killed += k
    print('%-48s rc %d  %s' % (name, rc, 'KILLED' if k else 'SURVIVED'))
after = run()
print('restored tree after: rc', after)
print('killed %d of %d' % (killed, len(MUTANTS)))
sys.exit(0 if killed == len(MUTANTS) and base == 0 and after == 0 else 1)
