(()=>{'use strict';
const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const view=$('#view');const REDUCED_ALL=matchMedia('(prefers-reduced-motion: reduce)').matches;const VBArt=window.VBArt;
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
const uploads=()=>LS.get('uploads',[]);
const allCigars=()=>[...D.cigarros,...uploads().map(u=>({...u,yours:true}))];
const artisanById=id=>D.artesanos.find(a=>a.id===id);
const cigarById=id=>allCigars().find(c=>c.id===id);
const artisanName=c=>{const a=artisanById(c.artesano_id);return a?a.nombre:(c.artesano_texto||'Artesano sin perfil')};
/* ---------- art ---------- */
const CAPA_COLORS={claro:['#d8b47c','#b68a52'],connecticut:['#dcbd88','#b99256'],natural:['#b07a45','#8a5a30'],colorado:['#9b5a32','#74401f'],habano:['#a3683a','#7a4b25'],corojo:['#94532d','#6d3a1c'],sumatra:['#8a5634','#653c21'],criollo:['#9a6136','#704324'],maduro:['#5e3820','#3f2414'],oscuro:['#3e2416','#26150c'],'broadleaf':['#4a2b19','#2d190e']};
const capaKey=c=>{const s=(c||'').toLowerCase();for(const k of Object.keys(CAPA_COLORS))if(s.includes(k))return k;if(s.includes('ecuador'))return'habano';return'colorado'};
const BG=['#7fb0ff','#ffd27a','#ff9a9a','#a9c487','#c5cdf5','#8fb8ff'];
function hash(s){let h=0;for(const ch of String(s))h=(h*31+ch.charCodeAt(0))|0;return Math.abs(h)}
function starPath(cx,cy,R){const r=R*.382;let p='';for(let i=0;i<10;i++){const a=-Math.PI/2+i*Math.PI/5,rr=i%2?r:R;p+=(i?'L':'M')+(cx+rr*Math.cos(a)).toFixed(1)+','+(cy+rr*Math.sin(a)).toFixed(1)}return p+'Z'}
function cigarSVG(c){const [w1,w2]=CAPA_COLORS[capaKey(c.capa)];const ix=allCigars().findIndex(x=>x.id===c.id);const bg=BG[(ix<0?hash(c.id):ix)%BG.length];const h=hash(c.nombre);const tilt=-8+(h%7);
 return `<svg viewBox="0 0 400 300" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Ilustración de ${esc(c.nombre)}"><defs>
 <linearGradient id="w${c.id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${w1}"/><stop offset=".55" stop-color="${w2}"/><stop offset="1" stop-color="${w2}" stop-opacity=".85"/></linearGradient>
 <pattern id="t${c.id}" width="40" height="40" patternUnits="userSpaceOnUse"><rect width="40" height="40" fill="${bg}"/><path d="M0 20h40M20 0v40" stroke="#fff" stroke-opacity=".18" stroke-width="2"/><circle cx="20" cy="20" r="6" fill="none" stroke="#fff" stroke-opacity=".14" stroke-width="2"/></pattern></defs>
 <rect width="400" height="300" fill="url(#t${c.id})"/><rect width="400" height="300" fill="#1d130d" opacity=".18"/>
 <g transform="rotate(${tilt} 200 150)"><ellipse cx="205" cy="196" rx="160" ry="14" fill="#000" opacity=".18"/>
 <rect x="40" y="128" width="320" height="46" rx="23" fill="url(#w${c.id})"/>
 <path d="M60 140 C 140 134 260 146 345 138 M70 160 C 160 166 250 154 340 162" stroke="#000" stroke-opacity=".14" stroke-width="2" fill="none"/>
 <circle cx="352" cy="151" r="20" fill="${w2}"/><circle cx="356" cy="151" r="15" fill="#3a2214" opacity=".35"/>
 <rect x="248" y="124" width="46" height="54" rx="5" fill="#ed0000"/><rect x="248" y="141" width="46" height="20" fill="#f4e9d6"/>
 <path d="${starPath(271,151,9)}" fill="#0050f0"/></g></svg>`}
const FACADE=['#0050f0','#ed0000','#f8f8f4','#ed0000','#f8f8f4','#0050f0'];
function initials(n){const ov=(D.artesanos||[]).find(x=>x.nombre===n&&x.iniciales);if(ov)return ov.iniciales;const f=String(n).trim().split(/\s+/)[0].replace(/[^A-Z]/g,'');if(f.length>=2&&f.length<=4&&f===String(n).trim().split(/\s+/)[0].replace(/[.,]/g,''))return f;return String(n).replace(/[^\p{L}\p{N} ]/gu,' ').split(/\s+/).filter(w=>w&&!/^(de|del|la|las|los|el|y|cigar|cigars|cigarros|tabacalera|corp)$/i.test(w)).slice(0,2).map(w=>w[0].toUpperCase()).join('')||'VB'}
const LOGOS=new Set(["jfc-hoja-boricua", "don-rey-cigar", "el-club-del-turro", "don-collins", "finca-neo-jibairo", "willys-cigars", "san-pedrito-cigars", "yambo-cigars", "el-chapu-pr", "el-buho-ricamontes", "cohoba-cigars", "cigarros-caimito", "tabacalera-la-trascendencia"]);
function logoId(n){const a=(D.artesanos||[]).find(x=>x.nombre===n);return a&&LOGOS.has(a.id)?a.id:null}
function mono(name,size){const lid=logoId(name);if(lid)return `<span class="mono has-logo" style="width:${size}px;height:${size}px"><img src="img/logos/${lid}.webp" width="${size}" height="${size}" alt="" ${size>80?'':'loading="lazy" '}decoding="async"></span>`;const bg=FACADE[hash(name)%FACADE.length];return `<span class="mono" style="width:${size}px;height:${size}px;background:${bg};font-size:${Math.round(size*.38)}px"><svg viewBox="0 0 100 100" aria-hidden="true"><path d="M50 8 C 72 22 78 46 70 66 C 64 80 56 88 50 90 C 44 88 36 80 30 66 C 22 46 28 22 50 8Z" fill="#fff" opacity=".22"/></svg><b>${esc(initials(name))}</b></span>`}
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
const fortLabel=f=>f?f[0].toUpperCase()+f.slice(1):'—';
const PROTO_NOTE=`<p class="note"><b>Prototipo</b> — información pública, sujeta a verificación.</p>`;
const head=(eyebrow,title,lead,art)=>`<header class="sec-head"><div><div class="eyebrow">${eyebrow}</div><h1>${title}</h1>${lead?`<p class="lead">${lead}</p>`:''}</div><div class="sec-art">${art}</div></header>`;
const emptyCoqui=msg=>`<div class="empty">${VBArt.coqui('coqui-empty')}<div>${msg}</div></div>`;
/* ---------- cards ---------- */
const fotoOf=c=>(!c||c.yours||!window.LHB_FOTOS)?null:(window.LHB_FOTOS[c.id]||null);
async function hydratePhotos(root=view){for(const el of $$('[data-photo]',root)){const u=await photoURL(el.dataset.photo);if(u){el.innerHTML=`<img src="${u}" alt="">`}}}
function cigarCard(c){const favs=EXT.S().favs.cigarros;return `<a class="card" href="#/c/${encodeURIComponent(c.id)}">${(f=>f?`<div class="ph has-foto"><img src="${esc(f.thumb)}" alt="Foto del cigarro ${esc(c.nombre)}" width="600" height="300" decoding="async"></div>`:`<div class="ph" ${c.foto?`data-photo="${esc(c.foto)}"`:''}>${cigarSVG(c)}</div>`)(fotoOf(c))}
 ${favs.includes(c.id)?'<span class="fav-dot" aria-label="Favorito">♥</span>':''}
 <div class="body"><div class="name">${esc(c.nombre)}</div><div class="meta">${esc(artisanName(c))}${c.pueblo?' · '+esc(c.pueblo):''}</div>
 <div class="pills">${c.capa?`<span class="pill">${esc(c.capa)}</span>`:''}${c.fortaleza?`<span class="pill f-${c.fortaleza}">${fortLabel(c.fortaleza)}</span>`:''}${c.yours?'<span class="pill yours">Tuyo</span>':''}</div></div></a>`}
/* ---------- views ---------- */
const state={q:'',capa:'',fort:'',art:'',lugMode:'mapa',lugCat:'',lugTown:''};
function vCatalogo(){const cs=allCigars();const capas=[...new Set(cs.map(c=>c.capa).filter(Boolean))].sort();
 const q=state.q.toLowerCase();const list=cs.filter(c=>(!q||[c.nombre,artisanName(c),c.pueblo,c.capa,c.notas].join(' ').toLowerCase().includes(q))&&(!state.capa||c.capa===state.capa)&&(!state.fort||c.fortaleza===state.fort)&&(!state.art||c.artesano_id===state.art));
 view.innerHTML=`<section class="hero">${FACADES_BAR}<img class="hero-bg" src="img/hero/banner.webp" alt="" width="760" height="422" decoding="async"><div class="eyebrow">Catálogo</div><h1>Cigarros <em>hechos</em> en Puerto Rico</h1><p>Las vitolas de nuestros artesanos, de norte a sur y de este a oeste de nuestra isla.</p></section><button type="button" class="btn-add" id="btnAdd"${installHidden(window)?' hidden':''}>📲 Añadir a mi pantalla</button>
 <nav class="tiles" aria-label="Explora"><a href="#/cata">${VBArt.leaf('#8fd162')}<b>Cata guiada</b><small>Paso a paso</small></a><a href="#/maridajes">${VBArt.leaf('#ffd27a')}<b>Maridajes</b><small>Ron y café</small></a><a href="#/eventos">${VBArt.leaf('#ff8a80')}<b>Eventos</b><small>Humo y Tambor</small></a><a href="#/podcast">${VBArt.leaf('#8fb8ff')}<b>Podcast</b><small>Cigars Podcast</small></a></nav>
 <label class="search"><svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/></svg><span class="sr">Buscar</span><input id="q" type="search" placeholder="Buscar vitola, artesano, pueblo…" value="${esc(state.q)}" autocomplete="off"></label>
 <div class="chips" role="group" aria-label="Fortaleza"><button class="chip" data-fort="" aria-pressed="${!state.fort}">Toda fortaleza</button>${FORT.map(f=>`<button class="chip" data-fort="${f}" aria-pressed="${state.fort===f}">${fortLabel(f)}</button>`).join('')}</div>
 <div class="filter-row"><select id="fCapa" aria-label="Capa"><option value="">Capa: todas</option>${capas.map(x=>`<option ${state.capa===x?'selected':''}>${esc(x)}</option>`).join('')}</select>
 <select id="fArt" aria-label="Artesano"><option value="">Artesano: todos</option>${D.artesanos.map(a=>`<option value="${esc(a.id)}" ${state.art===a.id?'selected':''}>${esc(a.nombre)}</option>`).join('')}</select></div>
 ${list.length?`<div class="grid">${list.map(cigarCard).join('')}</div>`:emptyCoqui('No hay vitolas con esos filtros.<br><a href="#/subir" style="color:var(--gold)">Sube la tuya</a>')}
 ${PROTO_NOTE}`;
 const qi=$('#q');qi.addEventListener('input',e=>{state.q=e.target.value;const pos=e.target.selectionStart;vCatalogo();const n=$('#q');n.focus();n.setSelectionRange(pos,pos)});
 $$('[data-fort]').forEach(b=>b.onclick=()=>{state.fort=b.dataset.fort;vCatalogo()});
 $('#fCapa').onchange=e=>{state.capa=e.target.value;vCatalogo()};$('#fArt').onchange=e=>{state.art=e.target.value;vCatalogo()};hydratePhotos()}
function vCigar(id){const c=cigarById(id);if(!c){view.innerHTML=`<div class="empty">No encontramos esa vitola.</div>`;return}
 const a=artisanById(c.artesano_id);const favs=EXT.S().favs.cigarros;const rat=EXT.S().ratings[c.id]||0;const isFav=favs.includes(c.id);
 view.innerHTML=`<button class="back" data-back>‹ Volver</button>
 ${(f=>f?`<figure class="detail-foto"><div class="detail-ph has-foto"><img id="fotoMain" src="${esc(f.img)}" alt="Foto del cigarro ${esc(c.nombre)}" width="1000" height="500" loading="lazy" decoding="async"></div><figcaption class="foto-cred">${esc(f.credito)}${f.match==='linea'?' · <span class="foto-linea">Foto de la línea</span>':''}</figcaption>${f.galeria?`<div class="foto-gal" role="group" aria-label="Más fotos">${f.galeria.map((g,i)=>`<button type="button" class="foto-th" data-full="${esc(g.img)}" aria-pressed="${i===0}" aria-label="Ver foto: ${esc(g.t)}"><img src="${esc(g.thumb)}" alt="" width="600" height="300" loading="lazy"><span>${esc(g.t)}</span></button>`).join('')}</div>`:''}</figure>`:`<div class="detail-ph" ${c.foto?`data-photo="${esc(c.foto)}"`:''}>${cigarSVG(c)}</div>`)(fotoOf(c))}
 <div class="detail-head"><div><div class="eyebrow">${c.yours?'Subido por ti':'Hecho en Puerto Rico'}</div><h1>${esc(c.nombre)}</h1></div>
 <button class="fav-btn" id="fav" aria-pressed="${isFav}">${isFav?'♥ Guardado':'♡ Guardar en favoritos'}</button></div>
 <div class="specs"><div class="spec"><small>Capa</small><span>${esc(c.capa||'No publicada')}</span></div><div class="spec"><small>Fortaleza</small><span>${c.fortaleza?fortLabel(c.fortaleza):'No publicada'}</span></div>
 <div class="spec"><small>Origen</small><span>${esc(c.pueblo||'Puerto Rico')}</span></div><div class="spec"><small>Vitola</small><span>${esc((c.vitolas&&c.vitolas.length)?c.vitolas.join(' · '):'No publicada')}</span></div></div>
 <div><div class="eyebrow">Tu calificación</div><div class="stars" role="radiogroup" aria-label="Calificación">${[1,2,3,4,5].map(n=>`<button role="radio" aria-checked="${n===rat}" aria-label="${n} estrellas" data-star="${n}" class="${n<=rat?'on':''}">★</button>`).join('')}</div></div>
 ${EXT.cigarExtras(c)}
 ${a?`<a class="artisan-link" href="#/a/${encodeURIComponent(a.id)}">${mono(a.nombre,44)}<div><div class="t" style="font-weight:600">${esc(a.nombre)}</div><div class="meta" style="font-size:12.5px;color:var(--muted)">${esc(a.pueblo||'')} · Ver perfil y enlaces</div></div><span class="go">›</span></a>`:(c.artesano_texto?`<p class="meta">Artesano: ${esc(c.artesano_texto)}</p>`:'')}
 ${c.notas?`<p class="notes">${esc(c.notas)}</p>`:''}
 ${c.yours?`<button class="btn secondary" id="del" style="margin-top:12px">Borrar mi subida</button>`:''}
 ${(c.fuentes&&c.fuentes.length)?`<div class="sources">Fuentes: ${c.fuentes.map(u=>`<a href="${esc(u)}" target="_blank" rel="noopener">${esc(u.replace(/^https?:\/\/(www\.)?/,'').slice(0,48))}</a>`).join(' · ')}</div>`:''}
 ${c.yours?'':PROTO_NOTE}`;
 $('[data-back]').onclick=()=>history.length>1?history.back():(location.hash='#/catalogo');
 $$('.foto-th').forEach(b=>b.onclick=()=>{const m=$('#fotoMain');if(m)m.src=b.dataset.full;$$('.foto-th').forEach(x=>x.setAttribute('aria-pressed',String(x===b)))});
 $('#fav').onclick=()=>{const on=EXT.toggleFav('cigarros',c.id);toast(on?'Guardado en favoritos':'Quitado de favoritos');const y=scrollY;vCigar(id);scrollTo(0,y)};
 $$('[data-star]').forEach(b=>b.onclick=()=>{EXT.setRating(c.id,+b.dataset.star);const y=scrollY;vCigar(id);scrollTo(0,y)});
 const del=$('#del');if(del)del.onclick=async()=>{if(!confirm('¿Borrar esta vitola?'))return;LS.set('uploads',uploads().filter(u=>u.id!==c.id));if(c.foto)await idb.del(c.foto).catch(()=>{});toast('Borrada');location.hash='#/perfil'};
 hydratePhotos()}
function artTags(a){const t=[];if(a.etiqueta)t.push(`<span class="atag rd">${esc(a.etiqueta)}</span>`);if(a.por_confirmar)t.push(`<span class="atag pend">${esc(a.por_confirmar)}</span>`);return t.length?`<div class="atags">${t.join('')}</div>`:''}
function vArtesanos(){view.innerHTML=`${head('Artesanos','Manos <em>boricuas</em>','Tabacaleras y torcedores de la isla, con su historia y dónde encontrarlos.',VBArt.flamboyan())}
 <div class="list">${D.artesanos.map(a=>{const n=allCigars().filter(c=>c.artesano_id===a.id).length;return `<a class="row" href="#/a/${encodeURIComponent(a.id)}">${mono(a.nombre,50)}<div><div class="t">${esc(a.nombre)}</div><div class="s">${esc(a.pueblo||'')}${a.tipo?(a.pueblo?' · ':'')+esc(a.tipo):''}${n?` · ${n} vitola${n>1?'s':''}`:''}</div>${artTags(a)}</div><span class="go">›</span></a>`}).join('')||'<div class="empty">Pronto.</div>'}</div>${PROTO_NOTE}`}
function vArtesano(id){const a=artisanById(id);if(!a){view.innerHTML='<div class="empty">No encontramos ese artesano.</div>';return}
 const cs=allCigars().filter(c=>c.artesano_id===a.id);const ig=a.instagram_label||igHandle(a.instagram);
 view.innerHTML=`<button class="back" data-back>‹ Artesanos</button>
 <section class="profile-hero">${mono(a.nombre,104)}<h1>${esc(a.nombre)}</h1><div class="town">${esc(a.pueblo||(a.por_confirmar?'':'Puerto Rico'))}${a.tipo?(a.pueblo?' · ':'')+esc(a.tipo):''}</div>${artTags(a)}</section>
 ${EXT.artisanExtras(a)}
 ${a.nota?`<p class="note art-note">${esc(a.nota)}</p>`:''}
 ${a.historia?`<p class="story">${esc(a.historia)}</p>`:''}
 <div class="links">${linkBtn('ig',a.instagram,ig||'Instagram')}${linkBtn('wa',a.whatsapp,'WhatsApp')}${linkBtn('web',a.web,'Sitio web')}${linkBtn('fb',a.facebook,'Facebook')}${linkBtn('yt',a.youtube,'YouTube')}${EXT.firstURL(a.donde_comprar)?linkBtn('buy',EXT.firstURL(a.donde_comprar),'Dónde comprar'):''}</div>
 ${a.donde_comprar?`<p class="notes"><b>Dónde comprar:</b> ${esc(EXT.scrub(a.donde_comprar))}</p>`:''}
 ${cs.length?`<div class="section-title"><h2>Sus vitolas</h2></div><div class="grid">${cs.map(cigarCard).join('')}</div>`:''}
 ${(a.fuentes&&a.fuentes.length)?`<div class="sources">Fuentes: ${a.fuentes.map(u=>`<a href="${esc(u)}" target="_blank" rel="noopener">${esc(u.replace(/^https?:\/\/(www\.)?/,'').slice(0,48))}</a>`).join(' · ')}</div>`:''}${PROTO_NOTE}`;
 $('[data-back]').onclick=()=>history.length>1?history.back():(location.hash='#/artesanos');hydratePhotos()}
/* ---------- subir ---------- */
let pendingPhoto=null;
function resizeImage(file,max=1100,q=.8){return new Promise((res,rej)=>{const img=new Image();const u=URL.createObjectURL(file);img.onload=()=>{const s=Math.min(1,max/Math.max(img.naturalWidth,img.naturalHeight));const cv=document.createElement('canvas');cv.width=Math.round(img.naturalWidth*s);cv.height=Math.round(img.naturalHeight*s);cv.getContext('2d').drawImage(img,0,0,cv.width,cv.height);URL.revokeObjectURL(u);cv.toBlob(b=>b?res(b):rej(new Error('blob')),'image/jpeg',q)};img.onerror=()=>{URL.revokeObjectURL(u);rej(new Error('img'))};img.src=u})}
function vSubir(){pendingPhoto=null;let fort='';
 view.innerHTML=`${head('Subir','Añade una <em>vitola</em>','Foto, artesano, capa y Fortaleza. Se guarda en tu cel.',VBArt.leaf('#d9a75a','sec-leaf'))}
 <form class="form" id="upForm" novalidate>
 <div><div class="photo-drop" id="drop"><div class="ph-empty">📷<br>Sin foto todavía</div></div>
 <div class="photo-btns"><label>📷 Cámara<input type="file" accept="image/*" capture="environment" id="fCam"></label><label>🖼️ Galería<input type="file" accept="image/*" id="fGal"></label></div></div>
 <div class="field"><label for="uName">Nombre de la vitola</label><input id="uName" required maxlength="60" placeholder="Ej. Robusto de la casa"></div>
 <div class="field"><label for="uArt">Artesano</label><select id="uArt"><option value="">Selecciona…</option>${D.artesanos.map(a=>`<option value="${esc(a.id)}">${esc(a.nombre)}</option>`).join('')}<option value="__otro">Otro (escribir)</option></select></div>
 <div class="field" id="otroWrap" hidden><label for="uArtTxt">Nombre del artesano</label><input id="uArtTxt" maxlength="60"></div>
 <div class="field"><label for="uCapa">Capa</label><input id="uCapa" list="capas" maxlength="40" placeholder="Ej. Habano, Maduro, Connecticut"><datalist id="capas">${['Claro','Connecticut','Natural','Colorado','Habano','Corojo','Criollo','Maduro','Oscuro'].map(x=>`<option value="${x}">`).join('')}</datalist></div>
 <div class="field"><label>Fortaleza</label><div class="seg" role="group" aria-label="Fortaleza">${FORT.map(f=>`<button type="button" data-f="${f}" aria-pressed="false">${fortLabel(f)}</button>`).join('')}</div></div>
 <div class="field"><label for="uPueblo">Pueblo</label><input id="uPueblo" maxlength="40" placeholder="Ej. Cayey"></div>
 <div class="field"><label for="uVit">Vitola / medida</label><input id="uVit" maxlength="40" placeholder="Ej. Robusto 5 x 50"></div>
 <div class="field"><label for="uNotes">Notas</label><textarea id="uNotes" maxlength="600" placeholder="Sabores, maridaje, dónde lo conseguiste…"></textarea></div>
 <button class="btn" type="submit" id="uSave">Guardar vitola</button></form>`;
 const onFile=async e=>{const f=e.target.files&&e.target.files[0];if(!f)return;try{pendingPhoto=await resizeImage(f);$('#drop').innerHTML=`<img src="${URL.createObjectURL(pendingPhoto)}" alt="Foto seleccionada">`}catch(err){toast('No pude leer esa foto')}};
 $('#fCam').onchange=onFile;$('#fGal').onchange=onFile;
 $('#uArt').onchange=e=>{$('#otroWrap').hidden=e.target.value!=='__otro'};
 $$('[data-f]').forEach(b=>b.onclick=()=>{fort=b.dataset.f;$$('[data-f]').forEach(x=>x.setAttribute('aria-pressed',x===b))});
 $('#upForm').onsubmit=async e=>{e.preventDefault();const name=$('#uName').value.trim();if(!name){toast('Ponle nombre a la vitola');$('#uName').focus();return}
  const id='u'+Date.now().toString(36);let foto=null;if(pendingPhoto){foto='foto_'+id;await idb.put(foto,pendingPhoto)}
  const artSel=$('#uArt').value;const item={id,nombre:name,artesano_id:artSel&&artSel!=='__otro'?artSel:'',artesano_texto:artSel==='__otro'?$('#uArtTxt').value.trim():'',capa:$('#uCapa').value.trim(),fortaleza:fort||null,pueblo:$('#uPueblo').value.trim(),vitolas:$('#uVit').value.trim()?[$('#uVit').value.trim()]:[],notas:$('#uNotes').value.trim(),foto,creado:new Date().toISOString()};
  LS.set('uploads',[item,...uploads()]);toast('¡Vitola guardada!');location.hash='#/c/'+id}}
/* ---------- lugares ---------- */
let leafletMap=null;const LEAFC={lounge:'#ed2a2a',venta:'#7fae55'};const REDUCED=matchMedia('(prefers-reduced-motion: reduce)').matches;
function leafBurst(host,x,y,color){if(REDUCED||!host)return;const box=document.createElement('div');box.className='leaf-burst';box.style.left=x+'px';box.style.top=y+'px';
 const cols=[color||'#d9a75a','#d9a75a','#b9864a','#7fae55'];for(let i=0;i<9;i++){const s=document.createElement('span');const ang=(-160+i*(140/8))*Math.PI/180;const dist=38+Math.random()*34;
  s.style.setProperty('--dx',(Math.cos(ang)*dist).toFixed(0)+'px');s.style.setProperty('--dy',(Math.sin(ang)*dist).toFixed(0)+'px');s.style.setProperty('--fall',(46+Math.random()*40).toFixed(0)+'px');s.style.setProperty('--rot',((Math.random()*2-1)*540).toFixed(0)+'deg');s.style.animationDelay=(i*25)+'ms';
  s.innerHTML=VBArt.leaf(cols[i%cols.length]);box.appendChild(s)}host.appendChild(box);setTimeout(()=>box.remove(),1500)}
const PROJ={lon0:-67.3,lon1:-65.2,lat0:17.88,lat1:18.54,W:1000,k:Math.cos(18.2*Math.PI/180)};
const ISLAND='M13.6,88.8 30.8,120.2 50.3,125.8 52.6,136.9 59.5,146.9 60.2,157.0 70.5,166.3 68.9,166.4 68.5,173.5 54.7,187.9 58.7,194.6 54.0,203.2 56.3,215.0 55.6,218.6 47.9,224.9 49.9,226.3 47.9,230.3 48.9,234.9 50.5,230.5 55.1,236.5 52.2,238.4 49.2,237.3 46.8,242.4 48.1,246.9 43.0,252.7 62.3,257.7 58.3,267.0 63.7,262.0 63.4,267.3 55.5,268.0 57.6,266.1 44.8,271.2 41.2,274.4 40.3,279.1 41.9,293.5 44.3,292.6 43.4,290.8 42.1,292.8 41.7,282.3 44.6,284.3 42.6,285.8 46.8,293.4 41.9,293.5 41.6,294.8 48.8,294.6 51.0,299.4 49.7,303.9 53.0,302.8 55.2,305.2 51.2,294.9 57.7,287.9 65.8,289.6 67.1,293.8 82.2,295.1 83.0,297.6 87.3,297.2 85.4,295.8 88.7,294.6 88.2,297.3 92.9,297.9 98.6,295.0 98.6,292.2 98.3,293.1 96.9,292.2 101.9,289.7 102.1,289.1 101.3,289.2 100.9,288.4 100.9,288.1 101.1,288.0 103.4,287.1 103.1,290.4 106.0,291.5 105.4,287.7 108.4,284.7 107.4,284.9 107.0,284.3 129.7,284.3 133.4,287.0 135.3,282.7 138.2,284.1 136.2,287.1 141.4,290.4 140.1,284.5 148.8,285.5 152.2,294.7 156.6,295.5 164.0,301.6 163.2,305.2 167.8,303.7 178.9,307.2 181.4,304.7 175.1,301.9 175.6,299.2 182.2,298.1 186.1,294.6 182.2,290.8 175.7,289.8 179.0,288.3 176.7,286.0 178.2,284.3 183.8,283.7 180.6,284.5 180.5,287.2 187.8,288.4 189.5,296.3 198.8,294.2 201.2,296.8 203.9,294.1 207.1,298.2 211.3,292.5 219.8,295.9 244.1,284.4 245.8,277.8 241.6,282.0 235.4,283.3 234.9,278.9 239.3,279.8 239.0,273.4 242.6,274.3 254.0,265.8 256.4,269.4 255.1,271.0 259.2,270.0 260.1,271.8 254.9,272.5 254.8,273.7 258.1,273.1 258.8,275.0 260.4,271.8 261.7,272.9 258.9,275.2 258.3,279.5 255.9,278.8 258.4,282.7 262.1,276.4 268.5,276.3 271.6,274.6 271.6,273.8 272.4,271.6 274.1,270.4 271.7,274.6 277.8,275.6 288.1,283.0 295.3,283.9 298.6,287.5 311.1,280.5 322.2,279.3 325.8,281.4 324.3,283.2 326.1,285.1 323.2,286.3 326.8,288.8 324.2,289.4 328.5,288.4 330.2,286.4 336.0,285.3 342.9,289.9 382.1,276.0 398.1,275.4 407.5,281.2 414.4,290.6 428.1,294.7 435.4,300.1 434.9,301.9 439.6,297.3 437.4,296.5 439.9,295.9 440.5,293.8 439.1,294.8 438.3,295.1 438.2,295.0 439.6,292.8 442.9,295.2 444.5,294.3 442.8,290.4 447.6,290.2 445.2,288.4 446.3,286.6 450.2,287.7 457.4,282.7 464.9,281.3 477.2,291.1 478.7,291.4 477.9,288.8 480.2,289.6 481.5,299.7 487.6,296.5 491.7,298.0 491.3,296.4 494.9,302.7 501.6,305.4 500.8,303.6 502.7,303.1 498.7,303.4 494.1,297.5 497.1,297.7 499.2,302.1 503.5,298.9 504.5,301.7 505.5,299.7 504.8,298.1 505.4,297.4 506.5,298.5 508.8,299.0 505.0,298.3 508.0,300.5 505.7,301.1 508.8,305.1 510.0,303.3 508.9,298.8 507.8,297.6 511.9,294.6 513.4,296.2 515.3,291.9 517.3,293.0 516.4,291.0 520.5,289.0 534.0,295.0 535.4,296.0 536.3,298.7 533.0,298.5 531.8,302.0 517.5,298.3 520.7,303.5 518.8,304.6 523.8,305.9 527.9,301.5 542.7,304.7 544.5,301.9 543.0,306.6 554.3,298.6 565.3,296.4 580.3,287.3 586.4,287.5 595.9,294.8 612.8,279.8 622.0,281.5 628.4,286.8 634.0,283.5 640.6,285.5 651.7,282.3 657.9,282.9 670.5,274.6 673.9,276.8 680.6,267.3 686.8,268.1 693.6,262.6 698.1,264.6 699.9,260.5 698.0,251.3 699.5,245.3 696.1,244.0 700.9,244.4 705.9,238.9 709.9,242.2 714.3,240.2 716.7,233.8 713.2,231.8 716.8,231.3 716.0,228.0 719.5,225.2 720.0,219.3 724.8,213.1 725.3,205.0 731.8,194.3 741.9,188.0 746.5,179.1 753.4,175.3 758.0,179.1 763.1,178.4 765.2,181.6 764.2,176.6 766.9,172.3 775.3,170.5 779.7,166.5 784.9,170.3 790.3,170.7 791.2,167.0 794.5,170.1 796.3,166.6 792.3,167.0 794.7,164.8 793.9,162.0 789.6,161.3 792.7,158.5 790.5,156.1 795.3,152.5 801.9,156.7 804.4,164.9 805.3,162.8 807.6,165.0 810.1,164.2 806.0,162.4 807.5,161.6 806.2,155.3 812.5,158.3 814.4,156.1 808.4,151.7 804.8,144.6 806.9,139.8 800.7,145.2 802.1,147.2 804.8,144.6 802.5,147.3 804.2,150.0 798.7,147.2 797.5,143.6 800.6,145.2 801.1,143.3 794.6,137.0 797.6,130.4 793.7,129.8 793.0,128.3 794.7,127.9 794.3,125.6 793.6,128.0 792.2,125.9 797.8,118.3 795.8,114.3 796.8,104.6 793.4,101.4 794.8,98.1 792.2,97.2 797.7,91.7 797.9,87.2 800.5,86.1 803.0,78.1 800.8,76.3 797.7,76.9 793.3,85.2 790.8,85.1 788.4,79.8 783.2,87.8 774.5,88.9 771.7,86.0 765.7,87.0 757.7,84.0 752.4,78.9 751.8,75.4 741.0,79.7 732.3,71.2 727.7,69.6 727.9,63.4 716.3,67.8 714.9,66.2 719.2,61.6 718.9,59.3 712.5,65.1 708.8,65.5 696.9,53.9 677.6,51.0 666.3,43.8 663.6,43.8 663.0,46.5 654.6,47.6 634.0,43.2 628.9,40.2 627.4,41.6 622.9,39.8 620.3,45.3 614.0,48.0 606.4,47.7 600.4,42.8 596.2,43.8 580.6,39.3 583.3,42.6 569.0,40.1 568.8,42.9 574.1,46.5 578.6,46.6 580.0,50.1 566.3,56.0 565.6,48.9 563.8,49.3 566.4,47.9 559.0,49.1 556.4,47.9 553.4,44.5 553.1,41.4 557.4,44.6 555.2,46.3 557.7,44.8 553.0,39.7 555.4,34.2 552.5,32.5 553.9,36.7 541.5,44.8 531.4,40.3 530.6,34.8 533.6,33.5 533.8,32.3 530.3,32.2 530.0,35.3 527.1,37.0 514.0,37.1 504.6,35.8 497.5,31.2 490.3,29.9 482.0,34.1 476.8,31.2 466.4,32.2 458.7,27.3 455.8,29.6 438.8,25.2 437.6,28.6 431.1,25.2 431.5,23.3 428.1,23.0 427.5,25.6 409.9,27.0 405.3,34.4 401.0,35.6 375.5,31.6 372.8,29.0 371.1,29.6 368.8,27.7 364.3,29.4 352.9,25.0 349.8,27.4 340.8,27.9 320.5,22.8 313.2,23.5 311.3,25.7 297.8,25.1 293.5,29.5 285.0,29.0 283.9,30.0 285.3,29.1 285.0,31.1 285.8,31.2 286.8,31.6 286.8,32.4 286.7,31.8 286.1,31.4 285.4,31.2 285.0,31.1 281.3,34.1 265.7,32.9 241.1,23.3 224.7,26.4 206.1,24.0 185.1,28.0 168.9,24.1 153.3,24.2 134.7,14.6 97.4,12.1 77.4,15.8 63.8,27.5 62.5,37.4 68.8,54.2 67.0,62.2 49.8,74.1 35.2,80.9 18.7,85.0 13.6,88.8Z M559.5,34.2 563.6,40.6 568.5,37.7 577.4,40.3 579.2,38.7 577.3,36.2 559.5,34.2Z M820.1,219.2 825.9,226.0 837.2,230.0 845.5,229.5 855.2,224.0 866.7,222.3 871.9,224.1 873.0,226.7 872.6,223.1 876.8,222.3 879.0,223.9 877.7,226.6 880.1,227.4 880.2,225.1 882.2,226.8 885.5,221.8 880.6,220.8 881.5,218.2 885.7,218.4 886.8,224.6 893.7,222.5 891.8,218.5 887.6,217.3 891.3,214.4 895.7,219.8 897.0,216.5 901.0,216.8 900.6,213.6 902.1,216.2 913.5,214.1 916.6,216.9 916.6,208.6 919.9,208.1 921.4,210.1 922.8,205.0 924.4,208.4 928.6,207.1 929.0,209.4 933.4,209.3 931.9,212.7 927.0,213.3 930.1,215.0 934.4,213.3 934.1,210.2 936.1,211.9 936.5,207.6 938.9,209.9 941.7,207.2 948.2,207.3 949.2,202.8 952.8,203.0 954.5,206.7 968.1,203.3 963.8,203.0 957.9,196.3 950.7,199.7 908.1,189.2 887.2,191.4 881.7,197.4 853.8,203.6 851.5,203.6 850.6,194.8 851.4,204.4 835.4,210.8 820.7,210.4 820.1,219.2Z M931.3,95.8 937.9,106.2 937.6,109.3 943.8,111.0 947.0,119.9 952.4,119.2 951.8,123.1 955.0,124.8 958.6,131.6 959.3,128.4 961.2,128.5 960.7,123.4 957.5,124.6 958.7,121.1 952.5,119.2 951.3,115.1 956.5,116.4 955.9,115.3 956.4,114.3 958.5,116.9 963.2,117.1 961.0,118.8 963.4,119.1 963.7,122.2 968.9,121.8 970.6,125.6 973.9,123.6 972.3,115.9 978.9,118.5 975.3,110.7 965.0,104.8 959.2,105.1 956.6,102.4 953.2,104.9 947.7,101.2 945.9,105.3 943.5,105.7 934.2,95.2 931.3,95.8Z';
function proj(lat,lng){const sx=PROJ.W/(PROJ.lon1-PROJ.lon0);return[(lng-PROJ.lon0)*sx,(PROJ.lat1-lat)*sx/PROJ.k]}
function placeCard(p){const ig=igHandle(p.instagram);return `<div class="pop"><div class="t">${esc(p.nombre)}</div><div class="s">${esc(p.tipo||'')}${p.pueblo?' · '+esc(p.pueblo):''}${p.direccion?'<br>'+esc(p.direccion):''}${p.horario?'<br>'+esc(p.horario):''}</div>
 <div class="links">${linkBtn('ig',p.instagram,ig||'Instagram')}<a class="lbtn go-map" href="${esc(goLink(p))}" target="_blank" rel="noopener">${ICON.map}Cómo llegar</a>${p.web?linkBtn('web',p.web,'Sitio web'):''}</div>${EXT.placeActions(p)}</div>`}
function filteredPlaces(){return D.places.filter(p=>(!state.lugCat||p.categoria===state.lugCat)&&(!state.lugTown||p.pueblo===state.lugTown))}
function vLugares(arg){if(arg==='ruta')state.lugMode='ruta';else if(state.lugMode==='ruta')state.lugMode='mapa';const ru=state.lugMode==='ruta';const towns=[...new Set(D.places.map(p=>p.pueblo).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'es'));const ps=filteredPlaces();
 const nL=D.places.filter(p=>p.categoria==='lounge').length,nV=D.places.filter(p=>p.categoria==='venta').length;
 view.innerHTML=`${head('Lugares','Dónde <em>disfrutar</em> y comprar',`${nL} lounges y ${nV} puntos de venta en la isla.`,VBArt.flor())}
 <div class="toggle t3" role="group" aria-label="Vista"><button data-mode="mapa" aria-pressed="${state.lugMode==='mapa'}">Mapa</button><button data-mode="lista" aria-pressed="${state.lugMode==='lista'}">Lista</button><button data-mode="ruta" aria-pressed="${ru}">🌿 Ruta del Tabaco</button></div>
 ${ru?EXT.vRuta()+PROTO_NOTE:`<div class="chips"><button class="chip" data-cat="" aria-pressed="${!state.lugCat}">Todos</button><button class="chip" data-cat="lounge" aria-pressed="${state.lugCat==='lounge'}">Lounges</button><button class="chip" data-cat="venta" aria-pressed="${state.lugCat==='venta'}">Puntos de venta</button></div>
 <div class="filter-row"><select id="fTown" aria-label="Pueblo"><option value="">Pueblo: todos</option>${towns.map(t=>`<option ${state.lugTown===t?'selected':''}>${esc(t)}</option>`).join('')}</select></div>
 ${state.lugMode==='mapa'?`<div class="map-wrap"><div id="map"></div></div><div class="legend"><span class="lg">${VBArt.leaf(LEAFC.lounge)}Lounge</span><span class="lg">${VBArt.leaf(LEAFC.venta)}Punto de venta</span><button class="near" id="near" type="button">📍 Cerca de mí</button></div><div id="placeCard" class="place-card"></div>`:''}
 <div class="list" style="margin-top:12px">${ps.map(p=>`<div class="row" style="align-items:flex-start;flex-direction:column;gap:6px"><div style="display:flex;gap:10px;align-items:center;width:100%"><span class="list-leaf">${VBArt.leaf(LEAFC[p.categoria]||LEAFC.lounge)}</span><div><div class="t">${esc(p.nombre)}</div><div class="s">${esc(p.tipo||'')} · ${esc(p.pueblo||'')}${p.lat_lng_aprox?' · ubicación aprox.':''}${p.horario?'<br>'+esc(p.horario):''}</div></div></div>
 <div class="links" style="width:100%;margin:2px 0 0">${linkBtn('ig',p.instagram,igHandle(p.instagram)||'Instagram')}<a class="lbtn go-map" href="${esc(goLink(p))}" target="_blank" rel="noopener">${ICON.map}Cómo llegar</a></div>${EXT.placeActions(p)}</div>`).join('')||'<div class="empty">No hay lugares con ese filtro.</div>'}</div>${PROTO_NOTE}`}`;
 $$('[data-mode]').forEach(b=>b.onclick=()=>{const m=b.dataset.mode;history.replaceState(null,'',m==='ruta'?'#/lugares/ruta':'#/lugares');vLugares(m==='ruta'?'ruta':(state.lugMode=m,0))});
 if(ru){drawRuta();return}
 $$('[data-cat]').forEach(b=>b.onclick=()=>{state.lugCat=b.dataset.cat;vLugares()});
 $('#fTown').onchange=e=>{state.lugTown=e.target.value;vLugares()};
 if(state.lugMode==='mapa')drawMap(ps)}
let rutaView=null;
function drawRuta(){if(leafletMap){leafletMap.remove();leafletMap=null}const {ts}=EXT.ruta(),nu=EXT.rlit(),el=$('#map');if(!el)return;
 const off=why=>{el.innerHTML=`<div class="map-offline"><svg viewBox="0 -20 1000 370" role="img" aria-label="Mapa de Puerto Rico"><path class="isl" d="${ISLAND}"/>${ts.map(t=>{const[x,y]=proj(t.la,t.lo);return `<g class="rpt${t.on?' on':''}" data-town="${t.n}" transform="translate(${x.toFixed(0)} ${y.toFixed(0)})"><circle r="22" fill="transparent"/><circle r="${t.on?13:7}" class="${t.on?'gl':'dot'}"/></g>`}).join('')}</svg><span class="cap">${esc(why)}</span></div>`};
 if(!navigator.onLine||!window.L){off('Sin conexión: mapa simplificado. Toca un pueblo.');return}
 const map=L.map('map',{zoomControl:true,attributionControl:true,scrollWheelZoom:false});leafletMap=map;
 if(rutaView)map.setView(rutaView[0],rutaView[1]);else map.fitBounds([[17.95,-67.27],[18.52,-65.6]],{padding:[8,8]});
 map.on('moveend',()=>{rutaView=[map.getCenter(),map.getZoom()]});
 let errs=0,ok=0;const tl=L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>'}).addTo(map);
 tl.on('tileload',()=>ok++);tl.on('tileerror',()=>{errs++;if(errs>6&&ok===0){map.remove();leafletMap=null;off('El mapa no cargó: vista simplificada. Toca un pueblo.')}});
 ts.forEach(t=>{const icon=L.divIcon({className:'rpin'+(t.on?' on':'')+(t.n==nu?' nuevo':''),html:t.on?'<i></i>'+VBArt.leaf('#8fd162'):'<b></b>',iconSize:[26,26],iconAnchor:[13,13]});
  L.marker([t.la,t.lo],{icon,title:t.n+(t.on?' · encendido':''),keyboard:true,zIndexOffset:t.on?500:0}).addTo(map).on('click',()=>EXT.townSheet(t.n))})}
function drawOffline(ps,why){const el=$('#map');if(!el)return;
 el.innerHTML=`<div class="map-offline"><svg viewBox="0 -20 1000 370" role="img" aria-label="Mapa de Puerto Rico"><path class="isl" d="${ISLAND}"/>${ps.filter(p=>p.lat&&p.lng).map((p,i)=>{const[x,y]=proj(p.lat,p.lng);return `<g class="offline-pin" data-i="${D.places.indexOf(p)}" transform="translate(${x.toFixed(1)} ${y.toFixed(1)})"><circle r="18" fill="transparent"/><path transform="translate(-15 -38) scale(.75)" d="M20 2 C 34 12 38 28 32 40 C 28 47 23 50 20 51 C 17 50 12 47 8 40 C 2 28 6 12 20 2Z" fill="${LEAFC[p.categoria]||LEAFC.lounge}" stroke="#2a1a12" stroke-width="5"/></g>`}).join('')}</svg><span class="cap">${esc(why)}</span></div>`;
 $$('.offline-pin',el).forEach(g=>g.onclick=()=>{const r=g.getBoundingClientRect(),hr=el.parentNode.getBoundingClientRect();leafBurst(el.parentNode,r.left-hr.left+r.width/2,r.top-hr.top,LEAFC[D.places[+g.dataset.i].categoria]);setTimeout(()=>{$('#placeCard').innerHTML=`<div class="row" style="display:block">${placeCard(D.places[+g.dataset.i])}</div>`},REDUCED?0:700)})}
function drawMap(ps){if(leafletMap){leafletMap.remove();leafletMap=null}
 const mm=$('#mapMode');
 if(!navigator.onLine||!window.L){drawOffline(ps,'Sin conexión: mapa simplificado. Toca un pin.');return}
 const map=L.map('map',{zoomControl:true,attributionControl:true,scrollWheelZoom:false}).fitBounds([[17.92,-67.27],[18.52,-65.6]]);leafletMap=map;
 let errs=0,ok=0;const tl=L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>'}).addTo(map);
 tl.on('tileload',()=>ok++);tl.on('tileerror',()=>{errs++;if(errs>6&&ok===0){map.remove();leafletMap=null;drawOffline(ps,'El mapa no cargó: vista simplificada. Toca un pin.')}});
 const pts=[];ps.filter(p=>p.lat&&p.lng).forEach(p=>{const icon=L.divIcon({className:'leaf-pin',html:VBArt.leaf(LEAFC[p.categoria]||LEAFC.lounge),iconSize:[26,34],iconAnchor:[13,32],popupAnchor:[0,-28]});const mk=L.marker([p.lat,p.lng],{icon,title:p.nombre,keyboard:true}).addTo(map);
  mk.on('click',()=>{map.closePopup();const pt=map.latLngToContainerPoint([p.lat,p.lng]);leafBurst($('#map').parentNode,pt.x,pt.y-16,LEAFC[p.categoria]);setTimeout(()=>{L.popup({offset:[0,-28],autoPanPadding:[16,16],maxWidth:250,minWidth:210}).setLatLng([p.lat,p.lng]).setContent(placeCard(p)).openOn(map)},REDUCED?0:780)});pts.push([p.lat,p.lng])});
 const nb=$('#near');if(nb)nb.onclick=()=>{if(!navigator.geolocation){toast('Tu cel no comparte ubicación');return}nb.textContent='Buscando…';navigator.geolocation.getCurrentPosition(pos=>{nb.textContent='📍 Cerca de mí';const ll=[pos.coords.latitude,pos.coords.longitude];const vi=L.divIcon({className:'volky-pin',html:VBArt.carro('mini'),iconSize:[66,43],iconAnchor:[33,40]});L.marker(ll,{icon:vi,title:'Tú estás aquí',zIndexOffset:1000}).addTo(map).bindTooltip('Tú estás aquí');map.setView(ll,12)},()=>{nb.textContent='📍 Cerca de mí';toast('No pude obtener tu ubicación')},{timeout:10000})};
 if(pts.length>1)map.fitBounds(pts,{padding:[28,28],maxZoom:state.lugTown?14:11});else if(pts.length===1)map.setView(pts[0],14)}
/* ---------- actividades ---------- */
const MES=['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
function evDate(f){const d=new Date(f+'T12:00:00');return isNaN(d)?null:d}
function evItem(e,pending){const d=evDate(e.fecha);const m={nombre:e.lugar||e.titulo,direccion:e.direccion||'',pueblo:e.pueblo,maps:e.maps,lat:e.lat,lng:e.lng};
 return `<article class="ev ${pending?'pending':''}"><div class="date">${d?`<small>${MES[d.getMonth()]}</small><b>${d.getDate()}</b>`:'<b>?</b>'}</div><div style="min-width:0;flex:1">
 <div class="t">${esc(e.titulo)}</div><div class="s">${e.hora?esc(e.hora)+' · ':''}${esc(e.lugar||'')}${e.pueblo?', '+esc(e.pueblo):''}${e.precio?' · '+esc(e.precio):''}</div>
 ${e.detalle?`<div class="s">${esc(e.detalle)}</div>`:''}
 <div class="src">${pending?'Sugerida por ti · pendiente de verificar':(e.fuente?`vía ${e.fuente_url?`<a href="${esc(e.fuente_url)}" target="_blank" rel="noopener" style="color:inherit">${esc(e.fuente)}</a>`:esc(e.fuente)}`:'')}</div>
 <div class="links">${e.enlace?linkBtn('web',e.enlace,'Ver más'):''}${(e.pueblo||e.maps)?`<a class="lbtn go-map" href="${esc(goLink(m))}" target="_blank" rel="noopener">${ICON.map}Cómo llegar</a>`:''}</div></div></article>`}
/* ---------- perfil ---------- */
async function vPerfil(){const p=LS.get('perfil',{nombre:'',capa:''});const ups=uploads();const favs=EXT.S().favs.cigarros;const rat=EXT.S().ratings;
 const favC=favs.map(cigarById).filter(Boolean);const ratC=Object.keys(rat).map(cigarById).filter(Boolean);
 view.innerHTML=`${EXT.subnav('perfil')}<div class="section-title"><h2>Mi perfil</h2></div>
 <div class="me"><div class="pic" id="mePic">${p.nombre?esc(p.nombre[0].toUpperCase()):'☆'}</div><div><div class="n">${esc(p.nombre||'Tu nombre')}</div><div class="c">${p.capa?'Capa favorita: '+esc(p.capa):'Escoge tu capa favorita'}</div></div></div>
 <div class="stats"><div class="stat"><b>${ups.length}</b><span>Subidas</span></div><div class="stat"><b>${favC.length}</b><span>Favoritos</span></div><div class="stat"><b>${ratC.length}</b><span>Calificadas</span></div></div>
 <details class="edit" ${p.nombre?'':'open'}><summary>Editar perfil</summary><form class="form" id="pForm">
 <div class="field"><label for="pN">Nombre</label><input id="pN" maxlength="40" value="${esc(p.nombre)}" placeholder="¿Cómo te llamas?"></div>
 <div class="field"><label for="pC">Capa favorita</label><select id="pC"><option value="">—</option>${['Claro','Connecticut','Natural','Colorado','Habano','Corojo','Criollo','Maduro','Oscuro'].map(x=>`<option ${p.capa===x?'selected':''}>${x}</option>`).join('')}</select></div>
 <div class="field"><label>Foto</label><div class="photo-btns" style="margin:0"><label>📷 Cámara<input type="file" accept="image/*" capture="user" id="pCam"></label><label>🖼️ Galería<input type="file" accept="image/*" id="pGal"></label></div></div>
 <button class="btn" type="submit">Guardar perfil</button></form></details>
 <div class="section-title"><h2>Mis subidas</h2><a href="#/subir">+ Subir</a></div>${ups.length?`<div class="mini-row">${ups.map(c=>cigarCard({...c,yours:true})).join('')}</div>`:emptyCoqui('Todavía no has subido vitolas.')}
 <div class="section-title"><h2>Mis favoritos</h2></div>${favC.length?`<div class="mini-row">${favC.map(cigarCard).join('')}</div>`:'<div class="empty">Toca ♡ en una vitola para guardarla.</div>'}
 <div class="section-title"><h2>Mis calificaciones</h2></div>${ratC.length?`<div class="list">${ratC.map(c=>`<a class="row" href="#/c/${encodeURIComponent(c.id)}"><div><div class="t">${esc(c.nombre)}</div><div class="s">${esc(artisanName(c))}</div></div><span class="go" style="color:var(--gold);font-size:15px">${'★'.repeat(rat[c.id])}${'☆'.repeat(5-rat[c.id])}</span></a>`).join('')}</div>`:'<div class="empty">Califica una vitola con estrellas.</div>'}
 <p class="note"><b>Prototipo</b> — información pública, sujeta a verificación. Tus datos se guardan solo en este teléfono.</p>`;
 const u=await photoURL('perfil');if(u)$('#mePic').innerHTML=`<img src="${u}" alt="Tu foto">`;
 const onPic=async e=>{const f=e.target.files&&e.target.files[0];if(!f)return;try{const b=await resizeImage(f,600,.82);await idb.put('perfil',b);if(urlCache.perfil){URL.revokeObjectURL(urlCache.perfil);delete urlCache.perfil}toast('Foto actualizada');vPerfil();topAvatar()}catch(err){toast('No pude leer esa foto')}};
 $('#pCam').onchange=onPic;$('#pGal').onchange=onPic;
 $('#pForm').onsubmit=e=>{e.preventDefault();LS.set('perfil',{nombre:$('#pN').value.trim(),capa:$('#pC').value});toast('Perfil guardado');vPerfil();topAvatar()};hydratePhotos()}
async function topAvatar(){const p=LS.get('perfil',{});const el=$('#topAvatar');const u=await photoURL('perfil');el.innerHTML=u?`<img src="${u}" alt="">`:`<span>${esc((p.nombre||'☆')[0].toUpperCase())}</span>`}
/* ---------- v6: Mi Hoja y demás (hoja.js) ---------- */
const EXT=window.LHB_EXT({$,$$,esc,toast,view,VBArt,LS,D:()=>D,allCigars,artisanById,cigarById,artisanName,cigarSVG,mono,linkBtn,ICON,FORT,fortLabel,PROTO_NOTE,head,cigarCard,goLink,evDate,route:()=>route(),vPerfil,hydrate:r=>hydratePhotos(r||view)});
/* ---------- router ---------- */
function route(){const h=location.hash.replace(/^#\/?/,'')||'catalogo';const [r,arg]=h.split('/');const id=arg?decodeURIComponent(arg):'';
 const tab={c:'catalogo',a:'artesanos',perfil:'mihoja',mihoja:'mihoja',actividades:'eventos',eventos:'eventos'}[r]||r;$$('.tabbar [data-tab]').forEach(a=>{const on=a.dataset.tab===tab;a.classList.toggle('active',on);if(a.tagName==='A'){if(on)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current')}});
 if(leafletMap&&r!=='lugares'){leafletMap.remove();leafletMap=null}
 const R=EXT.routes;
 ({catalogo:vCatalogo,c:()=>vCigar(id),artesanos:vArtesanos,a:()=>vArtesano(id),subir:vSubir,lugares:()=>vLugares(id),actividades:()=>R.eventos(id),eventos:()=>R.eventos(id),perfil:()=>R.mihoja('perfil'),mihoja:()=>R.mihoja(id),cata:()=>R.cata(id),maridajes:R.maridajes,podcast:R.podcast,buscar:R.buscar}[r]||vCatalogo)();
 if(r!==route._last){window.scrollTo(0,0)}route._last=h}
window.addEventListener('hashchange',route);
window.addEventListener('online',()=>{if(location.hash.includes('lugares'))route()});window.addEventListener('offline',()=>{if(location.hash.includes('lugares'))route()});
/* ---------- install (v21: botón en el home) ---------- */
function installHidden(w){return !!(w.__lhbInstalled||(w.matchMedia&&w.matchMedia('(display-mode: standalone)').matches)||w.navigator.standalone===true)}
let deferred=null;const syncInstall=()=>{const b=$('#btnAdd');if(b)b.hidden=installHidden(window)};
window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferred=e;window.__vbInstallReady=true});
window.addEventListener('appinstalled',()=>{window.__lhbInstalled=true;deferred=null;syncInstall()});
matchMedia('(display-mode: standalone)').addEventListener?.('change',syncInstall);
document.addEventListener('click',async e=>{if(!e.target.closest('#btnAdd'))return;
 if(deferred){const d=deferred;deferred=null;d.prompt();const r=await d.userChoice.catch(()=>null);if(r&&r.outcome==='accepted'){window.__lhbInstalled=true;syncInstall();toast('¡Instalada!')}return}
 EXT.openSheet('instalar',isIOS?(/ipad/i.test(navigator.userAgent)||navigator.platform==='MacIntel'?'ipad':'ios'):'')});
if('serviceWorker' in navigator){const hadSW=!!navigator.serviceWorker.controller;let reloaded=false;navigator.serviceWorker.addEventListener('controllerchange',()=>{if(hadSW&&!reloaded){reloaded=true;location.reload()}});window.addEventListener('load',()=>navigator.serviceWorker.register('sw.js').then(r=>r.update&&r.update()).catch(()=>{}))}
(function splash(){const sp=$('#splash');if(!sp)return;const seen=sessionStorage.getItem('vb_splash');
 let gone=false;const done=()=>{if(gone)return;gone=true;sp.classList.add('out');setTimeout(()=>sp.remove(),450)};if(seen){done();return}sessionStorage.setItem('vb_splash','1');
 sp.addEventListener('click',done);sp.addEventListener('touchstart',done,{passive:true});
 /* v9: guagua por capas (sombra, ruedas que giran, carrocería que rebota, luz del campo) */
 const VS='img/guagua/guagua_recorte.webp',car=$('#splashCar'),cz=$('#cz'),campo=$('#campo');
 car.innerHTML=`<i class="vsh"></i><i class="vsh2"></i><img class="van-i" src="${VS}" alt="" draggable="false"><span class="whl w1"><i></i></span><span class="whl w2"><i></i></span><div class="vb"><img class="van-i" src="${VS}" alt="" draggable="false"><i class="vlit"></i><i class="vhaze"></i></div>`;
 const PTS=[[0,1.16,.745,.4],[.18,.84,.755,.48],[.5,.52,.785,.66],[.78,.24,.815,.84],[1,-.34,.835,1.02]];
 const path=u=>{let i=1;while(i<PTS.length-1&&u>PTS[i][0])i++;const a=PTS[i-1],b=PTS[i],k=(u-a[0])/(b[0]-a[0]);return[1,2,3].map(j=>a[j]+(b[j]-a[j])*k)};
 const ease=u=>u*.65+u*u*(3-2*u)*.35;
 let W=campo.clientWidth,H=campo.clientHeight;const vw=()=>W*.46,vh=()=>W*.46/1.5;
 const at=u=>{const[cx,gy,s]=path(ease(u));return{cx:cx*W,gy:gy*H,s}};
 const tf=p=>`translate(${(p.cx-vw()/2).toFixed(1)}px,${(p.gy-vh()).toFixed(1)}px) scale(${p.s.toFixed(3)})`;
 const haze=car.querySelector('.vhaze');
 if(REDUCED_ALL){const p=at(.55);car.style.transform=tf(p);haze.style.opacity=.15;setTimeout(done,1500);return}
 const imgs=[...sp.querySelectorAll('img')].map(i=>i.decode?i.decode().catch(()=>{}):Promise.resolve());
 Promise.race([Promise.all(imgs),new Promise(r=>setTimeout(r,1200))]).then(()=>{if(gone)return;W=campo.clientWidth;H=campo.clientHeight;sp.classList.add('go');
  const D=3300,DL=150,N=26,kf=[];for(let i=0;i<=N;i++){const u=i/N,p=at(u);kf.push({transform:tf(p),opacity:u>.9?Math.max(0,1-(u-.9)/.1):1,offset:u})}
  const van=car.animate(kf,{duration:D,delay:DL,easing:'linear',fill:'both'});
  haze.animate([{opacity:.7},{opacity:.25,offset:.5},{opacity:0}],{duration:D,delay:DL,fill:'both'});
  const pan=(el,a)=>el&&el.animate([{transform:`translateX(${-a*W}px)`},{transform:`translateX(${a*W}px)`}],{duration:D+400,easing:'cubic-bezier(.4,0,.5,1)',fill:'both'});
  pan($('.l-hills',sp),.018);pan($('.l-field',sp),.04);pan($('.l-mid',sp),.045);pan($('.l-fg',sp),.075);pan($('.l-fg2',sp),.13);
  cz.animate([{transform:'scale(1)'},{transform:'scale(1.06)'}],{duration:D+400,easing:'ease-in-out',fill:'both'});
  const dust=$('#dust'),wake=$('#wake'),R=(a,b)=>a+Math.random()*(b-a),K=W/360;
  const puff=(x,y,s)=>{const e=document.createElement('i');e.className='puff';const z=R(36,56)*s*K;e.style.width=e.style.height=z+'px';dust.appendChild(e);
   const dx=R(14,34)*s*K,dy=R(10,24)*s*K;e.animate([{transform:`translate(${x-z/2}px,${y-z/2}px) scale(.35)`,opacity:.85},{transform:`translate(${x-z/2+dx}px,${y-z/2-dy}px) scale(2.3)`,opacity:0}],{duration:R(750,1100),easing:'cubic-bezier(.2,.7,.4,1)',fill:'forwards'}).onfinish=()=>e.remove()};
  const COL=['#7aa646','#5f8a35','#c99a4a','#a3b85a','#8a6a34'];
  const leaf=(x,y,s)=>{const e=document.createElement('i');e.className='wleaf';const z=R(9,16)*s*K;
   e.innerHTML=`<svg width="${z}" height="${z*1.3}" viewBox="0 0 20 26"><path d="M10 0C18 6 19 16 14 22 12 24 11 25 10 26 9 25 8 24 6 22 1 16 2 6 10 0Z" fill="${COL[Math.random()*5|0]}"/><path d="M10 3V25" stroke="rgba(40,30,10,.45)" stroke-width="1.2"/></svg>`;wake.appendChild(e);
   const dx=R(25,60)*s*K,dy=R(30,70)*s*K,r=R(-1,1)>0?1:-1;
   e.animate([{transform:`translate(${x}px,${y}px) rotate(0) scale(.4)`,opacity:0},{transform:`translate(${x+dx*.3}px,${y-dy*.6}px) rotate(${r*140}deg) rotateY(60deg) scale(1)`,opacity:1,offset:.25},{transform:`translate(${x+dx*.75}px,${y-dy}px) rotate(${r*300}deg) rotateY(180deg) scale(1)`,opacity:1,offset:.6},{transform:`translate(${x+dx}px,${y-dy*.55}px) rotate(${r*460}deg) rotateY(300deg) scale(.9)`,opacity:0}],{duration:R(1200,1600),easing:'ease-out',fill:'forwards'}).onfinish=()=>e.remove()};
  let nl=0;const iv=setInterval(()=>{const t=van.currentTime-DL;if(gone||t>D){clearInterval(iv);return}if(t<0)return;const u=t/D;if(u<.06||u>.93)return;
   const p=at(u),L=p.cx-vw()*p.s/2,vs=vw()*p.s,hs=vh()*p.s;
   puff(L+.92*vs,p.gy-.08*hs,p.s);if(Math.random()<.6)puff(L+.2*vs,p.gy-.02*hs,p.s*.8);
   if(u>.2&&nl<12&&Math.random()<.4){nl++;leaf(L+R(.7,1)*vs,p.gy-R(.1,.5)*hs,p.s)}},75);
  setTimeout(done,DL+D+300)})})();
route();topAvatar();refreshData();
})();
