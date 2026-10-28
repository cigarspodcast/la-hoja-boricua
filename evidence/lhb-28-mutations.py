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
    ('S1 api: leer no pide sesion ni perfil', API, "export async function onRequestGet({ request, env }) {\n  const g = await gate(request, env);", "export async function onRequestGet({ request, env }) {\n  const g = { user: { sub: 'user_a' } };"),
    ('S2 api: leer trae la copia de otra cuenta', API, "const s = shape(await current(env.DB).bind(g.user.sub).first());", "const s = shape(await current(env.DB).bind('user_a').first());"),
    ('S3 api: guardar acepta cualquier tipo de contenido', API, "if (!/^application\\/json\\b/i.test(request.headers.get('Content-Type') || '')) return json({ error: 'bad-type' }, 415);", ""),
    ('S4 api: guardar sin If-Match no da 428', API, "if (rev === null) return json({ error: 'if-match-required' }, 428);", ""),
    ('S5 api: guardar pisa aunque el rev no sea el vigente', API, "WHERE user_id = ?1 AND rev = ?5", "WHERE user_id = ?1 AND ?5 = ?5"),
    ('S6 api: el rev no sube al guardar', API, "rev = rev + 1, updated_at", "rev = rev, updated_at"),
    ('S7 api: crear con If-Match 0 pisa una copia que ya existe', API, "ON CONFLICT(user_id) DO NOTHING", "ON CONFLICT(user_id) DO UPDATE SET doc = excluded.doc, schema = excluded.schema, rev = rev + 1, updated_at = excluded.updated_at"),
    ('S8 api: el 409 no trae la copia de ahora', API, "json({ error: 'conflict', ...s }, 409)", "json({ error: 'conflict' }, 409)"),
    ('S9 api: guardar siempre dice que pasó', API, "if (r.meta.changes) return json({ rev: rev + 1, updated_at: at });", "return json({ rev: rev + 1, updated_at: at });"),
    ('S10 api: una fila dañada se manda como si no hubiera copia', API, "return s ? json(s) : json({ error: 'corrupt' }, 500);", "return json(s || { rev: 0, schema: null, doc: null, updated_at: null });"),
    ('S11 lib: If-Match vacío o con letras vale', LIB, r'''/^\s*(?:W\/)?(?:"(\d{1,9})"|(\d{1,9}))\s*$/''', r'''/^\s*(?:W\/)?(?:"(\d*)"|(\d*))\s*$/'''),
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
    ('E4 motor: no se usa la base y lo borrado vuelve', SY, "const base0=meta&&meta.base&&!wipe&&(!staleBase||!memOk)?meta.base:memOk&&!wipe?mem.base:null;", "const base0=null;"),
    ('E5 motor: un telefono vaciado sin que nadie escribiera vacia la cuenta', SY, "const wipe=meta&&meta.base&&hasData(meta.base)&&!hasData(L)&&!dirty&&!meta.dirty;", "const wipe=false;"),
    ('E6 motor: borrar la ultima entrada se toma por una perdida', SY, "&&!hasData(L)&&!dirty&&!meta.dirty;", "&&!hasData(L);"),
    ('E7 motor: al cambiar de cuenta no se aparta la copia anterior', SY, "if(raw!=null&&rawHasData(raw)){const k=freeKey(old);if(!k)return false;try{D.ls.set(k,raw)}catch(e){return false}}", ""),
    ('E8 motor: no se nota el cambio de cuenta', SY, "const old=ownerOf();if(old===null||old===acc.sub)return true;", "return true;"),
    ('E9 motor: no se comprueba que la sesion sea de la cuenta guardada', SY, "if(!C||!C.user||C.user.id!==acc.sub)return {skip:'other-account'};", "if(!C||!C.user)return {skip:'other-account'};"),
    ('E10 motor: se toca una copia de un esquema mas nuevo', SY, "if(g.body.rev>0&&(!isObj(g.body.doc)||!(g.body.schema<=1)))return {fail:'schema'};", ""),
    ('E11 motor: se sube aunque no haya nada nuevo', SY, "if(!remote||canon(merged)!==canon(remote)){", "if(true){"),
    ('E12 motor: el aviso de que se subio sale en cada pasada', SY, "if(first&&hasData(L))D.toast(", "if(hasData(L))D.toast("),
    ('E13 motor: se avisa que llego algo cuando no llego nada', SY, "if(pulled&&D.onApplied)", "if(D.onApplied)"),
    ('E14 motor: se reescribe Mi Hoja aunque no cambiara', SY, "if(canon(full)!==canon(Ln)){applying=true;", "if(true){applying=true;"),
    ('E15 motor: lo escrito mientras se sincroniza se pisa', SY, "final=quiet?merged:merge(L,Ln,merged);", "final=merged;"),
    ('E16 motor: lo que es solo del telefono se pierde al recibir', SY, "const full={...final,...keep(now0)};", "const full={...final};"),
    ('E17 motor: dos pasadas a la vez', SY, "if(busy){again=true;return busy}", "if(busy){again=true}"),
    ('E18 motor: abrir Mi Hoja siempre sincroniza', SY, "<o.minAge)return", "<0)return"),
    ('E19 motor: la espera de reintento no crece', SY, "RETRY=[20e3,40e3,80e3,160e3,300e3]", "RETRY=[20e3,20e3,20e3,20e3,20e3]"),
    ('E20 motor: guardar sincroniza sin pausa', SY, "DEBOUNCE=2500", "DEBOUNCE=0"),
    ('E21 motor: lo que la sincronizacion escribe la vuelve a disparar', SY, "function changed(prev){if(applying)return;", "function changed(prev){"),
    ('E22 motor: un cambio solo del telefono pide red', SY, "if(m&&m.sub===acc.sub&&m.base&&canon(D.getDoc())===canon(m.base)){dirty=false;if(m.dirty){delete m.dirty;writeMeta(m)}return}", ""),
    ('E23 motor: no escucha cuando vuelve la red', SY, "D.listen('online',()=>run('en-linea'));", ""),
    ('E24 motor: no escucha cuando la pagina se ve', SY, "D.listen('visible',()=>run('visible',{minAge:30e3}));", ""),
    ('E25 motor: al abrir la app no sincroniza', SY, "if(D.acct())D.setTimer(()=>run('abrir'),1500)}", "}"),
    ('E26 motor: sin conexion se dice error', SY, "set(r.skip==='offline'?'offline':'error',r.fail||r.skip)", "set('error',r.fail||r.skip)"),
    ('E27 motor: un fallo al avisar la pantalla rompe la pasada', SY, "try{D.onState(state)}catch(e){}", "D.onState(state)"),
    ('E28 motor: tras un exito la espera sigue creciendo', SY, "if(r.ok){fails=0;set('ok');", "if(r.ok){set('ok');"),
    ('E29 motor: el reintento pendiente sigue despues de un exito', SY, "if(retryT){D.clearTimer(retryT);retryT=0}if(again)", "if(again)"),
    ('E30 motor: cada cambio abre otro temporizador', SY, "function schedule(ms,fn){if(timer)D.clearTimer(timer);", "function schedule(ms,fn){"),
    ('E31 motor: si el telefono no puede guardar lo traido se da por bueno', SY, "if(!wrote||wrote==='stale'){if(pushed){mem=null;voided=true;poison()}return {fail:wrote?'conflict':'storage'}}", ""),
    ('E32 motor: lo borrado mientras se sincroniza se toma por perdida', SY, "at:D.now(),dirty:edited})){staleBase=true;poison();return {fail:'storage'}}\n   staleBase=false;voided=false;if(unk&&unk.sub===uid)unk=null;if(!edited)dirty=false;", "at:D.now(),dirty:false})){staleBase=true;poison();return {fail:'storage'}}\n   staleBase=false;voided=false;if(unk&&unk.sub===uid)unk=null;dirty=false;"),
    ('E33 motor: escribir no marca en memoria que la persona hizo un cambio', SY, "edits++;dirty=true;bumpSeq();", "edits++;bumpSeq();"),
    ('N8 motor: escribir no deja la marca de pendiente en la meta', SY, "if(m){if(!m.dirty){m.dirty=true;ch=true}", "if(m){"),
    ('E34 motor: un error del servidor al leer se ignora', SY, "if(g.status!==200||!isObj(g.body)||!Number.isInteger(g.body.rev))return {fail:'get-'+g.status};", ""),
    # Codex ronda 1
    ('R1 motor: la duena de lo guardado no se anota antes de la red', SY, "if(ownerOf()===null&&!setOwner(uid))return {fail:'storage'};", ""),
    ('R2 motor: un fallo al anotar lo sincronizado se da por exito', SY, "if(!writeMeta({sub:uid,rev:newRev,base:merged,at:D.now(),dirty:edited})){staleBase=true;poison();return {fail:'storage'}}", "writeMeta({sub:uid,rev:newRev,base:merged,at:D.now(),dirty:edited});"),
    ('R3 motor: tras un fallo al anotar se sigue usando la base vieja', SY, "const base0=meta&&meta.base&&!wipe&&(!staleBase||!memOk)?meta.base:memOk&&!wipe?mem.base:null;", "const base0=meta&&meta.base&&!wipe?meta.base:null;"),
    ('R4 motor: lo apartado se escribe siempre en la misma llave', SY, "const k=freeKey(old);if(!k)return false;", "const k=parkKey(old);"),
    ('R5 motor: al apartar no se pasa la duena a la cuenta nueva', SY, "return !!ok&&setOwner(acc.sub)}", "return !!ok}"),
    ('R6 motor: no se revisa la cuenta despues de leer', SY, "catch(e){return {skip:'offline'}}\n   if(!alive())return {skip:'other-account'};\n   if(g.status", "catch(e){return {skip:'offline'}}\n   if(g.status"),
    ('R7 motor: no se revisa la cuenta despues de guardar', SY, "\n    if(!alive())return {skip:'other-account'};\n    if(p.status===409)continue;", "\n    if(p.status===409)continue;"),
    # R8 (quitar la revision de cuenta justo antes de aplicar) NO esta en la lista: es un mutante equivalente. Entre la revision de despues de leer o de guardar y esa
    # no hay ningun await (solo getDoc, merge y canon, que son sincronos), y JavaScript no cambia de cuenta entre dos lineas sin await. Se deja la revision como defensa si alguien agrega un await ahi.
    # Medido en la ronda r3 (evidence/lhb-28-mutations-r3.txt): sobrevivio con fail=0.
    # E33 se acotó a `dirty=true;`: quitar `edits++;` o `bumpSeq();` de changed() ya no se puede notar desde la ronda 8, porque `!quiet` (la copia cambió durante la pasada) y la marca de la meta cubren lo mismo.
    # I5 (borrar el PUT incierto de otra cuenta) tampoco: al cambiar de cuenta el teléfono se aparta y la meta se reemplaza, así que la base de la cuenta que vuelve ya es nula con o sin ese recuerdo. Medidos en evidence/lhb-28-mutations-r15.txt: sobrevivieron con fail=0.
    ('R9 motor: una pasada reciente de otra cuenta vale', SY, "if(m&&a&&m.sub===a.sub&&m.at&&", "if(m&&a&&m.at&&"),
    ('R10 motor: las pestanas no comparten candado', SY, "r=await (D.lock?D.lock(once):once());", "r=await once();"),
    ('R11 juntar: las llaves heredadas cuentan como presentes', SY, "const inL=own(l,k),inR=own(r,k),inB=own(b,k);", "const inL=k in l,inR=k in r,inB=k in b;"),
    ('R12 juntar: una llave __proto__ cambia el prototipo', SY, "if(k==='__proto__')continue;", ""),
    ('R13 api: el Content-Length enorme se lee igual', API, "if (len > BODY_MAX) return json({ error: 'too-big' }, 413);", ""),
    ('R14 api: el cuerpo enorme se lee como JSON', API, "if (text.length > BODY_MAX) return json({ error: 'too-big' }, 413);", ""),
    ('R15 lib: los favoritos no tienen tope', LIB, "(!Array.isArray(b.doc.favs[k]) || b.doc.favs[k].length > LIST_MAX)", "(!Array.isArray(b.doc.favs[k]))"),
    ('R16 lib: los sellos no tienen tope', LIB, "Object.keys(b.doc.pasaporte[k]).length > LIST_MAX", "false"),
    ('R17 lib: las estrellas no tienen tope', LIB, "if (b.doc.ratings && Object.keys(b.doc.ratings).length > LIST_MAX)", "if (false)"),
    ('R18 lib: If-Match con comillas sin cerrar vale', LIB, r'''/^\s*(?:W\/)?(?:"(\d{1,9})"|(\d{1,9}))\s*$/''', r'''/^\s*(?:W\/)?"?(\d{1,9})"?\s*$/'''),
    ('R19 api: un fallo de D1 al revisar el perfil escapa como excepcion', API, "const gate = async (request, env) => { try { return await requireProfile(request, env); } catch (e) { return json({ error: 'unavailable' }, 503); } };", "const gate = (request, env) => requireProfile(request, env);"),
    ('R20 hoja: la sincronizacion lee la copia en memoria y no el almacenamiento', HO, "getDoc:()=>{ST=load();STRAW=localStorage.getItem(KEY);return ST},", "getDoc:()=>S(),"),
    ('R21 hoja: otra pestana que escribe no invalida la copia en memoria', HO, "window.addEventListener('storage',e=>{if(e.key===null||e.key===KEY)ST=null});", ""),
    ('R22 hoja: leer Mi Hoja no aparta antes lo de otra cuenta', HO, "const S=()=>{if(SYNC&&!SYNC.isolate())return DEF();if(ST&&localStorage.getItem(KEY)===STRAW)return ST;ST=load();STRAW=localStorage.getItem(KEY);return ST};", "const S=()=>ST||(ST=load());"),
    ('R23 hoja: una copia nueva o danada cuenta como cambio de la persona', HO, "write(s,true);return s}", "write(s);return s}"),
    ('R24 hoja: abrir Mi Hoja no aisla antes de pintar', HO, "SYNC.isolate();SYNC.run('mi-hoja'", "SYNC.run('mi-hoja'"),
    ('R25 hoja: write ignora quiet', HO, "if(SYNC&&!quiet)SYNC.changed(prev)", "if(SYNC)SYNC.changed(prev)"),
    ('R26 hoja: no se pasa el candado entre pestanas', HO, "lock:f=>navigator.locks&&navigator.locks.request?navigator.locks.request('lhb_mihoja_sync',f):f(),", ""),
    # Codex ronda 2
    ('N1 motor: escribir no anota la duena si aun no habia', SY, "ensureOwner();", ""),
    ('N2 motor: la meta de otra cuenta sirve de base', SY, "meta=meta0&&meta0.sub===uid?meta0:null;", "meta=meta0;"),
    ('N3 motor: lo que borra otra pestana no deja la marca de pendiente', SY, "const edited=edits!==e0||readSeq()!==s0||!quiet;", "const edited=edits!==e0;"),
    ('N4 motor: tras fallar la meta no se usa la base que la pestana recuerda', SY, ":memOk&&!wipe?mem.base:null;", ":null;"),
    ('N5 motor: aislar dentro de aislar no se corta', SY, "if(inIso)return true;", ""),
    ('N6 hoja: escribir sigue aunque no se pudo apartar lo de la otra cuenta', HO, "if(SYNC&&!SYNC.isolate()){ST=null;toast('No se pudo separar lo de la otra cuenta. Libera espacio y vuelve a entrar.');return false}", ""),
    ('N7 hoja: si no se pudo apartar, S muestra lo de la otra cuenta', HO, "if(SYNC&&!SYNC.isolate())return DEF();", "if(SYNC)SYNC.isolate();"),
    ('N9 motor: ensureOwner da por buena una dueña que no se pudo anotar', SY, "if(ownerOf()!==null)return true;return setOwner(acc.sub)};", "return true};"),
    ('N10 hoja: se guarda aunque no se pudo anotar la duena', HO, "if(SYNC&&!quiet&&!SYNC.ensureOwner()){ST=null;toast('No hay espacio para guardar. Exporta un respaldo.');return false}", ""),
    ('N11 hoja: S confia en la copia en memoria aunque el texto guardado cambio', HO, "if(ST&&localStorage.getItem(KEY)===STRAW)return ST;", "if(ST)return ST;"),
    ('N12 motor: la base recordada pisa una meta mas nueva de otra pestana', SY, "const memOk=staleBase&&!!mem&&mem.sub===uid&&!(meta&&meta.base&&meta.rev>mem.rev);", "const memOk=staleBase&&!!mem&&mem.sub===uid;"),
    ('N13 juntar: una llave __proto__ anidada desaparece al comparar', SY, "(Object.defineProperty(o,key,{value:x[key],enumerable:true,writable:true,configurable:true}),o)", "(o[key]=x[key],o)"),
    ('N14 hoja: una escritura rechazada deja la copia en memoria con el cambio rechazado', HO, "STRAW=txt}catch(e){ST=null;", "STRAW=txt}catch(e){"),
    ('N16 motor: un telefono vacio por perdida usa la base recordada y no trae la cuenta', SY, "memOk&&!wipe?mem.base:null;", "memOk?mem.base:null;"),
    ('N17 motor: tras fallar la meta no se tacha la base guardada', SY, "staleBase=true;poison();return {fail:'storage'}}", "staleBase=true;return {fail:'storage'}}"),
    ('N18 motor: una cata a medias no cuenta como algo que apartar', SY, "||(isObj(d)&&isObj(d.draft)&&Object.keys(d.draft).length>0)", ""),
    ('I1 motor: el PUT no se anota como incierto antes de mandarlo', SY, "    unk={sub:uid,rev};\n    let p;", "    let p;"),
    ('I2 motor: un 409 o un error claro no borra el PUT incierto (deshace borrados)', SY, "if(p.status===409||(p.status<500&&p.status!==200))unk=null;", ""),
    ('I3 motor: lo que cambio en la copia durante la pasada no deja la marca de pendiente', SY, "readSeq()!==s0||!quiet;", "readSeq()!==s0;"),
    ('I4 motor: un 200 con revision no borra el PUT incierto', SY, "    unk=null;newRev=p.body.rev;pushed=true}", "    newRev=p.body.rev;pushed=true}"),
    ('H2 motor: con un PUT sin respuesta siempre se descarta la base (deshace borrados)', SY, "rev>=unk.rev+2)voided=true", "rev>=unk.rev)voided=true"),
    ('H3 motor: aplicar se intenta una sola vez', SY, "for(let k=0;k<4;k++){", "for(let k=0;k<1;k++){"),
    ('H4 motor: la comparacion de aplicar usa canon (sin el borrador)', SY, "wrote=D.setDoc(full,stable(now0))", "wrote=D.setDoc(full,canon(Ln))"),
    ('H5 motor: tras aplicar no se limpia el PUT sin respuesta', SY, "voided=false;if(unk&&unk.sub===uid)unk=null;", "voided=false;"),
    ('H6 motor: lo leido de nuevo se junta con la base vieja en vez de con lo leido al inicio', SY, "final=quiet?merged:merge(L,Ln,merged);", "final=quiet?merged:merge(meta&&meta.base,Ln,merged);"),
    ('F1 motor: si lo subido no se pudo aplicar, la base recordada sigue valiendo', SY, "if(pushed){mem=null;voided=true;poison()}", "if(pushed){poison()}"),
    ('F2 motor: una pasada completa no devuelve la base (voided queda)', SY, "staleBase=false;voided=false;if(unk&&unk.sub===uid)unk=null;if(!edited)dirty=false;", "staleBase=false;if(unk&&unk.sub===uid)unk=null;if(!edited)dirty=false;"),
    ('F3 motor: la primera edicion no guarda la semilla', SY, "m.seed=std(p);ch=true", "ch=true"),
    ('F4 motor: sin base guardada no se usa la semilla', SY, "||(remote&&meta&&isObj(meta.seed)&&!wipe?meet(meta.seed,remote):null)", ""),
    ('F5 motor: una copia que cambio justo antes de aplicar se da por aplicada', SY, "if(wrote!=='stale')break}", "break}"),
    ('F6 motor: aplicar no pide que la copia siga igual a la leida', SY, "wrote=D.setDoc(full,stable(now0))", "wrote=D.setDoc(full)"),
    ('F7 motor: la semilla se reescribe en cada edicion', SY, "&&!m.base&&!m.seed&&prev!=null", "&&!m.base&&prev!=null"),
    ('F8 motor: meet no se cuida de la llave __proto__ en las estrellas', SY, "if(key!=='__proto__'&&own(y.ratings,key))", "if(own(y.ratings,key))"),
    ('F9 motor: sin meta de esta cuenta la edicion no la crea para la semilla', SY, "if(sub&&ownerOf()===sub&&(!m||m.sub!==sub)){m={sub,rev:0,base:null,at:null,dirty:false};ch=true}", ""),
    ('F10 hoja: aplicar no compara con lo leido', HO, "if(exp!==undefined&&LHB_MERGE.stable(load())!==exp)return 'stale';", ""),
    ('F11 hoja: write no guarda lo que habia antes', HO, "if(SYNC&&!quiet)prev=localStorage.getItem(KEY)", "if(SYNC&&!quiet)prev=null"),
    # conexion con la pagina
    ('W1 hoja: escribir Mi Hoja no avisa al motor', HO, "if(SYNC&&!quiet)SYNC.changed(prev);", ""),
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
    ('W13 cache: el shell se publica con la version de antes', SW, "const VERSION='lhb-v65';", "const VERSION='lhb-v64';"),
    ('W14 hoja: api no manda las cabeceras de mas', HO, ",...(extra||{})}", "}"),
    ('W15 hoja: lo que llega no se guarda por write', HO, "ST=normalize(d);return write(ST)}", "ST=normalize(d);return true}"),
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
