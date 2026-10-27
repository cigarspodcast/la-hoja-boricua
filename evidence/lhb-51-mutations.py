"""LHB-51: la prueba de que las pruebas nuevas pueden fallar. Cada mutación rompe una línea de lo que se entrega,
corre `node --test test/site.test.js` y debe dar al menos una prueba en rojo. Al final todo se restaura byte por byte.
Uso: python evidence/lhb-51-mutations.py  (desde la raíz del repositorio); con --check solo comprueba que cada texto a mutar aparece una vez."""
import os, re, subprocess, sys
R = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

sys.stdout.reconfigure(encoding='utf-8')

def run():
    p = subprocess.run(['node', '--test', '--test-timeout=60000', 'test/site.test.js'], cwd=R, capture_output=True, text=True, encoding='utf-8')
    # una prueba que se cuelga hasta el tiempo límite sale como cancelled, no como fail: cuenta como roja
    fail = int(re.search(r'^ℹ fail (\d+)', p.stdout, re.M).group(1)) + int(re.search(r'^ℹ cancelled (\d+)', p.stdout, re.M).group(1))
    names = sorted(set(re.findall(r'^✖ (.+?) \(\d', p.stdout, re.M)))
    return fail, names

APP = 'site/app.js'
CU = 'site/cuenta.js'
HO = 'site/hoja.js'

# (nombre, archivo, texto exacto que existe una vez, texto que lo reemplaza, [otro texto, su reemplazo]...)
MUTS = [
    ('A1 encabezado: no mira la cuenta que entro', APP, "const a=acctNow();if(a)paintAvatar(el,a,'');else", "const a=null;if(a)paintAvatar(el,a,'');else"),
    ('A2 encabezado: sin cuenta guardada se pide la foto local del telefono (Codex ronda 1)', APP, r"else el.innerHTML='<span>\u2606</span>'}", r"else{photoURL('perfil');el.innerHTML='<span>\u2606</span>'}}"),
    ('A3 foto: se carga una foto de cualquier sitio', APP, "typeof a.avatar==='string'&&a.avatar.startsWith(AV_HOST)?a.avatar:''", "typeof a.avatar==='string'?a.avatar:''"),
    ('A4 foto: si no carga queda un hueco en vez de la inicial', APP, "im.onerror=()=>{if(el.firstChild===im)el.innerHTML=ini};", ""),
    ('A5 cuenta: cualquier cosa guardada vale como cuenta', APP, "&&typeof a.sub==='string'&&a.sub&&typeof a.handle==='string'?a:null", "?a:null"),
    ('A6 inicial: salen las del @ y no las del nombre', APP, "const acctInitial=a=>initialsOf(a.name)||(", "const acctInitial=a=>("),
    ('A7 nombre: sin nombre publico no sale el @', APP, "const acctName=a=>a.name||('@'+a.handle);", "const acctName=a=>a.name||'';"),
    ('P1 Perfil: la tarjeta no lleva el nombre de la cuenta', APP, "esc(ac?acctName(ac):tt('pf.yourName'))", "esc(tt('pf.yourName'))"),
    ('P2 Perfil: no se pinta la foto de la cuenta', APP, "if(ac)paintAvatar($('#mePic'),ac,tt('pf.fotoAlt'));", "if(false)paintAvatar($('#mePic'),ac,tt('pf.fotoAlt'));"),
    ('P3 Perfil: sin cuenta guardada sale el nombre local (Codex ronda 2)', APP, "esc(ac?acctName(ac):tt('pf.yourName'))", "esc(ac?acctName(ac):p.nombre||tt('pf.yourName'))"),
    ('P4 Perfil: sin cuenta guardada sale la inicial local', APP, r"${ac?esc(acctInitial(ac)):'\u2606'}", r"${ac?esc(acctInitial(ac)):p.nombre?esc(initialsOf(p.nombre)):'\u2606'}"),
    ('P5 Perfil: guardar la capa borra el nombre local', APP, "LS.set('perfil',{nombre:p.nombre,capa:$('#pC').value});", "LS.set('perfil',{nombre:'',capa:$('#pC').value});"),
    ('P6 Perfil: el encabezado de la capa dice Editar perfil otra vez', APP, "<summary>${tt('pf.favCapa')}</summary>", "<summary>${tt('pf.edit')}</summary>"),
    ('P7 Perfil: la tarjeta no lleva el @', APP, "${ac?'@'+esc(ac.handle)+", "${ac?''+"),
    ('C1 cuenta: se guarda una foto de cualquier sitio', CU, "avatar:typeof p.avatar_key==='string'&&p.avatar_key.startsWith(CLERK_IMG)?p.avatar_key:''", "avatar:typeof p.avatar_key==='string'?p.avatar_key:''"),
    ('C2 cuenta: no se guarda el nombre publico', CU, "name:typeof p.display_name==='string'?p.display_name:''", "name:''"),
    ('C3 cuenta: al editar solo se guarda el @', CU, "if(!!C.user&&C.user.id===uid)cache(snap(uid,r.body.profile));", "if(!!C.user&&C.user.id===uid)cache({sub:uid,handle:r.body.profile.handle});"),
    ('C4 cuenta: se guarda de mas (la marca y la bio)', CU, "name:typeof p.display_name==='string'?p.display_name:'',", "name:typeof p.display_name==='string'?p.display_name:'',bio:p.bio,favorite_brand:p.favorite_brand,"),
    ('C5 cuenta: al cambiar de cuenta no se borra lo guardado de la anterior', CU, "D.store.clear();if(!id)D.intent.clear();", "if(!id){D.store.clear();D.intent.clear()}"),
    ('I1 iniciales: solo la del primer nombre', APP, "(g1(w[0])+(w.length>1?g1(w[w.length-1]):''))", "(g1(w[0])+'')"),
    ('I2 iniciales: la segunda palabra y no la ultima', APP, "g1(w[w.length-1])", "g1(w[1])"),
    ('C6 cuenta: al cargar Clerk no se descarta lo guardado de otra cuenta (Codex ronda 1)', CU, "{const c0=D.store.get();if(c0&&(!C.user||c0.sub!==C.user.id))D.store.clear()}", ""),
    ('Q1 Perfil: sin cuenta guardada se pide la foto local del telefono', APP, "if(ac)paintAvatar($('#mePic'),ac,tt('pf.fotoAlt'));", "if(ac)paintAvatar($('#mePic'),ac,tt('pf.fotoAlt'));else photoURL('perfil');"),
    ('I3 iniciales: una marca combinante parte la palabra en dos (Codex ronda 2)', APP, r"[^\p{L}\p{M}\p{N}\s]", r"[^\p{L}\p{N}\s]"),
    ('I4 iniciales: la primera letra es un punto de codigo y no un grafema', APP, "[...new Intl.Segmenter(undefined,{granularity:'grapheme'}).segment(s)][0].segment", "[...s][0]"),
    ('C7 cuenta: reconcile no hace nada (Codex ronda 2)', CU, "async function reconcile(){const c0=D.store.get();if(!c0)return;", "async function reconcile(){return;"),
    ('C8 cuenta: reconcile carga Clerk aunque no haya cuenta guardada', CU, "const c0=D.store.get();if(!c0)return;let C;", "const c0=D.store.get();let C;"),
    ('C9 cuenta: reconcile revienta sin conexion', CU, "try{C=await D.clerk()}catch(e){return}hook(C);", "C=await D.clerk();hook(C);"),
    ('H5 hoja: al abrir la app no se confirma la cuenta con Clerk', HO, "setTimeout(()=>{if(acct.get())CUENTA.reconcile()},2500);", ""),
    ('C10 cuenta: al descartar lo guardado de otra cuenta no se repinta Mi Hoja (Codex ronda 3)', CU, "if(!D.store.get()&&onMiHoja())D.reroute()}", "}"),
    ('H1 hoja: al guardar la cuenta no se repinta el encabezado', HO, "set:v=>{A.LS.set('cuenta2',v);if(A.topAvatar)A.topAvatar()}", "set:v=>{A.LS.set('cuenta2',v)}"),
    ('H2 hoja: al salir no se repinta el encabezado', HO, "catch(e){}if(A.topAvatar)A.topAvatar()}};", "catch(e){}}};"),
    ('H3 app: Mi Hoja no recibe topAvatar', APP, "window.LHB_EXT({topAvatar,$,$$,", "window.LHB_EXT({$,$$,"),
    ('H4 cache: el shell se publica con la version de antes', 'site/sw.js', "const VERSION='lhb-v55';", "const VERSION='lhb-v54';"),
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
