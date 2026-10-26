/* La Hoja Boricua v6 · Mi Hoja: cata guiada, humidor, diario, pasaporte, favoritos, eventos, maridajes, podcast, compartir.
   Todo vive en este teléfono (localStorage). Mi Hoja pide cuenta y perfil (LHB-25). */
window.LHB_EXT=function(A){'use strict';
const {$,$$,esc,toast,view,VBArt}=A;const D=()=>A.D();
const APP_URL='https://lahojaboricua.com/';
/* ---------- utilidades ---------- */
const MES=['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
const MESL=['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
const hoy=()=>{const d=new Date();return new Date(d.getTime()-d.getTimezoneOffset()*6e4).toISOString().slice(0,10)};
const fmtF=f=>{const d=new Date(String(f).slice(0,10)+'T12:00:00');return isNaN(d)?'':`${d.getDate()} ${MES[d.getMonth()]} ${d.getFullYear()}`};
const uid=p=>p+Date.now().toString(36)+Math.random().toString(36).slice(2,6);
/* sin teléfonos ni emails en pantalla */
const scrub=t=>String(t??'').replace(/(Costo|Precio) por teléfono:?[^·.]*/i,'Costo: pregunta al organizador').replace(/[\w.+-]+@[\w-]+\.[\w.]+/g,'').replace(/(\+?1[\s.-]?)?\(?\d{3}\)?[\s.-]\d{3}[\s.-]\d{4}(\s*\([^)]*\))?/g,'').replace(/(\s*[·,]\s*)+(?=[·,]|$)/g,'').replace(/\s{2,}/g,' ').trim();
const firstURL=t=>{const m=String(t||'').match(/https?:\/\/[^\s·,]+/);return m?m[0]:''};
/* ---------- almacenamiento versionado ---------- */
const KEY='lhb_mihoja_v1',SCHEMA=1;
const DEF=()=>({schema:SCHEMA,creado:new Date().toISOString(),humidor:[],diario:[],pasaporte:{artesanos:{},cigarros:{},lugares:{}},favs:{cigarros:[],artesanos:[],lugares:[]},ratings:{},respaldo:null,cambios:0,recordarDespues:null,draft:null});
const MIG={/* cuando cambie el formato: 1:o=>({...o,schema:2}) y KEY pasa a lhb_mihoja_v2 leyendo la v1 */};
function normalize(o){const d=DEF();o=o&&typeof o==='object'?o:{};
 for(const k of Object.keys(d))if(o[k]===undefined)o[k]=d[k];
 if(!o.pasaporte||typeof o.pasaporte!=='object')o.pasaporte={};if(!o.favs||typeof o.favs!=='object')o.favs={};
 for(const k of ['artesanos','cigarros','lugares']){if(!o.pasaporte[k]||typeof o.pasaporte[k]!=='object')o.pasaporte[k]={};if(!Array.isArray(o.favs[k]))o.favs[k]=[]}
 if(!Array.isArray(o.humidor))o.humidor=[];if(!Array.isArray(o.diario))o.diario=[];if(!o.ratings||typeof o.ratings!=='object')o.ratings={};return o}
function upgrade(o){o=o||{};if(!o.schema)o.schema=1;while(o.schema<SCHEMA&&MIG[o.schema])o=MIG[o.schema](o);return normalize(o)}
const legacy=k=>{try{const v=localStorage.getItem('vb_'+k);return v==null?null:JSON.parse(v)}catch(e){return null}};
let ST=null;
function load(){const raw=localStorage.getItem(KEY);
 if(raw){try{return upgrade(JSON.parse(raw))}catch(e){try{localStorage.setItem(KEY+'_danado_'+Date.now(),raw)}catch(_){}}}
 /* primera vez en v6: trae favoritos y estrellas de la versión anterior (vb_favs, vb_ratings); las llaves viejas no se borran */
 const s=DEF();const f=legacy('favs'),r=legacy('ratings');
 if(Array.isArray(f))s.favs.cigarros=f.filter(x=>typeof x==='string');if(r&&typeof r==='object'&&!Array.isArray(r))s.ratings={...r};
 s.migrado=(f||r)?'v5':'nuevo';write(s);return s}
function write(s){try{localStorage.setItem(KEY,JSON.stringify(s));return true}catch(e){toast('No hay espacio para guardar. Exporta un respaldo.');return false}}
const S=()=>ST||(ST=load());
function save(mut){const s=S();mut&&mut(s);s.cambios=(s.cambios||0)+1;write(s);return s}
try{navigator.storage&&navigator.storage.persist&&navigator.storage.persist().catch(()=>{})}catch(e){}
/* ---------- favoritos y pasaporte ---------- */
const isFav=(k,id)=>S().favs[k].includes(id);
function toggleFav(k,id){let on;save(s=>{on=!s.favs[k].includes(id);s.favs[k]=on?[...s.favs[k],id]:s.favs[k].filter(x=>x!==id)});return on}
const isStamp=(k,id)=>!!S().pasaporte[k][id];
function toggleStamp(k,id){let on;save(s=>{on=!s.pasaporte[k][id];if(on)s.pasaporte[k][id]=hoy();else delete s.pasaporte[k][id]});return on}
const STAMP_ICO='<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2" stroke-dasharray="3 2"/><path d="M8 12.5l2.6 2.5L16 9.5" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const favBtn=(k,id,cls='')=>{const on=isFav(k,id);return `<button type="button" class="heart ${cls}" data-fav="${k}:${esc(id)}" aria-pressed="${on}" aria-label="${on?'Quitar de':'Guardar en'} favoritos">${on?'♥':'♡'}<span>Favorito</span></button>`};
const stampBtn=(k,id,cls='')=>{const on=isStamp(k,id);return `<button type="button" class="stampbtn ${cls}" data-stamp="${k}:${esc(id)}" aria-pressed="${on}">${STAMP_ICO}<span>${on?'Sellado':'Sellar pasaporte'}</span></button>`};
document.addEventListener('click',e=>{
 const f=e.target.closest('[data-fav]');if(f){e.preventDefault();e.stopPropagation();gate('fav',f.dataset.fav);return}
 const tw=e.target.closest('[data-town]');if(tw){townSheet(tw.dataset.town);return}
 const st=e.target.closest('[data-stamp]');if(st){e.preventDefault();e.stopPropagation();gate('stamp',st.dataset.stamp,st);return}
 const cp=e.target.closest('[data-copy]');if(cp){const t=cp.dataset.copy;(navigator.clipboard?navigator.clipboard.writeText(t):Promise.reject()).then(()=>toast('Copiado: '+t),()=>toast('ATH Móvil: '+t));return}
 const ic=e.target.closest('[data-ics]');if(ic){const ev=(D().events.actividades||[]).find(x=>x.id===ic.dataset.ics);if(ev)addToCal(ev);return}
 const sh=e.target.closest('[data-sheet]');if(sh){e.preventDefault();if(sh.dataset.sheet==='humidor')gate('humidor',sh.dataset.arg);else openSheet(sh.dataset.sheet,sh.dataset.arg)}});
/* ---------- regiones ---------- */
const REG={Metro:['San Juan','Guaynabo','Bayamón','Carolina','Cataño','Trujillo Alto','Toa Baja','Toa Alta'],
 Norte:['Arecibo','Barceloneta','Manatí','Vega Baja','Vega Alta','Dorado','Hatillo','Camuy','Quebradillas','Florida'],
 Oeste:['Mayagüez','Rincón','Isabela','Aguadilla','Aguada','Moca','Añasco','Cabo Rojo','Hormigueros','San Germán','Lajas','San Sebastián','Las Marías','Maricao','Sabana Grande'],
 Este:['Fajardo','Luquillo','Río Grande','Humacao','Ceiba','Naguabo','Yabucoa','Canóvanas','Loíza','Las Piedras','Juncos','Vieques','Culebra','Maunabo'],
 Centro:['Caguas','Cidra','Aguas Buenas','Cayey','Jayuya','Lares','Utuado','Adjuntas','Villalba','Orocovis','Barranquitas','Comerío','Ciales','Morovis','Corozal','Naranjito','Aibonito','San Lorenzo','Gurabo'],
 Sur:['Ponce','Juana Díaz','Santa Isabel','Salinas','Guayama','Coamo','Yauco','Guánica','Peñuelas','Arroyo','Patillas','Guayanilla']};
const MUNIS=Object.values(REG).flat();
function municipio(p){const s=String(p||'');let best=null,pos=1e9;for(const m of MUNIS){const i=s.indexOf(m);if(i>=0&&(i<pos||(i===pos&&m.length>best.length))){best=m;pos=i}}return best}
const region=m=>Object.keys(REG).find(r=>REG[r].includes(m))||'';
/* ---------- rueda de sabores ---------- */
const WHEEL=[{id:'madera',n:'Madera',c:'#e6c48f'},{id:'tierra',n:'Tierra',c:'#cbbd9f'},{id:'especias',n:'Especias',c:'#ff8a80'},{id:'dulce',n:'Dulce',c:'#ffd27a'},{id:'cacao',n:'Cacao / café',l:['Cacao','café'],c:'#e8c0c0'},{id:'frutos',n:'Frutos',c:'#ff9a9a'},{id:'floral',n:'Floral',c:'#c5cdf5'},{id:'cuero',n:'Cuero',c:'#8fb8ff'},{id:'nuez',n:'Nuez',c:'#a9c487'}];
const WN=id=>(WHEEL.find(w=>w.id===id)||{}).n||id;
const KW={madera:/madera|cedro|roble|ahumad/i,tierra:/tierra|terros|mineral/i,especias:/especia|pimient|canela|picant|clavo/i,dulce:/dulce|miel|caramel|azúcar|azucar|vainilla|melaza|sugar/i,cacao:/cacao|chocolate|café|cafe|espresso|moca/i,frutos:/fruta|frut|cítric|citric|pasas|cereza/i,floral:/flor/i,cuero:/cuero/i,nuez:/nuez|nueces|almendr|maní|avellan/i};
const cigarTags=c=>Object.keys(KW).filter(k=>KW[k].test([c.notas,c.nombre].join(' ')));
function wheel(sel,key){const N=WHEEL.length,R=150,r0=48,cx=160,cy=160;const pt=(a,rr)=>[cx+rr*Math.cos(a),cy+rr*Math.sin(a)];
 const segs=WHEEL.map((w,i)=>{const a0=-Math.PI/2+i*2*Math.PI/N+.012,a1=-Math.PI/2+(i+1)*2*Math.PI/N-.012,am=(a0+a1)/2;const [x0,y0]=pt(a0,R),[x1,y1]=pt(a1,R),[x2,y2]=pt(a1,r0),[x3,y3]=pt(a0,r0);const on=sel.includes(w.id);const [tx,ty]=pt(am,103);const ls=w.l||[w.n];
  return `<g class="wseg${on?' on':''}" role="button" tabindex="0" aria-pressed="${on}" aria-label="${w.n}" data-w="${w.id}" data-wk="${key}" style="--wc:${w.c}"><path d="M${x0.toFixed(1)} ${y0.toFixed(1)}A${R} ${R} 0 0 1 ${x1.toFixed(1)} ${y1.toFixed(1)}L${x2.toFixed(1)} ${y2.toFixed(1)}A${r0} ${r0} 0 0 0 ${x3.toFixed(1)} ${y3.toFixed(1)}Z"/>${ls.map((t,j)=>`<text x="${tx.toFixed(1)}" y="${(ty+(j-(ls.length-1)/2)*15+5).toFixed(1)}" text-anchor="middle">${t}</text>`).join('')}</g>`}).join('');
 return `<div class="wheel-wrap"><svg class="wheel" viewBox="0 0 320 320" role="group" aria-label="Rueda de sabores: toca los que sientas">${segs}<circle cx="160" cy="160" r="42" class="whub"/><text x="160" y="157" text-anchor="middle" class="whub-n">${sel.length}</text><text x="160" y="176" text-anchor="middle" class="whub-t">sabor${sel.length===1?'':'es'}</text></svg></div>`}
function bindWheel(get,set,rerender){$$('.wseg').forEach(g=>{const act=()=>{const k=g.dataset.wk,id=g.dataset.w;const cur=get(k);set(k,cur.includes(id)?cur.filter(x=>x!==id):[...cur,id]);rerender(k,id)};g.addEventListener('click',act);g.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();act()}})})}
const tagChips=ts=>ts.length?`<div class="tagchips">${ts.map(t=>`<span class="tchip" style="--wc:${(WHEEL.find(w=>w.id===t)||{}).c||'#dde3dc'}">${esc(WN(t))}</span>`).join('')}</div>`:'';
/* ---------- hoja de acciones (sheet) ---------- */
let lastFocus=null,closeT=null; /* closeT: el cierre con animación; se cancela al abrir otra hoja o al cerrar al instante, para que no borre la nueva */
function sheet(html,label){clearTimeout(closeT);let el=$('#sheet');if(!el){el=document.createElement('div');el.id='sheet';el.className='sheet';document.body.appendChild(el)}
 lastFocus=document.activeElement;
 el.innerHTML=`<div class="sheet-bg" data-close></div><div class="sheet-panel" role="dialog" aria-modal="true" aria-label="${esc(label)}"><div class="sheet-grip" aria-hidden="true"></div><button class="sheet-x" type="button" data-close aria-label="Cerrar">×</button>${html}</div>`;
 el.hidden=false;document.body.classList.add('sheet-on');requestAnimationFrame(()=>el.classList.add('open'));$$('[data-close]',el).forEach(b=>b.onclick=closeSheet);
 el.querySelectorAll('a[href^="#"]').forEach(a=>a.addEventListener('click',()=>closeSheet()));
 const f=el.querySelector('.sheet-panel select,.sheet-panel input,.sheet-panel a,.sheet-panel button:not([data-close])');setTimeout(()=>f&&f.focus({preventScroll:true}),80);return el}
/* cierra la hoja sin esperar: la usan los cambios de cuenta, para que ningún editor de Mi Hoja quede abierto ni se pise un aviso nuevo */
function closeSheetNow(){clearTimeout(closeT);const el=$('#sheet');if(!el)return;el.classList.remove('open');el.hidden=true;el.innerHTML='';document.body.classList.remove('sheet-on')}
function closeSheet(){const el=$('#sheet');if(!el||el.hidden)return;el.classList.remove('open');document.body.classList.remove('sheet-on');clearTimeout(closeT);closeT=setTimeout(()=>{el.hidden=true;el.innerHTML='';lastFocus&&lastFocus.focus&&lastFocus.focus({preventScroll:true})},200)}
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeSheet()});
window.addEventListener('hashchange',closeSheet);
const MENU=[['#/catalogo','Catálogo','Las vitolas hechas en PR'],['#/artesanos','Artesanos','Manos boricuas'],['#/lugares','Lugares','Lounges y puntos de venta'],['#/eventos','Eventos','Calendario, RSVP y Humo y Tambor'],['#/mihoja','Mi Hoja','Humidor, diario, pasaporte y favoritos'],['#/cata','Cata guiada','Paso a paso, con rueda de sabores'],['#/maridajes','Maridajes','Ron y café de Puerto Rico'],['#/podcast','Escucha en Cigars Podcast','Lanzamientos, reseñas y cultura'],['#/buscar','Buscar','En toda la app, con filtros']];
function openSheet(kind,arg){
 if(kind==='instalar'){const ios=arg==='ios'||arg==='ipad';sheet(`<h2 class="sheet-h">Añadir a tu pantalla</h2><p class="inst-p">${ios?`Toca el botón <b>Compartir</b> ⬆️ ${arg==='ipad'?'arriba':'abajo'} y luego <b>“Añadir a pantalla de inicio”</b>.`:`Abre el menú del navegador (<b>⋮</b> o <b>⋯</b>) y toca <b>“Instalar app”</b> o <b>“Añadir a pantalla de inicio”</b>.`}</p><button type="button" class="lbtn buy inst-ok" data-close>Entendido</button>`,'Añadir a tu pantalla');return}
 if(kind==='menu'){sheet(`<h2 class="sheet-h">Menú</h2><nav class="menu-list" aria-label="Menú">${MENU.map(([h,t,s])=>`<a href="${h}" class="row"><div><div class="t">${t}</div><div class="s">${s}</div></div><span class="go">›</span></a>`).join('')}</nav>`,'Menú');return}
 if(kind==='plus'){sheet(`<h2 class="sheet-h">¿Qué quieres hacer?</h2><div class="menu-list">
  <a href="#/cata" class="row big"><span class="ico">${VBArt.leaf('#8fd162')}</span><div><div class="t">Empezar una cata guiada</div><div class="s">Paso a paso; se guarda en tu diario</div></div></a>
  <button type="button" class="row big" data-sheet="humidor"><span class="ico">${VBArt.leaf('#ffd27a')}</span><div><div class="t">Añadir al humidor</div><div class="s">Del catálogo o uno tuyo, con cantidad y fecha</div></div></button>
  <a href="#/subir" class="row big"><span class="ico">${VBArt.leaf('#ff9a9a')}</span><div><div class="t">Subir una vitola</div><div class="s">Con foto, a tu catálogo personal</div></div></a></div>`,'Acciones');return}
 if(kind==='humidor')return humidorForm(arg);
 if(kind==='share')return shareCard(arg)}
/* ---------- humidor ---------- */
function cigarOptions(sel){const byA={};A.allCigars().forEach(c=>{const n=A.artisanName(c);(byA[n]=byA[n]||[]).push(c)});
 return Object.keys(byA).sort((a,b)=>a.localeCompare(b,'es')).map(n=>`<optgroup label="${esc(n)}">${byA[n].map(c=>`<option value="${esc(c.id)}" ${c.id===sel?'selected':''}>${esc(c.nombre)}</option>`).join('')}</optgroup>`).join('')}
function humidorForm(cid,editId){const it=editId?S().humidor.find(x=>x.id===editId):null;const sel=it?it.cigarId:cid||'';
 const el=sheet(`<h2 class="sheet-h">${it?'Editar en tu humidor':'Añadir al humidor'}</h2><form class="form" id="hForm">
 <div class="field"><label for="hCig">Cigarro</label><select id="hCig"><option value="">Escoge del catálogo…</option>${cigarOptions(sel)}<option value="__otro" ${it&&!it.cigarId?'selected':''}>Otro (escribir)</option></select></div>
 <div class="field" id="hOtroW" ${it&&!it.cigarId?'':'hidden'}><label for="hOtro">Nombre del cigarro</label><input id="hOtro" maxlength="70" value="${esc(it&&!it.cigarId?it.nombre:'')}" placeholder="Ej. Robusto que me regalaron"></div>
 <div class="row2"><div class="field"><label for="hQty">Cantidad</label><div class="qty"><button type="button" data-q="-1" aria-label="Menos">−</button><input id="hQty" type="number" inputmode="numeric" min="1" max="999" value="${it?it.cantidad:1}"><button type="button" data-q="1" aria-label="Más">+</button></div></div>
 <div class="field"><label for="hFecha">Fecha</label><input id="hFecha" type="date" value="${esc(it?it.fecha:hoy())}"></div></div>
 <div class="field"><label for="hNota">Nota (opcional)</label><input id="hNota" maxlength="120" value="${esc(it?it.nota||'':'')}" placeholder="Dónde lo compraste, para cuándo…"></div>
 <button class="btn" type="submit">${it?'Guardar cambios':'Guardar en mi humidor'}</button></form>`,'Añadir al humidor');
 $('#hCig',el).onchange=e=>{$('#hOtroW',el).hidden=e.target.value!=='__otro'};
 $$('[data-q]',el).forEach(b=>b.onclick=()=>{const q=$('#hQty',el);q.value=Math.max(1,Math.min(999,(+q.value||1)+(+b.dataset.q)))});
 $('#hForm',el).onsubmit=e=>{e.preventDefault();const v=$('#hCig',el).value;const otro=$('#hOtro',el).value.trim();
  if(!v||(v==='__otro'&&!otro)){toast('Escoge o escribe el cigarro');return}
  const c=v!=='__otro'?A.cigarById(v):null;const rec={id:it?it.id:uid('h'),cigarId:c?c.id:null,nombre:c?c.nombre:otro,artesano:c?A.artisanName(c):'',cantidad:Math.max(1,Math.min(999,parseInt($('#hQty',el).value)||1)),fecha:$('#hFecha',el).value||hoy(),nota:$('#hNota',el).value.trim(),actualizado:new Date().toISOString()};
  save(s=>{if(it)s.humidor=s.humidor.map(x=>x.id===it.id?rec:x);else{const same=rec.cigarId?s.humidor.find(x=>x.cigarId===rec.cigarId&&x.fecha===rec.fecha):null;if(same){same.cantidad+=rec.cantidad;same.actualizado=rec.actualizado}else s.humidor.unshift(rec)}});
  closeSheet();toast(it?'Humidor actualizado':`Añadido: ${rec.cantidad} × ${rec.nombre}`);if(location.hash.startsWith('#/mihoja'))setTimeout(()=>A.route(),220)}}
/* ---------- respaldo ---------- */
function download(blob,name){const u=URL.createObjectURL(blob);const a=document.createElement('a');a.href=u;a.download=name;a.rel='noopener';document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(u);a.remove()},4000)}
function exportar(){const s=S();const data={app:'La Hoja Boricua',tipo:'respaldo-mi-hoja',schema:SCHEMA,exportado:new Date().toISOString(),url:APP_URL,
 mihoja:{...s,draft:null},extra:{perfil:legacy('perfil'),sugeridas:legacy('sugeridas')||[],subidas:legacy('uploads')||[]}};
 download(new Blob([JSON.stringify(data,null,1)],{type:'application/json'}),`la-hoja-boricua-respaldo-${hoy()}.json`);
 s.respaldo=new Date().toISOString();s.cambios=0;s.recordarDespues=null;write(s);toast('Respaldo descargado ✓');if(location.hash.startsWith('#/mihoja'))setTimeout(()=>A.route(),300)}
const byId=(a,b,key='id')=>{const m=new Map(a.map(x=>[x[key],x]));for(const x of b){if(!x||!x[key])continue;const o=m.get(x[key]);if(!o||(x.actualizado||x.fecha||'')>(o.actualizado||o.fecha||''))m.set(x[key],x)}return [...m.values()]};
function importar(file){const fr=new FileReader();fr.onload=()=>{let j;try{j=JSON.parse(fr.result)}catch(e){toast('Ese archivo no es un respaldo válido');return}
 const m=j&&(j.mihoja||(Array.isArray(j.humidor)&&j));if(!m||(j.app&&j.app!=='La Hoja Boricua')){toast('Ese archivo no es un respaldo de La Hoja Boricua');return}
 const inc=upgrade(JSON.parse(JSON.stringify(m)));const cur=S();try{localStorage.setItem(KEY+'_antes_de_importar',JSON.stringify(cur))}catch(e){}
 const n0={d:cur.diario.length,h:cur.humidor.length};
 save(s=>{s.humidor=byId(s.humidor,inc.humidor);s.diario=byId(s.diario,inc.diario).sort((a,b)=>(b.fecha||'').localeCompare(a.fecha||''));
  for(const k of ['artesanos','cigarros','lugares']){s.pasaporte[k]={...inc.pasaporte[k],...s.pasaporte[k]};s.favs[k]=[...new Set([...s.favs[k],...inc.favs[k]])]}
  s.ratings={...inc.ratings,...s.ratings}});
 const x=j.extra||{};try{if(x.perfil&&!legacy('perfil'))localStorage.setItem('vb_perfil',JSON.stringify(x.perfil));
  if(Array.isArray(x.sugeridas)&&x.sugeridas.length)localStorage.setItem('vb_sugeridas',JSON.stringify(byId(legacy('sugeridas')||[],x.sugeridas)));
  if(Array.isArray(x.subidas)&&x.subidas.length)localStorage.setItem('vb_uploads',JSON.stringify(byId(legacy('uploads')||[],x.subidas)))}catch(e){}
 const s=S();toast(`Importado: +${s.diario.length-n0.d} catas, +${s.humidor.length-n0.h} en humidor`);A.route()};fr.readAsText(file)}
function backupDue(){const s=S();const n=s.diario.length+s.humidor.length+Object.values(s.pasaporte).reduce((t,o)=>t+Object.keys(o).length,0);if(!n||!s.cambios)return false;
 if(s.recordarDespues&&new Date(s.recordarDespues)>new Date())return false;if(!s.respaldo)return s.cambios>=3;return (Date.now()-new Date(s.respaldo))/864e5>=14}
const backupBanner=()=>backupDue()?`<div class="remind" role="note"><p><b>¿Un respaldo?</b> Tus catas y tu humidor viven solo en este teléfono. Guarda una copia por si cambias de cel.</p><div class="remind-b"><button class="lbtn" data-exp type="button">Exportar ahora</button><button class="lbtn ghost" data-snooze type="button">Luego</button></div></div>`:'';
const backupPanel=()=>{const s=S();return `<section class="backup"><div class="section-title"><h2>Respaldo</h2></div><p class="lead" style="margin-top:-4px">Exporta un archivo con tu humidor, diario, pasaporte y favoritos. Para pasarlo a otro teléfono, impórtalo allá: importar suma, no borra.${s.respaldo?` Último respaldo: ${fmtF(s.respaldo)}.`:' Todavía no has hecho uno.'}</p>
 <div class="links"><button class="lbtn" data-exp type="button">⬇︎ Exportar respaldo</button><label class="lbtn" tabindex="0">⬆︎ Importar respaldo<input type="file" accept="application/json,.json" id="impF" class="sr"></label></div><p class="note" style="margin-top:6px">Las fotos de tus subidas se quedan en este teléfono.</p></section>`};
function bindBackup(){$$('[data-exp]').forEach(b=>b.onclick=exportar);$$('[data-snooze]').forEach(b=>b.onclick=()=>{const s=S();s.recordarDespues=new Date(Date.now()+7*864e5).toISOString();write(s);b.closest('.remind').remove()});const f=$('#impF');if(f)f.onchange=e=>{const x=e.target.files&&e.target.files[0];if(x)importar(x);e.target.value=''}}
/* ---------- cuenta (LHB-25): la lógica vive en cuenta.js; aquí Clerk, las pantallas y el perfil ---------- */
const CLERK=location.hostname==='lahojaboricua.com'?{pk:'pk_live_Y2xlcmsubGFob2phYm9yaWN1YS5jb20k',fapi:'clerk.lahojaboricua.com'}:{pk:'pk_test_ZGFyaW5nLWVhZ2xlLTgzOTQuY2xlcmsuYWNjb3VudHMuZGV2JA',fapi:'daring-eagle-8394.clerk.accounts.dev'};
const HANDLE_RE=/^[a-z0-9_]{3,20}$/;
/* el perfil visto la última vez, para abrir Mi Hoja sin conexión; se borra al salir */
const acct={get:()=>A.LS.get('cuenta',null),set:v=>A.LS.set('cuenta',v),clear:()=>{try{localStorage.removeItem('vb_cuenta')}catch(e){}}};
/* la acción que el usuario empezó, para retomarla si Google lo manda a otra página y vuelve */
const intent={get:()=>{try{return JSON.parse(sessionStorage.getItem('lhb_intent'))}catch(e){return null}},set:v=>{try{sessionStorage.setItem('lhb_intent',JSON.stringify(v))}catch(e){}},clear:()=>{try{sessionStorage.removeItem('lhb_intent')}catch(e){}}};
let clerkP=null;
const script=(src,pk)=>new Promise((ok,no)=>{const s=document.createElement('script');s.async=true;s.crossOrigin='anonymous';if(pk)s.dataset.clerkPublishableKey=pk;s.src=src;s.onload=ok;s.onerror=no;document.head.appendChild(s)});
/* clerk-js 6 trae la lógica; las pantallas de entrar vienen aparte en @clerk/ui y se le pasan al cargar */
function clerk(){if(clerkP)return clerkP;
 clerkP=Promise.all([script(`https://${CLERK.fapi}/npm/@clerk/clerk-js@6/dist/clerk.browser.js`,CLERK.pk),script(`https://${CLERK.fapi}/npm/@clerk/ui@1/dist/ui.browser.js`)])
  .then(()=>window.Clerk.load({ui:{ClerkUI:window.__internal_ClerkUICtor}})).then(()=>window.Clerk).catch(e=>{clerkP=null;throw e});
 return clerkP}
async function api(C,method,path,body,uid){const t=await C.session.getToken();if(uid&&(!C.user||C.user.id!==uid))throw new Error('account-changed');const r=await fetch(path,{method,headers:{Authorization:'Bearer '+t,...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined});let j={};try{j=await r.json()}catch(e){}return {status:r.status,body:j}}
function accountCard(h,p,b){view.innerHTML=`<header class="mh-head"><div class="eyebrow">Mi Hoja</div><h1>Lo <em>tuyo</em></h1></header><div class="empty acct"><p><b>${h}</b></p><p>${p}</p>${b?`<button class="btn" type="button" id="acctBtn">${esc(b.label)}</button>`:''}</div>`;if(b)$('#acctBtn').onclick=b.on}
function accountNotice(h,p,b){const el=sheet(`<h2 class="sheet-h">${esc(h)}</h2><p>${esc(p)}</p>${b?`<button class="btn" type="button" id="acctNB">${esc(b.label)}</button>`:''}`,h);
 if(b)el.querySelector('#acctNB').onclick=()=>{closeSheetNow();b.on()}}
const OB_ERR={'handle-invalid':'Tu @ debe tener de 3 a 20 letras (a-z), números o _.','handle-reserved':'Ese @ está reservado. Escoge otro.','handle-taken':'Ese @ ya lo tiene otra persona. Escoge otro.','age-required':'Tienes que confirmar que tienes 21 años o más.','bio-long':'La descripción puede tener hasta 160 caracteres.','display_name-long':'El nombre puede tener hasta 50 caracteres.','favorite_brand-long':'La marca puede tener hasta 60 caracteres.','recheck':'Tu perfil ya existe, pero no pudimos abrirlo. Intenta otra vez.'};
function onboardingForm(submit){const marcas=[...new Set((D().artesanos||[]).map(a=>a.nombre))].sort((a,b)=>a.localeCompare(b,'es'));
 view.innerHTML=`<header class="mh-head"><div class="eyebrow">Mi Hoja</div><h1>Tu <em>perfil</em></h1></header>
 <form class="form" id="obForm" novalidate>
 <div class="field"><label for="obH">Tu @ (nombre de usuario)</label><input id="obH" required minlength="3" maxlength="20" autocapitalize="none" autocomplete="username" spellcheck="false" placeholder="ej. tabaquero_pr"><p class="hint">De 3 a 20 letras (a-z), números o _. Lo pueden ver los demás.</p></div>
 <div class="field"><label for="obN">Tu nombre (opcional)</label><input id="obN" maxlength="50" autocomplete="name"></div>
 <div class="field"><label for="obB">Una descripción corta (opcional)</label><textarea id="obB" maxlength="160" rows="3"></textarea><p class="hint"><span id="obBn">0</span>/160</p></div>
 <div class="field"><label for="obM">Tu marca favorita (opcional)</label><input id="obM" maxlength="60" list="obML"><datalist id="obML">${marcas.map(m=>`<option value="${esc(m)}">`).join('')}</datalist></div>
 <label class="check"><input type="checkbox" id="obAge" required> Tengo 21 años o más.</label>
 <p class="hint">Lee qué guardamos y qué ven los demás en <a href="/privacidad">Privacidad y cuenta</a>.</p>
 <p class="hint" id="obErr" role="alert" hidden></p>
 <button class="btn" type="submit" id="obGo">Crear mi perfil</button></form>`;
 const form=$('#obForm');
 const err=m=>{const e=$('#obErr');if(!e)return;e.textContent=m||'';e.hidden=!m};
 $('#obB').oninput=e=>{const n=$('#obBn');if(n)n.textContent=[...e.target.value].length};
 form.onsubmit=async e=>{e.preventDefault();const h=$('#obH').value.trim().toLowerCase();
  if(!HANDLE_RE.test(h))return err(OB_ERR['handle-invalid']);if(!$('#obAge').checked)return err(OB_ERR['age-required']);
  err('');$('#obGo').disabled=true;
  let r;try{r=await submit({handle:h,display_name:$('#obN').value,bio:$('#obB').value,favorite_brand:$('#obM').value})}catch(x){r={error:'generic'}}
  if(!r||r.stale||$('#obForm')!==form)return;
  $('#obGo').disabled=false;if(r.error)err(OB_ERR[r.error]||'No pudimos crear tu perfil. Intenta otra vez.')}}
const CUENTA=window.LHB_CUENTA({clerk,api,here:()=>location.hash,reroute:()=>A.route(),store:acct,intent,openSignIn:C=>C.openSignIn({forceRedirectUrl:location.href,signUpForceRedirectUrl:location.href}),ui:{card:accountCard,notice:accountNotice,onboarding:onboardingForm,toast,closeAll:closeSheetNow}});
/* abre Mi Hoja solo con sesión y perfil; otras páginas usan requireAccount(go,{inPlace:true,act:'nombre'}) y registerAction('nombre',go) */
const requireAccount=(go,o)=>CUENTA.require(go,o);
/* ---------- acciones que piden cuenta (LHB-48) ----------
   Corazón, sello, estrella y humidor se hacen solo con sesión y perfil; ver la página no pide nada. El argumento viaja como texto (también por sessionStorage al volver de Google) y se valida aquí. */
const txt=v=>typeof v==='string'&&v.length<200;
const split2=v=>txt(v)?v.split(/:(.*)/s):[];
const own=(o,k)=>Object.prototype.hasOwnProperty.call(o,k);
const keepScroll=()=>{const y=scrollY;A.route();scrollTo(0,y)};
const ACTIONS={
 fav(arg){const [k,id]=split2(arg);if(!id||id in Object.prototype||!own(S().favs,k)||!Array.isArray(S().favs[k]))return;
  const on=toggleFav(k,id);
  $$(`[data-fav="${CSS.escape(arg)}"]`).forEach(b=>{b.setAttribute('aria-pressed',on);b.setAttribute('aria-label',(on?'Quitar de':'Guardar en')+' favoritos');b.firstChild.textContent=on?'♥':'♡'});toast(on?window.LHB_I18N.t('fav.on'):window.LHB_I18N.t('fav.off'));if(/^#\/c\//.test(location.hash))keepScroll()},
 stamp(arg,st){const [k,id]=split2(arg);if(!id||id in Object.prototype||!own(S().pasaporte,k)||typeof S().pasaporte[k]!=='object')return;st=st||$(`[data-stamp="${CSS.escape(arg)}"]`);
  const before=badgeIds(),r0=ruta();const on=toggleStamp(k,id),r1=ruta(),nz=r1.ok.find(x=>!r0.ok.includes(x));RLIT=r1.lit.find(x=>!r0.lit.includes(x));if(RLIT&&(st&&st.closest('.rl')))closeSheet();if(nz)setTimeout(()=>zonaSheet(nz),1500);
  $$(`[data-stamp="${CSS.escape(arg)}"]`).forEach(b=>{b.setAttribute('aria-pressed',on);const sp=b.querySelector(':scope>span:last-child');if(sp)sp.textContent=b.classList.contains('stamp')?(on?'Sellado '+fmtF(hoy()):'Sin sello'):(on?'Sellado':'Sellar pasaporte')});
  const nb=badgeIds().filter(x=>!before.includes(x));if(nb.length){const b=BADGES.find(x=>x.id===nb[0]);toast('🏅 Nueva insignia: '+b.n)}else toast(on?'Sello puesto en tu pasaporte':'Sello quitado');
  if(/^#\/(mihoja\/pasaporte|lugares\/ruta)/.test(location.hash))setTimeout(()=>{const y=scrollY;A.route();scrollTo(0,y)},350)},
 rate(arg){const [id,n]=split2(arg);const v=+n;if(!id||id in Object.prototype||!Number.isInteger(v)||v<1||v>5)return;setRating(id,v);keepScroll()},
 humidor(arg){openSheet('humidor',txt(arg)?arg:undefined)}
};
Object.keys(ACTIONS).forEach(k=>CUENTA.register(k,arg=>ACTIONS[k](arg)));
const gate=(act,arg,el)=>CUENTA.quick(()=>ACTIONS[act](arg,el),{inPlace:true,act,arg});
setTimeout(()=>CUENTA.resume(),0);
/* ---------- Mi Hoja ---------- */
const SUBS=[['humidor','Humidor'],['diario','Diario'],['pasaporte','Pasaporte'],['favoritos','Favoritos'],['perfil','Perfil']];
const subnav=cur=>`<header class="mh-head"><div class="eyebrow">Mi Hoja</div><h1>Lo <em>tuyo</em></h1></header><nav class="subnav" aria-label="Mi Hoja">${SUBS.map(([k,n])=>`<a href="#/mihoja/${k}" ${k===cur?'aria-current="page"':''}>${n}</a>`).join('')}</nav>${backupBanner()}`;
function vMiHoja(sub){requireAccount(()=>vMiHojaIn(sub))}
function vMiHojaIn(sub){sub=sub||'humidor';if(sub==='perfil'){A.vPerfil();bindBackup();return}
 ({humidor:vHumidor,diario:vDiario,pasaporte:vPasaporte,favoritos:vFavoritos}[sub]||vHumidor)();bindBackup()}
function vHumidor(){const s=S();const tot=s.humidor.reduce((t,x)=>t+(+x.cantidad||0),0);
 view.innerHTML=`${subnav('humidor')}
 <div class="hum-sum"><div class="stat"><b>${tot}</b><span>cigarros</span></div><div class="stat"><b>${s.humidor.length}</b><span>vitolas</span></div><button class="btn" type="button" data-sheet="humidor">+ Añadir</button></div>
 ${s.humidor.length?`<div class="list">${s.humidor.map(h=>{const c=h.cigarId&&A.cigarById(h.cigarId);return `<div class="row hum">
  ${c?`<a class="hum-ph" href="#/c/${encodeURIComponent(c.id)}" aria-label="Ver ${esc(c.nombre)}">${A.cigarSVG(c)}</a>`:`<span class="hum-ph custom" aria-hidden="true">${VBArt.leaf('#a9c487')}</span>`}
  <div class="hum-b"><div class="t">${esc(h.nombre)}</div><div class="s">${h.artesano?esc(h.artesano)+' · ':''}${c?'':'Tuyo · '}desde ${fmtF(h.fecha)}</div>${h.nota?`<div class="s">${esc(h.nota)}</div>`:''}
  <div class="hum-act"><div class="qty sm"><button type="button" data-hq="${h.id}:-1" aria-label="Uno menos de ${esc(h.nombre)}">−</button><span aria-live="polite">${h.cantidad}</span><button type="button" data-hq="${h.id}:1" aria-label="Uno más de ${esc(h.nombre)}">+</button></div>
  <button class="mini" type="button" data-hcata="${h.id}">Catar</button><button class="mini" type="button" data-hedit="${h.id}">Editar</button><button class="mini x" type="button" data-hdel="${h.id}" aria-label="Quitar ${esc(h.nombre)} del humidor">✕</button></div></div></div>`}).join('')}</div>`
 :`<div class="empty">Tu humidor está vacío.<br>Añade cigarros del catálogo o uno tuyo.</div>`}
 ${backupPanel()}`;
 const again=()=>{const y=scrollY;vHumidor();bindBackup();scrollTo(0,y)};
 $$('[data-hq]').forEach(b=>b.onclick=()=>{const [id,d]=b.dataset.hq.split(':');const h0=S().humidor.find(x=>x.id===id);if(!h0)return;
  if(+d<0&&h0.cantidad<=1){if(confirm(`¿Se acabaron los ${h0.nombre}? Se quita del humidor.`)){save(s=>{s.humidor=s.humidor.filter(x=>x.id!==id)})}again();return}
  save(s=>{const h=s.humidor.find(x=>x.id===id);h.cantidad=Math.max(1,(+h.cantidad||0)+(+d));h.actualizado=new Date().toISOString()});again()});
 $$('[data-hedit]').forEach(b=>b.onclick=()=>humidorForm('',b.dataset.hedit));
 $$('[data-hdel]').forEach(b=>b.onclick=()=>{const h=S().humidor.find(x=>x.id===b.dataset.hdel);if(h&&confirm(`¿Quitar ${h.nombre} del humidor?`)){save(s=>{s.humidor=s.humidor.filter(x=>x.id!==h.id)});again()}});
 $$('[data-hcata]').forEach(b=>b.onclick=()=>{const h=S().humidor.find(x=>x.id===b.dataset.hcata);if(h)startCata(h.cigarId||'',h.nombre)})}
const stars=n=>`<span class="stars-ro" role="img" aria-label="${n} de 5 estrellas">${'★'.repeat(n)}<span>${'★'.repeat(5-n)}</span></span>`;
function vDiario(){const s=S();
 view.innerHTML=`${subnav('diario')}
 <a class="btn cta" href="#/cata">${VBArt.leaf('#8fd162','btn-leaf')}<span>Nueva cata guiada</span></a>
 ${s.diario.length?s.diario.map(d=>`<article class="dentry"><div class="dhead"><div><div class="t">${esc(d.nombre)}</div><div class="s">${fmtF(d.fecha)}${d.artesano?' · '+esc(d.artesano):''}</div></div>${stars(d.rating||0)}</div>
  ${tagChips(d.tags||[])}${d.notas?`<p class="dnote">${esc(d.notas)}</p>`:''}
  <details><summary>Detalle de la cata</summary><dl class="dl">${[['Fortaleza',d.fortaleza],['Cuerpo',d.cuerpo],['Final',d.final],['Capa',d.capa],['Tiro',d.tiro],['Quemada',d.quemada]].filter(x=>x[1]).map(([k,v])=>`<dt>${k}</dt><dd>${esc(v)}</dd>`).join('')}
  ${(d.pasos||[]).filter(p=>(p.tags&&p.tags.length)||p.nota).map(p=>`<dt>${esc(p.paso)}</dt><dd>${esc([(p.tags||[]).map(WN).join(', '),p.nota].filter(Boolean).join(' — '))}</dd>`).join('')}</dl>
  <div class="links">${d.cigarId&&A.cigarById(d.cigarId)?`<a class="lbtn" href="#/c/${encodeURIComponent(d.cigarId)}">Ver cigarro</a>`:''}<button class="lbtn ghost" type="button" data-ddel="${d.id}">Borrar entrada</button></div></details></article>`).join('')
 :`<div class="empty">Tu diario está vacío.<br>Haz una cata guiada y se guarda aquí.</div>`}
 ${backupPanel()}`;
 $$('[data-ddel]').forEach(b=>b.onclick=()=>{if(confirm('¿Borrar esta entrada del diario?')){save(s=>{s.diario=s.diario.filter(x=>x.id!==b.dataset.ddel)});vDiario();bindBackup()}})}
/* pasaporte */
const BADGES=[{id:'primer',n:'Primer sello',d:'Tu primer sello',k:'total',m:1,c:'#8fd162'},
 {id:'catador',n:'Catador',d:'5 cigarros catados',k:'cigarros',m:5,c:'#ffd27a'},
 {id:'artesanos5',n:'Amigo artesano',d:'5 artesanos probados',k:'artesanos',m:5,c:'#ff9a9a'},
 {id:'lugares5',n:'De jangueo',d:'5 lugares visitados',k:'lugares',m:5,c:'#7fb0ff'},
 {id:'catador15',n:'Paladar boricua',d:'15 cigarros catados',k:'cigarros',m:15,c:'#ff8a80'},
 {id:'lugares15',n:'Isla recorrida',d:'15 lugares visitados',k:'lugares',m:15,c:'#8fb8ff'},
 {id:'mitad',n:'Medio pasaporte',d:'La mitad de todos los sellos',k:'total',m:'half',c:'#c5cdf5'},
 {id:'artesanosAll',n:'Todos los artesanos',d:'Probaste a todos los artesanos',k:'artesanos',m:'all',c:'#a9c487'}];
function passCounts(){const s=S(),d=D();const valid={artesanos:new Set(d.artesanos.map(x=>x.id)),cigarros:new Set(d.cigarros.map(x=>x.id)),lugares:new Set(d.places.map(x=>x.id))};
 const c={};for(const k of ['artesanos','cigarros','lugares'])c[k]=Object.keys(s.pasaporte[k]).filter(id=>valid[k].has(id)).length;c.total=c.artesanos+c.cigarros+c.lugares;
 const all={artesanos:valid.artesanos.size,cigarros:valid.cigarros.size,lugares:valid.lugares.size};all.total=all.artesanos+all.cigarros+all.lugares;return{c,all}}
const badgeTarget=(b,all)=>b.m==='all'?all[b.k]:b.m==='half'?Math.ceil(all.total/2):b.m;
function badgeIds(){const {c,all}=passCounts();return BADGES.filter(b=>badgeTarget(b,all)>0&&c[b.k]>=badgeTarget(b,all)).map(b=>b.id)}
/* ruta del tabaco (v18): vive en Lugares → Ruta; el pasaporte comparte los sellos */
const ZN={M:'Metro',N:'Norte',E:'Este',C:'Centro',S:'Sur',O:'Oeste'};
const TW='San Juan,M,18.47,-66.11|Guaynabo,M,18.36,-66.11|Bayamón,M,18.4,-66.16|Trujillo Alto,M,18.35,-66.01|Toa Baja,M,18.44,-66.25|Toa Alta,M,18.39,-66.25|Arecibo,N,18.47,-66.72|Isabela,N,18.5,-67.02|Río Grande,E,18.38,-65.83|Luquillo,E,18.37,-65.72|Fajardo,E,18.33,-65.65|Humacao,E,18.15,-65.83|Caguas,C,18.23,-66.05|Aguas Buenas,C,18.26,-66.1|Cidra,C,18.18,-66.16|Adjuntas,C,18.16,-66.72|Villalba,C,18.13,-66.49|Coamo,S,18.08,-66.36|Ponce,S,18.01,-66.61|Juana Díaz,S,18.05,-66.51|Santa Isabel,S,17.97,-66.4|Mayagüez,O,18.2,-67.14|Rincón,O,18.34,-67.25|Aguadilla,O,18.43,-67.15|Lares,O,18.29,-66.88'.split('|').map(s=>{const [n,z,la,lo]=s.split(',');return{n,z,la:+la,lo:+lo}});
const townOf=p=>{let b,bi=1e3;for(const t of TW){const i=String(p||'').indexOf(t.n);if(i>=0&&i<bi){bi=i;b=t.n}}return b};
function ruta(){const d=D(),s=S().pasaporte,m={},z={};
 const add=(k,x,p)=>{const t=townOf(p);if(t)(m[t]=m[t]||[]).push({k,x,on:!!s[k][x.id]})};
 d.artesanos.forEach(x=>add('artesanos',x,x.pueblo));d.cigarros.forEach(x=>{const a=A.artisanById(x.artesano_id);add('cigarros',x,x.pueblo||a&&a.pueblo)});d.places.forEach(x=>add('lugares',x,x.pueblo));
 const ts=TW.filter(t=>m[t.n]).map(t=>({...t,it:m[t.n],on:m[t.n].some(i=>i.on)}));ts.forEach(t=>(z[t.z]=z[t.z]||[]).push(t));
 return{ts,z,lit:ts.filter(t=>t.on).map(t=>t.n),ok:Object.keys(z).filter(k=>z[k].every(t=>t.on))}}
let RLIT;const HJ='<path d="M0-5C4-3 4 2 0 5C-4 2-4-3 0-5Z"/>';
const zSello=(k,ok,sub)=>`<div class="zs${ok?' ok':''}"><svg viewBox="-6-6 12 12" aria-hidden="true">${HJ}</svg><b>${ZN[k]}</b><small>${sub}</small></div>`;
function vRuta(){const {ts,z,lit}=ruta();return `<section class="ruta"><div class="ruta-h"><h2>La Ruta <em>del Tabaco</em></h2><p><b>${lit.length}</b> de ${ts.length} pueblos</p></div><p class="rhint">Sella artesanos, cigarros o lugares y su pueblo se enciende. Toca un pueblo para ver qué te falta.</p>
 <div class="map-wrap rmw"><div id="map" role="region" aria-label="Mapa de la Ruta del Tabaco: ${lit.length} de ${ts.length} pueblos encendidos"></div></div>
 <div class="zonas">${Object.keys(ZN).map(k=>{const l=z[k]||[],c=l.filter(t=>t.on).length;return `<div class="zona">${zSello(k,c==l.length,c==l.length?'¡Completa!':c+' de '+l.length)}<div class="zts">${l.map(t=>`<button type="button" class="zt${t.on?' on':''}" data-town="${t.n}">${t.n}</button>`).join('')}</div></div>`}).join('')}</div></section>`}
function rutaCard(){const {ts,lit}=ruta();return `<a class="ruta-card" href="#/lugares/ruta"><span class="bico">${VBArt.leaf(lit.length?'#8fd162':'#2c5a3d')}</span><div><b>La Ruta del Tabaco</b><small>${lit.length} de ${ts.length} pueblos encendidos</small><span>Ver mi Ruta del Tabaco →</span></div></a>`}
function townSheet(n){const t=ruta().ts.find(x=>x.n==n);if(!t)return;const it=[...t.it].sort((a,b)=>b.on-a.on),c=it.filter(i=>i.on).length,L={artesanos:'Artesano',cigarros:'Cigarro',lugares:'Lugar'};
 sheet(`<h2 class="sheet-h">${t.on?'🌿 ':''}${esc(n)}</h2><p class="rsub">Zona ${ZN[t.z]} · ${c} de ${it.length} sellados${c<it.length?` · te faltan ${it.length-c}`:''}</p><div class="rl">${it.map(i=>`<div class="ri"><div><b>${esc(i.x.nombre)}</b><small>${L[i.k]}${i.on?' · sellado '+fmtF(S().pasaporte[i.k][i.x.id]):' · te falta'}</small></div>${stampBtn(i.k,i.x.id)}</div>`).join('')}</div>`,n)}
function zonaSheet(k){const l=ruta().z[k];sheet(`<div class="zcel">${zSello(k,1,'Zona completa')}<h2 class="sheet-h">¡Zona ${ZN[k]} completa!</h2><p>Sellaste los ${l.length} pueblos: ${l.map(t=>t.n).join(', ')}. Este sello especial ya está en tus insignias.</p><button type="button" class="btn" data-close>¡Wepa!</button></div>`,'Zona completa')}
function vPasaporte(){const {c,all}=passCounts(),ru=ruta();const d=D();const got=badgeIds();const pct=all.total?Math.round(c.total*100/all.total):0;
 const sec=(k,title,items,name,sub)=>`<div class="section-title"><h2>${title}</h2><span class="count">${c[k]} de ${all[k]}</span></div><div class="pbar" role="progressbar" aria-label="${title}: ${c[k]} de ${all[k]}" aria-valuemin="0" aria-valuemax="${all[k]}" aria-valuenow="${c[k]}"><i style="width:${all[k]?c[k]*100/all[k]:0}%"></i></div>
  <div class="stamps">${items.map(x=>{const on=isStamp(k,x.id);return `<button type="button" class="stamp" data-stamp="${k}:${esc(x.id)}" aria-pressed="${on}">${A.mono(name(x),44)}<b>${esc(name(x))}</b><small>${esc(sub(x)||'')}</small><span>${on?'Sellado '+fmtF(S().pasaporte[k][x.id]):'Sin sello'}</span></button>`}).join('')}</div>`;
 view.innerHTML=`${subnav('pasaporte')}
 <section class="pass-hero"><div class="pass-ring" style="--p:${pct}" role="img" aria-label="${pct}% del pasaporte"><b>${pct}%</b><span>${c.total} de ${all.total}</span></div><div><h2>Pasaporte <em>Boricua</em></h2><p>Marca los artesanos que has probado, los cigarros que has catado y los lugares que has visitado. Toca para sellar.</p></div></section>
 ${rutaCard()}
 <div class="section-title"><h2>Insignias</h2><span class="count">${got.length+ru.ok.length} de ${BADGES.length+6}</span></div>
 <div class="badges">${BADGES.map(b=>{const t=badgeTarget(b,all),on=got.includes(b.id);return `<div class="badge ${on?'on':''}" style="--bc:${b.c}"><div class="bico">${VBArt.leaf(on?b.c:'#2c5a3d')}</div><b>${b.n}</b><small>${b.d}</small><span>${on?'¡Lograda!':`${Math.min(c[b.k],t)} de ${t}`}</span></div>`}).join('')}${Object.keys(ZN).map(k=>{const l=ru.z[k]||[],n=l.filter(t=>t.on).length,on=ru.ok.includes(k);return `<div class="badge zb ${on?'on':''}" style="--bc:#ED0000"><div class="bico">${VBArt.leaf(on?'#ED0000':'#2c5a3d')}</div><b>Zona ${ZN[k]}</b><small>Ruta del Tabaco: todos sus pueblos</small><span>${on?'¡Lograda!':`${n} de ${l.length}`}</span></div>`}).join('')}</div>
 ${sec('artesanos','Artesanos',d.artesanos,x=>x.nombre,x=>x.pueblo)}
 ${sec('cigarros','Cigarros',d.cigarros,x=>x.nombre,x=>A.artisanName(x))}
 ${sec('lugares','Lugares',d.places,x=>x.nombre,x=>x.pueblo)}
 ${backupPanel()}`}
function vFavoritos(){const s=S(),d=D();const cs=s.favs.cigarros.map(A.cigarById).filter(Boolean),as=s.favs.artesanos.map(A.artisanById).filter(Boolean),ps=s.favs.lugares.map(id=>d.places.find(p=>p.id===id)).filter(Boolean);
 view.innerHTML=`${subnav('favoritos')}
 <div class="section-title"><h2>Cigarros</h2><span class="count">${cs.length}</span></div>${cs.length?`<div class="grid">${cs.map(A.cigarCard).join('')}</div>`:'<div class="empty">Toca ♡ en un cigarro para guardarlo.</div>'}
 <div class="section-title"><h2>Artesanos</h2><span class="count">${as.length}</span></div>${as.length?`<div class="list">${as.map(artRow).join('')}</div>`:'<div class="empty">Toca ♡ en el perfil de un artesano.</div>'}
 <div class="section-title"><h2>Lugares</h2><span class="count">${ps.length}</span></div>${ps.length?`<div class="list">${ps.map(placeRow).join('')}</div>`:'<div class="empty">Toca ♡ en un lugar de la lista o del mapa.</div>'}
 ${backupPanel()}`;A.hydrate()}
const artRow=a=>`<div class="row"><a href="#/a/${encodeURIComponent(a.id)}" class="rowlink">${A.mono(a.nombre,42)}<div><div class="t">${esc(a.nombre)}</div><div class="s">${esc(a.pueblo||'')}${municipio(a.pueblo)?' · '+region(municipio(a.pueblo)):''}</div></div></a>${favBtn('artesanos',a.id,'icon')}</div>`;
const placeRow=p=>`<div class="row"><a class="rowlink" href="${esc(A.goLink(p))}" target="_blank" rel="noopener"><span class="list-leaf">${VBArt.leaf(p.categoria==='venta'?'#ffd27a':'#8fd162')}</span><div><div class="t">${esc(p.nombre)}</div><div class="s">${esc(p.tipo||'')} · ${esc(p.pueblo||'')} · Cómo llegar</div></div></a>${favBtn('lugares',p.id,'icon')}</div>`;
/* ---------- cata guiada ---------- */
const FORT5=['Suave','Suave a media','Media','Media a fuerte','Fuerte'];const CUER5=['Ligero','Ligero a medio','Medio','Medio a completo','Completo'];
const PASOS=[
 {id:'cigarro',t:'Tu cigarro',e:'Escoge el cigarro que vas a catar. Busca un lugar tranquilo, sin olores fuertes, y ten agua a la mano para limpiar el paladar.'},
 {id:'visual',t:'Visual y capa',e:'Mira la capa con buena luz: el color, el brillo de sus aceites, las venas y si es pareja. Pálpalo suave de la cabeza al pie; debe sentirse uniforme, sin partes blandas ni duras. El color de la capa no dice por sí solo cuánta Fortaleza tiene.'},
 {id:'aroma',t:'Aroma en frío',e:'Antes de encender, huele la capa y el pie. Corta la cabeza y da una calada en frío, sin fuego: así pruebas el tiro y sientes los primeros sabores del tabaco.',w:'aroma'},
 {id:'encendido',t:'Encendido',e:'Tuesta el pie con la llama cerca pero sin tocarlo, girando el cigarro hasta que el borde se vea parejo. Usa fósforo de madera, cedro o llama de butano; los encendedores de gasolina dejan olor. Las primeras caladas pueden ser más intensas.'},
 {id:'tercio1',t:'Primer tercio',e:'Fuma despacio, más o menos una calada por minuto, para que no se caliente. El humo no se inhala: el sabor se aprecia en la boca. Si sueltas un poco de humo por la nariz (retrohalación) vas a notar más aromas.',w:'tercio1'},
 {id:'tercio2',t:'Segundo tercio',e:'A mitad del cigarro muchas ligas cambian: puede aparecer más dulzor, más especia o más cuerpo. Anota si los sabores evolucionan o se mantienen, y fíjate en la ceniza y en que la quemada vaya pareja.',w:'tercio2'},
 {id:'tercio3',t:'Tercer tercio',e:'El último tercio suele ser más intenso y concentrado. Si se pone amargo o muy caliente, baja el ritmo. No hay que fumarlo hasta el final: termina cuando deje de disfrutarse.',w:'tercio3'},
 {id:'fortaleza',t:'Fortaleza',e:'La Fortaleza es el efecto de la nicotina que sientes en el cuerpo, no el sabor. Va de suave a fuerte. Un cigarro oscuro no siempre tiene más Fortaleza.'},
 {id:'cuerpo',t:'Cuerpo',e:'El cuerpo es la densidad y el peso del humo en la boca, de ligero a completo, como la diferencia entre leche descremada y crema. Es distinto de la Fortaleza: un cigarro puede tener mucho cuerpo y Fortaleza media.'},
 {id:'final',t:'Final',e:'El final es lo que se queda en la boca después de soltar el humo: cuánto dura y qué sabor deja. Un buen final es limpio y agradable, sin amargor ni aspereza.',w:'final'},
 {id:'resumen',t:'Tu nota',e:'Ponle tu calificación y una nota corta. Todo se guarda en tu diario, en este teléfono.'}];
const NEWDRAFT=(cid,nombre)=>({paso:0,cigarId:cid||'',nombre:nombre||'',capa:'',aspecto:[],tiro:'',quemadaIni:'',ceniza:'',quemada:'',largo:'',fortaleza:'',cuerpo:'',rating:0,notaFinal:'',sellar:true,tags:{aroma:[],tercio1:[],tercio2:[],tercio3:[],final:[]},notas:{},inicio:new Date().toISOString()});
let CD=null;
function persistDraft(){const s=S();s.draft=CD;write(s)}
function startCata(cid,nombre){CD=NEWDRAFT(cid,nombre);if(cid||nombre)CD.paso=1;persistDraft();if(location.hash!=='#/cata')location.hash='#/cata';else renderCata()}
function vCata(cid){const dr=S().draft;
 if(cid&&dr&&dr.paso>0&&dr.cigarId!==cid){const c=A.cigarById(cid);view.innerHTML=`<div class="cata"><div class="eyebrow">Cata guiada</div><h1>Tienes una cata <em>a medias</em></h1><p class="lead">${esc(dr.nombre||'Sin nombre')} va por el paso ${dr.paso} de ${PASOS.length-1}.</p><div class="stack"><button class="btn" id="cCont" type="button">Seguir con ${esc(dr.nombre||'esa cata')}</button><button class="btn secondary" id="cNew" type="button">Empezar ${esc(c?c.nombre:'otra')}</button></div></div>`;
  $('#cCont').onclick=()=>{CD=dr;location.hash='#/cata'};$('#cNew').onclick=()=>{startCata(cid,c?c.nombre:'')};return}
 if(cid&&(!dr||dr.cigarId!==cid)){const c=A.cigarById(cid);CD=NEWDRAFT(cid,c?c.nombre:'');CD.paso=1;persistDraft()}else CD=dr?normDraft(dr):NEWDRAFT();renderCata()}
const normDraft=d=>{const n=NEWDRAFT();return {...n,...d,tags:{...n.tags,...(d.tags||{})},notas:d.notas||{}}};
const seg=(key,opts,cur,label)=>`<div class="seg wrap" role="group" aria-label="${label}">${opts.map(o=>`<button type="button" data-set="${key}" data-v="${esc(o)}" aria-pressed="${cur===o}">${esc(o)}</button>`).join('')}</div>`;
const multi=(key,opts,cur,label)=>`<div class="chips wrapc" role="group" aria-label="${label}">${opts.map(o=>`<button type="button" class="chip" data-tog="${key}" data-v="${esc(o)}" aria-pressed="${cur.includes(o)}">${esc(o)}</button>`).join('')}</div>`;
const noteF=(id,ph)=>`<div class="field"><label for="cn_${id}">Tus notas (opcional)</label><textarea id="cn_${id}" data-note="${id}" maxlength="400" rows="2" placeholder="${ph||'Lo que sientes, con tus palabras'}">${esc(CD.notas[id]||'')}</textarea></div>`;
const allTags=()=>[...new Set(Object.values(CD.tags).flat())];
function stepBody(p){const c=CD.cigarId&&A.cigarById(CD.cigarId);switch(p.id){
 case 'cigarro':return `<div class="field"><label for="cCig">Del catálogo</label><select id="cCig"><option value="">Escoge…</option>${cigarOptions(CD.cigarId)}</select></div><div class="or">o</div><div class="field"><label for="cOtro">Escribe otro cigarro</label><input id="cOtro" maxlength="70" value="${esc(!CD.cigarId?CD.nombre:'')}" placeholder="Ej. Toro de la casa"></div>`;
 case 'visual':return `<div class="field"><label>Color de la capa</label>${seg('capa',['Claro','Natural','Colorado','Maduro','Oscuro'],CD.capa,'Color de la capa')}</div><div class="field"><label>Al ojo y al tacto</label>${multi('aspecto',['Aceitosa','Brillo sedoso','Venas finas','Venas marcadas','Pareja al tacto','Algo blanda','Algo dura'],CD.aspecto,'Aspecto')}</div>${noteF('visual')}`;
 case 'aroma':return `<p class="hint">Toca en la rueda los aromas que reconozcas.</p>${wheel(CD.tags.aroma,'aroma')}<div class="field"><label>El tiro en frío</label>${seg('tiro',['Fácil','Justo','Apretado'],CD.tiro,'Tiro')}</div>${noteF('aroma')}`;
 case 'encendido':return `<div class="field"><label>¿Cómo prendió?</label>${seg('quemadaIni',['Parejo','Desigual','Costó prender'],CD.quemadaIni,'Encendido')}</div>${noteF('encendido','Primeras caladas: intensidad, sabores')}`;
 case 'tercio1':case 'tercio2':case 'tercio3':return `<p class="hint">Toca los sabores que sientes en este tercio.</p>${wheel(CD.tags[p.id],p.id)}${p.id==='tercio2'?`<div class="field"><label>Ceniza</label>${seg('ceniza',['Firme','Escamosa'],CD.ceniza,'Ceniza')}</div><div class="field"><label>Quemada</label>${seg('quemada',['Recta','Torcida','Necesitó retoque'],CD.quemada,'Quemada')}</div>`:''}${noteF(p.id)}`;
 case 'fortaleza':return `<div class="scale">${seg('fortaleza',FORT5,CD.fortaleza,'Fortaleza')}</div>${c&&c.fortaleza?`<p class="hint">Referencia pública de este cigarro: ${esc(A.fortLabel(c.fortaleza))}. Lo que cuenta es lo que sientes tú.</p>`:''}`;
 case 'cuerpo':return `<div class="scale">${seg('cuerpo',CUER5,CD.cuerpo,'Cuerpo')}</div>`;
 case 'final':return `<div class="field"><label>¿Cuánto dura?</label>${seg('largo',['Corto','Medio','Largo'],CD.largo,'Largo del final')}</div><p class="hint">¿Qué sabor te deja?</p>${wheel(CD.tags.final,'final')}${noteF('final')}`;
 case 'resumen':{const all=allTags();return `<div class="sum-card"><div class="t">${esc(CD.nombre||'Tu cigarro')}</div>${c?`<div class="s">${esc(A.artisanName(c))}</div>`:''}
  <dl class="dl">${[['Capa',CD.capa],['Fortaleza',CD.fortaleza],['Cuerpo',CD.cuerpo],['Final',CD.largo]].filter(x=>x[1]).map(([k,v])=>`<dt>${k}</dt><dd>${esc(v)}</dd>`).join('')}</dl>${tagChips(all)||'<p class="hint">No marcaste sabores en la rueda.</p>'}</div>
  <div class="field"><label>Tu calificación</label><div class="stars" role="radiogroup" aria-label="Calificación">${[1,2,3,4,5].map(n=>`<button type="button" role="radio" aria-checked="${n===CD.rating}" aria-label="${n} estrella${n>1?'s':''}" data-rate="${n}" class="${n<=CD.rating?'on':''}">★</button>`).join('')}</div></div>
  <div class="field"><label for="cnFinal">Nota final</label><textarea id="cnFinal" maxlength="600" rows="3" placeholder="¿Lo volverías a fumar? ¿Con qué lo acompañaste?">${esc(CD.notaFinal)}</textarea></div>
  ${c?`<label class="check"><input type="checkbox" id="cSellar" ${CD.sellar?'checked':''}> Sellar ${esc(c.nombre)} en mi Pasaporte</label>`:''}`}}}
function renderCata(){const p=PASOS[CD.paso];const n=PASOS.length-1;
 view.innerHTML=`<div class="cata"><div class="cata-top"><a class="back" href="#/mihoja/diario">‹ Diario</a><span class="cata-n">${CD.paso===0?'Empieza aquí':`Paso ${CD.paso} de ${n}`}</span></div>
 <div class="pbar" aria-hidden="true"><i style="width:${CD.paso*100/n}%"></i></div>
 <div class="eyebrow">Cata guiada${CD.nombre&&CD.paso?' · '+esc(CD.nombre):''}</div><h1>${p.t}</h1>
 <div class="learn"><p>${p.e}</p></div>
 <div class="cata-body">${stepBody(p)}</div>
 <div class="cata-nav">${CD.paso>0?'<button class="btn secondary" id="cPrev" type="button">‹ Atrás</button>':'<span></span>'}<button class="btn" id="cNext" type="button">${CD.paso===n?'Guardar en mi diario':CD.paso===0?'Empezar':'Siguiente ›'}</button></div>
 ${CD.paso>0&&CD.paso<n?'<button class="linkish" id="cSkip" type="button">Saltar a tu nota</button>':''}
 <p class="note">Guía general para disfrutar y aprender. Para adultos.</p></div>`;
 bindWheel(k=>CD.tags[k],(k,v)=>{CD.tags[k]=v;persistDraft()},(k,id)=>{const y=scrollY;renderCata();scrollTo(0,y);const g=$(`.wseg[data-w="${id}"]`);g&&g.focus({preventScroll:true})});
 $$('[data-set]').forEach(b=>b.onclick=()=>{const k=b.dataset.set;CD[k]=CD[k]===b.dataset.v?'':b.dataset.v;persistDraft();$$(`[data-set="${k}"]`).forEach(x=>x.setAttribute('aria-pressed',CD[k]===x.dataset.v))});
 $$('[data-tog]').forEach(b=>b.onclick=()=>{const k=b.dataset.tog,v=b.dataset.v;CD[k]=CD[k].includes(v)?CD[k].filter(x=>x!==v):[...CD[k],v];persistDraft();b.setAttribute('aria-pressed',CD[k].includes(v))});
 $$('[data-note]').forEach(t=>t.oninput=()=>{CD.notas[t.dataset.note]=t.value;persistDraft()});
 $$('[data-rate]').forEach(b=>b.onclick=()=>{CD.rating=+b.dataset.rate;persistDraft();$$('[data-rate]').forEach(x=>{x.classList.toggle('on',+x.dataset.rate<=CD.rating);x.setAttribute('aria-checked',+x.dataset.rate===CD.rating)})});
 const nf=$('#cnFinal');if(nf)nf.oninput=()=>{CD.notaFinal=nf.value;persistDraft()};const sl=$('#cSellar');if(sl)sl.onchange=()=>{CD.sellar=sl.checked;persistDraft()};
 const cc=$('#cCig'),co=$('#cOtro');if(cc){cc.onchange=()=>{if(cc.value)co.value=''};co.oninput=()=>{if(co.value)cc.value=''}}
 const go=d=>{CD.paso=Math.max(0,Math.min(n,CD.paso+d));persistDraft();renderCata();scrollTo(0,0)};
 $('#cNext').onclick=()=>{if(CD.paso===0){const v=cc.value,o=co.value.trim();if(!v&&!o){toast('Escoge o escribe el cigarro');return}const c=v&&A.cigarById(v);CD.cigarId=c?c.id:'';CD.nombre=c?c.nombre:o;go(1);return}
  if(CD.paso===n){saveCata();return}go(1)};
 const pv=$('#cPrev');if(pv)pv.onclick=()=>go(-1);const sk=$('#cSkip');if(sk)sk.onclick=()=>{CD.paso=n;persistDraft();renderCata();scrollTo(0,0)}}
function saveCata(){if(!CD.rating){toast('Ponle de 1 a 5 estrellas');return}const c=CD.cigarId&&A.cigarById(CD.cigarId);
 const pasos=PASOS.slice(1,-1).map(p=>({paso:p.t,tags:p.w?CD.tags[p.w]:[],nota:(CD.notas[p.id]||'').trim()}));
 const e={id:uid('d'),fecha:new Date().toISOString(),cigarId:c?c.id:null,nombre:CD.nombre,artesano:c?A.artisanName(c):'',rating:CD.rating,notas:(CD.notaFinal||'').trim(),tags:allTags(),fortaleza:CD.fortaleza,cuerpo:CD.cuerpo,final:CD.largo,capa:CD.capa,tiro:CD.tiro,quemada:CD.quemada,aspecto:CD.aspecto,pasos,origen:'cata',actualizado:new Date().toISOString()};
 save(s=>{s.diario.unshift(e);if(c){s.ratings[c.id]=CD.rating;if(CD.sellar&&!s.pasaporte.cigarros[c.id])s.pasaporte.cigarros[c.id]=hoy()}s.draft=null});CD=null;
 toast('Cata guardada en tu diario ✓');location.hash='#/mihoja/diario'}
/* ---------- maridajes (guía general, sin marcas) ---------- */
const RON=[{id:'blanco',n:'Ron blanco',p:'Ligero y limpio, filtrado después de añejarse. En Puerto Rico el ron se añeja por lo menos un año, incluso el blanco.',f:['suave'],t:['floral','frutos','nuez'],m:'Con cigarros suaves de capa clara o Connecticut: no tapa los sabores delicados. Mejor con hielo o en un trago sencillo.'},
 {id:'dorado',n:'Ron dorado u oro',p:'Algo más de barrica: vainilla y caramelo suave.',f:['suave','media'],t:['dulce','nuez','madera'],m:'Con suaves a medios de capa natural o colorado. Acompaña notas de nuez, crema y madera.'},
 {id:'anejo',n:'Ron añejo',p:'Varios años en roble: caramelo, vainilla, madera tostada y fruta seca.',f:['media','fuerte'],t:['madera','especias','cacao','dulce'],m:'El maridaje clásico para medios a fuertes de capa habano o corojo: su dulzor equilibra la especia y la madera del tabaco.'},
 {id:'extra',n:'Ron muy añejo (reserva)',p:'Más denso y complejo: cuero, cacao y fruto seco.',f:['fuerte'],t:['cuero','cacao','tierra'],m:'Para cigarros fuertes y capas maduro u oscuro, sin prisa. Sírvelo solo o con unas gotas de agua.'},
 {id:'especiado',n:'Ron especiado (spiced)',p:'Ron con especias y vainilla añadidas; más dulce y aromático.',f:['media','fuerte'],t:['especias','dulce','cacao'],m:'Contrasta con cigarros pimentosos y acompaña capas maduro con notas dulces. Con un cigarro muy suave, el azúcar puede cansar el paladar.'}];
const CAFE=[{id:'claro',n:'Café de tueste claro',p:'Más acidez y notas de fruta o flor.',f:['suave'],t:['floral','frutos','nuez'],m:'Con cigarros suaves y cremosos, en la mañana.'},
 {id:'medio',n:'Café de tueste medio',p:'Balance entre dulzor, caramelo y nuez.',f:['media'],t:['dulce','nuez','madera','tierra'],m:'El todoterreno: va con la mayoría de los cigarros medios.'},
 {id:'oscuro',n:'Café de tueste oscuro o espresso',p:'Cacao, tostado y un amargor agradable; más cuerpo.',f:['fuerte'],t:['cacao','cuero','tierra','especias'],m:'Con cigarros fuertes o maduro. Un cortadito o un colado bien cargado aguanta la intensidad.'}];
const FORTN=f=>({suave:0,media:1,fuerte:2})[f]??1;
const pick=(list,fort,tags)=>list.map(x=>({x,s:(x.f.includes(fort)?3:0)-Math.min(...x.f.map(y=>Math.abs(FORTN(y)-FORTN(fort))))+(tags||[]).filter(t=>x.t.includes(t)).length*.8})).sort((a,b)=>b.s-a.s)[0].x;
function pairing(c){const f=c.fortaleza||'media',t=cigarTags(c);return{ron:pick(RON,f,t),cafe:pick(CAFE,f,t),tags:t}}
const mstate={f:'media',t:[]};
function vMaridajes(){const r=pick(RON,mstate.f,mstate.t),k=pick(CAFE,mstate.f,mstate.t);
 const card=x=>`<article class="pcard"><h3>${x.n}</h3><p class="pp">${x.p}</p><p>${x.m}</p><div class="pills"><span class="pill">Fortaleza: ${x.f.map((f,i)=>i?f:A.fortLabel(f)).join(' a ')}</span>${x.t.map(t=>`<span class="pill">${WN(t)}</span>`).join('')}</div></article>`;
 view.innerHTML=`${A.head('Maridajes','Ron, café y <em>humo</em>','Guía general para acompañar un cigarro con ron y café de Puerto Rico. El gusto manda: prueba y anótalo en tu diario.',VBArt.leaf('#8fd162','sec-leaf'))}
 <section class="pair-tool"><h2>¿Qué vas a fumar?</h2>
 <div class="field"><label>Fortaleza</label><div class="seg" role="group" aria-label="Fortaleza">${A.FORT.map(f=>`<button type="button" data-mf="${f}" aria-pressed="${mstate.f===f}">${A.fortLabel(f)}</button>`).join('')}</div></div>
 <div class="field"><label>Perfil de sabor (toca uno o más)</label><div class="chips wrapc" role="group" aria-label="Perfil de sabor">${WHEEL.map(w=>`<button type="button" class="chip" data-mt="${w.id}" aria-pressed="${mstate.t.includes(w.id)}">${w.n}</button>`).join('')}</div></div>
 <div class="pair-res" aria-live="polite"><div class="pr"><small>Ron</small><b>${r.n}</b><p>${r.m}</p></div><div class="pr"><small>Café</small><b>${k.n}</b><p>${k.m}</p></div></div></section>
 <div class="section-title"><h2>Rones por estilo</h2></div><div class="pair-list">${RON.map(card).join('')}</div>
 <div class="section-title"><h2>Café de Puerto Rico</h2></div>
 <p class="lead" style="margin-top:-2px">La mayor parte del café boricua se cultiva en las montañas del centro y el oeste, en pueblos como Yauco, Adjuntas, Jayuya, Lares, Utuado, Maricao, Las Marías y San Sebastián. El perfil cambia con la finca, la altura y el tueste, así que lee la bolsa. Para maridar, el tueste es la mejor guía.</p>
 <div class="pair-list">${CAFE.map(card).join('')}</div>
 <div class="section-title"><h2>Reglas rápidas</h2></div>
 <ul class="tips"><li><b>Intensidad con intensidad.</b> Un cigarro suave con un trago ligero; uno fuerte con algo de más cuerpo.</li><li><b>Lo dulce calma la especia.</b> Un añejo o un café acaramelado suaviza un cigarro pimentoso.</li><li><b>Parecido o contraste.</b> Busca un sabor en común, como cacao con cacao, o uno que lo complemente.</li><li><b>Limpia el paladar.</b> Un sorbo de agua entre caladas ayuda a notar los cambios.</li></ul>
 <p class="note">Guía general, sin marcas. Para adultos; bebe con moderación.</p>`;
 $$('[data-mf]').forEach(b=>b.onclick=()=>{mstate.f=b.dataset.mf;const y=scrollY;vMaridajes();scrollTo(0,y)});$$('[data-mt]').forEach(b=>b.onclick=()=>{const t=b.dataset.mt;mstate.t=mstate.t.includes(t)?mstate.t.filter(x=>x!==t):[...mstate.t,t];const y=scrollY;vMaridajes();scrollTo(0,y)})}
/* ---------- podcast: solo contenido real publicado en cigarspodcast.sites.tab.bot (verificado 20 oct 2026) ---------- */
const POD='https://cigarspodcast.sites.tab.bot/';
const SPOTIFY='https://open.spotify.com/show/5DUCZkx89z9cTeBaczq6Gr';
const SPOT_SVG='<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="11" fill="#0e2417"/><path d="M6.2 9.3c3.9-1.2 8.3-.8 11.6 1.1M6.8 12.5c3.2-.9 6.8-.6 9.6 1M7.4 15.5c2.6-.7 5.3-.5 7.6.8" fill="none" stroke="#1DB954" stroke-width="1.8" stroke-linecap="round"/></svg>';
const ARTS=[{u:POD+'articulos/blackbird-mockingbird-short-run-lanzamiento',t:'Mockingbird: el Short Run de los 10 años de Blackbird',c:'Lanzamientos',f:'2026-10-19'},
 {u:POD+'articulos/segovias-de-esteli-habano-oscuro-lancero-93',t:'Segovias de Estelí Habano Oscuro Lancero: 93 puntos',c:'Reseñas',f:'2026-10-16'},
 {u:POD+'articulos/monte-y-mistica-molina-lopez-lanzamiento',t:'Monte & Mística: hecha a mano, con sello boricua',c:'Lanzamientos',f:'2026-10-14',a:['molina-lopez'],cg:['monte-mistica-corojo','monte-mistica-maduro','monte-mistica-connecticut','galiz-spirit']},
 {u:POD+'articulos/el-pareo-musical',t:'El Pareo Musical',c:'Cultura',f:'2023-02-06'},
 {u:POD+'articulos/seis-razones-para-degustar-un-buen-cigarro',t:'Seis razones para degustar un buen cigarro',c:'Cultura',f:'2023-01-04'},
 {u:POD+'articulos/el-amor-es-amor',t:'El Amor es Amor',c:'Cultura',f:'2022-03-03'},
 {u:POD+'articulos/cigars-podcast-lo-bueno-se-comparte',t:'#LoBuenoSeComparte',c:'Comunidad',f:'2022-02-01'},
 {u:POD+'articulos/elegante-de-boutique-guia-para-el-cigar-lounge',t:'Elegante de Boutique: Guía para el Cigar Lounge',c:'Etiqueta',f:'2021-11-15'}];
const MIC='<svg class="mic" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 14a3 3 0 0 0 3-3V6a3 3 0 0 0-6 0v5a3 3 0 0 0 3 3zm5-3a5 5 0 0 1-10 0H5a7 7 0 0 0 6 6.9V21h2v-3.1A7 7 0 0 0 19 11z" fill="currentColor"/></svg>';
const DOC='<svg class="mic" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3h9l4 4v14H6z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M9 11h7M9 15h7M9 7h4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
function podBlock(kind,id){const list=ARTS.filter(x=>((kind==='a'?x.a:x.cg)||[]).includes(id));
 if(!list.length&&kind==='c')return '';
 return `<section class="pod">${MIC}<div><div class="eyebrow">Escucha en Cigars Podcast</div>${list.length?list.map(x=>`<a class="pod-a" href="${x.u}" target="_blank" rel="noopener"><b>${esc(x.t)}</b><small>${x.c} · ${fmtF(x.f)}</small></a>`).join(''):`<p class="pod-s">Lanzamientos, reseñas y cultura del cigarro boricua.</p>`}<a class="pod-more" href="${list.length?'#/podcast':POD}" ${list.length?'':'target="_blank" rel="noopener"'}>${list.length?'Más de Cigars Podcast ›':'Visitar Cigars Podcast ›'}</a></div></section>`}
function vPodcast(){view.innerHTML=`${A.head('Podcast','Escucha en <em>Cigars Podcast</em>','Lanzamientos, reseñas y cultura del cigarro en Puerto Rico.',VBArt.coqui())}
 <div class="links"><a class="lbtn spotify" href="${SPOTIFY}" target="_blank" rel="noopener">${SPOT_SVG}Escúchalo en Spotify</a><a class="lbtn web" href="${POD}" target="_blank" rel="noopener">${A.ICON.web}Cigars Podcast</a><a class="lbtn ig" href="https://www.instagram.com/cigarspodcast/" target="_blank" rel="noopener">${A.ICON.ig}@cigarspodcast</a></div>
 <div class="section-title"><h2>Artículos</h2></div><div class="list">${ARTS.map(x=>`<a class="row" href="${x.u}" target="_blank" rel="noopener">${DOC}<div><div class="t">${esc(x.t)}</div><div class="s">${x.c} · ${fmtF(x.f)}</div></div><span class="go">›</span></a>`).join('')}</div>
 <p class="note">Se abren en el sitio de Cigars Podcast (necesitas conexión).</p>`}
/* ---------- búsqueda global ---------- */
const qs={q:'',reg:'',mun:'',fort:''};
const norm=t=>String(t||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
function vBuscar(){const d=D();const munis=[...new Set([...d.artesanos.map(a=>a.pueblo),...d.places.map(p=>p.pueblo),...d.cigarros.map(c=>c.pueblo),...(d.events.actividades||[]).map(e=>e.pueblo)].map(municipio).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'es'));
 view.innerHTML=`${A.head('Buscar','Busca en <em>todo</em>','Cigarros, artesanos, lugares y eventos, con filtros por región, municipio y Fortaleza.',VBArt.flor())}
 <label class="search"><svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/></svg><span class="sr">Buscar</span><input id="gq" type="search" placeholder="Buscar en toda la app…" value="${esc(qs.q)}" autocomplete="off"></label>
 <div class="filter-row"><select id="gReg" aria-label="Región"><option value="">Región: todas</option>${Object.keys(REG).map(r=>`<option ${qs.reg===r?'selected':''}>${r}</option>`).join('')}</select>
 <select id="gMun" aria-label="Municipio"><option value="">Municipio: todos</option>${munis.filter(m=>!qs.reg||region(m)===qs.reg).map(m=>`<option ${qs.mun===m?'selected':''}>${esc(m)}</option>`).join('')}</select></div>
 <div class="chips" role="group" aria-label="Fortaleza"><button class="chip" data-gf="" aria-pressed="${!qs.fort}">Toda Fortaleza</button>${A.FORT.map(f=>`<button class="chip" data-gf="${f}" aria-pressed="${qs.fort===f}">${A.fortLabel(f)}</button>`).join('')}</div>
 <div id="gres" aria-live="polite"></div>`;
 const run=()=>{const q=norm(qs.q).trim();const geo=p=>{const m=municipio(p);return(!qs.mun||m===qs.mun)&&(!qs.reg||region(m)===qs.reg)};const hit=arr=>!q||norm(arr.join(' ')).includes(q);
  const cs=A.allCigars().filter(c=>hit([c.nombre,A.artisanName(c),c.pueblo,c.capa,c.notas,(c.vitolas||[]).join(' ')])&&geo(c.pueblo)&&(!qs.fort||c.fortaleza===qs.fort));
  const as=d.artesanos.filter(a=>hit([a.nombre,a.pueblo,a.tipo,a.historia])&&geo(a.pueblo)&&(!qs.fort||A.allCigars().some(c=>c.artesano_id===a.id&&c.fortaleza===qs.fort)));
  const ps=qs.fort?[]:d.places.filter(p=>hit([p.nombre,p.tipo,p.pueblo,p.direccion])&&geo(p.pueblo));
  const today=new Date();today.setHours(0,0,0,0);const es=qs.fort?[]:(d.events.actividades||[]).filter(e=>{const x=A.evDate(e.fecha);return x&&x>=today&&hit([e.titulo,e.lugar,e.pueblo,e.detalle])&&((!qs.mun&&!qs.reg)||(e.pueblo&&geo(e.pueblo)))});
  const n=cs.length+as.length+ps.length+es.length;
  $('#gres').innerHTML=`<p class="count-line">${n} resultado${n===1?'':'s'}${qs.fort?' · la Fortaleza filtra cigarros y artesanos':''}</p>
  ${cs.length?`<div class="section-title"><h2>Cigarros</h2><span class="count">${cs.length}</span></div><div class="grid">${cs.map(A.cigarCard).join('')}</div>`:''}
  ${as.length?`<div class="section-title"><h2>Artesanos</h2><span class="count">${as.length}</span></div><div class="list">${as.map(artRow).join('')}</div>`:''}
  ${ps.length?`<div class="section-title"><h2>Lugares</h2><span class="count">${ps.length}</span></div><div class="list">${ps.map(placeRow).join('')}</div>`:''}
  ${es.length?`<div class="section-title"><h2>Eventos</h2><span class="count">${es.length}</span></div><div class="list">${es.map(e=>`<a class="row" href="#/eventos/${encodeURIComponent(e.id)}"><div><div class="t">${esc(e.titulo)}</div><div class="s">${[fmtF(e.fecha),esc(okv(e.pueblo)||okv(e.lugar))].filter(Boolean).join(' · ')}</div></div><span class="go">›</span></a>`).join('')}</div>`:''}
  ${n?'':'<div class="empty">Nada con esa búsqueda.</div>'}`;A.hydrate($('#gres'))};
 $('#gq').addEventListener('input',e=>{qs.q=e.target.value;run()});
 $('#gReg').onchange=e=>{qs.reg=e.target.value;if(qs.mun&&region(qs.mun)!==qs.reg)qs.mun='';vBuscar()};$('#gMun').onchange=e=>{qs.mun=e.target.value;run()};
 $$('[data-gf]').forEach(b=>b.onclick=()=>{qs.fort=b.dataset.gf;$$('[data-gf]').forEach(x=>x.setAttribute('aria-pressed',x===b));run()});run()}
/* ---------- eventos ---------- */
const ANCHOR={id:'humo-y-tambor-2',re:/humo y tambor/i,registro:'https://forms.gle/4iL5cgzun3LqdXBRA',ath:'/humoytambor'};
const isAnchor=e=>e.id===ANCHOR.id||ANCHOR.re.test(e.titulo||'');
function parseHora(h){h=String(h||'');const to24=(H,M,ap)=>{H=+H%12;if(/pm/i.test(ap||''))H+=12;return[H,+(M||0)]};
 let m=h.match(/(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?\s*[–-]\s*(\d{1,2})(?::(\d{2}))?\s*(AM|PM)/i);
 if(m){let s=to24(m[1],m[2],m[3]||m[6]),e=to24(m[4],m[5],m[6]);if(e[0]*60+e[1]<=s[0]*60+s[1])e=[s[0]+3,s[1]];return{s,e}}
 m=h.match(/(\d{1,2})(?::(\d{2}))?\s*(AM|PM)/i);if(m){const s=to24(m[1],m[2],m[3]);return{s,e:[s[0]+3,s[1]]}}return null}
const icsEsc=t=>String(t||'').replace(/\\/g,'\\\\').replace(/;/g,'\\;').replace(/,/g,'\\,').replace(/\r?\n/g,'\\n');
const fold=l=>{const out=[];let s=l;while(s.length>70){out.push(s.slice(0,70));s=' '+s.slice(70)}out.push(s);return out.join('\r\n')};
const pad=n=>String(n).padStart(2,'0');
const icsT=d=>d.toISOString().replace(/[-:]/g,'').replace(/\.\d+/,'');
function icsFor(e){const [Y,M,Dd]=e.fecha.split('-').map(Number);const t=parseHora(e.hora);
 /* Puerto Rico: UTC−4 todo el año (sin horario de verano) */
 const utc=(h,mi)=>icsT(new Date(Date.UTC(Y,M-1,Dd,h+4,mi)));const nd=new Date(Date.UTC(Y,M-1,Dd+1));
 const dt=t?[`DTSTART:${utc(t.s[0],t.s[1])}`,`DTEND:${utc(t.e[0],t.e[1])}`]:[`DTSTART;VALUE=DATE:${Y}${pad(M)}${pad(Dd)}`,`DTEND;VALUE=DATE:${nd.getUTCFullYear()}${pad(nd.getUTCMonth()+1)}${pad(nd.getUTCDate())}`];
 const url=e.enlace||e.fuente_url||'';
 const desc=[okv(e.hora)&&('Hora: '+e.hora),e.precio&&scrub(e.precio),scrub(e.detalle||''),isAnchor(e)?`RSVP: ${ANCHOR.registro} · ATH Móvil ${ANCHOR.ath}`:'',url,'La Hoja Boricua · '+APP_URL].filter(Boolean).join('\n');
 const loc=[okv(e.lugar),okv(e.pueblo),'Puerto Rico'].filter(Boolean).join(', ');
 return ['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//La Hoja Boricua//ES','CALSCALE:GREGORIAN','METHOD:PUBLISH','BEGIN:VEVENT',`UID:${e.id||uid('e')}@lahojaboricua.sites.tab.bot`,`DTSTAMP:${icsT(new Date())}`,...dt,`SUMMARY:${icsEsc(e.titulo)}`,`LOCATION:${icsEsc(loc)}`,`DESCRIPTION:${icsEsc(desc)}`,url?`URL:${url}`:'','END:VEVENT','END:VCALENDAR'].filter(Boolean).map(fold).join('\r\n')+'\r\n'}
function addToCal(e){download(new Blob([icsFor(e)],{type:'text/calendar;charset=utf-8'}),(e.id||'evento')+'.ics');toast('Abre el archivo .ics para añadirlo a tu calendario')}
const evst={mode:'lista',day:''};
const CAL_ICO='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 2v3M17 2v3M4 8h16M5 5h14v15H5z" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 11v6M9 14h6" stroke="currentColor" stroke-width="2"/></svg>';
const DIAS=['dom','lun','mar','mié','jue','vie','sáb'];
/* v29: campo vacío o marcador ("no definido", "por confirmar"…) = no se muestra */
const NOPH=/no definid|por confirmar|no publicad|sin confirmar|^\s*\?+\s*$/i;const okv=v=>v&&!NOPH.test(String(v))?String(v):'';
function evMeta(e,p){return [okv(e.hora),[okv(e.lugar),okv(e.pueblo)].filter(Boolean).join(', '),p===false?'':okv(e.precio&&scrub(e.precio))].filter(Boolean).map(esc).join(' · ')}
const evLine=(e,p)=>{const m=evMeta(e,p);return m?`<div class="s">${m}</div>`:''};
function evCard(e,pending){const d=A.evDate(e.fecha);const m={nombre:e.lugar||e.titulo,direccion:e.direccion||'',pueblo:e.pueblo,maps:e.maps,lat:e.lat,lng:e.lng};const src=e.enlace||e.fuente_url;
 return `<article class="ev ${pending?'pending':''}" id="ev-${esc(e.id)}"><div class="date">${d?`<small>${MES[d.getMonth()]}</small><b>${d.getDate()}</b><small>${DIAS[d.getDay()]}</small>`:'<b>?</b>'}</div><div style="min-width:0;flex:1">
 <div class="t">${esc(e.titulo)}</div>${evLine(e)}
 ${okv(e.detalle)?`<div class="s">${esc(scrub(e.detalle))}</div>`:''}
 <div class="src">${pending?'Sugerida por ti · pendiente de verificar':(e.fuente?`vía ${e.fuente_url?`<a href="${esc(e.fuente_url)}" target="_blank" rel="noopener">${esc(e.fuente)}</a>`:esc(e.fuente)}`:'')}</div>
 <div class="links">${src?A.linkBtn('web',src,pending?'Ver enlace':'Ver fuente'):''}${pending?'':`<button type="button" class="lbtn" data-ics="${esc(e.id)}">${CAL_ICO}Añadir a calendario</button>`}${(okv(e.lugar)||e.maps)?`<a class="lbtn go-map" href="${esc(A.goLink(m))}" target="_blank" rel="noopener">${A.ICON.map}Cómo llegar</a>`:''}</div></div></article>`}
function anchorCard(e){const d=A.evDate(e.fecha);const m={nombre:e.lugar,pueblo:e.pueblo,maps:e.maps};
 return `<section class="anchor" id="ev-${esc(e.id)}"><div class="anchor-tag">El evento ancla</div><div class="anchor-top">${d?`<div class="date big"><small>${MES[d.getMonth()]}</small><b>${d.getDate()}</b><small>${DIAS[d.getDay()]}</small></div>`:''}
 <div><h2>${esc(e.titulo)}</h2>${evLine({lugar:e.lugar,pueblo:e.pueblo})}${evLine({hora:e.hora})}</div></div>
 ${okv(e.detalle)?`<p class="anchor-d">${esc(scrub(e.detalle))}</p>`:''}
 <div class="rsvp"><a class="btn" href="${ANCHOR.registro}" target="_blank" rel="noopener">Confirma tu asistencia (RSVP)</a>
 <div class="ath"><div><small>Cata de las 5 PM: paga con ATH Móvil</small><b>${ANCHOR.ath}</b></div><button type="button" class="lbtn" data-copy="${ANCHOR.ath}">Copiar</button></div></div>
 <div class="links"><button type="button" class="lbtn" data-ics="${esc(e.id)}">${CAL_ICO}Añadir a calendario</button>${(okv(e.lugar)||e.maps)?`<a class="lbtn go-map" href="${esc(A.goLink(m))}" target="_blank" rel="noopener">${A.ICON.map}Cómo llegar</a>`:''}${e.enlace?A.linkBtn('web',e.enlace,e.enlace.replace(/^https?:\/\/(www\.)?/,'').replace(/\/$/,'')):''}${e.fuente_url?A.linkBtn('ig',e.fuente_url,e.fuente||'Instagram'):''}</div></section>`}
function calGrid(evs){if(!evs.length)return '<div class="empty">No hay eventos próximos.</div>';const by={};evs.forEach(e=>{(by[e.fecha]=by[e.fecha]||[]).push(e)});
 const first=A.evDate(evs[0].fecha),last=A.evDate(evs[evs.length-1].fecha);const td=hoy();let html='';
 for(let y=first.getFullYear(),mo=first.getMonth();y<last.getFullYear()||(y===last.getFullYear()&&mo<=last.getMonth());){const start=new Date(y,mo,1).getDay(),days=new Date(y,mo+1,0).getDate();
  let cells='';for(let i=0;i<start;i++)cells+='<span class="cd empty-d"></span>';
  for(let dd=1;dd<=days;dd++){const k=`${y}-${pad(mo+1)}-${pad(dd)}`;const es=by[k]||[];const anc=es.some(isAnchor);
   cells+=es.length?`<button type="button" class="cd has${anc?' anc':''}${evst.day===k?' sel':''}" data-day="${k}" aria-label="${dd} de ${MESL[mo]}: ${es.length} evento${es.length>1?'s':''}" aria-pressed="${evst.day===k}">${dd}<i></i></button>`:`<span class="cd${k===td?' today':''}">${dd}</span>`}
  html+=`<div class="cal"><div class="cal-h">${MESL[mo]} ${y}</div><div class="cal-g">${DIAS.map(x=>`<span class="dw">${x[0].toUpperCase()}</span>`).join('')}${cells}</div></div>`;
  if(mo===11){mo=0;y++}else mo++}
 const sel=evst.day?by[evst.day]||[]:[];
 return html+`<div class="cal-legend"><span><i class="lg-anc"></i>Humo y Tambor</span><span><i class="lg-ev"></i>Otros eventos</span></div><div id="calSel">${sel.length?sel.map(e=>isAnchor(e)?anchorCard(e):evCard(e)).join(''):'<p class="hint">Toca un día marcado para ver sus eventos.</p>'}</div>`}
function vEventos(focus){const LS=A.LS;const today=new Date();today.setHours(0,0,0,0);const evs=(D().events.actividades||[]).filter(e=>{const d=A.evDate(e.fecha);return d&&d>=today}).sort((a,b)=>a.fecha.localeCompare(b.fecha));const mine=LS.get('sugeridas',[]);
 const anc=evs.find(isAnchor);const rest=evs.filter(e=>e!==anc);const upd=D().events.actualizado?new Date(D().events.actualizado):null;
 view.innerHTML=`${A.head('Actividades','Eventos y <em>catas</em>','Lo que viene en la escena del cigarro en PR. Añádelo a tu calendario.',VBArt.coqui())}
 ${upd&&!isNaN(upd)?`<p class="updated">Lista actualizada el ${upd.getDate()} ${MES[upd.getMonth()]} ${upd.getFullYear()}${navigator.onLine?'':' <span class="offline-badge">sin conexión</span>'}</p>`:''}
 <div class="toggle" role="group" aria-label="Vista"><button type="button" data-evm="lista" aria-pressed="${evst.mode==='lista'}">Lista</button><button type="button" data-evm="cal" aria-pressed="${evst.mode==='cal'}">Calendario</button></div>
 ${evst.mode==='cal'?calGrid(evs):`${anc?anchorCard(anc):''}${rest.length?`<div class="section-title"><h2>Próximos</h2><span class="count">${rest.length}</span></div>`:''}${rest.map(e=>evCard(e)).join('')}${evs.length?'':'<div class="empty">No hay actividades próximas.</div>'}`}
 ${mine.length?`<div class="section-title"><h2>Tus sugerencias</h2></div>${mine.map(e=>evCard(e,true)).join('')}`:''}
 <details class="edit"><summary>＋ Sugerir actividad</summary><form class="form" id="sugForm"><div class="field"><label for="sT">Actividad</label><input id="sT" required maxlength="80" placeholder="Ej. Noche de cata"></div>
 <div class="field"><label for="sF">Fecha</label><input id="sF" type="date" required></div><div class="field"><label for="sH">Hora</label><input id="sH" maxlength="20" placeholder="Ej. 7:00 PM"></div>
 <div class="field"><label for="sL">Lugar</label><input id="sL" maxlength="60"></div><div class="field"><label for="sP">Pueblo</label><input id="sP" maxlength="40"></div>
 <div class="field"><label for="sE">Enlace (IG o web)</label><input id="sE" type="url" maxlength="200" placeholder="https://"></div><button class="btn" type="submit">Guardar sugerencia</button></form></details>
 <div class="section-title"><h2>Fuentes</h2></div><p class="lead" style="margin-top:-4px">Las cuentas que esta lista sigue para actualizarse.</p>
 <div class="list">${(D().events.fuentes||[]).map(f=>`<a class="row" href="${esc(f.url)}" target="_blank" rel="noopener">${A.mono(f.handle.replace('@',''),38)}<div><div class="t">${esc(f.handle)}</div>${f.nombre?`<div class="s">${esc(f.nombre)}</div>`:''}</div><span class="go">›</span></a>`).join('')}</div>${A.PROTO_NOTE}`;
 $$('[data-evm]').forEach(b=>b.onclick=()=>{evst.mode=b.dataset.evm;vEventos()});
 $$('[data-day]').forEach(b=>b.onclick=()=>{evst.day=evst.day===b.dataset.day?'':b.dataset.day;vEventos();const s=$('#calSel');s&&s.scrollIntoView({block:'nearest',behavior:'smooth'})});
 $('#sugForm').onsubmit=e=>{e.preventDefault();const t=$('#sT').value.trim(),f=$('#sF').value;if(!t||!f){toast('Falta la actividad o la fecha');return}
  LS.set('sugeridas',[...LS.get('sugeridas',[]),{id:'s'+Date.now().toString(36),titulo:t,fecha:f,hora:$('#sH').value.trim(),lugar:$('#sL').value.trim(),pueblo:$('#sP').value.trim(),enlace:$('#sE').value.trim()}].sort((a,b)=>a.fecha.localeCompare(b.fecha)));toast('Sugerencia guardada');vEventos()};
 if(focus){const el=document.getElementById('ev-'+focus);if(el){setTimeout(()=>{el.scrollIntoView({block:'start'});scrollBy(0,-80);el.classList.add('flash')},60)}}}
/* ---------- compartir ficha (PNG en canvas) ---------- */
const LEAF_P='M60 22 C96 70 110 160 106 250 C102 320 86 370 60 408 C34 370 18 320 14 250 C10 160 24 70 60 22Z',LEAF_H='M60 22 C96 70 110 160 106 250 C102 320 86 370 60 408Z';
function drawLeaf(x,cx,cy,sc,rot,op){x.save();x.translate(cx,cy);x.rotate(rot);x.scale(sc,sc);x.translate(-60,-220);x.globalAlpha=op;
 x.strokeStyle='#a7d46f';x.lineWidth=5;x.beginPath();x.moveTo(60,436);x.lineTo(60,30);x.stroke();
 x.fillStyle='#3f9150';x.fill(new Path2D(LEAF_P));x.fillStyle='#2c7a3e';x.fill(new Path2D(LEAF_H));
 x.strokeStyle='#1e5a2d';x.lineWidth=2.4;x.beginPath();for(let y=70;y<=378;y+=22){const w=34+Math.min(8,(y-70)/30);x.moveTo(60,y);x.lineTo(60-w,y-14);x.moveTo(60,y);x.lineTo(60+w,y-14)}x.stroke();x.restore()}
function rr(x,X,Y,W,H,r){x.beginPath();x.moveTo(X+r,Y);x.arcTo(X+W,Y,X+W,Y+H,r);x.arcTo(X+W,Y+H,X,Y+H,r);x.arcTo(X,Y+H,X,Y,r);x.arcTo(X,Y,X+W,Y,r);x.closePath()}
function wrap(x,t,maxW){const w=String(t).split(/\s+/);const lines=[];let cur='';for(const s of w){const n=cur?cur+' '+s:s;if(x.measureText(n).width>maxW&&cur){lines.push(cur);cur=s}else cur=n}if(cur)lines.push(cur);return lines}
async function cardBlob(c){const W=1080,H=1350;const cv=document.createElement('canvas');cv.width=W;cv.height=H;const x=cv.getContext('2d');
 try{await Promise.all(['64px Shrikhand','600 36px Figtree','700 30px Figtree'].map(f=>document.fonts.load(f)))}catch(e){}
 const g=x.createLinearGradient(0,0,W*.4,H);g.addColorStop(0,'#1f5a36');g.addColorStop(.55,'#123a24');g.addColorStop(1,'#0b1d12');x.fillStyle=g;x.fillRect(0,0,W,H);
 drawLeaf(x,70,250,1.25,.5,.4);drawLeaf(x,1010,1120,1.35,-2.6,.33);
 const fb=[['#0050f0',.18],['#ed0000',.27],['#f8f8f4',.1],['#ed0000',.27],['#f8f8f4',.04],['#ed0000',.14]];let fx=0;fb.forEach(([col,w])=>{x.fillStyle=col;x.fillRect(fx,0,W*w,10);fx+=W*w});
 x.textBaseline='alphabetic';x.font='64px Shrikhand';x.fillStyle='#f8f8f4';const t1='La Hoja ';const w1=x.measureText(t1).width;const w2=x.measureText('Boricua').width;const sx=(W-w1-w2)/2;x.fillText(t1,sx,120);x.fillStyle='#8fd162';x.fillText('Boricua',sx+w1,120);
 x.font='600 24px Figtree';x.fillStyle='#8fb8ff';x.textAlign='center';x.fillText('HECHO EN PUERTO RICO',W/2,162);x.textAlign='left';
 const foto=(!c.yours&&window.LHB_FOTOS)?window.LHB_FOTOS[c.id]:null;let fimg=null;
 if(foto){fimg=new Image();fimg.src=foto.img;await new Promise(r=>{fimg.onload=r;fimg.onerror=()=>{fimg=null;r()}})}
 const img=new Image();if(!fimg){img.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(A.cigarSVG(c));await new Promise(r=>{img.onload=r;img.onerror=r})}
 x.save();x.translate(W/2,520);x.rotate(-.025);x.shadowColor='rgba(0,0,0,.45)';x.shadowBlur=30;x.shadowOffsetY=12;x.fillStyle='#fbfbf8';x.fillRect(-410,-300,820,640);x.shadowColor='transparent';
 if(fimg){x.fillStyle='#ffffff';x.fillRect(-380,-270,760,570);try{x.drawImage(fimg,-380,-205,760,380)}catch(e){}x.fillStyle='#5b5b5b';x.font='600 20px Figtree';x.textAlign='center';x.fillText(foto.credito+(foto.match==='linea'?' · Foto de la línea':''),0,282);x.textAlign='left'}
 else{try{x.drawImage(img,-380,-270,760,570)}catch(e){x.fillStyle='#7fb0ff';x.fillRect(-380,-270,760,570)}}x.restore();
 x.fillStyle='#f8f8f4';x.font='68px Shrikhand';x.textAlign='center';let y=960;const nl=wrap(x,c.nombre,W-140).slice(0,2);if(nl.length>1){x.font='56px Shrikhand';y=930}nl.forEach((l,i)=>x.fillText(l,W/2,y+i*68));y+= (nl.length-1)*68;
 x.font='600 34px Figtree';x.fillStyle='#dde3dc';x.fillText([A.artisanName(c),c.pueblo].filter(Boolean).join(' · '),W/2,y+56);x.textAlign='left';
 const vs=c.vitolas||[];const specs=[['CAPA',(c.capa||'No publicada').replace(/\s*\(.*?\)/g,'')],['FORTALEZA',c.fortaleza?A.fortLabel(c.fortaleza):'No publicada'],['VITOLA',vs.length?vs[0]+(vs.length>1?' +'+(vs.length-1):''):'En verificación']];
 const bw=300,gap=24,bx=(W-bw*3-gap*2)/2,by=y+96;specs.forEach(([k,v],i)=>{const X=bx+i*(bw+gap);x.fillStyle='rgba(23,58,38,.92)';rr(x,X,by,bw,110,18);x.fill();x.strokeStyle='#2c5a3d';x.lineWidth=2;x.stroke();
  x.fillStyle='#8fb8ff';x.font='700 20px Figtree';x.fillText(k,X+22,by+38);x.fillStyle='#f8f8f4';x.font='700 30px Figtree';let vv=String(v);while(x.measureText(vv).width>bw-44&&vv.length>3)vv=vv.slice(0,-2)+'…';x.fillText(vv.replace('……','…'),X+22,by+82)});
 x.textAlign='center';x.fillStyle='#8fd162';x.font='700 30px Figtree';x.fillText('lahojaboricua.com',W/2,H-62);x.fillStyle='#b3c0b5';x.font='600 20px Figtree';x.fillText('Prototipo — información pública, sujeta a verificación',W/2,H-28);
 return new Promise(r=>cv.toBlob(b=>r(b),'image/png'))}
async function shareCard(id){const c=A.cigarById(id);if(!c)return;
 const el=sheet(`<h2 class="sheet-h">Compartir ficha</h2><div class="share-prev" id="shPrev"><p class="hint">Preparando la imagen…</p></div><div class="links" id="shBtns" hidden><button class="btn" type="button" id="shGo">Compartir</button><button class="btn secondary" type="button" id="shDl">Descargar PNG</button></div>`,'Compartir ficha');
 const blob=await cardBlob(c);if(!blob){$('#shPrev',el).innerHTML='<p class="hint">No pude crear la imagen.</p>';return}
 const name=`la-hoja-boricua-${c.id}.png`;const file=new File([blob],name,{type:'image/png'});const u=URL.createObjectURL(blob);
 $('#shPrev',el).innerHTML=`<img src="${u}" alt="Ficha de ${esc(c.nombre)} con el estilo de La Hoja Boricua">`;$('#shBtns',el).hidden=false;
 const canFile=!!(navigator.canShare&&navigator.canShare({files:[file]}));if(!canFile)$('#shGo',el).textContent=navigator.share?'Compartir enlace':'Copiar enlace';
 const link=APP_URL+'#/c/'+encodeURIComponent(c.id);
 $('#shGo',el).onclick=async()=>{try{if(canFile)await navigator.share({files:[file],title:c.nombre,text:`${c.nombre} · La Hoja Boricua ${link}`});else if(navigator.share)await navigator.share({title:c.nombre,text:`${c.nombre} · La Hoja Boricua`,url:link});else{await navigator.clipboard.writeText(link);toast('Enlace copiado')}}catch(e){if(e&&e.name!=='AbortError'){download(blob,name)}}};
 $('#shDl',el).onclick=()=>{download(blob,name);toast('Imagen descargada')}}
/* ---------- piezas para las vistas existentes ---------- */
function pideloLink(a){const d=a.donde_comprar||'';const host=u=>{try{return new URL(u).hostname.replace(/^www\./,'')}catch(e){return ''}};
 if(a.instagram&&/\bIG\b|instagram|\bDM\b/i.test(d))return{u:a.instagram,l:'por Instagram'};
 if(a.facebook&&/\bFB\b|facebook/i.test(d))return{u:a.facebook,l:'por Facebook'};
 const shop=firstURL(d);const own=host(a.web).split('.')[0];if(shop&&own&&host(shop).includes(own))return{u:shop,l:'en su tienda en línea'};
 if(a.instagram)return{u:a.instagram,l:'por Instagram'};if(a.facebook)return{u:a.facebook,l:'por Facebook'};if(a.web)return{u:a.web,l:'en su sitio web'};return null}
function artisanExtras(a){const p=pideloLink(a);
 return `${p?`<a class="pidelo" href="${esc(p.u)}" target="_blank" rel="noopener"><span class="pidelo-t">Pídelo directo</span><span class="pidelo-s">Escríbele ${p.l} ›</span></a>`:''}
 <div class="act-row">${favBtn('artesanos',a.id)}${stampBtn('artesanos',a.id)}</div>${podBlock('a',a.id)}`}
function cigarExtras(c){const pr=pairing(c);const real=!c.yours;
 return `<div class="act-grid"><a class="act" href="#/cata/${encodeURIComponent(c.id)}">${VBArt.leaf('#8fd162')}<span>Catar</span></a><button type="button" class="act" data-sheet="humidor" data-arg="${esc(c.id)}">${VBArt.leaf('#ffd27a')}<span>Al humidor</span></button><button type="button" class="act" data-sheet="share" data-arg="${esc(c.id)}">${VBArt.leaf('#8fb8ff')}<span>Compartir</span></button>${real?stampBtn('cigarros',c.id,'act'):''}</div>
 <section class="pairbox"><div class="eyebrow">Maridaje sugerido</div><div class="pair-res"><div class="pr"><small>Ron</small><b>${pr.ron.n}</b></div><div class="pr"><small>Café</small><b>${pr.cafe.n}</b></div></div><p class="hint">Por su Fortaleza${pr.tags.length?' y sus notas de '+pr.tags.slice(0,3).map(t=>WN(t).toLowerCase()).join(', '):''}. <a href="#/maridajes">Ver la guía</a></p></section>
 ${podBlock('c',c.id)}`}
const placeActions=p=>`<div class="pl-act">${favBtn('lugares',p.id,'sm')}${stampBtn('lugares',p.id,'sm')}</div>`;
function setRating(id,n){save(s=>{if(!n||s.ratings[id]===n)delete s.ratings[id];else s.ratings[id]=n})}
return {requireAccount,gate,registerAction:CUENTA.register,ruta,vRuta,townSheet,rlit:()=>{const r=RLIT;RLIT=0;return r},S,isFav,toggleFav,setRating,favBtn,stampBtn,scrub,firstURL,municipio,region,openSheet,closeSheet,artisanExtras,cigarExtras,placeActions,subnav,
 routes:{mihoja:vMiHoja,cata:cid=>requireAccount(()=>vCata(cid),{fast:true}),maridajes:vMaridajes,podcast:vPodcast,buscar:vBuscar,eventos:vEventos,actividades:vEventos},
 _test:{HANDLE_RE,CLERK,icsFor,parseHora,pairing,pideloLink,cardBlob,badgeIds,passCounts,load,KEY}};
};
