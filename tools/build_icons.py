"""LHB-70 (M7-F2c): every icon, favicon and the share image, rendered from the one source mark site/icons/icon.svg (the Parada
leaf chosen in LHB-69). Nothing here is hand-edited: change the SVG and run this again.
Sizes (LHB-70 pinned): favicon 16 and 32 (the mark alone, transparent), apple-touch 180, app icons 192 and 512 (the mark on
paper), maskable 192 and 512 (the mark inside the 80 percent safe circle, on paper to the edge), and og.jpg at 1200 by 630.
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
SRC = os.path.join(ICONS, 'icon.svg')
PAPER, INK, MUTED = '#F4F1EA', '#263723', '#5B6B57'   # --paper, --on-surface, a quiet tobacco for the line below the name

mark = open(SRC, encoding='utf-8').read()
inner = re.search(r'<svg[^>]*>(.*)</svg>', mark, re.S).group(1)
inner = re.sub(r'<title>.*?</title>', '', inner, flags=re.S)


def framed(size, scale, paper):
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
    ('favicon-16.png', 16, 1.0, False),
    ('favicon-32.png', 32, 1.0, False),
    ('apple-touch-icon.png', 180, .8, True),
    ('icon-192.png', 192, .8, True),
    ('icon-512.png', 512, .8, True),
    ('icon-maskable-192.png', 192, .6, True),
    ('icon-maskable-512.png', 512, .6, True),
]

for name, size, scale, paper in ICON_SET:
    print(name, png(framed(size, scale, paper), os.path.join(ICONS, name)))

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
      f'<g transform="translate(110 135) scale(3.6)">{inner}</g>'
      f'<text x="520" y="300" font-family="Fraunces" font-weight="600" font-size="104" fill="{INK}">La Hoja</text>'
      f'<text x="520" y="410" font-family="Fraunces" font-style="italic" font-weight="500" font-size="104" fill="{INK}">Boricua</text>'
      f'<text x="524" y="482" font-family="Figtree Light" font-size="38" fill="{MUTED}">Hecho en Borinquen</text></svg>')
buf = io.BytesIO(bytes(resvg_py.svg_to_bytes(svg_string=og, skip_system_fonts=True, font_files=fonts)))
Image.open(buf).convert('RGB').save(os.path.join(SITE, 'og.jpg'), quality=88, optimize=True, progressive=True)
print('og.jpg', (W, H))
