"""LHB-85: write a small twin (<name>_thumb-s.webp, 320 x 160) beside every cigar thumbnail in site/img/cigarros.

The catalog card draws a thumbnail about 158 px wide on a phone (2 columns) and up to about 277 px just below the 620 px
breakpoint; the cigar page's gallery buttons draw it 96 px wide. The card picks between the small twin and the existing
600 x 300 thumbnail with srcset, so a phone downloads the small one and a wide or dense screen still gets the large one.
320 is twice the phone width, rounded up; it is never an upscale (every source is 640 px wide or more).
Source: the full image (<name>.webp) when it exists, else the existing thumbnail. Both are 2:1, so this is a plain resize.
Run by hand after adding a cigar photo: python tools/build_thumbs.py. Not part of the CI rebuild (WebP bytes depend on
the Pillow version, so a rebuild on another machine is not byte-stable)."""
import glob, os
from PIL import Image

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'site', 'img', 'cigarros')
W, H = 320, 160


def build():
    out = []
    for t in sorted(glob.glob(os.path.join(ROOT, '*_thumb.webp'))):
        src = t.replace('_thumb.webp', '.webp')
        src = src if os.path.exists(src) else t
        im = Image.open(src)
        assert im.size[0] >= W and abs(im.size[0] / im.size[1] - 2) < 0.01, (src, im.size)
        dst = t.replace('_thumb.webp', '_thumb-s.webp')
        im.convert('RGB').resize((W, H), Image.LANCZOS).save(dst, 'WEBP', quality=75, method=6)
        out.append((os.path.basename(t), os.path.getsize(t), os.path.basename(dst), os.path.getsize(dst)))
    return out


if __name__ == '__main__':
    rows = build()
    for a, sa, b, sb in rows:
        print('%-44s %7d  %-46s %6d' % (a, sa, b, sb))
    print('files %d | large total %d | small total %d' % (len(rows), sum(r[1] for r in rows), sum(r[3] for r in rows)))
