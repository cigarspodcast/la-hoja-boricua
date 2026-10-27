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
/* LHB-51: lo guardado en el teléfono lleva solo lo público (nombre público y la foto de Clerk) para pintar el encabezado y Perfil; la foto solo vale si es de Clerk */
const snap=(uid,p)=>({sub:uid,handle:p.handle,name:typeof p.display_name==='string'?p.display_name:'',avatar:typeof p.avatar_key==='string'&&p.avatar_key.startsWith(CLERK_IMG)?p.avatar_key:''});
/* toda salida que da por buena la cuenta con perfil retira el formulario de perfil que siga abierto: quedó viejo y su respuesta tardía ya no corre su acción además de esta */
const retire=()=>{if(ob){ob=false;D.reroute()}};
const onMiHoja=()=>{const r=D.here().replace(/^#\/?/,'').split('/')[0];return r==='mihoja'||r==='perfil'||r==='cata'||r==='subir'};
/* LHB-51: al abrir la app con una cuenta guardada, Clerk dice quién es: si es otra (o nadie) lo guardado se descarta; sin conexión se queda */
async function reconcile(){const c0=D.store.get();if(!c0)return;let C;try{C=await D.clerk()}catch(e){return}hook(C);
 /* si lo guardado era de otra cuenta y la persona está en Mi Hoja, lo que se pintó con ello (Perfil) se vuelve a pasar por la puerta */
 if(!D.store.get()&&onMiHoja())D.reroute()}
function hook(C){if(hooked)return;hooked=true;lastId=C.user?C.user.id:null;
 /* LHB-51: lo guardado es de otra cuenta que la que Clerk dice (o de ninguna): se descarta ya, aunque luego /api/me falle */
 {const c0=D.store.get();if(c0&&(!C.user||c0.sub!==C.user.id))D.store.clear()}
 C.addListener(({user})=>{const id=user?user.id:null;if(id===lastId)return;lastId=id;seq++;sip++;gen++;D.ui.closeAll();
  /* LHB-51: lo guardado es de la cuenta anterior: al salir o al cambiar de cuenta se borra, para que el encabezado nunca muestre a una persona con la sesión de otra */
  D.store.clear();if(!id)D.intent.clear();
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
  if(D.store.get()&&!o.edit){D.intent.clear();retire();return done()}
  fail('Necesitas conexión',o.edit?'Para editar tu perfil necesitas conexión a internet.':'Para entrar a Mi Hoja la primera vez necesitas conexión a internet.');return}
 hook(C);
 /* con el perfil de ese usuario ya guardado la acción en sitio no espera a la red ni depende de otro toque: solo se descarta si cambió la cuenta o la página */
 if(inp?(gen!==g0||vis!==v0||D.here()!==from):!lv(C))return;
 /* una acción en sitio (corazón, sello, estrella) no espera a la red: con sesión abierta y el perfil de ese mismo usuario guardado, se hace al instante */
 if(o.fast&&C.user){const c0=D.store.get();if(c0&&c0.sub===C.user.id){D.intent.clear();retire();return done()}}
 if(!lv(C))return;
 /* en Mi Hoja y las páginas de la cuenta la puerta de la página es la única que espera: una acción en sitio que no puede hacerse al instante no se guarda ni compite con ella;
    sin sesión solo se abre la hoja de entrar */
 if(o.quick&&onMiHoja()){if(!C.user)D.openSignIn(C);return}
 if(!C.user){D.store.clear();
  if(o.resume){D.intent.clear();return}
  pending={go:done,o,from};if(o.act)D.intent.set(intentOf(from,o));
  const open=()=>D.openSignIn(C);
  show('Entra para usar Mi Hoja','Tu humidor, tu diario, tu pasaporte y tus favoritos quedan con tu cuenta.'+(D.hasLocal&&D.hasLocal()?' Lo que ya tienes guardado en este teléfono pasa a tu cuenta al entrar.':'')+' El catálogo, los artesanos y los lugares siguen abiertos sin cuenta.',{label:'Entrar o crear cuenta',on:open});
  open();return}
 const uid=C.user.id;let r;
 try{r=await D.api(C,'GET','/api/me',null,uid)}catch(e){r={status:0,body:{}}}
 if(!lv(C,uid))return;
 /* LHB-52: un perfil de antes, sin nombre, apellido, género y fecha de nacimiento, completa su identidad antes de abrir nada; mientras tanto no se guarda para abrir sin conexión */
 if(r.status===200&&r.body.profile&&r.body.needsIdentity===true)return identify(C,done,o,lv,uid,r.body.profile);
 /* LHB-55: editar el perfil pasa por la misma puerta y abre el formulario con lo que hay guardado; done corre al guardar */
 if(r.status===200&&r.body.profile&&o.edit){cache(snap(uid,r.body.profile));D.intent.clear();return edit(C,done,o,lv,uid,r.body.profile)}
 if(r.status===200&&r.body.profile){cache(snap(uid,r.body.profile));D.intent.clear();retire();return done()}
 if(r.status===200&&r.body.needsProfile)return onboard(C,done,o,lv,uid);
 if(r.status===401||r.status===403){D.store.clear();fail('No pudimos revisar tu cuenta','Cierra la sesión y entra otra vez.');return}
 const c=D.store.get();
 if(c&&c.sub===uid&&!o.edit&&(r.status===0||r.status>=500)){D.intent.clear();retire();return done()}
 fail('No pudimos revisar tu cuenta','Intenta otra vez en un momento.')}
/* LHB-49: la foto de perfil es la de Clerk. Si la cuenta ya trae una (Google, Apple) viene puesta; si no, o si la persona quiere otra, la sube con setProfileImage.
   Una foto de Clerk que no se subió ni se importó (la silueta de siempre) tiene hasImage en false y no cuenta. Sin foto no se manda el perfil. */
const CLERK_IMG='https://img.clerk.com/';
const picOf=U=>U&&U.hasImage===true&&typeof U.imageUrl==='string'&&U.imageUrl.startsWith(CLERK_IMG)?U.imageUrl:null;
/* las subidas van de una en una aunque el formulario se cierre y se abra otro: la cuenta de Clerk es una sola, y si dos escrituras corrieran a la vez no se sabría cuál dejó la URL que se lee */
let uq=Promise.resolve();
/* cuántas subidas siguen en curso en toda la cuenta, también las de un formulario que ya se cerró: la cuenta de Clerk es una sola, así que ningún formulario nuevo guarda mientras una subida vieja sigue (LHB-55, ronda 1) */
let upn=0;
/* y cuántos envíos de perfil siguen en curso en toda la cuenta, también los de un formulario que ya se cerró: una subida no arranca mientras un envío viejo sigue (LHB-55, ronda 2); el envío de cada formulario sigue frenando solo a ese formulario */
let snd=0;
/* el último formulario de perfil abierto: uno que ya fue reemplazado por otro no vuelve a valer */
let formSeq=0;
/* lo que comparten el formulario del perfil nuevo y el de completar la identidad (LHB-52) */
function guard(C,o,lv,uid){
 /* lv también se cae cuando otra acción tocó después y falló (un 503) sin abrir otro formulario: este formulario sigue en pantalla, con la misma cuenta y la misma página, y la persona
    debe poder terminar. Vale mientras sea el último formulario abierto; un cambio de cuenta, de página o de formulario lo sigue descartando */
 const mine=++formSeq,here0=D.here(),vis0=vis;
 const live=()=>lv(C,uid)||(mine===formSeq&&ob&&vis===vis0&&D.here()===here0&&!!C.user&&C.user.id===uid);
 /* si el perfil se crea con lv caído, una acción más nueva que sigue en vuelo se descarta y la que falló y quedó para volver también: la acción de este formulario corre una sola vez */
 const settle=()=>{failure=null;if(!lv(C,uid)){if(o.inPlace)sip++;else seq++}};
 return {live,settle}}
/* LHB-55: el selector de foto lo comparten el formulario del perfil nuevo y el de editar: la misma subida, la misma cola y la misma lectura de la URL.
   url() es la foto puesta ahora (pic0 al abrir); upload(file) sube una nueva y devuelve {url}, {error} o {stale} (otra cuenta, otra pantalla o una subida más nueva).
   sending() dice si hay un envío en curso en toda la cuenta (la subida lo respeta) y pending() cuántas subidas siguen en curso en toda la cuenta. */
function picker(U,live,pic0,sending){
 let pic=pic0,up=0;
 const picture={url:()=>pic,upload:file=>{
  if(!live())return Promise.resolve({stale:true});
  if(sending())return Promise.resolve({error:'avatar-busy'});
  if(!file||typeof file.type!=='string'||!/^image\//.test(file.type))return Promise.resolve({error:'avatar-type'});
  const n=++up,cur=()=>live()&&n===up;upn++;
  const job=uq.then(async()=>{try{
   if(!cur())return {stale:true};
   try{await U.setProfileImage({file})}catch(e){return cur()?{error:'avatar-upload'}:{stale:true}}
   /* la URL nueva solo se lee de una cuenta recargada después de esta escritura; si no se pudo recargar no hay con qué confirmar y se queda la foto de antes */
   try{if(typeof U.reload!=='function')throw 0;await U.reload()}catch(e){return cur()?{error:'avatar-upload'}:{stale:true}}
   if(!cur())return {stale:true};
   const p=picOf(U);if(!p)return {error:'avatar-upload'};
   pic=p;return {url:p}}finally{upn--}});
  uq=job.catch(()=>{});return job}};
 return {picture,pending:()=>upn}}
function onboard(C,done,o,lv,uid){ob=true;
 const {live,settle}=guard(C,o,lv,uid);
 const U=C.user;let sending=false;
 const {picture,pending}=picker(U,live,picOf(U),()=>snd>0);
 const send=async f=>{
  /* el formulario puede seguir en pantalla después de un cambio de cuenta: no se manda nada a nombre de otra persona */
  if(!live())return {stale:true};
  const pic=picture.url();
  if(!pic)return {error:'avatar-required'};
  let r;try{r=await D.api(C,'POST','/api/profile',{...f,avatar_url:pic},uid)}catch(e){r={status:0,body:{}}}
  const same=!!C.user&&C.user.id===uid;
  if(r.status===201){if(same)cache(snap(uid,r.body.profile));
   if(!live())return {stale:true};
   settle();ob=false;D.intent.clear();D.ui.toast('¡Bienvenido a Mi Hoja!');if(o.inPlace)D.reroute();done();return {ok:true}}
  if(!live())return {stale:true};
  /* la respuesta se perdió pero el perfil sí se creó: se revisa de nuevo dentro de este mismo envío y, si sale bien, se termina igual que con un 201.
     Si la revisión falla, el formulario sigue vivo para reintentar; no se anuncia éxito antes de tiempo. */
  if(r.body.error==='profile-exists'){
   let m;try{m=await D.api(C,'GET','/api/me',null,uid)}catch(e){m={status:0,body:{}}}
   if(!live())return {stale:true};
   /* LHB-52: el perfil que apareció tras el 409 sigue sin identidad: se completa antes de guardar nada o abrir Mi Hoja; este formulario ya no vale */
   if(m.status===200&&m.body.profile&&m.body.needsIdentity===true){identify(C,done,o,lv,uid,m.body.profile);return {stale:true}}
   if(m.status===200&&m.body.profile){cache(snap(uid,m.body.profile));settle();ob=false;D.intent.clear();D.ui.toast('¡Bienvenido a Mi Hoja!');if(o.inPlace)D.reroute();done();return {ok:true}}
   return {error:'recheck'}}
  return {error:r.body.error||'generic'}};
 /* un envío y una subida nunca corren a la vez: lo que se manda es la foto que se ve, y la que se sube no llega tarde a un perfil ya enviado */
 D.ui.onboarding(async f=>{
  if(!live())return {stale:true};
  if(pending()||sending)return {error:'avatar-busy'};
  sending=true;snd++;try{return await send(f)}finally{sending=false;snd--}},picture)}
/* LHB-55: editar el perfil propio. Mismo cuidado que el formulario nuevo (cuenta, página y formulario vigentes; un envío a la vez; subida y envío nunca a la vez; una sola salida),
   con lo que ya tiene el perfil puesto: prof viene de /api/me (solo su dueño recibe nombre, apellido, género y fecha). Un envío que falla deja el formulario con lo escrito y la foto de antes. */
function edit(C,done,o,lv,uid,prof){ob=true;
 const {live,settle}=guard(C,o,lv,uid);
 const U=C.user;let sending=false;
 const {picture,pending}=picker(U,live,typeof prof.avatar_key==='string'&&prof.avatar_key.startsWith(CLERK_IMG)?prof.avatar_key:picOf(U),()=>snd>0);
 const send=async f=>{
  if(!live())return {stale:true};
  const pic=picture.url();
  if(!pic)return {error:'avatar-required'};
  let r;try{r=await D.api(C,'PUT','/api/profile',{...f,avatar_url:pic},uid)}catch(e){r={status:0,body:{}}}
  if(!live())return {stale:true};
  if(r.status===200&&r.body.profile){if(!!C.user&&C.user.id===uid)cache(snap(uid,r.body.profile));
   settle();ob=false;D.intent.clear();D.ui.toast('Perfil guardado.');done();return {ok:true}}
  return {error:r.body&&r.body.error||'generic'}};
 D.ui.edit(prof,async f=>{
  if(!live())return {stale:true};
  if(pending()||sending)return {error:'avatar-busy'};
  sending=true;snd++;try{return await send(f||{})}finally{sending=false;snd--}},picture)}
/* LHB-52: completar la identidad de un perfil que ya existía. Mismo cuidado que el formulario nuevo (cuenta, página y formulario vigentes; un envío a la vez; una sola salida),
   pero sin foto ni @: el servidor (PUT /api/profile) solo toca un perfil al que le falta alguno de los cuatro datos. */
function identify(C,done,o,lv,uid,prof){ob=true;
 /* el perfil guardado de antes ya no abre: la próxima vez, sin conexión o en una acción en sitio, se vuelve a revisar */
 D.store.clear();
 const {live,settle}=guard(C,o,lv,uid);let sending=false;
 const finish=()=>{cache(snap(uid,prof));settle();ob=false;D.intent.clear();D.ui.toast('Listo, tu perfil está completo.');if(o.inPlace)D.reroute();done();return {ok:true}};
 const send=async f=>{
  if(!live())return {stale:true};
  let r;try{r=await D.api(C,'PUT','/api/profile',{first_name:f.first_name,last_name:f.last_name,gender:f.gender,birth_date:f.birth_date},uid)}catch(e){r={status:0,body:{}}}
  if(!live())return {stale:true};
  if(r.status===200)return finish();
  /* ya estaba completo (otra pestaña o un envío cuya respuesta se perdió): se revisa dentro de este mismo envío y, si sale completo, termina igual que un 200 */
  if(r.body.error==='identity-exists'){
   let m;try{m=await D.api(C,'GET','/api/me',null,uid)}catch(e){m={status:0,body:{}}}
   if(!live())return {stale:true};
   if(m.status===200&&m.body.profile&&m.body.needsIdentity!==true)return finish();
   return {error:'recheck'}}
  return {error:r.body.error||'generic'}};
 D.ui.identity(async f=>{
  if(!live())return {stale:true};
  if(sending)return {error:'busy'};
  sending=true;try{return await send(f||{})}finally{sending=false}})}
/* acción en sitio: pasa por la misma puerta que Mi Hoja (con el perfil de ese usuario ya guardado no espera a la red). Si el usuario toca otra acción antes de que
   termine la revisión, vale la última: cada toque es una sola acción y corre una vez o ninguna. */
const quick=(done,o)=>go(done,{...o,inPlace:true,fast:true,quick:true});
/* tras volver de Google u otra redirección: si el usuario empezó una acción nombrada en esta página, se retoma */
function resume(){const it=D.intent.get();
 if(it&&it.from===D.here()&&!onMiHoja()&&typeof it.act==='string'&&typeof ACT[it.act]==='function'){const act=it.act,arg=typeof it.arg==='string'?it.arg:undefined;
  return quick(()=>ACT[act](arg),{resume:true,act,arg})}
 D.intent.clear()}
return {require:go,reconcile,quick,resume,gen:()=>gen,register:(name,fn)=>{ACT[name]=fn}}};
