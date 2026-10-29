"""LHB-66 (M7-F2a): writes the three logo candidates (one color and palette) to site/assets/brand-candidates/, rasterizes each at
16, 32 and 180 px with resvg, and counts the dark pixel clusters to check that the rib and the dot stay separate at every size.
Counting basis: 8-connected clusters of dark pixels (sRGB luma below 128, on white), per variant, per size, for the one-color
version (the ticket's check); the palette version is counted the same way over ink pixels (luma below 200), for information.
usage: python evidence/m7-logo/logo66.py WORKTREE   (needs resvg-py and Pillow)"""
import io, json, math, os, sys
import resvg_py
from PIL import Image

WT = sys.argv[1]
OUT = os.path.join(WT, 'site', 'assets', 'brand-candidates')
EV = os.path.join(WT, 'evidence', 'm7-logo')
os.makedirs(OUT, exist_ok=True)
os.makedirs(os.path.join(EV, 'raster'), exist_ok=True)

INK = '#263723'                                                   # --on-surface: the one-color version
TOB, AMB, RED, PAP = '#344C31', '#C77943', '#D12A1B', '#F4F1EA'   # --tobacco, --amber, --red, --paper

# a tobacco leaf: long and broad (about twice as long as wide), widest a little below the middle, an acuminate tip, a short
# petiole. Drawn upright in its own coordinates (tip at y -48, base at y 44) and laid at 35 degrees, tip to the upper right.
LEAF = 'M0 44 C-16 38 -27 20 -26 2 C-25 -18 -12 -36 0 -48 C12 -36 25 -18 26 2 C27 20 16 38 0 44Z'
STEM = 'M0 43 L0 50'
TX, TY, ROT, SC = 47, 56, 35, .9
PLACE = 'translate(%g %g) rotate(%g) scale(%g)' % (TX, TY, ROT, SC)


def g(x, y):
    """a point of the leaf's own coordinates in the viewBox"""
    t = math.radians(ROT)
    x, y = x * SC, y * SC
    return (TX + x * math.cos(t) - y * math.sin(t), TY + x * math.sin(t) + y * math.cos(t))


def v1(c):
    """Ruta: the leaf drawn as a line, two pairs of veins that curve toward the tip, and the rib as a road that stops short
    of a dot, the stop"""
    leaf, road, dot = c
    return f'''<g transform="{PLACE}" fill="none" stroke-linecap="round" stroke-linejoin="round">
<path d="{LEAF}" stroke="{leaf}" stroke-width="7"/>
<path d="{STEM}" stroke="{leaf}" stroke-width="7"/>
<path d="M-3 26 Q-14 24 -18 12 M4 22 Q15 19 18 7" stroke="{leaf}" stroke-width="4.5"/>
<path d="M0 47 C-7 32 8 18 1 2" stroke="{road}" stroke-width="7"/>
<circle cx="1" cy="-19" r="6.5" fill="{dot}" stroke="none"/></g>'''


def v2(c):
    """Parada: a solid leaf; the road is cut out of it, runs out through the tip, and the dot waits just past it"""
    leaf, road, dot = c
    line = '' if road is None else f'<path d="M0 47 C-7 32 8 18 1 2 C-5 -12 6 -26 1 -40 C0 -44 0 -47 0 -50" fill="none" stroke="{road}" stroke-width="3" stroke-linecap="round"/>'
    return f'''<defs><mask id="m2" maskUnits="userSpaceOnUse" x="-80" y="-80" width="160" height="160"><rect x="-80" y="-80" width="160" height="160" fill="#fff"/>
<path d="M0 47 C-7 32 8 18 1 2 C-5 -12 6 -26 1 -40 C0 -44 0 -47 0 -60" fill="none" stroke="#000" stroke-width="6.5" stroke-linecap="round"/></mask></defs>
<g transform="{PLACE}"><g mask="url(#m2)"><path d="{LEAF}" fill="{leaf}"/><path d="{STEM}" stroke="{leaf}" stroke-width="7" stroke-linecap="round"/></g>
{line}
<circle cx="0" cy="-63" r="6.5" fill="{dot}"/></g>'''


def v3(c):
    """Camino: a solid leaf with its rib cut out; the road leaves the leaf at the stem and curves along the bottom to the dot"""
    leaf, road, dot = c
    bx, by = g(0, 49)
    line = '' if road == leaf else f'<path d="M0 44 C-7 32 8 18 1 2 C-4 -10 5 -20 2 -36" fill="none" stroke="{road}" stroke-width="3" stroke-linecap="round"/>'
    return f'''<defs><mask id="m3" maskUnits="userSpaceOnUse" x="-80" y="-80" width="160" height="160"><rect x="-80" y="-80" width="160" height="160" fill="#fff"/>
<path d="M0 44 C-7 32 8 18 1 2 C-4 -10 5 -20 2 -36" fill="none" stroke="#000" stroke-width="7" stroke-linecap="round"/></mask></defs>
<g transform="{PLACE}"><g mask="url(#m3)"><path d="{LEAF}" fill="{leaf}"/></g>{line}</g>
<path d="M{bx:.1f} {by:.1f} C26 96 44 95 56 89 C61 86 65 84 69 82" fill="none" stroke="{road}" stroke-width="7" stroke-linecap="round"/>
<circle cx="84" cy="73" r="6.5" fill="{dot}"/>'''


VARIANTS = [
    # name, builder, where the dot is, a point on the rib (or on the leaf body beside a cut-out rib), in viewBox units
    ('ruta', v1, g(1, -19), g(1, 12)),
    ('parada', v2, g(0, -63), g(-14, 10)),
    ('camino', v3, (84, 73), g(-14, 10)),
]
VERSIONS = {'mono': (INK, INK, INK), 'color': (TOB, AMB, RED)}


def svg(body, title):
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" role="img" aria-label="{title}">\n<title>{title}</title>\n{body}\n</svg>\n'


def clusters(png, cut=128):
    im = Image.open(io.BytesIO(png)).convert('RGBA')
    bg = Image.new('RGBA', im.size, (255, 255, 255, 255))
    bg.alpha_composite(im)
    g = bg.convert('L')
    W, H = g.size
    px = g.load()
    dark = [[px[x, y] < cut for x in range(W)] for y in range(H)]
    lab = [[0] * W for _ in range(H)]
    n = 0
    for y in range(H):
        for x in range(W):
            if dark[y][x] and not lab[y][x]:
                n += 1
                st = [(x, y)]
                lab[y][x] = n
                while st:
                    a, b = st.pop()
                    for dx in (-1, 0, 1):
                        for dy in (-1, 0, 1):
                            u, v = a + dx, b + dy
                            if 0 <= u < W and 0 <= v < H and dark[v][u] and not lab[v][u]:
                                lab[v][u] = n
                                st.append((u, v))
    return n, lab, W


def near(lab, W, pt, s):
    """the cluster under a viewBox point at size s, or the nearest labeled pixel within one pixel of it"""
    x, y = pt[0] * s / 100, pt[1] * s / 100
    best = None
    for dy in (-1, 0, 1):
        for dx in (-1, 0, 1):
            u, v = int(x) + dx, int(y) + dy
            if 0 <= u < W and 0 <= v < W and lab[v][u]:
                d = (u + .5 - x) ** 2 + (v + .5 - y) ** 2
                if best is None or d < best[0]:
                    best = (d, lab[v][u])
    return best[1] if best else 0


rows, ok = [], True
for name, build, dot, rib in VARIANTS:
    for ver, cols in VERSIONS.items():
        title = 'La Hoja Boricua, candidata %s (%s)' % (name, 'un color' if ver == 'mono' else 'paleta')
        body = build(cols if ver == 'color' else (INK, None if name == 'parada' else INK, INK))
        fn = os.path.join(OUT, 'leaf-%s-%s.svg' % (name, ver))
        open(fn, 'w', encoding='utf-8', newline='\n').write(svg(body, title))
        for s in (16, 32, 180):
            png = resvg_py.svg_to_bytes(svg_path=fn, width=s, height=s)
            png = bytes(png)
            open(os.path.join(EV, 'raster', 'leaf-%s-%s-%d.png' % (name, ver, s)), 'wb').write(png)
            n, lab, W = clusters(png, 128 if ver == 'mono' else 200)
            cd, cr = near(lab, W, dot, s), near(lab, W, rib, s)
            sep = bool(cd and cr and cd != cr)
            if ver == 'mono':
                ok &= sep
            rows.append({'variant': name, 'version': ver, 'px': s, 'clusters': n, 'basis': 'luma<128' if ver == 'mono' else 'luma<200', 'dot_cluster': cd, 'rib_cluster': cr, 'separate': sep})
            print('%-7s %-5s %3d px  clusters (luma<%s) %2d  dot in %d, rib in %d  -> %s' % (name, ver, s, '128' if ver == 'mono' else '200', n, cd, cr, 'SEPARATE' if sep else 'MERGED OR MISSING'))
json.dump(rows, open(os.path.join(EV, 'clusters.json'), 'w'), indent=1)
print('RESULT one-color versions: rib and dot separate at every size: %s' % ('PASS' if ok else 'FAIL'))
sys.exit(0 if ok else 1)
