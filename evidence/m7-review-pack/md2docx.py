"""Renders the review pack README.md as an editable Word file (python-docx): headings, paragraphs, numbered and bulleted lists (one
nested level), the screens table, inline bold, italic and code, and links as real hyperlinks (relative paths stay relative, so the
screenshot links open beside the .docx). Each numbered list restarts at 1 (its own numbering instance), so "steps 2 to 4 of the
VoiceOver list" means the same in Word as in the Markdown (Codex LHB-75 round 1).
usage: python evidence/m7-review-pack/md2docx.py IN.md OUT.docx"""
import copy, re, sys
from docx import Document
from docx.opc.constants import RELATIONSHIP_TYPE as RT
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Pt, RGBColor

src, out = sys.argv[1], sys.argv[2]
doc = Document()
st = doc.styles['Normal']
st.font.name = 'Calibri'
st.font.size = Pt(11)
TOK = re.compile(r'(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`|\[[^\]]+\]\([^)]+\))')
numbering = doc.part.numbering_part.element


def style_num_id(style_name):
    """the numId the list style points at, and the abstractNumId behind it"""
    ppr = doc.styles[style_name].element.pPr
    nid = int(ppr.numPr.numId.val)
    num = [n for n in numbering.findall(qn('w:num')) if int(n.get(qn('w:numId'))) == nid][0]
    return nid, num.find(qn('w:abstractNumId')).get(qn('w:val'))


def new_list_instance(style_name):
    """a new w:num on the style's abstract numbering, restarting level 0 at 1"""
    _, absid = style_num_id(style_name)
    nid = max(int(n.get(qn('w:numId'))) for n in numbering.findall(qn('w:num'))) + 1
    num = OxmlElement('w:num')
    num.set(qn('w:numId'), str(nid))
    a = OxmlElement('w:abstractNumId')
    a.set(qn('w:val'), absid)
    num.append(a)
    ov = OxmlElement('w:lvlOverride')
    ov.set(qn('w:ilvl'), '0')
    so = OxmlElement('w:startOverride')
    so.set(qn('w:val'), '1')
    ov.append(so)
    num.append(ov)
    numbering.append(num)
    return nid


def set_num(p, nid):
    ppr = p._p.get_or_add_pPr()
    numpr = OxmlElement('w:numPr')
    il = OxmlElement('w:ilvl')
    il.set(qn('w:val'), '0')
    ni = OxmlElement('w:numId')
    ni.set(qn('w:val'), str(nid))
    numpr.append(il)
    numpr.append(ni)
    ppr.append(numpr)


def hyperlink(p, text, url):
    rid = p.part.relate_to(url, RT.HYPERLINK, is_external=True)
    h = OxmlElement('w:hyperlink')
    h.set(qn('r:id'), rid)
    r = OxmlElement('w:r')
    rpr = OxmlElement('w:rPr')
    c = OxmlElement('w:color')
    c.set(qn('w:val'), '1F5FA8')
    u = OxmlElement('w:u')
    u.set(qn('w:val'), 'single')
    rpr.append(c)
    rpr.append(u)
    r.append(rpr)
    t = OxmlElement('w:t')
    t.text = text
    t.set(qn('xml:space'), 'preserve')
    r.append(t)
    h.append(r)
    p._p.append(h)


def inline(p, text):
    for part in TOK.split(text):
        if not part:
            continue
        if part.startswith('**'):
            p.add_run(part[2:-2]).bold = True
        elif part.startswith('`'):
            p.add_run(part[1:-1]).font.name = 'Consolas'
        elif part.startswith('['):
            m = re.match(r'\[([^\]]+)\]\(([^)]+)\)', part)
            hyperlink(p, m.group(1), m.group(2))
        elif part.startswith('*'):
            p.add_run(part[1:-1]).italic = True
        else:
            p.add_run(part)


lines = open(src, encoding='utf-8').read().split('\n')
i = 0
cur_list = None  # numId of the numbered list in progress; any non-list block ends it
while i < len(lines):
    ln = lines[i]
    if not ln.strip():
        i += 1
        continue
    m = re.match(r'^(#{1,3}) (.*)', ln)
    if m:
        cur_list = None
        doc.add_heading(m.group(2), level=len(m.group(1)) - 1 if len(m.group(1)) > 1 else 0)
        i += 1
        continue
    if ln.startswith('|'):
        cur_list = None
        rows = []
        while i < len(lines) and lines[i].startswith('|'):
            cells = [c.strip() for c in lines[i].strip('|').split('|')]
            if not all(re.match(r'^-+$', c) for c in cells):
                rows.append(cells)
            i += 1
        t = doc.add_table(rows=len(rows), cols=len(rows[0]))
        t.style = 'Table Grid'
        for r, cells in enumerate(rows):
            for c, txt in enumerate(cells):
                p = t.cell(r, c).paragraphs[0]
                inline(p, txt)
                if r == 0:
                    for run in p.runs:
                        run.bold = True
        continue
    m = re.match(r'^(\s*)(\d+\.|-) (.*)', ln)
    if m:
        nested = len(m.group(1)) >= 2
        if m.group(2) != '-' and not nested:
            if cur_list is None:
                cur_list = new_list_instance('List Number')
            p = doc.add_paragraph(style='List Number')
            set_num(p, cur_list)
        else:
            p = doc.add_paragraph(style='List Bullet 2' if nested else 'List Bullet')
            if not nested:
                cur_list = None
        inline(p, m.group(3))
        i += 1
        continue
    cur_list = None
    inline(doc.add_paragraph(), ln.strip())
    i += 1
doc.save(out)
print('wrote', out)
