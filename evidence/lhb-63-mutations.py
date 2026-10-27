"""LHB-63: la prueba de que las pruebas nuevas pueden fallar. Cada mutación rompe una línea de lo que se entrega,
corre `node --test test/site.test.js` y debe dar al menos una prueba en rojo. Al final todo se restaura byte por byte.
Uso: python evidence/lhb-63-mutations.py  (desde la raíz del repositorio); con --check solo comprueba que cada texto a mutar aparece una vez."""
import os, re, subprocess, sys
R = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

sys.stdout.reconfigure(encoding='utf-8')

def run():
    p = subprocess.run(['node', '--test', '--test-timeout=60000', 'test/site.test.js'], cwd=R, capture_output=True, text=True, encoding='utf-8')
    # una prueba que se cuelga hasta el tiempo límite sale como cancelled, no como fail: cuenta como roja
    fail = int(re.search(r'^ℹ fail (\d+)', p.stdout, re.M).group(1)) + int(re.search(r'^ℹ cancelled (\d+)', p.stdout, re.M).group(1))
    names = sorted(set(re.findall(r'^✖ (.+?) \(\d', p.stdout, re.M)))
    return fail, names

HD = 'functions/api/handle.js'
MG = 'migrations/0005_handle_checks.sql'
HO = 'site/hoja.js'
CU = 'site/cuenta.js'

# (nombre, archivo, texto exacto que existe una vez, texto que lo reemplaza, [otro texto, su reemplazo]...); el texto puede abarcar varias líneas
MUTS = [
    ('M1 tabla: sin el índice por cuenta', MG, "CREATE INDEX handle_checks_by_user ON handle_checks (user_id, created_at);\n", ""),
    ('M2 tabla: created_at admite null', MG, "  created_at TEXT NOT NULL\n", "  created_at TEXT\n"),
    ('M3 tabla: user_id con llave a profiles (en el registro todavía no hay perfil)', MG, "  user_id TEXT NOT NULL,\n", "  user_id TEXT NOT NULL REFERENCES profiles(user_id),\n"),
    ('S1 api: sin sesión válida se contesta igual', HD, "  if (!user) return json({ error: 'no-session' }, 401);\n", ""),
    ('S2 api: sin base no se avisa', HD, "  if (!env.DB) return json({ error: 'no-db' }, 503);\n", ""),
    ('S3 api: las reglas del @ no se aplican', HD, "const h = checkHandle(new URL(request.url).searchParams.get('h'));", "const h = { handle: String(new URL(request.url).searchParams.get('h') ?? '') };"),
    ('S4 api: el @ se busca como llega, sin minúscula ni espacios', HD, ".bind(h.handle).first();", ".bind(String(new URL(request.url).searchParams.get('h'))).first();"),
    ('S5 api: un perfil oculto cuenta como libre', HD, "SELECT user_id FROM profiles WHERE handle = ?1'", "SELECT user_id FROM profiles WHERE handle = ?1 AND hidden = 0'"),
    ('S6 api: tu propio @ sale tomado', HD, "if (!row || row.user_id === user.sub)", "if (!row)"),
    ('S7 api: la respuesta dice de quién es el @', HD, "return json({ available: false, reason: 'taken' }, 200);", "return json({ available: false, reason: 'taken', owner: row.user_id }, 200);"),
    ('S8 api: el tope no se revisa', HD, "    if (!t.meta.changes) return json({ error: 'handle-rate' }, 429);\n", ""),
    ('S9 api: lo que las reglas rechazan también gasta tope', HD, "  if (h.error) return json({ available: false, reason: h.error === 'handle-reserved' ? 'reserved' : 'invalid' }, 200);\n  try {", "  try {", "    const row = await env.DB.prepare(", "    if (h.error) return json({ available: false, reason: h.error === 'handle-reserved' ? 'reserved' : 'invalid' }, 200);\n    const row = await env.DB.prepare("),
    ('S10 api: la ventana del tope es de diez minutos', HD, "now.getTime() - 60e3", "now.getTime() - 600e3"),
    ('S11 api: lo viejo no se poda', HD, "    await env.DB.prepare('DELETE FROM handle_checks WHERE user_id = ?1 AND created_at <= ?2').bind(user.sub, since).run();\n", ""),
    ('S12 api: el tope es de todos juntos y no de cada cuenta', HD, "FROM handle_checks WHERE user_id = ?1 AND created_at > ?3) < ?4'", "FROM handle_checks WHERE ?1 IS NOT NULL AND created_at > ?3) < ?4'"),
    ('S13 api: el tope de prueba cambia de 30 a 300', HD, "CHECKS_PER_MINUTE = 30;", "CHECKS_PER_MINUTE = 300;"),
    ('S14 api: si la base falla se dice que está libre', HD, "return json({ error: 'unavailable' }, 503);", "return json({ available: true }, 200);"),
    ('S15 api: también contesta a POST', HD, "export const CHECKS_PER_MINUTE = 30;", "export const CHECKS_PER_MINUTE = 30;\nexport const onRequestPost = () => new Response('x');"),
    ('C1 formulario: no espera a que se deje de escribir', HO, "else hsay('')},400)};", "else hsay('')},0)};"),
    ('C2 formulario: cada tecla deja su reloj vivo', HO, "hseq++;clearTimeout(htm);", "hseq++;"),
    ('C3 formulario: pinta una respuesta vieja', HO, "if(my!==hseq||$('#obForm')!==form)return;", "if($('#obForm')!==form)return;"),
    ('C4 formulario: pinta sobre otro formulario', HO, "if(my!==hseq||$('#obForm')!==form)return;", "if(my!==hseq)return;"),
    ('C5 formulario: lo inválido no se avisa', HO, "if(!HANDLE_RE.test(h))return hsay(OB_ERR['handle-invalid']);\n  hsay('');if(!check)return;", "if(!HANDLE_RE.test(h))return hsay('');\n  hsay('');if(!check)return;"),
    ('C6 formulario: lo inválido también se pregunta', HO, "if(!HANDLE_RE.test(h))return hsay(OB_ERR['handle-invalid']);\n  hsay('');if(!check)return;", "hsay('');if(!check)return;"),
    ('C7 formulario: tu @ de siempre se pregunta y se marca', HO, "if(!h||(edm&&h===String(pf.handle||'').toLowerCase()))return hsay('');", "if(!h)return hsay('');"),
    ('C8 formulario: se pregunta el texto sin normalizar', HO, "const my=hseq,h=$('#obH').value.trim().toLowerCase();", "const my=hseq,h=$('#obH').value;"),
    ('C9 formulario: el tomado no se avisa', HO, "   else if(r&&r.available===false&&r.reason==='taken')hsay(OB_ERR['handle-taken']);\n", ""),
    ('C10 formulario: el reservado no se avisa', HO, "   else if(r&&r.available===false&&r.reason==='reserved')hsay(OB_ERR['handle-reserved']);\n", ""),
    ('C11 formulario: una respuesta sin available se toma por libre', HO, "if(r&&r.available===true)hsay('Disponible',true);", "if(r&&r.available!==false)hsay('Disponible',true);"),
    ('C12 formulario: un fallo de la pregunta no se atrapa', HO, "try{r=await check(h)}catch(x){r=null}", "r=await check(h)"),
    ('C13 formulario: el aviso no se anuncia', HO, '<p class="hint" id="obHs" aria-live="polite"></p>', '<p class="hint" id="obHs"></p>'),
    ('C14 formulario: un tomado apaga Guardar', HO, "hsay(OB_ERR['handle-taken']);\n", "{hsay(OB_ERR['handle-taken']);$('#obGo').disabled=true}\n"),
    ('C15 formulario: Editar perfil no recibe la pregunta', HO, "edit:(prof,submit,picture,check)=>onboardingForm(submit,picture,'edit',prof,check),", "edit:(prof,submit,picture,check)=>onboardingForm(submit,picture,'edit',prof),"),
    ('C16 formulario: el registro no recibe la pregunta', HO, "onboarding:(submit,picture,check)=>onboardingForm(submit,picture,undefined,undefined,check),", "onboarding:(submit,picture,check)=>onboardingForm(submit,picture),"),
    ('U1 cuenta: se pregunta aunque la cuenta o la página ya cambiaron', CU, "  if(!live())return null;\n  let r;try{r=await D.api(C,'GET','/api/handle", "  let r;try{r=await D.api(C,'GET','/api/handle"),
    ('U2 cuenta: una respuesta que llega con otra cuenta se usa', CU, "if(!live()||!r||r.status!==200", "if(!r||r.status!==200"),
    ('U3 cuenta: cualquier cuerpo 200 se da por respuesta', CU, "||typeof r.body.available!=='boolean')return null;", ")return null;"),
    ('U4 cuenta: el texto va sin codificar', CU, "encodeURIComponent(h)", "h"),
    ('U5 cuenta: Editar perfil no recibe la pregunta', CU, "try{return await send(f||{})}finally{sending=false;snd--}},picture,handleCheck(C,uid,live))}", "try{return await send(f||{})}finally{sending=false;snd--}},picture)}"),
    ('U6 cuenta: el registro no recibe la pregunta', CU, "try{return await send(f)}finally{sending=false;snd--}},picture,handleCheck(C,uid,live))}", "try{return await send(f)}finally{sending=false;snd--}},picture)}"),
]

def load(rel):
    p = os.path.join(R, *rel.split('/'))
    orig = open(p, 'rb').read()
    text = orig.decode('utf-8')
    return p, orig, '\r\n' in text, text.replace('\r\n', '\n')

def main():
    if '--check' in sys.argv:
        bad = 0
        for name, rel, a, b, *more in MUTS:
            t = load(rel)[3]
            for x in [a] + more[0::2]:
                n = t.count(x)
                if n != 1: bad += 1; print(name, '-> aparece', n, 'veces')
        print('mutaciones:', len(MUTS), 'con anclaje malo:', bad)
        return 1 if bad else 0
    base = run()
    print('baseline', base)
    assert base[0] == 0, 'la línea base debe estar en verde'
    bad = 0
    only = [x for x in sys.argv[1:] if not x.startswith('--')]  # p. ej. C6 C7 S8: solo esas mutaciones
    for name, rel, a, b, *more in MUTS:
        if only and name.split()[0] not in only: continue
        p, orig, crlf, t = load(rel)
        if t.count(a) != 1:
            print(name, '-> ERROR: el texto a mutar aparece', t.count(a), 'veces'); bad += 1; continue
        m = t.replace(a, b, 1)
        for a2, b2 in zip(more[0::2], more[1::2]):
            assert m.count(a2) == 1, (name, a2)
            m = m.replace(a2, b2, 1)
        open(p, 'wb').write((m.replace('\n', '\r\n') if crlf else m).encode('utf-8'))
        try:
            fail, names = run()
        finally:
            open(p, 'wb').write(orig)
        verdict = 'ROJO (bien)' if fail > 0 else 'SOBREVIVIÓ'
        if fail == 0: bad += 1
        print(name, '->', verdict, 'fail=%d' % fail)
        for n in names[:4]: print('     ', n[:150])
    final = run()
    print('restaurado', final)
    print('mutaciones:', len(MUTS), 'sobrevivieron o con error:', bad)
    return 0 if bad == 0 and final[0] == 0 else 1

if __name__ == '__main__':
    sys.exit(main())
