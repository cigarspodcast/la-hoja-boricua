"""LHB-87 mutation proof after the Codex round 2 fix (list popup capped to the map height): each mutation breaks one thing on a scratch copy of the worktree, runs the LHB-87 tests, and
must turn them red; the copy is restored after each. usage: python evidence/lhb-87-mutations-r2fix.py WORKTREE SCRATCH"""
import os, re, shutil, subprocess, sys

WT, D = sys.argv[1], sys.argv[2]
if os.path.exists(D):
    shutil.rmtree(D)
shutil.copytree(WT, D, ignore=shutil.ignore_patterns('.git', 'node_modules'))


def edit(rel, old, new):
    p = os.path.join(D, rel)
    s = open(p, 'rb').read().decode('utf-8')
    assert s.count(old) == 1, (rel, old, s.count(old))
    open(p, 'wb').write(s.replace(old, new).encode('utf-8'))


M = [
    ('M1 two boxes touch only when they overlap (no 2 px of air)', lambda: edit('site/app.js', 'a[0]<b[2]+2&&b[0]<a[2]+2&&a[1]<b[3]+2&&b[1]<a[3]+2', 'a[0]<b[2]&&b[0]<a[2]&&a[1]<b[3]&&b[1]<a[3]')),
    ('M2 groupPins merges only one pass', lambda: edit('site/app.js', 'for(let again=true;again;){again=false;', 'for(let again=true;again;again=false){')),
    ('M3 a group box the size of a pin', lambda: edit('site/app.js', 'n>1?[x-18,y-18,x+18,y+18]', 'n>1?[x-13,y-32,x+13,y+2]')),
    ('M4 the markers go straight to the map again', lambda: edit('site/app.js', '{icon,title:p.nombre,keyboard:true});', '{icon,title:p.nombre,keyboard:true}).addTo(map);')),
    ('M5 no regrouping on zoom', lambda: edit('site/app.js', "map.on('zoomend',layout);", '')),
    ('M6 no layout on open', lambda: edit('site/app.js', 'map.setView(pts[0],14);layout()}', 'map.setView(pts[0],14)}')),
    ('M7 the group not reachable by keyboard', lambda: edit('site/app.js', "title:tt('map.group',{n}),keyboard:true", "title:tt('map.group',{n}),keyboard:false")),
    ('M8 the group without its count', lambda: edit('site/app.js', 'html:`<span>${n}</span>`', 'html:`<span></span>`')),
    ('M9 tapping a group never shows the list', lambda: edit('site/app.js', "setContent(g.ms.map(m=>placeCard(m.p)).join(''))", "setContent('')")),
    ('M10 the English label missing', lambda: edit('site/i18n.js', '"map.group": "{n} places here: zoom in"', '"map.group": "{n} places here"')),
    ('M12 the group icon drawn at 48 px while its box says 36', lambda: edit('site/app.js', 'iconSize:[36,36],iconAnchor:[18,18]', 'iconSize:[48,48],iconAnchor:[24,24]')),
    ('M13 tapGroup ignores the fit zoom (the round 1 behaviour)', lambda: edit('site/app.js', "one||z>=17||Math.min(fz,17)<=z?'list':'zoom'", "one||z>=17?'list':'zoom'")),
    ('M14 a fit zoom equal to the current one still zooms', lambda: edit('site/app.js', "Math.min(fz,17)<=z?'list'", "Math.min(fz,17)<z?'list'")),
    ('M15 getBoundsZoom with half the fitBounds padding', lambda: edit('site/app.js', 'map.getBoundsZoom(b,false,L.point(96,96))', 'map.getBoundsZoom(b,false,L.point(48,48))')),
    ('M16 the handler no longer asks tapGroup', lambda: edit('site/app.js', "if(tapGroup(map.getZoom(),map.getBoundsZoom(b,false,L.point(96,96)),b.getNorthEast().equals(b.getSouthWest()))==='list')", "if(map.getZoom()>=17||b.getNorthEast().equals(b.getSouthWest()))")),
    ('M17 the list popup back to a fixed 320 px', lambda: edit('site/app.js', 'maxHeight:popMaxH(map.getSize().y)}).setLatLng(at)', 'maxHeight:320}).setLatLng(at)')),
    ('M18 POP_FIXED under the popup chrome (80)', lambda: edit('site/app.js', 'const POP_FIXED=104,', 'const POP_FIXED=80,')),
    ('M19 popMaxH without its 60 px floor', lambda: edit('site/app.js', 'popMaxH=h=>Math.max(60,Math.min(320,h-POP_FIXED));', 'popMaxH=h=>Math.max(0,Math.min(320,h-POP_FIXED));')),
    ('M20 popMaxH without its 320 px cap', lambda: edit('site/app.js', 'popMaxH=h=>Math.max(60,Math.min(320,h-POP_FIXED));', 'popMaxH=h=>Math.max(60,Math.min(9999,h-POP_FIXED));')),
    ('M11 the group circle 20 px',lambda: edit('site/styles.css', '.pin-group span{width:36px;height:36px;', '.pin-group span{width:20px;height:20px;')),
]
red = 0
for name, mut in M:
    snap = {rel: open(os.path.join(D, rel), 'rb').read() for rel in ('site/app.js', 'site/i18n.js', 'site/styles.css')}
    try:
        mut()
        r = subprocess.run(['node', '--test', '--test-timeout=60000', '--test-name-pattern=LHB-87', 'test/site.test.js'], cwd=D, capture_output=True, text=True, encoding='utf-8', errors='replace')
        fails = re.findall(r'^ℹ fail (\d+)', r.stdout, re.M)
        ok = r.returncode != 0 and fails and int(fails[-1]) > 0
        red += bool(ok)
        print('%-62s rc %d fail %s -> %s' % (name, r.returncode, fails[-1] if fails else '?', 'RED' if ok else 'SURVIVED'), flush=True)
    finally:
        for rel, b in snap.items():
            open(os.path.join(D, rel), 'wb').write(b)
r = subprocess.run(['node', '--test', '--test-timeout=60000', '--test-name-pattern=LHB-87', 'test/site.test.js'], cwd=D, capture_output=True, text=True, encoding='utf-8', errors='replace')
print('baseline after restore: rc %d' % r.returncode)
print('RESULT %d of %d mutations red' % (red, len(M)))
