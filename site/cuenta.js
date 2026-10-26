/* La Hoja Boricua · cuenta (LHB-25): quién puede abrir Mi Hoja y qué pasa al entrar.
   Sin DOM ni red propios: todo entra por D, así que se prueba con una Clerk de mentira.
   Reglas:
   - Un 401 o 403 de /api/me cierra la puerta; el perfil guardado solo abre si no hay conexión o el servidor falla (0 o 5xx), y solo para el mismo usuario.
   - Cada respuesta pendiente se amarra al usuario, a la pantalla y a la operación que la pidió; si algo cambió, se ignora.
   - Entrar desde cualquier página deja la página como está, y al terminar se hace la acción que el usuario empezó. */
window.LHB_CUENTA=function(D){'use strict';
const ACT=Object.create(null);let seq=0,hooked=false,lastId=null,pending=null,ob=false,failure=null;
/* lo guardado para volver de Google: la acción y, si hubo varios toques mientras cargaba Clerk, las anteriores; solo acciones registradas y argumentos de texto */
const cleanList=(l,n=9)=>(Array.isArray(l)?l:[]).filter(m=>m&&typeof m.act==='string'&&typeof ACT[m.act]==='function').slice(0,n).map(m=>typeof m.arg==='string'?{act:m.act,arg:m.arg}:{act:m.act});
const intentOf=(from,o)=>{const v={from,act:o.act};if(typeof o.arg==='string')v.arg=o.arg;if(typeof o.uid==='string')v.uid=o.uid;const more=cleanList(o.more);if(more.length)v.more=more;return v};
/* una acción que falla no detiene a las demás */
const safe=f=>{try{f()}catch(e){if(typeof console!=='undefined')console.error(e)}};
const live=(op,from,C,uid)=>op===seq&&D.here()===from&&(uid===undefined||(!!C.user&&C.user.id===uid));
/* misma lectura del hash que el router de app.js: #/mihoja, #mihoja, #/perfil/x, #perfil; también las páginas que escriben datos de la cuenta (#/cata y #/subir): al cambiar la cuenta se vuelven a pasar por la puerta */
/* el perfil guardado es solo para abrir sin conexión: si el teléfono no lo deja guardar (almacenamiento lleno), entrar y crear el perfil igual funcionan */
const cache=v=>{try{D.store.set(v)}catch(e){}};
const onMiHoja=()=>{const r=D.here().replace(/^#\/?/,'').split('/')[0];return r==='mihoja'||r==='perfil'||r==='cata'||r==='subir'};
function hook(C){if(hooked)return;hooked=true;lastId=C.user?C.user.id:null;
 C.addListener(({user})=>{const id=user?user.id:null;if(id===lastId)return;if(lastId!==null)pool=pool.filter(i=>i.uid!==null);lastId=id;seq++;gen++;D.ui.closeAll();
  if(!id){D.store.clear();D.intent.clear()}
  const p=pending;pending=null;const fl=failure;failure=null;
  if(id&&p&&p.from===D.here()){go(p.go,{...p.o,resume:true});return}
  if(onMiHoja()||ob){ob=false;D.reroute()}
  /* el aviso de error pedía salir y volver a entrar: al salir, la hoja se cierra con todo y su botón; se deja un botón nuevo para entrar y seguir con la acción */
  if(!id&&fl&&fl.from===D.here())D.ui.notice('Entra otra vez','Tu acción quedó pendiente. Entra para continuar.',{label:'Entrar',on:()=>go(fl.done,{...fl.o,resume:false})})})}
async function go(done,o){o=o||{};const from=D.here(),op=++seq;ob=false;failure=null;const show=(h,p,b)=>{if(!o.inPlace&&op===seq)D.ui.card(h,p,b)};
 /* un error nunca se esconde: sobre la página (en sitio) o en la tarjeta de Mi Hoja, siempre con reintento que conserva la acción */
 const fail=(h,p)=>{if(op!==seq)return;const b={label:'Intentar otra vez',on:()=>go(done,{...o,resume:false})};if(o.inPlace){failure={done,o,from};D.ui.notice(h,p,b)}else D.ui.card(h,p,b)};
 show('Un momento…','Revisando tu cuenta.');
 let C;
 try{C=await D.clerk()}catch(e){
  if(op!==seq||D.here()!==from)return;
  if(D.store.get()){D.intent.clear();return done()}
  fail('Necesitas conexión','Para entrar a Mi Hoja la primera vez necesitas conexión a internet.');return}
 hook(C);
 if(!live(op,from,C))return;
 /* una acción en sitio (corazón, sello, estrella) no espera a la red: con sesión abierta y el perfil de ese mismo usuario guardado, se hace al instante */
 if(o.fast&&C.user){const c0=D.store.get();if(c0&&c0.sub===C.user.id){D.intent.clear();return done()}}
 if(!C.user){D.store.clear();
  if(o.resume){D.intent.clear();return}
  pending={go:done,o,from};if(o.act)D.intent.set(intentOf(from,o));
  const open=()=>D.openSignIn(C);
  show('Entra para usar Mi Hoja','Tu humidor, tu diario, tu pasaporte y tus favoritos quedan con tu cuenta. El catálogo, los artesanos y los lugares siguen abiertos sin cuenta.',{label:'Entrar o crear cuenta',on:open});
  open();return}
 const uid=C.user.id;let r;
 try{r=await D.api(C,'GET','/api/me',null,uid)}catch(e){r={status:0,body:{}}}
 if(!live(op,from,C,uid))return;
 if(r.status===200&&r.body.profile){cache({sub:uid,handle:r.body.profile.handle});D.intent.clear();return done()}
 if(r.status===200&&r.body.needsProfile)return onboard(C,done,o,op,from,uid);
 if(r.status===401||r.status===403){D.store.clear();fail('No pudimos revisar tu cuenta','Cierra la sesión y entra otra vez.');return}
 const c=D.store.get();
 if(c&&c.sub===uid&&(r.status===0||r.status>=500)){D.intent.clear();return done()}
 fail('No pudimos revisar tu cuenta','Intenta otra vez en un momento.')}
function onboard(C,done,o,op,from,uid){ob=true;
 D.ui.onboarding(async f=>{
  /* el formulario puede seguir en pantalla después de un cambio de cuenta: no se manda nada a nombre de otra persona */
  if(!live(op,from,C,uid))return {stale:true};
  let r;try{r=await D.api(C,'POST','/api/profile',{...f,age_ok:true},uid)}catch(e){r={status:0,body:{}}}
  const same=!!C.user&&C.user.id===uid;
  if(r.status===201){if(same)cache({sub:uid,handle:r.body.profile.handle});
   if(!live(op,from,C,uid))return {stale:true};
   ob=false;D.intent.clear();D.ui.toast('¡Bienvenido a Mi Hoja!');if(o.inPlace)D.reroute();done();return {ok:true}}
  if(!live(op,from,C,uid))return {stale:true};
  /* la respuesta se perdió pero el perfil sí se creó: se revisa de nuevo dentro de este mismo envío y, si sale bien, se termina igual que con un 201.
     Si la revisión falla, el formulario sigue vivo para reintentar; no se anuncia éxito antes de tiempo. */
  if(r.body.error==='profile-exists'){
   let m;try{m=await D.api(C,'GET','/api/me',null,uid)}catch(e){m={status:0,body:{}}}
   if(!live(op,from,C,uid))return {stale:true};
   if(m.status===200&&m.body.profile){cache({sub:uid,handle:m.body.profile.handle});ob=false;D.intent.clear();D.ui.toast('¡Bienvenido a Mi Hoja!');if(o.inPlace)D.reroute();done();return {ok:true}}
   return {error:'recheck'}}
  return {error:r.body.error||'generic'}})}
/* acción en sitio (corazón, sello, estrella, humidor): no usa la cuenta atrás de go(), así que varios toques seguidos no se cancelan entre sí.
   Todas las acciones que esperan (la revisión compartida, la hoja de entrar, un reintento) viven en una sola lista (pool); cuando algo pasa por go(), lo que corre
   al terminar es la lista entera de esa persona y esa página, así que da igual cuál go() sea el último. Cada una conserva a su dueño:
   - con sesión y el perfil guardado de esa misma persona: al instante;
   - sin perfil guardado: todas esperan una sola revisión compartida (warm); si sale bien corren todas (aunque el teléfono no deje guardar el perfil); si sale mal
     pasan por go() juntas (aviso, creación del perfil, reintento);
   - sin sesión: los toques hechos mientras Clerk carga forman un lote (hasta diez, los mismos diez que viajan en lo guardado): una sola hoja de entrar y al entrar corren
     todos, también al volver de Google. Un lote al que ya se le mostró la hoja y se dejó sin entrar no se mezcla con el toque siguiente.
   gen cuenta los cambios de cuenta y no lo mueven los toques: si cambia mientras se espera, esa acción se descarta; si la página cambia, también. Una acción
   restaurada trae su dueño (uid): si quien está es otra persona, se descarta y se borra lo guardado. Lo que lleva más de dos minutos esperando se descarta. */
let gen=0,warming=null,pool=[];
/* bye devuelve true solo la primera vez: quien la recibe es el único que puede hacer la acción (así una acción no corre dos veces) */
const bye=i=>{const k=pool.indexOf(i);if(k>=0)pool.splice(k,1);return k>=0};
const weight=i=>1+(Array.isArray(i.more)?Math.min(i.more.length,9):0);
/* sin persona todavía y sin dueño: sirve a quien entre después de salir (o sin haber entrado); al salir o cambiar de cuenta, las que seguían sin persona se descartan (listener) */
const anon=i=>i.uid===null&&i.owner===undefined;
const mineOf=(from,uid)=>pool.filter(i=>i.from===from&&(uid===null?anon(i):(i.uid===uid&&(i.owner===undefined||i.owner===uid))));
const runPool=()=>{const here=D.here();pool.filter(i=>i.from===here&&(anon(i)||(i.uid!==null&&i.uid===lastId&&(i.owner===undefined||i.owner===lastId)))).forEach(i=>{if(bye(i))safe(i.done)})};
/* las opciones de go() para esa lista: la última acción como principal y las anteriores en "more", en el orden en que llegaron */
const withList=(o,items,uid)=>{const list=cleanList(items.flatMap(i=>[...(Array.isArray(i.more)?i.more:[]),{act:i.act,arg:i.arg}]),10),last=list[list.length-1];
 return last?{...o,act:last.act,arg:last.arg,more:list.slice(0,-1),uid}:{...o,uid}};
function warm(C,uid){
 if(warming&&warming.uid===uid)return warming;
 const g=gen;
 const p=(async()=>{let r;try{r=await D.api(C,'GET','/api/me',null,uid)}catch(e){return {ok:false}}
  const ok=r.status===200&&!!r.body.profile;if(ok&&gen===g&&C.user&&C.user.id===uid)cache({sub:uid,handle:r.body.profile.handle});return {ok}})();
 const w={uid,p};warming=w;p.then(()=>{if(warming===w)warming=null});return w}
async function quick(done,o){o=o||{};const from=D.here(),g0=gen,now=Date.now();
 pool=pool.filter(i=>!(i.uid===null&&i.shown)&&now-i.t<120000);
 const owner=typeof o.uid==='string'?o.uid:undefined;
 if(pool.filter(i=>i.from===from).reduce((n,i)=>n+weight(i),0)+weight({more:o.more})>10)return;
 const item={done,from,uid:null,owner,act:o.act,arg:o.arg,more:o.more,shown:false,t:now};pool.push(item);
 let C;
 try{C=await D.clerk()}catch(e){
  if(D.here()!==from||gen!==g0){bye(item);return}
  const c=D.store.get();
  if(c&&(owner===undefined||c.sub===owner)){if(bye(item)){D.intent.clear();done()}return}
  bye(item);if(c||owner!==undefined){D.intent.clear();return}
  return go(done,o)}
 hook(C);if(D.here()!==from||gen!==g0){bye(item);return}
 const uid=C.user?C.user.id:null;
 if(!uid){
  if(owner!==undefined){bye(item);const cur=D.intent.get();if(cur&&cur.uid===owner)D.intent.clear();return}
  const mine=mineOf(from,null);await go(runPool,withList(o,mine));mine.forEach(i=>{i.shown=true});return}
 if(owner!==undefined&&owner!==uid){bye(item);D.intent.clear();return}
 item.uid=uid;
 const c=D.store.get();if(c&&c.sub===uid){if(bye(item)){D.intent.clear();done()}return}
 const w=warm(C,uid),r=await w.p;
 if(D.here()!==from){bye(item);return}
 if(gen!==g0)return;
 if(r.ok){if(bye(item)){D.intent.clear();done()}return}
 return go(runPool,withList(o,mineOf(from,uid),uid))}
/* tras volver de Google u otra redirección: si el usuario empezó una acción nombrada en esta página, se retoma */
function resume(){const it=D.intent.get();
 const list=it&&it.from===D.here()?[...cleanList(it.more),...cleanList([{act:it.act,arg:it.arg}],1)]:[];
 if(list.length){const last=list[list.length-1],uid=typeof it.uid==='string'?it.uid:undefined;
  return quick(()=>{list.forEach(m=>safe(()=>ACT[m.act](m.arg)))},{inPlace:true,resume:true,act:last.act,arg:last.arg,more:list.slice(0,-1),uid})}
 D.intent.clear()}
return {require:go,quick,resume,gen:()=>gen,register:(name,fn)=>{ACT[name]=fn}}};
