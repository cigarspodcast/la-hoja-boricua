/* La Hoja Boricua v6 · Mi Hoja: cata guiada, humidor, diario, pasaporte, favoritos, eventos, maridajes, podcast, compartir.
   Todo vive en este teléfono (localStorage). Mi Hoja pide cuenta y perfil (LHB-25). */
window.LHB_EXT=function(A){'use strict';
const {$,$$,esc,toast,view,VBArt}=A;const tt=window.LHB_I18N.t;
/* LHB-29: lo que se guarda (opciones de la cata, pasos, regiones) se queda en español; lab() lo muestra en el idioma de la app */
const lab=v=>tt('val.'+v,null,v);const D=()=>A.D();
const APP_URL='https://lahojaboricua.com/';
/* ---------- utilidades ---------- */
const MES=tt('h.mesCorto').split(',');
const MESL=tt('h.mesLargo').split(',');
const hoy=()=>{const d=new Date();return new Date(d.getTime()-d.getTimezoneOffset()*6e4).toISOString().slice(0,10)};
const fmtF=f=>{const d=new Date(String(f).slice(0,10)+'T12:00:00');return isNaN(d)?'':`${d.getDate()} ${MES[d.getMonth()]} ${d.getFullYear()}`};
const uid=p=>p+Date.now().toString(36)+Math.random().toString(36).slice(2,6);
/* sin teléfonos ni emails en pantalla */
const scrub=t=>String(t??'').replace(/(Costo|Precio) por teléfono:?[^·.]*/i,tt('h.costoPreguntaAlOrganizador')).replace(/[\w.+-]+@[\w-]+\.[\w.]+/g,'').replace(/(\+?1[\s.-]?)?\(?\d{3}\)?[\s.-]\d{3}[\s.-]\d{4}(\s*\([^)]*\))?/g,'').replace(/(\s*[·,]\s*)+(?=[·,]|$)/g,'').replace(/\s{2,}/g,' ').trim();
const firstURL=t=>{const m=String(t||'').match(/https?:\/\/[^\s·,]+/);return m?m[0]:''};
/* ---------- almacenamiento versionado ---------- */
const KEY='lhb_mihoja_v1',SCHEMA=1;
const DEF=()=>({schema:SCHEMA,creado:new Date().toISOString(),humidor:[],diario:[],pasaporte:{artesanos:{},cigarros:{},lugares:{}},favs:{cigarros:[],artesanos:[],lugares:[]},ratings:{},respaldo:null,cambios:0,recordarDespues:null,draft:null});
const MIG={/* cuando cambie el formato: 1:o=>({...o,schema:2}) y KEY pasa a lhb_mihoja_v2 leyendo la v1 */};
/* LHB-38: toda entrada del diario trae foto (llave de la foto de este teléfono), publica (solo tú la ves hasta que la hagas pública), consumido (el día en que se fumó) y marca (solo si el cigarro es "otro").
   Las de antes los reciben aquí con su valor por defecto: la fecha de la cata es el día que se fumó. Es aditivo: no cambia el SCHEMA y no toca ningún otro campo. */
const DAY=/^\d{4}-\d{2}-\d{2}$/;
const okDay=v=>{if(typeof v!=='string'||!DAY.test(v))return false;const d=new Date(v+'T12:00:00');return !isNaN(d)&&d.getFullYear()===+v.slice(0,4)&&d.getMonth()===+v.slice(5,7)-1&&d.getDate()===+v.slice(8,10)};
function entryDefaults(e){if(!e||typeof e!=='object'||Array.isArray(e))return e;
 if(typeof e.foto!=='string')e.foto='';
 if(typeof e.publica!=='boolean')e.publica=false;
 if(!okDay(e.consumido))e.consumido=typeof e.fecha==='string'&&okDay(e.fecha.slice(0,10))?e.fecha.slice(0,10):hoy();
 e.marca=typeof e.marca==='string'?e.marca.trim().slice(0,60):'';return e}
function normalize(o){const d=DEF();o=o&&typeof o==='object'?o:{};
 for(const k of Object.keys(d))if(o[k]===undefined)o[k]=d[k];
 if(!o.pasaporte||typeof o.pasaporte!=='object')o.pasaporte={};if(!o.favs||typeof o.favs!=='object')o.favs={};
 for(const k of ['artesanos','cigarros','lugares']){if(!o.pasaporte[k]||typeof o.pasaporte[k]!=='object')o.pasaporte[k]={};if(!Array.isArray(o.favs[k]))o.favs[k]=[]}
 if(!Array.isArray(o.humidor))o.humidor=[];if(!Array.isArray(o.diario))o.diario=[];if(!o.ratings||typeof o.ratings!=='object')o.ratings={};o.diario.forEach(entryDefaults);return o}
function upgrade(o){o=o||{};if(!o.schema)o.schema=1;while(o.schema<SCHEMA&&MIG[o.schema])o=MIG[o.schema](o);return normalize(o)}
const legacy=k=>{try{const v=localStorage.getItem('vb_'+k);return v==null?null:JSON.parse(v)}catch(e){return null}};
let ST=null,STRAW=null;
function load(){const raw=localStorage.getItem(KEY);
 if(raw){try{return upgrade(JSON.parse(raw))}catch(e){try{localStorage.setItem(KEY+'_danado_'+Date.now(),raw)}catch(_){}}}
 /* primera vez en v6: trae favoritos y estrellas de la versión anterior (vb_favs, vb_ratings); las llaves viejas no se borran */
 const s=DEF();const f=legacy('favs'),r=legacy('ratings');
 if(Array.isArray(f))s.favs.cigarros=f.filter(x=>typeof x==='string');if(r&&typeof r==='object'&&!Array.isArray(r))s.ratings={...r};
 s.migrado=(f||r)?'v5':'nuevo';write(s,true);return s}
const PEND=[];/* LHB-38: fotos que no se pudieron borrar porque el cambio no se anotó; se borran en la próxima anotación que funcione, la que sea */
/* LHB-82: la copia de otra cuenta que la sincronización apartó (KEY_de_<cuenta>) también cuenta como uso (la llave exacta, entre comillas); si no se puede leer, se queda por si acaso */
const parkedRef=k=>{try{for(let i=0;i<localStorage.length;i++){const n=localStorage.key(i);if(n&&n.startsWith(KEY+'_de_')&&String(localStorage.getItem(n)).includes(JSON.stringify(k)))return true}return false}catch(e){return true}};
/* LHB-31: cada escritura avisa a la sincronización, que decide tras una pausa si algo de lo que viaja a la cuenta cambió */
let SYNC=null;
/* LHB-39 (Codex ronda 1): el campo de la búsqueda del diario que tenía el foco cuando llegó una sincronización, y de qué cuenta; la página del diario lo usa una vez.
   Codex ronda 2: irse a otra página lo borra, y con otra cuenta no vale */
let DFOC=null;window.addEventListener('hashchange',()=>{DFOC=null});
/* quiet: lo que la app escribe por sí sola (copia nueva o dañada) no cuenta como un cambio de la persona */
function write(s,quiet){if(SYNC&&SYNC.fenced()){ST=null;toast(tt('ac.fenced'));return false}if(SYNC&&!SYNC.isolate()){ST=null;toast(tt('h.noSePudoSeparar'));return false}if(SYNC&&!quiet&&!SYNC.ensureOwner()){ST=null;toast(tt('h.noHayEspacioPara'));return false}let prev=null;try{if(SYNC&&!quiet)prev=localStorage.getItem(KEY);const txt=JSON.stringify(s);if(SYNC&&SYNC.fenced()){ST=null;toast(tt('ac.fenced'));return false}localStorage.setItem(KEY,txt);STRAW=txt}catch(e){ST=null;toast(tt('h.noHayEspacioPara'));return false}if(SYNC&&!quiet)SYNC.changed(prev);for(const k of PEND.splice(0)){if(parkedRef(k))PEND.push(k);else if(!refd(k))FOTOS.del(k);else if(S().draft&&S().draft.foto===k&&!S().diario.some(e=>e&&e.foto===k))PEND.push(k)}return true}/* una foto que solo usa el borrador guardado sigue pendiente: el cambio de borrador que la soltaba no se anotó (o se soltó por rechazado) y se borra cuando se anote */
/* antes de leer Mi Hoja se aparta lo que era de otra cuenta; otra pestaña que escribe deja esta copia en memoria por vieja */
const S=()=>{if(SYNC&&!SYNC.isolate())return DEF();if(ST&&localStorage.getItem(KEY)===STRAW)return ST;ST=load();STRAW=localStorage.getItem(KEY);return ST};
window.addEventListener('storage',e=>{if(e.key===null||e.key===KEY)ST=null});
function save(mut){const s=S();mut&&mut(s);s.cambios=(s.cambios||0)+1;write(s);return s}
try{navigator.storage&&navigator.storage.persist&&navigator.storage.persist().catch(()=>{})}catch(e){}
/* ---------- favoritos y pasaporte ---------- */
const isFav=(k,id)=>S().favs[k].includes(id);
function toggleFav(k,id){let on;save(s=>{on=!s.favs[k].includes(id);s.favs[k]=on?[...s.favs[k],id]:s.favs[k].filter(x=>x!==id)});return on}
const isStamp=(k,id)=>!!S().pasaporte[k][id];
function toggleStamp(k,id){let on;save(s=>{on=!s.pasaporte[k][id];if(on)s.pasaporte[k][id]=hoy();else delete s.pasaporte[k][id]});return on}
const STAMP_ICO='<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2" stroke-dasharray="3 2"/><path d="M8 12.5l2.6 2.5L16 9.5" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const favBtn=(k,id,cls='')=>{const on=isFav(k,id);return `<button type="button" class="heart ${cls}" data-fav="${k}:${esc(id)}" aria-pressed="${on}" aria-label="${on?tt('h.quitarDeFavoritos'):tt('h.guardarEnFavoritos')}">${on?'♥':'♡'}<span>${tt('card.fav')}</span></button>`};
const stampBtn=(k,id,cls='')=>{const on=isStamp(k,id);return `<button type="button" class="stampbtn ${cls}" data-stamp="${k}:${esc(id)}" aria-pressed="${on}">${STAMP_ICO}<span>${on?tt('h.sellado'):tt('h.sellarPasaporte')}</span></button>`};
document.addEventListener('click',e=>{
 const f=e.target.closest('[data-fav]');if(f){e.preventDefault();e.stopPropagation();gate('fav',f.dataset.fav);return}
 const tw=e.target.closest('[data-town]');if(tw){townSheet(tw.dataset.town);return}
 const st=e.target.closest('[data-stamp]');if(st){e.preventDefault();e.stopPropagation();gate('stamp',st.dataset.stamp,st);return}
 const cp=e.target.closest('[data-copy]');if(cp){const t=cp.dataset.copy;(navigator.clipboard?navigator.clipboard.writeText(t):Promise.reject()).then(()=>toast(tt('h.copiado')+t),()=>toast(tt('h.athMovil')+t));return}
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
const WHEEL=[{id:'madera',n:tt('h.madera'),c:'#e6c48f'},{id:'tierra',n:tt('h.tierra'),c:'#cbbd9f'},{id:'especias',n:tt('h.especias'),c:'#ff8a80'},{id:'dulce',n:tt('h.dulce'),c:'#ffd27a'},{id:'cacao',n:tt('h.cacaoCafe'),l:[tt('h.cacao'),tt('h.cafe')],c:'#e8c0c0'},{id:'frutos',n:tt('h.frutos'),c:'#ff9a9a'},{id:'floral',n:tt('h.floral'),c:'#c5cdf5'},{id:'cuero',n:tt('h.cuero'),c:'#8fb8ff'},{id:'nuez',n:tt('h.nuez'),c:'#a9c487'}];
const WN=id=>(WHEEL.find(w=>w.id===id)||{}).n||id;
const KW={madera:/madera|cedro|roble|ahumad/i,tierra:/tierra|terros|mineral/i,especias:/especia|pimient|canela|picant|clavo/i,dulce:/dulce|miel|caramel|azúcar|azucar|vainilla|melaza|sugar/i,cacao:/cacao|chocolate|café|cafe|espresso|moca/i,frutos:/fruta|frut|cítric|citric|pasas|cereza/i,floral:/flor/i,cuero:/cuero/i,nuez:/nuez|nueces|almendr|maní|avellan/i};
const cigarTags=c=>Object.keys(KW).filter(k=>KW[k].test([c.notas,c.nombre].join(' ')));
function wheel(sel,key){const N=WHEEL.length,R=150,r0=48,cx=160,cy=160;const pt=(a,rr)=>[cx+rr*Math.cos(a),cy+rr*Math.sin(a)];
 const segs=WHEEL.map((w,i)=>{const a0=-Math.PI/2+i*2*Math.PI/N+.012,a1=-Math.PI/2+(i+1)*2*Math.PI/N-.012,am=(a0+a1)/2;const [x0,y0]=pt(a0,R),[x1,y1]=pt(a1,R),[x2,y2]=pt(a1,r0),[x3,y3]=pt(a0,r0);const on=sel.includes(w.id);const [tx,ty]=pt(am,103);const ls=w.l||[w.n];
  return `<g class="wseg${on?' on':''}" role="button" tabindex="0" aria-pressed="${on}" aria-label="${w.n}" data-w="${w.id}" data-wk="${key}" style="--wc:${w.c}"><path d="M${x0.toFixed(1)} ${y0.toFixed(1)}A${R} ${R} 0 0 1 ${x1.toFixed(1)} ${y1.toFixed(1)}L${x2.toFixed(1)} ${y2.toFixed(1)}A${r0} ${r0} 0 0 0 ${x3.toFixed(1)} ${y3.toFixed(1)}Z"/>${ls.map((t,j)=>`<text x="${tx.toFixed(1)}" y="${(ty+(j-(ls.length-1)/2)*15+5).toFixed(1)}" text-anchor="middle">${t}</text>`).join('')}</g>`}).join('');
 return `<div class="wheel-wrap"><svg class="wheel" viewBox="0 0 320 320" role="group" aria-label="${tt('h.ruedaDeSaboresToca')}">${segs}<circle cx="160" cy="160" r="42" class="whub"/><text x="160" y="157" text-anchor="middle" class="whub-n">${sel.length}</text><text x="160" y="176" text-anchor="middle" class="whub-t">${sel.length===1?tt('h.sabor'):tt('h.sabores')}</text></svg></div>`}
function bindWheel(get,set,rerender){$$('.wseg').forEach(g=>{const act=()=>{const k=g.dataset.wk,id=g.dataset.w;const cur=get(k);set(k,cur.includes(id)?cur.filter(x=>x!==id):[...cur,id]);rerender(k,id)};g.addEventListener('click',act);g.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();act()}})})}
const tagChips=ts=>ts.length?`<div class="tagchips">${ts.map(t=>`<span class="tchip" style="--wc:${(WHEEL.find(w=>w.id===t)||{}).c||'#dde3dc'}">${esc(WN(t))}</span>`).join('')}</div>`:'';
/* ---------- hoja de acciones (sheet) ---------- */
let lastFocus=null,closeT=null; /* closeT: el cierre con animación; se cancela al abrir otra hoja o al cerrar al instante, para que no borre la nueva */
function sheet(html,label){clearTimeout(closeT);let el=$('#sheet');if(!el){el=document.createElement('div');el.id='sheet';el.className='sheet';document.body.appendChild(el)}
 lastFocus=document.activeElement;
 el.innerHTML=`<div class="sheet-bg" data-close></div><div class="sheet-panel" role="dialog" aria-modal="true" aria-label="${esc(label)}"><div class="sheet-grip" aria-hidden="true"></div><button class="sheet-x" type="button" data-close aria-label="${tt('h.cerrar')}">×</button>${html}</div>`;
 el.hidden=false;document.body.classList.add('sheet-on');requestAnimationFrame(()=>el.classList.add('open'));$$('[data-close]',el).forEach(b=>b.onclick=closeSheet);
 el.querySelectorAll('a[href^="#"]').forEach(a=>a.addEventListener('click',()=>closeSheet()));
 const f=el.querySelector('.sheet-panel select,.sheet-panel input,.sheet-panel a,.sheet-panel button:not([data-close])');setTimeout(()=>f&&f.focus({preventScroll:true}),80);return el}
/* cierra la hoja sin esperar: la usan los cambios de cuenta, para que ningún editor de Mi Hoja quede abierto ni se pise un aviso nuevo */
function closeSheetNow(){clearTimeout(closeT);const el=$('#sheet');if(!el)return;el.classList.remove('open');el.hidden=true;el.innerHTML='';document.body.classList.remove('sheet-on')}
function closeSheet(){const el=$('#sheet');if(!el||el.hidden)return;el.classList.remove('open');document.body.classList.remove('sheet-on');clearTimeout(closeT);closeT=setTimeout(()=>{el.hidden=true;el.innerHTML='';lastFocus&&lastFocus.focus&&lastFocus.focus({preventScroll:true})},200)}
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeSheet()});
window.addEventListener('hashchange',closeSheet);
const MENU=[['#/catalogo',tt('cat.eyebrow'),tt('h.lasVitolasHechasEn')],['#/artesanos',tt('arts.eyebrow'),tt('h.manosBoricuas')],['#/lugares',tt('lug.eyebrow'),tt('h.loungesYPuntosDe')],['#/eventos',tt('tile.ev'),tt('h.calendarioRsvpYHumo')],['#/mihoja',tt('h.miHoja'),tt('h.humidorDiarioPasaporteY')],['#/cata',tt('tile.cata'),tt('h.pasoAPasoCon')],['#/maridajes',tt('tile.mar'),tt('h.ronYCafeDe')],['#/podcast',tt('h.escuchaEnCigarsPodcast'),tt('h.lanzamientosResenasYCultura')],['#/buscar',tt('cat.search'),tt('h.enTodaLaApp')]];
function openSheet(kind,arg){
 if(kind==='instalar'){const ios=arg==='ios'||arg==='ipad';sheet(`<h2 class="sheet-h">${tt('h.anadirATuPantalla')}</h2><p class="inst-p">${ios?`${tt('h.tocaElBoton')} <b>${tt('h.compartir')}</b> ${tt('h.subeYLuego',{a:arg==='ipad'?tt('h.arriba'):tt('h.abajo')})} <b>${tt('h.anadirAPantallaDe')}</b>.`:`${tt('h.abreElMenuDel')}<b>⋮</b> ${tt('h.o')} <b>⋯</b>${tt('h.yToca')} <b>${tt('h.instalarApp')}</b> ${tt('h.o')} <b>${tt('h.anadirAPantallaDe')}</b>.`}</p><button type="button" class="lbtn buy inst-ok" data-close>${tt('h.entendido')}</button>`,tt('h.anadirATuPantalla'));return}
 if(kind==='menu'){sheet(`<h2 class="sheet-h">${tt('h.menu')}</h2><nav class="menu-list" aria-label="${tt('h.menu')}">${MENU.map(([h,t,s])=>`<a href="${h}" class="row"><div><div class="t">${t}</div><div class="s">${s}</div></div><span class="go">›</span></a>`).join('')}</nav>`,tt('h.menu'));return}
 if(kind==='plus'){sheet(`<h2 class="sheet-h">${tt('h.queQuieresHacer')}</h2><div class="menu-list">
  <a href="#/cata" class="row big"><span class="ico">${VBArt.leaf('#8fd162')}</span><div><div class="t">${tt('h.empezarUnaCataGuiada')}</div><div class="s">${tt('h.pasoAPasoSe')}</div></div></a>
  <button type="button" class="row big" data-sheet="humidor"><span class="ico">${VBArt.leaf('#ffd27a')}</span><div><div class="t">${tt('h.anadirAlHumidor')}</div><div class="s">${tt('h.delCatalogoOUno')}</div></div></button>
  <a href="#/subir" class="row big"><span class="ico">${VBArt.leaf('#ff9a9a')}</span><div><div class="t">${tt('h.subirUnaVitola')}</div><div class="s">${tt('h.conFotoATu')}</div></div></a></div>`,tt('h.acciones'));return}
 if(kind==='humidor')return humidorForm(arg);
 if(kind==='share')return shareCard(arg)}
/* ---------- humidor ---------- */
function cigarOptions(sel){const byA={};A.allCigars().forEach(c=>{const n=A.artisanName(c);(byA[n]=byA[n]||[]).push(c)});
 return Object.keys(byA).sort((a,b)=>a.localeCompare(b,'es')).map(n=>`<optgroup label="${esc(n)}">${byA[n].map(c=>`<option value="${esc(c.id)}" ${c.id===sel?'selected':''}>${esc(c.nombre)}</option>`).join('')}</optgroup>`).join('')}
function humidorForm(cid,editId){const it=editId?S().humidor.find(x=>x.id===editId):null;const sel=it?it.cigarId:cid||'';
 const el=sheet(`<h2 class="sheet-h">${it?tt('h.editarEnTuHumidor'):tt('h.anadirAlHumidor')}</h2><form class="form" id="hForm">
 <div class="field"><label for="hCig">${tt('h.cigarro')}</label><select id="hCig"><option value="">${tt('h.escogeDelCatalogo')}</option>${cigarOptions(sel)}<option value="__otro" ${it&&!it.cigarId?'selected':''}>${tt('up.other')}</option></select></div>
 <div class="field" id="hOtroW" ${it&&!it.cigarId?'':'hidden'}><label for="hOtro">${tt('h.nombreDelCigarro')}</label><input id="hOtro" maxlength="70" value="${esc(it&&!it.cigarId?it.nombre:'')}" placeholder="${tt('h.ejRobustoQueMe')}"></div>
 <div class="row2"><div class="field"><label for="hQty">${tt('h.cantidad')}</label><div class="qty"><button type="button" data-q="-1" aria-label="${tt('h.menos')}">−</button><input id="hQty" type="number" inputmode="numeric" min="1" max="999" value="${it?it.cantidad:1}"><button type="button" data-q="1" aria-label="${tt('h.mas')}">+</button></div></div>
 <div class="field"><label for="hFecha">${tt('h.fecha')}</label><input id="hFecha" type="date" value="${esc(it?it.fecha:hoy())}"></div></div>
 <div class="field"><label for="hNota">${tt('h.notaOpcional')}</label><input id="hNota" maxlength="120" value="${esc(it?it.nota||'':'')}" placeholder="${tt('h.dondeLoComprastePara')}"></div>
 <button class="btn" type="submit">${it?tt('h.guardarCambios'):tt('h.guardarEnMiHumidor')}</button></form>`,tt('h.anadirAlHumidor'));
 $('#hCig',el).onchange=e=>{$('#hOtroW',el).hidden=e.target.value!=='__otro'};
 $$('[data-q]',el).forEach(b=>b.onclick=()=>{const q=$('#hQty',el);q.value=Math.max(1,Math.min(999,(+q.value||1)+(+b.dataset.q)))});
 $('#hForm',el).onsubmit=e=>{e.preventDefault();const v=$('#hCig',el).value;const otro=$('#hOtro',el).value.trim();
  if(!v||(v==='__otro'&&!otro)){toast(tt('h.escogeOEscribeEl'));return}
  const c=v!=='__otro'?A.cigarById(v):null;const rec={id:it?it.id:uid('h'),cigarId:c?c.id:null,nombre:c?c.nombre:otro,artesano:c?A.artisanName(c):'',cantidad:Math.max(1,Math.min(999,parseInt($('#hQty',el).value)||1)),fecha:$('#hFecha',el).value||hoy(),nota:$('#hNota',el).value.trim(),actualizado:new Date().toISOString()};
  save(s=>{if(it)s.humidor=s.humidor.map(x=>x.id===it.id?rec:x);else{const same=rec.cigarId?s.humidor.find(x=>x.cigarId===rec.cigarId&&x.fecha===rec.fecha):null;if(same){same.cantidad+=rec.cantidad;same.actualizado=rec.actualizado}else s.humidor.unshift(rec)}});
  closeSheet();toast(it?tt('h.humidorActualizado'):`${tt('h.anadido',{a:rec.cantidad,b:rec.nombre})}`);if(location.hash.startsWith('#/mihoja'))setTimeout(()=>A.route(),220)}}
/* ---------- respaldo ---------- */
function download(blob,name){const u=URL.createObjectURL(blob);const a=document.createElement('a');a.href=u;a.download=name;a.rel='noopener';document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(u);a.remove()},4000)}
function exportar(){const s=S();const data={app:'La Hoja Boricua',tipo:'respaldo-mi-hoja',schema:SCHEMA,exportado:new Date().toISOString(),url:APP_URL,
 mihoja:{...s,draft:null},extra:{perfil:legacy('perfil'),sugeridas:legacy('sugeridas')||[],subidas:legacy('uploads')||[]}};
 download(new Blob([JSON.stringify(data,null,1)],{type:'application/json'}),`la-hoja-boricua-respaldo-${hoy()}.json`);
 s.respaldo=new Date().toISOString();s.cambios=0;s.recordarDespues=null;write(s);lastBackup=LHB_MERGE.canon(s);toast(tt('h.respaldoDescargado'));if(location.hash.startsWith('#/mihoja'))setTimeout(()=>A.route(),300)}
const byId=(a,b,key='id')=>{const m=new Map(a.map(x=>[x[key],x]));for(const x of b){if(!x||!x[key])continue;const o=m.get(x[key]);if(!o||(x.actualizado||x.fecha||'')>(o.actualizado||o.fecha||''))m.set(x[key],x)}return [...m.values()]};
function importar(file){const fr=new FileReader();fr.onload=()=>{let j;try{j=JSON.parse(fr.result)}catch(e){toast(tt('h.eseArchivoNoEs'));return}
 const m=j&&(j.mihoja||(Array.isArray(j.humidor)&&j));if(!m||(j.app&&j.app!=='La Hoja Boricua')){toast(tt('h.eseArchivoNoEs2'));return}
 const inc=upgrade(JSON.parse(JSON.stringify(m)));const cur=S();try{localStorage.setItem(KEY+'_antes_de_importar',JSON.stringify(cur))}catch(e){}
 const n0={d:cur.diario.length,h:cur.humidor.length};
 /* LHB-28: importar y la sincronización juntan con una sola función (site/sync.js): sin base, y lo de este teléfono gana si los dos cambiaron lo mismo */
 save(s=>{const m=LHB_MERGE.merge(null,s,inc,{prefer:'local'});s.humidor=m.humidor;s.diario=m.diario;s.pasaporte=m.pasaporte;s.favs=m.favs;s.ratings=m.ratings});
 const x=j.extra||{};try{if(x.perfil&&!legacy('perfil'))localStorage.setItem('vb_perfil',JSON.stringify(x.perfil));
  if(Array.isArray(x.sugeridas)&&x.sugeridas.length)localStorage.setItem('vb_sugeridas',JSON.stringify(byId(legacy('sugeridas')||[],x.sugeridas)));
  if(Array.isArray(x.subidas)&&x.subidas.length)localStorage.setItem('vb_uploads',JSON.stringify(byId(legacy('uploads')||[],x.subidas)))}catch(e){}
 const s=S();toast(`${tt('h.importadoCatasEnHumidor',{a:s.diario.length-n0.d,b:s.humidor.length-n0.h})}`);A.route()};fr.readAsText(file)}
function backupDue(){const s=S();const n=s.diario.length+s.humidor.length+Object.values(s.pasaporte).reduce((t,o)=>t+Object.keys(o).length,0);if(!n||!s.cambios)return false;
 if(s.recordarDespues&&new Date(s.recordarDespues)>new Date())return false;if(!s.respaldo)return s.cambios>=3;return (Date.now()-new Date(s.respaldo))/864e5>=14}
const backupBanner=()=>backupDue()?`<div class="remind" role="note"><p><b>${tt('h.unRespaldo')}</b> ${tt('h.tusCatasYTu')}</p><div class="remind-b"><button class="lbtn" data-exp type="button">${tt('h.exportarAhora')}</button><button class="lbtn ghost" data-snooze type="button">${tt('h.luego')}</button></div></div>`:'';
const backupPanel=()=>{const s=S();return `<section class="backup"><div class="section-title"><h2>${tt('h.respaldo')}</h2></div><p class="lead" style="margin-top:-4px">${tt('h.exportaUnArchivoCon',{a:s.respaldo?` ${tt('h.ultimoRespaldo',{a:fmtF(s.respaldo)})}`:tt('h.todaviaNoHasHecho')})}</p>
 <div class="links"><button class="lbtn" data-exp type="button">${tt('h.exportarRespaldo')}</button><label class="lbtn" tabindex="0">${tt('h.importarRespaldo')}<input type="file" accept="application/json,.json" id="impF" class="sr"></label></div><p class="note" style="margin-top:6px">${tt('h.lasFotosDeTus')}</p>${syncLine()}</section>`};
const syncLine=()=>{const t=SYNC?SYNC.status():{state:'idle'};const m={ok:t.at?`${tt('h.tuMiHojaEsta',{a:fmtF(t.at)})}`:tt('h.tuMiHojaEsta2'),syncing:tt('h.sincronizandoConTuCuenta'),offline:tt('h.sinConexionTusCambios'),error:tt('h.noPudimosSincronizarCon')}[t.state]||tt('h.miHojaSeSincroniza');return `<p class="note" id="syncSt" aria-live="polite" style="margin-top:6px">${m}</p>`};
function bindBackup(){$$('[data-exp]').forEach(b=>b.onclick=exportar);$$('[data-snooze]').forEach(b=>b.onclick=()=>{const s=S();s.recordarDespues=new Date(Date.now()+7*864e5).toISOString();write(s);b.closest('.remind').remove()});const f=$('#impF');if(f)f.onchange=e=>{const x=e.target.files&&e.target.files[0];if(x)importar(x);e.target.value=''}}
/* ---------- cuenta (LHB-25): la lógica vive en cuenta.js; aquí Clerk, las pantallas y el perfil ---------- */
const CLERK=location.hostname==='lahojaboricua.com'?{pk:'pk_live_Y2xlcmsubGFob2phYm9yaWN1YS5jb20k',fapi:'clerk.lahojaboricua.com'}:{pk:'pk_test_ZGFyaW5nLWVhZ2xlLTgzOTQuY2xlcmsuYWNjb3VudHMuZGV2JA',fapi:'daring-eagle-8394.clerk.accounts.dev'};
const HANDLE_RE=/^[a-z0-9_]{3,20}$/;
/* el perfil visto la última vez, para abrir Mi Hoja sin conexión; se borra al salir */
/* LHB-52: la llave nueva (cuenta2) deja sin valor lo guardado antes de pedir la identidad: un perfil guardado de antes ({sub,handle}) no abre Mi Hoja sin conexión ni por el camino rápido; clear() borra las dos */
/* LHB-51: al guardar o borrar la cuenta guardada se repinta la foto del encabezado */
/* LHB-60 (Codex r1): acctW son los que miran la cuenta guardada (los botones de seguir); se les avisa al guardarla o borrarla */
const acctW=new Set(),acctTell=()=>{for(const f of [...acctW])f()};
const acct={get:()=>A.LS.get('cuenta2',null),set:v=>{A.LS.set('cuenta2',v);if(A.topAvatar)A.topAvatar();acctTell()},clear:()=>{try{localStorage.removeItem('vb_cuenta2');localStorage.removeItem('vb_cuenta')}catch(e){}if(A.topAvatar)A.topAvatar();acctTell()}};
/* la acción que el usuario empezó, para retomarla si Google lo manda a otra página y vuelve */
const intent={get:()=>{try{return JSON.parse(sessionStorage.getItem('lhb_intent'))}catch(e){return null}},set:v=>{try{sessionStorage.setItem('lhb_intent',JSON.stringify(v))}catch(e){}},clear:()=>{try{sessionStorage.removeItem('lhb_intent')}catch(e){}}};
let clerkP=null;
const script=(src,pk)=>new Promise((ok,no)=>{const s=document.createElement('script');s.async=true;s.crossOrigin='anonymous';if(pk)s.dataset.clerkPublishableKey=pk;s.src=src;s.onload=ok;s.onerror=no;document.head.appendChild(s)});
/* clerk-js 6 trae la lógica; las pantallas de entrar vienen aparte en @clerk/ui y se le pasan al cargar */
function clerk(){if(clerkP)return clerkP;
 clerkP=Promise.all([script(`https://${CLERK.fapi}/npm/@clerk/clerk-js@6/dist/clerk.browser.js`,CLERK.pk),script(`https://${CLERK.fapi}/npm/@clerk/ui@1/dist/ui.browser.js`)])
  .then(()=>window.Clerk.load({ui:{ClerkUI:window.__internal_ClerkUICtor}})).then(()=>window.Clerk).catch(e=>{clerkP=null;throw e});
 return clerkP}
/* extra: cabeceras de más (If-Match en la sincronización). go: si dice que no cuando ya está la llave, el pedido no sale (LHB-60: la página se fue mientras tanto) */
async function api(C,method,path,body,uid,extra,go){const t=await C.session.getToken();if(uid&&(!C.user||C.user.id!==uid))throw new Error('account-changed');if(go&&!go())throw new Error('gone');const r=await fetch(path,{method,headers:{Authorization:'Bearer '+t,...(body?{'Content-Type':'application/json'}:{}),...(extra||{})},body:body?JSON.stringify(body):undefined});let j={};try{j=await r.json()}catch(e){}return {status:r.status,body:j}}
/* LHB-28 y LHB-31: Mi Hoja viaja a la cuenta (site/sync.js). Aquí solo se conecta con el teléfono: el almacenamiento, Clerk, la red y el aviso de lo que llegó */
SYNC=window.LHB_SYNC({ls:{get:k=>localStorage.getItem(k),set:(k,v)=>localStorage.setItem(k,v),remove:k=>localStorage.removeItem(k)},getDoc:()=>{ST=load();STRAW=localStorage.getItem(KEY);return ST},setDoc:(d,exp)=>{if(exp!==undefined&&LHB_MERGE.stable(load())!==exp)return 'stale';ST=normalize(d);return write(ST)},clerk,api,acct:()=>acct.get(),
 lock:f=>navigator.locks&&navigator.locks.request?navigator.locks.request('lhb_mihoja_sync',f):f(),
 now:()=>new Date().toISOString(),nowMs:()=>Date.now(),setTimer:(f,ms)=>setTimeout(f,ms),clearTimer:id=>clearTimeout(id),wait:ms=>new Promise(r=>setTimeout(r,ms)),toast,
 listen:(ev,f)=>{if(ev==='online')window.addEventListener('online',f);else document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')f()})},
 /* lo que llegó de otro teléfono se ve al momento si la persona está mirando una lista de Mi Hoja y no tiene una hoja abierta */
 onState:()=>{const el=document.getElementById('syncSt');if(el)el.outerHTML=syncLine()},onApplied:()=>{if(/^#\/mihoja(\/(humidor|diario|pasaporte|favoritos))?$/.test(location.hash)&&!document.body.classList.contains('sheet-on')){dKeepFocus();A.route()}else pfOwnSync()}});
SYNC.start();
/* ---------- LHB-34: la cuenta en Perfil: descargar los datos (el respaldo de siempre), salir y borrar la cuenta ---------- */
/* lastBackup: el canon del último respaldo descargado en esta página; si Mi Hoja sigue igual, salir no pierde nada aunque no haya red.
   outDone: lo de este teléfono ya se borró y falta cerrar la sesión de Clerk; si eso falló, el botón lo vuelve a intentar sin revisar otra vez */
let lastBackup=null,acBusy=false,outDone=false;
const acMsg=t=>{const el=$('#acMsg');if(el){el.textContent=t;el.hidden=!t}};
/* lo que queda de esta página después de salir o de borrar: el aviso para la página que abre después */
const bye=k=>{try{sessionStorage.setItem('lhb_bye',k)}catch(e){}};
try{const k=sessionStorage.getItem('lhb_bye');if(k){sessionStorage.removeItem('lhb_bye');setTimeout(()=>toast(k==='del'?tt('ac.del.done'):tt('ac.bye')),600)}}catch(e){}
/* un borrado empezado: la marca se pone antes del pedido y se quita cuando el servidor contesta que terminó o que no borró nada (4xx, 503).
   Si la respuesta se pierde o Clerk falla (502), la próxima vez que la app abre con esa cuenta se termina sola (resumeDelete). Ese pedido manda '#fin',
   que nunca es un @: solo sirve si el perfil ya no está (functions/api/account.js); con el perfil entero el servidor dice que no y la marca se va sin borrar nada */
const DELMARK='lhb_borrando';
const delMark={get:()=>{try{const v=JSON.parse(localStorage.getItem(DELMARK));return v&&typeof v.sub==='string'?v:null}catch(e){return null}},
 /* set dice si la marca quedó guardada (se lee de vuelta): sin ella un borrado a medias no se podría terminar, así que no se pide (Codex r3) */
 set:sub=>{try{localStorage.setItem(DELMARK,JSON.stringify({sub}))}catch(e){return false}const v=delMark.get();return !!v&&v.sub===sub},clear:()=>{try{localStorage.removeItem(DELMARK)}catch(e){}}};
/* se borra lo de esta cuenta en este teléfono: Mi Hoja y su sincronización (sync.js), la cuenta guardada y la acción a medias.
   Con mark (de SYNC.settled), solo si la copia sigue como se revisó; si alguien escribió desde entonces no se toca nada */
const dropLocal=async mark=>{if(!(await SYNC.forget(mark)))return false;acct.clear();intent.clear();ST=null;STRAW=null;return true};
async function signOutClerk(C){await C.signOut({redirectUrl:'/'});location.assign('/')}
/* Codex r6: mientras Clerk cierra la sesión (al salir y al borrar) la valla se renueva, así nadie escribe Mi Hoja hasta que termine; si falla, se deja de renovar y caduca sola */
async function leaving(C){SYNC.fenceUp();const beat=setInterval(SYNC.fenceUp,3e3);try{await signOutClerk(C)}finally{clearInterval(beat)}}
const typedOk=(a,v)=>String(v||'').trim().replace(/^@/,'').toLowerCase()===String(a.handle).toLowerCase();
function accountPanel(){const a=acct.get();if(!a||!a.handle)return '';
 return `<section class="acct-p" id="acctP"><div class="section-title"><h2>${tt('ac.h')}</h2></div>
 <div class="links"><button class="lbtn" data-exp type="button">${tt('ac.download')}</button><button class="lbtn" type="button" id="acOut">${tt('ac.out')}</button></div>
 <p class="hint" id="acMsg" role="status" aria-live="polite" hidden></p>
 <details class="edit"><summary>${tt('ac.del.s')}</summary><p>${tt('ac.del.p')}</p>
 <div class="field"><label for="acDelI">${tt('ac.del.l',{a:'@'+esc(a.handle)})}</label><input id="acDelI" autocapitalize="none" autocomplete="off" spellcheck="false"></div>
 <button class="btn" type="button" id="acDel" disabled>${tt('ac.del.b')}</button></details>
 <p class="hint">${tt('h.leeQueGuardamosY')} <a href="/privacidad">${tt('h.privacidadYCuenta')}</a>.</p></section>`}
function bindAccount(){const a=acct.get();const out=$('#acOut'),del=$('#acDel'),inp=$('#acDelI');if(!a||!out)return;
 out.onclick=salir;$$('#acctP [data-exp]').forEach(b=>b.onclick=exportar);
 inp.oninput=()=>{del.disabled=!typedOk(a,inp.value)};
 del.onclick=()=>borrar(a,inp.value)}
/* salir: solo si la cuenta tiene lo último de este teléfono (o lo de ahora está en un respaldo recién descargado). Entonces se borra Mi Hoja de este teléfono,
   para que un teléfono prestado no se quede con lo de nadie, y se cierra la sesión. Clerk se pide antes de revisar: entre la revisión y el borrado no hay esperas */
async function salir(){if(acBusy)return;acBusy=true;acMsg(tt('ac.checking'));
 try{let C;try{C=await clerk()}catch(e){acMsg(tt('ac.outFail'));return}
  /* Codex r5: si después del borrado alguien volvió a escribir Mi Hoja (la valla ya caducó), el reintento revisa todo otra vez y las pasadas vuelven */
  if(outDone){let back=null;try{back=localStorage.getItem(KEY)}catch(e){}if(back!==null){outDone=false;SYNC.hold(false)}}
  if(!outDone){const r=await SYNC.settled({backup:lastBackup});
   if(!r.ok){acMsg(r.why==='draft'?tt('ac.draft'):tt('ac.pending'));return}
   if(!(await dropLocal(r.mark))){acMsg(tt('ac.pending'));return}
   outDone=true;bye('out')}
  try{await leaving(C)}catch(e){acMsg(tt('ac.outFail'))}}
 finally{acBusy=false}}
/* el pedido de borrar. 200: se borra lo de este teléfono y se cierra la sesión. La marca se quita si el servidor dice que no borró nada: confirm-mismatch
   (el perfil sigue entero), o un 4xx o 503 de un primer pedido (had: ya había una marca de antes). Con una marca de antes, un error así puede ser pasajero
   (Clerk no contestó, la sesión venció) y el borrado a medias sigue pendiente: la marca se queda (Codex r2) */
async function askDelete(C,sub,confirm,had){let r=null;try{r=await api(C,'DELETE','/api/account',{confirm},sub)}catch(e){r=null}
 if(r&&r.status===200){delMark.clear();await dropLocal();bye('del');try{await leaving(C)}catch(e){location.assign('/')}return r}
 if(r&&r.body&&r.body.error==='confirm-mismatch')delMark.clear();
 else if(!had&&r&&((r.status>=400&&r.status<500)||r.status===503))delMark.clear();
 return r}
/* borrar: el servidor borra la base y el usuario de Clerk (functions/api/account.js). Mientras tanto no corre ninguna pasada; si no se borró nada, vuelven.
   Si quedó a medias (502) o no se sabe (sin respuesta), la sincronización sigue parada y otro intento, con el mismo @ escrito, lo termina */
/* Codex r4: un borrado a la vez en todo el teléfono, esta página y las otras pestañas (Web Locks; sin ellas, en fila dentro de la página):
   el botón y el que termina uno a medias no se cruzan, así la respuesta de uno no le quita la marca al que todavía espera la suya */
let delQ=Promise.resolve();
const delLock=f=>typeof navigator!=='undefined'&&navigator.locks&&navigator.locks.request?navigator.locks.request('lhb_borrar',f):(delQ=delQ.then(f,f));
async function borrar(a,typed){if(acBusy)return;acBusy=true;const del=$('#acDel');if(del)del.disabled=true;acMsg(tt('ac.del.wait'));
 try{let C;try{C=await clerk()}catch(e){acMsg(tt('ac.del.fail'));return}
  await delLock(async()=>{await SYNC.hold(true);const had=!!delMark.get();
   if(!delMark.set(a.sub)){if(!delMark.get())SYNC.hold(false);acMsg(tt('ac.del.store'));return}
   const r=await askDelete(C,a.sub,typed,had);
   if(r&&r.status===200)return;
   if(!delMark.get())SYNC.hold(false);
   acMsg(!r?tt('ac.del.fail'):r.status===502?tt('ac.del.half'):r.body&&r.body.error==='confirm-mismatch'?tt('ac.del.bad'):r.status===503?tt('ac.del.off'):tt('ac.del.fail'))})}
 finally{acBusy=false;const d=$('#acDel'),i=$('#acDelI');if(d&&i)d.disabled=!typedOk(a,i.value)}}
/* al abrir la app con un borrado a medias de esta misma cuenta, se termina; con otra cuenta o sin sesión, la marca espera. La marca se lee otra vez dentro del turno: otro pudo terminarlo */
async function resumeDelete(){if(!delMark.get())return;let C;try{C=await clerk()}catch(e){return}
 await delLock(async()=>{const m=delMark.get();if(!m||!C||!C.user||C.user.id!==m.sub)return;
  await SYNC.hold(true);
  const r=await askDelete(C,m.sub,'#fin',true);
  if(r&&r.status===200)return;
  if(!delMark.get())SYNC.hold(false);else if(r&&r.status===502)toast(tt('ac.del.half'))})}
if(delMark.get())setTimeout(resumeDelete,1500);
/* otra pestaña salió de la cuenta o la borró (sync.js forget quita el dueño): esta suelta su Mi Hoja en memoria, para no volver a escribirla, y abre de nuevo */
window.addEventListener('storage',e=>{if(e.key==='lhb_mihoja_v1_owner'&&e.oldValue&&e.newValue===null){SYNC.hold(true);ST=null;STRAW=null;location.assign('/')}});
function accountCard(h,p,b){view.innerHTML=`<header class="mh-head"><div class="eyebrow">${tt('h.miHoja')}</div><h1>${tt('h.loTuyo')}</h1></header><div class="empty acct"><p><b>${h}</b></p><p>${p}</p>${b?`<button class="btn" type="button" id="acctBtn">${esc(b.label)}</button>`:''}</div>`;if(b)$('#acctBtn').onclick=b.on}
function accountNotice(h,p,b){const el=sheet(`<h2 class="sheet-h">${esc(h)}</h2><p>${esc(p)}</p>${b?`<button class="btn" type="button" id="acctNB">${esc(b.label)}</button>`:''}`,h);
 if(b)el.querySelector('#acctNB').onclick=()=>{closeSheetNow();b.on()}}
const OB_ERR={'handle-invalid':tt('h.tuDebeTenerDe'),'handle-reserved':tt('h.eseEstaReservadoEscoge'),'handle-taken':tt('h.eseYaLoTiene'),'first_name-required':tt('h.escribeTuNombre'),'first_name-long':tt('h.tuNombrePuedeTener'),'first_name-invalid':tt('h.tuNombreTieneCaracteres'),'last_name-required':tt('h.escribeTuApellido'),'last_name-long':tt('h.tuApellidoPuedeTener'),'last_name-invalid':tt('h.tuApellidoTieneCaracteres'),'gender-required':tt('h.escogeMasculinoOFemenino'),'gender-invalid':tt('h.escogeMasculinoOFemenino'),'birth_date-required':tt('h.escribeTuFechaDe'),'birth_date-invalid':tt('h.esaFechaDeNacimiento'),'birth_date-future':tt('h.esaFechaTodaviaNo'),'age-under-21':tt('h.laHojaBoricuaEs'),'identity-exists':tt('h.tuPerfilYaEsta'),'busy':tt('h.esperaAQueTermine'),'bio-long':tt('h.laDescripcionPuedeTener'),'favorite_brand-long':tt('h.laMarcaPuedeTener'),'recheck':tt('h.tuPerfilYaExiste'),'avatar-required':tt('h.ponUnaFotoPara'),'avatar-invalid':tt('h.noPudimosUsarEsa'),'avatar-type':tt('h.escogeUnArchivoDe'),'avatar-upload':tt('h.noPudimosSubirLa'),'avatar-busy':tt('h.esperaAQueTermine'),'no-profile':tt('h.primeroCreaTuPerfil')};
/* LHB-52: la identidad del perfil. Las mismas reglas que el servidor (functions/_lib/profile.js): nombre y apellido de 1 a 50 caracteres sin caracteres de control, género M o F, y una fecha real,
   que no sea futura y dé 21 años o más. today es la fecha UTC ('YYYY-MM-DD'), la misma que usa el servidor, no la del teléfono. Devuelve la clave del error o '' */
const ID_BAD=/[\p{Cc}\p{Zl}\p{Zp}]/u;
function idProblem(f,today){
 for(const k of ['first_name','last_name']){const s=String(f[k]==null?'':f[k]).trim();if(!s)return k+'-required';if(ID_BAD.test(s))return k+'-invalid';if([...s].length>50)return k+'-long'}
 if(f.gender!=='M'&&f.gender!=='F')return 'gender-required';
 const v=f.birth_date;if(v==null||v==='')return 'birth_date-required';
 if(typeof v!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(v))return 'birth_date-invalid';
 const y=+v.slice(0,4),m=+v.slice(5,7),d=+v.slice(8,10),dt=new Date(0);dt.setUTCFullYear(y,m-1,d);
 if(dt.getUTCFullYear()!==y||dt.getUTCMonth()!==m-1||dt.getUTCDate()!==d||y<1900)return 'birth_date-invalid';
 if(v>today)return 'birth_date-future';
 if(v>String(+today.slice(0,4)-21).padStart(4,'0')+today.slice(4))return 'age-under-21';
 return ''}
/* mode 'identity': un perfil que ya existía y solo le falta nombre, apellido, género y fecha de nacimiento ("Completa tu perfil"); sin foto, sin @, sin bio ni marca */
/* mode 'edit' (LHB-55): el perfil de siempre editado de una vez, con lo guardado (init) puesto; es el mismo formulario y el mismo selector de foto que el del perfil nuevo, con "Guardar" y "Cancelar" */
function onboardingForm(submit,picture,mode,init,check){const marcas=[...new Set((D().artesanos||[]).map(a=>a.nombre))].sort((a,b)=>a.localeCompare(b,'es'));const idm=mode==='identity';const edm=mode==='edit';const pf=init||{};const today=new Date().toISOString().slice(0,10);
 view.innerHTML=`<header class="mh-head"><div class="eyebrow">${tt('h.miHoja')}</div><h1>${idm?tt('h.completaTuPerfil'):edm?tt('h.editarPerfil'):tt('h.tuPerfil')}</h1></header>
 <form class="form" id="obForm" novalidate>
 ${idm?'<p class="hint">'+tt('h.ahoraPedimosTuNombre')+'</p>':`<div class="ob-pic" role="group" aria-labelledby="obPt"><p class="ob-pic-t" id="obPt">${tt('pf.fotoAlt')}</p><div class="ob-pic-row"><span class="ob-pic-img" id="obPv"></span><button class="lbtn" type="button" id="obPb"></button></div><p class="hint" id="obPh" aria-live="polite"></p><input type="file" accept="image/*" id="obPf" class="sr" tabindex="-1"></div>
 <div class="field"><label for="obH">${tt('h.tuNombreDeUsuario')}</label><input id="obH" required minlength="3" maxlength="20" autocapitalize="none" autocomplete="username" spellcheck="false" placeholder="${tt('h.ejTabaqueroPr')}"><p class="hint">${tt('h.de3A20')}</p><p class="hint" id="obHs" aria-live="polite"></p></div>`}
 <div class="field"><label for="obFn">${tt('pf.yourName')}</label><input id="obFn" required maxlength="50" autocomplete="given-name"></div>
 <div class="field"><label for="obLn">${tt('h.tuApellido')}</label><input id="obLn" required maxlength="50" autocomplete="family-name"></div>
 <div role="radiogroup" aria-labelledby="obGt"><p class="ob-pic-t" id="obGt">${tt('h.tuGenero')}</p><label class="check"><input type="radio" name="obG" id="obGM" value="M"> ${tt('h.masculino')}</label><label class="check"><input type="radio" name="obG" id="obGF" value="F"> ${tt('h.femenino')}</label></div>
 <div class="field"><label for="obD">${tt('h.tuFechaDeNacimiento')}</label><input id="obD" type="date" required min="1900-01-01" max="${today}" autocomplete="bday"><p class="hint">${tt('h.tienesQueTener21')}</p></div>
 ${idm?'':`<div class="field"><label for="obB">${tt('h.unaDescripcionCortaOpcional')}</label><textarea id="obB" maxlength="160" rows="3"></textarea><p class="hint"><span id="obBn">0</span>/160</p></div><div class="field"><label for="obM">${tt('h.tuMarcaFavoritaOpcional')}</label><input id="obM" maxlength="60" list="obML"><datalist id="obML">${marcas.map(m=>`<option value="${esc(m)}">`).join('')}</datalist></div>`}
 <p class="hint">${tt('h.leeQueGuardamosY')} <a href="/privacidad">${tt('h.privacidadYCuenta')}</a>.</p>
 <p class="hint" id="obErr" role="alert" hidden></p>
 <button class="btn" type="submit" id="obGo">${idm||edm?tt('h.guardar'):tt('h.crearMiPerfil')}</button>${edm?'<a class="lbtn" href="#/mihoja/perfil" id="obCancel">'+tt('h.cancelar')+'</a>':''}</form>`;
 const form=$('#obForm');
 if(edm){$('#obH').value=pf.handle||'';$('#obFn').value=pf.first_name||'';$('#obLn').value=pf.last_name||'';$('#obGM').checked=pf.gender==='M';$('#obGF').checked=pf.gender==='F';$('#obD').value=pf.birth_date||'';$('#obB').value=pf.bio||'';$('#obM').value=pf.favorite_brand||'';const n=$('#obBn');if(n)n.textContent=[...String(pf.bio||'')].length}
 /* un error del formulario tiene que verse: caja roja con borde, texto grande, y la pantalla baja hasta ella (en un teléfono quedaba debajo del botón y pasaba desapercibido) */
 const err=m=>{const e=$('#obErr');if(!e)return;e.textContent=m||'';e.hidden=!m;
  if(e.style)e.style.cssText=m?'border:2px solid var(--flam);background:rgba(208,25,46,.2);color:var(--cream);padding:12px 14px;border-radius:12px;font-size:16px;font-weight:600;line-height:1.4;margin:14px 0':'';
  if(m&&typeof e.scrollIntoView==='function')e.scrollIntoView({block:'center',behavior:'smooth'})};
 /* LHB-49: la foto es obligatoria. Viene la de la cuenta (Google, Apple) si la hay; la persona puede escoger otra, que se achica aquí antes de subirla a su cuenta */
 let own=false;
 const showPic=()=>{if(idm)return;const u=picture.url(),v=$('#obPv');v.textContent='';if(u){const im=document.createElement('img');im.alt=tt('h.tuFotoDePerfil');im.src=u;v.appendChild(im)}else v.textContent='+';
  $('#obPb').textContent=u?tt('h.cambiarFoto'):tt('h.elegirFoto');$('#obPh').textContent=u?(own?tt('h.listoEstaEsTu'):edm?tt('h.estaEsTuFoto'):tt('h.usamosLaFotoDe')):tt('h.paraCrearTuPerfil')};
 /* una sola operación a la vez: mientras se sube la foto o se crea el perfil, ni el botón de foto ni el de crear responden */
 let working=false;const busy=b=>{working=b;$('#obGo').disabled=b;const pb=$('#obPb');if(pb)pb.disabled=b};
 showPic();
 if(!idm){
 $('#obPb').onclick=()=>$('#obPf').click();
 $('#obPf').onchange=async e=>{const f=e.target.files&&e.target.files[0];e.target.value='';if(!f||working)return;
  if(!/^image\//.test(f.type))return err(OB_ERR['avatar-type']);
  err('');busy(true);let r;
  try{const b=await A.resizeImage(f,512,.85);r=await picture.upload(new File([b],'perfil.jpg',{type:'image/jpeg'}))}catch(x){r={error:'avatar-type'}}
  if($('#obForm')!==form)return;if(!r||r.stale){busy(false);return}
  busy(false);if(r.error)return err(OB_ERR[r.error]||OB_ERR['avatar-upload']);
  own=true;showPic()};
 /* LHB-63: mientras se escribe el @ se avisa si está libre. Lo que las reglas rechazan se dice al instante y sin pedir nada; lo demás se pregunta 400 ms después de la última tecla, y solo
    la respuesta a lo último escrito se pinta (una tardía de un texto viejo se descarta). El @ que ya era tuyo no se marca. Sin conexión, con el tope o con cualquier fallo no se dice nada y Guardar no se bloquea: guardar revisa igual (409) */
 let hseq=0,htm=0;const hsay=(m,ok)=>{const s=$('#obHs');if(!s)return;s.textContent=m||'';s.className=m?(ok?'hint hs-ok':'hint hs-bad'):'hint'};
 $('#obH').oninput=()=>{hseq++;clearTimeout(htm);const my=hseq,h=$('#obH').value.trim().toLowerCase();
  if(!h||(edm&&h===String(pf.handle||'').toLowerCase()))return hsay('');
  if(!HANDLE_RE.test(h))return hsay(OB_ERR['handle-invalid']);
  hsay('');if(!check)return;
  htm=setTimeout(async()=>{let r;try{r=await check(h)}catch(x){r=null}
   if(my!==hseq||$('#obForm')!==form)return;
   if(r&&r.available===true)hsay(tt('h.disponible'),true);
   else if(r&&r.available===false&&r.reason==='taken')hsay(OB_ERR['handle-taken']);
   else if(r&&r.available===false&&r.reason==='reserved')hsay(OB_ERR['handle-reserved']);
   else hsay('')},400)};
 $('#obB').oninput=e=>{const n=$('#obBn');if(n)n.textContent=[...e.target.value].length}}
 form.onsubmit=async e=>{e.preventDefault();if(working)return;
  const f={first_name:$('#obFn').value.trim(),last_name:$('#obLn').value.trim(),gender:$('#obGM').checked?'M':$('#obGF').checked?'F':'',birth_date:$('#obD').value};
  let h='';
  if(!idm){h=$('#obH').value.trim().toLowerCase();
   if(!picture.url())return err(OB_ERR['avatar-required']);
   if(!HANDLE_RE.test(h))return err(OB_ERR['handle-invalid'])}
  /* LHB-52: una fecha que muestra menos de 21 años (o inválida, o futura) no se manda a ningún lado */
  const bad=idProblem(f,new Date().toISOString().slice(0,10));if(bad)return err(OB_ERR[bad]||OB_ERR['birth_date-invalid']);
  err('');busy(true);
  let r;try{r=await submit(idm?f:{handle:h,...f,bio:$('#obB').value,favorite_brand:$('#obM').value})}catch(x){r={error:'generic'}}
  if($('#obForm')!==form)return;if(!r||r.stale){busy(false);return}
  busy(false);if(r.error)err(OB_ERR[r.error]||(idm||edm?tt('h.noPudimosGuardarTu'):tt('h.noPudimosCrearTu')))}}
/* LHB-89: el diálogo de entrada de Clerk (div.cl-modalContent, role dialog) no tiene nombre accesible y Clerk no ofrece opción para darle uno;
   mientras está abierto se nombra con su propio título (aria-labelledby), sin tocar su estilo. Clerk cambia el título al cambiar de paso: se vuelve a apuntar. */
function nameClerkDialog(doc){let n=0;for(const d of doc.querySelectorAll('.cl-modalContent[role="dialog"]')){if(d.getAttribute('aria-label'))continue;const h=d.querySelector('.cl-headerTitle');if(!h||!String(h.textContent||'').trim())continue;if(!h.id)h.id='lhb-clerk-title-'+(nameClerkDialog.k=(nameClerkDialog.k||0)+1);if(d.getAttribute('aria-labelledby')!==h.id)d.setAttribute('aria-labelledby',h.id);n++}return n}
function watchClerkDialog(){if(typeof MutationObserver!=='function')return;let seen=false;const tick=()=>{nameClerkDialog(document);if(document.querySelector('.cl-modalContent'))seen=true;else if(seen)mo.disconnect()};const mo=new MutationObserver(tick);mo.observe(document.body,{childList:true,subtree:true});tick();setTimeout(()=>mo.disconnect(),600000)}
const CUENTA=window.LHB_CUENTA({clerk,api,hasLocal:()=>LHB_MERGE.hasData(S()),here:()=>location.hash,onNav:f=>window.addEventListener('hashchange',f),reroute:()=>A.route(),store:acct,intent,openSignIn:C=>{C.openSignIn({forceRedirectUrl:location.href,signUpForceRedirectUrl:location.href});watchClerkDialog()},ui:{card:accountCard,notice:accountNotice,onboarding:(submit,picture,check)=>onboardingForm(submit,picture,undefined,undefined,check),identity:submit=>onboardingForm(submit,null,'identity'),edit:(prof,submit,picture,check)=>onboardingForm(submit,picture,'edit',prof,check),toast,closeAll:closeSheetNow}});
/* abre Mi Hoja solo con sesión y perfil; otras páginas usan requireAccount(go,{inPlace:true,act:'nombre'}) y registerAction('nombre',go) */
const requireAccount=(go,o)=>CUENTA.require(go,o);
/* LHB-51: con una cuenta guardada, un poco después de abrir la app se confirma con Clerk que sigue siendo esa cuenta (si no, el encabezado vuelve a la estrella) */
setTimeout(()=>{if(acct.get())CUENTA.reconcile()},2500);
/* ---------- acciones que piden cuenta (LHB-48) ----------
   Corazón, sello, estrella y humidor se hacen solo con sesión y perfil; ver la página no pide nada. El argumento viaja como texto (también por sessionStorage al volver de Google) y se valida aquí. */
const txt=v=>typeof v==='string'&&v.length<200;
const split2=v=>txt(v)?v.split(/:(.*)/s):[];
const own=(o,k)=>Object.prototype.hasOwnProperty.call(o,k);
const keepScroll=()=>{const y=scrollY;A.route();scrollTo(0,y)};
const ACTIONS={
 fav(arg){const [k,id]=split2(arg);if(!id||id in Object.prototype||!own(S().favs,k)||!Array.isArray(S().favs[k]))return;
  const on=toggleFav(k,id);
  $$(`[data-fav="${CSS.escape(arg)}"]`).forEach(b=>{b.setAttribute('aria-pressed',on);b.setAttribute('aria-label',on?tt('h.quitarDeFavoritos'):tt('h.guardarEnFavoritos'));b.firstChild.textContent=on?'♥':'♡'});toast(on?window.LHB_I18N.t('fav.on'):window.LHB_I18N.t('fav.off'));if(/^#\/c\//.test(location.hash))keepScroll()},
 stamp(arg,st){const [k,id]=split2(arg);if(!id||id in Object.prototype||!own(S().pasaporte,k)||typeof S().pasaporte[k]!=='object')return;st=st||$(`[data-stamp="${CSS.escape(arg)}"]`);
  const before=badgeIds(),r0=ruta();const on=toggleStamp(k,id),r1=ruta(),nz=r1.ok.find(x=>!r0.ok.includes(x));RLIT=r1.lit.find(x=>!r0.lit.includes(x));if(RLIT&&(st&&st.closest('.rl')))closeSheet();if(nz)setTimeout(()=>zonaSheet(nz),1500);
  $$(`[data-stamp="${CSS.escape(arg)}"]`).forEach(b=>{b.setAttribute('aria-pressed',on);const sp=b.querySelector(':scope>span:last-child');if(sp)sp.textContent=b.classList.contains('stamp')?(on?tt('h.selladoEl',{d:fmtF(hoy())}):tt('h.sinSello')):(on?tt('h.sellado'):tt('h.sellarPasaporte'))});
  const nb=badgeIds().filter(x=>!before.includes(x));if(nb.length){const b=BADGES.find(x=>x.id===nb[0]);toast(tt('h.nuevaInsignia')+b.n)}else toast(on?tt('h.selloPuestoEnTu'):tt('h.selloQuitado'));
  if(/^#\/(mihoja\/pasaporte|lugares\/ruta)/.test(location.hash))setTimeout(()=>{const y=scrollY;A.route();scrollTo(0,y)},350)},
 rate(arg){const [id,n]=split2(arg);const v=+n;if(!id||id in Object.prototype||!Number.isInteger(v)||v<1||v>5)return;setRating(id,v);keepScroll()},
 humidor(arg){openSheet('humidor',txt(arg)?arg:undefined)}
};
Object.keys(ACTIONS).forEach(k=>CUENTA.register(k,arg=>ACTIONS[k](arg)));
const gate=(act,arg,el)=>CUENTA.quick(()=>ACTIONS[act](arg,el),{inPlace:true,act,arg});
setTimeout(()=>CUENTA.resume(),0);
/* ---------- Mi Hoja ---------- */
const SUBS=[['humidor',tt('h.humidor')],['diario',tt('h.diario')],['pasaporte',tt('h.pasaporte')],['favoritos',tt('pf.favs')],['personas',tt('h.personas')],['perfil',tt('h.perfil')]];
const subnav=cur=>`<header class="mh-head"><div class="eyebrow">${tt('h.miHoja')}</div><h1>${tt('h.loTuyo')}</h1><p><a class="lbtn" href="#/mihoja/editar" id="mhEdit">${tt('h.editarPerfil2')}</a></p></header><nav class="subnav" aria-label="${tt('h.miHoja')}">${SUBS.map(([k,n])=>`<a href="#/mihoja/${k}" ${k===cur?'aria-current="page"':''}>${n}</a>`).join('')}</nav>${backupBanner()}`;
/* LHB-55: #/mihoja/editar abre el formulario de editar perfil por la misma puerta; al guardar (done) vuelve a Perfil */
function vMiHoja(sub){requireAccount(()=>vMiHojaIn(sub),sub==='editar'?{edit:true}:undefined)}
function vMiHojaIn(sub){sub=sub||'humidor';SYNC.isolate();SYNC.run('mi-hoja',{minAge:20e3});if(sub==='editar'){location.hash='#/mihoja/perfil';return}if(sub==='perfil'){A.vPerfil();bindBackup();return}
 ({humidor:vHumidor,diario:vDiario,pasaporte:vPasaporte,favoritos:vFavoritos,personas:vPersonas}[sub]||vHumidor)();bindBackup()}
/* ---------- Personas (LHB-57): buscar a otras personas por @ o por nombre ---------- */
const PQ_MIN=2;
/* la misma regla que el servidor (functions/_lib/people.js): 2 caracteres o más, sin contar el @ de entrada */
const pqText=q=>String(q==null?'':q).trim().replace(/^@/,'').replace(/\s+/g,' ');
const pqOk=q=>[...pqText(q)].length>=PQ_MIN;
const CLERK_IMG_URL='https://img.clerk.com/';
/* una fila de resultado: solo lo público (nombre público y @) y la foto si es de Clerk; todo escapado */
const personRow=p=>{const nm=p&&(p.display_name||('@'+p.handle))||'',ini=[...String(nm.replace(/^@/,''))][0]||'?',pic=p&&typeof p.avatar_key==='string'&&p.avatar_key.startsWith(CLERK_IMG_URL)?p.avatar_key:'';
 return `<li class="person" data-handle="${esc(p.handle)}"><a class="person-a" href="#/u/${encodeURIComponent(p.handle)}"><span class="ob-pic-img person-img" aria-hidden="true">${pic?`<img src="${esc(pic)}" alt="" loading="lazy">`:esc(ini.toUpperCase())}</span><span class="person-t"><b>${esc(nm)}</b><span class="s">@${esc(p.handle)}</span></span></a></li>`};
function vPersonas(){
 view.innerHTML=`${subnav('personas')}<form class="form" id="psF" role="search" novalidate><div class="field"><label for="psQ">${tt('h.buscaPorOPor')}</label><input id="psQ" type="search" maxlength="40" autocomplete="off" autocapitalize="none" spellcheck="false" placeholder="${tt('h.ejAnaOTabaquero')}"></div><button class="btn" type="submit" id="psGo">${tt('cat.search')}</button></form>
 <p class="hint" id="psH" aria-live="polite">${tt('h.escribeAlMenos2')}</p><ul class="people" id="psL"></ul><button class="lbtn" type="button" id="psMore" hidden>${tt('ev.more')}</button>`;
 const form=$('#psF');let seq=0,next=null,last='',timer=0;
 const say=m=>{$('#psH').textContent=m||''};
 const run=async more=>{if($('#psF')!==form)return;const q=pqText($('#psQ').value);
  if(!pqOk(q)){seq++;next=null;$('#psL').innerHTML='';$('#psMore').hidden=true;say(tt('h.escribeAlMenos2'));return}
  const mine=++seq;if(!more){next=null;$('#psL').innerHTML=''}$('#psMore').hidden=true;say(tt('geo.searching'));
  let r;try{const C=await clerk();r=await api(C,'GET','/api/people?q='+encodeURIComponent(q)+(more&&next?'&cursor='+encodeURIComponent(next):''))}catch(x){r={status:0,body:{}}}
  /* una respuesta vieja (otra búsqueda, otra pantalla) no pinta nada */
  if($('#psF')!==form||mine!==seq)return;
  if(r.status!==200||!Array.isArray(r.body.people)){say(r.status===400?tt('h.escribeAlMenos2'):tt('h.noPudimosBuscarIntenta'));return}
  last=q;next=r.body.next||null;$('#psL').insertAdjacentHTML('beforeend',r.body.people.map(personRow).join(''));
  const n=$('#psL').children.length;say(n||next?'':tt('h.noEncontramosANadie'));$('#psMore').hidden=!next};
 form.onsubmit=e=>{e.preventDefault();clearTimeout(timer);return run(false)};
 /* al teclear, lo que estaba en camino ya no vale: ni su respuesta ni su "Ver más" */
 $('#psQ').oninput=()=>{clearTimeout(timer);seq++;next=null;$('#psMore').hidden=true;timer=setTimeout(()=>run(false),350)};
 $('#psMore').onclick=()=>run(true)}
/* ---------- perfil, pasaporte primero (LHB-58) ---------- */
/* el perfil de otra persona (#/u/<handle>) y el tuyo (Perfil): foto, nombre público, @, bio, marca favorita y conteos (reseñas, seguidores, siguiendo); luego las pestañas Reseñas, Pasaporte, Favoritos y Humidor (el Humidor solo lo ve su dueño).
   Lo de otra persona sale solo de GET /api/u/<handle> (lo público, la misma lectura que la página /u/<handle>); nunca la foto local del teléfono ni nada privado. La fecha de nacimiento y el género no están aquí. */
const PF_TABS=['resenas','pasaporte','favoritos','humidor'];
const pfTabsFor=own=>own?PF_TABS:PF_TABS.filter(t=>t!=='humidor');
const PF_NAME={resenas:'h.pfResenas',pasaporte:'h.pasaporte',favoritos:'pf.favs',humidor:'h.humidor'};
const PF_HANDLE=/^[a-z0-9_]{3,20}$/;
const PF_IMG='https://img.clerk.com/';
/* "reseñas" son las catas que su dueño marcó públicas: publica tiene que ser true, no basta con algo que parezca verdad (la misma regla que el servidor) */
const isPublica=e=>!!e&&typeof e==='object'&&!Array.isArray(e)&&e.publica===true;
const pfTxt=(v,n)=>typeof v==='string'?[...v.trim()].slice(0,n).join(''):'';
/* lo que se enseña de una reseña: la misma lista cerrada que publicEntry en functions/_lib/passport.js */
const pfEntry=e=>({nombre:pfTxt(e.nombre,80),marca:pfTxt(e.marca,60),artesano:pfTxt(e.artesano,80),rating:Number.isInteger(e.rating)&&e.rating>=1&&e.rating<=5?e.rating:0,
 tags:(Array.isArray(e.tags)?e.tags:[]).map(t=>pfTxt(t,40)).filter(Boolean).slice(0,30),notas:pfTxt(e.notas,1000),consumido:okDay(e.consumido)?e.consumido:null});
/* tus reseñas, de tu Mi Hoja en este teléfono: las públicas, la más reciente primero (por el día en que se fumó; a igual día, el orden del diario) */
const myResenas=s=>(s.diario||[]).filter(isPublica).map(pfEntry).map((e,i)=>[e,i]).sort((a,b)=>(b[0].consumido||'').localeCompare(a[0].consumido||'')||a[1]-b[1]).map(x=>x[0]);
const pfNum=v=>Number.isInteger(v)&&v>=0?v:0;
const pfIni=p=>{const w=String(p.display_name||'').split(/\s+/).filter(Boolean);const f=s=>[...s][0]||'';return (w.length?f(w[0])+(w.length>1?f(w[w.length-1]):''):f(p.handle||'')).toUpperCase()};
/* conteos y botón: c null mientras llegan; tu vista lleva Editar perfil (LHB-55), la de otra persona deja el lugar del botón de seguir (LHB-60).
   LHB-60: seguidores y siguiendo llevan a sus listas */
const pfCounts=(c,own,h)=>{const n=k=>c&&c[k]!=null?pfNum(c[k]):'·';const to=s=>'#/u/'+encodeURIComponent(h)+'/'+s;
 return `<ul class="pf-counts" id="pfCounts"><li><b>${n('resenas')}</b><span>${tt('h.pfResenas')}</span></li><li><a href="${to('seguidores')}"><b id="pfNFollowers">${n('followers')}</b><span>${tt('h.pfSeguidores')}</span></a></li><li><a href="${to('siguiendo')}"><b>${n('following')}</b><span>${tt('h.pfSiguiendo')}</span></a></li></ul>
 <div class="pf-act">${own?`<a class="btn" href="#/mihoja/editar" id="pfEdit">${tt('h.editarPerfil2')}</a>`:`<div class="pf-follow" id="pfFollow" data-handle="${esc(h)}"></div>`}</div>`};
const pfAbout=p=>`${p.bio?`<p class="pf-bio">${esc(p.bio)}</p>`:''}${p.favorite_brand?`<p class="pf-fav">${tt('h.pfMarcaFav')}: <b>${esc(p.favorite_brand)}</b></p>`:''}`;
/* el encabezado de otra persona: su foto de Clerk o sus iniciales */
function pfHead(p,c){const pic=typeof p.avatar_key==='string'&&p.avatar_key.startsWith(PF_IMG)?`<img src="${esc(p.avatar_key)}" alt="${tt('h.pfFotoDe',{a:'@'+esc(p.handle)})}" width="88" height="88">`:`<span aria-hidden="true">${esc(pfIni(p))}</span>`;
 return `<section class="pf-head"><div class="pf-pic" id="pfPic">${pic}</div><div class="pf-id"><h1 class="pf-n">${esc(p.display_name||('@'+p.handle))}</h1><div class="pf-h">@${esc(p.handle)}</div>${pfAbout(p)}</div></section>${pfCounts(c,false,p.handle)}`}
const pfTabsHTML=(own,cur)=>`<div class="pf-tabs" role="tablist" aria-label="${tt('pf.title')}">${pfTabsFor(own).map(t=>`<button type="button" role="tab" id="pfT-${t}" data-pftab="${t}" aria-controls="pfPanel" aria-selected="${t===cur}" tabindex="${t===cur?0:-1}">${tt(PF_NAME[t])}</button>`).join('')}</div><div id="pfPanel" role="tabpanel" aria-labelledby="pfT-${cur}"></div>`;
const pfResCard=(e,i)=>`<button type="button" class="pf-res" data-pfres="${i}"><b>${esc(e.nombre||tt('h.pfCigarro'))}</b>${e.rating?stars(e.rating):''}${e.consumido?`<small>${esc(fmtF(e.consumido))}</small>`:''}</button>`;
const pfResSheet=e=>`<h2 class="sheet-h">${esc(e.nombre||tt('h.pfCigarro'))}</h2><p class="rsub">${[e.marca,e.artesano,e.consumido?fmtF(e.consumido):''].filter(Boolean).map(esc).join(' · ')}</p>${e.rating?stars(e.rating):''}${tagChips(e.tags)}${e.notas?`<p class="pf-notas">${esc(e.notas)}</p>`:''}`;
/* el contenido de una pestaña, solo de d: { own, resenas, sellos, favorite_brand } y, para tu vista, favs (cigarros del catálogo) y humidor de tu Mi Hoja */
function pfPanel(tab,d){
 if(tab==='resenas')return d.resenas.length?`${d.own?`<p class="hint">${tt('h.pfSoloPublicas')}</p>`:''}<div class="pf-grid">${d.resenas.map(pfResCard).join('')}</div>`:`<div class="empty">${d.own?tt('h.pfSinResenasTuyas'):tt('h.pfSinResenas')}</div>`;
 if(tab==='pasaporte'){const s=d.sellos||{};return `<div class="stats"><div class="stat"><b>${pfNum(s.artesanos)}</b><span>${tt('h.stSellosArt')}</span></div><div class="stat"><b>${pfNum(s.cigarros)}</b><span>${tt('h.stSellosCig')}</span></div><div class="stat"><b>${pfNum(s.lugares)}</b><span>${tt('h.stSellosLug')}</span></div></div>${d.own?`<p><a class="lbtn" href="#/mihoja/pasaporte">${tt('h.pfVerPasaporte')}</a></p>`:''}`}
 if(tab==='favoritos'){if(!d.own)return `${d.favorite_brand?`<p class="pf-fav">${tt('h.pfMarcaFav')}: <b>${esc(d.favorite_brand)}</b></p>`:''}<div class="empty">${tt('h.pfFavPrivados')}</div>`;
  return `${d.favs.length?`<div class="mini-row">${d.favs.map(c=>A.cigarCard({...c,mini:true})).join('')}</div>`:`<div class="empty">${tt('pf.noFavs')}</div>`}<p><a class="lbtn" href="#/mihoja/favoritos">${tt('h.pfVerFavoritos')}</a></p>`}
 if(tab==='humidor'&&d.own)return `${d.humidor.length?`<div class="list">${d.humidor.map(x=>`<div class="row"><div><div class="t">${esc(x.nombre||'')}</div>${x.artesano?`<div class="s">${esc(x.artesano)}</div>`:''}</div><span class="count">${pfNum(+x.cantidad)}</span></div>`).join('')}</div>`:`<div class="empty">${tt('h.tuHumidorEstaVacio')}</div>`}<p><a class="lbtn" href="#/mihoja/humidor">${tt('h.pfVerHumidor')}</a></p>`;
 return ''}
/* las pestañas: cambiar de una a otra no vuelve a pedir nada; una pestaña que no es de esta vista (el Humidor de otra persona) no se pinta */
function pfBind(d,cur){const paint=t=>{if(!pfTabsFor(d.own).includes(t))t='resenas';const panel=$('#pfPanel');if(!panel)return;panel.innerHTML=pfPanel(t,d);panel.setAttribute('aria-labelledby','pfT-'+t);
  $$('[data-pftab]').forEach(b=>{b.setAttribute('aria-selected',String(b.dataset.pftab===t));b.setAttribute('tabindex',b.dataset.pftab===t?'0':'-1')});
  $$('[data-pfres]').forEach(b=>b.onclick=()=>{const e=d.resenas[+b.dataset.pfres];if(e)sheet(pfResSheet(e),e.nombre||tt('h.pfCigarro'))});if(t==='favoritos'&&d.own)A.hydrate()};
 /* Codex ronda 1: las flechas, Inicio y Fin cambian de pestaña y llevan el foco, como pide role="tab" */
 const order=pfTabsFor(d.own);
 $$('[data-pftab]').forEach(b=>{b.onclick=()=>paint(b.dataset.pftab);b.onkeydown=e=>{const i=order.indexOf(b.dataset.pftab),j={ArrowRight:i+1,ArrowLeft:i-1,Home:0,End:order.length-1}[e.key];if(j===undefined||i<0)return;e.preventDefault();
  const t=order[(j+order.length)%order.length];paint(t);const el=$('#pfT-'+t);if(el&&el.focus)el.focus()}});paint(cur)}
/* GET /api/u/<handle>: pública, sin sesión */
async function pfFetch(h){try{const r=await fetch('/api/u/'+encodeURIComponent(h),{headers:{Accept:'application/json'}});let j={};try{j=await r.json()}catch(e){}return {status:r.status,body:j&&typeof j==='object'?j:{}}}catch(e){return {status:0,body:{}}}}
/* el perfil de otra persona; si es el tuyo, vas a tu Perfil (con Humidor y Editar perfil) */
async function vPersona(raw){const h=String(raw||'').toLowerCase();const me=acct.get();
 /* LHB-60: #/u/<handle>/seguidores y #/u/<handle>/siguiendo (el enrutador de app.js pasa solo el @; lo que sigue se lee del hash), también las tuyas */
 const seg=String(location.hash||'').replace(/^#\/?/,'').split('/')[2]||'';
 if((seg==='seguidores'||seg==='siguiendo')&&PF_HANDLE.test(h))return vFwList(h,seg==='seguidores'?'followers':'following');
 if(h&&me&&typeof me==='object'&&me.handle===h){location.hash='#/mihoja/perfil';return}
 view.innerHTML=`<div class="pf" id="pfX"><p class="hint">${tt('h.pfCargando')}</p></div>`;const el=$('#pfX');
 if(!PF_HANDLE.test(h)){el.innerHTML=`<div class="empty">${tt('h.pfNoDisponible')}</div>`;return}
 const r=await pfFetch(h);
 /* una respuesta que llega cuando ya se fue de la página no pinta nada */
 if($('#pfX')!==el)return;
 if(r.status===404){el.innerHTML=`<div class="empty">${tt('h.pfNoDisponible')}</div>`;return}
 const b=r.body;if(r.status!==200||!b.profile||typeof b.profile!=='object'||!b.counts||typeof b.counts!=='object'){el.innerHTML=`<div class="empty">${tt('h.pfError')}</div>`;return}
 const d={own:false,resenas:(Array.isArray(b.resenas)?b.resenas:[]).filter(e=>e&&typeof e==='object').map(pfEntry),sellos:b.counts.sellos,favorite_brand:b.profile.favorite_brand};
 el.innerHTML=pfHead(b.profile,b.counts)+pfTabsHTML(false,'resenas');pfBind(d,'resenas');
 await fwMount('pfFollow',h,()=>$('#pfX')===el,n=>{const c=$('#pfNFollowers');if(c)c.textContent=String(n)})}
/* tu Perfil (app.js vPerfil pone la foto, el nombre y el @ de la cuenta guardada, LHB-51): aquí van la bio, la marca y los conteos de /api/u/<tu @>, Editar perfil y las pestañas, que leen tu Mi Hoja.
   PFO es tu Perfil abierto: su lugar (#pfOwn), la cuenta, lo que llegó del servidor y la pestaña abierta. Codex ronda 1: cuando llega una sincronización se pinta otra vez con tu Mi Hoja nueva (pfOwnSync), en la misma pestaña */
let PFO=null;
const pfOwnData=()=>{const s=S();return {own:true,resenas:myResenas(s),sellos:passCounts().c,favorite_brand:null,favs:s.favs.cigarros.map(A.cigarById).filter(Boolean),humidor:s.humidor}};
const pfCur=()=>{const sel=$$('[data-pftab]').find(b=>b.getAttribute('aria-selected')==='true');return sel?sel.dataset.pftab:'resenas'};
/* Codex ronda 2: pintar otra vez reemplaza los botones; el foco y el botón al que vuelve una tarjeta abierta (lastFocus) pasan al botón nuevo
   de la misma pestaña o de la misma reseña (aunque haya cambiado de lugar); si esa reseña ya no está, a la pestaña abierta */
const pfKey=(o,n)=>{if(!n)return null;const m=/^pfT-([a-z]+)$/.exec(n.id||'');if(m)return {tab:m[1]};const b=$$('[data-pfres]').find(x=>x===n);const e=b&&o.d&&o.d.resenas[+b.dataset.pfres];return e?{res:JSON.stringify(e)}:null};
const pfFind=(o,d,k)=>{const i=k.res?d.resenas.findIndex(e=>JSON.stringify(e)===k.res):-1;return (i>=0&&$$('[data-pfres]').find(b=>b.dataset.pfres===String(i)))||$('#pfT-'+(k.tab||o.cur))};
/* tu número de reseñas sale enseguida de tu Mi Hoja; seguidores y siguiendo esperan al servidor */
function pfOwnPaint(o){const d=pfOwnData();const kf=pfKey(o,document.activeElement),kl=pfKey(o,lastFocus);
 o.root.innerHTML=`<div id="pfAbout">${pfAbout(o.profile)}</div>`+pfCounts({...(o.counts||{}),resenas:d.resenas.length},true,o.a.handle)+pfTabsHTML(true,o.cur);pfBind(d,o.cur);o.d=d;
 if(kf){const n=pfFind(o,d,kf);if(n&&n.focus)n.focus({preventScroll:true})}if(kl){const n=pfFind(o,d,kl);if(n)lastFocus=n}}
/* a es la cuenta guardada */
async function profileOwn(a){const root=$('#pfOwn');PFO=null;if(!root||!a||typeof a.handle!=='string'||!PF_HANDLE.test(a.handle))return;
 const o=PFO={root,a,profile:{},counts:null,cur:'resenas'};pfOwnPaint(o);
 const r=await pfFetch(a.handle);const now=acct.get();
 /* ya no está esta página, se abrió otro Perfil, u otra cuenta entró mientras tanto: no se pinta */
 if(PFO!==o||$('#pfOwn')!==root||!now||now.sub!==a.sub)return;
 if(r.status!==200||!r.body.profile||!r.body.counts)return;
 o.cur=pfCur();o.profile=r.body.profile;o.counts=r.body.counts;pfOwnPaint(o)}
/* la sincronización lo llama en cualquier página: solo pinta si tu Perfil está puesto (#/perfil o #/mihoja/perfil) */
function pfOwnSync(){const o=PFO;if(!o||$('#pfOwn')!==o.root)return;const now=acct.get();if(!now||now.sub!==o.a.sub)return;o.cur=pfCur();pfOwnPaint(o)}
/* ---------- seguir (LHB-60): el botón Seguir / Siguiendo y las listas de seguidores y siguiendo (functions/api/follow.js, followers.js, following.js) ---------- */
/* la cuenta guardada: cuenta2 se guarda solo cuando el perfil está completo (LHB-52) */
const meAcct=()=>{const a=acct.get();return a&&typeof a==='object'&&typeof a.sub==='string'&&a.sub&&typeof a.handle==='string'&&PF_HANDLE.test(a.handle)?a:null};
const fwErr=e=>e==='follow-rate'?tt('h.fwRate'):e==='follow-cap'?tt('h.fwCap'):e==='blocked'||e==='not-found'||e==='self-follow'?tt('h.fwNo'):e==='no-profile'?tt('h.primeroCreaTuPerfil'):tt('h.fwFail');
/* el botón. st es lo que el servidor confirmó ({on, n}: si la sigues y sus seguidores), want lo último que tocó la persona; se ve want, y el conteo es el confirmado más lo que falta confirmar.
   Los pedidos salen de uno en uno, así llegan en orden y gana el último toque: una respuesta solo cambia lo confirmado, nunca lo que se ve si hubo otro toque después.
   Si el servidor dice que no (o no contesta) a lo último que se tocó, se vuelve a lo confirmado y se avisa.
   Codex r1: ok() es la página y la cuenta que puso el botón; un pedido no sale si ya no están, ni cuando la llave llega tarde (api go), y cada confirmación repinta el conteo */
const fwSame=sub=>{const m=meAcct();return !!m&&m.sub===sub};
function followBtn(btn,h,st,live,onCount,sub){let want=st.on,busy=false;const ok=()=>live()&&fwSame(sub);
 const paint=()=>{if(!ok())return;btn.textContent=want?tt('h.fwSiguiendo'):tt('h.fwSeguir');btn.setAttribute('aria-pressed',String(want));btn.classList.toggle('on',want);
  if(onCount&&st.n!=null)onCount(Math.max(0,st.n+(want===st.on?0:want?1:-1)))};
 const pump=async()=>{busy=true;try{while(want!==st.on&&ok()){const target=want;let r;
   try{const C=await clerk();if(!ok())return;r=await api(C,target?'POST':'DELETE','/api/follow',{handle:h},sub,undefined,ok)}catch(e){r={status:0,body:{}}}
   if(!ok())return;
   if(r.status===200&&r.body&&r.body.following===target){st.on=target;if(Number.isInteger(r.body.followers))st.n=r.body.followers;paint()}
   else if(want===target){want=st.on;toast(fwErr(r.body&&r.body.error))}}}
  finally{busy=false;paint()}};
 btn.onclick=()=>{want=!want;paint();if(!busy)pump()};paint()}
/* pone el botón en la caja id, para una cuenta con perfil y otra persona: si ya la sigues lo dice GET /api/follow con la sesión; sin saberlo (sin sesión, sin red) no hay botón.
   Codex r1: si la cuenta guardada cambió mientras se preguntaba, no se pone; y si cambia o se va después (salir, otra cuenta), el botón se quita */
async function fwMount(id,h,live,onCount){const box=$('#'+id),a=meAcct();if(!box||!a||a.handle===h)return;
 let r;try{const C=await clerk();r=await api(C,'GET','/api/follow?handle='+encodeURIComponent(h),null,a.sub)}catch(e){r={status:0,body:{}}}
 if(!live()||$('#'+id)!==box||!fwSame(a.sub)||r.status!==200||!r.body||typeof r.body.viewerFollows!=='boolean')return;
 box.innerHTML=`<button class="btn fw-b" type="button" id="fwB-${h}"></button>`;
 /* Codex r2: antes de mirar, los de páginas que ya no están se van (cada uno se quita solo si su página se fue) */
 const w=()=>{if(!live()||$('#'+id)!==box){acctW.delete(w);return}if(!fwSame(a.sub)){acctW.delete(w);box.innerHTML=''}};for(const f of [...acctW])f();acctW.add(w);
 followBtn($('#fwB-'+h),h,{on:r.body.viewerFollows,n:onCount&&Number.isInteger(r.body.followers)?r.body.followers:null},live,onCount,a.sub)}
/* las listas: foto, nombre público (nombre e inicial) y @ de cada persona, cada fila con su botón; 20 por página con el cursor del servidor. Son públicas: se piden sin sesión */
async function vFwList(h,dir){
 view.innerHTML=`<div class="pf" id="fwX"><p><a class="lbtn" href="#/u/${encodeURIComponent(h)}">@${esc(h)}</a></p><h1 class="pf-n">${tt(dir==='followers'?'h.pfSeguidores':'h.pfSiguiendo')}</h1><ul class="people" id="fwL"></ul><p class="hint" id="fwH" aria-live="polite">${tt('h.pfCargando')}</p><button class="lbtn" type="button" id="fwMore" hidden>${tt('ev.more')}</button></div>`;
 const root=$('#fwX'),live=()=>$('#fwX')===root,seen=new Set();let next=null,seq=0;
 const say=m=>{const el=$('#fwH');if(el){el.textContent=m;el.hidden=!m}};
 const page=async()=>{const mine=++seq;$('#fwMore').hidden=true;let r;
  try{const x=await fetch('/api/'+dir+'?handle='+encodeURIComponent(h)+(next?'&cursor='+encodeURIComponent(next):''),{headers:{Accept:'application/json'}});let j={};try{j=await x.json()}catch(e){}r={status:x.status,body:j&&typeof j==='object'?j:{}}}catch(e){r={status:0,body:{}}}
  /* se fue de la página, o es la respuesta de un pedido viejo: no pinta nada */
  if(!live()||mine!==seq)return;
  if(r.status===404){say(tt('h.pfNoDisponible'));return}
  if(r.status!==200||!Array.isArray(r.body.people)){say(tt('h.fwError'));$('#fwMore').hidden=!next;return}
  const me=meAcct(),ppl=r.body.people.filter(p=>p&&typeof p.handle==='string'&&PF_HANDLE.test(p.handle)&&!seen.has(p.handle));ppl.forEach(p=>seen.add(p.handle));
  next=typeof r.body.next==='string'&&r.body.next?r.body.next:null;
  $('#fwL').insertAdjacentHTML('beforeend',ppl.map(p=>personRow(p).replace(/<\/li>$/,me&&p.handle!==me.handle?`<span class="fw-row" id="fwR-${p.handle}"></span></li>`:'</li>')).join(''));
  say(seen.size?'':tt('h.fwNadie'));$('#fwMore').hidden=!next;
  await Promise.all(ppl.map(p=>fwMount('fwR-'+p.handle,p.handle,live)))};
 $('#fwMore').onclick=()=>page();
 await page()}
/* ---------- fin del perfil (LHB-58) ---------- */
function vHumidor(){const s=S();const tot=s.humidor.reduce((t,x)=>t+(+x.cantidad||0),0);
 view.innerHTML=`${subnav('humidor')}
 <div class="hum-sum"><div class="stat"><b>${tot}</b><span>${tt('h.cigarros')}</span></div><div class="stat"><b>${s.humidor.length}</b><span>${tt('h.vitolas')}</span></div><button class="btn" type="button" data-sheet="humidor">${tt('h.anadir')}</button></div>
 ${s.humidor.length?`<div class="list">${s.humidor.map(h=>{const c=h.cigarId&&A.cigarById(h.cigarId);return `<div class="row hum">
  ${c?`<a class="hum-ph" href="#/c/${encodeURIComponent(c.id)}" aria-label="${tt('h.ver',{a:esc(c.nombre)})}">${A.cigarSVG(c)}</a>`:`<span class="hum-ph custom" aria-hidden="true">${VBArt.leaf('#a9c487')}</span>`}
  <div class="hum-b"><div class="t">${esc(h.nombre)}</div><div class="s">${tt('h.desde',{a:h.artesano?esc(h.artesano)+' · ':'',b:c?'':tt('h.tuyo'),c:fmtF(h.fecha)})}</div>${h.nota?`<div class="s">${esc(h.nota)}</div>`:''}
  <div class="hum-act"><div class="qty sm"><button type="button" data-hq="${h.id}:-1" aria-label="${tt('h.unoMenosDe',{a:esc(h.nombre)})}">−</button><span aria-live="polite">${h.cantidad}</span><button type="button" data-hq="${h.id}:1" aria-label="${tt('h.unoMasDe',{a:esc(h.nombre)})}">+</button></div>
  <button class="mini" type="button" data-hcata="${h.id}">${tt('h.catar')}</button><button class="mini" type="button" data-hedit="${h.id}">${tt('h.editar')}</button><button class="mini x" type="button" data-hdel="${h.id}" aria-label="${tt('h.quitarDelHumidor',{a:esc(h.nombre)})}">✕</button></div></div></div>`}).join('')}</div>`
 :`<div class="empty">${tt('h.tuHumidorEstaVacio')}<br>${tt('h.anadeCigarrosDelCatalogo')}</div>`}
 ${backupPanel()}`;
 const again=()=>{const y=scrollY;vHumidor();bindBackup();scrollTo(0,y)};
 $$('[data-hq]').forEach(b=>b.onclick=()=>{const [id,d]=b.dataset.hq.split(':');const h0=S().humidor.find(x=>x.id===id);if(!h0)return;
  if(+d<0&&h0.cantidad<=1){if(confirm(`${tt('h.seAcabaronLosSe',{a:h0.nombre})}`)){save(s=>{s.humidor=s.humidor.filter(x=>x.id!==id)})}again();return}
  save(s=>{const h=s.humidor.find(x=>x.id===id);h.cantidad=Math.max(1,(+h.cantidad||0)+(+d));h.actualizado=new Date().toISOString()});again()});
 $$('[data-hedit]').forEach(b=>b.onclick=()=>humidorForm('',b.dataset.hedit));
 $$('[data-hdel]').forEach(b=>b.onclick=()=>{const h=S().humidor.find(x=>x.id===b.dataset.hdel);if(h&&confirm(`${tt('h.quitarDelHumidor2',{a:h.nombre})}`)){save(s=>{s.humidor=s.humidor.filter(x=>x.id!==h.id)});again()}});
 $$('[data-hcata]').forEach(b=>b.onclick=()=>{const h=S().humidor.find(x=>x.id===b.dataset.hcata);if(h)startCata(h.cigarId||'',h.nombre)})}
const stars=n=>`<span class="stars-ro" role="img" aria-label="${tt('h.de5Estrellas',{a:n})}">${'★'.repeat(n)}<span>${'★'.repeat(5-n)}</span></span>`;
/* LHB-39: los números de Mi Hoja y el diario con búsqueda, filtros y orden. Todo sale del documento de Mi Hoja; los sellos cuentan solo si están en el catálogo, igual que en el Pasaporte */
const isEntry=e=>!!e&&typeof e==='object'&&!Array.isArray(e);
const dfold=t=>String(t??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/\s+/g,' ').trim();
const dday=e=>okDay(e.consumido)?e.consumido:String(e.fecha||'').slice(0,10);
/* lo más anotado de un campo (capa, fortaleza): a igual cuenta, el primero en orden alfabético */
const mostOf=(es,k)=>{const n=new Map();for(const e of es){const v=typeof e[k]==='string'?e[k].trim():'';if(v)n.set(v,(n.get(v)||0)+1)}let best=null;for(const [v,c] of n)if(!best||c>best.n||(c===best.n&&v.localeCompare(best.v,'es')<0))best={v,n:c};return best};
/* los mejor puntuados: por cigarro (el del catálogo por su id; uno "otro" por su nombre), por el promedio de sus estrellas; a igual promedio, el de más catas */
function topRated(es,max){const g=new Map();for(const e of es){const r=+e.rating;if(!(r>=1&&r<=5))continue;const k=e.cigarId?'c:'+e.cigarId:'n:'+dfold(e.nombre);if(k==='n:')continue;
  const o=g.get(k)||{nombre:String(e.nombre||''),cigarId:e.cigarId||null,sum:0,n:0};o.sum+=r;o.n++;g.set(k,o)}
 return [...g.values()].map(o=>({nombre:o.nombre,cigarId:o.cigarId,n:o.n,avg:o.sum/o.n})).sort((a,b)=>b.avg-a.avg||b.n-a.n||a.nombre.localeCompare(b.nombre,'es')).slice(0,max)}
function diaryStats(s,d){const es=(s.diario||[]).filter(isEntry);const cat={artesanos:d.artesanos,cigarros:d.cigarros,lugares:d.places};const sellos={};
 for(const k of Object.keys(cat)){const ok=new Set((cat[k]||[]).map(x=>x&&x.id));sellos[k]=Object.keys((s.pasaporte||{})[k]||{}).filter(id=>ok.has(id)).length}
 return {catas:es.length,sellos,top:topRated(es,3),capa:mostOf(es,'capa'),fortaleza:mostOf(es,'fortaleza')}}
/* q: texto (cada palabra tiene que estar en el nombre, la marca, el artesano o un sabor), st: estrellas exactas, vis: pub o priv, ord: fecha (el día que se fumó) o estrellas */
const DQ0=()=>({q:'',st:'',vis:'',ord:'fecha'});
function diaryFilter(list,q){const ws=dfold(q.q).split(' ').filter(Boolean),st=+q.st||0;
 const out=list.filter(isEntry).filter(e=>{if(st&&(+e.rating||0)!==st)return false;if(q.vis==='pub'&&e.publica!==true)return false;if(q.vis==='priv'&&e.publica===true)return false;if(!ws.length)return true;
  const hay=[e.nombre,e.marca,e.artesano,...(Array.isArray(e.tags)?e.tags.flatMap(t=>[t,WN(t)]):[])].map(dfold);return ws.every(w=>hay.some(h=>h.includes(w)))});
 const byDay=(a,b)=>dday(b).localeCompare(dday(a))||String(b.fecha||'').localeCompare(String(a.fecha||''));
 return out.sort(q.ord==='estrellas'?(a,b)=>(+b.rating||0)-(+a.rating||0)||byDay(a,b):byDay)}
/* la búsqueda se queda mientras se usa la app, solo para la misma cuenta */
let DQ={...DQ0(),who:''};
const dq=()=>{const w=(acct.get()||{}).sub||'';if(DQ.who!==w)DQ={...DQ0(),who:w};return DQ};
const dStats=st=>`<section class="dstats" aria-labelledby="dstH"><div class="section-title"><h2 id="dstH">${tt('h.stTusNumeros')}</h2></div>
 <div class="dst-grid"><div class="stat"><b>${st.catas}</b><span>${tt('h.stCatas')}</span></div><div class="stat"><b>${st.sellos.artesanos}</b><span>${tt('h.stSellosArt')}</span></div><div class="stat"><b>${st.sellos.cigarros}</b><span>${tt('h.stSellosCig')}</span></div><div class="stat"><b>${st.sellos.lugares}</b><span>${tt('h.stSellosLug')}</span></div></div>
 ${st.top.length?`<h3 class="dst-h">${tt('h.stMejores')}</h3><ol class="dst-top">${st.top.map(o=>`<li><span class="t">${esc(o.nombre)}</span><span class="s">★ ${o.avg.toFixed(1)} · ${o.n===1?tt('h.stUnaCata'):tt('h.stNCatas',{a:o.n})}</span></li>`).join('')}</ol>`:''}
 ${st.capa||st.fortaleza?`<dl class="dl dst-most">${st.capa?`<dt>${tt('h.stCapa')}</dt><dd>${esc(lab(st.capa.v))} · ${st.capa.n===1?tt('h.stUnaCata'):tt('h.stNCatas',{a:st.capa.n})}</dd>`:''}${st.fortaleza?`<dt>${tt('h.stFortaleza')}</dt><dd>${esc(lab(st.fortaleza.v))} · ${st.fortaleza.n===1?tt('h.stUnaCata'):tt('h.stNCatas',{a:st.fortaleza.n})}</dd>`:''}</dl>`:''}</section>`;
const opt=(v,cur,t)=>`<option value="${v}"${v===cur?' selected':''}>${t}</option>`;
const dFilters=q=>`<form class="form dfilt" id="dqF" role="search" novalidate><div class="field"><label for="dqQ">${tt('h.dqBuscar')}</label><input id="dqQ" type="search" maxlength="60" autocomplete="off" spellcheck="false" value="${esc(q.q)}"></div>
 <div class="dq-row"><div class="field"><label for="dqS">${tt('h.dqEstrellas')}</label><select id="dqS">${opt('',q.st,tt('h.dqTodas'))}${[5,4,3,2].map(n=>opt(String(n),q.st,tt('cig.stars',{n}))).join('')}${opt('1',q.st,tt('h.nEstrella',{n:1}))}</select></div>
 <div class="field"><label for="dqV">${tt('h.dqVer')}</label><select id="dqV">${opt('',q.vis,tt('h.dqAmbas'))}${opt('pub',q.vis,tt('h.dqPublicas'))}${opt('priv',q.vis,tt('h.dqPrivadas'))}</select></div>
 <div class="field"><label for="dqO">${tt('h.dqOrden')}</label><select id="dqO">${opt('fecha',q.ord,tt('h.dqRecientes'))}${opt('estrellas',q.ord,tt('h.dqMasEstrellas'))}</select></div></div></form>`;
const dCount=(n,all)=>n?tt('h.dqN',{a:n,b:all}):tt('h.dqNada');
const dCard=d=>`<article class="dentry"><div class="dhead"><div><div class="t">${esc(d.nombre)}</div><div class="s">${fmtF(d.consumido||d.fecha)}${d.artesano||d.marca?' · '+esc(d.artesano||d.marca):''}</div></div>${stars(d.rating||0)}</div>
  ${d.foto?`<div class="dfoto" data-photo="${esc(d.foto)}" role="img" aria-label="${tt('h.fotoDeLaCata')}"></div>`:''}<label class="check dpub"><input type="checkbox" data-dpub="${esc(d.id)}" ${d.publica?'checked':''}> ${tt('h.publica')}</label>
  ${tagChips(d.tags||[])}${d.notas?`<p class="dnote">${esc(d.notas)}</p>`:''}
  <details><summary>${tt('h.detalleDeLaCata')}</summary><dl class="dl">${[[tt('f.fortaleza'),d.fortaleza],[tt('h.cuerpo'),d.cuerpo],[tt('h.final'),d.final],[tt('f.capa'),d.capa],[tt('h.tiro'),d.tiro],[tt('h.quemada'),d.quemada]].filter(x=>x[1]).map(([k,v])=>`<dt>${k}</dt><dd>${esc(lab(v))}</dd>`).join('')}
  ${(d.pasos||[]).filter(p=>(p.tags&&p.tags.length)||p.nota).map(p=>`<dt>${esc(lab(p.paso))}</dt><dd>${esc([(p.tags||[]).map(WN).join(', '),p.nota].filter(Boolean).join(' \u2014 '))}</dd>`).join('')}</dl>
  <div class="links">${d.cigarId&&A.cigarById(d.cigarId)?`<a class="lbtn" href="#/c/${encodeURIComponent(d.cigarId)}">${tt('h.verCigarro')}</a>`:''}<button class="lbtn ghost" type="button" data-ddel="${d.id}">${tt('h.borrarEntrada')}</button></div></details></article>`;
/* el campo de la búsqueda con el foco, anotado antes de que la página pase por la puerta de la cuenta */
function dKeepFocus(){const ae=document.activeElement;DFOC=ae&&/^dq[QSVO]$/.test(ae.id||'')?{id:ae.id,who:(acct.get()||{}).sub||''}:null}
/* repinta solo la lista y su cuenta con la búsqueda guardada */
function dRefresh(){const box=$('#dList'),n=$('#dqN');if(!box||!n)return;const all=S().diario.filter(isEntry),l=diaryFilter(all,dq());box.innerHTML=l.map(dCard).join('');n.textContent=dCount(l.length,all.length);bindDiario();A.hydrate(box)}
function bindDiario(){
 $$('[data-dpub]').forEach(b=>b.onchange=()=>{save(s=>{const x=s.diario.find(y=>isEntry(y)&&y.id===b.dataset.dpub);if(x){x.publica=!!b.checked;x.actualizado=new Date().toISOString()}});if(dq().vis)dRefresh()});
 $$('[data-ddel]').forEach(b=>b.onclick=()=>{if(confirm(tt('h.borrarEstaEntradaDel'))){const x=S().diario.find(y=>isEntry(y)&&y.id===b.dataset.ddel),s=S(),prev=s.diario;s.diario=prev.filter(y=>!isEntry(y)||y.id!==b.dataset.ddel);s.cambios=(s.cambios||0)+1;
  /* la foto se borra solo cuando el cambio ya quedó anotado en el teléfono; si no, la entrada y su foto se quedan */
  if(write(s)){dropFoto(x)}else{s.diario=prev;s.cambios-=1}vDiario();bindBackup()}})}
function vDiario(){const s=S(),q=dq(),all=s.diario.filter(isEntry),list=diaryFilter(all,q);
 /* si la página se vuelve a pintar (borrar, sincronización) mientras se escribe en la búsqueda, el foco vuelve a su sitio */
 const kept=DFOC&&DFOC.who===q.who?DFOC.id:'';DFOC=null;
 const ae=document.activeElement,foc=kept||(ae&&/^dq[QSVO]$/.test(ae.id||'')?ae.id:'');
 view.innerHTML=`${subnav('diario')}
 <a class="btn cta" href="#/cata">${VBArt.leaf('#8fd162','btn-leaf')}<span>${tt('h.nuevaCataGuiada')}</span></a>
 ${dStats(diaryStats(s,D()))}
 ${all.length?`${dFilters(q)}<p class="hint" id="dqN" aria-live="polite">${dCount(list.length,all.length)}</p><div id="dList">${list.map(dCard).join('')}</div>`
 :`<div class="empty">${tt('h.tuDiarioEstaVacio')}<br>${tt('h.hazUnaCataGuiada')}</div>`}
 ${backupPanel()}`;
 bindDiario();
 const f=$('#dqF');if(f){f.onsubmit=e=>{e.preventDefault()};
  const upd=()=>{const q=dq();q.q=$('#dqQ').value;q.st=$('#dqS').value;q.vis=$('#dqV').value;q.ord=$('#dqO').value;dRefresh()};
  $('#dqQ').oninput=upd;for(const id of ['#dqS','#dqV','#dqO'])$(id).onchange=upd;
  if(foc){const x=$('#'+foc);if(x&&x.focus){x.focus({preventScroll:true});if(foc==='dqQ'&&x.setSelectionRange){const k=String(x.value||'').length;x.setSelectionRange(k,k)}}}}
 A.hydrate(view)}
/* pasaporte */
const BADGES=[{id:'primer',n:tt('h.primerSello'),d:tt('h.tuPrimerSello'),k:'total',m:1,c:'#8fd162'},
 {id:'catador',n:tt('h.catador'),d:tt('h.5CigarrosCatados'),k:'cigarros',m:5,c:'#ffd27a'},
 {id:'artesanos5',n:tt('h.amigoArtesano'),d:tt('h.5ArtesanosProbados'),k:'artesanos',m:5,c:'#ff9a9a'},
 {id:'lugares5',n:tt('h.deJangueo'),d:tt('h.5LugaresVisitados'),k:'lugares',m:5,c:'#7fb0ff'},
 {id:'catador15',n:tt('h.paladarBoricua'),d:tt('h.15CigarrosCatados'),k:'cigarros',m:15,c:'#ff8a80'},
 {id:'lugares15',n:tt('h.islaRecorrida'),d:tt('h.15LugaresVisitados'),k:'lugares',m:15,c:'#8fb8ff'},
 {id:'mitad',n:tt('h.medioPasaporte'),d:tt('h.laMitadDeTodos'),k:'total',m:'half',c:'#c5cdf5'},
 {id:'artesanosAll',n:tt('h.todosLosArtesanos'),d:tt('h.probasteATodosLos'),k:'artesanos',m:'all',c:'#a9c487'}];
function passCounts(){const s=S(),d=D();const valid={artesanos:new Set(d.artesanos.map(x=>x.id)),cigarros:new Set(d.cigarros.map(x=>x.id)),lugares:new Set(d.places.map(x=>x.id))};
 const c={};for(const k of ['artesanos','cigarros','lugares'])c[k]=Object.keys(s.pasaporte[k]).filter(id=>valid[k].has(id)).length;c.total=c.artesanos+c.cigarros+c.lugares;
 const all={artesanos:valid.artesanos.size,cigarros:valid.cigarros.size,lugares:valid.lugares.size};all.total=all.artesanos+all.cigarros+all.lugares;return{c,all}}
const badgeTarget=(b,all)=>b.m==='all'?all[b.k]:b.m==='half'?Math.ceil(all.total/2):b.m;
function badgeIds(){const {c,all}=passCounts();return BADGES.filter(b=>badgeTarget(b,all)>0&&c[b.k]>=badgeTarget(b,all)).map(b=>b.id)}
/* ruta del tabaco (v18): vive en Lugares → Ruta; el pasaporte comparte los sellos */
const ZN={M:tt('h.metro'),N:tt('h.norte'),E:tt('h.este'),C:tt('h.centro'),S:tt('h.sur'),O:tt('h.oeste')};
const TW='San Juan,M,18.47,-66.11|Guaynabo,M,18.36,-66.11|Bayamón,M,18.4,-66.16|Trujillo Alto,M,18.35,-66.01|Toa Baja,M,18.44,-66.25|Toa Alta,M,18.39,-66.25|Arecibo,N,18.47,-66.72|Isabela,N,18.5,-67.02|Río Grande,E,18.38,-65.83|Luquillo,E,18.37,-65.72|Fajardo,E,18.33,-65.65|Humacao,E,18.15,-65.83|Caguas,C,18.23,-66.05|Aguas Buenas,C,18.26,-66.1|Cidra,C,18.18,-66.16|Adjuntas,C,18.16,-66.72|Villalba,C,18.13,-66.49|Coamo,S,18.08,-66.36|Ponce,S,18.01,-66.61|Juana Díaz,S,18.05,-66.51|Santa Isabel,S,17.97,-66.4|Mayagüez,O,18.2,-67.14|Rincón,O,18.34,-67.25|Aguadilla,O,18.43,-67.15|Lares,O,18.29,-66.88'.split('|').map(s=>{const [n,z,la,lo]=s.split(',');return{n,z,la:+la,lo:+lo}});
const townOf=p=>{let b,bi=1e3;for(const t of TW){const i=String(p||'').indexOf(t.n);if(i>=0&&i<bi){bi=i;b=t.n}}return b};
function ruta(){const d=D(),s=S().pasaporte,m={},z={};
 const add=(k,x,p)=>{const t=townOf(p);if(t)(m[t]=m[t]||[]).push({k,x,on:!!s[k][x.id]})};
 d.artesanos.forEach(x=>add('artesanos',x,x.pueblo));d.cigarros.forEach(x=>{const a=A.artisanById(x.artesano_id);add('cigarros',x,x.pueblo||a&&a.pueblo)});d.places.forEach(x=>add('lugares',x,x.pueblo));
 const ts=TW.filter(t=>m[t.n]).map(t=>({...t,it:m[t.n],on:m[t.n].some(i=>i.on)}));ts.forEach(t=>(z[t.z]=z[t.z]||[]).push(t));
 return{ts,z,lit:ts.filter(t=>t.on).map(t=>t.n),ok:Object.keys(z).filter(k=>z[k].every(t=>t.on))}}
let RLIT;const HJ='<path d="M0-5C4-3 4 2 0 5C-4 2-4-3 0-5Z"/>';
const zSello=(k,ok,sub)=>`<div class="zs${ok?' ok':''}"><svg viewBox="-6-6 12 12" aria-hidden="true">${HJ}</svg><b>${ZN[k]}</b><small>${sub}</small></div>`;
function vRuta(){const {ts,z,lit}=ruta();return `<section class="ruta"><div class="ruta-h"><h2>${tt('h.laRutaDelTabacoH')}</h2><p><b>${lit.length}</b> ${tt('h.dePueblos',{a:ts.length})}</p></div><p class="rhint">${tt('h.sellaArtesanosCigarrosO')}</p>
 <div class="map-wrap rmw"><div id="map" role="region" aria-label="${tt('h.mapaDeLaRuta',{a:lit.length,b:ts.length})}"></div></div>
 <div class="zonas">${Object.keys(ZN).map(k=>{const l=z[k]||[],c=l.filter(t=>t.on).length;return `<div class="zona">${zSello(k,c==l.length,c==l.length?tt('h.completa'):c+tt('h.de')+l.length)}<div class="zts">${l.map(t=>`<button type="button" class="zt${t.on?' on':''}" data-town="${t.n}">${t.n}</button>`).join('')}</div></div>`}).join('')}</div></section>`}
function rutaCard(){const {ts,lit}=ruta();return `<a class="ruta-card" href="#/lugares/ruta"><span class="bico">${VBArt.leaf(lit.length?'#8fd162':'#2c5a3d')}</span><div><b>${tt('h.laRutaDelTabaco')}</b><small>${tt('h.dePueblosEncendidos',{a:lit.length,b:ts.length})}</small><span>${tt('h.verMiRutaDel')}</span></div></a>`}
function townSheet(n){const t=ruta().ts.find(x=>x.n==n);if(!t)return;const it=[...t.it].sort((a,b)=>b.on-a.on),c=it.filter(i=>i.on).length,L={artesanos:tt('f.artesano'),cigarros:tt('h.cigarro'),lugares:tt('h.lugar')};
 sheet(`<h2 class="sheet-h">${t.on?'🌿 ':''}${esc(n)}</h2><p class="rsub">${tt('h.zonaDeSellados',{a:ZN[t.z],b:c,c:it.length,d:c<it.length?` ${tt('h.teFaltan',{a:it.length-c})}`:''})}</p><div class="rl">${it.map(i=>`<div class="ri"><div><b>${esc(i.x.nombre)}</b><small>${L[i.k]}${i.on?tt('h.sellado2')+fmtF(S().pasaporte[i.k][i.x.id]):tt('h.teFalta')}</small></div>${stampBtn(i.k,i.x.id)}</div>`).join('')}</div>`,n)}
function zonaSheet(k){const l=ruta().z[k];sheet(`<div class="zcel">${zSello(k,1,tt('h.zonaCompleta'))}<h2 class="sheet-h">${tt('h.zonaCompleta2',{a:ZN[k]})}</h2><p>${tt('h.sellasteLosPueblosEste',{a:l.length,b:l.map(t=>t.n).join(', ')})}</p><button type="button" class="btn" data-close>${tt('h.wepa')}</button></div>`,tt('h.zonaCompleta'))}
function vPasaporte(){const {c,all}=passCounts(),ru=ruta();const d=D();const got=badgeIds();const pct=all.total?Math.round(c.total*100/all.total):0;
 const sec=(k,title,items,name,sub)=>`<div class="section-title"><h2>${title}</h2><span class="count">${tt('h.de2',{a:c[k],b:all[k]})}</span></div><div class="pbar" role="progressbar" aria-label="${tt('h.de3',{a:title,b:c[k],c:all[k]})}" aria-valuemin="0" aria-valuemax="${all[k]}" aria-valuenow="${c[k]}"><i style="width:${all[k]?c[k]*100/all[k]:0}%"></i></div>
  <div class="stamps">${items.map(x=>{const on=isStamp(k,x.id);return `<button type="button" class="stamp" data-stamp="${k}:${esc(x.id)}" aria-pressed="${on}">${A.mono(name(x),44)}<b>${esc(name(x))}</b><small>${esc(sub(x)||'')}</small><span>${on?tt('h.selladoEl',{d:fmtF(S().pasaporte[k][x.id])}):tt('h.sinSello')}</span></button>`}).join('')}</div>`;
 view.innerHTML=`${subnav('pasaporte')}
 <section class="pass-hero"><div class="pass-ring" style="--p:${pct}" role="img" aria-label="${tt('h.delPasaporte',{a:pct})}"><b>${pct}%</b><span>${tt('h.de2',{a:c.total,b:all.total})}</span></div><div><h2>${tt('h.pasaporteBoricuaH')}</h2><p>${tt('h.marcaLosArtesanosQue')}</p></div></section>
 ${rutaCard()}
 <div class="section-title"><h2>${tt('h.insignias')}</h2><span class="count">${tt('h.de2',{a:got.length+ru.ok.length,b:BADGES.length+6})}</span></div>
 <div class="badges">${BADGES.map(b=>{const t=badgeTarget(b,all),on=got.includes(b.id);return `<div class="badge ${on?'on':''}" style="--bc:${b.c}"><div class="bico">${VBArt.leaf(on?b.c:'#2c5a3d')}</div><b>${b.n}</b><small>${b.d}</small><span>${on?tt('h.lograda'):`${tt('h.de2',{a:Math.min(c[b.k],t),b:t})}`}</span></div>`}).join('')}${Object.keys(ZN).map(k=>{const l=ru.z[k]||[],n=l.filter(t=>t.on).length,on=ru.ok.includes(k);return `<div class="badge zb ${on?'on':''}" style="--bc:#ED0000"><div class="bico">${VBArt.leaf(on?'#ED0000':'#2c5a3d')}</div><b>${tt('h.zona',{a:ZN[k]})}</b><small>${tt('h.rutaDelTabacoTodos')}</small><span>${on?tt('h.lograda'):`${tt('h.de2',{a:n,b:l.length})}`}</span></div>`}).join('')}</div>
 ${sec('artesanos',tt('arts.eyebrow'),d.artesanos,x=>x.nombre,x=>x.pueblo)}
 ${sec('cigarros',tt('h.cigarros2'),d.cigarros,x=>x.nombre,x=>A.artisanName(x))}
 ${sec('lugares',tt('lug.eyebrow'),d.places,x=>x.nombre,x=>x.pueblo)}
 ${backupPanel()}`}
function vFavoritos(){const s=S(),d=D();const cs=s.favs.cigarros.map(A.cigarById).filter(Boolean),as=s.favs.artesanos.map(A.artisanById).filter(Boolean),ps=s.favs.lugares.map(id=>d.places.find(p=>p.id===id)).filter(Boolean);
 view.innerHTML=`${subnav('favoritos')}
 <div class="section-title"><h2>${tt('h.cigarros2')}</h2><span class="count">${cs.length}</span></div>${cs.length?`<div class="grid">${cs.map(A.cigarCard).join('')}</div>`:'<div class="empty">'+tt('h.tocaEnUnCigarro')+'</div>'}
 <div class="section-title"><h2>${tt('arts.eyebrow')}</h2><span class="count">${as.length}</span></div>${as.length?`<div class="list">${as.map(artRow).join('')}</div>`:'<div class="empty">'+tt('h.tocaEnElPerfil')+'</div>'}
 <div class="section-title"><h2>${tt('lug.eyebrow')}</h2><span class="count">${ps.length}</span></div>${ps.length?`<div class="list">${ps.map(placeRow).join('')}</div>`:'<div class="empty">'+tt('h.tocaEnUnLugar')+'</div>'}
 ${backupPanel()}`;A.hydrate()}
const artRow=a=>`<div class="row"><a href="#/a/${encodeURIComponent(a.id)}" class="rowlink">${A.mono(a.nombre,42)}<div><div class="t">${esc(a.nombre)}</div><div class="s">${esc(a.pueblo||'')}${municipio(a.pueblo)?' · '+lab(region(municipio(a.pueblo))):''}</div></div></a>${favBtn('artesanos',a.id,'icon')}</div>`;
const placeRow=p=>`<div class="row"><a class="rowlink" href="${esc(A.goLink(p))}" target="_blank" rel="noopener"><span class="list-leaf">${VBArt.leaf(p.categoria==='venta'?'#ffd27a':'#8fd162')}</span><div><div class="t">${esc(p.nombre)}</div><div class="s">${tt('h.comoLlegar',{a:esc(A.fx(p,'tipo')||''),b:esc(p.pueblo||'')})}</div></div></a>${favBtn('lugares',p.id,'icon')}</div>`;
/* ---------- cata guiada ---------- */
const FORT5=['Suave','Suave a media','Media','Media a fuerte','Fuerte'];const CUER5=['Ligero','Ligero a medio','Medio','Medio a completo','Completo'];
const PASOS=[
 {id:'cigarro',t:'Tu cigarro',e:tt('h.escogeElCigarroQue')},
 {id:'visual',t:'Visual y capa',e:tt('h.miraLaCapaCon')},
 {id:'aroma',t:'Aroma en frío',e:tt('h.antesDeEncenderHuele'),w:'aroma'},
 {id:'encendido',t:'Encendido',e:tt('h.tuestaElPieCon')},
 {id:'tercio1',t:'Primer tercio',e:tt('h.fumaDespacioMasO'),w:'tercio1'},
 {id:'tercio2',t:'Segundo tercio',e:tt('h.aMitadDelCigarro'),w:'tercio2'},
 {id:'tercio3',t:'Tercer tercio',e:tt('h.elUltimoTercioSuele'),w:'tercio3'},
 {id:'fortaleza',t:'Fortaleza',e:tt('h.laFortalezaEsEl')},
 {id:'cuerpo',t:'Cuerpo',e:tt('h.elCuerpoEsLa')},
 {id:'final',t:'Final',e:tt('h.elFinalEsLo'),w:'final'},
 {id:'resumen',t:'Tu nota',e:tt('h.ponleTuCalificacionY')}];
/* LHB-38: la foto de una cata va a la misma base de fotos del teléfono que las demás (vitola-boricua, fotos); app.js la abre para leerlas y hydrate() las pinta con data-photo */
const FOTOS=(()=>{let p;const open=()=>p||(p=new Promise((res,rej)=>{const r=indexedDB.open('vitola-boricua',1);r.onupgradeneeded=()=>r.result.createObjectStore('fotos');r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)}));
 const tx=(mode,fn)=>open().then(db=>new Promise((res,rej)=>{const t=db.transaction('fotos',mode);const q=fn(t.objectStore('fotos'));t.oncomplete=()=>res(q&&q.result);t.onerror=()=>rej(t.error)}));
 return{put:(k,v)=>tx('readwrite',s=>s.put(v,k)),del:k=>tx('readwrite',s=>s.delete(k)).catch(()=>{})}})();
const NEWDRAFT=(cid,nombre)=>({paso:0,cigarId:cid||'',nombre:nombre||'',capa:'',aspecto:[],tiro:'',quemadaIni:'',ceniza:'',quemada:'',largo:'',fortaleza:'',cuerpo:'',rating:0,notaFinal:'',sellar:true,tags:{aroma:[],tercio1:[],tercio2:[],tercio3:[],final:[]},notas:{},foto:'',publica:false,consumido:hoy(),marca:'',inicio:new Date().toISOString()});
let CD=null;
/* LHB-38 (Codex ronda 3): una foto se borra solo si nada la usa (ni el borrador de ahora ni una entrada del diario, por ejemplo una recuperada de un respaldo) y solo cuando el cambio ya quedó anotado; si no se pudo anotar, queda pendiente y se borra en la próxima anotación que sí funcione */
const refd=k=>(CD&&CD.foto===k)||(S().draft&&S().draft.foto===k)||S().diario.some(e=>e&&e.foto===k);
const dropFoto=(d,ok)=>{if(!d||!d.foto)return;if(ok===false){PEND.push(d.foto);return}if(!refd(d.foto))FOTOS.del(d.foto)};
function persistDraft(){const s=S();s.draft=CD;return write(s)}
/* LHB-38 (Codex ronda 1): sobre la foto de la cata manda la última acción. Cada escoger, quitar, empezar otra cata o cambiar de borrador sube fotoSeq; una foto que termina de achicarse con otro número, o con otro borrador, ya no vale y su archivo se borra */
let fotoSeq=0;
function startCata(cid,nombre){fotoSeq++;const old=S().draft;CD=NEWDRAFT(cid,nombre);if(cid||nombre)CD.paso=1;dropFoto(old,persistDraft());if(location.hash!=='#/cata')location.hash='#/cata';else renderCata()}
function vCata(cid){const dr=S().draft;
 if(cid&&dr&&dr.paso>0&&dr.cigarId!==cid){const c=A.cigarById(cid);view.innerHTML=`<div class="cata"><div class="eyebrow">${tt('tile.cata')}</div><h1>${tt('h.cataAMediasH')}</h1><p class="lead">${tt('h.vaPorElPaso',{a:esc(dr.nombre||tt('h.sinNombre')),b:dr.paso,c:PASOS.length-1})}</p><div class="stack"><button class="btn" id="cCont" type="button">${tt('h.seguirCon',{a:esc(dr.nombre||tt('h.esaCata'))})}</button><button class="btn secondary" id="cNew" type="button">${tt('h.empezarCigarro',{a:esc(c?c.nombre:tt('h.otra'))})}</button></div></div>`;
  $('#cCont').onclick=()=>{CD=dr;location.hash='#/cata'};$('#cNew').onclick=()=>{startCata(cid,c?c.nombre:'')};return}
 if(cid&&(!dr||dr.cigarId!==cid)){fotoSeq++;const c=A.cigarById(cid);CD=NEWDRAFT(cid,c?c.nombre:'');CD.paso=1;dropFoto(dr,persistDraft())}else CD=dr?normDraft(dr):NEWDRAFT();renderCata()}
const normDraft=d=>{const n=NEWDRAFT();return {...n,...d,tags:{...n.tags,...(d.tags||{})},notas:d.notas||{}}};
const seg=(key,opts,cur,label)=>`<div class="seg wrap" role="group" aria-label="${label}">${opts.map(o=>`<button type="button" data-set="${key}" data-v="${esc(o)}" aria-pressed="${cur===o}">${esc(lab(o))}</button>`).join('')}</div>`;
const multi=(key,opts,cur,label)=>`<div class="chips wrapc" role="group" aria-label="${label}">${opts.map(o=>`<button type="button" class="chip" data-tog="${key}" data-v="${esc(o)}" aria-pressed="${cur.includes(o)}">${esc(lab(o))}</button>`).join('')}</div>`;
const noteF=(id,ph)=>`<div class="field"><label for="cn_${id}">${tt('h.tusNotasOpcional')}</label><textarea id="cn_${id}" data-note="${id}" maxlength="400" rows="2" placeholder="${ph||tt('h.loQueSientesCon')}">${esc(CD.notas[id]||'')}</textarea></div>`;
const allTags=()=>[...new Set(Object.values(CD.tags).flat())];
function stepBody(p){const c=CD.cigarId&&A.cigarById(CD.cigarId);switch(p.id){
 case 'cigarro':return `<div class="field"><label for="cCig">${tt('h.delCatalogo')}</label><select id="cCig"><option value="">${tt('h.escoge')}</option>${cigarOptions(CD.cigarId)}</select></div><div class="or">${tt('h.o')}</div><div class="field"><label for="cOtro">${tt('h.escribeOtroCigarro')}</label><input id="cOtro" maxlength="70" value="${esc(!CD.cigarId?CD.nombre:'')}" placeholder="${tt('h.ejToroDeLa')}"></div>`;
 case 'visual':return `<div class="field"><label>${tt('h.colorDeLaCapa')}</label>${seg('capa',['Claro','Natural','Colorado','Maduro','Oscuro'],CD.capa,tt('h.colorDeLaCapa'))}</div><div class="field"><label>${tt('h.alOjoYAl')}</label>${multi('aspecto',['Aceitosa','Brillo sedoso','Venas finas','Venas marcadas','Pareja al tacto','Algo blanda','Algo dura'],CD.aspecto,tt('h.aspecto'))}</div>${noteF('visual')}`;
 case 'aroma':return `<p class="hint">${tt('h.tocaEnLaRueda')}</p>${wheel(CD.tags.aroma,'aroma')}<div class="field"><label>${tt('h.elTiroEnFrio')}</label>${seg('tiro',['Fácil','Justo','Apretado'],CD.tiro,tt('h.tiro'))}</div>${noteF('aroma')}`;
 case 'encendido':return `<div class="field"><label>${tt('h.comoPrendio')}</label>${seg('quemadaIni',['Parejo','Desigual','Costó prender'],CD.quemadaIni,tt('h.encendido'))}</div>${noteF('encendido',tt('h.primerasCaladasIntensidadSabores'))}`;
 case 'tercio1':case 'tercio2':case 'tercio3':return `<p class="hint">${tt('h.tocaLosSaboresQue')}</p>${wheel(CD.tags[p.id],p.id)}${p.id==='tercio2'?`<div class="field"><label>${tt('h.ceniza')}</label>${seg('ceniza',['Firme','Escamosa'],CD.ceniza,tt('h.ceniza'))}</div><div class="field"><label>${tt('h.quemada')}</label>${seg('quemada',['Recta','Torcida','Necesitó retoque'],CD.quemada,tt('h.quemada'))}</div>`:''}${noteF(p.id)}`;
 case 'fortaleza':return `<div class="scale">${seg('fortaleza',FORT5,CD.fortaleza,tt('f.fortaleza'))}</div>${c&&c.fortaleza?`<p class="hint">${tt('h.referenciaPublicaDeEste',{a:esc(A.fortLabel(c.fortaleza))})}</p>`:''}`;
 case 'cuerpo':return `<div class="scale">${seg('cuerpo',CUER5,CD.cuerpo,tt('h.cuerpo'))}</div>`;
 case 'final':return `<div class="field"><label>${tt('h.cuantoDura')}</label>${seg('largo',['Corto','Medio','Largo'],CD.largo,tt('h.largoDelFinal'))}</div><p class="hint">${tt('h.queSaborTeDeja')}</p>${wheel(CD.tags.final,'final')}${noteF('final')}`;
 case 'resumen':{const all=allTags();return `<div class="sum-card"><div class="t">${esc(CD.nombre||tt('h.tuCigarro'))}</div>${c?`<div class="s">${esc(A.artisanName(c))}</div>`:''}
  <dl class="dl">${[[tt('f.capa'),CD.capa],[tt('f.fortaleza'),CD.fortaleza],[tt('h.cuerpo'),CD.cuerpo],[tt('h.final'),CD.largo]].filter(x=>x[1]).map(([k,v])=>`<dt>${k}</dt><dd>${esc(lab(v))}</dd>`).join('')}</dl>${tagChips(all)||'<p class="hint">'+tt('h.noMarcasteSaboresEn')+'</p>'}</div>
  <div class="field"><label>${tt('cig.yourRating')}</label><div class="stars" role="radiogroup" aria-label="${tt('cig.rating')}">${[1,2,3,4,5].map(n=>`<button type="button" role="radio" aria-checked="${n===CD.rating}" aria-label="${n>1?tt('cig.stars',{n}):tt('h.nEstrella',{n})}" data-rate="${n}" class="${n<=CD.rating?'on':''}">★</button>`).join('')}</div></div>
  <div class="field"><label for="cnFinal">${tt('h.notaFinal')}</label><textarea id="cnFinal" maxlength="600" rows="3" placeholder="${tt('h.loVolveriasAFumar')}">${esc(CD.notaFinal)}</textarea></div>
  <div class="field"><label for="cFecha">${tt('h.diaEnQueLo')}</label><input id="cFecha" type="date" min="2000-01-01" max="${hoy()}" value="${esc(okDay(CD.consumido)&&CD.consumido<=hoy()?CD.consumido:hoy())}"></div>
  ${!c?`<div class="field"><label for="cMarca">${tt('h.marcaOpcional')}</label><input id="cMarca" maxlength="60" value="${esc(CD.marca||'')}" list="cMarcaL"><datalist id="cMarcaL">${[...new Set((D().artesanos||[]).map(a=>a.nombre))].sort((a,b)=>a.localeCompare(b,'es')).map(m=>`<option value="${esc(m)}">`).join('')}</datalist></div>`:''}
  <div class="field"><label id="cFotoT">${tt('h.tuFotoOpcional')}</label>${CD.foto?`<div class="dfoto" data-photo="${esc(CD.foto)}" role="img" aria-label="${tt('h.fotoDeLaCata')}"></div>`:''}<div class="ob-pic-row"><button class="lbtn" type="button" id="cFotoB">${CD.foto?tt('h.cambiarFoto'):tt('h.anadirFoto')}</button>${CD.foto?'<button class="lbtn ghost" type="button" id="cFotoX">'+tt('h.quitarFoto')+'</button>':''}</div><input type="file" accept="image/*" id="cFotoF" class="sr" tabindex="-1"><p class="hint" id="cFotoH" aria-live="polite"></p></div>
  <label class="check"><input type="checkbox" id="cPublica" ${CD.publica?'checked':''}> ${tt('h.hacerPublicaEstaCata')}</label><p class="hint">${tt('h.siNoLaHaces')}</p>
  ${c?`<label class="check"><input type="checkbox" id="cSellar" ${CD.sellar?'checked':''}> ${tt('h.sellarEnMiPasaporte',{a:esc(c.nombre)})}</label>`:''}`}}}
function renderCata(){const p=PASOS[CD.paso];const n=PASOS.length-1;
 view.innerHTML=`<div class="cata"><div class="cata-top"><a class="back" href="#/mihoja/diario">${tt('h.diario2')}</a><span class="cata-n">${CD.paso===0?tt('h.empiezaAqui'):`${tt('h.pasoDe',{a:CD.paso,b:n})}`}</span></div>
 <div class="pbar" aria-hidden="true"><i style="width:${CD.paso*100/n}%"></i></div>
 <div class="eyebrow">${tt('h.cataGuiada',{a:CD.nombre&&CD.paso?' · '+esc(CD.nombre):''})}</div><h1>${lab(p.t)}</h1>
 <div class="learn"><p>${p.e}</p></div>
 <div class="cata-body">${stepBody(p)}</div>
 <div class="cata-nav">${CD.paso>0?'<button class="btn secondary" id="cPrev" type="button">'+tt('h.atras')+'</button>':'<span></span>'}<button class="btn" id="cNext" type="button">${CD.paso===n?tt('h.guardarEnMiDiario'):CD.paso===0?tt('h.empezar'):tt('h.siguiente')}</button></div>
 ${CD.paso>0&&CD.paso<n?'<button class="linkish" id="cSkip" type="button">'+tt('h.saltarATuNota')+'</button>':''}
 <p class="note">${tt('h.guiaGeneralParaDisfrutar')}</p></div>`;
 bindWheel(k=>CD.tags[k],(k,v)=>{CD.tags[k]=v;persistDraft()},(k,id)=>{const y=scrollY;renderCata();scrollTo(0,y);const g=$(`.wseg[data-w="${id}"]`);g&&g.focus({preventScroll:true})});
 $$('[data-set]').forEach(b=>b.onclick=()=>{const k=b.dataset.set;CD[k]=CD[k]===b.dataset.v?'':b.dataset.v;persistDraft();$$(`[data-set="${k}"]`).forEach(x=>x.setAttribute('aria-pressed',CD[k]===x.dataset.v))});
 $$('[data-tog]').forEach(b=>b.onclick=()=>{const k=b.dataset.tog,v=b.dataset.v;CD[k]=CD[k].includes(v)?CD[k].filter(x=>x!==v):[...CD[k],v];persistDraft();b.setAttribute('aria-pressed',CD[k].includes(v))});
 $$('[data-note]').forEach(t=>t.oninput=()=>{CD.notas[t.dataset.note]=t.value;persistDraft()});
 $$('[data-rate]').forEach(b=>b.onclick=()=>{CD.rating=+b.dataset.rate;persistDraft();$$('[data-rate]').forEach(x=>{x.classList.toggle('on',+x.dataset.rate<=CD.rating);x.setAttribute('aria-checked',+x.dataset.rate===CD.rating)})});
 const nf=$('#cnFinal');if(nf)nf.oninput=()=>{CD.notaFinal=nf.value;persistDraft()};const sl=$('#cSellar');if(sl)sl.onchange=()=>{CD.sellar=sl.checked;persistDraft()};
 /* LHB-38: día, marca, pública y foto de la cata; la foto se achica y se guarda en el teléfono al escogerla, y una foto que llega cuando el borrador ya no es ese se borra */
 const cf=$('#cFecha');if(cf)cf.onchange=()=>{const v=okDay(cf.value)&&cf.value<=hoy()?cf.value:hoy();CD.consumido=v;cf.value=v;persistDraft()};
 const cm=$('#cMarca');if(cm)cm.oninput=()=>{CD.marca=cm.value;persistDraft()};
 const cp=$('#cPublica');if(cp)cp.onchange=()=>{CD.publica=cp.checked;persistDraft()};
 const fb=$('#cFotoB'),ff=$('#cFotoF');if(fb&&ff){fb.onclick=()=>ff.click();
  ff.onchange=async e=>{const f=e.target.files&&e.target.files[0];e.target.value='';if(!f)return;const h=$('#cFotoH');
   if(!/^image\//.test(f.type)){if(h)h.textContent=tt('h.escogeUnaImagen');return}
   const mine=CD,my=++fotoSeq,key='dfoto_'+uid('');let ok=false;
   try{const b=await A.resizeImage(f,1100,.8);await FOTOS.put(key,b);ok=true}catch(x){}
   if(my!==fotoSeq||CD!==mine){if(ok)FOTOS.del(key);return}
   const here=/^#\/cata/.test(location.hash)&&!!acct.get(),hint=m=>{const x=here&&$('#cFotoH');if(x)x.textContent=m};
   if(!ok){hint(tt('h.noPudimosGuardarLa'));return}
   const old=CD.foto;CD.foto=key;
   if(!persistDraft()){CD.foto=old;FOTOS.del(key);hint(tt('h.noHayEspacioPara2'));return}
   dropFoto({foto:old});
   if(here){const y=scrollY;renderCata();scrollTo(0,y)}}}
 const fx=$('#cFotoX');if(fx)fx.onclick=()=>{const old=CD.foto;fotoSeq++;CD.foto='';if(!persistDraft()){CD.foto=old;return}dropFoto({foto:old});const y=scrollY;renderCata();scrollTo(0,y)};
 A.hydrate(view);
 const cc=$('#cCig'),co=$('#cOtro');if(cc){cc.onchange=()=>{if(cc.value)co.value=''};co.oninput=()=>{if(co.value)cc.value=''}}
 const go=d=>{CD.paso=Math.max(0,Math.min(n,CD.paso+d));persistDraft();renderCata();scrollTo(0,0)};
 $('#cNext').onclick=()=>{if(CD.paso===0){const v=cc.value,o=co.value.trim();if(!v&&!o){toast(tt('h.escogeOEscribeEl'));return}const c=v&&A.cigarById(v);CD.cigarId=c?c.id:'';CD.nombre=c?c.nombre:o;go(1);return}
  if(CD.paso===n){saveCata();return}go(1)};
 const pv=$('#cPrev');if(pv)pv.onclick=()=>go(-1);const sk=$('#cSkip');if(sk)sk.onclick=()=>{CD.paso=n;persistDraft();renderCata();scrollTo(0,0)}}
function saveCata(){if(!CD.rating){toast(tt('h.ponleDe1A'));return}const c=CD.cigarId&&A.cigarById(CD.cigarId);
 const pasos=PASOS.slice(1,-1).map(p=>({paso:p.t,tags:p.w?CD.tags[p.w]:[],nota:(CD.notas[p.id]||'').trim()}));
 const e={id:uid('d'),fecha:new Date().toISOString(),cigarId:c?c.id:null,nombre:CD.nombre,artesano:c?A.artisanName(c):'',rating:CD.rating,notas:(CD.notaFinal||'').trim(),tags:allTags(),fortaleza:CD.fortaleza,cuerpo:CD.cuerpo,final:CD.largo,capa:CD.capa,tiro:CD.tiro,quemada:CD.quemada,aspecto:CD.aspecto,pasos,origen:'cata',foto:CD.foto||'',publica:!!CD.publica,consumido:okDay(CD.consumido)&&CD.consumido<=hoy()?CD.consumido:hoy(),marca:c?'':String(CD.marca||'').trim().slice(0,60),actualizado:new Date().toISOString()};
 save(s=>{s.diario.unshift(e);if(c){s.ratings[c.id]=CD.rating;if(CD.sellar&&!s.pasaporte.cigarros[c.id])s.pasaporte.cigarros[c.id]=hoy()}s.draft=null});CD=null;
 toast(tt('h.cataGuardadaEnTu'));location.hash='#/mihoja/diario'}
/* ---------- maridajes (guía general, sin marcas) ---------- */
const RON=[{id:'blanco',n:tt('h.ronBlanco'),p:tt('h.ligeroYLimpioFiltrado'),f:['suave'],t:['floral','frutos','nuez'],m:tt('h.conCigarrosSuavesDe')},
 {id:'dorado',n:tt('h.ronDoradoUOro'),p:tt('h.algoMasDeBarrica'),f:['suave','media'],t:['dulce','nuez','madera'],m:tt('h.conSuavesAMedios')},
 {id:'anejo',n:tt('h.ronAnejo'),p:tt('h.variosAnosEnRoble'),f:['media','fuerte'],t:['madera','especias','cacao','dulce'],m:tt('h.elMaridajeClasicoPara')},
 {id:'extra',n:tt('h.ronMuyAnejoReserva'),p:tt('h.masDensoYComplejo'),f:['fuerte'],t:['cuero','cacao','tierra'],m:tt('h.paraCigarrosFuertesY')},
 {id:'especiado',n:tt('h.ronEspeciadoSpiced'),p:tt('h.ronConEspeciasY'),f:['media','fuerte'],t:['especias','dulce','cacao'],m:tt('h.contrastaConCigarrosPimentosos')}];
const CAFE=[{id:'claro',n:tt('h.cafeDeTuesteClaro'),p:tt('h.masAcidezYNotas'),f:['suave'],t:['floral','frutos','nuez'],m:tt('h.conCigarrosSuavesY')},
 {id:'medio',n:tt('h.cafeDeTuesteMedio'),p:tt('h.balanceEntreDulzorCaramelo'),f:['media'],t:['dulce','nuez','madera','tierra'],m:tt('h.elTodoterrenoVaCon')},
 {id:'oscuro',n:tt('h.cafeDeTuesteOscuro'),p:tt('h.cacaoTostadoYUn'),f:['fuerte'],t:['cacao','cuero','tierra','especias'],m:tt('h.conCigarrosFuertesO')}];
const FORTN=f=>({suave:0,media:1,fuerte:2})[f]??1;
const pick=(list,fort,tags)=>list.map(x=>({x,s:(x.f.includes(fort)?3:0)-Math.min(...x.f.map(y=>Math.abs(FORTN(y)-FORTN(fort))))+(tags||[]).filter(t=>x.t.includes(t)).length*.8})).sort((a,b)=>b.s-a.s)[0].x;
function pairing(c){const f=c.fortaleza||'media',t=cigarTags(c);return{ron:pick(RON,f,t),cafe:pick(CAFE,f,t),tags:t}}
const mstate={f:'media',t:[]};
function vMaridajes(){const r=pick(RON,mstate.f,mstate.t),k=pick(CAFE,mstate.f,mstate.t);
 const card=x=>`<article class="pcard"><h3>${x.n}</h3><p class="pp">${x.p}</p><p>${x.m}</p><div class="pills"><span class="pill">${tt('h.fortalezaRango',{a:x.f.map((f,i)=>i?A.fortLabel(f).toLowerCase():A.fortLabel(f)).join(tt('h.rangoA'))})}</span>${x.t.map(t=>`<span class="pill">${WN(t)}</span>`).join('')}</div></article>`;
 view.innerHTML=`${A.head(tt('tile.mar'),tt('h.ronCafeYHumo'),tt('h.guiaGeneralParaAcompanar'),VBArt.leaf('#8fd162','sec-leaf'))}
 <section class="pair-tool"><h2>${tt('h.queVasAFumar')}</h2>
 <div class="field"><label>${tt('f.fortaleza')}</label><div class="seg" role="group" aria-label="${tt('f.fortaleza')}">${A.FORT.map(f=>`<button type="button" data-mf="${f}" aria-pressed="${mstate.f===f}">${A.fortLabel(f)}</button>`).join('')}</div></div>
 <div class="field"><label>${tt('h.perfilDeSaborToca')}</label><div class="chips wrapc" role="group" aria-label="${tt('h.perfilDeSabor')}">${WHEEL.map(w=>`<button type="button" class="chip" data-mt="${w.id}" aria-pressed="${mstate.t.includes(w.id)}">${w.n}</button>`).join('')}</div></div>
 <div class="pair-res" aria-live="polite"><div class="pr"><small>${tt('h.ron')}</small><b>${r.n}</b><p>${r.m}</p></div><div class="pr"><small>${tt('h.cafe2')}</small><b>${k.n}</b><p>${k.m}</p></div></div></section>
 <div class="section-title"><h2>${tt('h.ronesPorEstilo')}</h2></div><div class="pair-list">${RON.map(card).join('')}</div>
 <div class="section-title"><h2>${tt('h.cafeDePuertoRico')}</h2></div>
 <p class="lead" style="margin-top:-2px">${tt('h.laMayorParteDel')}</p>
 <div class="pair-list">${CAFE.map(card).join('')}</div>
 <div class="section-title"><h2>${tt('h.reglasRapidas')}</h2></div>
 <ul class="tips"><li><b>${tt('h.intensidadConIntensidad')}</b> ${tt('h.unCigarroSuaveCon')}</li><li><b>${tt('h.loDulceCalmaLa')}</b> ${tt('h.unAnejoOUn')}</li><li><b>${tt('h.parecidoOContraste')}</b> ${tt('h.buscaUnSaborEn')}</li><li><b>${tt('h.limpiaElPaladar')}</b> ${tt('h.unSorboDeAgua')}</li></ul>
 <p class="note">${tt('h.guiaGeneralSinMarcas')}</p>`;
 $$('[data-mf]').forEach(b=>b.onclick=()=>{mstate.f=b.dataset.mf;const y=scrollY;vMaridajes();scrollTo(0,y)});$$('[data-mt]').forEach(b=>b.onclick=()=>{const t=b.dataset.mt;mstate.t=mstate.t.includes(t)?mstate.t.filter(x=>x!==t):[...mstate.t,t];const y=scrollY;vMaridajes();scrollTo(0,y)})}
/* ---------- podcast: solo contenido real publicado en cigarspodcast.sites.tab.bot (verificado 20 oct 2026) ---------- */
const POD='https://cigarspodcast.sites.tab.bot/';
const SPOTIFY='https://open.spotify.com/show/5DUCZkx89z9cTeBaczq6Gr';
const SPOT_SVG='<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="11" fill="#0e2417"/><path d="M6.2 9.3c3.9-1.2 8.3-.8 11.6 1.1M6.8 12.5c3.2-.9 6.8-.6 9.6 1M7.4 15.5c2.6-.7 5.3-.5 7.6.8" fill="none" stroke="#1DB954" stroke-width="1.8" stroke-linecap="round"/></svg>';
const ARTS=[{u:POD+'articulos/blackbird-mockingbird-short-run-lanzamiento',t:tt('h.mockingbirdElShortRun'),c:tt('h.lanzamientos'),f:'2026-10-19'},
 {u:POD+'articulos/segovias-de-esteli-habano-oscuro-lancero-93',t:tt('h.segoviasDeEsteliHabano'),c:tt('h.resenas'),f:'2026-10-16'},
 {u:POD+'articulos/monte-y-mistica-molina-lopez-lanzamiento',t:tt('h.monteMisticaHechaA'),c:tt('h.lanzamientos'),f:'2026-10-14',a:['molina-lopez'],cg:['monte-mistica-corojo','monte-mistica-maduro','monte-mistica-connecticut','galiz-spirit']},
 {u:POD+'articulos/el-pareo-musical',t:tt('h.elPareoMusical'),c:tt('h.cultura'),f:'2023-02-06'},
 {u:POD+'articulos/seis-razones-para-degustar-un-buen-cigarro',t:tt('h.seisRazonesParaDegustar'),c:tt('h.cultura'),f:'2023-01-04'},
 {u:POD+'articulos/el-amor-es-amor',t:tt('h.elAmorEsAmor'),c:tt('h.cultura'),f:'2022-03-03'},
 {u:POD+'articulos/cigars-podcast-lo-bueno-se-comparte',t:'#LoBuenoSeComparte',c:tt('h.comunidad'),f:'2022-02-01'},
 {u:POD+'articulos/elegante-de-boutique-guia-para-el-cigar-lounge',t:tt('h.eleganteDeBoutiqueGuia'),c:tt('h.etiqueta'),f:'2021-11-15'}];
const MIC='<svg class="mic" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 14a3 3 0 0 0 3-3V6a3 3 0 0 0-6 0v5a3 3 0 0 0 3 3zm5-3a5 5 0 0 1-10 0H5a7 7 0 0 0 6 6.9V21h2v-3.1A7 7 0 0 0 19 11z" fill="currentColor"/></svg>';
const DOC='<svg class="mic" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3h9l4 4v14H6z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M9 11h7M9 15h7M9 7h4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
function podBlock(kind,id){const list=ARTS.filter(x=>((kind==='a'?x.a:x.cg)||[]).includes(id));
 if(!list.length&&kind==='c')return '';
 return `<section class="pod">${MIC}<div><div class="eyebrow">${tt('h.escuchaEnCigarsPodcast')}</div>${list.length?list.map(x=>`<a class="pod-a" href="${x.u}" target="_blank" rel="noopener"><b>${esc(x.t)}</b><small>${x.c} · ${fmtF(x.f)}</small></a>`).join(''):`<p class="pod-s">${tt('h.lanzamientosResenasYCultura2')}</p>`}<a class="pod-more" href="${list.length?'#/podcast':POD}" ${list.length?'':'target="_blank" rel="noopener"'}>${list.length?tt('h.masDeCigarsPodcast'):tt('h.visitarCigarsPodcast')}</a></div></section>`}
function vPodcast(){view.innerHTML=`${A.head(tt('h.podcast'),tt('h.escuchaEnCigarsPodcast2'),tt('h.lanzamientosResenasYCultura3'),VBArt.coqui())}
 <div class="links"><a class="lbtn spotify" href="${SPOTIFY}" target="_blank" rel="noopener">${tt('h.escuchaloEnSpotify',{a:SPOT_SVG})}</a><a class="lbtn web" href="${POD}" target="_blank" rel="noopener">${A.ICON.web}Cigars Podcast</a><a class="lbtn ig" href="https://www.instagram.com/cigarspodcast/" target="_blank" rel="noopener">${A.ICON.ig}@cigarspodcast</a></div>
 <div class="section-title"><h2>${tt('h.articulos')}</h2></div><div class="list">${ARTS.map(x=>`<a class="row" href="${x.u}" target="_blank" rel="noopener">${DOC}<div><div class="t">${esc(x.t)}</div><div class="s">${x.c} · ${fmtF(x.f)}</div></div><span class="go">›</span></a>`).join('')}</div>
 <p class="note">${tt('h.seAbrenEnEl')}</p>`}
/* ---------- búsqueda global ---------- */
const qs={q:'',reg:'',mun:'',fort:''};
const norm=t=>String(t||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
function vBuscar(){const d=D();const munis=[...new Set([...d.artesanos.map(a=>a.pueblo),...d.places.map(p=>p.pueblo),...d.cigarros.map(c=>c.pueblo),...(d.events.actividades||[]).map(e=>e.pueblo)].map(municipio).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'es'));
 view.innerHTML=`${A.head(tt('cat.search'),tt('h.buscaEnTodo'),tt('h.cigarrosArtesanosLugaresY'),VBArt.flor())}
 <label class="search"><svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/></svg><span class="sr">${tt('cat.search')}</span><input id="gq" type="search" placeholder="${tt('h.buscarEnTodaLa')}" value="${esc(qs.q)}" autocomplete="off"></label>
 <div class="filter-row"><select id="gReg" aria-label="${tt('h.region')}"><option value="">${tt('h.regionTodas')}</option>${Object.keys(REG).map(r=>`<option value="${r}" ${qs.reg===r?'selected':''}>${lab(r)}</option>`).join('')}</select>
 <select id="gMun" aria-label="${tt('h.municipio')}"><option value="">${tt('h.municipioTodos')}</option>${munis.filter(m=>!qs.reg||region(m)===qs.reg).map(m=>`<option ${qs.mun===m?'selected':''}>${esc(m)}</option>`).join('')}</select></div>
 <div class="chips" role="group" aria-label="${tt('f.fortaleza')}"><button class="chip" data-gf="" aria-pressed="${!qs.fort}">${tt('h.todaFortaleza')}</button>${A.FORT.map(f=>`<button class="chip" data-gf="${f}" aria-pressed="${qs.fort===f}">${A.fortLabel(f)}</button>`).join('')}</div>
 <div id="gres" aria-live="polite"></div>`;
 const run=()=>{const q=norm(qs.q).trim();const geo=p=>{const m=municipio(p);return(!qs.mun||m===qs.mun)&&(!qs.reg||region(m)===qs.reg)};const hit=arr=>!q||norm(arr.join(' ')).includes(q);
  const cs=A.allCigars().filter(c=>hit([c.nombre,A.artisanName(c),c.pueblo,A.fq(c,'capa'),A.fq(c,'notas'),(c.vitolas||[]).join(' ')])&&geo(c.pueblo)&&(!qs.fort||c.fortaleza===qs.fort));
  const as=d.artesanos.filter(a=>hit([a.nombre,a.pueblo,A.fq(a,'tipo'),A.fq(a,'historia')])&&geo(a.pueblo)&&(!qs.fort||A.allCigars().some(c=>c.artesano_id===a.id&&c.fortaleza===qs.fort)));
  const ps=qs.fort?[]:d.places.filter(p=>hit([p.nombre,A.fq(p,'tipo'),p.pueblo,p.direccion])&&geo(p.pueblo));
  const today=new Date();today.setHours(0,0,0,0);const es=qs.fort?[]:(d.events.actividades||[]).filter(e=>{const x=A.evDate(e.fecha);return x&&x>=today&&hit([e.titulo,e.lugar,e.pueblo,e.detalle])&&((!qs.mun&&!qs.reg)||(e.pueblo&&geo(e.pueblo)))});
  const n=cs.length+as.length+ps.length+es.length;
  $('#gres').innerHTML=`<p class="count-line">${n===1?tt('h.nResultado',{n}):tt('h.nResultados',{n})}${qs.fort?tt('h.fortalezaFiltra'):''}</p>
  ${cs.length?`<div class="section-title"><h2>${tt('h.cigarros2')}</h2><span class="count">${cs.length}</span></div><div class="grid">${cs.map(A.cigarCard).join('')}</div>`:''}
  ${as.length?`<div class="section-title"><h2>${tt('arts.eyebrow')}</h2><span class="count">${as.length}</span></div><div class="list">${as.map(artRow).join('')}</div>`:''}
  ${ps.length?`<div class="section-title"><h2>${tt('lug.eyebrow')}</h2><span class="count">${ps.length}</span></div><div class="list">${ps.map(placeRow).join('')}</div>`:''}
  ${es.length?`<div class="section-title"><h2>${tt('tile.ev')}</h2><span class="count">${es.length}</span></div><div class="list">${es.map(e=>`<a class="row" href="#/eventos/${encodeURIComponent(e.id)}"><div><div class="t">${esc(e.titulo)}</div><div class="s">${[fmtF(e.fecha),esc(okv(e.pueblo)||okv(e.lugar))].filter(Boolean).join(' · ')}</div></div><span class="go">›</span></a>`).join('')}</div>`:''}
  ${n?'':'<div class="empty">'+tt('h.nadaConEsaBusqueda')+'</div>'}`;A.hydrate($('#gres'))};
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
 const desc=[okv(e.hora)&&(tt('h.hora')+e.hora),e.precio&&scrub(e.precio),scrub(e.detalle||''),isAnchor(e)?`${tt('h.rsvpAthMovil',{a:ANCHOR.registro,b:ANCHOR.ath})}`:'',url,'La Hoja Boricua · '+APP_URL].filter(Boolean).join('\n');
 const loc=[okv(e.lugar),okv(e.pueblo),'Puerto Rico'].filter(Boolean).join(', ');
 return ['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//La Hoja Boricua//ES','CALSCALE:GREGORIAN','METHOD:PUBLISH','BEGIN:VEVENT',`UID:${e.id||uid('e')}@lahojaboricua.sites.tab.bot`,`DTSTAMP:${icsT(new Date())}`,...dt,`SUMMARY:${icsEsc(e.titulo)}`,`LOCATION:${icsEsc(loc)}`,`DESCRIPTION:${icsEsc(desc)}`,url?`URL:${url}`:'','END:VEVENT','END:VCALENDAR'].filter(Boolean).map(fold).join('\r\n')+'\r\n'}
function addToCal(e){download(new Blob([icsFor(e)],{type:'text/calendar;charset=utf-8'}),(e.id||'evento')+'.ics');toast(tt('h.abreElArchivoIcs'))}
const evst={mode:'lista',day:''};
const CAL_ICO='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 2v3M17 2v3M4 8h16M5 5h14v15H5z" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 11v6M9 14h6" stroke="currentColor" stroke-width="2"/></svg>';
const DIAS=tt('h.dias').split(',');
/* v29: campo vacío o marcador ("no definido", "por confirmar"…) = no se muestra */
const NOPH=/no definid|por confirmar|no publicad|sin confirmar|^\s*\?+\s*$/i;const okv=v=>v&&!NOPH.test(String(v))?String(v):'';
function evMeta(e,p){return [okv(e.hora),[okv(e.lugar),okv(e.pueblo)].filter(Boolean).join(', '),p===false?'':okv(e.precio&&scrub(e.precio))].filter(Boolean).map(esc).join(' · ')}
const evLine=(e,p)=>{const m=evMeta(e,p);return m?`<div class="s">${m}</div>`:''};
function evCard(e,pending){const d=A.evDate(e.fecha);const m={nombre:e.lugar||e.titulo,direccion:e.direccion||'',pueblo:e.pueblo,maps:e.maps,lat:e.lat,lng:e.lng};const src=e.enlace||e.fuente_url;
 return `<article class="ev ${pending?'pending':''}" id="ev-${esc(e.id)}"><div class="date">${d?`<small>${MES[d.getMonth()]}</small><b>${d.getDate()}</b><small>${DIAS[d.getDay()]}</small>`:'<b>?</b>'}</div><div style="min-width:0;flex:1">
 <div class="t">${esc(e.titulo)}</div>${evLine(e)}
 ${e.imagen?`<img class="ev-flyer" src="${esc(e.imagen)}" alt="${esc(e.titulo)}" width="480" height="600" loading="lazy">`:''} ${okv(e.detalle)?`<div class="s">${esc(scrub(e.detalle))}</div>`:''}
 <div class="src">${pending?tt('ev.pending'):(e.fuente?`${tt('h.via',{a:e.fuente_url?`<a href="${esc(e.fuente_url)}" target="_blank" rel="noopener">${esc(e.fuente)}</a>`:esc(e.fuente)})}`:'')}</div>
 <div class="links">${src?A.linkBtn('web',src,pending?tt('h.verEnlace'):tt('h.verFuente')):''}${pending?'':`<button type="button" class="lbtn" data-ics="${esc(e.id)}">${tt('h.anadirACalendario',{a:CAL_ICO})}</button>`}${(okv(e.lugar)||e.maps)?`<a class="lbtn go-map" href="${esc(A.goLink(m))}" target="_blank" rel="noopener">${tt('h.comoLlegar2',{a:A.ICON.map})}</a>`:''}</div></div></article>`}
function anchorCard(e){const d=A.evDate(e.fecha);const m={nombre:e.lugar,pueblo:e.pueblo,maps:e.maps};
 return `<section class="anchor" id="ev-${esc(e.id)}"><div class="anchor-tag">${tt('h.elEventoAncla')}</div><div class="anchor-top">${d?`<div class="date big"><small>${MES[d.getMonth()]}</small><b>${d.getDate()}</b><small>${DIAS[d.getDay()]}</small></div>`:''}
 <div><h2>${esc(e.titulo)}</h2>${evLine({lugar:e.lugar,pueblo:e.pueblo})}${evLine({hora:e.hora})}</div></div>
 ${okv(e.detalle)?`<p class="anchor-d">${esc(scrub(e.detalle))}</p>`:''}
 <div class="rsvp"><a class="btn" href="${ANCHOR.registro}" target="_blank" rel="noopener">${tt('h.confirmaTuAsistenciaRsvp')}</a>
 <div class="ath"><div><small>${tt('h.cataDeLas5')}</small><b>${ANCHOR.ath}</b></div><button type="button" class="lbtn" data-copy="${ANCHOR.ath}">${tt('h.copiar')}</button></div></div>
 <div class="links"><button type="button" class="lbtn" data-ics="${esc(e.id)}">${tt('h.anadirACalendario',{a:CAL_ICO})}</button>${(okv(e.lugar)||e.maps)?`<a class="lbtn go-map" href="${esc(A.goLink(m))}" target="_blank" rel="noopener">${tt('h.comoLlegar2',{a:A.ICON.map})}</a>`:''}${e.enlace?A.linkBtn('web',e.enlace,e.enlace.replace(/^https?:\/\/(www\.)?/,'').replace(/\/$/,'')):''}${e.fuente_url?A.linkBtn('ig',e.fuente_url,e.fuente||'Instagram'):''}</div></section>`}
function calGrid(evs){if(!evs.length)return '<div class="empty">'+tt('h.noHayEventosProximos')+'</div>';const by={};evs.forEach(e=>{(by[e.fecha]=by[e.fecha]||[]).push(e)});
 const first=A.evDate(evs[0].fecha),last=A.evDate(evs[evs.length-1].fecha);const td=hoy();let html='';
 for(let y=first.getFullYear(),mo=first.getMonth();y<last.getFullYear()||(y===last.getFullYear()&&mo<=last.getMonth());){const start=new Date(y,mo,1).getDay(),days=new Date(y,mo+1,0).getDate();
  let cells='';for(let i=0;i<start;i++)cells+='<span class="cd empty-d"></span>';
  for(let dd=1;dd<=days;dd++){const k=`${y}-${pad(mo+1)}-${pad(dd)}`;const es=by[k]||[];const anc=es.some(isAnchor);
   cells+=es.length?`<button type="button" class="cd has${anc?' anc':''}${evst.day===k?' sel':''}" data-day="${k}" aria-label="${es.length>1?tt('h.diaEventos',{d:dd,m:MESL[mo],n:es.length}):tt('h.diaEvento',{d:dd,m:MESL[mo],n:es.length})}" aria-pressed="${evst.day===k}">${dd}<i></i></button>`:`<span class="cd${k===td?' today':''}">${dd}</span>`}
  html+=`<div class="cal"><div class="cal-h">${MESL[mo]} ${y}</div><div class="cal-g">${DIAS.map(x=>`<span class="dw">${x[0].toUpperCase()}</span>`).join('')}${cells}</div></div>`;
  if(mo===11){mo=0;y++}else mo++}
 const sel=evst.day?by[evst.day]||[]:[];
 return html+`<div class="cal-legend"><span><i class="lg-anc"></i>${tt('tile.evSub')}</span><span><i class="lg-ev"></i>${tt('h.otrosEventos')}</span></div><div id="calSel">${sel.length?sel.map(e=>isAnchor(e)?anchorCard(e):evCard(e)).join(''):'<p class="hint">'+tt('h.tocaUnDiaMarcado')+'</p>'}</div>`}
function vEventos(focus){const LS=A.LS;const today=new Date();today.setHours(0,0,0,0);const evs=(D().events.actividades||[]).filter(e=>{const d=A.evDate(e.fecha);return d&&d>=today}).sort((a,b)=>a.fecha.localeCompare(b.fecha));const mine=LS.get('sugeridas',[]);
 const anc=evs.find(isAnchor);const rest=evs.filter(e=>e!==anc);const upd=D().events.actualizado?new Date(D().events.actualizado):null;
 view.innerHTML=`${A.head(tt('h.actividades'),tt('h.eventosYCatas'),tt('h.loQueVieneEn'),VBArt.coqui())}
 ${upd&&!isNaN(upd)?`<p class="updated">${tt('h.listaActualizadaEl',{a:upd.getDate(),b:MES[upd.getMonth()],c:upd.getFullYear(),d:navigator.onLine?'':tt('h.sinConexion')})}</p>`:''}
 <div class="toggle" role="group" aria-label="${tt('lug.view')}"><button type="button" data-evm="lista" aria-pressed="${evst.mode==='lista'}">${tt('lug.list')}</button><button type="button" data-evm="cal" aria-pressed="${evst.mode==='cal'}">${tt('h.calendario')}</button></div>
 ${evst.mode==='cal'?calGrid(evs):`${anc?anchorCard(anc):''}${rest.length?`<div class="section-title"><h2>${tt('h.proximos')}</h2><span class="count">${rest.length}</span></div>`:''}${rest.map(e=>evCard(e)).join('')}${evs.length?'':'<div class="empty">'+tt('h.noHayActividadesProximas')+'</div>'}`}
 ${mine.length?`<div class="section-title"><h2>${tt('h.tusSugerencias')}</h2></div>${mine.map(e=>evCard(e,true)).join('')}`:''}
 <details class="edit"><summary>${tt('h.sugerirActividad')}</summary><form class="form" id="sugForm"><div class="field"><label for="sT">${tt('h.actividad')}</label><input id="sT" required maxlength="80" placeholder="${tt('h.ejNocheDeCata')}"></div>
 <div class="field"><label for="sF">${tt('h.fecha')}</label><input id="sF" type="date" required></div><div class="field"><label for="sH">${tt('h.hora2')}</label><input id="sH" maxlength="20" placeholder="${tt('h.ej700Pm')}"></div>
 <div class="field"><label for="sL">${tt('h.lugar')}</label><input id="sL" maxlength="60"></div><div class="field"><label for="sP">${tt('f.pueblo')}</label><input id="sP" maxlength="40"></div>
 <div class="field"><label for="sE">${tt('h.enlaceIgOWeb')}</label><input id="sE" type="url" maxlength="200" placeholder="https://"></div><button class="btn" type="submit">${tt('h.guardarSugerencia')}</button></form></details>
 <div class="section-title"><h2>${tt('h.fuentes')}</h2></div><p class="lead" style="margin-top:-4px">${tt('h.lasCuentasQueEsta')}</p>
 <div class="list">${(D().events.fuentes||[]).map(f=>`<a class="row" href="${esc(f.url)}" target="_blank" rel="noopener">${A.mono(f.handle.replace('@',''),38)}<div><div class="t">${esc(f.handle)}</div>${f.nombre?`<div class="s">${esc(f.nombre)}</div>`:''}</div><span class="go">›</span></a>`).join('')}</div>${A.PROTO_NOTE}`;
 $$('[data-evm]').forEach(b=>b.onclick=()=>{evst.mode=b.dataset.evm;vEventos()});
 $$('[data-day]').forEach(b=>b.onclick=()=>{evst.day=evst.day===b.dataset.day?'':b.dataset.day;vEventos();const s=$('#calSel');s&&s.scrollIntoView({block:'nearest',behavior:'smooth'})});
 $('#sugForm').onsubmit=e=>{e.preventDefault();const t=$('#sT').value.trim(),f=$('#sF').value;if(!t||!f){toast(tt('h.faltaLaActividadO'));return}
  LS.set('sugeridas',[...LS.get('sugeridas',[]),{id:'s'+Date.now().toString(36),titulo:t,fecha:f,hora:$('#sH').value.trim(),lugar:$('#sL').value.trim(),pueblo:$('#sP').value.trim(),enlace:$('#sE').value.trim()}].sort((a,b)=>a.fecha.localeCompare(b.fecha)));toast(tt('h.sugerenciaGuardada'));vEventos()};
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
 x.font='600 24px Figtree';x.fillStyle='#8fb8ff';x.textAlign='center';x.fillText(tt('h.hechoEnPuertoRico'),W/2,162);x.textAlign='left';
 const foto=(!c.yours&&window.LHB_FOTOS)?window.LHB_FOTOS[c.id]:null;let fimg=null;
 if(foto){fimg=new Image();fimg.src=foto.img;await new Promise(r=>{fimg.onload=r;fimg.onerror=()=>{fimg=null;r()}})}
 const img=new Image();if(!fimg){img.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(A.cigarSVG(c));await new Promise(r=>{img.onload=r;img.onerror=r})}
 x.save();x.translate(W/2,520);x.rotate(-.025);x.shadowColor='rgba(0,0,0,.45)';x.shadowBlur=30;x.shadowOffsetY=12;x.fillStyle='#fbfbf8';x.fillRect(-410,-300,820,640);x.shadowColor='transparent';
 if(fimg){x.fillStyle='#ffffff';x.fillRect(-380,-270,760,570);try{x.drawImage(fimg,-380,-205,760,380)}catch(e){}x.fillStyle='#5b5b5b';x.font='600 20px Figtree';x.textAlign='center';x.fillText(foto.credito+(foto.match==='linea'?tt('h.fotoDeLaLinea'):''),0,282);x.textAlign='left'}
 else{try{x.drawImage(img,-380,-270,760,570)}catch(e){x.fillStyle='#7fb0ff';x.fillRect(-380,-270,760,570)}}x.restore();
 x.fillStyle='#f8f8f4';x.font='68px Shrikhand';x.textAlign='center';let y=960;const nl=wrap(x,c.nombre,W-140).slice(0,2);if(nl.length>1){x.font='56px Shrikhand';y=930}nl.forEach((l,i)=>x.fillText(l,W/2,y+i*68));y+= (nl.length-1)*68;
 x.font='600 34px Figtree';x.fillStyle='#dde3dc';x.fillText([A.artisanName(c),c.pueblo].filter(Boolean).join(' · '),W/2,y+56);x.textAlign='left';
 const vs=c.vitolas||[];const specs=[[tt('h.cardCapa'),(A.fx(c,'capa')||tt('notPub')).replace(/\s*\(.*?\)/g,'')],[tt('h.cardFortaleza'),c.fortaleza?A.fortLabel(c.fortaleza):tt('notPub')],[tt('h.cardVitola'),vs.length?vs[0]+(vs.length>1?' +'+(vs.length-1):''):tt('h.enVerificacion')]];
 const bw=300,gap=24,bx=(W-bw*3-gap*2)/2,by=y+96;specs.forEach(([k,v],i)=>{const X=bx+i*(bw+gap);x.fillStyle='rgba(23,58,38,.92)';rr(x,X,by,bw,110,18);x.fill();x.strokeStyle='#2c5a3d';x.lineWidth=2;x.stroke();
  x.fillStyle='#8fb8ff';x.font='700 20px Figtree';x.fillText(k,X+22,by+38);x.fillStyle='#f8f8f4';x.font='700 30px Figtree';let vv=String(v);while(x.measureText(vv).width>bw-44&&vv.length>3)vv=vv.slice(0,-2)+'…';x.fillText(vv.replace('……','…'),X+22,by+82)});
 x.textAlign='center';x.fillStyle='#8fd162';x.font='700 30px Figtree';x.fillText('lahojaboricua.com',W/2,H-62);x.fillStyle='#b3c0b5';x.font='600 20px Figtree';x.fillText(tt('h.prototipoInformacionPublicaSujeta'),W/2,H-28);
 return new Promise(r=>cv.toBlob(b=>r(b),'image/png'))}
async function shareCard(id){const c=A.cigarById(id);if(!c)return;
 const el=sheet(`<h2 class="sheet-h">${tt('h.compartirFicha')}</h2><div class="share-prev" id="shPrev"><p class="hint">${tt('h.preparandoLaImagen')}</p></div><div class="links" id="shBtns" hidden><button class="btn" type="button" id="shGo">${tt('h.compartir')}</button><button class="btn secondary" type="button" id="shDl">${tt('h.descargarPng')}</button></div>`,tt('h.compartirFicha'));
 const blob=await cardBlob(c);if(!blob){$('#shPrev',el).innerHTML='<p class="hint">'+tt('h.noPudeCrearLa')+'</p>';return}
 const name=`la-hoja-boricua-${c.id}.png`;const file=new File([blob],name,{type:'image/png'});const u=URL.createObjectURL(blob);
 $('#shPrev',el).innerHTML=`<img src="${u}" alt="${tt('h.fichaDeConEl',{a:esc(c.nombre)})}">`;$('#shBtns',el).hidden=false;
 const canFile=!!(navigator.canShare&&navigator.canShare({files:[file]}));if(!canFile)$('#shGo',el).textContent=navigator.share?tt('h.compartirEnlace'):tt('h.copiarEnlace');
 const link=APP_URL+'#/c/'+encodeURIComponent(c.id);
 $('#shGo',el).onclick=async()=>{try{if(canFile)await navigator.share({files:[file],title:c.nombre,text:`${tt('h.laHojaBoricua',{a:c.nombre,b:link})}`});else if(navigator.share)await navigator.share({title:c.nombre,text:`${tt('h.laHojaBoricua2',{a:c.nombre})}`,url:link});else{await navigator.clipboard.writeText(link);toast(tt('h.enlaceCopiado'))}}catch(e){if(e&&e.name!=='AbortError'){download(blob,name)}}};
 $('#shDl',el).onclick=()=>{download(blob,name);toast(tt('h.imagenDescargada'))}}
/* ---------- piezas para las vistas existentes ---------- */
function pideloLink(a){const d=a.donde_comprar||'';const host=u=>{try{return new URL(u).hostname.replace(/^www\./,'')}catch(e){return ''}};
 if(a.instagram&&/\bIG\b|instagram|\bDM\b/i.test(d))return{u:a.instagram,l:tt('h.porInstagram')};
 if(a.facebook&&/\bFB\b|facebook/i.test(d))return{u:a.facebook,l:tt('h.porFacebook')};
 const shop=firstURL(d);const own=host(a.web).split('.')[0];if(shop&&own&&host(shop).includes(own))return{u:shop,l:tt('h.enSuTiendaEn')};
 if(a.instagram)return{u:a.instagram,l:tt('h.porInstagram')};if(a.facebook)return{u:a.facebook,l:tt('h.porFacebook')};if(a.web)return{u:a.web,l:tt('h.enSuSitioWeb')};return null}
function artisanExtras(a){const p=pideloLink(a);
 return `${p?`<a class="pidelo" href="${esc(p.u)}" target="_blank" rel="noopener"><span class="pidelo-t">${tt('h.pideloDirecto')}</span><span class="pidelo-s">${tt('h.escribele',{a:p.l})}</span></a>`:''}
 <div class="act-row">${favBtn('artesanos',a.id)}${stampBtn('artesanos',a.id)}</div>${podBlock('a',a.id)}`}
function cigarExtras(c){const pr=pairing(c);const real=!c.yours;
 return `<div class="act-grid"><a class="act" href="#/cata/${encodeURIComponent(c.id)}">${VBArt.leaf('#8fd162')}<span>${tt('h.catar')}</span></a><button type="button" class="act" data-sheet="humidor" data-arg="${esc(c.id)}">${VBArt.leaf('#ffd27a')}<span>${tt('h.alHumidor')}</span></button><button type="button" class="act" data-sheet="share" data-arg="${esc(c.id)}">${VBArt.leaf('#8fb8ff')}<span>${tt('h.compartir')}</span></button>${real?stampBtn('cigarros',c.id,'act'):''}</div>
 <section class="pairbox"><div class="eyebrow">${tt('h.maridajeSugerido')}</div><div class="pair-res"><div class="pr"><small>${tt('h.ron')}</small><b>${pr.ron.n}</b></div><div class="pr"><small>${tt('h.cafe2')}</small><b>${pr.cafe.n}</b></div></div><p class="hint">${tt('h.porSuFortaleza',{a:pr.tags.length?tt('h.ySusNotasDe')+pr.tags.slice(0,3).map(t=>WN(t).toLowerCase()).join(', '):''})} <a href="#/maridajes">${tt('h.verLaGuia')}</a></p></section>
 ${podBlock('c',c.id)}`}
const placeActions=p=>`<div class="pl-act">${favBtn('lugares',p.id,'sm')}${stampBtn('lugares',p.id,'sm')}</div>`;
function setRating(id,n){save(s=>{if(!n||s.ratings[id]===n)delete s.ratings[id];else s.ratings[id]=n})}
return {profileOwn,requireAccount,gate,accountGen:CUENTA.gen,registerAction:CUENTA.register,ruta,vRuta,townSheet,rlit:()=>{const r=RLIT;RLIT=0;return r},S,isFav,toggleFav,setRating,favBtn,stampBtn,scrub,firstURL,municipio,region,openSheet,closeSheet,artisanExtras,cigarExtras,placeActions,subnav,accountPanel,bindAccount,
 routes:{mihoja:vMiHoja,persona:vPersona,cata:cid=>requireAccount(()=>vCata(cid),{fast:true}),maridajes:vMaridajes,podcast:vPodcast,buscar:vBuscar,eventos:vEventos,actividades:vEventos},
 _test:{HANDLE_RE,CLERK,icsFor,parseHora,pairing,pideloLink,cardBlob,badgeIds,passCounts,load,KEY}};
};
