"""LHB-55: la prueba de que las pruebas nuevas pueden fallar. Cada mutación rompe una línea de lo que se entrega,
corre `node --test test/site.test.js` y debe dar al menos una prueba en rojo. Al final todo se restaura byte por byte.
Uso: python evidence/lhb-52-mutations.py  (desde la raíz del repositorio); con --check solo comprueba que cada texto a mutar aparece una vez."""
import os, re, subprocess, sys
R = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

sys.stdout.reconfigure(encoding='utf-8')

def run():
    p = subprocess.run(['node', '--test', '--test-timeout=60000', 'test/site.test.js'], cwd=R, capture_output=True, text=True, encoding='utf-8')
    # una prueba que se cuelga hasta el tiempo límite sale como cancelled, no como fail: cuenta como roja
    fail = int(re.search(r'^ℹ fail (\d+)', p.stdout, re.M).group(1)) + int(re.search(r'^ℹ cancelled (\d+)', p.stdout, re.M).group(1))
    names = sorted(set(re.findall(r'^✖ (.+?) \(\d', p.stdout, re.M)))
    return fail, names

PF = 'functions/_lib/profile.js'
AP = 'functions/api/profile.js'
ME = 'functions/api/me.js'
CU = 'site/cuenta.js'
HO = 'site/hoja.js'

# (nombre, archivo, texto exacto que existe una vez, texto que lo reemplaza); el texto puede abarcar varias líneas
MUTS = [
    # servidor: PUT /api/profile edita el perfil entero
    ('S1 servidor: la edición se reconoce por el @ y no por la foto (el PUT de completar la identidad cambia el @)', AP, "Object.prototype.hasOwnProperty.call(it.body, 'avatar_url')) return editProfile(it, env);", "Object.prototype.hasOwnProperty.call(it.body, 'handle')) return editProfile(it, env);"),
    ('S2 servidor: editar no se limita al perfil del dueño (sin WHERE)', AP, "'WHERE user_id = ?1'\n    ).bind(it.user.sub, p.handle", "''\n    ).bind(it.user.sub, p.handle"),
    ('S3 servidor: un @ ocupado no da 409 al editar', AP, "    if (!r.meta.changes) return json({ error: 'no-profile' }, 403);\n  } catch (e) {\n    if (/UNIQUE/i.test(String(e && e.message))) return json({ error: 'handle-taken' }, 409);", "    if (!r.meta.changes) return json({ error: 'no-profile' }, 403);\n  } catch (e) {"),
    ('S4 servidor: sin perfil, editar no da 403', AP, "    if (!r.meta.changes) return json({ error: 'no-profile' }, 403);\n  } catch", "  } catch"),
    ('S5 servidor: una fecha de menos de 21 no frena la edición', AP, "  if (p.error) return json({ error: p.error }, 400);\n  try {", "  if (p.error && p.error !== 'age-under-21') return json({ error: p.error }, 400);\n  try {"),
    ('S6 servidor: el nombre público no se arma otra vez al editar', AP, ".bind(it.user.sub, p.handle, p.display_name, p.bio, p.favorite_brand, p.avatar_key, p.first_name, p.last_name, p.gender, p.birth_date, now.toISOString())", ".bind(it.user.sub, p.handle, null, p.bio, p.favorite_brand, p.avatar_key, p.first_name, p.last_name, p.gender, p.birth_date, now.toISOString())"),
    ('S7 servidor: la respuesta de editar trae la fecha de nacimiento', AP, "return json({ profile: { handle, display_name, bio, favorite_brand, avatar_key } });", "return json({ profile: { handle, display_name, bio, favorite_brand, avatar_key, birth_date: p.birth_date } });"),
    ('S8 servidor: editar deja el género sin cambiar', AP, "first_name = ?7, last_name = ?8, gender = ?9, birth_date = ?10, updated_at = ?11 '", "first_name = ?7, last_name = ?8, gender = gender, birth_date = ?10, updated_at = ?11 '"),
    # cuenta.js: la puerta y el formulario de editar
    ('C1 cuenta: subir una foto mientras se guarda se permite', CU, "  if(sending())return Promise.resolve({error:'avatar-busy'});\n", ""),
    ('C2 cuenta: un formulario de editar viejo o de otra cuenta sigue guardando', CU, "const send=async f=>{\n  if(!live())return {stale:true};\n  const pic=picture.url();\n  if(!pic)return {error:'avatar-required'};\n  let r;try{r=await D.api(C,'PUT'", "const send=async f=>{\n  const pic=picture.url();\n  if(!pic)return {error:'avatar-required'};\n  let r;try{r=await D.api(C,'PUT'", "D.ui.edit(prof,async f=>{\n  if(!live())return {stale:true};\n", "D.ui.edit(prof,async f=>{\n"),
    ('C3 cuenta: guardar con una subida en curso se permite', CU, "if(pending()||sending)return {error:'avatar-busy'};\n  sending=true;try{return await send(f||{})}finally{sending=false}},picture)}", "sending=true;try{return await send(f||{})}finally{sending=false}},picture)}"),
    ('C4 cuenta: al guardar la edición no corre la acción', CU, "D.ui.toast('Perfil guardado.');done();return {ok:true}", "D.ui.toast('Perfil guardado.');return {ok:true}"),
    ('C5 cuenta: un guardado rechazado se da por bueno', CU, "if(r.status===200&&r.body.profile){if(!!C.user&&C.user.id===uid)cache", "if(r.status!==0){if(!!C.user&&C.user.id===uid)cache"),
    ('C6 cuenta: sin Clerk se edita con el perfil guardado en el teléfono', CU, "if(D.store.get()&&!o.edit)", "if(D.store.get())"),
    ('C7 cuenta: sin conexión se edita con el perfil guardado en el teléfono', CU, "c&&c.sub===uid&&!o.edit&&(", "c&&c.sub===uid&&("),
    ('C8 cuenta: la puerta no abre el formulario de editar', CU, "if(r.status===200&&r.body.profile&&o.edit){", "if(false&&r.status===200&&r.body.profile&&o.edit){"),
    ('C9 cuenta: la foto de editar es siempre la de la cuenta y no la del perfil guardado', CU, "typeof prof.avatar_key==='string'&&prof.avatar_key.startsWith(CLERK_IMG)?prof.avatar_key:picOf(U)", "picOf(U)"),
    ('C10 cuenta: una foto guardada que no es de Clerk se usa', CU, "prof.avatar_key.startsWith(CLERK_IMG)", "true"),
    ('C11 cuenta: editar manda el perfil sin la foto', CU, "D.api(C,'PUT','/api/profile',{...f,avatar_url:pic},uid)", "D.api(C,'PUT','/api/profile',{...f},uid)"),
    # hoja.js: la pantalla y por dónde se llega
    ('H1 pantalla: el formulario de editar no trae el nombre guardado', HO, "$('#obFn').value=pf.first_name||'';", "$('#obFn').value='';"),
    ('H2 pantalla: el formulario de editar no trae el @ guardado', HO, "$('#obH').value=pf.handle||'';", "$('#obH').value='';"),
    ('H3 pantalla: no hay cómo salir sin guardar (Cancelar)', HO, "${edm?'<a class=\"lbtn\" href=\"#/mihoja/perfil\" id=\"obCancel\">Cancelar</a>':''}", ""),
    ('H4 pantalla: el botón de editar dice Crear mi perfil', HO, "${idm||edm?'Guardar':'Crear mi perfil'}", "${idm?'Guardar':'Crear mi perfil'}"),
    ('H5 pantalla: un error desconocido al editar dice crear', HO, "(idm||edm?'No pudimos guardar tu perfil. Intenta otra vez.'", "(idm?'No pudimos guardar tu perfil. Intenta otra vez.'"),
    ('H6 ruta: #/mihoja/editar no pide el formulario de editar', HO, "requireAccount(()=>vMiHojaIn(sub),sub==='editar'?{edit:true}:undefined)", "requireAccount(()=>vMiHojaIn(sub))"),
    ('H7 ruta: al guardar no vuelve a Perfil', HO, "if(sub==='editar'){location.hash='#/mihoja/perfil';return}", ""),
    ('H8 ruta: el encabezado no lleva el enlace a editar', HO, "<p><a class=\"lbtn\" href=\"#/mihoja/editar\" id=\"mhEdit\">Editar perfil</a></p>", ""),
    ('H9 ruta: la puerta no conoce el formulario de editar', HO, "edit:(prof,submit,picture)=>onboardingForm(submit,picture,'edit',prof),", ""),
    ('H10 caché: el shell se publica con la versión de antes', 'site/sw.js', "const VERSION='lhb-v54';", "const VERSION='lhb-v53';"),
    ('C8 cuenta: cada selector cuenta solo sus propias subidas (una subida vieja no bloquea el formulario nuevo, Codex ronda 1)', CU, "function picker(U,live,pic0,sending){\n let pic=pic0,up=0;", "function picker(U,live,pic0,sending){\n let pic=pic0,up=0,upn=0;"),
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
