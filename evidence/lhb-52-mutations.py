"""LHB-52: la prueba de que las pruebas nuevas pueden fallar. Cada mutación rompe una línea de lo que se entrega,
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
    # servidor: las reglas
    ('S1 servidor: un nombre vacío se acepta', PF, "  if (!t) return { error: field + '-required' };\n", "  if (!t) return { value: t };\n"),
    ('S2 servidor: los caracteres de control en el nombre pasan', PF, "  if (NAME_CONTROL.test(t)) return { error: field + '-invalid' };\n", ""),
    ('S3 servidor: el largo del nombre se mide en unidades UTF-16, no en caracteres', PF, "if ([...t].length > NAME_MAX)", "if (t.length > NAME_MAX)"),
    ('S4 servidor: el nombre puede tener 51 caracteres', PF, "export const NAME_MAX = 50;", "export const NAME_MAX = 51;"),
    ('S5 servidor: cualquier género pasa', PF, "  if (v !== 'M' && v !== 'F') return { error: 'gender-invalid' };\n", ""),
    ('S6 servidor: el género no es obligatorio', PF, "  if (v == null || v === '') return { error: 'gender-required' };\n", ""),
    ('S7 servidor: la fecha no es obligatoria', PF, "  if (v == null || v === '') return { error: 'birth_date-required' };\n", ""),
    ('S8 servidor: el 30 de febrero pasa (la fecha no se verifica en el calendario)', PF, " || dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d", ""),
    ('S9 servidor: un año anterior a 1900 pasa', PF, " || y < MIN_BIRTH_YEAR", ""),
    ('S10 servidor: una fecha futura no tiene su propio error', PF, "  if (v > today) return { error: 'birth_date-future' };\n", ""),
    ('S11 servidor: quien cumple 21 hoy se rechaza', PF, "  if (v > cutoff) return", "  if (v >= cutoff) return"),
    ('S12 servidor: la edad mínima es 20', PF, "export const MIN_AGE = 21;", "export const MIN_AGE = 20;"),
    ('S13 servidor: el corte de los 21 años ignora el mes y el día', PF, ".padStart(4, '0') + today.slice(4);", ".padStart(4, '0') + '-12-31';"),
    ('S14 servidor: el nombre público trae el apellido completo', PF, "[...last][0].toUpperCase() + '.'", "last + '.'"),
    ('S15 servidor: la lectura pública trae la fecha de nacimiento', PF, "'handle, display_name, bio, favorite_brand, avatar_key'", "'handle, display_name, bio, favorite_brand, avatar_key, birth_date'"),
    ('S16 servidor: la lectura pública trae el género', PF, "'handle, display_name, bio, favorite_brand, avatar_key'", "'handle, display_name, bio, favorite_brand, avatar_key, gender'"),
    ('S17 servidor: la lectura pública trae perfiles ocultos', PF, " WHERE handle = ?1 AND hidden = 0'", " WHERE handle = ?1'"),
    ('S18 servidor: la puerta de Mi Hoja trae el nombre y el apellido', PF, "', hidden FROM profiles WHERE user_id = ?1'", "', hidden, first_name, last_name, birth_date FROM profiles WHERE user_id = ?1'"),
    # servidor: POST y PUT
    ('P1 POST: la fecha de nacimiento no se guarda', AP, "p.gender, p.birth_date, stamp)", "p.gender, null, stamp)"),
    ('P2 POST: la respuesta 201 trae el género y la fecha', AP, "return json({ profile: { handle, display_name, bio, favorite_brand, avatar_key } }, 201);", "return json({ profile: { handle, display_name, bio, favorite_brand, avatar_key, gender: p.gender, birth_date: p.birth_date } }, 201);"),
    ('P3 PUT: se puede sobrescribir una identidad completa', AP, "'WHERE user_id = ?1 AND (first_name IS NULL OR last_name IS NULL OR gender IS NULL OR birth_date IS NULL)'", "'WHERE user_id = ?1'"),
    ('P4 PUT: el nombre público que ya existía se pisa', AP, "display_name = COALESCE(display_name, ?6)", "display_name = ?6"),
    ('P5 PUT: se toca el sello del 21+ original', AP, "updated_at = ?7 ' +", "updated_at = ?7, age_ok_at = ?7 ' +"),
    ('P6 PUT: sin validar la identidad', AP, "  if (id.error) return json({ error: id.error }, 400);\n", ""),
    ('P7 PUT: sin perfil también da 409', AP, "return has ? json({ error: 'identity-exists' }, 409) : json({ error: 'no-profile' }, 403);", "return json({ error: 'identity-exists' }, 409);"),
    # /api/me
    ('E1 /api/me: un perfil sin fecha de nacimiento no pide completar', ME, " || p.birth_date == null;", ";"),
    ('E2 /api/me: no manda la marca needsIdentity', ME, "return json({ profile: p, needsIdentity });", "return json({ profile: p });"),
    ('E3 /api/me: un perfil sin género no pide completar', ME, "|| p.gender == null ", ""),
    # cuenta.js
    ('C1 gate: un perfil sin identidad abre Mi Hoja directo', CU, " if(r.status===200&&r.body.profile&&r.body.needsIdentity===true)return identify(C,done,o,lv,uid,r.body.profile);\n", ""),
    ('C2 gate: el perfil guardado de antes no se borra', CU, " D.store.clear();\n const {live,settle}=guard(C,o,lv,uid);let sending=false;", " const {live,settle}=guard(C,o,lv,uid);let sending=false;"),
    ('C3 gate: el PUT lleva todo lo que mande el formulario', CU, "{first_name:f.first_name,last_name:f.last_name,gender:f.gender,birth_date:f.birth_date}", "f"),
    ('C4 gate: un rechazo del servidor se da por completado', CU, "  if(r.status===200)return finish();\n", "  if(r.status===200||r.status===400)return finish();\n"),
    ('C5 gate: la revisión que sigue diciendo que falta se da por buena', CU, "&&m.body.needsIdentity!==true)return finish();", ")return finish();"),
    ('C6 gate: se puede enviar dos veces a la vez', CU, "  if(sending)return {error:'busy'};\n", ""),
    ('C7 gate: se manda el PUT aunque la cuenta ya sea otra (se quitan las dos revisiones de antes del PUT)', CU, "  if(!live())return {stale:true};\n  let r;try{r=await D.api(C,'PUT'", "  let r;try{r=await D.api(C,'PUT'", " D.ui.identity(async f=>{\n  if(!live())return {stale:true};\n", " D.ui.identity(async f=>{\n"),
    ('C8 gate: la respuesta tardía de otra cuenta completa esta', CU, "  if(!live())return {stale:true};\n  if(r.status===200)return finish();", "  if(r.status===200)return finish();"),
    ('C9 gate: tras completar en una página pública no se repinta', CU, "D.ui.toast('Listo, tu perfil está completo.');if(o.inPlace)D.reroute();done();", "D.ui.toast('Listo, tu perfil está completo.');done();"),
    ('C10 gate: tras completar no se guarda el perfil', CU, "const finish=()=>{cache({sub:uid,handle:prof.handle});", "const finish=()=>{"),
    ('C11 gate: el perfil nuevo sigue mandando la casilla de 21', CU, "{...f,avatar_url:pic}", "{...f,age_ok:true,avatar_url:pic}"),
    # hoja.js
    ('H1 formulario: la fecha de un menor se manda', HO, "if(v>String(+today.slice(0,4)-21).padStart(4,'0')+today.slice(4))return 'age-under-21';\n", ""),
    ('H2 formulario: no se revisa la identidad antes de mandar', HO, "const bad=idProblem(f,new Date().toISOString().slice(0,10));if(bad)return err(OB_ERR[bad]||OB_ERR['birth_date-invalid']);", ""),
    ('H3 formulario: una fecha futura pasa', HO, " if(v>today)return 'birth_date-future';\n", ""),
    ('H4 formulario: el género no es obligatorio', HO, " if(f.gender!=='M'&&f.gender!=='F')return 'gender-required';\n", ""),
    ('H5 formulario: el largo del nombre se mide en unidades UTF-16', HO, "if([...s].length>50)return k+'-long'", "if(s.length>50)return k+'-long'"),
    ('H6 formulario: los separadores de línea pasan en el nombre', HO, "const ID_BAD=/[\\p{Cc}\\p{Zl}\\p{Zp}]/u;", "const ID_BAD=/[\\p{Cc}]/u;"),
    ('H7 formulario: completar también manda el @ y la bio', HO, "submit(idm?f:{handle:h,", "submit({handle:h,"),
    ('H8 formulario: el campo de fecha no tiene tope en hoy', HO, 'min="1900-01-01" max="${today}"', 'min="1900-01-01"'),
    ('H9 formulario: aparece un tercer género', HO, "Femenino</label></div>", 'Femenino</label><label class="check"><input type="radio" name="obG" id="obGX" value="X"> Otro</label></div>'),
    ('H10 formulario: completar muestra la foto y el @', HO, "${idm?'<p class=\"hint\">Ahora pedimos", "${false?'<p class=\"hint\">Ahora pedimos"),
    ('H11 hoja: el paso de completar no está en la interfaz', HO, "identity:submit=>onboardingForm(submit,null,'identity'),", ""),
    ('H12 formulario: la fecha y el género se guardan en el navegador', HO, "const bad=idProblem(f,new Date().toISOString().slice(0,10));", "try{localStorage.setItem('birth_date',f.birth_date)}catch(e){}const bad=idProblem(f,new Date().toISOString().slice(0,10));"),
    ('K1 hoja: el perfil guardado de antes (llave vieja) vuelve a valer', HO, "A.LS.get('cuenta2',null)", "A.LS.get('cuenta',null)"),
    ('K2 hoja: salir no borra la llave vieja', HO, "localStorage.removeItem('vb_cuenta2');localStorage.removeItem('vb_cuenta')", "localStorage.removeItem('vb_cuenta2')"),
    # service worker
    ('W1 sw: la versión del caché no cambia', 'site/sw.js', "const VERSION='lhb-v53';", "const VERSION='lhb-v52';"),
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
