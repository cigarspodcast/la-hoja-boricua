"""LHB-118, Codex round 3 (BLOCK, P2 x2, P3): CSS escapes are decoded before any scan; the swap tokens may be set only in the three theme
blocks and never in HTML or JS; a hidden mark stays hidden. One-off edit script, kept as evidence. usage (repo root): python evidence/lhb-118-r3fix.py"""
P = 'test/site.test.js'
s = open(P, encoding='utf-8', newline='').read()
CRLF = '\r\n' in s
s = s.replace('\r\n', '\n')
i = s.index(' /* Codex r1 y r2: que las reglas estén no basta')
j = s.index("f+': las declaraciones display o all con !important')}\n", i)
j = j + len("f+': las declaraciones display o all con !important')}\n")
NEW = r''' /* Codex r1, r2 y r3: que las reglas estén no basta, tienen que ganar. Leer selectores a mano dejó pasar :not(), :is(), atributos con espacio, + y
    all:, así que la marca no depende de la especificidad: .mark-l y .mark-d llevan !important, y ninguna regla normal les gana. Lo que todavía les
    podría ganar, y lo que esta prueba cierra:
    - otra declaración display o all con !important (en cualquier capa o @media): en las tres hojas, sin comentarios y con los escapes de CSS ya
      leídos (d\69splay es display), esas son exactamente las de la marca, la de .mark-l[hidden],.mark-d[hidden] (que va después para que hidden
      gane) y dos que ya estaban: [hidden] y el botón de instalar en modo app;
    - cambiar los tokens que leen: --mark-light y --mark-dark solo se ponen en los tres bloques de tema (:root, el oscuro del teléfono y el
      oscuro escogido), nunca en otra regla, ni en un style de una página, ni desde un script;
    - un style en línea en la marca. */
 const unesc118=t=>t.replace(/\/\*[\s\S]*?\*\//g,'').replace(/\\([0-9a-fA-F]{1,6})[ \t\n\r\f]?/g,(x,h)=>{const c=parseInt(h,16);return c>0&&c<=0x10FFFF?String.fromCodePoint(c):'�'}).replace(/\\([^\n\r\f0-9a-fA-F])/g,'$1');
 assert.equal(unesc118('.b img{d\\69splay:block!\\69mportant}.c{a\\6c l:x}.d{\\64 isplay:y}'),'.b img{display:block!important}.c{all:x}.d{display:y}','el lector de escapes');
 const MK='.mark-l{display:var(--mark-light)!important}',MD='.mark-d{display:var(--mark-dark)!important}',MH='.mark-l[hidden],.mark-d[hidden]{display:none!important}';
 const IMP118={'styles.css':['[hidden]{display:none!important}',MK,MD,MH,'.btn-install{display:none!important}'],'lugares/l.css':[MK,MD,MH],'u.css':[MK,MD,MH]};
 const THEME118=[':root',':root:not([data-theme="light"])',':root[data-theme="dark"]'];
 for(const [f,want] of Object.entries(IMP118)){const css=unesc118(read(f)),got=[];
  for(const m of css.matchAll(/([^{}]*)\{([^{}]*)\}/g)){const sel=m[1].trim();
   for(const d of m[2].split(';'))if(/!\s*important/i.test(d)&&/^\s*(display|all)\s*:/i.test(d))got.push(sel+'{'+d.trim().replace(/\s*!\s*important\s*$/i,'!important')+'}');
   if(/--mark-(light|dark)\s*:/i.test(m[2]))assert.ok(THEME118.includes(sel),f+': '+sel+' cambia los tokens de la marca fuera de los bloques de tema')}
  assert.deepEqual(got,want,f+': las declaraciones display o all con !important');
  assert.ok(css.indexOf(MH)>css.indexOf(MD),f+': hidden gana sobre la marca')}
 for(const f of (function w(d){return fs.readdirSync(d,{withFileTypes:true}).flatMap(e=>e.isDirectory()?w(path.join(d,e.name)):[path.join(d,e.name)])})(S).concat([path.join(__dirname,'..','functions','u','[handle].js')]).filter(f=>/\.(html|js)$/.test(f)))
  assert.ok(!/--mark-(light|dark)/i.test(unesc118(fs.readFileSync(f,'utf8'))),path.relative(S,f)+': los tokens de la marca no se cambian desde una página o un script');
'''
s = s[:i] + NEW + s[j:]
assert chr(0x2014) not in s
open(P, 'w', encoding='utf-8', newline='').write(s.replace('\n', '\r\n') if CRLF else s)

for f in ['site/styles.css', 'site/lugares/l.css', 'site/u.css']:
    c = open(f, encoding='utf-8', newline='').read()
    o = '.mark-l{display:var(--mark-light)!important}.mark-d{display:var(--mark-dark)!important}'
    assert c.count(o) == 1, f
    c = c.replace(o, o + '.mark-l[hidden],.mark-d[hidden]{display:none!important}')
    open(f, 'w', encoding='utf-8', newline='').write(c)
print('ok')
