/* La Hoja Boricua · cuenta (LHB-25): quién puede abrir Mi Hoja y qué pasa al entrar.
   Sin DOM ni red propios: todo entra por D, así que se prueba con una Clerk de mentira.
   Reglas:
   - Un 401 o 403 de /api/me cierra la puerta; el perfil guardado solo abre si no hay conexión o el servidor falla (0 o 5xx), y solo para el mismo usuario.
   - Cada respuesta pendiente se amarra al usuario, a la pantalla y a la operación que la pidió; si algo cambió, se ignora.
   - Entrar desde cualquier página deja la página como está, y al terminar se hace la acción que el usuario empezó. */
window.LHB_CUENTA=function(D){'use strict';
const ACT={};let seq=0,hooked=false,lastId=null,pending=null,ob=false;
const live=(op,from,C,uid)=>op===seq&&D.here()===from&&(uid===undefined||(!!C.user&&C.user.id===uid));
/* misma lectura del hash que el router de app.js: #/mihoja, #mihoja, #/perfil/x, #perfil */
const onMiHoja=()=>{const r=D.here().replace(/^#\/?/,'').split('/')[0];return r==='mihoja'||r==='perfil'};
function hook(C){if(hooked)return;hooked=true;lastId=C.user?C.user.id:null;
 C.addListener(({user})=>{const id=user?user.id:null;if(id===lastId)return;lastId=id;seq++;
  if(!id){D.store.clear();D.intent.clear()}
  const p=pending;pending=null;
  if(id&&p&&p.from===D.here()){go(p.go,{...p.o,resume:true});return}
  if(onMiHoja()||ob){ob=false;D.reroute()}})}
async function go(done,o){o=o||{};const from=D.here(),op=++seq;ob=false;const show=(h,p,b)=>{if(!o.inPlace&&op===seq)D.ui.card(h,p,b)};
 const retry={label:'Intentar otra vez',on:()=>go(done,o)};
 show('Un momento…','Revisando tu cuenta.');
 let C;
 try{C=await D.clerk()}catch(e){
  if(op!==seq||D.here()!==from)return;
  if(D.store.get())return done();
  show('Necesitas conexión','Para entrar a Mi Hoja la primera vez necesitas conexión a internet.',retry);return}
 hook(C);
 if(!live(op,from,C))return;
 if(!C.user){D.store.clear();
  if(o.resume){D.intent.clear();return}
  pending={go:done,o,from};if(o.act)D.intent.set({from,act:o.act});
  const open=()=>D.openSignIn(C);
  show('Entra para usar Mi Hoja','Tu humidor, tu diario, tu pasaporte y tus favoritos quedan con tu cuenta. El catálogo, los artesanos y los lugares siguen abiertos sin cuenta.',{label:'Entrar o crear cuenta',on:open});
  open();return}
 const uid=C.user.id;let r;
 try{r=await D.api(C,'GET','/api/me',null,uid)}catch(e){r={status:0,body:{}}}
 if(!live(op,from,C,uid))return;
 if(r.status===200&&r.body.profile){D.store.set({sub:uid,handle:r.body.profile.handle});D.intent.clear();if(o.repaint)D.reroute();return done()}
 if(r.status===200&&r.body.needsProfile)return onboard(C,done,o,op,from,uid);
 if(r.status===401||r.status===403){D.store.clear();show('No pudimos revisar tu cuenta','Cierra la sesión y entra otra vez.',retry);return}
 const c=D.store.get();
 if(c&&c.sub===uid&&(r.status===0||r.status>=500))return done();
 show('No pudimos revisar tu cuenta','Intenta otra vez en un momento.',retry)}
function onboard(C,done,o,op,from,uid){ob=true;
 D.ui.onboarding(async f=>{
  /* el formulario puede seguir en pantalla después de un cambio de cuenta: no se manda nada a nombre de otra persona */
  if(!live(op,from,C,uid))return {stale:true};
  let r;try{r=await D.api(C,'POST','/api/profile',{...f,age_ok:true},uid)}catch(e){r={status:0,body:{}}}
  const same=!!C.user&&C.user.id===uid;
  if(r.status===201){if(same)D.store.set({sub:uid,handle:r.body.profile.handle});
   if(!live(op,from,C,uid))return {stale:true};
   ob=false;D.intent.clear();D.ui.toast('¡Bienvenido a Mi Hoja!');if(o.inPlace)D.reroute();done();return {ok:true}}
  if(!live(op,from,C,uid))return {stale:true};
  /* la respuesta se perdió pero el perfil sí se creó: se revisa de nuevo y se termina igual que con un 201 */
  if(r.body.error==='profile-exists'){go(done,{...o,repaint:!!o.inPlace});return {ok:true}}
  return {error:r.body.error||'generic'}})}
/* tras volver de Google u otra redirección: si el usuario empezó una acción nombrada en esta página, se retoma */
function resume(){const it=D.intent.get();
 if(it&&it.from===D.here()&&ACT[it.act])return go(ACT[it.act],{inPlace:true,resume:true,act:it.act});
 D.intent.clear()}
return {require:go,resume,register:(name,fn)=>{ACT[name]=fn}}};
