"""LHB-40 mutation proof: each mutation breaks one rule of the public passport page in a scratch copy of the worktree,
runs the LHB-40 tests (and the LHB-24 and LHB-28 guards they amend), and must turn them red; the file is restored after each.
usage: python evidence/lhb-40-mutations.py WORKTREE SCRATCH"""
import os, shutil, subprocess, sys

WT, D = sys.argv[1], sys.argv[2]
if os.path.exists(D):
    shutil.rmtree(D)
shutil.copytree(WT, D, ignore=shutil.ignore_patterns('.git', 'node_modules'))
LIB = os.path.join('functions', '_lib', 'passport.js')
PAGE = os.path.join('functions', 'u', '[handle].js')
SW = os.path.join('site', 'sw.js')
ROUTES = os.path.join('site', '_routes.json')
M = [
    ('M1 the publica filter removed', LIB, ".filter(e => isObj(e) && e.publica === true)", ".filter(e => isObj(e))"),
    ('M2 publica read as truthy', LIB, "e.publica === true", "e.publica"),
    ('M3 the field whitelist dropped', LIB, ".map(publicEntry);", ".map(e => ({ ...e, ...publicEntry(e) }));"),
    ('M4 hidden profiles served', LIB, " AND p.hidden = 0'", "'"),
    ('M5 no HTML escaping', PAGE, "String(s ?? '').replace(/[&<>\"']/g, c =>", "String(s ?? '').replace(/[]/g, c =>"),
    ('M6 og:image missing', PAGE, "meta('og:image', img) +", ""),
    ('M7 indexable', PAGE, "const ROBOTS = 'noindex, follow';", "const ROBOTS = 'index, follow';"),
    ('M8 cached for an hour', PAGE, "'cache-control': 'no-store',", "'cache-control': 'public, max-age=3600',"),
    ('M9 the service worker answers /u/', SW, "if(url.pathname.startsWith('/u/'))return;", ""),
    ('M10 not sorted by the day smoked', LIB, "(b[0].consumido || '').localeCompare(a[0].consumido || '') || a[1] - b[1]", "a[1] - b[1]"),
    ('M11 full last name shown', LIB, "publicName(row.first_name, row.last_name)", "row.first_name + ' ' + row.last_name"),
    ('M12 avatar not checked', LIB, "av.error ? null : av.avatar_key", "row.avatar_key"),
    ('M13 no display cap', LIB, "catas: catas.slice(0, PUBLIC_MAX)", "catas"),
    ('M14 count capped too', LIB, "counts: { catas: catas.length, sellos }", "counts: { catas: Math.min(catas.length, PUBLIC_MAX), sellos }"),
    ('M15 stamps of one kind counted as another', LIB, "isObj(pas[k]) ? Object.keys(pas[k]).length : 0", "isObj(pas.artesanos) ? Object.keys(pas.artesanos).length : 0"),
    ('M16 Reportar mails someone else', PAGE, "export const CONTACT = 'sergio@cigarspodcast.com';", "export const CONTACT = 'otro@ejemplo.com';"),
    ('M17 a D1 failure throws instead of 503', PAGE, "try { r = await publicPassport(env.DB, params && params.handle); } catch (e) { return unavailable(); }", "r = await publicPassport(env.DB, params && params.handle);"),
    ('M18 /u/* not routed to Functions', ROUTES, '"include": ["/api/*", "/u/*"]', '"include": ["/api/*"]'),
    ('M19 the 404 names the profile', PAGE, "if (!r) return notFound();", "if (!r) return html('<h1>' + esc(params && params.handle) + ' no existe</h1>', 404);"),
    ('M20 description not escaped in meta', PAGE, "'<meta ' + attr + '=\"' + k + '\" content=\"' + esc(val) + '\">\\n'", "'<meta ' + attr + '=\"' + k + '\" content=\"' + val + '\">\\n'"),
]
PAT = 'LHB-40|LHB-24: _routes|LHB-28: Mi Hoja del servidor solo sale'
def run():
    r = subprocess.run(['node', '--test', '--test-timeout=60000', '--test-name-pattern=' + PAT, 'test/site.test.js'], cwd=D, capture_output=True, text=True, encoding='utf-8', errors='replace')
    fails = [l for l in r.stdout.splitlines() if l.startswith('# fail') or l.startswith('ℹ fail')]
    return r.returncode, fails[-1] if fails else '?'
rc, f = run()
print('baseline', rc, f)
assert rc == 0, 'baseline must be green'
red = 0
for name, rel, old, new in M:
    p = os.path.join(D, rel)
    src = open(p, encoding='utf-8', newline='').read()
    n = src.count(old)
    if n != 1:
        print(name, 'SKIPPED: anchor found', n, 'times')
        continue
    open(p, 'w', encoding='utf-8', newline='').write(src.replace(old, new))
    rc, f = run()
    open(p, 'w', encoding='utf-8', newline='').write(src)
    ok = rc != 0
    red += ok
    print(name, 'RED' if ok else 'SURVIVED', f)
rc, f = run()
print('restored', rc, f)
print('mutations', len(M), 'red', red)
sys.exit(0 if red == len(M) and rc == 0 else 1)
