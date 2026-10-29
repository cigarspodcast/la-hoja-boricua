"""LHB-71 proof: each mutation breaks one rule of the route-driven menu or the home on a scratch copy of the worktree, runs the LHB-71
tests and the i18n test, and must turn them red; the copy is restored after each. usage: python evidence/lhb-71-mutations.py WORKTREE SCRATCH"""
import os, re, shutil, subprocess, sys

WT, D = sys.argv[1], sys.argv[2]
if os.path.exists(D):
    shutil.rmtree(D)
shutil.copytree(WT, D, ignore=shutil.ignore_patterns('.git', 'node_modules', 'evidence'))
PAT = 'LHB-71|LHB-27: cada clave'
AP, HJ, IX = 'site/app.js', 'site/hoja.js', 'site/i18n.js'
FILES = (AP, HJ, IX, 'site/styles.css')


def runp():
    return subprocess.run(['node', '--test', '--test-timeout=60000', '--test-name-pattern=' + PAT, 'test/site.test.js'], cwd=D, capture_output=True, text=True, encoding='utf-8', errors='replace')


def edit(rel, old, new):
    p = os.path.join(D, rel)
    s = open(p, 'rb').read().decode('utf-8')
    assert s.count(old) == 1, (rel, old, s.count(old))
    open(p, 'wb').write(s.replace(old, new).encode('utf-8'))


M = [
    ('K1 a route added to the table without a menu entry (the Proof case)', lambda: edit(AP, " {r:'buscar',", " {r:'nueva',go:()=>vCatalogo()},\n {r:'buscar',")),
    ('K2 a detail route whose parent is not in the menu', lambda: edit(AP, "{r:'a',go:id=>vArtesano(id),of:'artesanos'}", "{r:'a',go:id=>vArtesano(id),of:'perfil'}")),
    ('K3 the router back to its own list', lambda: edit(AP, ' (ROUTE_OF[r]||ROUTE_OF.catalogo).go(id);', " ({catalogo:vCatalogo,c:()=>vCigar(id)}[r]||vCatalogo)();")),
    ('K4 hoja.js keeps a second hard-coded menu', lambda: edit(HJ, "if(kind==='menu'){sheet(A.menuHTML(),tt('h.menu'));return}", "const MENU=[['#/catalogo']];if(kind==='menu'){sheet(A.menuHTML(),tt('h.menu'));return}")),
    ('K5 People search dropped from the menu', lambda: edit(AP, ",['comunidad','people','menu.personas','menu.personasSub','personas']", '')),
    ('K6 no current-page marker', lambda: edit(AP, "${cur?' aria-current=\"page\"':''}", '')),
    ('K7 a detail page marks nothing (no parent lookup)', lambda: edit(AP, "home=x&&x.of?x.of:r;", 'home=r;')),
    ('K8 the Cigarros card moves focus into the search box', lambda: edit(AP, "e.preventDefault();h.scrollIntoView(", "e.preventDefault();$('#q').focus();h.scrollIntoView(")),
    ('K9 the Cigarros card scrolls nowhere', lambda: edit(AP, "e.preventDefault();h.scrollIntoView({block:'start',behavior:REDUCED_ALL?'auto':'smooth'})", 'e.preventDefault()')),
    ('K10 returning visitors get the full home', lambda: edit(AP, "const compact=homeCompact;", 'const compact=false;')),
    ('K12 decided at every render (a keystroke turns the home compact)', lambda: edit(AP, "if(homeCompact===null){homeCompact=!!LS.get('homeSeen',false);try{LS.set('homeSeen',true)}catch(e){}}", "homeCompact=!!LS.get('homeSeen',false);try{LS.set('homeSeen',true)}catch(e){}")),
    ('K13 the compact home keeps the install button', lambda: edit('site/styles.css', '.hero.compact~.btn-add,.hero.compact .eyebrow{display:none}', '.hero.compact .eyebrow{display:none}')),
    ('K14 (Codex r1) a full storage stops the catalog', lambda: edit(AP, "try{LS.set('homeSeen',true)}catch(e){}", "LS.set('homeSeen',true)")),
    ('K15 (Codex r1) Ctrl or Cmd click is cancelled', lambda: edit(AP, "if(e.defaultPrevented||e.button>0||e.metaKey||e.ctrlKey||e.shiftKey||e.altKey)return;", '')),
    ('K16 (Codex r1) the marker reads the hash raw', lambda: edit(AP, "const r=ROUTE_OF[r0]?r0:'catalogo',x=ROUTE_OF[r]", "arg0=a0;const r=r0||'catalogo',x=ROUTE_OF[r]")),
    ('K11 a menu key without its English value', lambda: edit(IX, ' "menu.personasSub": "Find someone by @ or by name",', '')),
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
        print('%-70s rc %d fail %s -> %s' % (name, r.returncode, fails[-1] if fails else '?', 'RED' if ok else 'SURVIVED'), flush=True)
    finally:
        for rel, b in snap.items():
            open(os.path.join(D, rel), 'wb').write(b)
r = runp()
n = re.findall(r'^ℹ pass (\d+)', r.stdout, re.M)
print('baseline after restore: rc %d pass %s' % (r.returncode, n[-1] if n else '?'))
print('RESULT %d of %d mutations red' % (red, len(M)))
