# LHB-7: each mutant breaks one behaviour; the suite must fail on every one. Restores the files afterwards.
import pathlib, subprocess, sys
ROOT = pathlib.Path(__file__).resolve().parent.parent
M = [
    ('404.html', "if(p===BASE||p.indexOf(BASE+'/')===0)p=p.slice(BASE.length);", '', 'destino keeps the old prefix'),
    ('404.html', 'if(tieneDatos()){', 'if(false){', 'redirects even with Mi Hoja data'),
    ('404.html', "else w.location.replace(to);", '', 'never redirects'),
    ('404.html', 'mh.draft=null;', '', 'backup keeps the draft'),
    ('404.html', "if(!leer(KEY)){", 'if(false){', 'backup drops the legacy favourites'),
    ('404.html', "lleno(leer('vb_uploads'))", 'false', 'legacy uploads alone do not count as data'),
    ('404.html', 'mihoja:mh,', 'datos:mh,', 'backup in a format the new app does not import'),
    ('sw.js', 'await self.registration.unregister()', '0', 'worker stays registered'),
    ('sw.js', 'await Promise.all(ks.map(k=>caches.delete(k)))', '0', 'caches kept'),
    ('sw.js', "self.addEventListener('install',()=>self.skipWaiting());", '', 'worker waits behind the old one'),
]
red = 0
for f, a, b, why in M:
    p = ROOT / f
    s = p.read_text(encoding='utf-8')
    assert s.count(a) == 1, (f, a)
    p.write_text(s.replace(a, b), encoding='utf-8')
    try:
        r = subprocess.run(['node', '--test', str(ROOT / 'evidence' / 'retiro.test.js')], capture_output=True, text=True)
    finally:
        p.write_text(s, encoding='utf-8')
    ok = r.returncode != 0
    red += ok
    print(('RED   ' if ok else 'ALIVE ') + why)
print(f'{red} of {len(M)} mutants red')
sys.exit(0 if red == len(M) else 1)
