/* La Hoja Boricua · cuenta (LHB-25): quién puede abrir Mi Hoja y qué pasa al entrar.
   Sin DOM ni red propios: todo entra por D, así que se prueba con una Clerk de mentira.
   Reglas:
   - Un 401 o 403 de /api/me cierra la puerta; el perfil guardado solo abre si no hay conexión o el servidor falla (0 o 5xx), y solo para el mismo usuario.
   - Cada respuesta pendiente se amarra al usuario, a la pantalla y a la operación que la pidió; si algo cambió, se ignora.
   - Entrar desde cualquier página deja la página como está, y al terminar se hace la acción que el usuario empezó. */
window.LHB_CUENTA=function(D){'use strict';
const ACT={};let seq=0,hooked=false,lastId=null,pending=null,ob=false,failure=null;
/* lo guardado para volver de Google: la acción y, si hubo varios toques mientras cargaba Clerk, las anteriores; solo acciones registradas y argumentos de texto */
const cleanList=l=>(Array.isArray(l)?l:[]).filter(m=>m&&typeof m.act==='string'&&ACT[m.act]).slice(0,9).map(m=>typeof m.arg==='string'?{act:m.act,arg:m.arg}:{act:m.act});
const intentOf=(from,o)=>{const v={from,act:o.act};if(typeof o.arg==='string')v.arg=o.arg;const more=cleanList(o.more);if(more.length)v.more=more;return v};
const live=(op,from,C,uid)=>op===seq&&D.here()===from&&(uid===undefined||(!!C.user&&C.user.id===uid));
/* misma lectura del hash que el router de app.js: #/mihoja, #mihoja, #/perfil/x, #perfil; también las páginas que escriben datos de la cuenta (#/cata y #/subir): al cambiar la cuenta se vuelven a pasar por la puerta */
/* el perfil guardado es solo para abrir sin conexión: si el teléfono no lo deja guardar (almacenamiento lleno), entrar y crear el perfil igual funcionan */
const cache=v=>{try{D.store.set(v)}catch(e){}};
const onMiHoja=()=>{const r=D.here().replace(/^#\/?/,'').split('/')[0];return r==='mihoja'||r==='perfil'||r==='cata'||r==='subir'};
function hook(C){if(hooked)return;hooked=true;lastId=C.user?C.user.id:null;
 C.addListener(({user})=>{const id=user?user.id:null;if(id===lastId)return;lastId=id;seq++;gen++;D.ui.closeAll();
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
   Con sesión abierta y el perfil guardado de esa misma persona se hace al instante; sin perfil guardado, todos esperan una sola revisión compartida (warm) y,
   si sale bien, todos se hacen (aunque el teléfono no deje guardar el perfil); si sale mal, cada acción en espera pasa por go() con todas juntas
   (la última sustituye a las anteriores, que traen la misma lista), para el aviso, la creación del perfil o el reintento. Sin sesión, los toques hechos mientras
   Clerk carga forman un solo lote (outBatch): una sola hoja de entrar, y al entrar corren todos, también al volver de Google (el lote viaja en lo guardado).
   gen cuenta los cambios de cuenta y no lo mueven los toques: si cambia mientras se espera (Clerk, la revisión), la acción se descarta y nunca corre para otra
   persona; si la página cambia mientras se espera, también. Una acción que espera un reintento explícito (aviso con botón) sigue siendo de la misma persona
   que la empezó (uid): si entra otra persona, no se hace. */
let gen=0,warming=null,outBatch=null;
function warm(C,uid,item){
 if(warming&&warming.uid===uid){warming.items.push(item);return warming}
 const items=[item],g=gen;
 const p=(async()=>{let r;try{r=await D.api(C,'GET','/api/me',null,uid)}catch(e){return {ok:false}}
  const ok=r.status===200&&!!r.body.profile;if(ok&&gen===g&&C.user&&C.user.id===uid)cache({sub:uid,handle:r.body.profile.handle});return {ok}})();
 const w={uid,p,items};warming=w;p.then(()=>{if(warming===w)warming=null});return w}
async function quick(done,o){o=o||{};const from=D.here(),g0=gen,item={done,from,uid:null,act:o.act,arg:o.arg};let C;
 try{C=await D.clerk()}catch(e){if(D.here()!==from)return;if(D.store.get()){D.intent.clear();return done()}return go(done,o)}
 hook(C);if(D.here()!==from||gen!==g0)return;
 const uid=C.user?C.user.id:null;
 if(!uid){if(!outBatch){outBatch=[];Promise.resolve().then(()=>{outBatch=null})}const b=outBatch;b.push(item);
  return go(()=>b.forEach(i=>{if(i.from===D.here())i.done()}),{...o,more:b.slice(0,-1)})}
 const c=D.store.get();if(c&&c.sub===uid){D.intent.clear();return done()}
 item.uid=uid;const w=warm(C,uid,item),r=await w.p;
 if(gen!==g0||D.here()!==from)return;
 if(r.ok){D.intent.clear();return done()}
 return go(()=>w.items.forEach(i=>{if(i.from===D.here()&&i.uid===lastId)i.done()}),o)}
/* tras volver de Google u otra redirección: si el usuario empezó una acción nombrada en esta página, se retoma */
function resume(){const it=D.intent.get();
 const list=it&&it.from===D.here()?cleanList([...(Array.isArray(it.more)?it.more:[]),{act:it.act,arg:it.arg}]):[];
 if(list.length){const last=list[list.length-1];return go(()=>list.forEach(m=>ACT[m.act](m.arg)),{inPlace:true,resume:true,act:last.act,arg:last.arg,more:list.slice(0,-1),fast:true})}
 D.intent.clear()}
return {require:go,quick,resume,gen:()=>gen,register:(name,fn)=>{ACT[name]=fn}}};
