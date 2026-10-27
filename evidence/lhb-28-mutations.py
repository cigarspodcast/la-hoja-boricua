"""LHB-28 y LHB-31: la prueba de que las pruebas nuevas pueden fallar. Cada mutación rompe una línea de lo que se entrega,
corre `node --test test/site.test.js` y debe dar al menos una prueba en rojo. Al final todo se restaura byte por byte.
Uso: python evidence/lhb-28-mutations.py  (desde la raíz del repositorio); con --check solo comprueba que cada texto a mutar aparece una vez;
con ids (S1 M3 E7...) corre solo esas."""
import os, re, subprocess, sys
R = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

sys.stdout.reconfigure(encoding='utf-8')

def run():
    p = subprocess.run(['node', '--test', '--test-timeout=60000', 'test/site.test.js'], cwd=R, capture_output=True, text=True, encoding='utf-8')
    # una prueba que se cuelga hasta el tiempo límite sale como cancelled, no como fail: cuenta como roja
    fail = int(re.search(r'^ℹ fail (\d+)', p.stdout, re.M).group(1)) + int(re.search(r'^ℹ cancelled (\d+)', p.stdout, re.M).group(1))
    names = sorted(set(re.findall(r'^✖ (.+?) \(\d', p.stdout, re.M)))
    return fail, names

API = 'functions/api/mihoja.js'
LIB = 'functions/_lib/mihoja.js'
SY = 'site/sync.js'
HO = 'site/hoja.js'
AP = 'site/app.js'
CU = 'site/cuenta.js'
IX = 'site/index.html'
SW = 'site/sw.js'

# (nombre, archivo, texto exacto que existe una vez, texto que lo reemplaza, [otro texto, su reemplazo]...)
MUTS = [
    # servidor: /api/mihoja
    ('S1 api: leer no pide sesion ni perfil', API, "export async function onRequestGet({ request, env }) {\n  const g = await requireProfile(request, env);", "export async function onRequestGet({ request, env }) {\n  const g = { user: { sub: 'user_a' } };"),
    ('S2 api: leer trae la copia de otra cuenta', API, "const s = shape(await current(env.DB).bind(g.user.sub).first());", "const s = shape(await current(env.DB).bind('user_a').first());"),
    ('S3 api: guardar acepta cualquier tipo de contenido', API, "if (!/^application\\/json\\b/i.test(request.headers.get('Content-Type') || '')) return json({ error: 'bad-type' }, 415);", ""),
    ('S4 api: guardar sin If-Match no da 428', API, "if (rev === null) return json({ error: 'if-match-required' }, 428);", ""),
    ('S5 api: guardar pisa aunque el rev no sea el vigente', API, "WHERE user_id = ?1 AND rev = ?5", "WHERE user_id = ?1 AND ?5 = ?5"),
    ('S6 api: el rev no sube al guardar', API, "rev = rev + 1, updated_at", "rev = rev, updated_at"),
    ('S7 api: crear con If-Match 0 pisa una copia que ya existe', API, "ON CONFLICT(user_id) DO NOTHING", "ON CONFLICT(user_id) DO UPDATE SET doc = excluded.doc, schema = excluded.schema, rev = rev + 1, updated_at = excluded.updated_at"),
    ('S8 api: el 409 no trae la copia de ahora', API, "json({ error: 'conflict', ...s }, 409)", "json({ error: 'conflict' }, 409)"),
    ('S9 api: guardar siempre dice que pasó', API, "if (r.meta.changes) return json({ rev: rev + 1, updated_at: at });", "return json({ rev: rev + 1, updated_at: at });"),
    ('S10 api: una fila dañada se manda como si no hubiera copia', API, "return s ? json(s) : json({ error: 'corrupt' }, 500);", "return json(s || { rev: 0, schema: null, doc: null, updated_at: null });"),
    ('S11 lib: If-Match vacío o con letras vale', LIB, r'''/^\s*(?:W\/)?"?(\d{1,9})"?\s*$/''', r'''/^\s*(?:W\/)?"?(\d*)"?\s*$/'''),
    ('S12 lib: el servidor acepta un esquema mas nuevo', LIB, "export const SCHEMA_MAX = 1;", "export const SCHEMA_MAX = 2;"),
    ('S13 lib: sin tope de tamano del documento', LIB, "export const DOC_MAX = 900000;", "export const DOC_MAX = 90000000;"),
    ('S14 lib: sin tope de entradas por lista', LIB, "export const LIST_MAX = 5000;", "export const LIST_MAX = 50000;"),
    ('S15 lib: el doc puede no ser un objeto', LIB, "if (!isObj(b.doc)) return { error: 'bad-doc', status: 400 };", ""),
    ('S16 lib: una fila con JSON dañado no se detecta', LIB, "try { doc = JSON.parse(row.doc); } catch (e) { return null; }", "try { doc = JSON.parse(row.doc); } catch (e) { doc = null; }"),
    ('S17 lib: el esquema solo se compara por arriba', LIB, "if (!Number.isInteger(b.schema) || b.schema < 1 || b.schema > SCHEMA_MAX)", "if (b.schema > SCHEMA_MAX)"),
    ('S18 lib: humidor y diario pueden no ser listas', LIB, "if (b.doc[k] !== undefined && !Array.isArray(b.doc[k])) return { error: 'bad-doc', status: 400 };", ""),
    ('S19 lib: pasaporte, favoritos y estrellas pueden no ser mapas', LIB, "for (const k of ['pasaporte', 'favs', 'ratings']) if (b.doc[k] !== undefined && !isObj(b.doc[k])) return { error: 'bad-doc', status: 400 };", ""),
    # juntar
    ('M1 juntar: si solo el otro cambio un registro, no se toma lo suyo', SY, "else if(o&&same(x,o))v=y;", ""),
    ('M2 juntar: si solo este cambio un registro, no se toma lo suyo', SY, "else if(o&&same(y,o))v=x;", ""),
    ('M3 juntar: lo que el otro borro vuelve', SY, "else if(x)v=o&&same(x,o)?null:x;", "else if(x)v=x;"),
    ('M4 juntar: lo que este borro vuelve', SY, "else v=o&&same(y,o)?null:y;", "else v=y;"),
    ('M5 juntar: borrar le gana a editar', SY, "else if(x)v=o&&same(x,o)?null:x;", "else if(x)v=null;"),
    ('M6 juntar: gana lo mas viejo', SY, "v=sx>sy?x:sy>sx?y:prefer", "v=sx<sy?x:sy<sx?y:prefer"),
    ('M7 juntar: el empate depende de quien junta', SY, "prefer==='local'?x:stable(x)>=stable(y)?x:y}}", "prefer==='local'?x:x}}"),
    ('M8 juntar: al importar no gana lo de este telefono', SY, "sy>sx?y:prefer==='local'?x:stable", "sy>sx?y:stable"),
    ('M9 juntar: un favorito quitado vuelve', SY, "if(inL&&inR)out.push(x);else if(!inB)out.push(x)}", "if(inL&&inR)out.push(x);else out.push(x)}"),
    ('M10 juntar: el sello se queda con la fecha mas nueva', SY, "min?(String(x)<=String(y)?x:y)", "min?(String(x)>=String(y)?x:y)"),
    ('M11 juntar: la estrella se queda con la menor', SY, ":(stable(x)>=stable(y)?x:y))", ":(stable(x)<=stable(y)?x:y))"),
    ('M12 juntar: un sello o estrella quitado en el otro vuelve (lado de aqui)', SY, "else if(inL){if(!inB||!same(l[k],b[k]))out[k]=clone(l[k])}", "else if(inL){out[k]=clone(l[k])}"),
    ('M13 juntar: un sello o estrella quitado aqui vuelve (lado de alla)', SY, "else if(!inB||!same(r[k],b[k]))out[k]=clone(r[k])}", "else out[k]=clone(r[k])}"),
    ('M14 juntar: creado se queda con la fecha mas nueva', SY, ".sort()[0]||''", ".sort().pop()||''"),
    ('M15 juntar: el esquema se queda con el menor', SY, "Math.max(l.schema,r.schema)", "Math.min(l.schema,r.schema)"),
    ('M16 juntar: el borrador viaja a la cuenta', SY, "const LOCAL_ONLY=['draft','cambios',", "const LOCAL_ONLY=['cambios',"),
    ('M17 juntar: se aceptan registros sin id', SY, "&&typeof x.id==='string'&&x.id)", ")"),
    ('M18 juntar: las estrellas no cuentan como datos', SY, "+d.favs[k].length,0)+Object.keys(d.ratings).length>0", "+d.favs[k].length,0)>0"),
    ('M19 juntar: comparar copias depende del orden de las listas', SY, "for(const k of ['humidor','diario'])d[k].sort((a,b)=>a.id<b.id?-1:a.id>b.id?1:0);", ""),
    ('M20 juntar: lo nuevo de la cuenta no va primero en el humidor', SY, "mergeList(b.humidor,l.humidor,r.humidor,prefer,prefer!=='local')", "mergeList(b.humidor,l.humidor,r.humidor,prefer,false)"),
    ('M21 juntar: el diario no queda de lo mas nuevo a lo mas viejo', SY, ".sort((x,y)=>String(y.fecha||'').localeCompare(String(x.fecha||'')))", ""),
    ('M22 juntar: los campos que esta version no conoce no viajan', SY, "Object.assign(out,mergeMap(extras(b),extras(l),extras(r),prefer,false));", ""),
    # motor
    ('E1 motor: el PUT no manda If-Match', SY, "{'If-Match':String(rev)}", "{}"),
    ('E2 motor: un 409 no se junta ni se reintenta', SY, "if(p.status===409)continue;", "if(p.status===409)return {fail:'conflict'};"),
    ('E3 motor: un solo intento', SY, "TRIES=4", "TRIES=1"),
    ('E4 motor: no se usa la base y lo borrado vuelve', SY, "const base=meta&&meta.base&&!wipe?meta.base:null;", "const base=null;"),
    ('E5 motor: un telefono vaciado sin que nadie escribiera vacia la cuenta', SY, "const wipe=meta&&meta.base&&hasData(meta.base)&&!hasData(L)&&!dirty&&!meta.dirty;", "const wipe=false;"),
    ('E6 motor: borrar la ultima entrada se toma por una perdida', SY, "&&!hasData(L)&&!dirty&&!meta.dirty;", "&&!hasData(L);"),
    ('E7 motor: al cambiar de cuenta no se aparta la copia anterior', SY, "if(raw!=null){try{D.ls.set(parkKey(meta.sub),raw)}catch(e){return {fail:'park'}}}", ""),
    ('E8 motor: no se nota el cambio de cuenta', SY, "if(meta&&meta.sub!==uid){", "if(false){"),
    ('E9 motor: no se comprueba que la sesion sea de la cuenta guardada', SY, "if(!C||!C.user||C.user.id!==acc.sub)return {skip:'other-account'};", "if(!C||!C.user)return {skip:'other-account'};"),
    ('E10 motor: se toca una copia de un esquema mas nuevo', SY, "if(g.body.rev>0&&(!isObj(g.body.doc)||!(g.body.schema<=1)))return {fail:'schema'};", ""),
    ('E11 motor: se sube aunque no haya nada nuevo', SY, "if(!remote||canon(merged)!==canon(remote)){", "if(true){"),
    ('E12 motor: el aviso de que se subio sale en cada pasada', SY, "if(first&&hasData(L))D.toast(", "if(hasData(L))D.toast("),
    ('E13 motor: se avisa que llego algo cuando no llego nada', SY, "if(pulled&&D.onApplied)", "if(D.onApplied)"),
    ('E14 motor: se reescribe Mi Hoja aunque no cambiara', SY, "if(canon(full)!==canon(Ln)){applying=true;", "if(true){applying=true;"),
    ('E15 motor: lo escrito mientras se sincroniza se pisa', SY, "const final=quiet?merged:merge(L,Ln,merged);", "const final=merged;"),
    ('E16 motor: lo que es solo del telefono se pierde al recibir', SY, "const full={...final,...keep(now0)};", "const full={...final};"),
    ('E17 motor: dos pasadas a la vez', SY, "if(busy){again=true;return busy}", "if(busy){again=true}"),
    ('E18 motor: abrir Mi Hoja siempre sincroniza', SY, "<o.minAge)return", "<0)return"),
    ('E19 motor: la espera de reintento no crece', SY, "RETRY=[20e3,40e3,80e3,160e3,300e3]", "RETRY=[20e3,20e3,20e3,20e3,20e3]"),
    ('E20 motor: guardar sincroniza sin pausa', SY, "DEBOUNCE=2500", "DEBOUNCE=0"),
    ('E21 motor: lo que la sincronizacion escribe la vuelve a disparar', SY, "function changed(){if(applying)return;", "function changed(){"),
    ('E22 motor: un cambio solo del telefono pide red', SY, "if(m&&m.sub===acc.sub&&m.base&&canon(D.getDoc())===canon(m.base)){dirty=false;if(m.dirty){delete m.dirty;writeMeta(m)}return}", ""),
    ('E23 motor: no escucha cuando vuelve la red', SY, "D.listen('online',()=>run('en-linea'));", ""),
    ('E24 motor: no escucha cuando la pagina se ve', SY, "D.listen('visible',()=>run('visible',{minAge:30e3}));", ""),
    ('E25 motor: al abrir la app no sincroniza', SY, "if(D.acct())D.setTimer(()=>run('abrir'),1500)}", "}"),
    ('E26 motor: sin conexion se dice error', SY, "set(r.skip==='offline'?'offline':'error',r.fail||r.skip)", "set('error',r.fail||r.skip)"),
    ('E27 motor: un fallo al avisar la pantalla rompe la pasada', SY, "try{D.onState(state)}catch(e){}", "D.onState(state)"),
    ('E28 motor: tras un exito la espera sigue creciendo', SY, "if(r.ok){fails=0;set('ok');", "if(r.ok){set('ok');"),
    ('E29 motor: el reintento pendiente sigue despues de un exito', SY, "if(retryT){D.clearTimer(retryT);retryT=0}if(again)", "if(again)"),
    ('E30 motor: cada cambio abre otro temporizador', SY, "function schedule(ms,fn){if(timer)D.clearTimer(timer);", "function schedule(ms,fn){"),
    ('E31 motor: si el telefono no puede guardar lo traido se da por bueno', SY, "if(!wrote)return {fail:'storage'};", ""),
    ('E32 motor: lo borrado mientras se sincroniza se toma por perdida', SY, "writeMeta({sub:uid,rev:newRev,base:merged,at:D.now(),dirty:edits!==e0});if(edits===e0)dirty=false;", "writeMeta({sub:uid,rev:newRev,base:merged,at:D.now(),dirty:false});dirty=false;"),
    ('E33 motor: escribir no marca que la persona hizo un cambio', SY, "edits++;dirty=true;{const m=readMeta();if(m&&!m.dirty){m.dirty=true;writeMeta(m)}}", ""),
    ('E34 motor: un error del servidor al leer se ignora', SY, "if(g.status!==200||!isObj(g.body)||!Number.isInteger(g.body.rev))return {fail:'get-'+g.status};", ""),
    # conexion con la pagina
    ('W1 hoja: escribir Mi Hoja no avisa al motor', HO, "if(SYNC)SYNC.changed();", ""),
    ('W2 hoja: importar junta sin dar prioridad a lo de este telefono', HO, "const m=LHB_MERGE.merge(null,s,inc,{prefer:'local'});", "const m=LHB_MERGE.merge(null,s,inc);"),
    ('W3 hoja: la tarjeta de entrar no sabe si hay datos guardados', HO, "hasLocal:()=>LHB_MERGE.hasData(S()),", ""),
    ('W4 hoja: abrir Mi Hoja no sincroniza', HO, "SYNC.run('mi-hoja',{minAge:20e3});", ""),
    ('W5 hoja: el motor nunca arranca', HO, "SYNC.start();\nfunction accountCard", "function accountCard"),
    ('W6 pagina: sync.js no se carga', IX, '<script src="sync.js" defer></script>', ''),
    ('W7 cache: sync.js no esta en el shell', SW, "'cuenta.js','sync.js',", "'cuenta.js',"),
    ('W8 cuenta: la tarjeta no dice que lo guardado pasa a la cuenta', CU, "+(D.hasLocal&&D.hasLocal()?' Lo que ya tienes guardado en este teléfono pasa a tu cuenta al entrar.':'')", ""),
    ('W9 hoja: lo que llega se repinta aunque haya una hoja abierta', HO, "(humidor|diario|pasaporte|favoritos))?$/.test(location.hash)&&!document.body.classList.contains('sheet-on')", "(humidor|diario|pasaporte|favoritos))?$/.test(location.hash)"),
    ('W10 hoja: el panel de respaldo no muestra el estado', HO, "${syncLine()}</section>", "</section>"),
    ('W11 hoja: el estado no se repinta al cambiar', HO, "onState:()=>{const el=document.getElementById('syncSt');if(el)el.outerHTML=syncLine()},", ""),
    ('W12 hoja: el aviso de respaldo dice que todo vive solo en el telefono', HO, "Tus catas y tu humidor están en tu cuenta.", "Tus catas y tu humidor viven solo en este teléfono."),
    ('W13 cache: el shell se publica con la version de antes', SW, "const VERSION='lhb-v59';", "const VERSION='lhb-v55';"),
    ('W14 hoja: api no manda las cabeceras de mas', HO, ",...(extra||{})}", "}"),
    ('W15 hoja: lo que llega no se guarda por write', HO, "setDoc:d=>{ST=normalize(d);return write(ST)}", "setDoc:d=>{ST=normalize(d);return true}"),
    # la puerta y el respaldo
    ('G1 puerta: el corazon de las tarjetas escribe sin cuenta', HO, "gate('fav',f.dataset.fav)", "toggleFav(f.dataset.fav)"),
    ('G2 puerta: el sello escribe sin cuenta', HO, "gate('stamp',st.dataset.stamp,st)", "toggleStamp(st.dataset.stamp,st)"),
    ('G3 puerta: el humidor se abre sin cuenta', HO, "if(sh.dataset.sheet==='humidor')gate('humidor',sh.dataset.arg);else openSheet(", "if(false)gate('humidor',sh.dataset.arg);else openSheet("),
    ('G4 puerta: el favorito de la vitola escribe sin cuenta', AP, "EXT.gate('fav','cigarros:'+c.id)", "EXT.toggleFav('cigarros',c.id)"),
    ('G5 puerta: la estrella escribe sin cuenta', AP, "EXT.gate('rate',c.id+':'+b.dataset.star)", "EXT.setRating(c.id,b.dataset.star)"),
    ('G6 puerta: catar se abre sin cuenta', HO, "cata:cid=>requireAccount(()=>vCata(cid),{fast:true})", "cata:cid=>vCata(cid)"),
    ('G7 puerta: subir se abre sin cuenta', AP, "subir:()=>EXT.requireAccount(vSubir,{fast:true})", "subir:vSubir"),
    ('G8 puerta: Mi Hoja se abre sin cuenta', HO, "requireAccount(()=>vMiHojaIn(sub),sub==='editar'?{edit:true}:undefined)", "vMiHojaIn(sub)"),
    ('G9 respaldo: exportar se alcanza desde fuera del panel', HO, "function bindBackup(){", "window.__exp=exportar;function bindBackup(){"),
    ('G10 respaldo: el panel aparece en otra pagina', HO, "const backupBanner=()=>", "const backupExtra=()=>backupPanel();const backupBanner=()=>"),
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
    only = [x for x in sys.argv[1:] if not x.startswith('--')]  # p. ej. S1 M3 E7: solo esas mutaciones
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
