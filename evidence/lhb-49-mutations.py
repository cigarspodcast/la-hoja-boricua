"""LHB-49: la prueba de que las pruebas nuevas pueden fallar. Cada mutación rompe una línea de lo que se entrega,
corre `node --test test/site.test.js` y debe dar al menos una prueba en rojo. Al final todo se restaura byte por byte.
Uso: python evidence/lhb-49-mutations.py  (desde la raíz del repositorio)"""
import os, re, subprocess, sys
R = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

sys.stdout.reconfigure(encoding='utf-8')

def run():
    p = subprocess.run(['node', '--test', 'test/site.test.js'], cwd=R, capture_output=True, text=True, encoding='utf-8')
    fail = int(re.search(r'^ℹ fail (\d+)', p.stdout, re.M).group(1))
    names = sorted(set(re.findall(r'^✖ (.+?) \(\d', p.stdout, re.M)))
    return fail, names

# (nombre, archivo, texto exacto de una sola línea que existe una vez, texto que lo reemplaza)
MUTS = [
    ('M1 servidor: se acepta cualquier avatar_url (sin revisión)', 'functions/_lib/profile.js', "  if (a.error) return a;\n", "  if (a.error && a.error !== 'avatar-invalid') return a;\n"),
    ('M2 servidor: la foto ya no es obligatoria', 'functions/_lib/profile.js', "if (v == null || v === '') return { error: 'avatar-required' };", "if (v == null || v === '') return { avatar_key: null };"),
    ('M3 servidor: el prefijo deja pasar img.clerk.com.evil', 'functions/_lib/profile.js', "export const AVATAR_PREFIX = 'https://img.clerk.com/';", "export const AVATAR_PREFIX = 'https://img.clerk.com';"),
    ('M4 servidor: se permite la barra invertida', 'functions/_lib/profile.js', " || v.includes('\\\\')) return", ") return"),
    ('M5 servidor: se permiten espacios y no-ASCII', 'functions/_lib/profile.js', "!/^[!-~]+$/.test(v)", "false"),
    ('M6 servidor: sin límite de largo', 'functions/_lib/profile.js', "v.length > AVATAR_MAX || ", ""),
    ('M7 servidor: el INSERT no guarda avatar_key', 'functions/api/profile.js', "p.favorite_brand, p.avatar_key, now)", "p.favorite_brand, null, now)"),
    ('M8 servidor: la respuesta 201 no trae la foto', 'functions/api/profile.js', "const { handle, display_name, bio, favorite_brand, avatar_key } = p;", "const { handle, display_name, bio, favorite_brand } = p; const avatar_key = null;"),
    ('M9 gate: se manda el perfil aunque no haya foto', 'site/cuenta.js', "  if(!pic)return {error:'avatar-required'};\n", ""),
    ('M10 gate: la silueta de Clerk (hasImage false) cuenta como foto', 'site/cuenta.js', "U&&U.hasImage===true&&", "U&&"),
    ('M11 gate: cualquier URL cuenta como foto', 'site/cuenta.js', "&&U.imageUrl.startsWith(CLERK_IMG)?U.imageUrl:null", "?U.imageUrl:null"),
    ('M12 gate: se sube cualquier archivo, no solo imágenes', 'site/cuenta.js', "||!/^image\\//.test(file.type))return Promise.resolve({error:'avatar-type'})", ")return Promise.resolve({error:'avatar-type'})"),
    ('M13 gate: no se manda avatar_url', 'site/cuenta.js', "age_ok:true,avatar_url:pic}", "age_ok:true}"),
    ('M14 gate: una subida superada sí cambia la foto', 'site/cuenta.js', "   if(!cur())return {stale:true};\n   const p=picOf(U)", "   if(!lv(C,uid))return {stale:true};\n   const p=picOf(U)"),
    ('M15 gate: una subida de otra cuenta sí cambia la foto', 'site/cuenta.js', "   if(!cur())return {stale:true};\n   const p=picOf(U)", "   if(n!==up)return {stale:true};\n   const p=picOf(U)"),
    ('M16 gate: no se recarga la cuenta tras subir', 'site/cuenta.js', "throw 0;await U.reload()}catch", "throw 0;await 0}catch"),
    ('M17 gate: un error de subida de otra cuenta llega a esta pantalla', 'site/cuenta.js', "await U.setProfileImage({file})}catch(e){return cur()?{error:'avatar-upload'}:{stale:true}}", "await U.setProfileImage({file})}catch(e){return {error:'avatar-upload'}}"),
    ('M18 formulario: la foto no se pide antes del @', 'site/hoja.js', "  if(!picture.url())return err(OB_ERR['avatar-required']);\n", ""),
    ('M19 formulario: la imagen no se achica antes de subirla', 'site/hoja.js', "await A.resizeImage(f,512,.85)", "f"),
    ('M20 formulario: el selector deja escoger cualquier archivo', 'site/hoja.js', 'type="file" accept="image/*" id="obPf"', 'type="file" id="obPf"'),
    ('M21 app: resizeImage no llega al formulario', 'site/app.js', "vPerfil,resizeImage,hydrate:", "vPerfil,hydrate:"),
    ('M22 sw: la versión del caché no cambia', 'site/sw.js', "const VERSION='lhb-v51';", "const VERSION='lhb-v50';"),
    # ronda 1 de Codex: las subidas van en cola, la recarga es obligatoria, subir y enviar no se cruzan
    ('M23 gate: las subidas ya no van en cola', 'site/cuenta.js', "const job=uq.then(async()=>{try{", "const job=Promise.resolve().then(async()=>{try{"),
    ('M24 gate: una recarga que falla se da por buena', 'site/cuenta.js', "try{if(typeof U.reload!=='function')throw 0;await U.reload()}catch(e){return cur()?{error:'avatar-upload'}:{stale:true}}", "try{if(typeof U.reload==='function')await U.reload()}catch(e){}"),
    ('M25 gate: se puede subir mientras se envía', 'site/cuenta.js', "  if(sending)return Promise.resolve({error:'avatar-busy'});\n", ""),
    ('M26 gate: se puede enviar mientras se sube', 'site/cuenta.js', "  if(pend||sending)return {error:'avatar-busy'};\n", ""),
    ('M27 gate: una subida superada ya en cola igual escribe', 'site/cuenta.js', "   if(!cur())return {stale:true};\n   try{await U.setProfileImage", "   try{await U.setProfileImage"),
    ('M28 formulario: se puede enviar mientras algo corre', 'site/hoja.js', "e.preventDefault();if(working)return;", "e.preventDefault();"),
    ('M29 formulario: el botón de foto sigue activo mientras algo corre', 'site/hoja.js', "$('#obGo').disabled=b;$('#obPb').disabled=b};", "$('#obGo').disabled=b};"),
    ('M30 formulario: el envío no toma el candado', 'site/hoja.js', "err('');busy(true);\n", "err('');$('#obGo').disabled=true;\n"),
    ('M31 formulario: una subida invalidada con el formulario en pantalla deja todo apagado', 'site/hoja.js', "catch(x){r={error:'avatar-type'}}" + "\n" + "  if($('#obForm')!==form)return;if(!r||r.stale){busy(false);return}", "catch(x){r={error:'avatar-type'}}" + "\n" + "  if($('#obForm')!==form)return;if(!r||r.stale){return}"),
    ('M32 formulario: un envío invalidado con el formulario en pantalla deja todo apagado', 'site/hoja.js', "catch(x){r={error:'generic'}}" + "\n" + "  if($('#obForm')!==form)return;if(!r||r.stale){busy(false);return}", "catch(x){r={error:'generic'}}" + "\n" + "  if($('#obForm')!==form)return;if(!r||r.stale){return}"),
    ('M33 formulario: terminada la subida los botones quedan apagados', 'site/hoja.js', "busy(false);if(r.error)return err(", "if(r.error)return err("),
    ('M34 formulario: terminado el envío con error los botones quedan apagados', 'site/hoja.js', "busy(false);if(r.error)err(OB_ERR[r.error]||'No pudimos", "if(r.error)err(OB_ERR[r.error]||'No pudimos"),
    # ronda 3 de Codex: un formulario que sigue en pantalla después de que otra acción falló se puede terminar
    ('M35 gate: un formulario reemplazado por otro sigue valiendo', 'site/cuenta.js', "(mine===formSeq&&ob&&", "(ob&&"),
    ('M36 gate: una acción más nueva en vuelo no se descarta al crear el perfil', 'site/cuenta.js', "if(!lv(C,uid)){if(o.inPlace)sip++;else seq++}", "if(!lv(C,uid)){}"),
    ('M37 gate: un formulario invalidado por una acción que falló queda muerto', 'site/cuenta.js', "||(mine===formSeq&&ob&&vis===vis0&&D.here()===here0&&!!C.user&&C.user.id===uid);", ";"),
    ('M38 gate: el formulario vivo sobrevive a un cambio de página', 'site/cuenta.js', "&&D.here()===here0&&", "&&"),
    ('M39 gate: el formulario vivo sobrevive a un cambio de cuenta', 'site/cuenta.js', "&&!!C.user&&C.user.id===uid);", "&&true);"),
]

def main():
    base = run()
    print('baseline', base)
    assert base[0] == 0, 'la línea base debe estar en verde'
    bad = 0
    for name, rel, a, b in MUTS:
        p = os.path.join(R, *rel.split('/'))
        orig = open(p, 'rb').read()
        text = orig.decode('utf-8')
        crlf = '\r\n' in text
        t = text.replace('\r\n', '\n')
        if t.count(a) != 1:
            print(name, '-> ERROR: el texto a mutar aparece', t.count(a), 'veces'); bad += 1; continue
        m = t.replace(a, b, 1)
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
