#!/usr/bin/env python3
# Informe de fuentes por registro (LHB-14). Solo lee data/*.json; no cambia nada.
# Una fuente "usable" es un texto que empieza con http:// o https://. Una clave presente pero vacía,
# o que solo tiene rutas locales o texto, no cuenta como fuente: ese registro sale listado por id.
# Uso: python tools/source_report.py [--data DIR] [--out ARCHIVO]
import argparse, json, os, sys
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

def is_url(s):
    return isinstance(s, str) and s.strip().lower().startswith(('http://', 'https://'))

def urls_of(v):
    """Las URLs dentro de un valor de fuente: texto, lista de textos o lista de objetos con url."""
    if isinstance(v, str):
        return [v] if is_url(v) else []
    if isinstance(v, list):
        return [u for x in v for u in urls_of(x)]
    if isinstance(v, dict):
        return [u for x in v.values() for u in urls_of(x)]
    return []

# archivo, cómo sacar la lista de registros, y las claves que guardan fuentes (las que ya existen; no se inventa ninguna)
FILES = [
    ('places.json', lambda d: d, ['fuentes', 'web']),
    ('artesanos.json', lambda d: d, ['fuentes', 'web', 'hecho_en_pr_fuente']),
    ('cigarros.json', lambda d: d, ['fuentes']),
    ('events.json', lambda d: d['actividades'], ['fuente_url', 'fuente']),
]

def report(data_dir):
    out = ['# LHB-14: fuentes por registro', f'# datos: {os.path.abspath(data_dir)}',
           '# base de conteo: registros por archivo; una clave "presente" es una clave que existe en el registro;',
           '# "con URL" es un registro con al menos una URL http(s) en sus claves de fuente; "sin URL usable" es el resto.', '']
    total_without = 0
    for name, recs_of, keys in FILES:
        recs = recs_of(json.load(open(os.path.join(data_dir, name), encoding='utf-8')))
        out.append(f'## {name}: {len(recs)} registros (base: elementos de la lista de registros)')
        for k in keys:
            present = sum(1 for r in recs if k in r)
            with_url = sum(1 for r in recs if urls_of(r.get(k)))
            out.append(f'- clave {k}: presente en {present} de {len(recs)} registros; con al menos una URL en {with_url} de {len(recs)}')
            if k == 'fuentes':  # el ticket pide aparte los fuentes vacíos o sin URL, aunque otra clave sí traiga una
                out.extend(f'  - fuentes vacío o sin URL: {r.get("id")}' for r in recs if not urls_of(r.get(k)))
        without = [r.get('id', f'(sin id, posición {i})') for i, r in enumerate(recs) if not any(urls_of(r.get(k)) for k in keys)]
        out.append(f'- registros con al menos una URL en alguna clave de fuente: {len(recs) - len(without)} de {len(recs)}')
        out.append(f'- registros sin URL usable en ninguna clave de fuente: {len(without)} de {len(recs)}')
        out.extend(f'  - sin fuente: {i}' for i in without)
        out.append('')
        total_without += len(without)
    out.append(f'TOTAL sin URL usable: {total_without} registros (base: suma de los cuatro archivos)')
    return '\n'.join(out) + '\n', total_without

def main(argv=None):
    ap = argparse.ArgumentParser()
    ap.add_argument('--data', default=os.path.join(ROOT, 'data'))
    ap.add_argument('--out', default=os.path.join(ROOT, 'evidence', 'lhb-14-sources.txt'))
    a = ap.parse_args(argv)
    text, _ = report(a.data)
    with open(a.out, 'w', encoding='utf-8', newline='\n') as f:
        f.write(text)
    sys.stdout.write(text)

if __name__ == '__main__':
    main()
