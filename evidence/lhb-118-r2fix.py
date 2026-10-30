"""LHB-118, Codex round 2 (BLOCK, P2 x2): stop parsing selectors. The two swap rules carry !important, so no ordinary rule can
beat them, and the test checks the one thing left: no other display or all declaration in the three sheets is !important, except a
pinned list. One-off edit script, kept as evidence of what changed. usage (repo root): python evidence/lhb-118-r2fix.py"""
P = 'test/site.test.js'
s = open(P, encoding='utf-8', newline='').read()
CRLF = '\r\n' in s
s = s.replace('\r\n', '\n')


def cut(a, b, new):
    """replace the text from the line holding `a` through the line holding `b` (inclusive) with `new`"""
    global s
    i = s.index(a); i = s.rindex('\n', 0, i) + 1
    j = s.index(b, i); j = s.index('\n', j) + 1
    assert s.count(a) == 1 and s.count(b) == 1, (a, b)
    s = s[:i] + new + s[j:]


cut("assert.ok(css.includes('.mark-l{display:var(--mark-light)}.mark-d{display:var(--mark-dark)}'),f+': las dos reglas')}",
    "assert.ok(css.includes('.mark-l{display:var(--mark-light)}.mark-d{display:var(--mark-dark)}'),f+': las dos reglas')}",
    "  assert.ok(css.includes('.mark-l{display:var(--mark-light)!important}.mark-d{display:var(--mark-dark)!important}'),f+': las dos reglas, con !important')}\n")

NEW = r''' /* Codex r1 y r2: que las reglas estén no basta, tienen que ganar. Leer selectores a mano dejó pasar :not(), :is(), atributos con espacio, + y
    all:, así que la marca no depende de la especificidad: .mark-l y .mark-d llevan !important, y ninguna regla normal les gana. Lo único que les
    podría ganar es otra declaración display o all con !important (en cualquier capa o @media), así que en las tres hojas, sin comentarios, esas son
    exactamente las de la marca y estas dos, que ya estaban: [hidden] (esconde lo escondido, también una marca) y el botón de instalar en modo app.
    Y ninguna marca lleva style en línea. */
 const IMP118={'styles.css':['.mark-l{display:var(--mark-light)!important}','.mark-d{display:var(--mark-dark)!important}','[hidden]{display:none!important}','.btn-install{display:none!important}'],
  'lugares/l.css':['.mark-l{display:var(--mark-light)!important}','.mark-d{display:var(--mark-dark)!important}'],'u.css':['.mark-l{display:var(--mark-light)!important}','.mark-d{display:var(--mark-dark)!important}']};
 for(const [f,want] of Object.entries(IMP118)){const css=read(f).replace(/\/\*[\s\S]*?\*\//g,''),got=[];
  for(const m of css.matchAll(/([^{}]*)\{([^{}]*)\}/g))for(const d of m[2].split(';'))if(/!\s*important/i.test(d)&&/^\s*(display|all)\s*:/i.test(d))got.push(m[1].trim()+'{'+d.trim()+'}');
  assert.deepEqual(got,want,f+': las declaraciones display o all con !important')}
'''
cut("assert.ok(!/\\.intro-mark img\\{[^}]*display:/.test(read('styles.css')),'la intro no pisa el display de los tokens');",
    "if(hits.length)assert.ok(!/(^|;)\\s*display\\s*:/.test(m[2]),f+': '+hits.join(',')+'{'+m[2]+'} pisa el display de la marca')}",
    NEW)

old = "for(const x of h.matchAll(/<img [^>]*icons\\/icon(-dark)?\\.svg\"[^>]*>/g)){n++;assert.ok(/^<img class=\"mark-[ld]\" /.test(x[0]),path.relative(S,f)+': '+x[0])}"
assert s.count(old) == 1, 'img loop'
s = s.replace(old, old.replace("assert.ok(/^<img class=\"mark-[ld]\" /.test(x[0]),", "assert.ok(/^<img class=\"mark-[ld]\" /.test(x[0])&&!/\\sstyle=/i.test(x[0]),"))
assert chr(0x2014) not in s
open(P, 'w', encoding='utf-8', newline='').write(s.replace('\n', '\r\n') if CRLF else s)

for f in ['site/styles.css', 'site/lugares/l.css', 'site/u.css']:
    c = open(f, encoding='utf-8', newline='').read()
    o = '.mark-l{display:var(--mark-light)}.mark-d{display:var(--mark-dark)}'
    assert c.count(o) == 1, f
    c = c.replace(o, '.mark-l{display:var(--mark-light)!important}.mark-d{display:var(--mark-dark)!important}')
    open(f, 'w', encoding='utf-8', newline='').write(c)
print('ok')
