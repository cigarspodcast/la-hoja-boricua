"""LHB-58 mutation proof: each mutation breaks one rule of the profile page or GET /api/u/<handle> in a scratch copy of the worktree,
runs the LHB-58 tests (and the LHB-51 and LHB-85 tests they touch), and must turn them red; the file is restored after each.
usage: python evidence/lhb-58-mutations.py WORKTREE SCRATCH"""
import os, shutil, subprocess, sys

WT, D = sys.argv[1], sys.argv[2]
if os.path.exists(D):
    shutil.rmtree(D)
shutil.copytree(WT, D, ignore=shutil.ignore_patterns('.git', 'node_modules'))
LIB = os.path.join('functions', '_lib', 'passport.js')
API = os.path.join('functions', 'api', 'u', '[handle].js')
H = os.path.join('site', 'hoja.js')
APP = os.path.join('site', 'app.js')
M = [
    ('N1 the publica filter removed (server)', LIB, ".filter(e => isObj(e) && e.publica === true)", ".filter(e => isObj(e))"),
    ('N2 the endpoint sends the user id', API, "return json({ profile, counts:", "return json({ uid: r.uid, profile, counts:"),
    ('N3 followers not wired to the table', API, "followers: f.followers,", "followers: 0,"),
    ('N4 following reads the followers', API, "following: f.following,", "following: f.followers,"),
    ('N5 hidden profiles served (server)', LIB, " AND p.hidden = 0'", "'"),
    ('N6 a D1 failure throws instead of 503', API, "  } catch (e) {\n    return json({ error: 'unavailable' }, 503);\n  }", "  } finally {}"),
    ('N7 publica read as truthy (app)', H, "e.publica===true;", "!!e.publica;"),
    ('N8 Humidor tab for everyone', H, "const pfTabsFor=own=>own?PF_TABS:PF_TABS.filter(t=>t!=='humidor');", "const pfTabsFor=own=>PF_TABS;"),
    ('N9 Humidor panel for another person', H, "if(tab==='humidor'&&d.own)return", "if(tab==='humidor')return"),
    ('N10 bio not escaped', H, "<p class=\"pf-bio\">${esc(p.bio)}</p>", "<p class=\"pf-bio\">${p.bio}</p>"),
    ('N11 your own @ not sent to Perfil', H, "if(h&&me&&typeof me==='object'&&me.handle===h)", "if(false)"),
    ('N12 a late answer paints another page', H, " if($('#pfX')!==el)return;", ""),
    ('N13 a late answer of the previous account paints', H, "||!now||now.sub!==a.sub)return;", ")return;"),
    ('N14 the API reviews not reprojected', H, "(Array.isArray(b.resenas)?b.resenas:[]).filter(e=>e&&typeof e==='object').map(pfEntry)", "(Array.isArray(b.resenas)?b.resenas:[])"),
    ('N15 people rows do not link to the profile', H, '<a class="person-a" href="#/u/${encodeURIComponent(p.handle)}">', '<a class="person-a">'),
    ('N16 Perfil does not mount the profile', APP, " if(ac)EXT.profileOwn(ac);", ""),
    ('N17 no #/u/ route', APP, "u:()=>R.persona(id),", ""),
    ('N18 your Resenas count waits for the server (Codex round 1)', H, "pfCounts({...(o.counts||{}),resenas:d.resenas.length},true,o.a.handle)", "pfCounts(o.counts,true,o.a.handle)"),
    ('N19 Editar perfil and the follow slot swapped', H, "<div class=\"pf-act\">${own?", "<div class=\"pf-act\">${!own?"),
    ('N20 the own view fetches another handle', H, "const r=await pfFetch(a.handle);const now=acct.get();", "const r=await pfFetch('x'+a.handle);const now=acct.get();"),
    ('N21 a sync does not repaint your Perfil (Codex round 1)', H, "else if(location.hash==='#/mihoja/perfil')pfOwnSync()", ""),
    ('N22 a sync resets the open tab (Codex round 1)', H, "o.cur=pfCur();pfOwnPaint(o)}", "o.cur='resenas';pfOwnPaint(o)}"),
    ('N23 a sync repaints for another account (Codex round 1)', H, "if(!now||now.sub!==o.a.sub)return;o.cur=", "o.cur="),
    ('N24 no keyboard on the tabs (Codex round 1)', H, "b.onkeydown=e=>{", "b.onkeydownX=e=>{"),
    ('N25 every tab in the tab order (Codex round 1)', H, "b.setAttribute('tabindex',b.dataset.pftab===t?'0':'-1')", "b.setAttribute('tabindex','0')"),
    ('N26 the arrow keys do not move the focus (Codex round 1)', H, "if(el&&el.focus)el.focus()", ""),
    ('N27 the arrow keys stop at the ends (Codex round 1)', H, "order[(j+order.length)%order.length]", "order[Math.min(Math.max(j,0),order.length-1)]"),
]
PAT = 'LHB-58|LHB-51|LHB-85: la tarjeta|LHB-27: cada clave'
def run():
    r = subprocess.run(['node', '--test', '--test-timeout=60000', '--test-name-pattern=' + PAT, 'test/site.test.js'], cwd=D, capture_output=True, text=True, encoding='utf-8', errors='replace')
    tally = [l for l in r.stdout.splitlines() if l.startswith('ℹ tests') or l.startswith('ℹ fail')]
    return r.returncode, ' '.join(tally[-2:]) if tally else '?'
rc, f = run()
print('baseline', rc, f)
assert rc == 0, 'baseline must be green'
red = 0
for name, rel, old, new in M:
    p = os.path.join(D, rel)
    raw = open(p, encoding='utf-8', newline='').read()
    crlf = '\r\n' in raw
    src = raw.replace('\r\n', '\n')
    n = src.count(old)
    if n != 1:
        print(name, 'SKIPPED: anchor found', n, 'times')
        continue
    out = src.replace(old, new)
    open(p, 'w', encoding='utf-8', newline='').write(out.replace('\n', '\r\n') if crlf else out)
    rc, f = run()
    open(p, 'w', encoding='utf-8', newline='').write(raw)
    ok = rc != 0
    red += ok
    print(name, 'RED' if ok else 'SURVIVED', f)
rc, f = run()
print('restored', rc, f)
print('mutations', len(M), 'red', red)
sys.exit(0 if red == len(M) and rc == 0 else 1)
