#!/usr/bin/env python3
# Genera site/llms.txt (LHB-42): un mapa del sitio para modelos de lenguaje, una línea por página,
# con las mismas páginas que site/sitemap.xml. tools/build_lugares.py lo llama al final.
import json, os
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SITE = os.path.join(ROOT, 'site')
HOST = 'https://lahojaboricua.com'
load = lambda n: json.load(open(os.path.join(ROOT, 'data', n), encoding='utf-8'))
FORT = {'suave': 'suave', 'media': 'media', 'fuerte': 'fuerte'}
one = lambda s: ' '.join(str(s or '').split())  # una sola línea

def build():
    P, A, C = load('places.json'), load('artesanos.json'), load('cigarros.json')
    an = {a['id']: a['nombre'] for a in A}
    out = ['# La Hoja Boricua', '',
           '> Guía en español de cigarros hechos por artesanos boricuas, cigar lounges y tiendas de cigarros en Puerto Rico, '
           'hecha por Cigars Podcast. Cada página cita sus fuentes; la información es pública y está sujeta a verificación.', '',
           '## Secciones', '',
           f'- [La Hoja Boricua]({HOST}/): la app, con catálogo, artesanos, lugares, eventos y Mi Hoja',
           f'- [Cigar lounges en Puerto Rico]({HOST}/lugares/): {sum(p["categoria"] == "lounge" for p in P)} lounges y {sum(p["categoria"] != "lounge" for p in P)} tiendas, por pueblo',
           f'- [Artesanos de cigarros en Puerto Rico]({HOST}/artesanos/): {len(A)} artesanos, torcedores y tabacaleras',
           f'- [Cigarros hechos por artesanos boricuas]({HOST}/cigarros/): {len(C)} cigarros con capa, fortaleza y vitolas', '',
           '## Lugares', '']
    for p in sorted(P, key=lambda x: x['nombre'].lower()):
        out.append(f'- [{one(p["nombre"])}]({HOST}/lugares/{p["id"]}): {one(p["tipo"]).lower()} en {one(p.get("pueblo"))}')
    out += ['', '## Artesanos', '']
    for a in sorted(A, key=lambda x: x['nombre'].lower()):
        bits = ', '.join(b for b in (one(a.get('tipo')), one(a.get('pueblo'))) if b)
        out.append(f'- [{one(a["nombre"])}]({HOST}/artesanos/{a["id"]})' + (f': {bits}' if bits else ''))
    out += ['', '## Cigarros', '']
    for c in sorted(C, key=lambda x: x['nombre'].lower()):
        bits = [f'de {one(an.get(c.get("artesano_id"), ""))}' if an.get(c.get('artesano_id')) else '']
        if (c.get('capa') or '').strip(): bits.append(f'capa {one(c["capa"])}')
        if c.get('fortaleza') in FORT: bits.append(f'fortaleza {FORT[c["fortaleza"]]}')
        bits = [b for b in bits if b]
        out.append(f'- [{one(c["nombre"])}]({HOST}/cigarros/{c["id"]})' + (': ' + ', '.join(bits) if bits else ''))
    open(os.path.join(SITE, 'llms.txt'), 'w', encoding='utf-8', newline='\n').write('\n'.join(out) + '\n')
    return len(P) + len(A) + len(C) + 4

if __name__ == '__main__':
    print('llms.txt', build())
