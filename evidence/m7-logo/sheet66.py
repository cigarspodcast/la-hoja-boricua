"""LHB-66: builds the contact sheet (evidence/m7-logo/contact-sheet.html) from the candidates and the rasters logo66.py wrote, and
captures it to contact-sheet.png with headless Chrome. Each variant: one color and palette at 180 px, 32 and 16 px at real size and
magnified 6 times (pixels kept), the maskable icon with its 80 percent safe circle, and the wordmark (Fraunces for La Hoja,
widely spaced Figtree for BORICUA). usage: python evidence/m7-logo/sheet66.py WORKTREE"""
import json, os, subprocess, sys

WT = sys.argv[1]
EV = os.path.join(WT, 'evidence', 'm7-logo')
NAMES = [('ruta', 'Ruta', 'La hoja en línea; el nervio es una carretera que sube y para antes del punto.'),
         ('parada', 'Parada', 'Hoja llena; la carretera la cruza y sale por la punta hacia la parada.'),
         ('camino', 'Camino', 'Hoja llena con el nervio abierto; la carretera sale del tallo y llega al punto.')]
rows = json.load(open(os.path.join(EV, 'clusters.json'), encoding='utf-8'))


def svgsrc(n, v):
    return '../../site/assets/brand-candidates/leaf-%s-%s.svg' % (n, v)


def cl(n, v, s):
    r = [x for x in rows if x['variant'] == n and x['version'] == v and x['px'] == s][0]
    return '%d grupos, %s' % (r['clusters'], 'nervio y punto aparte' if r['separate'] else 'juntos')


H = ['''<!doctype html><html lang="es"><head><meta charset="utf-8"><title>LHB-66 hoja de contacto</title><style>
@font-face{font-family:'Fraunces';src:url(../../site/fonts/fraunces-normal-600.woff2) format('woff2');font-weight:600}
@font-face{font-family:'Figtree';src:url(../../site/fonts/figtree.woff2) format('woff2');font-weight:300 900}
body{margin:0;background:#F4F1EA;color:#263723;font:15px/1.4 'Figtree',system-ui,sans-serif;padding:28px 36px;width:1328px}
h1{font:600 30px/1.2 'Fraunces',Georgia,serif;margin:0 0 4px}.lead{color:#43513D;margin:0 0 22px}
.row{display:grid;grid-template-columns:150px 200px 200px 230px 210px 290px;gap:18px;align-items:center;background:#FFFDFA;border:1px solid #D7D8CC;border-radius:16px;padding:16px 18px;margin-bottom:16px}
.name b{font:600 22px 'Fraunces',Georgia,serif;display:block}.name small{color:#59614F;font-size:12.5px}
.cap{font-size:11.5px;color:#59614F;text-align:center;margin-top:4px}
.big img{width:180px;height:180px;display:block;margin:auto}
.small{display:flex;gap:10px;align-items:flex-end;justify-content:center}.small div{text-align:center}
.px img{image-rendering:pixelated}.mag16{width:96px;height:96px}.mag32{width:96px;height:96px}
.mask{position:relative;width:180px;height:180px;border-radius:50%;background:#F4F1EA;box-shadow:inset 0 0 0 1px #D7D8CC;margin:auto;overflow:hidden}
.mask img{position:absolute;left:36px;top:36px;width:108px;height:108px}
.mask i{position:absolute;inset:18px;border:1.5px dashed #146780;border-radius:50%}
.word{display:flex;align-items:center;gap:10px}.word img{width:72px;height:72px}
.word span b{display:block;font:600 34px/1 'Fraunces',Georgia,serif;color:#344C31}
.word span em{display:block;font:600 13px/1 'Figtree',sans-serif;letter-spacing:.42em;font-style:normal;color:#263723;margin-top:6px}
.foot{color:#59614F;font-size:12.5px;margin-top:8px}
</style></head><body>
<h1>La Hoja Boricua: tres candidatas del logo (LHB-66)</h1>
<p class="lead">Una hoja de tabaco cuyo nervio central es una carretera que termina en un punto: una parada en la ruta. Cada candidata en un color y en la paleta (tabaco, ámbar, rojo), a 180, 32 y 16 px, dentro de la zona segura del ícono adaptable (el círculo del 80 por ciento, a rayas), y con la marca escrita.</p>''']
for n, title, desc in NAMES:
    H.append(f'''<div class="row"><div class="name"><b>{title}</b><small>{desc}</small></div>
<div class="big"><img src="{svgsrc(n,'mono')}" alt=""><div class="cap">un color, 180 px</div></div>
<div class="big"><img src="{svgsrc(n,'color')}" alt=""><div class="cap">paleta, 180 px</div></div>
<div><div class="small px"><div><img src="raster/leaf-{n}-mono-32.png" width="32" height="32" alt=""><div class="cap">32</div></div><div><img src="raster/leaf-{n}-mono-16.png" width="16" height="16" alt=""><div class="cap">16</div></div>
<div><img class="mag16" src="raster/leaf-{n}-mono-16.png" alt=""><div class="cap">16 px aumentado</div></div></div>
<div class="small px" style="margin-top:8px"><div><img src="raster/leaf-{n}-color-32.png" width="32" height="32" alt=""></div><div><img src="raster/leaf-{n}-color-16.png" width="16" height="16" alt=""></div><div><img class="mag16" src="raster/leaf-{n}-color-16.png" alt=""></div></div>
<div class="cap">16 px, un color: {cl(n,'mono',16)}</div></div>
<div><div class="mask"><img src="{svgsrc(n,'color')}" alt=""><i></i></div><div class="cap">ícono adaptable: zona segura</div></div>
<div class="word"><img src="{svgsrc(n,'color')}" alt=""><span><b>La Hoja</b><em>BORICUA</em></span></div></div>''')
H.append('<p class="foot">Grupos: píxeles oscuros conectados (luma menor de 128 sobre blanco, 8 vecinos), contados por evidence/m7-logo/logo66.py; salida completa en clusters.txt. La búsqueda de marca registrada no se hizo aquí.</p></body></html>')
open(os.path.join(EV, 'contact-sheet.html'), 'w', encoding='utf-8', newline='\n').write('\n'.join(H))
chrome = r'C:\Program Files\Google\Chrome\Application\chrome.exe'
prof = os.path.join(os.environ.get('TEMP', '.'), 'lhb66-chrome')
r = subprocess.run([chrome, '--headless=new', '--disable-gpu', '--hide-scrollbars', '--allow-file-access-from-files', '--user-data-dir=' + prof,
                    '--window-size=1400,1000', '--virtual-time-budget=4000', '--screenshot=' + os.path.join(EV, 'contact-sheet.png'),
                    'file:///' + os.path.join(EV, 'contact-sheet.html').replace('\\', '/')], capture_output=True, timeout=90)
print('chrome rc', r.returncode, 'png bytes', os.path.getsize(os.path.join(EV, 'contact-sheet.png')))
