/* La Hoja Boricua · Mi Hoja entre teléfonos (LHB-28 y LHB-31).
   Sin DOM ni red propios: todo entra por D, así que se prueba con un servidor de mentira o con el de verdad sobre SQLite.
   Dos piezas:
   - LHB_MERGE.merge(base, local, remote, {prefer}): junta dos copias de Mi Hoja con una tercera, la que las dos tenían la última vez que se sincronizaron (base). Es la misma regla para importar un respaldo (base vacía,
     prefer 'local'), para llevar lo de este teléfono a la cuenta al entrar por primera vez y para juntar dos teléfonos. Nunca pierde algo que solo uno cambió; si uno lo borró y el otro no lo tocó, se borra;
     si uno lo borró y el otro lo editó, queda lo editado. Si los dos cambiaron lo mismo, gana lo más nuevo (actualizado o fecha) y, si empatan, un desempate que no depende de qué teléfono juntó:
     así los dos llegan al mismo resultado y no se mandan cambios uno al otro para siempre.
   - LHB_SYNC(D): lleva Mi Hoja a la cuenta (GET y PUT /api/mihoja con If-Match). Un 409 trae la copia de ahora: se junta y se reintenta. Sin conexión no pasa nada: queda pendiente y sigue al volver. */
(function(){'use strict';
/* lo que es solo de este teléfono y no viaja a la cuenta */
const LOCAL_ONLY=['draft','cambios','respaldo','recordarDespues','migrado','sync'];
const KINDS=['artesanos','cigarros','lugares'];
const isObj=o=>o!==null&&typeof o==='object'&&!Array.isArray(o);
/* JSON con las llaves en orden: dos valores iguales dan el mismo texto */
const stable=v=>JSON.stringify(v,(k,x)=>isObj(x)?Object.keys(x).sort().reduce((o,key)=>(Object.defineProperty(o,key,{value:x[key],enumerable:true,writable:true,configurable:true}),o),{}):x);
const same=(a,b)=>stable(a)===stable(b);
const clone=v=>v===undefined?undefined:JSON.parse(JSON.stringify(v));
/* la copia que viaja: sin lo del teléfono y con todas las partes en su lugar */
function std(doc){const d=isObj(doc)?clone(doc):{};for(const k of LOCAL_ONLY)delete d[k];
 if(typeof d.schema!=='number')d.schema=1;if(typeof d.creado!=='string')d.creado='';
 for(const k of ['humidor','diario'])d[k]=(Array.isArray(d[k])?d[k]:[]).filter(x=>isObj(x)&&typeof x.id==='string'&&x.id);
 d.pasaporte=isObj(d.pasaporte)?d.pasaporte:{};d.favs=isObj(d.favs)?d.favs:{};
 for(const k of KINDS){d.pasaporte[k]=isObj(d.pasaporte[k])?d.pasaporte[k]:{};d.favs[k]=(Array.isArray(d.favs[k])?d.favs[k]:[]).filter(x=>typeof x==='string')}
 d.ratings=isObj(d.ratings)?d.ratings:{};return d}
const strip=doc=>std(doc);
/* para comparar dos copias sin que importe el orden de las listas */
function canon(doc){const d=std(doc);for(const k of ['humidor','diario'])d[k].sort((a,b)=>a.id<b.id?-1:a.id>b.id?1:0);for(const k of KINDS)d.favs[k].sort();return stable(d)}
const stamp=x=>String(x.actualizado||x.fecha||'');
/* registros con id (humidor, diario) */
function mergeList(b,l,r,prefer,front){const B=new Map(b.map(x=>[x.id,x])),L=new Map(l.map(x=>[x.id,x])),R=new Map(r.map(x=>[x.id,x])),out=[];
 const fromR=r.filter(x=>!L.has(x.id)),ids=[...new Set(front?[...fromR.map(x=>x.id),...l.map(x=>x.id)]:[...l.map(x=>x.id),...fromR.map(x=>x.id)])];
 for(const id of ids){const x=L.get(id),y=R.get(id),o=B.get(id);let v;
  if(x&&y){
   if(same(x,y))v=x;
   else if(o&&same(x,o))v=y;            /* solo el otro lo cambió */
   else if(o&&same(y,o))v=x;            /* solo este lo cambió */
   else{const sx=stamp(x),sy=stamp(y);v=sx>sy?x:sy>sx?y:prefer==='local'?x:stable(x)>=stable(y)?x:y}}
  else if(x)v=o&&same(x,o)?null:x;      /* el otro lo borró: se va si aquí no lo tocaron */
  else v=o&&same(y,o)?null:y;           /* este lo borró: se va si allá no lo tocaron */
  if(v)out.push(clone(v))}
 return out}
/* listas de textos sin repetir (favoritos) */
function mergeSet(b,l,r){const B=new Set(b),Lset=new Set(l),Rset=new Set(r),out=[];
 for(const x of [...l,...r]){if(out.includes(x))continue;const inL=Lset.has(x),inR=Rset.has(x),inB=B.has(x);
  if(inL&&inR)out.push(x);else if(!inB)out.push(x)}   /* en la base y en uno solo: lo quitó el otro */
 return out}
/* mapas (pasaporte: id → fecha; estrellas: id → número). Si los dos cambiaron la misma llave: prefer 'local' gana lo de aquí; si no, el desempate fijo (la fecha más antigua; el valor mayor) */
const own=(o,k)=>Object.prototype.hasOwnProperty.call(o,k);
function mergeMap(b,l,r,prefer,min){const out={};
 for(const k of new Set([...Object.keys(l),...Object.keys(r)])){if(k==='__proto__')continue;const inL=own(l,k),inR=own(r,k),inB=own(b,k);
  if(inL&&inR){const x=l[k],y=r[k];
   out[k]=clone(same(x,y)?x:inB&&same(x,b[k])?y:inB&&same(y,b[k])?x:prefer==='local'?x:min?(String(x)<=String(y)?x:y):(stable(x)>=stable(y)?x:y))}
  else if(inL){if(!inB||!same(l[k],b[k]))out[k]=clone(l[k])}
  else if(!inB||!same(r[k],b[k]))out[k]=clone(r[k])}
 return out}
const KNOWN=['schema','creado','humidor','diario','pasaporte','favs','ratings'];
const extras=d=>{const o={};for(const k of Object.keys(d))if(!KNOWN.includes(k))o[k]=d[k];return o};
/* lo que las dos copias tenían: es la base cuando no hay una guardada pero se sabe cómo estaba este teléfono antes de su primera edición (la semilla). Lo que la persona quitó de lo que estaba en las dos es un borrado suyo; lo que estaba en una sola es algo agregado */
function meet(a,b){const x=std(a),y=std(b),out={schema:x.schema,creado:x.creado,humidor:[],diario:[],pasaporte:{},favs:{},ratings:{}};
 for(const k of ['humidor','diario']){const ids=new Set(y[k].map(r=>r.id));out[k]=x[k].filter(r=>ids.has(r.id)).map(clone)}
 for(const k of KINDS){out.pasaporte[k]={};for(const key of Object.keys(x.pasaporte[k]))if(key!=='__proto__'&&own(y.pasaporte[k],key))out.pasaporte[k][key]=clone(x.pasaporte[k][key]);const f=new Set(y.favs[k]);out.favs[k]=x.favs[k].filter(v=>f.has(v))}
 for(const key of Object.keys(x.ratings))if(key!=='__proto__'&&own(y.ratings,key))out.ratings[key]=clone(x.ratings[key]);
 return out}
function merge(base,local,remote,o){const prefer=o&&o.prefer,b=std(base),l=std(local),r=std(remote),out={};
 out.schema=Math.max(l.schema,r.schema);
 out.creado=[l.creado,r.creado].filter(Boolean).sort()[0]||'';
 out.humidor=mergeList(b.humidor,l.humidor,r.humidor,prefer,prefer!=='local');
 out.diario=mergeList(b.diario,l.diario,r.diario,prefer,false).sort((x,y)=>String(y.fecha||'').localeCompare(String(x.fecha||'')));
 out.pasaporte={};out.favs={};
 for(const k of KINDS){out.pasaporte[k]=mergeMap(b.pasaporte[k],l.pasaporte[k],r.pasaporte[k],prefer,true);out.favs[k]=mergeSet(b.favs[k],l.favs[k],r.favs[k])}
 out.ratings=mergeMap(b.ratings,l.ratings,r.ratings,prefer,false);
 Object.assign(out,mergeMap(extras(b),extras(l),extras(r),prefer,false));
 return out}
const hasData=d=>{d=std(d);return d.humidor.length+d.diario.length+KINDS.reduce((n,k)=>n+Object.keys(d.pasaporte[k]).length+d.favs[k].length,0)+Object.keys(d.ratings).length>0};
window.LHB_MERGE={merge,strip,canon,same,stable,hasData,meet,LOCAL_ONLY};

/* ---------- el motor ---------- */
const META='lhb_mihoja_v1_sync',OWNER='lhb_mihoja_v1_owner',SEQ='lhb_mihoja_v1_seq',KEY='lhb_mihoja_v1';
/* LHB-34 (Codex r3): la valla de salir. Mientras está puesta (y es de hace menos de FENCE_TTL), nadie escribe Mi Hoja ni su sincronización, ni esta pestaña ni otra.
   forget la pone, espera FENCE_MS (lo que tarda en verse en las otras pestañas), revisa otra vez y borra. Caduca sola si la pestaña que sale se cierra a medias */
const FENCE='lhb_mihoja_v1_saliendo',FENCE_MS=1000,FENCE_TTL=10e3;
const DEBOUNCE=2500,RETRY=[20e3,40e3,80e3,160e3,300e3],TRIES=4;
window.LHB_SYNC=function(D){
 let busy=null,again=false,timer=0,retryT=0,fails=0,applying=false,edits=0,dirty=false,staleBase=false,voided=false,unk=null,mem=null,held=false,state={state:'idle',err:null};
 const readMeta=()=>{try{const m=JSON.parse(D.ls.get(META));return isObj(m)&&typeof m.sub==='string'?m:null}catch(e){return null}};
 /* Codex r4: un reloj que se atrasa no hace eterna la valla; uno que se adelanta en medio de la espera lo cubre forget, que la vuelve a poner antes de revisar */
 const fenced=()=>{let t=0;try{t=parseInt(D.ls.get(FENCE),10)}catch(e){}const d=D.nowMs()-t;return t>0&&d<FENCE_TTL&&d>-FENCE_TTL};
 /* Codex r6: salir la renueva mientras Clerk cierra la sesión, para que nadie escriba entre el borrado y la salida aunque Clerk tarde más que FENCE_TTL */
 const fenceUp=()=>{try{D.ls.set(FENCE,String(D.nowMs()))}catch(e){}};
 const writeMeta=m=>{if(fenced())return false;try{D.ls.set(META,JSON.stringify(m));return true}catch(e){return false}};
 /* un contador chico compartido entre pestañas: cada escritura de la persona lo sube, y una pasada sabe si alguien escribió (aquí o en otra pestaña) mientras esperaba la red */
 const readSeq=()=>{try{const n=parseInt(D.ls.get(SEQ),10);return n>0?n:0}catch(e){return 0}};
 const bumpSeq=()=>{if(fenced())return;try{D.ls.set(SEQ,String(readSeq()+1))}catch(e){}};
 const keep=d=>{const o={};for(const k of LOCAL_ONLY)if(d&&d[k]!==undefined)o[k]=d[k];return o};
 const set=(s,err)=>{state={state:s,err:err||null};if(D.onState){try{D.onState(state)}catch(e){}}};
 const parkKey=sub=>KEY+'_de_'+String(sub).replace(/[^A-Za-z0-9_-]/g,'_').slice(0,60);
 /* de quién es lo guardado en este teléfono: una llave aparte y chica, para saberlo sin leer la copia completa */
 const ownerOf=()=>{let o=null;try{o=D.ls.get(OWNER)}catch(e){}if(typeof o==='string'&&o)return o;const m=readMeta();return m?m.sub:null};
 const setOwner=uid=>{if(fenced())return false;try{D.ls.set(OWNER,uid);const m=readMeta();if(!m||m.sub!==uid)D.ls.set(META,JSON.stringify({sub:uid,rev:0,base:null,at:null,dirty:false}));return true}catch(e){return false}};
 /* antes de guardar lo que escribe la persona hay que poder anotar de quién es; si no se puede, no se guarda */
 const ensureOwner=()=>{const acc=D.acct();if(!acc||typeof acc.sub!=='string'||!acc.sub)return true;if(ownerOf()!==null)return true;return setOwner(acc.sub)};
 const freeKey=old=>{const b=parkKey(old);for(let i=0;i<10;i++){const k=i?b+'_'+(i+1):b;let v=null;try{v=D.ls.get(k)}catch(e){return null}if(v===null)return k}return null};
 /* se aparta si tiene datos o un borrador sin terminar (la cata a medias es de quien la escribía); una copia que no se puede leer también */
 const rawHasData=raw=>{try{const d=JSON.parse(raw);return hasData(d)||(isObj(d)&&isObj(d.draft)&&Object.keys(d.draft).length>0)}catch(e){return true}};
 /* Lo guardado era de otra cuenta: se aparta en una llave libre (nunca sobre otra copia apartada), Mi Hoja queda vacía y la dueña pasa a ser la nueva. Es síncrono: se llama antes de leer o escribir Mi Hoja, sin esperar a la red */
 let inIso=false;
 function isolate(){if(inIso)return true;const acc=D.acct();if(!acc||typeof acc.sub!=='string'||!acc.sub)return true;
  const old=ownerOf();if(old===null||old===acc.sub)return true;
  inIso=true;try{
   let raw=null;try{raw=D.ls.get(KEY)}catch(e){}
   if(raw!=null&&rawHasData(raw)){const k=freeKey(old);if(!k)return false;try{D.ls.set(k,raw)}catch(e){return false}}
   applying=true;let ok;try{ok=D.setDoc({})}finally{applying=false}
   return !!ok&&setOwner(acc.sub)}finally{inIso=false}}
 /* una pasada: trae, junta, lleva y aplica. Devuelve { ok }, { skip } o { fail } */
 async function once(){
  const acc=D.acct();if(!acc||typeof acc.sub!=='string'||!acc.sub)return {skip:'signed-out'};
  let C;try{C=await D.clerk()}catch(e){return {skip:'offline'}}
  if(!C||!C.user||C.user.id!==acc.sub)return {skip:'other-account'};
  const uid=acc.sub;
  if(!isolate())return {fail:'park'};
  /* de quién es lo guardado se anota antes de tocar la red: si esta primera pasada falla y luego entra otra cuenta, lo de esta no se sube a la otra */
  if(ownerOf()===null&&!setOwner(uid))return {fail:'storage'};
  const alive=()=>{const a=D.acct();return !!a&&a.sub===uid&&ownerOf()===uid};
  /* la meta de otra cuenta no sirve de base: si la dueña y la meta no coinciden, se junta sin dar nada por borrado */
  const meta0=readMeta(),meta=meta0&&meta0.sub===uid?meta0:null;
  const first=!meta||!meta.at;
  /* si lo subido no se pudo anotar o aplicar aquí, se tacha la base guardada con una meta mínima (cabe aunque el almacenamiento esté lleno): tras recargar la página se junta sin dar nada por borrado */
  const poison=()=>writeMeta({sub:uid,rev:0,base:null,at:(meta&&meta.at)||null,dirty:true});
  for(let i=0;i<TRIES;i++){
   const e0=edits,s0=readSeq(),local0=D.getDoc(),L=std(local0);
   let g;try{g=await D.api(C,'GET','/api/mihoja',null,uid)}catch(e){return {skip:'offline'}}
   if(!alive())return {skip:'other-account'};
   if(g.status!==200||!isObj(g.body)||!Number.isInteger(g.body.rev))return {fail:'get-'+g.status};
   if(g.body.rev>0&&(!isObj(g.body.doc)||!(g.body.schema<=1)))return {fail:'schema'};
   const rev=g.body.rev,remote=rev>0?g.body.doc:null;
   /* un PUT sin respuesta pudo o no llegar: si desde entonces la cuenta subió dos o más veces, no se sabe si la primera fue la nuestra y la base guardada no sirve (se junta sin dar nada por borrado hasta terminar una pasada completa) */
   if(unk&&unk.sub===uid&&rev>=unk.rev+2)voided=true;
   /* si este teléfono se quedó sin nada, lo último sincronizado tenía algo y nadie escribió desde entonces, lo vacío no es un borrado de la persona sino una pérdida (copia dañada o quitada): no se borra la cuenta, se trae.
      Si la persona sí escribió (borró la última entrada), changed() lo marcó y el borrado se sincroniza */
   const wipe=meta&&meta.base&&hasData(meta.base)&&!hasData(L)&&!dirty&&!meta.dirty;
   /* si la meta no se pudo anotar la vez pasada, vale lo que esta pestaña recuerda de esa pasada (si ya no lo recuerda, se junta sin dar nada por borrado) */
   /* ...salvo que otra pestaña ya anotó una meta más nueva que la de esa pasada: esa base es la buena */
   const memOk=staleBase&&!!mem&&mem.sub===uid&&!(meta&&meta.base&&meta.rev>mem.rev);
   /* si lo subido no se pudo aplicar aquí, ninguna base recordada ni guardada vale hasta que una pasada termine completa (voided): se junta sin dar nada por borrado */
   /* sin base guardada, la semilla (cómo estaba este teléfono antes de la primera edición de la persona) da una: lo que quitó de lo que estaba también en la cuenta es borrado suyo */
   const base0=meta&&meta.base&&!wipe&&(!staleBase||!memOk)?meta.base:memOk&&!wipe?mem.base:null;
   const base=voided?null:base0||(remote&&meta&&isObj(meta.seed)&&!wipe?meet(meta.seed,remote):null);
   const merged=remote?merge(base,L,remote):L;
   let newRev=rev,pushed=false;
   if(!remote||canon(merged)!==canon(remote)){
    /* se anota antes de mandar: si la respuesta no llega, no se puede leer, o la cuenta cambia mientras tanto, el PUT pudo haber llegado. Solo una respuesta clara (409, otro error 4xx o un 200 con revisión) lo borra */
    unk={sub:uid,rev};
    let p;try{p=await D.api(C,'PUT','/api/mihoja',{schema:1,doc:merged},uid,{'If-Match':String(rev)})}catch(e){return {skip:'offline'}}
    if(p.status===409||(p.status<500&&p.status!==200))unk=null;
    if(!alive())return {skip:'other-account'};
    if(p.status===409)continue;
    if(p.status!==200||!isObj(p.body)||!Number.isInteger(p.body.rev))return {fail:'put-'+p.status};
    unk=null;newRev=p.body.rev;pushed=true}
   /* lo que cambió aquí mientras tanto se junta con el resultado, en vez de pisarse. Si otra pestaña guarda entre la lectura y la escritura (setDoc lo rechaza con 'stale'), se vuelve a leer y a juntar con lo mismo, sin repetir la pasada */
   let now0,Ln,quiet,final,wrote=true;
   for(let k=0;k<4;k++){
    now0=D.getDoc();Ln=std(now0);quiet=canon(Ln)===canon(L);
    final=quiet?merged:merge(L,Ln,merged);
    const full={...final,...keep(now0)};
    if(!alive())return {skip:'other-account'};
    wrote=true;
    if(canon(full)!==canon(Ln)){applying=true;try{wrote=D.setDoc(full,stable(now0))}finally{applying=false}}
    if(wrote!=='stale')break}
   if(!wrote||wrote==='stale'){if(pushed){mem=null;voided=true;poison()}return {fail:wrote?'conflict':'storage'}}
   /* si no se puede anotar lo sincronizado, la próxima pasada no se fía de la base vieja (junta sin dar nada por borrado) */
   /* lo que se editó mientras tanto, en esta pestaña o en otra, deja la marca de pendiente */
   /* ...y lo que cambió en la copia mientras tanto (aunque el contador compartido no se haya podido escribir) */
   const edited=edits!==e0||readSeq()!==s0||!quiet;
   mem={sub:uid,base:merged,rev:newRev};
   if(!writeMeta({sub:uid,rev:newRev,base:merged,at:D.now(),dirty:edited})){staleBase=true;poison();return {fail:'storage'}}
   staleBase=false;voided=false;if(unk&&unk.sub===uid)unk=null;if(!edited)dirty=false;
   if(!quiet&&canon(final)!==canon(merged))again=true;
   const pulled=!!remote&&canon(merged)!==canon(L);
   if(first&&hasData(L))D.toast('Tu Mi Hoja de este teléfono ya está en tu cuenta ✓');
   if(pulled&&D.onApplied)D.onApplied({pulled:true});
   return {ok:true,pushed,pulled,rev:newRev}}
  return {fail:'conflict'}}
 function schedule(ms,fn){if(timer)D.clearTimer(timer);timer=D.setTimer(()=>{timer=0;fn()},ms)}
 function retryLater(){if(retryT)D.clearTimer(retryT);const ms=RETRY[Math.min(fails,RETRY.length)-1]||RETRY[RETRY.length-1];retryT=D.setTimer(()=>{retryT=0;run('reintento')},ms)}
 /* una sola pasada a la vez; lo que se pide durante una pasada se atiende al terminar */
 function run(why,o){o=o||{};
  if(held)return Promise.resolve({skip:'held'});
  if(o.minAge){const m=readMeta(),a=D.acct();if(m&&a&&m.sub===a.sub&&m.at&&D.nowMs()-new Date(m.at).getTime()<o.minAge)return Promise.resolve({skip:'reciente'})}
  if(busy){again=true;return busy}
  busy=(async()=>{let r;try{
    for(let n=0;n<3;n++){again=false;set('syncing');r=await (D.lock?D.lock(once):once());if(!(r.ok&&again))break}
    if(r.ok){fails=0;set('ok');if(retryT){D.clearTimer(retryT);retryT=0}if(again){again=false;schedule(DEBOUNCE,()=>run('pendiente'))}}
    else if(r.skip==='signed-out'||r.skip==='other-account'){set('off')}
    else{fails++;set(r.skip==='offline'?'offline':'error',r.fail||r.skip);retryLater()}
    return r}
   catch(e){fails++;set('error','boom');retryLater();return {fail:'boom'}}
   finally{busy=null}})();
  return busy}
 /* Mi Hoja se escribió: si lo que viaja cambió respecto a lo último sincronizado, se sincroniza tras una pausa corta */
 function changed(prev){if(applying)return;
  edits++;dirty=true;bumpSeq();
  /* lo escrito pertenece a quien lo escribió, aunque la cuenta cambie antes de la primera pasada */
  ensureOwner();
  /* sin base guardada, lo que había en este teléfono antes de esta primera edición queda como semilla (meta.seed) para la primera pasada */
  {const acc=D.acct(),sub=acc&&typeof acc.sub==='string'?acc.sub:'';let m=readMeta(),ch=false;
   if(sub&&ownerOf()===sub&&(!m||m.sub!==sub)){m={sub,rev:0,base:null,at:null,dirty:false};ch=true}
   if(m){if(!m.dirty){m.dirty=true;ch=true}
    if(sub&&m.sub===sub&&!m.base&&!m.seed&&prev!=null){try{const p=JSON.parse(prev);if(isObj(p)){m.seed=std(p);ch=true}}catch(e){}}
    if(ch)writeMeta(m)}}
  schedule(DEBOUNCE,()=>{const acc=D.acct();if(!acc)return;const m=readMeta();
   if(m&&m.sub===acc.sub&&m.base&&canon(D.getDoc())===canon(m.base)){dirty=false;if(m.dirty){delete m.dirty;writeMeta(m)}return}   /* volvió a ser igual: no hay nada que llevar */
   run('guardado')})}
 /* LHB-34: ¿la cuenta tiene lo último de este teléfono? Una pasada, y sí solo si terminó bien, no queda nada pendiente y la copia es igual a lo sincronizado.
    o.backup: el canon de un respaldo que la persona acaba de descargar; si la copia de ahora es esa, está a salvo en el archivo aunque no haya red.
    Una cata a medias no viaja ni va en el respaldo: con una, no. Devuelve { ok, via, mark } o { ok: false, why }.
    mark es la copia tal como se revisó (el texto guardado y el contador compartido): forget(mark) solo borra si nadie escribió desde entonces, aquí o en otra pestaña */
 async function settled(o){o=o||{};let r;try{r=await run('salir')}catch(e){r={fail:'boom'}}
  /* Codex r2: la marca se lee ANTES que la copia que se revisa (el contador y el texto guardado, luego la copia): si otra pestaña escribe en medio, la marca ya no es la de ahora y forget no borra nada */
  const seq=readSeq(),raw=markNow().raw,d=D.getDoc(),mark={raw,seq};
  if(isObj(d)&&isObj(d.draft)&&Object.keys(d.draft).length)return {ok:false,why:'draft'};
  if(typeof o.backup==='string'&&canon(d)===o.backup)return {ok:true,via:'backup',mark};
  if(!r||!r.ok)return {ok:false,why:(r&&(r.fail||r.skip))||'fail'};
  const m=readMeta(),acc=D.acct();
  if(dirty||!m||!acc||m.sub!==acc.sub||m.dirty||!m.base||canon(d)!==canon(m.base))return {ok:false,why:'pending'};
  return {ok:true,via:'sync',mark}}
 const markNow=()=>{let raw=null;try{raw=D.ls.get(KEY)}catch(e){raw={}}return {raw,seq:readSeq()}};
 /* LHB-34: mientras se sale o se borra la cuenta no corre ninguna pasada (una a destiempo volvería a llevar Mi Hoja a la cuenta). hold(true) espera la que esté corriendo */
 function hold(on){held=!!on;if(on){if(timer){D.clearTimer(timer);timer=0}if(retryT){D.clearTimer(retryT);retryT=0}}return held&&busy?busy.then(()=>{},()=>{}):Promise.resolve()}
 /* LHB-34: se borra Mi Hoja de este teléfono y lo que se sabía de su sincronización (al salir o al borrar la cuenta). Las copias apartadas de otras cuentas se quedan.
    Con mark (de settled), solo si la copia sigue igual que cuando se revisó; si no, no toca nada y devuelve false.
    Codex r3: otra pestaña puede escribir entre la última revisión y el borrado, así que con mark primero se pone la valla (nadie escribe), se espera a que
    las otras pestañas la vean y se revisa otra vez; lo que alguien alcanzó a escribir antes de verla cambia la marca y no se borra nada.
    La valla se queda puesta hasta que caduca: una pestaña que todavía no se enteró de la salida no vuelve a escribir la copia vieja */
 const same=mark=>{const now=markNow();return now.raw===mark.raw&&now.seq===mark.seq};
 async function forget(mark){
  if(mark){if(!same(mark))return false;
   /* tampoco corre una pasada de esta pestaña mientras tanto; si no se borra, vuelve */
   await hold(true);
   const back=()=>{try{D.ls.remove(FENCE)}catch(e){}hold(false);return false};
   try{D.ls.set(FENCE,String(D.nowMs()))}catch(e){return back()}
   await D.wait(FENCE_MS);
   try{D.ls.set(FENCE,String(D.nowMs()))}catch(e){return back()}
   if(!same(mark))return back()}
  hold(true);mem=null;unk=null;dirty=false;let ok=true;
  for(const k of [KEY,META,OWNER,SEQ]){try{D.ls.remove(k)}catch(e){ok=false}}
  set('off');return ok}
 function start(){
  D.listen('online',()=>run('en-linea'));
  D.listen('visible',()=>run('visible',{minAge:30e3}));
  if(D.acct())D.setTimer(()=>run('abrir'),1500)}
 return {run,changed,start,isolate,ensureOwner,settled,hold,forget,fenced,fenceUp,status:()=>({...state,at:(readMeta()||{}).at||null}),once,_busy:()=>!!busy}};
})();
