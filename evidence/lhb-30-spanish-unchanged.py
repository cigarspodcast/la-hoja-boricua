"""LHB-30 evidence: the Spanish data is unchanged, and every targeted field has its English.
For each data file, the branch's records with every *_en field and traduccion removed must equal BASE's records exactly.
usage: python evidence/lhb-30-spanish-unchanged.py BASE   (run from the repo root)"""
import json, subprocess, sys
base = sys.argv[1] if len(sys.argv) > 1 else 'c398c0b'
TR = {'artesanos': ['tipo', 'historia', 'nota', 'donde_comprar'], 'cigarros': ['capa', 'notas'], 'places': ['tipo', 'horario']}
print('LHB-30 Spanish-unchanged check: data/*.json on the branch against', base)
print('counting basis: records in each file; fields = non-empty targeted Spanish fields; translated = has traduccion and every such field has a non-empty _en')
tot = [0, 0, 0, 0]
for f, ks in TR.items():
    old = json.loads(subprocess.run(['git', 'show', base + ':data/' + f + '.json'], capture_output=True, check=True).stdout)
    new = json.load(open('data/' + f + '.json', encoding='utf-8'))
    strip = [{k: v for k, v in r.items() if not k.endswith('_en') and k != 'traduccion'} for r in new]
    same = strip == old
    order = all(list(a) == list(b) for a, b in zip(strip, old))
    fields = sum(1 for r in new for k in ks if isinstance(r.get(k), str) and r[k].strip())
    done = sum(1 for r in new for k in ks if isinstance(r.get(k), str) and r[k].strip() and isinstance(r.get(k + '_en'), str) and r[k + '_en'].strip())
    trans = sum(1 for r in new if r.get('traduccion') == 'borrador')
    ident = sum(1 for r in new for k in ks if r.get(k + '_en') is not None and r[k + '_en'] == r[k])
    print('%-10s records %3d  Spanish identical: %s  key order kept: %s  fields %3d  with _en %3d  borrador %3d  _en equal to Spanish %d' % (f, len(new), same, order, fields, done, trans, ident))
    tot[0] += len(new); tot[1] += fields; tot[2] += done; tot[3] += trans
    if not (same and order):  # Codex round 1: a reorder of the Spanish keys also fails
        sys.exit(1)
print('TOTAL records %d, fields %d, with _en %d, records marked borrador %d' % tuple(tot))
