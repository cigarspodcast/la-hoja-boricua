(()=>{'use strict';
/* LHB-100: esta versión empezó; desde aquí el guardián de index.html solo cuenta el aviso de route(), no una vista a medio pintar */
if(window.LHB_BOOT&&window.LHB_BOOT.hello)window.LHB_BOOT.hello();
const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
/* LHB-85: the 320 x 160 twin of a 600 x 300 thumbnail (tools/build_thumbs.py) */
const thumbS=t=>String(t).replace(/_thumb\.webp$/,'_thumb-s.webp');
// ancho dibujado de la imagen de la tarjeta, medido (evidence/lhb-85-slot-widths.txt); la fila mini (Mi Hoja) es de 140 px fijos
const SIZES_PHONE='(min-width:760px) 211px, (min-width:620px) calc(33vw - 40px), calc(50vw - 45px)';
// LHB-112: desde 900 px la grilla del catálogo se abre (tres columnas, cuatro desde 1100, en 1200 px); la de la página de un artesano queda en la medida de
// lectura de 820 px, a tres columnas (SIZES_DETAIL). Medidos en Chrome (evidence/lhb-112-widths.txt)
const SIZES_GRID='(min-width:1200px) 260px, (min-width:1100px) calc(25vw - 41px), (min-width:900px) calc(33.33vw - 42px), '+SIZES_PHONE,SIZES_DETAIL='(min-width:900px) 231px, '+SIZES_PHONE,SIZES_MINI='116px';
const view=$('#view');const REDUCED_ALL=matchMedia('(prefers-reduced-motion: reduce)').matches;const VBArt=window.VBArt;const tt=window.LHB_I18N.t;
const LS={get(k,d){try{const v=localStorage.getItem('vb_'+k);return v==null?d:JSON.parse(v)}catch(e){return d}},set(k,v){localStorage.setItem('vb_'+k,JSON.stringify(v))}};
/* ---------- IndexedDB for photos ---------- */
const idb=(()=>{let p;const open=()=>p||(p=new Promise((res,rej)=>{const r=indexedDB.open('vitola-boricua',1);r.onupgradeneeded=()=>r.result.createObjectStore('fotos');r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)}));
 const tx=(mode,fn)=>open().then(db=>new Promise((res,rej)=>{const t=db.transaction('fotos',mode);const st=t.objectStore('fotos');const q=fn(st);t.oncomplete=()=>res(q&&q.result);t.onerror=()=>rej(t.error)}));
 return{put:(k,v)=>tx('readwrite',s=>s.put(v,k)),get:k=>tx('readonly',s=>s.get(k)),del:k=>tx('readwrite',s=>s.delete(k))}})();
const urlCache={};
async function photoURL(key){if(urlCache[key])return urlCache[key];const b=await idb.get(key).catch(()=>null);if(!b)return null;return urlCache[key]=URL.createObjectURL(b)}
/* ---------- data ---------- */
let D={artesanos:[],cigarros:[],places:[],events:{actividades:[],fuentes:[]}};
function setData(src){if(!src)return;D={artesanos:src.artesanos||D.artesanos,cigarros:src.cigarros||D.cigarros,places:src.places||D.places,events:src.events||D.events}}
setData(window.VB_DATA);
async function refreshData(){try{const r=await fetch('data/bundle.js',{cache:'no-cache'});if(!r.ok)return;const t=await r.text(),j=JSON.parse(t.slice(t.indexOf('{'),t.lastIndexOf('}')+1));let changed=false;for(const k of ['artesanos','cigarros','places','events'])if(j[k]&&JSON.stringify(j[k])!==JSON.stringify(D[k])){D[k]=j[k];changed=true}if(changed)route()}catch(e){}}
/* LHB-102: lo guardado que no es una lista de objetos (un {} o un texto de una versión rota) se lee como lista vacía, sin tocar lo guardado */
const uploads=()=>{const v=LS.get('uploads',[]);return Array.isArray(v)?v.filter(u=>u&&typeof u==='object'&&!Array.isArray(u)):[]};
const allCigars=()=>[...D.cigarros,...uploads().map(u=>({...u,yours:true}))].sort((a,b)=>(a.nombre||'').localeCompare(b.nombre||'','es',{sensitivity:'base'}));
const artisanById=id=>D.artesanos.find(a=>a.id===id);
const cigarById=id=>allCigars().find(c=>c.id===id);
/* LHB-30: los textos de los datos en el idioma de la app: en inglés el campo _en si trae texto, si no el español.
   fq es para buscar: en inglés busca en los dos idiomas; en español, igual que antes */
const fx=(r,k)=>{const v=r?r[k]:undefined;if(window.LHB_I18N.lang!=='en')return v;const e=r&&r[k+'_en'];return typeof e==='string'&&e.trim()?e:v};
const fq=(r,k)=>window.LHB_I18N.lang==='en'?[r[k],r[k+'_en']].filter(Boolean).join(' '):r[k];
const artisanName=c=>{const a=artisanById(c.artesano_id);return a?a.nombre:(c.artesano_texto||tt('art.noProfile'))};
/* ---------- art ---------- */
function hash(s){let h=0;for(const ch of String(s))h=(h*31+ch.charCodeAt(0))|0;return Math.abs(h)}
function starPath(cx,cy,R){const r=R*.382;let p='';for(let i=0;i<10;i++){const a=-Math.PI/2+i*Math.PI/5,rr=i%2?r:R;p+=(i?'L':'M')+(cx+rr*Math.cos(a)).toFixed(1)+','+(cy+rr*Math.sin(a)).toFixed(1)}return p+'Z'}
/* LHB-111: el cigarro sin foto lleva la silueta de línea neutra, en el mismo marco que las fotos */
const cigarSVG=c=>VBArt.silueta(tt('sil.alt',{n:esc(c.nombre)}));
const FACADE=['#1EA8D7','#ed0000','#f8f8f4','#ed0000','#f8f8f4','#1EA8D7'];
function initials(n){const ov=(D.artesanos||[]).find(x=>x.nombre===n&&x.iniciales);if(ov)return ov.iniciales;const f=String(n).trim().split(/\s+/)[0].replace(/[^A-Z]/g,'');if(f.length>=2&&f.length<=4&&f===String(n).trim().split(/\s+/)[0].replace(/[.,]/g,''))return f;return String(n).replace(/[^\p{L}\p{N} ]/gu,' ').split(/\s+/).filter(w=>w&&!/^(de|del|la|las|los|el|y|cigar|cigars|cigarros|tabacalera|corp)$/i.test(w)).slice(0,2).map(w=>w[0].toUpperCase()).join('')||'VB'}
const LOGOS=new Set(["jfc-hoja-boricua", "don-rey-cigar", "el-club-del-turro", "don-collins", "finca-neo-jibairo", "willys-cigars", "san-pedrito-cigars", "yambo-cigars", "el-chapu-pr", "el-buho-ricamontes", "cohoba-cigars", "cigarros-caimito", "tabacalera-la-trascendencia", "pitirre-cigars", "villareno-cigars"]);
function logoId(n){const a=(D.artesanos||[]).find(x=>x.nombre===n);return a&&LOGOS.has(a.id)?a.id:null}
function mono(name,size){const lid=logoId(name);if(lid)return `<span class="mono has-logo" style="width:${size}px;height:${size}px"><img src="img/logos/${lid}.webp" width="${size}" height="${size}" alt="" ${size>80?'':'loading="lazy" '}decoding="async"></span>`;const bg=FACADE[hash(name)%FACADE.length],red=/^#ed0000$/i.test(bg);return `<span class="mono" style="width:${size}px;height:${size}px;background:${bg};color:${red?'var(--on-danger)':'var(--fixed-text)'};font-size:${Math.round(size*.38)}px"><svg viewBox="0 0 100 100" aria-hidden="true"><path d="M50 8 C 72 22 78 46 70 66 C 64 80 56 88 50 90 C 44 88 36 80 30 66 C 22 46 28 22 50 8Z" fill="${red?'#000':'#fff'}" opacity="${red?'.12':'.22'}"/></svg><b>${esc(initials(name))}</b></span>`}
const FACADES_BAR=`<div class="facades" aria-hidden="true">${FACADE.map(c=>`<i style="background:${c}"></i>`).join('')}</div>`;
const ICON={yt:'<svg viewBox="0 0 24 24"><path d="M21.6 7.2a2.5 2.5 0 0 0-1.8-1.8C18.2 5 12 5 12 5s-6.2 0-7.8.4A2.5 2.5 0 0 0 2.4 7.2 26 26 0 0 0 2 12a26 26 0 0 0 .4 4.8 2.5 2.5 0 0 0 1.8 1.8C5.8 19 12 19 12 19s6.2 0 7.8-.4a2.5 2.5 0 0 0 1.8-1.8A26 26 0 0 0 22 12a26 26 0 0 0-.4-4.8zM10 15V9l5.2 3z"/></svg>',ig:'<svg viewBox="0 0 24 24"><path fill-rule="evenodd" d="M12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10zm0 8.2a3.2 3.2 0 1 1 0-6.4 3.2 3.2 0 0 1 0 6.4zM17.3 5.5a1.2 1.2 0 1 0 0 2.4 1.2 1.2 0 0 0 0-2.4zM12 2c-2.7 0-3 0-4.1.1C4.3 2.3 2.3 4.3 2.1 7.9 2 9 2 9.3 2 12s0 3 .1 4.1c.2 3.6 2.2 5.6 5.8 5.8 1.1.1 1.4.1 4.1.1s3 0 4.1-.1c3.6-.2 5.6-2.2 5.8-5.8.1-1.1.1-1.4.1-4.1s0-3-.1-4.1c-.2-3.6-2.2-5.6-5.8-5.8C15 2 14.7 2 12 2z"/></svg>',
 wa:'<svg viewBox="0 0 24 24"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm5.3 14.2c-.2.6-1.3 1.2-1.8 1.2-.5.1-1 .1-3.3-.8-2.8-1.1-4.5-3.9-4.7-4.1-.1-.2-1.1-1.5-1.1-2.8s.7-2 1-2.3c.2-.3.5-.3.7-.3h.5c.2 0 .4 0 .6.5l.9 2.1c.1.2.1.4 0 .5l-.3.5-.4.4c-.1.1-.3.3-.1.6.2.3.7 1.2 1.6 2 1.1 1 2 1.3 2.3 1.4.3.2.5.1.6-.1l.9-1.1c.2-.3.4-.2.6-.1l2 1c.3.1.5.2.5.3.1.2.1.7-.1 1.1z"/></svg>',
 web:'<svg viewBox="0 0 24 24"><path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm6.9 6h-3a15.6 15.6 0 0 0-1.4-3.6A8 8 0 0 1 18.9 8zM12 4c.8 1.2 1.5 2.5 1.9 4h-3.8c.4-1.5 1.1-2.8 1.9-4zM4.3 14a8 8 0 0 1 0-4h3.4a16 16 0 0 0 0 4zm.8 2h3a15.6 15.6 0 0 0 1.4 3.6A8 8 0 0 1 5.1 16zm3-8h-3a8 8 0 0 1 4.4-3.6C8.9 5.5 8.4 6.7 8.1 8zM12 20c-.8-1.2-1.5-2.5-1.9-4h3.8c-.4 1.5-1.1 2.8-1.9 4zm2.3-6H9.7a14 14 0 0 1 0-4h4.6a14 14 0 0 1 0 4zm.3 5.6c.6-1.1 1.1-2.3 1.4-3.6h3a8 8 0 0 1-4.4 3.6zm1.7-5.6a16 16 0 0 0 0-4h3.4a8 8 0 0 1 0 4z"/></svg>',
 buy:'<svg viewBox="0 0 24 24"><path d="M7 18a2 2 0 1 0 0 4 2 2 0 0 0 0-4zm10 0a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM5.2 4l.9 2H21l-3.6 7.2a2 2 0 0 1-1.8 1.1H8.1l-.9 1.7H19v2H4l2.2-4.2L3 4H1V2h3.3z"/></svg>',
 map:'<svg viewBox="0 0 24 24"><path d="M12 2a7 7 0 0 0-7 7c0 5.2 7 13 7 13s7-7.8 7-13a7 7 0 0 0-7-7zm0 9.5a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5z"/></svg>',
 fb:'<svg viewBox="0 0 24 24"><path d="M14 8h3V4h-3c-2.8 0-4 1.8-4 4.5V11H7v4h3v7h4v-7h3l1-4h-4V8.6c0-.4.3-.6.6-.6z"/></svg>'};
const igHandle=u=>{const m=String(u||'').match(/instagram\.com\/([^/?#]+)/i);return m?'@'+m[1]:''};
function linkBtn(kind,href,label){if(!href)return'';return `<a class="lbtn ${kind}" href="${esc(href)}" target="_blank" rel="noopener">${ICON[kind]||ICON.web}${esc(label)}</a>`}
function mapsLinks(p){const q=encodeURIComponent(`${p.nombre}, ${p.direccion||p.pueblo||''}, Puerto Rico`);const ll=(p.lat&&p.lng)?`&ll=${p.lat},${p.lng}`:'';
 const apple=`https://maps.apple.com/?q=${encodeURIComponent(p.nombre)}${ll}${p.direccion?'&address='+encodeURIComponent(p.direccion+', '+(p.pueblo||'')+', Puerto Rico'):''}`;
 const google=p.maps||`https://www.google.com/maps/search/?api=1&query=${q}`;return{apple,google}}
const isIOS=/iphone|ipad|ipod/i.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
function goLink(p){const m=mapsLinks(p);return isIOS?m.apple:m.google}
const toast=(m)=>{const t=$('#toast');t.textContent=m;t.classList.add('show');clearTimeout(t._h);t._h=setTimeout(()=>t.classList.remove('show'),2200)};
const FORT=['suave','media','fuerte'];
const fortLabel=f=>f?tt('fort.'+f,null,f[0].toUpperCase()+f.slice(1)):'\u2014';
/* LHB-117 (LHB-16, el dueño 2026-10-30): la nota que decía que era un prototipo se quitó; PROTO_NOTE queda vacía donde se pintaba */
const PROTO_NOTE='';
const head=(eyebrow,title,lead,art)=>`<header class="sec-head"><div><div class="eyebrow">${eyebrow}</div><h1>${title}</h1>${lead?`<p class="lead">${lead}</p>`:''}</div><div class="sec-art">${art}</div></header>`;
const emptyBox=msg=>`<div class="empty"><div>${msg}</div></div>`;
/* ---------- cards ---------- */
const fotoOf=c=>(!c||c.yours||!window.LHB_FOTOS)?null:(window.LHB_FOTOS[c.id]||null);
async function hydratePhotos(root=view){for(const el of $$('[data-photo]',root)){const u=await photoURL(el.dataset.photo);if(u){el.innerHTML=`<img src="${u}" alt="">`}}}
function cigarCard(c){const favs=EXT.S().favs.cigarros;return `<a class="card" href="#/c/${encodeURIComponent(c.id)}">${(f=>f?`<div class="ph has-foto"><img src="${esc(thumbS(f.thumb))}" srcset="${esc(thumbS(f.thumb))} 320w, ${esc(f.thumb)} 600w" sizes="${c.mini?SIZES_MINI:c.detail?SIZES_DETAIL:SIZES_GRID}" alt="${tt('card.photoAlt',{n:esc(c.nombre)})}" width="600" height="300" decoding="async"></div>`:`<div class="ph sin-foto" ${c.foto?`data-photo="${esc(c.foto)}"`:''}>${cigarSVG(c)}</div>`)(fotoOf(c))}
 ${favs.includes(c.id)?'<span class="fav-dot" aria-label="'+tt('card.fav')+'">♥</span>':''}
 <div class="body"><div class="name">${esc(c.nombre)}</div><div class="meta">${esc(artisanName(c))}${c.pueblo?' · '+esc(c.pueblo):''}</div>
 <div class="pills">${c.capa?`<span class="pill">${esc(fx(c,'capa'))}</span>`:''}${c.fortaleza?`<span class="pill f-${c.fortaleza}">${fortLabel(c.fortaleza)}</span>`:''}${c.yours?'<span class="pill yours">'+tt('card.yours')+'</span>':''}</div></div></a>`}
/* ---------- views ---------- */
/* LHB-64: una región de estado fuera de la vista (no se repinta con ella, ni la tapa una hoja abierta): el lector de pantalla anuncia cuántas vitolas quedan al filtrar */
const RS=(()=>{let e=$('#resultStatus');if(!e){e=document.createElement('div');e.id='resultStatus';e.className='sr';e.setAttribute('role','status');e.setAttribute('aria-live','polite');e.setAttribute('aria-atomic','true');document.body.appendChild(e)}return e})();
const resultStatus=t=>{if(RS.textContent!==t)RS.textContent=t};
const state={q:'',capa:'',fort:'',art:'',lugMode:'mapa',lugCat:'',lugTown:''};
/* LHB-71: los íconos del menú y de la portada, uno por destino (trazo, toman el color del texto) */
const BRAND_ICONS={moon:'<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/>',book:'<path d="M4 5c3-1 6-1 8 1 2-2 5-2 8-1v14c-3-1-6-1-8 1-2-2-5-2-8-1zM12 6v14"/>',lang:'<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18"/>',lock:'<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',cigar:'<path d="m4 16 12-9 4 5-12 9zM13 9l4 5M5 4c0 2 3 2 3 4M11 2c0 2 3 2 3 4"/>',
 maker:'<path d="M5 21v-7l3-4 3 1 3-3 4 2 1 4v7M7 16l4 2 5-4M11 18v3"/><circle cx="9" cy="4" r="3"/>',
 place:'<path d="M19 10c0 6-7 11-7 11S5 16 5 10a7 7 0 0 1 14 0Z"/><circle cx="12" cy="10" r="2.5"/>',
 leaf:'<path d="M5 19C0 8 9 3 21 3c1 11-4 18-14 17M3 22 17 7M8 17l-2-5M12 12l5 1"/>',
 pen:'<path d="m4 20 1-5L16 4l4 4L9 19ZM14 6l4 4"/>',
 people:'<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 4.5a3.5 3.5 0 0 1 0 7M18 14a6 6 0 0 1 3.5 6"/>',
 taste:'<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="2.5"/><path d="M12 3v6M12 15v6M3 12h6M15 12h6"/>',
 coffee:'<path d="M4 9h12v6a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5ZM16 10h2a3 3 0 0 1 0 6h-2M3 22h15M7 2v3M12 2v3"/>',
 upload:'<rect x="3" y="7" width="18" height="14" rx="2"/><path d="M8 7l2-3h4l2 3"/><circle cx="12" cy="14" r="4"/>',
 event:'<rect x="4" y="5" width="16" height="16" rx="2"/><path d="M8 2v6M16 2v6M4 10h16M8 14h2M14 14h2M8 17h2"/>',
 podcast:'<rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 10v2a7 7 0 0 0 14 0v-2M12 19v3M8 22h8"/>',
 search:'<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>',
 install:'<path d="M12 3v12m-4-4 4 4 4-4M5 16v5h14v-5"/>',
 arrow:'<path d="M5 12h14m-5-5 5 5-5 5"/>',
 info:'<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.5"/>',
 play:'<path d="M8 5v14l11-7Z"/>'};
const brandIcon=(n,cls='')=>`<svg class="brand-icon ${cls}" viewBox="0 0 24 24" aria-hidden="true" focusable="false">${BRAND_ICONS[n]||BRAND_ICONS.leaf}</svg>`;
/* LHB-109: la portada sin atajos: las pestañas son la navegación; el menú cambia el idioma */
document.addEventListener('click',e=>{const b=e.target&&e.target.closest&&e.target.closest('[data-lang]');if(!b)return;const I=window.LHB_I18N;if(I&&I.set)I.set(b.dataset.lang)});
/* LHB-110: el tema. Sin elegir, sigue al teléfono; el menú lo fija (oscuro, claro) o lo devuelve al teléfono. Se guarda en este teléfono (lhb_theme), no en la cuenta */
const THEMES=['auto','dark','light'],THEME_BAR={light:'#F4F1EA',dark:'#141A13'},THEME_KEY={auto:'menu.tema.auto',dark:'menu.tema.dark',light:'menu.tema.light'};
/* Codex r3: lo elegido en esta visita también queda en memoria (themeMem): si el teléfono no lo puede guardar, el ciclo sigue y el menú dice el de ahora */
let themeMem=null;
function themeNow(){if(themeMem)return themeMem;try{const t=localStorage.getItem('lhb_theme');return t==='dark'||t==='light'?t:'auto'}catch(e){return 'auto'}}
function applyTheme(t){const r=document.documentElement;if(!r||!document.head)return;if(t==='dark'||t==='light')r.setAttribute('data-theme',t);else r.removeAttribute('data-theme');
 let m=document.getElementById('themeBar');if(t==='dark'||t==='light'){if(!m){m=document.createElement('meta');m.name='theme-color';m.id='themeBar';document.head.prepend(m)}m.content=THEME_BAR[t]}else if(m)m.remove()}
applyTheme(themeNow());
document.addEventListener('click',e=>{const b=e.target&&e.target.closest&&e.target.closest('[data-theme-next]');if(!b)return;const t=THEMES[(THEMES.indexOf(themeNow())+1)%THEMES.length];themeMem=t;
 try{if(t==='auto')localStorage.removeItem('lhb_theme');else localStorage.setItem('lhb_theme',t)}catch(x){}applyTheme(t);const sm=b.querySelector('small');if(sm)sm.textContent=tt(THEME_KEY[t])});
/* LHB-71: la portada se decide una vez por carga: escribir en el buscador o tocar un filtro repinta, y no puede cambiar la portada a mitad de la visita */
let homeCompact=null;
function vCatalogo(){const cs=allCigars();const capas=[...new Set(cs.map(c=>c.capa).filter(Boolean))].sort();const capaLbl=new Map();for(const c of cs)if(c.capa&&(!capaLbl.has(c.capa)||capaLbl.get(c.capa)===c.capa))capaLbl.set(c.capa,fx(c,'capa'));
 const q=state.q.toLowerCase();const list=cs.filter(c=>(!q||[c.nombre,artisanName(c),c.pueblo,fq(c,'capa'),fq(c,'notas')].join(' ').toLowerCase().includes(q))&&(!state.capa||c.capa===state.capa)&&(!state.fort||c.fortaleza===state.fort)&&(!state.art||c.artesano_id===state.art));
 /* LHB-71: quien ya vino ve la portada compacta: la presentación sin foto ni párrafo y sin los cuadros, para llegar a la lista */
 if(homeCompact===null){homeCompact=!!LS.get('homeSeen',false);try{LS.set('homeSeen',true)}catch(e){}}const compact=homeCompact;
 view.innerHTML=`<section class="hero${compact?' compact':''}">${FACADES_BAR}<img class="hero-bg" src="img/hero/banner.webp" alt="" width="760" height="422" decoding="async"><div class="eyebrow">${tt('menu.cigarros')}</div><h1>${tt('cat.title')}</h1><p>${tt('cat.lead')}</p><a class="hero-cta" href="#/lugares/ruta">${tt('cat.toRoute')}${brandIcon('arrow')}</a></section><button type="button" class="btn-add" id="btnAdd"${installHidden(window)?' hidden':''}>${tt('cat.install')}</button>
 <h2 class="cat-h" id="catalogStart">${tt('menu.cigarros')}</h2>
 <label class="search"><svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/></svg><span class="sr">${tt('cat.search')}</span><input id="q" type="search" placeholder="${tt('cat.searchPh')}" value="${esc(state.q)}" autocomplete="off"></label>
 <div class="chips" role="group" aria-label="${tt('f.fortaleza')}"><button class="chip" data-fort="" aria-pressed="${!state.fort}">${tt('cat.allFort')}</button>${FORT.map(f=>`<button class="chip" data-fort="${f}" aria-pressed="${state.fort===f}">${fortLabel(f)}</button>`).join('')}</div>
 <div class="filter-row"><select id="fCapa" aria-label="${tt('f.capa')}"><option value="">${tt('cat.allCapa')}</option>${capas.map(x=>`<option value="${esc(x)}" ${state.capa===x?'selected':''}>${esc(capaLbl.get(x))}</option>`).join('')}</select>
 <select id="fArt" aria-label="${tt('f.artesano')}"><option value="">${tt('cat.allArt')}</option>${D.artesanos.map(a=>`<option value="${esc(a.id)}" ${state.art===a.id?'selected':''}>${esc(a.nombre)}</option>`).join('')}</select></div>
 ${list.length?`<div class="grid">${list.map(cigarCard).join('')}</div>`:emptyBox(tt('cat.empty'))}
 ${PROTO_NOTE}`;
 const qi=$('#q');qi.addEventListener('input',e=>{state.q=e.target.value;const pos=e.target.selectionStart;vCatalogo();const n=$('#q');n.focus();n.setSelectionRange(pos,pos)});
 /* LHB-64: pintar el catálogo otra vez reemplaza los filtros; el foco vuelve al mismo filtro y el número de resultados se anuncia */
 $$('[data-fort]').forEach(b=>b.onclick=()=>{const v=b.dataset.fort;state.fort=v;vCatalogo();const n=$$('[data-fort]').find(x=>x.dataset.fort===v);if(n)n.focus({preventScroll:true})});
 $('#fCapa').onchange=e=>{state.capa=e.target.value;vCatalogo();$('#fCapa').focus({preventScroll:true})};$('#fArt').onchange=e=>{state.art=e.target.value;vCatalogo();$('#fArt').focus({preventScroll:true})};
 resultStatus(list.length?tt('cat.count',{a:list.length}):tt('cat.noMatch'));hydratePhotos()}
function vCigar(id){const c=cigarById(id);if(!c){view.innerHTML=`<div class="empty">${tt('cig.notFound')}</div>`;return}
 const a=artisanById(c.artesano_id);const favs=EXT.S().favs.cigarros;const rat=EXT.S().ratings[c.id]||0;const isFav=favs.includes(c.id);
 view.innerHTML=`<button class="back" data-back>${tt('back')}</button>
 ${(f=>f?`<figure class="detail-foto"><div class="detail-ph has-foto"><img id="fotoMain" src="${esc(f.img)}" alt="${tt('card.photoAlt',{n:esc(c.nombre)})}" width="1000" height="500" loading="lazy" decoding="async"></div><figcaption class="foto-cred">${esc(f.credito)}${f.match==='linea'?' · <span class="foto-linea">'+tt('cig.lineFoto')+'</span>':''}</figcaption>${f.galeria?`<div class="foto-gal" role="group" aria-label="${tt('cig.moreFotos')}">${f.galeria.map((g,i)=>`<button type="button" class="foto-th" data-full="${esc(g.img)}" aria-pressed="${i===0}" aria-label="${tt('cig.seeFoto',{t:esc(g.t)})}"><img src="${esc(thumbS(g.thumb))}" alt="" width="600" height="300" loading="lazy"><span>${esc(g.t)}</span></button>`).join('')}</div>`:''}</figure>`:`<div class="detail-ph sin-foto" ${c.foto?`data-photo="${esc(c.foto)}"`:''}>${cigarSVG(c)}</div>`)(fotoOf(c))}
 <div class="detail-head"><div><div class="eyebrow">${c.yours?tt('cig.byYou'):tt('cig.madePR')}</div><h1>${esc(c.nombre)}</h1></div>
 <button class="fav-btn" id="fav" aria-pressed="${isFav}">${isFav?tt('cig.saved'):tt('cig.save')}</button></div>
 <div class="specs"><div class="spec"><small>${tt('f.capa')}</small><span>${esc(fx(c,'capa')||tt('notPub'))}</span></div><div class="spec"><small>${tt('f.fortaleza')}</small><span>${c.fortaleza?fortLabel(c.fortaleza):tt('notPub')}</span></div>
 <div class="spec"><small>${tt('f.origen')}</small><span>${esc(c.pueblo||'Puerto Rico')}</span></div><div class="spec"><small>${tt('f.vitola')}</small><span>${esc((c.vitolas&&c.vitolas.length)?c.vitolas.join(' · '):tt('notPub'))}</span></div></div>
 <div><div class="eyebrow">${tt('cig.yourRating')}</div><div class="stars" role="radiogroup" aria-label="${tt('cig.rating')}">${[1,2,3,4,5].map(n=>`<button role="radio" aria-checked="${n===rat}" aria-label="${tt('cig.stars',{n})}" data-star="${n}" class="${n<=rat?'on':''}">★</button>`).join('')}</div></div>
 ${EXT.cigarExtras(c)}
 ${a?`<a class="artisan-link" href="#/a/${encodeURIComponent(a.id)}">${mono(a.nombre,44)}<div><div class="t" style="font-weight:600">${esc(a.nombre)}</div><div class="meta" style="font-size:12.5px;color:var(--muted)">${esc(a.pueblo||'')} · ${tt('cig.seeProfile')}</div></div><span class="go">›</span></a>`:(c.artesano_texto?`<p class="meta">${tt('cig.artisanLbl')} ${esc(c.artesano_texto)}</p>`:'')}
 ${c.notas?`<p class="notes">${esc(fx(c,'notas'))}</p>`:''}
 ${c.yours?`<button class="btn secondary" id="del" style="margin-top:12px">${tt('cig.delMine')}</button>`:''}
 ${(c.fuentes&&c.fuentes.length)?`<div class="sources">${tt('sources')} ${c.fuentes.map(u=>`<a href="${esc(u)}" target="_blank" rel="noopener">${esc(u.replace(/^https?:\/\/(www\.)?/,'').slice(0,48))}</a>`).join(' · ')}</div>`:''}
 ${c.yours?'':PROTO_NOTE}`;
 $('[data-back]').onclick=()=>history.length>1?history.back():(location.hash='#/catalogo');
 $$('.foto-th').forEach(b=>b.onclick=()=>{const m=$('#fotoMain');if(m)m.src=b.dataset.full;$$('.foto-th').forEach(x=>x.setAttribute('aria-pressed',String(x===b)))});
 $('#fav').onclick=()=>EXT.gate('fav','cigarros:'+c.id);
 $$('[data-star]').forEach(b=>b.onclick=()=>EXT.gate('rate',c.id+':'+b.dataset.star));
 const del=$('#del');if(del)del.onclick=async()=>{if(!confirm(tt('cig.confirmDel')))return;LS.set('uploads',uploads().filter(u=>u.id!==c.id));if(c.foto)await idb.del(c.foto).catch(()=>{});toast(tt('cig.deleted'));location.hash='#/perfil'};
 hydratePhotos()}
function artTags(a){const t=[];if(a.etiqueta)t.push(`<span class="atag rd">${esc(a.etiqueta)}</span>`);if(a.por_confirmar)t.push(`<span class="atag pend">${esc(a.por_confirmar)}</span>`);return t.length?`<div class="atags">${t.join('')}</div>`:''}
function vArtesanos(){view.innerHTML=`${head(tt('menu.artesanos'),tt('arts.title'),tt('arts.lead'),VBArt.chaveta())}
 <div class="list">${D.artesanos.map(a=>{const n=allCigars().filter(c=>c.artesano_id===a.id).length;return `<a class="row" href="#/a/${encodeURIComponent(a.id)}">${mono(a.nombre,50)}<div><div class="t">${esc(a.nombre)}</div><div class="s">${esc(a.pueblo||'')}${a.tipo?(a.pueblo?' · ':'')+esc(fx(a,'tipo')):''}${n?` · ${tt(n>1?'arts.nVitolas':'arts.nVitola',{n})}`:''}</div>${artTags(a)}</div><span class="go">›</span></a>`}).join('')||'<div class="empty">'+tt('soon')+'</div>'}</div>${PROTO_NOTE}`}
function vArtesano(id){const a=artisanById(id);if(!a){view.innerHTML='<div class="empty">'+tt('art.notFound')+'</div>';return}
 const cs=allCigars().filter(c=>c.artesano_id===a.id);const ig=a.instagram_label||igHandle(a.instagram);
 view.innerHTML=`<button class="back" data-back>${tt('art.back')}</button>
 <section class="profile-hero">${mono(a.nombre,104)}<h1>${esc(a.nombre)}</h1><div class="town">${esc(a.pueblo||(a.por_confirmar?'':'Puerto Rico'))}${a.tipo?(a.pueblo?' · ':'')+esc(fx(a,'tipo')):''}</div>${artTags(a)}</section>
 ${EXT.artisanExtras(a)}
 ${a.nota?`<p class="note art-note">${esc(fx(a,'nota'))}</p>`:''}
 ${a.historia?`<p class="story">${esc(fx(a,'historia'))}</p>`:''}
 <div class="links">${linkBtn('ig',a.instagram,ig||'Instagram')}${linkBtn('wa',a.whatsapp,'WhatsApp')}${linkBtn('web',a.web,tt('link.web'))}${linkBtn('fb',a.facebook,'Facebook')}${linkBtn('yt',a.youtube,'YouTube')}${EXT.firstURL(a.donde_comprar)?linkBtn('buy',EXT.firstURL(a.donde_comprar),tt('link.buy')):''}</div>
 ${a.donde_comprar?`<p class="notes"><b>${tt('link.buyLbl')}</b> ${esc(EXT.scrub(fx(a,'donde_comprar')))}</p>`:''}
 ${cs.length?`<div class="section-title"><h2>${tt('art.vitolas')}</h2></div><div class="grid">${cs.map(c=>cigarCard({...c,detail:true})).join('')}</div>`:''}
 ${(a.fuentes&&a.fuentes.length)?`<div class="sources">${tt('sources')} ${a.fuentes.map(u=>`<a href="${esc(u)}" target="_blank" rel="noopener">${esc(u.replace(/^https?:\/\/(www\.)?/,'').slice(0,48))}</a>`).join(' · ')}</div>`:''}${PROTO_NOTE}`;
 $('[data-back]').onclick=()=>history.length>1?history.back():(location.hash='#/artesanos');hydratePhotos()}
/* ---------- subir ---------- */
let pendingPhoto=null;
function resizeImage(file,max=1100,q=.8){return new Promise((res,rej)=>{const img=new Image();const u=URL.createObjectURL(file);img.onload=()=>{const s=Math.min(1,max/Math.max(img.naturalWidth,img.naturalHeight));const cv=document.createElement('canvas');cv.width=Math.round(img.naturalWidth*s);cv.height=Math.round(img.naturalHeight*s);cv.getContext('2d').drawImage(img,0,0,cv.width,cv.height);URL.revokeObjectURL(u);cv.toBlob(b=>b?res(b):rej(new Error('blob')),'image/jpeg',q)};img.onerror=()=>{URL.revokeObjectURL(u);rej(new Error('img'))};img.src=u})}
function vSubir(){pendingPhoto=null;let fort='';
 view.innerHTML=`${head(tt('up.eyebrow'),tt('up.title'),tt('up.lead'),VBArt.caja())}
 <form class="form" id="upForm" novalidate>
 <div><div class="photo-drop" id="drop"><div class="ph-empty">📷<br>${tt('up.noFoto')}</div></div>
 <div class="photo-btns"><label>${tt('up.camera')}<input type="file" accept="image/*" capture="environment" id="fCam"></label><label>${tt('up.gallery')}<input type="file" accept="image/*" id="fGal"></label></div></div>
 <div class="field"><label for="uName">${tt('up.name')}</label><input id="uName" required maxlength="60" placeholder="${tt('up.namePh')}"></div>
 <div class="field"><label for="uArt">${tt('f.artesano')}</label><select id="uArt"><option value="">${tt('up.select')}</option>${D.artesanos.map(a=>`<option value="${esc(a.id)}">${esc(a.nombre)}</option>`).join('')}<option value="__otro">${tt('up.other')}</option></select></div>
 <div class="field" id="otroWrap" hidden><label for="uArtTxt">${tt('up.artName')}</label><input id="uArtTxt" maxlength="60"></div>
 <div class="field"><label for="uCapa">${tt('f.capa')}</label><input id="uCapa" list="capas" maxlength="40" placeholder="${tt('up.capaPh')}"><datalist id="capas">${['Claro','Connecticut','Natural','Colorado','Habano','Corojo','Criollo','Maduro','Oscuro'].map(x=>`<option value="${x}">`).join('')}</datalist></div>
 <div class="field"><label>${tt('f.fortaleza')}</label><div class="seg" role="group" aria-label="${tt('f.fortaleza')}">${FORT.map(f=>`<button type="button" data-f="${f}" aria-pressed="false">${fortLabel(f)}</button>`).join('')}</div></div>
 <div class="field"><label for="uPueblo">${tt('f.pueblo')}</label><input id="uPueblo" maxlength="40" placeholder="${tt('up.puebloPh')}"></div>
 <div class="field"><label for="uVit">${tt('up.vit')}</label><input id="uVit" maxlength="40" placeholder="${tt('up.vitPh')}"></div>
 <div class="field"><label for="uNotes">${tt('up.notes')}</label><textarea id="uNotes" maxlength="600" placeholder="${tt('up.notesPh')}"></textarea></div>
 <button class="btn" type="submit" id="uSave">${tt('up.save')}</button></form>`;
 const onFile=async e=>{const f=e.target.files&&e.target.files[0];if(!f)return;const G=EXT.accountGen(),form=$('#upForm');try{const b=await resizeImage(f);if(EXT.accountGen()!==G||$('#upForm')!==form)return;pendingPhoto=b;$('#drop').innerHTML=`<img src="${URL.createObjectURL(b)}" alt="${tt('up.fotoAlt')}">`}catch(err){toast(tt('foto.err'))}};
 $('#fCam').onchange=onFile;$('#fGal').onchange=onFile;
 $('#uArt').onchange=e=>{$('#otroWrap').hidden=e.target.value!=='__otro'};
 $$('[data-f]').forEach(b=>b.onclick=()=>{fort=b.dataset.f;$$('[data-f]').forEach(x=>x.setAttribute('aria-pressed',x===b))});
 $('#upForm').onsubmit=async e=>{e.preventDefault();const name=$('#uName').value.trim();if(!name){toast(tt('up.needName'));$('#uName').focus();return}
  const id='u'+Date.now().toString(36);let foto=null;const G=EXT.accountGen(),form=$('#upForm');if(pendingPhoto){foto='foto_'+id;await idb.put(foto,pendingPhoto);if(EXT.accountGen()!==G||$('#upForm')!==form){idb.del(foto).catch(()=>{});return}}
  const artSel=$('#uArt').value;const item={id,nombre:name,artesano_id:artSel&&artSel!=='__otro'?artSel:'',artesano_texto:artSel==='__otro'?$('#uArtTxt').value.trim():'',capa:$('#uCapa').value.trim(),fortaleza:fort||null,pueblo:$('#uPueblo').value.trim(),vitolas:$('#uVit').value.trim()?[$('#uVit').value.trim()]:[],notas:$('#uNotes').value.trim(),foto,creado:new Date().toISOString()};
  LS.set('uploads',[item,...uploads()]);toast(tt('up.saved'));location.hash='#/c/'+id}}
/* ---------- lugares ---------- */
let leafletMap=null;const LEAFC={lounge:'var(--accent)',venta:'var(--warm)'};const REDUCED=matchMedia('(prefers-reduced-motion: reduce)').matches;
/* LHB-87: pines que se tapan se juntan en un grupo (axe target-size). Entra [{x,y,m}] en píxeles del mapa; sale [{x,y,ms}].
   Un pin solo ocupa 26 x 34 con la punta abajo; un grupo, un círculo de 36; dos cajas a menos de 2 px se juntan, hasta que ninguna toca a otra. */
const pinBox=(x,y,n)=>n>1?[x-18,y-18,x+18,y+18]:[x-13,y-32,x+13,y+2];
function groupPins(items){const gs=items.map(i=>({x:i.x,y:i.y,ms:[i.m]}));const hit=(a,b)=>a[0]<b[2]+2&&b[0]<a[2]+2&&a[1]<b[3]+2&&b[1]<a[3]+2;for(let again=true;again;){again=false;for(let i=0;i<gs.length&&!again;i++)for(let j=i+1;j<gs.length;j++){const a=gs[i],b=gs[j];if(hit(pinBox(a.x,a.y,a.ms.length),pinBox(b.x,b.y,b.ms.length))){const ms=a.ms.concat(b.ms),k=a.ms.length,l=b.ms.length;gs[i]={x:(a.x*k+b.x*l)/(k+l),y:(a.y*k+b.y*l)/(k+l),ms};gs.splice(j,1);again=true;break}}}return gs}
/* tocar un grupo: acercar solo si el encuadre de sus lugares llega a un zoom mayor (fz, de getBoundsZoom con el mismo relleno que fitBounds);
   si no (zoom 17, todos en un sitio, o el mapa es tan bajo que el relleno no deja acercar), mostrar la lista de sus lugares (Codex r1) */
const tapGroup=(z,fz,one)=>one||z>=17||Math.min(fz,17)<=z?'list':'zoom';
/* la lista cabe en el mapa (Codex r2): .map-wrap corta lo que sobra, así que el alto con scroll es el del mapa menos lo fijo del popup:
   márgenes del contenido 24, borde 2, punta 19, margen de abajo 20, offset 7 y autoPanPadding 16+16 = 104 px; entre 60 y 320 */
const POP_FIXED=104,popMaxH=h=>Math.max(60,Math.min(320,h-POP_FIXED));
/* si el mapa cambia de alto con la lista abierta (girar el teléfono), la lista toma el alto nuevo y se vuelve a acomodar (Codex r3) */
const fitPop=(map,p)=>{if(p&&map.hasLayer(p)){p.options.maxHeight=popMaxH(map.getSize().y);p.update()}};
function leafBurst(host,x,y,color){if(REDUCED||!host)return;const box=document.createElement('div');box.className='leaf-burst';box.style.left=x+'px';box.style.top=y+'px';
 const cols=[color||'#d9a75a','#d9a75a','#b9864a','#7fae55'];for(let i=0;i<9;i++){const s=document.createElement('span');const ang=(-160+i*(140/8))*Math.PI/180;const dist=38+Math.random()*34;
  s.style.setProperty('--dx',(Math.cos(ang)*dist).toFixed(0)+'px');s.style.setProperty('--dy',(Math.sin(ang)*dist).toFixed(0)+'px');s.style.setProperty('--fall',(46+Math.random()*40).toFixed(0)+'px');s.style.setProperty('--rot',((Math.random()*2-1)*540).toFixed(0)+'deg');s.style.animationDelay=(i*25)+'ms';
  s.innerHTML=VBArt.leaf(cols[i%cols.length]);box.appendChild(s)}host.appendChild(box);setTimeout(()=>box.remove(),1500)}
const PROJ={lon0:-67.3,lon1:-65.2,lat0:17.88,lat1:18.54,W:1000,k:Math.cos(18.2*Math.PI/180)};
const ISLAND='M13.6,88.8 30.8,120.2 50.3,125.8 52.6,136.9 59.5,146.9 60.2,157.0 70.5,166.3 68.9,166.4 68.5,173.5 54.7,187.9 58.7,194.6 54.0,203.2 56.3,215.0 55.6,218.6 47.9,224.9 49.9,226.3 47.9,230.3 48.9,234.9 50.5,230.5 55.1,236.5 52.2,238.4 49.2,237.3 46.8,242.4 48.1,246.9 43.0,252.7 62.3,257.7 58.3,267.0 63.7,262.0 63.4,267.3 55.5,268.0 57.6,266.1 44.8,271.2 41.2,274.4 40.3,279.1 41.9,293.5 44.3,292.6 43.4,290.8 42.1,292.8 41.7,282.3 44.6,284.3 42.6,285.8 46.8,293.4 41.9,293.5 41.6,294.8 48.8,294.6 51.0,299.4 49.7,303.9 53.0,302.8 55.2,305.2 51.2,294.9 57.7,287.9 65.8,289.6 67.1,293.8 82.2,295.1 83.0,297.6 87.3,297.2 85.4,295.8 88.7,294.6 88.2,297.3 92.9,297.9 98.6,295.0 98.6,292.2 98.3,293.1 96.9,292.2 101.9,289.7 102.1,289.1 101.3,289.2 100.9,288.4 100.9,288.1 101.1,288.0 103.4,287.1 103.1,290.4 106.0,291.5 105.4,287.7 108.4,284.7 107.4,284.9 107.0,284.3 129.7,284.3 133.4,287.0 135.3,282.7 138.2,284.1 136.2,287.1 141.4,290.4 140.1,284.5 148.8,285.5 152.2,294.7 156.6,295.5 164.0,301.6 163.2,305.2 167.8,303.7 178.9,307.2 181.4,304.7 175.1,301.9 175.6,299.2 182.2,298.1 186.1,294.6 182.2,290.8 175.7,289.8 179.0,288.3 176.7,286.0 178.2,284.3 183.8,283.7 180.6,284.5 180.5,287.2 187.8,288.4 189.5,296.3 198.8,294.2 201.2,296.8 203.9,294.1 207.1,298.2 211.3,292.5 219.8,295.9 244.1,284.4 245.8,277.8 241.6,282.0 235.4,283.3 234.9,278.9 239.3,279.8 239.0,273.4 242.6,274.3 254.0,265.8 256.4,269.4 255.1,271.0 259.2,270.0 260.1,271.8 254.9,272.5 254.8,273.7 258.1,273.1 258.8,275.0 260.4,271.8 261.7,272.9 258.9,275.2 258.3,279.5 255.9,278.8 258.4,282.7 262.1,276.4 268.5,276.3 271.6,274.6 271.6,273.8 272.4,271.6 274.1,270.4 271.7,274.6 277.8,275.6 288.1,283.0 295.3,283.9 298.6,287.5 311.1,280.5 322.2,279.3 325.8,281.4 324.3,283.2 326.1,285.1 323.2,286.3 326.8,288.8 324.2,289.4 328.5,288.4 330.2,286.4 336.0,285.3 342.9,289.9 382.1,276.0 398.1,275.4 407.5,281.2 414.4,290.6 428.1,294.7 435.4,300.1 434.9,301.9 439.6,297.3 437.4,296.5 439.9,295.9 440.5,293.8 439.1,294.8 438.3,295.1 438.2,295.0 439.6,292.8 442.9,295.2 444.5,294.3 442.8,290.4 447.6,290.2 445.2,288.4 446.3,286.6 450.2,287.7 457.4,282.7 464.9,281.3 477.2,291.1 478.7,291.4 477.9,288.8 480.2,289.6 481.5,299.7 487.6,296.5 491.7,298.0 491.3,296.4 494.9,302.7 501.6,305.4 500.8,303.6 502.7,303.1 498.7,303.4 494.1,297.5 497.1,297.7 499.2,302.1 503.5,298.9 504.5,301.7 505.5,299.7 504.8,298.1 505.4,297.4 506.5,298.5 508.8,299.0 505.0,298.3 508.0,300.5 505.7,301.1 508.8,305.1 510.0,303.3 508.9,298.8 507.8,297.6 511.9,294.6 513.4,296.2 515.3,291.9 517.3,293.0 516.4,291.0 520.5,289.0 534.0,295.0 535.4,296.0 536.3,298.7 533.0,298.5 531.8,302.0 517.5,298.3 520.7,303.5 518.8,304.6 523.8,305.9 527.9,301.5 542.7,304.7 544.5,301.9 543.0,306.6 554.3,298.6 565.3,296.4 580.3,287.3 586.4,287.5 595.9,294.8 612.8,279.8 622.0,281.5 628.4,286.8 634.0,283.5 640.6,285.5 651.7,282.3 657.9,282.9 670.5,274.6 673.9,276.8 680.6,267.3 686.8,268.1 693.6,262.6 698.1,264.6 699.9,260.5 698.0,251.3 699.5,245.3 696.1,244.0 700.9,244.4 705.9,238.9 709.9,242.2 714.3,240.2 716.7,233.8 713.2,231.8 716.8,231.3 716.0,228.0 719.5,225.2 720.0,219.3 724.8,213.1 725.3,205.0 731.8,194.3 741.9,188.0 746.5,179.1 753.4,175.3 758.0,179.1 763.1,178.4 765.2,181.6 764.2,176.6 766.9,172.3 775.3,170.5 779.7,166.5 784.9,170.3 790.3,170.7 791.2,167.0 794.5,170.1 796.3,166.6 792.3,167.0 794.7,164.8 793.9,162.0 789.6,161.3 792.7,158.5 790.5,156.1 795.3,152.5 801.9,156.7 804.4,164.9 805.3,162.8 807.6,165.0 810.1,164.2 806.0,162.4 807.5,161.6 806.2,155.3 812.5,158.3 814.4,156.1 808.4,151.7 804.8,144.6 806.9,139.8 800.7,145.2 802.1,147.2 804.8,144.6 802.5,147.3 804.2,150.0 798.7,147.2 797.5,143.6 800.6,145.2 801.1,143.3 794.6,137.0 797.6,130.4 793.7,129.8 793.0,128.3 794.7,127.9 794.3,125.6 793.6,128.0 792.2,125.9 797.8,118.3 795.8,114.3 796.8,104.6 793.4,101.4 794.8,98.1 792.2,97.2 797.7,91.7 797.9,87.2 800.5,86.1 803.0,78.1 800.8,76.3 797.7,76.9 793.3,85.2 790.8,85.1 788.4,79.8 783.2,87.8 774.5,88.9 771.7,86.0 765.7,87.0 757.7,84.0 752.4,78.9 751.8,75.4 741.0,79.7 732.3,71.2 727.7,69.6 727.9,63.4 716.3,67.8 714.9,66.2 719.2,61.6 718.9,59.3 712.5,65.1 708.8,65.5 696.9,53.9 677.6,51.0 666.3,43.8 663.6,43.8 663.0,46.5 654.6,47.6 634.0,43.2 628.9,40.2 627.4,41.6 622.9,39.8 620.3,45.3 614.0,48.0 606.4,47.7 600.4,42.8 596.2,43.8 580.6,39.3 583.3,42.6 569.0,40.1 568.8,42.9 574.1,46.5 578.6,46.6 580.0,50.1 566.3,56.0 565.6,48.9 563.8,49.3 566.4,47.9 559.0,49.1 556.4,47.9 553.4,44.5 553.1,41.4 557.4,44.6 555.2,46.3 557.7,44.8 553.0,39.7 555.4,34.2 552.5,32.5 553.9,36.7 541.5,44.8 531.4,40.3 530.6,34.8 533.6,33.5 533.8,32.3 530.3,32.2 530.0,35.3 527.1,37.0 514.0,37.1 504.6,35.8 497.5,31.2 490.3,29.9 482.0,34.1 476.8,31.2 466.4,32.2 458.7,27.3 455.8,29.6 438.8,25.2 437.6,28.6 431.1,25.2 431.5,23.3 428.1,23.0 427.5,25.6 409.9,27.0 405.3,34.4 401.0,35.6 375.5,31.6 372.8,29.0 371.1,29.6 368.8,27.7 364.3,29.4 352.9,25.0 349.8,27.4 340.8,27.9 320.5,22.8 313.2,23.5 311.3,25.7 297.8,25.1 293.5,29.5 285.0,29.0 283.9,30.0 285.3,29.1 285.0,31.1 285.8,31.2 286.8,31.6 286.8,32.4 286.7,31.8 286.1,31.4 285.4,31.2 285.0,31.1 281.3,34.1 265.7,32.9 241.1,23.3 224.7,26.4 206.1,24.0 185.1,28.0 168.9,24.1 153.3,24.2 134.7,14.6 97.4,12.1 77.4,15.8 63.8,27.5 62.5,37.4 68.8,54.2 67.0,62.2 49.8,74.1 35.2,80.9 18.7,85.0 13.6,88.8Z M559.5,34.2 563.6,40.6 568.5,37.7 577.4,40.3 579.2,38.7 577.3,36.2 559.5,34.2Z M820.1,219.2 825.9,226.0 837.2,230.0 845.5,229.5 855.2,224.0 866.7,222.3 871.9,224.1 873.0,226.7 872.6,223.1 876.8,222.3 879.0,223.9 877.7,226.6 880.1,227.4 880.2,225.1 882.2,226.8 885.5,221.8 880.6,220.8 881.5,218.2 885.7,218.4 886.8,224.6 893.7,222.5 891.8,218.5 887.6,217.3 891.3,214.4 895.7,219.8 897.0,216.5 901.0,216.8 900.6,213.6 902.1,216.2 913.5,214.1 916.6,216.9 916.6,208.6 919.9,208.1 921.4,210.1 922.8,205.0 924.4,208.4 928.6,207.1 929.0,209.4 933.4,209.3 931.9,212.7 927.0,213.3 930.1,215.0 934.4,213.3 934.1,210.2 936.1,211.9 936.5,207.6 938.9,209.9 941.7,207.2 948.2,207.3 949.2,202.8 952.8,203.0 954.5,206.7 968.1,203.3 963.8,203.0 957.9,196.3 950.7,199.7 908.1,189.2 887.2,191.4 881.7,197.4 853.8,203.6 851.5,203.6 850.6,194.8 851.4,204.4 835.4,210.8 820.7,210.4 820.1,219.2Z M931.3,95.8 937.9,106.2 937.6,109.3 943.8,111.0 947.0,119.9 952.4,119.2 951.8,123.1 955.0,124.8 958.6,131.6 959.3,128.4 961.2,128.5 960.7,123.4 957.5,124.6 958.7,121.1 952.5,119.2 951.3,115.1 956.5,116.4 955.9,115.3 956.4,114.3 958.5,116.9 963.2,117.1 961.0,118.8 963.4,119.1 963.7,122.2 968.9,121.8 970.6,125.6 973.9,123.6 972.3,115.9 978.9,118.5 975.3,110.7 965.0,104.8 959.2,105.1 956.6,102.4 953.2,104.9 947.7,101.2 945.9,105.3 943.5,105.7 934.2,95.2 931.3,95.8Z';
function proj(lat,lng){const sx=PROJ.W/(PROJ.lon1-PROJ.lon0);return[(lng-PROJ.lon0)*sx,(PROJ.lat1-lat)*sx/PROJ.k]}
function placeCard(p){const ig=igHandle(p.instagram);return `<div class="pop"><div class="t">${esc(p.nombre)}</div><div class="s">${esc(fx(p,'tipo')||'')}${p.pueblo?' · '+esc(p.pueblo):''}${p.direccion?'<br>'+esc(p.direccion):''}${p.horario?'<br>'+esc(fx(p,'horario')):''}</div>
 <div class="links">${linkBtn('ig',p.instagram,ig||'Instagram')}<a class="lbtn go-map" href="${esc(goLink(p))}" target="_blank" rel="noopener">${ICON.map}${tt('dir')}</a>${p.web?linkBtn('web',p.web,tt('link.web')):''}</div>${EXT.placeActions(p)}</div>`}
function filteredPlaces(){return D.places.filter(p=>(!state.lugCat||p.categoria===state.lugCat)&&(!state.lugTown||p.pueblo===state.lugTown))}
function vLugares(arg){if(arg==='ruta')state.lugMode='ruta';else if(state.lugMode==='ruta')state.lugMode='mapa';const ru=state.lugMode==='ruta';const towns=[...new Set(D.places.map(p=>p.pueblo).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'es'));const ps=filteredPlaces();
 const nL=D.places.filter(p=>p.categoria==='lounge').length,nV=D.places.filter(p=>p.categoria==='venta').length;
 view.innerHTML=`${head(tt('menu.lugares'),tt('lug.title'),tt('lug.lead',{nL,nV}),VBArt.ranchon())}
 <div class="toggle t3" role="group" aria-label="${tt('lug.view')}"><button data-mode="mapa" aria-pressed="${state.lugMode==='mapa'}">${tt('lug.map')}</button><button data-mode="lista" aria-pressed="${state.lugMode==='lista'}">${tt('lug.list')}</button><button data-mode="ruta" aria-pressed="${ru}">${tt('lug.ruta')}</button></div>
 ${ru?EXT.vRuta()+PROTO_NOTE:`<div class="chips"><button class="chip" data-cat="" aria-pressed="${!state.lugCat}">${tt('lug.all')}</button><button class="chip" data-cat="lounge" aria-pressed="${state.lugCat==='lounge'}">${tt('lug.lounges')}</button><button class="chip" data-cat="venta" aria-pressed="${state.lugCat==='venta'}">${tt('lug.venta')}</button></div>
 <div class="filter-row"><select id="fTown" aria-label="${tt('f.pueblo')}"><option value="">${tt('lug.allTowns')}</option>${towns.map(t=>`<option ${state.lugTown===t?'selected':''}>${esc(t)}</option>`).join('')}</select></div>
 ${state.lugMode==='mapa'?`<div class="map-wrap"><div id="map"></div></div><div class="legend"><span class="lg">${VBArt.leaf(LEAFC.lounge)}Lounge</span><span class="lg">${VBArt.leaf(LEAFC.venta)}${tt('lug.ventaOne')}</span><button class="near" id="near" type="button">${tt('lug.near')}</button></div><div id="placeCard" class="place-card"></div>`:''}
 <div class="list" style="margin-top:12px">${ps.map(p=>`<div class="row" style="align-items:flex-start;flex-direction:column;gap:6px"><div style="display:flex;gap:10px;align-items:center;width:100%"><span class="list-leaf">${VBArt.leaf(LEAFC[p.categoria]||LEAFC.lounge)}</span><div><div class="t">${esc(p.nombre)}</div><div class="s">${esc(fx(p,'tipo')||'')} · ${esc(p.pueblo||'')}${p.lat_lng_aprox?' · '+tt('lug.approx'):''}${p.horario?'<br>'+esc(fx(p,'horario')):''}</div></div></div>
 <div class="links" style="width:100%;margin:2px 0 0">${linkBtn('ig',p.instagram,igHandle(p.instagram)||'Instagram')}<a class="lbtn go-map" href="${esc(goLink(p))}" target="_blank" rel="noopener">${ICON.map}${tt('dir')}</a></div>${EXT.placeActions(p)}</div>`).join('')||'<div class="empty">'+tt('lug.empty')+'</div>'}</div>${PROTO_NOTE}`}`;
 $$('[data-mode]').forEach(b=>b.onclick=()=>{const m=b.dataset.mode;history.replaceState(null,'',m==='ruta'?'#/lugares/ruta':'#/lugares');vLugares(m==='ruta'?'ruta':(state.lugMode=m,0))});
 if(ru){drawRuta();return}
 $$('[data-cat]').forEach(b=>b.onclick=()=>{state.lugCat=b.dataset.cat;vLugares()});
 $('#fTown').onchange=e=>{state.lugTown=e.target.value;vLugares()};
 if(state.lugMode==='mapa')drawMap(ps)}
/* LHB-83: Leaflet (script y estilo) se pide la primera vez que se abre un mapa, no al cargar la app.
   Su estilo va antes de styles.css, como antes, para que styles.css siga mandando sobre .leaflet-*.
   Listo (leafOK) solo cuando llegaron los dos; si uno falla, la próxima entrada pide solo ese otra vez */
let leafP=null,leafOK=false;
function needLeaflet(){if(leafOK)return Promise.resolve(true);if(leafP)return leafP;
 const tag=(t,a)=>new Promise(res=>{const e=Object.assign(document.createElement(t),a);e.onload=()=>res(e);e.onerror=()=>{e.remove();res(null)};document.head.insertBefore(e,t==='link'?document.querySelector('link[href="styles.css"]'):null)});
 return leafP=Promise.all([window.L||tag('script',{src:'vendor-leaflet.js'}),document.querySelector('link[href="vendor-leaflet.css"]')||tag('link',{rel:'stylesheet',href:'vendor-leaflet.css'})]).then(([s,c])=>{leafP=null;return leafOK=!!(s&&c&&window.L)})}
let rutaView=null;
function drawRuta(){if(leafletMap){leafletMap.remove();leafletMap=null}const {ts}=EXT.ruta(),nu=EXT.rlit(),el=$('#map');if(!el)return;
 const off=why=>{el.innerHTML=`<div class="map-offline"><svg viewBox="0 -20 1000 370" role="img" aria-label="${tt('map.alt')}"><path class="isl" d="${ISLAND}"/>${ts.map(t=>{const[x,y]=proj(t.la,t.lo);return `<g class="rpt${t.on?' on':''}" data-town="${t.n}" transform="translate(${x.toFixed(0)} ${y.toFixed(0)})"><circle r="22" fill="transparent"/><circle r="${t.on?13:7}" class="${t.on?'gl':'dot'}"/></g>`}).join('')}</svg><span class="cap">${esc(why)}</span></div>`};
 if(!navigator.onLine){off(tt('map.offTown'));return}
 if(!leafOK){needLeaflet().then(ok=>{if(!el.isConnected)return;if(ok)drawRuta();else off(tt('map.failTown'))});return}
 const map=L.map('map',{zoomControl:true,attributionControl:true,scrollWheelZoom:false});leafletMap=map;
 if(rutaView)map.setView(rutaView[0],rutaView[1]);else map.fitBounds([[17.95,-67.27],[18.52,-65.6]],{padding:[8,8]});
 map.on('moveend',()=>{rutaView=[map.getCenter(),map.getZoom()]});
 let errs=0,ok=0;const tl=L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>'}).addTo(map);
 tl.on('tileload',()=>ok++);tl.on('tileerror',()=>{errs++;if(errs>6&&ok===0){map.remove();leafletMap=null;off(tt('map.failTown'))}});
 ts.forEach(t=>{const icon=L.divIcon({className:'rpin'+(t.on?' on':'')+(t.n==nu?' nuevo':''),html:t.on?'<i></i>'+VBArt.leaf('#8fd162'):'<b></b>',iconSize:[26,26],iconAnchor:[13,13]});
  L.marker([t.la,t.lo],{icon,title:t.n+(t.on?' · '+tt('map.lit'):''),keyboard:true,zIndexOffset:t.on?500:0}).addTo(map).on('click',()=>EXT.townSheet(t.n))})}
function drawOffline(ps,why){const el=$('#map');if(!el)return;
 el.innerHTML=`<div class="map-offline"><svg viewBox="0 -20 1000 370" role="img" aria-label="${tt('map.alt')}"><path class="isl" d="${ISLAND}"/>${ps.filter(p=>p.lat&&p.lng).map((p,i)=>{const[x,y]=proj(p.lat,p.lng);return `<g class="offline-pin" data-i="${D.places.indexOf(p)}" transform="translate(${x.toFixed(1)} ${y.toFixed(1)})"><circle r="18" fill="transparent"/><path transform="translate(-15 -38) scale(.75)" d="M20 2 C 34 12 38 28 32 40 C 28 47 23 50 20 51 C 17 50 12 47 8 40 C 2 28 6 12 20 2Z" fill="${LEAFC[p.categoria]||LEAFC.lounge}" stroke="#2a1a12" stroke-width="5"/></g>`}).join('')}</svg><span class="cap">${esc(why)}</span></div>`;
 $$('.offline-pin',el).forEach(g=>g.onclick=()=>{const r=g.getBoundingClientRect(),hr=el.parentNode.getBoundingClientRect();leafBurst(el.parentNode,r.left-hr.left+r.width/2,r.top-hr.top,LEAFC[D.places[+g.dataset.i].categoria]);setTimeout(()=>{$('#placeCard').innerHTML=`<div class="row" style="display:block">${placeCard(D.places[+g.dataset.i])}</div>`},REDUCED?0:700)})}
function drawMap(ps){if(leafletMap){leafletMap.remove();leafletMap=null}
 const mm=$('#mapMode'),el=$('#map');
 if(!navigator.onLine){drawOffline(ps,tt('map.offPin'));return}
 if(!leafOK){if(el)needLeaflet().then(ok=>{if(!el.isConnected)return;if(ok)drawMap(ps);else drawOffline(ps,tt('map.failPin'))});return}
 const map=L.map('map',{zoomControl:true,attributionControl:true,scrollWheelZoom:false}).fitBounds([[17.92,-67.27],[18.52,-65.6]]);leafletMap=map;
 let errs=0,ok=0;const tl=L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>'}).addTo(map);
 tl.on('tileload',()=>ok++);tl.on('tileerror',()=>{errs++;if(errs>6&&ok===0){map.remove();leafletMap=null;drawOffline(ps,tt('map.failPin'))}});
 const pts=[],mks=[],pins=L.layerGroup().addTo(map);ps.filter(p=>p.lat&&p.lng).forEach(p=>{const icon=L.divIcon({className:'leaf-pin',html:VBArt.leaf(LEAFC[p.categoria]||LEAFC.lounge),iconSize:[26,34],iconAnchor:[13,32],popupAnchor:[0,-28]});const mk=L.marker([p.lat,p.lng],{icon,title:p.nombre,keyboard:true});
  mk.on('click',()=>{map.closePopup();const pt=map.latLngToContainerPoint([p.lat,p.lng]);leafBurst($('#map').parentNode,pt.x,pt.y-16,LEAFC[p.categoria]);setTimeout(()=>{L.popup({offset:[0,-28],autoPanPadding:[16,16],maxWidth:250,minWidth:210}).setLatLng([p.lat,p.lng]).setContent(placeCard(p)).openOn(map)},REDUCED?0:780)});mks.push({mk,p,ll:L.latLng(p.lat,p.lng)});pts.push([p.lat,p.lng])});
 /* LHB-87: en cada zoom, los pines que se taparían van en un grupo con su número; tocarlo acerca el mapa, y si ya no se separan, muestra la lista */
 const layout=()=>{pins.clearLayers();for(const g of groupPins(mks.map(m=>{const q=map.latLngToLayerPoint(m.ll);return {x:q.x,y:q.y,m}}))){if(g.ms.length===1){pins.addLayer(g.ms[0].mk);continue}
  const n=g.ms.length,at=map.layerPointToLatLng([g.x,g.y]),c=L.marker(at,{icon:L.divIcon({className:'pin-group',html:`<span>${n}</span>`,iconSize:[36,36],iconAnchor:[18,18]}),title:tt('map.group',{n}),keyboard:true});
  c.on('click',()=>{map.closePopup();const b=L.latLngBounds(g.ms.map(m=>m.ll));if(tapGroup(map.getZoom(),map.getBoundsZoom(b,false,L.point(96,96)),b.getNorthEast().equals(b.getSouthWest()))==='list')listPop=L.popup({autoPanPadding:[16,16],maxWidth:250,minWidth:210,maxHeight:popMaxH(map.getSize().y)}).setLatLng(at).setContent('<div class="pops">'+g.ms.map(m=>placeCard(m.p)).join('')+'</div>').openOn(map);else map.fitBounds(b,{padding:[48,48],maxZoom:17})});pins.addLayer(c)}};
 map.on('zoomend',layout);let listPop=null;map.on('resize',()=>fitPop(map,listPop));
 const nb=$('#near');if(nb)nb.onclick=()=>{if(!navigator.geolocation){toast(tt('geo.none'));return}nb.textContent=tt('geo.searching');navigator.geolocation.getCurrentPosition(pos=>{nb.textContent=tt('lug.near');const ll=[pos.coords.latitude,pos.coords.longitude];const vi=L.divIcon({className:'aqui-pin',html:VBArt.aqui(),iconSize:[30,30],iconAnchor:[15,15]});L.marker(ll,{icon:vi,title:tt('geo.here'),zIndexOffset:1000}).addTo(map).bindTooltip(tt('geo.here'));map.setView(ll,12)},()=>{nb.textContent=tt('lug.near');toast(tt('geo.err'))},{timeout:10000})};
 if(pts.length>1)map.fitBounds(pts,{padding:[28,28],maxZoom:state.lugTown?14:11});else if(pts.length===1)map.setView(pts[0],14);layout()}
/* ---------- actividades ---------- */
const MES=tt('months').split(',');
function evDate(f){const d=new Date(f+'T12:00:00');return isNaN(d)?null:d}
function evItem(e,pending){const d=evDate(e.fecha);const m={nombre:e.lugar||e.titulo,direccion:e.direccion||'',pueblo:e.pueblo,maps:e.maps,lat:e.lat,lng:e.lng};
 return `<article class="ev ${pending?'pending':''}"><div class="date">${d?`<small>${MES[d.getMonth()]}</small><b>${d.getDate()}</b>`:'<b>?</b>'}</div><div style="min-width:0;flex:1">
 <div class="t">${esc(e.titulo)}</div>${(()=>{const ok=v=>v&&!/no definid|por confirmar|no publicad|sin confirmar/i.test(v)?v:'';const m=[ok(e.hora),[ok(e.lugar),ok(e.pueblo)].filter(Boolean).join(', '),ok(e.precio)].filter(Boolean).map(esc).join(' · ');return m?`<div class="s">${m}</div>`:''})()}
 ${e.imagen?`<img class="ev-flyer" src="${esc(e.imagen)}" alt="${esc(e.titulo)}" width="480" height="600" loading="lazy">`:''} ${e.detalle?`<div class="s">${esc(e.detalle)}</div>`:''}
 <div class="src">${pending?tt('ev.pending'):(e.fuente?`${tt('ev.via')} ${e.fuente_url?`<a href="${esc(e.fuente_url)}" target="_blank" rel="noopener" style="color:inherit">${esc(e.fuente)}</a>`:esc(e.fuente)}`:'')}</div>
 <div class="links">${e.enlace?linkBtn('web',e.enlace,tt('ev.more')):''}${(e.lugar||e.maps)?`<a class="lbtn go-map" href="${esc(goLink(m))}" target="_blank" rel="noopener">${ICON.map}${tt('dir')}</a>`:''}</div></div></article>`}
/* ---------- perfil ---------- */
/* LHB-51: la foto y el nombre de Perfil y del encabezado son los de la cuenta que entró (lo guardado en cuenta2 por la puerta de la cuenta), nunca la foto local del teléfono, que es de todas las cuentas */
const AV_HOST='https://img.clerk.com/';
const acctNow=()=>{const a=LS.get('cuenta2',null);return a&&typeof a==='object'&&typeof a.sub==='string'&&a.sub&&typeof a.handle==='string'?a:null};
const acctAvatar=a=>a&&typeof a.avatar==='string'&&a.avatar.startsWith(AV_HOST)?a.avatar:'';
const acctName=a=>a.name||('@'+a.handle);
/* las iniciales como las de Google: la primera letra del nombre y la de la última palabra ("Ana M." da AM); una sola palabra da una letra */
const g1=s=>{try{return [...new Intl.Segmenter(undefined,{granularity:'grapheme'}).segment(s)][0].segment}catch(e){return [...s][0]}};
const initialsOf=s=>{const w=String(s||'').replace(/[^\p{L}\p{M}\p{N}\s]/gu,' ').trim().split(/\s+/).filter(Boolean);if(!w.length)return '';return (g1(w[0])+(w.length>1?g1(w[w.length-1]):'')).toUpperCase()};
const acctInitial=a=>initialsOf(a.name)||([...String(a.handle||'')][0]||'\u2606').toUpperCase();
/* pone la foto en el círculo; si no carga (una URL vencida) deja la inicial */
function paintAvatar(el,a,alt){const src=acctAvatar(a),ini=`<span>${esc(acctInitial(a))}</span>`;
 if(!src){el.innerHTML=ini;return}
 const im=new Image();im.alt=alt;im.onerror=()=>{if(el.firstChild===im)el.innerHTML=ini};im.src=src;el.replaceChildren(im)}
async function vPerfil(){const p=LS.get('perfil',{nombre:'',capa:''});const ac=acctNow();const ups=uploads();const rat=EXT.S().ratings;
 const ratC=Object.keys(rat).map(cigarById).filter(Boolean);
 view.innerHTML=`${EXT.subnav('perfil')}<div class="section-title"><h2>${tt('pf.title')}</h2></div>
 <div class="me"><div class="pic" id="mePic">${ac?esc(acctInitial(ac)):PERSON}</div><div><div class="n">${esc(ac?acctName(ac):tt('pf.yourName'))}</div><div class="c">${ac?'@'+esc(ac.handle)+(p.capa?' \u00b7 '+tt('pf.favCapa')+': '+esc(p.capa):''):p.capa?tt('pf.favCapa')+': '+esc(p.capa):tt('pf.pickCapa')}</div></div></div>
 <div class="pf-own" id="pfOwn"></div>
 <details class="edit"><summary>${tt('pf.favCapa')}</summary><form class="form" id="pForm">
 <div class="field"><label for="pC">${tt('pf.favCapa')}</label><select id="pC"><option value="">\u2014</option>${['Claro','Connecticut','Natural','Colorado','Habano','Corojo','Criollo','Maduro','Oscuro'].map(x=>`<option ${p.capa===x?'selected':''}>${x}</option>`).join('')}</select></div>
 <button class="btn" type="submit">${tt('pf.save')}</button></form></details>
 <div class="section-title"><h2>${tt('pf.myUploads')}</h2><a href="#/subir">${tt('pf.add')}</a></div>${ups.length?`<div class="mini-row">${ups.map(c=>cigarCard({...c,yours:true,mini:true})).join('')}</div>`:emptyBox(tt('pf.noUploads'))}
 <div class="section-title"><h2>${tt('pf.myRatings')}</h2></div>${ratC.length?`<div class="list">${ratC.map(c=>`<a class="row" href="#/c/${encodeURIComponent(c.id)}"><div><div class="t">${esc(c.nombre)}</div><div class="s">${esc(artisanName(c))}</div></div><span class="go" style="color:var(--accent-ink);font-size:15px">${'★'.repeat(rat[c.id])}${'☆'.repeat(5-rat[c.id])}</span></a>`).join('')}</div>`:'<div class="empty">'+tt('pf.noRatings')+'</div>'}
 ${EXT.accountPanel()}`;
 if(ac)paintAvatar($('#mePic'),ac,tt('pf.fotoAlt'));EXT.bindAccount();
 /* LHB-58: el perfil pasaporte primero (bio, marca, conteos, Editar perfil y las pestañas) lo pone hoja.js en #pfOwn */
 if(ac)EXT.profileOwn(ac);
 $('#pForm').onsubmit=e=>{e.preventDefault();LS.set('perfil',{nombre:p.nombre,capa:$('#pC').value});toast(tt('pf.saved'));vPerfil();topAvatar()};hydratePhotos()}
/* sin una cuenta guardada el círculo es la silueta (LHB-109): la foto y el nombre locales son de todo el teléfono, y a quien acaba de entrar con otra cuenta no se le muestra la foto de otra persona */
/* LHB-109: sin cuenta, la silueta de una persona (la estrella no decía cuenta) */
const PERSON='<svg class="person-glyph" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="9" r="4"/><path d="M4.5 20.5c1.2-3.8 4-5.5 7.5-5.5s6.3 1.7 7.5 5.5"/></svg>';
function topAvatar(){const el=$('#topAvatar');if(!el)return;const a=acctNow();if(a)paintAvatar(el,a,'');else el.innerHTML=PERSON}
/* ---------- v6: Mi Hoja y demás (hoja.js) ---------- */
const EXT=window.LHB_EXT({topAvatar,$,$$,esc,toast,view,VBArt,LS,D:()=>D,allCigars,artisanById,cigarById,artisanName,fx,fq,cigarSVG,mono,linkBtn,ICON,FORT,fortLabel,PROTO_NOTE,head,cigarCard,goLink,evDate,route:()=>route(),menuHTML:h=>menuHTML(h),vPerfil,resizeImage,hydrate:r=>hydratePhotos(r||view)});
/* LHB-73: Acerca de y los créditos de la intro. CREDITS dice qué sonido con licencia lleva cada archivo de site/assets; la prueba
   recorre site/assets y no deja pasar un archivo con sonido sin sus créditos. Las licencias se comprobaron en su página el 2026-10-29. */
const CREDITS={audio:[
 {id:'motor',part:()=>tt('cred.motor'),title:'Volkswagen Type 2_revving up2.wav',author:'nhaudio',href:'https://freesound.org/people/nhaudio/sounds/332695/',license:'CC BY 4.0',licenseHref:'https://creativecommons.org/licenses/by/4.0/',changes:()=>tt('cred.motorChanges')},
 {id:'selva',part:()=>tt('cred.selva'),title:'Jungle, Tropical birds and insects',author:'myrinvp',href:'https://freesound.org/people/myrinvp/sounds/423711/',license:'CC0 1.0',licenseHref:'https://creativecommons.org/publicdomain/zero/1.0/',changes:()=>tt('cred.selvaChanges')}],
 files:{'assets/intro/intro-portrait.mp4':['motor','selva'],'assets/intro/intro-landscape.mp4':['motor','selva']}};
const ext=(href,txt)=>`<a href="${href}" target="_blank" rel="noopener">${txt}</a>`;
/* el enlace que se tocó desaparece al pintar: el foco pasa a la vista, no se pierde en la página (Codex ronda 1) */
const keepFocus=()=>{const a=document.activeElement;if(!a||a===document.body||!a.isConnected)view.focus({preventScroll:true})};
/* Ver intro: ?intro=1 la repite una vez aunque no hayan pasado los 14 días, y vuelve aquí; con menos movimiento o ahorro de datos la intro no sale, así que no se ofrece (se mira al pintar: el ajuste puede cambiar sin recargar) */
function vAcerca(){const off=matchMedia('(prefers-reduced-motion: reduce)').matches||!!(navigator.connection&&navigator.connection.saveData);
 view.innerHTML=`${head(tt('about.eyebrow'),tt('about.title'),tt('about.lead'),VBArt.hoja())}
 <section class="about-sec" aria-labelledby="ab-intro"><h2 id="ab-intro">${tt('about.introH')}</h2>${off?`<p class="hint">${tt('about.introOff')}</p>`:`<p class="hint">${tt('about.replayNote')}</p><a class="lbtn about-replay" href="/?intro=1#/acerca" data-intro-replay>${brandIcon('play')}<span>${tt('about.replay')}</span></a>`}</section>
 <section class="about-sec" aria-labelledby="ab-more"><h2 id="ab-more">${tt('about.moreH')}</h2>
 <a class="menu-dest" href="#/creditos"><span class="menu-ico">${brandIcon('info')}</span><span class="menu-copy"><b>${tt('about.credits')}</b><small>${tt('about.creditsSub')}</small></span>${brandIcon('arrow','menu-go')}</a>
 <a class="menu-dest" href="/privacidad"><span class="menu-ico">${brandIcon('people')}</span><span class="menu-copy"><b>${tt('about.privacy')}</b><small>${tt('about.privacySub')}</small></span>${brandIcon('arrow','menu-go')}</a></section>`;keepFocus()}
function vCreditos(){
 view.innerHTML=`<button class="back" type="button" data-back>${tt('cred.back')}</button>${head(tt('about.eyebrow'),tt('cred.title'),tt('cred.lead'),VBArt.hoja())}
 <section class="about-sec" aria-labelledby="cr-bus"><h2 id="cr-bus">${tt('cred.busH')}</h2><p class="cred-p">${tt('cred.bus')} ${ext('https://callepomarrosas.com/',tt('intro.creditName'))}.</p></section>
 <section class="about-sec" aria-labelledby="cr-sound"><h2 id="cr-sound">${tt('cred.soundH')}</h2><p class="hint">${tt('cred.soundLead')}</p>
 <ul class="cred-list">${CREDITS.audio.map(c=>`<li class="cred-item" data-credit="${c.id}"><b>${c.part()}</b><span>${ext(c.href,esc(c.title))} ${tt('cred.by')} ${esc(c.author)}</span><span>${tt('cred.license')}: ${ext(c.licenseHref,esc(c.license))}</span><span>${tt('cred.changes')}: ${c.changes()}</span></li>`).join('')}</ul>
 <p class="hint">${tt('cred.breeze')}</p></section><p class="hint cred-endorse">${tt('cred.endorse')}</p>`;
 $('[data-back]').onclick=()=>{location.hash='#/acerca'};keepFocus()}
/* LHB-73: fin */
/* ---------- router ---------- */
/* LHB-71: la tabla de rutas. El enrutador y el menú salen de aquí, así que una ruta nueva no se queda fuera del menú.
   menu: [grupo, ícono, clave del nombre, clave de la línea, subruta]; of: la ruta de la que es detalle o alias (sale en el menú por ella)
   LHB-109: tab: la clave del nombre de una pestaña (las pestañas son la navegación; el menú lleva solo lo que ellas no); bar: la lleva la barra de arriba (la lupa) */
const MENU_GROUPS=[['descubre',()=>tt('menu.g.descubre')],['experiencia',()=>tt('menu.g.experiencia')],['comunidad',()=>tt('menu.g.comunidad')],['app',()=>tt('menu.g.app')]];
const ROUTES=[
 {r:'catalogo',go:()=>vCatalogo(),tab:'menu.cigarros'},
 {r:'c',go:id=>vCigar(id),of:'catalogo'},
 {r:'lugares',go:id=>vLugares(id),tab:'menu.lugares',menu:[['descubre','place','menu.ruta','menu.rutaSub','ruta']]},
 {r:'artesanos',go:()=>vArtesanos(),tab:'menu.artesanos'},
 {r:'a',go:id=>vArtesano(id),of:'artesanos'},
 {r:'mihoja',go:id=>EXT.routes.mihoja(id),tab:'menu.mihoja',menu:[['experiencia','pen','menu.editar','menu.editarSub','editar'],['comunidad','people','menu.personas','menu.personasSub','personas']]},
 {r:'perfil',go:()=>EXT.routes.mihoja('perfil'),of:'mihoja'},
 {r:'u',go:id=>EXT.routes.persona(id),of:'mihoja'},
 {r:'cata',go:id=>EXT.routes.cata(id),menu:[['experiencia','taste','menu.cata','menu.cataSub']]},
 {r:'maridajes',go:()=>EXT.routes.maridajes(),menu:[['experiencia','coffee','menu.maridajes','menu.maridajesSub']]},
 {r:'subir',go:()=>EXT.requireAccount(vSubir,{fast:true}),menu:[['experiencia','upload','menu.subir','menu.subirSub']]},
 {r:'eventos',go:id=>EXT.routes.eventos(id),tab:'menu.eventos'},
 {r:'actividades',go:id=>EXT.routes.eventos(id),of:'eventos'},
 {r:'podcast',go:()=>EXT.routes.podcast(),menu:[['comunidad','podcast','menu.podcast','menu.podcastSub']]},
 {r:'buscar',go:()=>EXT.routes.buscar(),bar:true},
 {r:'acerca',go:()=>vAcerca(),menu:[['app','info','menu.acerca','menu.acercaSub']]},
 {r:'creditos',go:()=>vCreditos(),of:'acerca'},
];
const ROUTE_OF=Object.fromEntries(ROUTES.map(x=>[x.r,x]));
/* el menú: los grupos en su orden, cada destino con su ícono, y la página en la que está marcada (aria-current y «Aquí») */
function menuHTML(hash){const [r0,a0]=String(hash==null?location.hash:hash).replace(/^#\/?/,'').split('/');let arg0=a0||'';try{arg0=decodeURIComponent(arg0)}catch(e){}
 const r=ROUTE_OF[r0]?r0:'catalogo',x=ROUTE_OF[r],home=x&&x.of?x.of:r;
 const rows=g=>ROUTES.flatMap(x=>(x.menu||[]).filter(m=>m[0]===g).map(m=>{const sub=m[4]||'',href='#/'+x.r+(sub?'/'+sub:''),subs=(x.menu||[]).map(n=>n[4]).filter(Boolean);
   const cur=home===x.r&&(sub?r===x.r&&arg0===sub:!(r===x.r&&subs.includes(arg0)));
   return `<a class="menu-dest" href="${href}"${cur?' aria-current="page"':''}><span class="menu-ico">${brandIcon(m[1])}</span><span class="menu-copy"><b>${tt(m[2])}</b><small>${tt(m[3])}</small></span>${cur?`<span class="menu-here">${tt('menu.aqui')}</span>`:brandIcon('arrow','menu-go')}</a>`}));
 /* LHB-109: lo que no es una ruta de la app: las guías (páginas fijas), el idioma (el nombre del otro, en el otro) y la privacidad */
 const go=(href,i,k,ks)=>`<a class="menu-dest" href="${href}"><span class="menu-ico">${brandIcon(i)}</span><span class="menu-copy"><b>${tt(k)}</b><small>${tt(ks)}</small></span>${brandIcon('arrow','menu-go')}</a>`;
 const I=typeof window!=='undefined'?window.LHB_I18N:null,other=I&&I.ENABLED?(I.lang==='en'?['es','Espa\u00f1ol']:['en','English']):null;
 const extra={descubre:[go('guias/','book','menu.guias','menu.guiasSub')],app:[`<button type="button" class="menu-dest" data-install${installHidden(window)?' hidden':''}><span class="menu-ico">${brandIcon('install')}</span><span class="menu-copy"><b>${tt('menu.instalar')}</b><small>${tt('menu.instalarSub')}</small></span>${brandIcon('arrow','menu-go')}</button>`,
  `<button type="button" class="menu-dest" data-theme-next><span class="menu-ico">${brandIcon('moon')}</span><span class="menu-copy"><b>${tt('menu.tema')}</b><small>${tt(THEME_KEY[themeNow()])}</small></span>${brandIcon('arrow','menu-go')}</button>`,
  ...(other?[`<button type="button" class="menu-dest" data-lang="${other[0]}"><span class="menu-ico">${brandIcon('lang')}</span><span class="menu-copy"><b lang="${other[0]}">${other[1]}</b><small>${tt('menu.idiomaSub')}</small></span>${brandIcon('arrow','menu-go')}</button>`]:[]),go('privacidad.html','lock','menu.privacidad','menu.privacidadSub')]};
 return `<header class="menu-welcome"><div class="eyebrow">${tt('menu.welcome')}</div><h2 class="sheet-h">${tt('menu.title')}</h2></header><nav class="menu-groups" aria-label="${tt('h.menu')}">${MENU_GROUPS.map(([g,label])=>`<section aria-labelledby="mg-${g}"><h3 id="mg-${g}">${label()}</h3>${rows(g).join('')}${(extra[g]||[]).join('')}</section>`).join('')}</nav>`}
function route(){const h=location.hash.replace(/^#\/?/,'')||'catalogo';const [r,arg]=h.split('/');let id='';if(arg){try{id=decodeURIComponent(arg)}catch(e){id=arg}}
 const tab={c:'catalogo',a:'artesanos',perfil:'mihoja',u:'mihoja',mihoja:'mihoja',actividades:'eventos',eventos:'eventos'}[r]||r;$$('.tabbar [data-tab],.topnav [data-tab]').forEach(a=>{const on=a.dataset.tab===tab;a.classList.toggle('active',on);if(a.tagName==='A'){if(on)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current')}});
 if(leafletMap&&r!=='lugares'){leafletMap.remove();leafletMap=null}
 (ROUTE_OF[r]||ROUTE_OF.catalogo).go(id);
 if(r!==route._last){window.scrollTo(0,0)}route._last=h;
 /* LHB-100: pintó una vista; el guardián de index.html quita el aviso si estaba (también cuando una ruta posterior sí carga) */
 if(window.LHB_BOOT)window.LHB_BOOT.ok()}
window.addEventListener('hashchange',route);
window.addEventListener('online',()=>{if(location.hash.includes('lugares'))route()});window.addEventListener('offline',()=>{if(location.hash.includes('lugares'))route()});
/* ---------- install (v21: botón en el home; LHB-121: un toque donde el navegador lo deja, Instalar arriba en todas las páginas y un recordatorio) ---------- */
/* LHB-121: lo que este navegador dice de sí. El aviso del navegador (__lhbBIP) lo guarda index.html antes que cualquier script con defer */
function installEnv(w){const n=w.navigator||{},ua=n.userAgent||'',ipad=/ipad/i.test(ua)||(n.platform==='MacIntel'&&n.maxTouchPoints>1);let mem=false;try{mem=!!w.localStorage.getItem('lhb_installed')}catch(x){}
 return {ua,ipad,ios:ipad||/iphone|ipod/i.test(ua),android:/android/i.test(ua),mobile:/Mobi|Android|iPhone|iPad|iPod/i.test(ua)||ipad,bip:!!w.__lhbBIP,installed:!!w.__lhbInstalled||mem,
  standalone:!!((w.matchMedia&&w.matchMedia('(display-mode: standalone)').matches)||n.standalone===true)}}
/* LHB-121: cómo se instala aquí. 'prompt': la ventana del navegador, de un toque. 'ios'/'ipad': Safari no deja que una página se instale sola; la guía
   señala su botón Compartir. 'inapp-android'/'inapp-ios': el navegador de Facebook, Instagram y parecidos no instala; hay que abrirla en Chrome o Safari.
   'qr': una computadora sin la ventana; el código lleva al teléfono. 'manual': el menú del navegador. 'none': ya está instalada (o se dijo que sí) */
const IN_APP=/FBAN|FBAV|FB_IAB|FBIOS|Instagram|Messenger|Line\/|MicroMessenger|Snapchat|musical_ly|BytedanceWebview/i;
function installHow(e){if(e.standalone)return 'none';if(e.bip)return 'prompt';if(e.installed)return 'none';
 if(IN_APP.test(e.ua))return e.ios?'inapp-ios':e.android?'inapp-android':'manual';
 if(e.ios)return e.ipad?'ipad':'ios';return e.mobile?'manual':'qr'}
function installHidden(w){return installHow(installEnv(w))==='none'}
/* LHB-121: el recordatorio. Nunca en la primera vista de la visita (salvo tras 30 s), a lo sumo una vez por visita, y tras «Ahora no» espera 3, 7, 14 y luego 30 días */
const REMIND_GAP=[3,7,14,30];
function remindDue(st,now,views,shown){if(shown||views<2)return false;if(!st||!st.n)return true;return now-st.at>=REMIND_GAP[Math.min(st.n,REMIND_GAP.length)-1]*864e5}
const ss={get(k){try{return sessionStorage.getItem(k)}catch(x){return null}},set(k,v){try{sessionStorage.setItem(k,v)}catch(x){}}};
const closeBar=()=>{const b=$('#instBar');if(b)b.remove()};
const syncInstall=()=>{const how=installHow(installEnv(window)),off=how==='none',b=$('#btnAdd');if(b)b.hidden=off;
 const t=$('#topInstall');if(t){t.hidden=off;const sp=t.querySelector('span'),k=how==='qr'?'ins.topQr':'ins.top';if(sp&&sp.dataset.i18n!==k){sp.dataset.i18n=k;sp.textContent=how==='qr'?tt('ins.topQr'):tt('ins.top')}}
 $$('.menu-dest[data-install]').forEach(m=>{m.hidden=off});/* Codex r2: el menú abierto también, si se supo después que ya está instalada */
 if(off)closeBar()};
function installedNow(say){window.__lhbInstalled=true;try{localStorage.setItem('lhb_installed',String(Date.now()))}catch(x){}closeBar();syncInstall();if(say)toast(tt('inst.ok'))}
function remindLater(){const st=LS.get('instRemind',null)||{n:0};try{LS.set('instRemind',{n:(st.n||0)+1,at:Date.now()})}catch(x){}closeBar()}
function remindBar(how){if($('#instBar'))return;const qr=how==='qr',b=document.createElement('aside');b.id='instBar';b.className='inst-bar';b.setAttribute('aria-label',tt('ins.barLabel'));
 b.innerHTML=`<img class="mark-l" src="icons/icon.svg" alt="" width="44" height="44"><img class="mark-d" src="icons/icon-dark.svg" alt="" width="44" height="44"><p class="inst-bar-t"><b>${tt('ins.barT')}</b><span>${qr?tt('ins.barQrS'):tt('ins.barS')}</span></p><div class="inst-bar-b"><button type="button" class="inst-bar-go" data-install>${qr?tt('ins.verQr'):tt('ins.instalar')}</button><button type="button" class="inst-bar-no" data-inst-later>${tt('ins.ahoraNo')}</button></div>`;
 ($('#app')||document.body).appendChild(b)}
/* no sale encima de la pantalla del idioma (espera a que se escoja) ni de una hoja abierta; si hay hoja, lo intenta en la próxima vista.
   Salió en esta visita: se recuerda también en memoria, porque sin sessionStorage (bloqueado) volvería a salir (Codex r1) */
let instShownMem=false;const instShown=()=>instShownMem||ss.get('lhb_instShown')==='1';
function maybeRemind(views){if(!remindDue(LS.get('instRemind',null),Date.now(),views,instShown()))return;
 const go=()=>{const how=installHow(installEnv(window));if(how==='none'||document.body.classList.contains('sheet-on')||instShown())return;instShownMem=true;ss.set('lhb_instShown','1');remindBar(how)};
 const L=window.LHB_INTRO;if(L&&typeof L.picking==='function'&&L.picking())L.afterPick(go);else go()}
async function doInstall(){const how=installHow(installEnv(window)),d=window.__lhbBIP;closeBar();
 if(how==='prompt'&&d){window.__lhbBIP=null;EXT.closeSheet();d.prompt();const r=await d.userChoice.catch(()=>null);if(r&&r.outcome==='accepted')installedNow(true);else remindLater();syncInstall();return}
 if(how==='none'){EXT.closeSheet();toast(tt('ins.yaEsta'));return}
 EXT.openSheet('instalar',how==='manual'?'':how)}
document.addEventListener('lhb-bip',syncInstall);
window.addEventListener('appinstalled',()=>installedNow(false));
matchMedia('(display-mode: standalone)').addEventListener?.('change',syncInstall);
document.addEventListener('click',e=>{if(!(e.target.closest&&e.target.closest('[data-install],[data-inst-later],[data-inst-done],[data-inst-copy],#btnAdd')))return;
 if(e.target.closest('[data-install],#btnAdd')){e.preventDefault();doInstall();return}
 if(e.target.closest('[data-inst-later]')){remindLater();return}
 if(e.target.closest('[data-inst-done]')){installedNow(false);return}
 if(e.target.closest('[data-inst-copy]')){const u=location.origin+'/',ok=()=>toast(tt('ins.copiado'));try{navigator.clipboard.writeText(u).then(ok,()=>toast(u))}catch(x){toast(u)}}});
/* Android sabe si la app de este sitio ya está en el teléfono (related_applications del manifest): entonces el navegador no la ofrece */
if(navigator.getInstalledRelatedApps)navigator.getInstalledRelatedApps().then(a=>{if(a&&a.length){window.__lhbInstalled=true;syncInstall()}}).catch(()=>{});
let views=+(ss.get('lhb_views')||0);const countView=()=>{views++;ss.set('lhb_views',String(views));maybeRemind(views)};
window.addEventListener('hashchange',countView);setTimeout(()=>maybeRemind(Math.max(views,2)),30e3);
if('serviceWorker' in navigator){const hadSW=!!navigator.serviceWorker.controller;let reloaded=false;navigator.serviceWorker.addEventListener('controllerchange',()=>{if(hadSW&&!reloaded){reloaded=true;location.reload()}});window.addEventListener('load',()=>navigator.serviceWorker.register('sw.js').then(r=>r.update&&r.update()).catch(()=>{}))}
route();topAvatar();refreshData();syncInstall();countView();
})();
