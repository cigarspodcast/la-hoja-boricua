"""LHB-70 (M7-F2c), LHB-118: every icon, favicon and the share image, rendered from the Medallón masters in site/icons
(LHB-118 replaced the Parada leaf of LHB-69). Nothing here is hand-edited: change the SVGs and run this again.
Two masters: icon.svg, the small master (heavier ring, centre vein only) for 16 to 47 px, renders the favicons; icon-full.svg,
the full master (side veins and stem) for 48 px and up, renders the app icons and the share image. icon-dark.svg and
icon-full-dark.svg are the same marks for the dark theme; the app shows them, nothing here renders them.
Sizes (LHB-70 pinned): favicon 16 and 32 (the mark alone, transparent), apple-touch 180, app icons 192 and 512 (the mark on
paper), maskable 192 and 512 (the mark inside the 80 percent safe circle, on paper to the edge), and og.jpg at 1200 by 630.
Scales (LHB-118): the medallion is an upright oval, so it takes .86 of the apple-touch tile and .9 of the app icons; in the
maskable icons it takes .78, which puts the ring's outer edge 37.8 units from the centre, inside the 40-unit safe radius.
The share image's lettering uses the app's own fonts (site/fonts, woff2, decoded to a temporary TTF), with system fonts
skipped, so the output does not depend on the machine.
usage: python tools/build_icons.py   (needs resvg-py, Pillow and fontTools with brotli)"""
import io, os, re, tempfile
import resvg_py
from fontTools.ttLib import TTFont
from PIL import Image

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
SITE = os.path.join(ROOT, 'site')
ICONS = os.path.join(SITE, 'icons')
PAPER, INK, MUTED = '#F4F1EA', '#263723', '#5B6B57'   # --paper, --on-surface, a quiet tobacco for the line below the name



def inner_of(name):
    mark = open(os.path.join(ICONS, name), encoding='utf-8').read()
    inner = re.search(r'<svg[^>]*>(.*)</svg>', mark, re.S).group(1)
    return re.sub(r'<title>.*?</title>', '', inner, flags=re.S)


SMALL, FULL = inner_of('icon.svg'), inner_of('icon-full.svg')


def framed(inner, size, scale, paper):
    """the mark centred in a size by size square, its 100-unit box scaled to `scale` of the side, on paper or transparent"""
    s = size * scale / 100
    off = (size - 100 * s) / 2
    bg = f'<rect width="{size}" height="{size}" fill="{PAPER}"/>' if paper else ''
    return (f'<svg xmlns="http://www.w3.org/2000/svg" width="{size}" height="{size}" viewBox="0 0 {size} {size}">{bg}'
            f'<g transform="translate({off:g} {off:g}) scale({s:g})">{inner}</g></svg>')


def png(svg, out, fonts=None):
    data = bytes(resvg_py.svg_to_bytes(svg_string=svg, skip_system_fonts=bool(fonts), font_files=fonts or None))
    im = Image.open(io.BytesIO(data))
    im.save(out, optimize=True)
    return im.size


ICON_SET = [
    ('favicon-16.png', SMALL, 16, 1.0, False),
    ('favicon-32.png', SMALL, 32, 1.0, False),
    ('apple-touch-icon.png', FULL, 180, .86, True),
    ('icon-192.png', FULL, 192, .9, True),
    ('icon-512.png', FULL, 512, .9, True),
    ('icon-maskable-192.png', FULL, 192, .78, True),
    ('icon-maskable-512.png', FULL, 512, .78, True),
]

for name, inner, size, scale, paper in ICON_SET:
    print(name, png(framed(inner, size, scale, paper), os.path.join(ICONS, name)))

# the share image: the mark on the left, the name and the line under it in the header's own type
tmp = tempfile.mkdtemp(prefix='lhb-icons-')
fonts = []
for f in ('fraunces-normal-600.woff2', 'fraunces-italic-500.woff2', 'figtree.woff2'):
    t = TTFont(os.path.join(SITE, 'fonts', f))
    t.flavor = None
    p = os.path.join(tmp, f.replace('.woff2', '.ttf'))
    t.save(p)
    fonts.append(p)
W, H = 1200, 630
og = (f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}">'
      f'<rect width="{W}" height="{H}" fill="{PAPER}"/>'
      f'<g transform="translate(110 135) scale(3.6)">{FULL}</g>'
      f'<text x="520" y="300" font-family="Fraunces" font-weight="600" font-size="104" fill="{INK}">La Hoja</text>'
      f'<text x="520" y="410" font-family="Fraunces" font-style="italic" font-weight="500" font-size="104" fill="{INK}">Boricua</text>'
      f'<text x="524" y="482" font-family="Figtree Light" font-size="38" fill="{MUTED}">Hecho en Borinquen</text></svg>')
buf = io.BytesIO(bytes(resvg_py.svg_to_bytes(svg_string=og, skip_system_fonts=True, font_files=fonts)))
Image.open(buf).convert('RGB').save(os.path.join(SITE, 'og.jpg'), quality=88, optimize=True, progressive=True)
print('og.jpg', (W, H))
