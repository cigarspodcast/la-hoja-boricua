/* La Hoja Boricua · cuenta (LHB-25): quién puede abrir Mi Hoja y qué pasa al entrar.
   Sin DOM ni red propios: todo entra por D, así que se prueba con una Clerk de mentira.
   Reglas:
   - Un 401 o 403 de /api/me cierra la puerta; el perfil guardado solo abre si no hay conexión o el servidor falla (0 o 5xx), y solo para el mismo usuario.
   - Cada respuesta pendiente se amarra al usuario, a la pantalla y a la operación que la pidió; si algo cambió, se ignora.
   - Entrar desde cualquier página deja la página como está, y al terminar se hace la acción que el usuario empezó. */
window.LHB_CUENTA=function(D){'use strict';
const ACT=Object.create(null);let seq=0,sip=0,gen=0,hooked=false,lastId=null,pending=null,pendIp=null,ob=false,failure=null;
/* lo guardado para volver de Google: la acción y su argumento de texto; solo acciones registradas */
const intentOf=(from,o)=>{const v={from,act:o.act};if(typeof o.arg==='string')v.arg=o.arg;return v};
/* misma lectura del hash que el router de app.js: #/mihoja, #mihoja, #/perfil/x, #perfil; también las páginas que escriben datos de la cuenta (#/cata y #/subir): al cambiar la cuenta se vuelven a pasar por la puerta */
/* el perfil guardado es solo para abrir sin conexión: si el teléfono no lo deja guardar (almacenamiento lleno), entrar y crear el perfil igual funcionan */
const cache=v=>{try{D.store.set(v)}catch(e){}};
const onMiHoja=()=>{const r=D.here().replace(/^#\/?/,'').split('/')[0];return r==='mihoja'||r==='perfil'||r==='cata'||r==='subir'};
function hook(C){if(hooked)return;hooked=true;lastId=C.user?C.user.id:null;
 C.addListener(({user})=>{const id=user?user.id:null;if(id===lastId)return;lastId=id;seq++;sip++;gen++;D.ui.closeAll();
  if(!id){D.store.clear();D.intent.clear()}
  /* lo que espera una página (Mi Hoja) y lo que espera una acción en sitio se guardan por separado: las dos se retoman al entrar */
  const p=pending,q=pendIp;pending=null;pendIp=null;const fl=failure;failure=null;
  if(id&&q&&q.from===D.here())go(q.go,{...q.o,resume:true});
  if(id&&p&&p.from===D.here()){go(p.go,{...p.o,resume:true});return}
  if(onMiHoja()||ob){ob=false;D.reroute()}
  /* el aviso de error pedía salir y volver a entrar: al salir, la hoja se cierra con todo y su botón; se deja un botón nuevo para entrar y seguir con la acción */
  if(!id&&fl&&fl.from===D.here())D.ui.notice('Entra otra vez','Tu acción quedó pendiente. Entra para continuar.',{label:'Entrar',on:()=>go(fl.done,{...fl.o,resume:false})})})}
/* una acción en sitio (corazón, sello, estrella, humidor) cuenta aparte de la puerta de una página: tocar un corazón no cancela el dibujo de Mi Hoja ni al revés; un cambio de cuenta cancela las dos */
async function go(done,o){o=o||{};const from=D.here(),inp=!!o.inPlace,g0=gen,op=inp?++sip:++seq;if(inp)failure=null;else ob=false;
 const lv=(C,uid)=>op===(inp?sip:seq)&&D.here()===from&&(uid===undefined||(!!C.user&&C.user.id===uid));
 const show=(h,p,b)=>{if(!inp&&op===seq)D.ui.card(h,p,b)};
 /* un error nunca se esconde: sobre la página (en sitio) o en la tarjeta de Mi Hoja, siempre con reintento que conserva la acción */
 const fail=(h,p)=>{if(op!==(inp?sip:seq))return;const b={label:'Intentar otra vez',on:()=>go(done,{...o,resume:false})};if(o.inPlace){failure={done,o,from};D.ui.notice(h,p,b)}else D.ui.card(h,p,b)};
 show('Un momento…','Revisando tu cuenta.');
 let C;
 try{C=await D.clerk()}catch(e){
  if(op!==(inp?sip:seq)||D.here()!==from)return;
  if(D.store.get()){D.intent.clear();return done()}
  fail('Necesitas conexión','Para entrar a Mi Hoja la primera vez necesitas conexión a internet.');return}
 hook(C);
 /* con el perfil de ese usuario ya guardado la acción en sitio no espera a la red ni depende de otro toque: solo se descarta si cambió la cuenta o la página */
 if(inp?(gen!==g0||D.here()!==from):!lv(C))return;
 /* una acción en sitio (corazón, sello, estrella) no espera a la red: con sesión abierta y el perfil de ese mismo usuario guardado, se hace al instante */
 if(o.fast&&C.user){const c0=D.store.get();if(c0&&c0.sub===C.user.id){D.intent.clear();return done()}}
 if(!lv(C))return;
 if(!C.user){D.store.clear();
  if(o.resume){D.intent.clear();return}
  if(inp)pendIp={go:done,o,from};else pending={go:done,o,from};if(o.act)D.intent.set(intentOf(from,o));
  const open=()=>D.openSignIn(C);
  show('Entra para usar Mi Hoja','Tu humidor, tu diario, tu pasaporte y tus favoritos quedan con tu cuenta. El catálogo, los artesanos y los lugares siguen abiertos sin cuenta.',{label:'Entrar o crear cuenta',on:open});
  open();return}
 const uid=C.user.id;let r;
 try{r=await D.api(C,'GET','/api/me',null,uid)}catch(e){r={status:0,body:{}}}
 if(!lv(C,uid))return;
 if(r.status===200&&r.body.profile){cache({sub:uid,handle:r.body.profile.handle});D.intent.clear();return done()}
 if(r.status===200&&r.body.needsProfile)return onboard(C,done,o,lv,uid);
 if(r.status===401||r.status===403){D.store.clear();fail('No pudimos revisar tu cuenta','Cierra la sesión y entra otra vez.');return}
 const c=D.store.get();
 if(c&&c.sub===uid&&(r.status===0||r.status>=500)){D.intent.clear();return done()}
 fail('No pudimos revisar tu cuenta','Intenta otra vez en un momento.')}
function onboard(C,done,o,lv,uid){ob=true;
 D.ui.onboarding(async f=>{
  /* el formulario puede seguir en pantalla después de un cambio de cuenta: no se manda nada a nombre de otra persona */
  if(!lv(C,uid))return {stale:true};
  let r;try{r=await D.api(C,'POST','/api/profile',{...f,age_ok:true},uid)}catch(e){r={status:0,body:{}}}
  const same=!!C.user&&C.user.id===uid;
  if(r.status===201){if(same)cache({sub:uid,handle:r.body.profile.handle});
   if(!lv(C,uid))return {stale:true};
   ob=false;D.intent.clear();D.ui.toast('¡Bienvenido a Mi Hoja!');if(o.inPlace)D.reroute();done();return {ok:true}}
  if(!lv(C,uid))return {stale:true};
  /* la respuesta se perdió pero el perfil sí se creó: se revisa de nuevo dentro de este mismo envío y, si sale bien, se termina igual que con un 201.
     Si la revisión falla, el formulario sigue vivo para reintentar; no se anuncia éxito antes de tiempo. */
  if(r.body.error==='profile-exists'){
   let m;try{m=await D.api(C,'GET','/api/me',null,uid)}catch(e){m={status:0,body:{}}}
   if(!lv(C,uid))return {stale:true};
   if(m.status===200&&m.body.profile){cache({sub:uid,handle:m.body.profile.handle});ob=false;D.intent.clear();D.ui.toast('¡Bienvenido a Mi Hoja!');if(o.inPlace)D.reroute();done();return {ok:true}}
   return {error:'recheck'}}
  return {error:r.body.error||'generic'}})}
/* acción en sitio: pasa por la misma puerta que Mi Hoja (con el perfil de ese usuario ya guardado no espera a la red). Si el usuario toca otra acción antes de que
   termine la revisión, vale la última: cada toque es una sola acción y corre una vez o ninguna. */
const quick=(done,o)=>go(done,{...o,inPlace:true,fast:true});
/* tras volver de Google u otra redirección: si el usuario empezó una acción nombrada en esta página, se retoma */
function resume(){const it=D.intent.get();
 if(it&&it.from===D.here()&&typeof it.act==='string'&&typeof ACT[it.act]==='function'){const act=it.act,arg=typeof it.arg==='string'?it.arg:undefined;
  return quick(()=>ACT[act](arg),{resume:true,act,arg})}
 D.intent.clear()}
return {require:go,quick,resume,gen:()=>gen,register:(name,fn)=>{ACT[name]=fn}}};
