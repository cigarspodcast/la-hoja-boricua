"""LHB-118: each mutant breaks one promise of the Medallón rollout; the LHB-118 test must go red on every one and green on the restored tree.
usage (from the repo root): python evidence/lhb-118-mutations.py > evidence/lhb-118/mutations.txt"""
import subprocess, sys

MUTANTS = [
    ('the chosen dark theme keeps the day mark', 'site/styles.css', ':root[data-theme="dark"]{', None),
    ('a static page loses its night mark', 'site/lugares/index.html', '<img class="mark-d" src="../icons/icon-dark.svg" alt="" width="30" height="30">', ''),
    ('the share card keeps the small day mark', 'site/hoja.js', "mk.src=tk('mark-dark')==='block'?'icons/icon-full-dark.svg':'icons/icon-full.svg'", "mk.src='icons/icon.svg'"),
    ('the maskable icon crops the ring', 'tools/build_icons.py', "('icon-maskable-512.png', FULL, 512, .78, True)", "('icon-maskable-512.png', FULL, 512, .9, True)"),
    ('the static pages keep the paper tile at night', 'site/lugares/l.css', '--mark-bg:transparent;--mark-light:none;', '--mark-bg:#EFEBE2;--mark-light:none;'),
    ('the favicons come from the full master', 'tools/build_icons.py', "('favicon-16.png', SMALL,", "('favicon-16.png', FULL,"),
    ('the service worker forgets the night mark', 'site/sw.js', "'icons/icon-dark.svg',", ''),
    # Codex r1 and r2: the swap must win the cascade. The swap rules carry !important, so a normal rule (r1's .brand img{display:block},
    # r2's :not(), :is(), [alt="" i], +img, all:initial) loses and is no defect; what can still beat them is below
    ('the swap rules lose !important', 'site/styles.css', '.mark-l{display:var(--mark-light)!important}', '.mark-l{display:var(--mark-light)}'),
    ('a static sheet loses !important on the night rule', 'site/u.css', '.mark-d{display:var(--mark-dark)!important}', '.mark-d{display:var(--mark-dark)}'),
    ('another rule forces display with !important', 'site/styles.css', '.brand img{border-radius:var(--r-s);', '.brand img{display:block!important;border-radius:var(--r-s);'),
    ('an uppercase spaced important display', 'site/u.css', '.brand img{border-radius:var(--r-s);', '.brand img{DISPLAY:block ! IMPORTANT;border-radius:var(--r-s);'),
    ('an all reset with !important', 'site/lugares/l.css', '.brand img{border-radius:var(--r-s);', '.brand img{all:initial!important;border-radius:var(--r-s);'),
    ('a bare img forces display with !important', 'site/styles.css', '.brand img{border-radius:var(--r-s);', 'img{display:block!important}.brand img{border-radius:var(--r-s);'),
    ('a mark carries an inline style', 'site/lugares/index.html', '<img class="mark-d" src="../icons/icon-dark.svg" alt=""', '<img class="mark-d" src="../icons/icon-dark.svg" style="display:block" alt=""'),
    # Codex r3: the tokens themselves, CSS escapes, and hidden
    ('a rule sets the night token on the brand', 'site/u.css', '.brand img{border-radius:var(--r-s);', '.brand{--mark-dark:block}.brand img{border-radius:var(--r-s);'),
    ('a rule hides the day mark through its token', 'site/styles.css', '.brand img{border-radius:var(--r-s);', '.brand{--mark-light:none}.brand img{border-radius:var(--r-s);'),
    ('a page sets the night token inline', 'site/index.html', '<header class="topbar">', '<header class="topbar" style="--mark-dark:block">'),
    ('an escaped important display', 'site/lugares/l.css', '.brand img{border-radius:var(--r-s);', '.brand img{d\\69splay:block!\\69mportant;border-radius:var(--r-s);'),
    ('an escaped important all', 'site/styles.css', '.brand img{border-radius:var(--r-s);', '.brand img{a\\6c l:initial!important;border-radius:var(--r-s);'),
    ('a hidden mark shows', 'site/styles.css', '.mark-l[hidden],.mark-d[hidden]{display:none!important}', ''),
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
