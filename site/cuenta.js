/* La Hoja Boricua · cuenta (LHB-25): quién puede abrir Mi Hoja y qué pasa al entrar.
   Sin DOM ni red propios: todo entra por D, así que se prueba con una Clerk de mentira.
   Reglas:
   - Un 401 o 403 de /api/me cierra la puerta; el perfil guardado solo abre si no hay conexión o el servidor falla (0 o 5xx), y solo para el mismo usuario.
   - Cada respuesta pendiente se amarra al usuario, a la pantalla y a la operación que la pidió; si algo cambió, se ignora.
   - Entrar desde cualquier página deja la página como está, y al terminar se hace la acción que el usuario empezó. */
window.LHB_CUENTA=function(D){'use strict';
const ACT=Object.create(null);let seq=0,sip=0,gen=0,hooked=false,lastId=null,pending=null,ob=false,failure=null,vis=0;
/* irse de una página termina todo lo que esa visita esperaba: volver después no revive una revisión ni una acción que quedó pendiente */
if(typeof D.onNav==='function')D.onNav(()=>{vis++;pending=null;failure=null;const it=D.intent.get();if(it&&it.from!==D.here())D.intent.clear()});
/* lo guardado para volver de Google: la acción y su argumento de texto; solo acciones registradas */
const intentOf=(from,o)=>{const v={from,act:o.act};if(typeof o.arg==='string')v.arg=o.arg;return v};
/* misma lectura del hash que el router de app.js: #/mihoja, #mihoja, #/perfil/x, #perfil; también las páginas que escriben datos de la cuenta (#/cata y #/subir): al cambiar la cuenta se vuelven a pasar por la puerta */
/* el perfil guardado es solo para abrir sin conexión: si el teléfono no lo deja guardar (almacenamiento lleno), entrar y crear el perfil igual funcionan */
const cache=v=>{try{D.store.set(v)}catch(e){}};
const onMiHoja=()=>{const r=D.here().replace(/^#\/?/,'').split('/')[0];return r==='mihoja'||r==='perfil'||r==='cata'||r==='subir'};
function hook(C){if(hooked)return;hooked=true;lastId=C.user?C.user.id:null;
 C.addListener(({user})=>{const id=user?user.id:null;if(id===lastId)return;lastId=id;seq++;sip++;gen++;D.ui.closeAll();
  if(!id){D.store.clear();D.intent.clear()}
  const p=pending;pending=null;const fl=failure;failure=null;
  if(id&&p&&p.from===D.here()){go(p.go,{...p.o,resume:true});return}
  if(onMiHoja()||ob){ob=false;D.reroute()}
  /* el aviso de error pedía salir y volver a entrar: al salir, la hoja se cierra con todo y su botón; se deja un botón nuevo para entrar y seguir con la acción */
  if(!id&&fl&&fl.from===D.here())D.ui.notice('Entra otra vez','Tu acción quedó pendiente. Entra para continuar.',{label:'Entrar',on:()=>go(fl.done,{...fl.o,resume:false})})})}
/* una acción en sitio (corazón, sello, estrella, humidor) cuenta aparte de la puerta de una página: tocar un corazón no cancela el dibujo de Mi Hoja ni al revés; un cambio de cuenta cancela las dos */
async function go(done,o){o=o||{};const from=D.here(),inp=!!o.inPlace,g0=gen,v0=vis,op=inp?++sip:++seq;if(inp){failure=null;/* un toque nuevo sustituye al anterior: lo guardado del anterior para volver de Google ya no vale (el nuevo guarda el suyo si hace falta) */if(!o.resume)D.intent.clear()}else ob=false;
 const lv=(C,uid)=>op===(inp?sip:seq)&&vis===v0&&D.here()===from&&(uid===undefined||(!!C.user&&C.user.id===uid));
 const show=(h,p,b)=>{if(!inp&&op===seq)D.ui.card(h,p,b)};
 /* un error nunca se esconde: sobre la página (en sitio) o en la tarjeta de Mi Hoja, siempre con reintento que conserva la acción */
 const fail=(h,p)=>{if(op!==(inp?sip:seq))return;const b={label:'Intentar otra vez',on:()=>go(done,{...o,resume:false})};if(o.inPlace){failure={done,o,from};D.ui.notice(h,p,b)}else D.ui.card(h,p,b)};
 show('Un momento…','Revisando tu cuenta.');
 let C;
 try{C=await D.clerk()}catch(e){
  if(op!==(inp?sip:seq)||vis!==v0||D.here()!==from)return;
  if(D.store.get()){D.intent.clear();return done()}
  fail('Necesitas conexión','Para entrar a Mi Hoja la primera vez necesitas conexión a internet.');return}
 hook(C);
 /* con el perfil de ese usuario ya guardado la acción en sitio no espera a la red ni depende de otro toque: solo se descarta si cambió la cuenta o la página */
 if(inp?(gen!==g0||vis!==v0||D.here()!==from):!lv(C))return;
 /* una acción en sitio (corazón, sello, estrella) no espera a la red: con sesión abierta y el perfil de ese mismo usuario guardado, se hace al instante */
 if(o.fast&&C.user){const c0=D.store.get();if(c0&&c0.sub===C.user.id){D.intent.clear();return done()}}
 if(!lv(C))return;
 /* en Mi Hoja y las páginas de la cuenta la puerta de la página es la única que espera: una acción en sitio que no puede hacerse al instante no se guarda ni compite con ella;
    sin sesión solo se abre la hoja de entrar */
 if(o.quick&&onMiHoja()){if(!C.user)D.openSignIn(C);return}
 if(!C.user){D.store.clear();
  if(o.resume){D.intent.clear();return}
  pending={go:done,o,from};if(o.act)D.intent.set(intentOf(from,o));
  const open=()=>D.openSignIn(C);
  show('Entra para usar Mi Hoja','Tu humidor, tu diario, tu pasaporte y tus favoritos quedan con tu cuenta. El catálogo, los artesanos y los lugares siguen abiertos sin cuenta.',{label:'Entrar o crear cuenta',on:open});
  open();return}
 const uid=C.user.id;let r;
 try{r=await D.api(C,'GET','/api/me',null,uid)}catch(e){r={status:0,body:{}}}
 if(!lv(C,uid))return;
 if(r.status===200&&r.body.profile){cache({sub:uid,handle:r.body.profile.handle});D.intent.clear();
  /* el perfil ya existe: un formulario de perfil que siga abierto quedó viejo, se retira y su envío tardío ya no corre su acción además de esta */
  if(ob){ob=false;D.reroute()}
  return done()}
 if(r.status===200&&r.body.needsProfile)return onboard(C,done,o,lv,uid);
 if(r.status===401||r.status===403){D.store.clear();fail('No pudimos revisar tu cuenta','Cierra la sesión y entra otra vez.');return}
 const c=D.store.get();
 if(c&&c.sub===uid&&(r.status===0||r.status>=500)){D.intent.clear();return done()}
 fail('No pudimos revisar tu cuenta','Intenta otra vez en un momento.')}
/* LHB-49: la foto de perfil es la de Clerk. Si la cuenta ya trae una (Google, Apple) viene puesta; si no, o si la persona quiere otra, la sube con setProfileImage.
   Una foto de Clerk que no se subió ni se importó (la silueta de siempre) tiene hasImage en false y no cuenta. Sin foto no se manda el perfil. */
const CLERK_IMG='https://img.clerk.com/';
const picOf=U=>U&&U.hasImage===true&&typeof U.imageUrl==='string'&&U.imageUrl.startsWith(CLERK_IMG)?U.imageUrl:null;
/* las subidas van de una en una aunque el formulario se cierre y se abra otro: la cuenta de Clerk es una sola, y si dos escrituras corrieran a la vez no se sabría cuál dejó la URL que se lee */
let uq=Promise.resolve();
/* el último formulario de perfil abierto: uno que ya fue reemplazado por otro no vuelve a valer */
let formSeq=0;
function onboard(C,done,o,lv,uid){ob=true;
 /* lv también se cae cuando otra acción tocó después y falló (un 503) sin abrir otro formulario: este formulario sigue en pantalla, con la misma cuenta y la misma página, y la persona
    debe poder terminar. Vale mientras sea el último formulario abierto; un cambio de cuenta, de página o de formulario lo sigue descartando */
 const mine=++formSeq,here0=D.here(),vis0=vis;
 const live=()=>lv(C,uid)||(mine===formSeq&&ob&&vis===vis0&&D.here()===here0&&!!C.user&&C.user.id===uid);
 /* si el perfil se crea con lv caído, una acción más nueva que sigue en vuelo se descarta y la que falló y quedó para volver también: la acción de este formulario corre una sola vez */
 const settle=()=>{failure=null;if(!lv(C,uid)){if(o.inPlace)sip++;else seq++}};
 const U=C.user;let pic=picOf(U),up=0,pend=0,sending=false;
 /* url() es la foto puesta ahora; upload(file) sube una nueva y devuelve {url}, {error} o {stale} (otra cuenta, otra pantalla o una subida más nueva) */
 const picture={url:()=>pic,upload:file=>{
  if(!live())return Promise.resolve({stale:true});
  if(sending)return Promise.resolve({error:'avatar-busy'});
  if(!file||typeof file.type!=='string'||!/^image\//.test(file.type))return Promise.resolve({error:'avatar-type'});
  const n=++up,cur=()=>live()&&n===up;pend++;
  const job=uq.then(async()=>{try{
   if(!cur())return {stale:true};
   try{await U.setProfileImage({file})}catch(e){return cur()?{error:'avatar-upload'}:{stale:true}}
   /* la URL nueva solo se lee de una cuenta recargada después de esta escritura; si no se pudo recargar no hay con qué confirmar y se queda la foto de antes */
   try{if(typeof U.reload!=='function')throw 0;await U.reload()}catch(e){return cur()?{error:'avatar-upload'}:{stale:true}}
   if(!cur())return {stale:true};
   const p=picOf(U);if(!p)return {error:'avatar-upload'};
   pic=p;return {url:p}}finally{pend--}});
  uq=job.catch(()=>{});return job}};
 const send=async f=>{
  /* el formulario puede seguir en pantalla después de un cambio de cuenta: no se manda nada a nombre de otra persona */
  if(!live())return {stale:true};
  if(!pic)return {error:'avatar-required'};
  let r;try{r=await D.api(C,'POST','/api/profile',{...f,age_ok:true,avatar_url:pic},uid)}catch(e){r={status:0,body:{}}}
  const same=!!C.user&&C.user.id===uid;
  if(r.status===201){if(same)cache({sub:uid,handle:r.body.profile.handle});
   if(!live())return {stale:true};
   settle();ob=false;D.intent.clear();D.ui.toast('¡Bienvenido a Mi Hoja!');if(o.inPlace)D.reroute();done();return {ok:true}}
  if(!live())return {stale:true};
  /* la respuesta se perdió pero el perfil sí se creó: se revisa de nuevo dentro de este mismo envío y, si sale bien, se termina igual que con un 201.
     Si la revisión falla, el formulario sigue vivo para reintentar; no se anuncia éxito antes de tiempo. */
  if(r.body.error==='profile-exists'){
   let m;try{m=await D.api(C,'GET','/api/me',null,uid)}catch(e){m={status:0,body:{}}}
   if(!live())return {stale:true};
   if(m.status===200&&m.body.profile){cache({sub:uid,handle:m.body.profile.handle});settle();ob=false;D.intent.clear();D.ui.toast('¡Bienvenido a Mi Hoja!');if(o.inPlace)D.reroute();done();return {ok:true}}
   return {error:'recheck'}}
  return {error:r.body.error||'generic'}};
 /* un envío y una subida nunca corren a la vez: lo que se manda es la foto que se ve, y la que se sube no llega tarde a un perfil ya enviado */
 D.ui.onboarding(async f=>{
  if(!live())return {stale:true};
  if(pend||sending)return {error:'avatar-busy'};
  sending=true;try{return await send(f)}finally{sending=false}},picture)}
/* acción en sitio: pasa por la misma puerta que Mi Hoja (con el perfil de ese usuario ya guardado no espera a la red). Si el usuario toca otra acción antes de que
   termine la revisión, vale la última: cada toque es una sola acción y corre una vez o ninguna. */
const quick=(done,o)=>go(done,{...o,inPlace:true,fast:true,quick:true});
/* tras volver de Google u otra redirección: si el usuario empezó una acción nombrada en esta página, se retoma */
function resume(){const it=D.intent.get();
 if(it&&it.from===D.here()&&!onMiHoja()&&typeof it.act==='string'&&typeof ACT[it.act]==='function'){const act=it.act,arg=typeof it.arg==='string'?it.arg:undefined;
  return quick(()=>ACT[act](arg),{resume:true,act,arg})}
 D.intent.clear()}
return {require:go,quick,resume,gen:()=>gen,register:(name,fn)=>{ACT[name]=fn}}};
