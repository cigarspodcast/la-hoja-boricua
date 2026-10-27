const test=require('node:test');const assert=require('node:assert');const fs=require('fs');const path=require('path');
const S=path.join(__dirname,'..','site');const read=f=>fs.readFileSync(path.join(S,f),'utf8');const DD=path.join(__dirname,'..','data');const readD=f=>fs.readFileSync(path.join(DD,f),'utf8');
const AV='https://img.clerk.com/eyJ0eXBlIjoicHJveHkiLCJzcmMiOiJodHRwczovL2V4YW1wbGUifQ';/* LHB-49: una URL de foto de Clerk */
const IDN={first_name:'Ana',last_name:'Mora',gender:'F',birth_date:'1990-05-17'};/* LHB-52: una identidad válida (nombre, apellido, género, fecha de nacimiento) */
const I18N=()=>{const w={};require('vm').runInNewContext(read('i18n.js'),{window:w});return w.LHB_I18N};
test('index: title, viewport, PWA meta, local assets exist',()=>{const h=read('index.html');
 assert.match(h,/<title>La Hoja Boricua/);assert.match(h,/name="viewport"[^>]*viewport-fit=cover/);assert.match(h,/lang="es-PR"/);
 for(const m of ['rel="manifest"','apple-touch-icon','apple-mobile-web-app-capable','apple-mobile-web-app-status-bar-style','theme-color'])assert.ok(h.includes(m),m);
 const refs=[...h.matchAll(/(?:src|href)="([^"#:]+?)"/g)].map(x=>x[1]).filter(u=>!u.startsWith('http'));
 for(const r of refs)assert.ok(fs.existsSync(path.join(S,r)),'missing '+r);});
test('manifest: standalone, icons 192/512/maskable exist',()=>{const m=JSON.parse(read('manifest.webmanifest'));
 assert.equal(m.display,'standalone');assert.equal(m.lang,'es-PR');assert.ok(m.start_url&&m.name==='La Hoja Boricua');
 const sizes=m.icons.map(i=>i.sizes+':'+i.purpose);for(const s of ['192x192:any','512x512:any','512x512:maskable'])assert.ok(sizes.includes(s),s);
 for(const i of m.icons)assert.ok(fs.existsSync(path.join(S,i.src)),i.src);});
test('service worker precaches files that exist',()=>{const sw=read('sw.js');const list=JSON.parse(sw.match(/const SHELL=(\[[\s\S]*?\]);/)[1].replace(/'/g,'"'));
 for(const f of list){if(f==='./')continue;assert.ok(fs.existsSync(path.join(S,f)),'sw precache missing '+f)}});
test('Spanish UI, Fortaleza wording, prototype note, forbidden names absent',()=>{const all=['index.html','app.js','i18n.js','art.js','hoja.js','fotos.js','data/bundle.js'].map(read).join('\n');
 assert.ok(all.includes('Fortaleza'));assert.ok(!/fuerza/i.test(all),'uses "fuerza"');assert.ok(!/Lector de la Hoja/i.test(all));
 assert.ok(I18N().T.es['proto.note'].includes('información pública, sujeta a verificación')&&read('app.js').includes("${tt('proto.note')}"));
 for(const w of ['Catálogo','Artesanos','Lugares','Actividades','Mi perfil','Guardar en favoritos','Sugerir actividad','Fuentes','Cómo llegar'])assert.ok(all.includes(w),w);
 assert.ok(!/lorem ipsum/i.test(all)&&!/\bTODO\b|\bTBD\b|\[PLACEHOLDER\]|\{\{/.test(all),'placeholder text');});
test('data layer: separate JSON files with real entries and sources',()=>{const a=JSON.parse(readD('artesanos.json')),c=JSON.parse(readD('cigarros.json')),p=JSON.parse(readD('places.json')),e=JSON.parse(readD('events.json'));
 assert.ok(a.length>=4&&c.length>=4&&p.length>=6);assert.ok(Array.isArray(e.actividades)&&Array.isArray(e.fuentes));
 assert.ok(e.actividades.some(x=>/Humo y Tambor/.test(x.titulo)));
 for(const x of p){assert.ok(['lounge','venta'].includes(x.categoria),x.nombre);assert.ok(typeof x.lat==='number'&&typeof x.lng==='number',x.nombre+' coords');assert.ok(x.lat>17.8&&x.lat<18.6&&x.lng>-67.4&&x.lng<-65.2,x.nombre+' outside PR')}
 const ids=new Set(a.map(x=>x.id));for(const x of c)assert.ok(!x.artesano_id||ids.has(x.artesano_id),'cigar artisan '+x.id);
 for(const x of a)assert.ok(x.por_confirmar||(x.fuentes&&x.fuentes.length),'sources '+x.id);});
test('app wiring: upload uses camera capture and IndexedDB; offline fallback map; Volky art',()=>{const js=read('app.js'),h=read('art.js');
 assert.ok(js.includes('capture="environment"')&&js.includes('indexedDB.open'));assert.ok(js.includes('drawOffline'));assert.ok(js.includes("serviceWorker.register('sw.js')"));
 assert.ok(h.includes('function volky')&&h.includes('function guagua')&&h.includes("VEHICULO='guagua'")&&h.includes('function coqui')&&h.includes('function flamboyan')&&h.includes('function flor'));
 assert.ok(!/volkswagen|\bVW\b/i.test(h));});

test('v6: Mi Hoja, cata, eventos, maridajes, podcast, compartir',()=>{const h=read('hoja.js'),js=read('app.js'),sw=read('sw.js'),ix=read('index.html');
 assert.match(sw,/const VERSION='lhb-v57'/);assert.ok(sw.includes("'hoja.js'"));assert.ok(ix.indexOf('hoja.js')<ix.indexOf('app.js'));
 for(const w of ['Cata guiada','Aroma en frío','Encendido','Primer tercio','Segundo tercio','Tercer tercio','Fortaleza','Cuerpo','Final','Madera','Tierra','Especias','Dulce','Cacao','Frutos','Floral','Cuero','Nuez','Humidor','Diario','Pasaporte','Insignias','Exportar respaldo','Importar respaldo','Añadir a calendario','BEGIN:VCALENDAR','https://forms.gle/4iL5cgzun3LqdXBRA','/humoytambor','Maridajes','Pídelo directo','Escucha en Cigars Podcast','https://cigarspodcast.sites.tab.bot/','canShare','toBlob','La Hoja Boricua','lahojaboricua.com'])assert.ok(h.includes(w),w);
 assert.ok(/lhb_mihoja_v1/.test(h)&&/vb_favs|legacy\('favs'\)/.test(h),'versioned key + migration');
 const all=['index.html','app.js','hoja.js','art.js','data/bundle.js'].map(read).join('\n');
 assert.ok(!/don\s*q\b|serrall/i.test(all),'Don Q / Serrallés');assert.ok(!/bad bunny/i.test(all));assert.ok(!/fuerza/i.test(all));
 assert.ok(!/wa\.me|whatsapp/i.test(h.slice(h.indexOf('function pideloLink'),h.indexOf('function artisanExtras'))),'Pídelo directo never uses WhatsApp');
 const a=JSON.parse(readD('artesanos.json'));assert.ok(!a.some(x=>'alerta' in x),'alerta stays out');
 for(const u of [...h.matchAll(/POD\+'([^']+)'/g)].map(m=>m[1]))assert.ok(/^articulos\/[a-z0-9-]+$/.test(u),u);});
test('v6: data counts',()=>{const a=JSON.parse(readD('artesanos.json')),c=JSON.parse(readD('cigarros.json')),p=JSON.parse(readD('places.json'));
 assert.equal(a.length,32);assert.equal(c.length,43);assert.equal(p.length,41);const b=read('data/bundle.js');for(const x of [...a,...c,...p])assert.ok(b.includes('"id":"'+x.id+'"'),'bundle '+x.id);});

test('v7: fotos reales de producto',()=>{const src=read('fotos.js');const F=JSON.parse(src.slice(src.indexOf('=')+1).trim().replace(/;$/,''));const sw=read('sw.js'),js=read('app.js'),h=read('hoja.js'),ix=read('index.html');
 const c=JSON.parse(readD('cigarros.json'));const ids=new Set(c.map(x=>x.id));assert.equal(Object.keys(F).length,25);
 for(const [id,f] of Object.entries(F)){assert.ok(ids.has(id),'foto for unknown cigar '+id);assert.ok(['exacta','linea'].includes(f.match));assert.match(f.credito,/^Foto: /);
  for(const p of [f.img,f.thumb,...(f.galeria||[]).flatMap(g=>[g.img,g.thumb])])assert.ok(fs.existsSync(path.join(S,p)),'missing '+p);
  assert.ok(sw.includes("'"+f.thumb+"'"),'thumb not precached '+id);assert.ok(!sw.includes("'"+f.img+"'"),'large precached '+id)}
 assert.ok(F['yambo-toro'].galeria.length>=4&&F['yambo-toro'].credito==='Foto: Yambó');
 assert.ok(ix.indexOf('fotos.js')<ix.indexOf('hoja.js'));assert.ok(js.includes('loading="lazy"')&&I18N().T.es['cig.lineFoto']==='Foto de la línea'&&js.includes("tt('cig.lineFoto')")&&h.includes('LHB_FOTOS'));
 assert.ok(!/fuerza|bad bunny|don\s*q\b/i.test(src));});
test('v8: guagua B (recorte + campo de tabaco en el splash)',()=>{const sw=read('sw.js'),a=read('art.js'),ix=read('index.html'),css=read('styles.css'),js=read('app.js');
 assert.match(sw,/const VERSION='lhb-v57'/);for(const f of ['img/guagua/guagua_recorte.webp','img/guagua/campo.webp','img/guagua/hojas.webp']){assert.ok(sw.includes("'"+f+"'"),f);assert.ok(fs.existsSync(path.join(__dirname,'..','site',f)),f)}
 assert.ok(a.includes('img/guagua/guagua_recorte.webp')&&a.includes("VEHICULO='guagua'"));assert.ok(ix.includes('campo-hojas')&&ix.includes('splashCar'));
 assert.ok(css.includes('@keyframes rock'));assert.ok(js.includes("addEventListener('click',done)"));
 for(const f of ['img/guagua/guagua_recorte.webp','img/guagua/campo.webp','img/guagua/hojas.webp'])assert.ok(fs.statSync(path.join(__dirname,'..','site',f)).size<62000,f);});

test('v9: splash por capas + garita fuera del header',()=>{const ix=read('index.html'),css=read('styles.css'),js=read('app.js'),sw=read('sw.js');
 assert.match(sw,/const VERSION='lhb-v57'/);for(const c of ['l-hills','l-field','l-mid','l-fg','l-fg2','nube','id="dust"','id="wake"'])assert.ok(ix.includes(c),c);
 for(const c of ['.vsh{','.whl i{','@keyframes rock','@keyframes sway','.vb .van-i{'])assert.ok(css.includes(c),c);
 assert.ok(js.includes('REDUCED_ALL')&&js.includes("className='puff'")&&js.includes("className='wleaf'"));assert.ok(!js.includes('VBArt.garita("hero-garita")'));});

test('v10/v11: fotos Monte & Mística (Entre Humos), Maduro encendido (v11)',()=>{const src=read('fotos.js');const F=JSON.parse(src.slice(src.indexOf('=')+1).trim().replace(/;$/,''));const sw=read('sw.js');
 assert.match(sw,/const VERSION='lhb-v57'/);
 assert.equal(F['monte-mistica-corojo'].match,'exacta');assert.equal(F['monte-mistica-connecticut'].match,'linea');
 for(const id of ['monte-mistica-corojo','monte-mistica-connecticut']){assert.equal(F[id].credito,'Foto: Entre Humos');assert.ok(sw.includes("'"+F[id].thumb+"'"));assert.ok(fs.statSync(path.join(S,F[id].img)).size<80000)}
 assert.equal(F['monte-mistica-maduro'].match,'linea');
 for(const id of ['monte-mistica-maduro']){assert.equal(F[id].credito,'Foto: Entre Humos');assert.ok(sw.includes("'"+F[id].thumb+"'"));assert.ok(fs.existsSync(path.join(S,F[id].img)));assert.ok(fs.statSync(path.join(S,F[id].img)).size<80000)}});

test('v12: bandera de PR (opción A, triángulo celeste) en vez de la silla + fotos Galiz y Villareño',()=>{const ix=read('index.html'),css=read('styles.css'),sw=read('sw.js'),js=read('app.js'),art=read('art.js');
 assert.match(sw,/const VERSION='lhb-v57'/);
 for(const s of [ix,css,js,art])assert.ok(!/silla|chair|monobloc/i.test(s),'sin silla');
 assert.ok(ix.includes('class="splash-bandera"')&&ix.includes('aria-label="Bandera de Puerto Rico"'));
 const svg=ix.slice(ix.indexOf('class="splash-bandera"'),ix.indexOf('</svg>',ix.indexOf('class="splash-bandera"')));
 assert.equal((svg.match(/fill="#E92A2F"/g)||[]).length,3,'3 franjas rojas');assert.ok(svg.includes('class="tela"'));
 const tri=svg.match(/<path d="M[^"]*Z" fill="(#5FB4E5)"/i);assert.ok(/#9a6a3c/.test(svg)&&/#5b7a3a/.test(svg),'asta de madera + grama');assert.ok(tri,'triángulo');
 const hex=tri[1].slice(1),r=parseInt(hex.slice(0,2),16),g=parseInt(hex.slice(2,4),16),b=parseInt(hex.slice(4,6),16);
 assert.ok(b>200&&g>150&&r>60&&r<130,'triángulo celeste: '+tri[1]);assert.ok(!/#0050F0/i.test(ix)&&!/%230050F0/i.test(css));
 const em=css.slice(css.indexOf('.empty::before'),css.indexOf('}',css.indexOf('.empty::before')));assert.ok(em.includes('%239a6a3c'),'asta de madera en vacíos');assert.ok(em.includes('%235FB4E5')&&em.includes('%23E92A2F'),'bandera celeste en vacíos');
 assert.ok(/\.tela\{[^}]*animation:ondea/.test(css)&&/@media \(prefers-reduced-motion:reduce\)\{\*,\*::before,\*::after\{animation:none!important/.test(css));
 const src=read('fotos.js');const F=JSON.parse(src.slice(src.indexOf('=')+1).trim().replace(/;$/,''));assert.equal(Object.keys(F).length,25);
 assert.equal(F['galiz-spirit'].credito,'Foto: Entre Humos');assert.equal(F['galiz-spirit'].match,'linea');
 assert.equal(F['villareno-surtido'].credito,'Foto: Villareño Cigars');assert.equal(F['villareno-surtido'].match,'exacta');
 for(const id of ['galiz-spirit','villareno-surtido']){assert.ok(sw.includes("'"+F[id].thumb+"'"));assert.ok(fs.existsSync(path.join(S,F[id].img)));assert.ok(fs.statSync(path.join(S,F[id].img)).size<60000)}});

test('v13: icon files present with right sizes, new leaf-flag art; El Chalet in Lugares',()=>{
 const dim=f=>{const b=fs.readFileSync(path.join(S,'icons',f));assert.equal(b.toString('ascii',1,4),'PNG',f);return [b.readUInt32BE(16),b.readUInt32BE(20)]};
 for(const [f,s] of [['icon-192.png',192],['icon-512.png',512],['apple-touch-icon.png',180],['favicon-32.png',32],['icon-maskable-192.png',192],['icon-maskable-512.png',512]])assert.deepEqual(dim(f),[s,s],f);
 const svg=read('icons/icon.svg');assert.ok(svg.includes('#0050F0')&&svg.includes('#E92A2F'),'normal PR flag in icon.svg');
 const m=JSON.parse(read('manifest.webmanifest'));assert.deepEqual(m.icons.map(i=>i.src),['icons/icon-192.png','icons/icon-512.png','icons/icon-maskable-192.png','icons/icon-maskable-512.png']);
 const p=JSON.parse(readD('places.json'));const c=p.find(x=>x.id==='el-chalet-aguadilla');assert.ok(c,'El Chalet');
 assert.equal(c.nombre,'El Chalet');assert.equal(c.pueblo,'Aguadilla');assert.equal(c.categoria,'lounge');assert.ok(c.lat_lng_aprox);assert.match(c.horario,/en verificación/);
 assert.ok(c.lat>18.45&&c.lat<18.53&&c.lng>-67.17&&c.lng<-67.08,'coords near Aguadilla');assert.ok(read('data/bundle.js').includes('"id":"el-chalet-aguadilla"'));
 assert.equal(p.filter(x=>x.categoria==='lounge').length,28);assert.equal(p.filter(x=>x.categoria==='venta').length,13);
 assert.ok(read('app.js').includes('p.horario'));});

test('v14: botón de Spotify en Podcast',()=>{const hj=fs.readFileSync(path.join(S,'hoja.js'),'utf8');assert.ok(hj.includes("const SPOTIFY='https://open.spotify.com/show/5DUCZkx89z9cTeBaczq6Gr'"));assert.match(hj,/class="lbtn spotify" href="\$\{SPOTIFY\}" target="_blank" rel="noopener">\$\{SPOT_SVG\}Escúchalo en Spotify/);assert.match(fs.readFileSync(path.join(S,'sw.js'),'utf8'),/const VERSION='lhb-v57'/);});

test('v15: banner de Sergio en el catálogo, sin guagua',()=>{const js=fs.readFileSync(path.join(S,'app.js'),'utf8'),css=fs.readFileSync(path.join(S,'styles.css'),'utf8'),sw=fs.readFileSync(path.join(S,'sw.js'),'utf8');
 assert.ok(js.includes('<img class="hero-bg" src="img/hero/banner.webp"'));assert.ok(!js.includes('hero-volky')&&!js.includes('hero-art'));
 assert.ok(!css.includes('hero-art')&&!css.includes('@keyframes park')&&!css.includes('@keyframes idle'));assert.match(css,/\.hero-bg\{[^}]*object-fit:cover/);
 assert.match(sw,/const VERSION='lhb-v57'/);assert.ok(sw.includes("'img/hero/banner.webp'"));
 assert.ok(fs.statSync(path.join(S,'img/hero/banner.webp')).size<=35000);
 assert.ok(js.includes("VBArt.carro('mini')"));});
test('v16: paleta B Bandera (verdes intactos)',()=>{const c=fs.readFileSync(path.join(S,'styles.css'),'utf8'),a=fs.readFileSync(path.join(S,'app.js'),'utf8'),h=fs.readFileSync(path.join(S,'hoja.js'),'utf8');
 for(const v of ['--bg:#0e2417','--card:#173a26','--gold:#8fd162','--verde:#a9c487','--flam:#d0192e','--ado-d:#0050f0','--pr-red:#ed0000','--pr-blue:#0050f0','--cream:#f8f8f4','--celeste:#8fb8ff'])assert.ok(c.includes(v),v);
 assert.ok(!c.includes('--flam:#c93f25'));assert.ok(a.includes("const FACADE=['#0050f0','#ed0000','#f8f8f4','#ed0000','#f8f8f4','#0050f0']"));
 for(const old of ['#e2a39a','#efc56f','#86c0c6','#c3a2cf','#9fcdea','#b5162b','#1d3f7a','#f3f1e2'])assert.ok(!a.includes(old)&&!h.includes(old),old);
 assert.ok(fs.readFileSync(path.join(S,'index.html'),'utf8').toLowerCase().includes('5fb4e5')||c.toLowerCase().includes('5fb4e5'));});
test('v17: flor de tabaco reemplaza la garita, flamboyán nuevo',()=>{const S2=path.join(__dirname,'..','site');const a=fs.readFileSync(path.join(S2,'art.js'),'utf8'),ap=fs.readFileSync(path.join(S2,'app.js'),'utf8'),hj=fs.readFileSync(path.join(S2,'hoja.js'),'utf8');assert.ok(a.includes('function flor'));assert.ok(!ap.includes('VBArt.garita(')&&!hj.includes('VBArt.garita('));assert.ok(ap.includes('VBArt.flor()')&&hj.includes('VBArt.flor()'));assert.match(fs.readFileSync(path.join(S2,'sw.js'),'utf8'),/const VERSION='lhb-v57'/);});

test('v18: Ruta del Tabaco en Lugares (mapa Leaflet), 25 pueblos reales, 6 zonas, sin semilla',()=>{const h=read('hoja.js'),js=read('app.js'),sw=read('sw.js');
 const tw=h.match(/const TW='([^']+)'/)[1].split('|');assert.equal(tw.length,25);const z=new Set(tw.map(s=>s.split(',')[1]));assert.deepEqual([...z].sort(),['C','E','M','N','O','S']);
 for(const s of tw){const [,,la,lo]=s.split(',').map(Number);assert.ok(la>17.9&&la<18.55&&lo>-67.3&&lo<-65.6,s+' inside PR')}
 const a=JSON.parse(readD('artesanos.json')),p=JSON.parse(readD('places.json'));for(const n of tw.map(s=>s.split(',')[0]))assert.ok([...a,...p].some(x=>String(x.pueblo||'').includes(n)),n+' has data');
 assert.ok(js.includes('data-mode="ruta"')&&js.includes('function drawRuta(')&&js.includes("lugares:()=>vLugares(id)")&&js.includes('EXT.vRuta()'),'Ruta lives in Lugares on the same Leaflet map');
 assert.ok(!h.includes('viewBox="0 0 280 92"')&&!read('styles.css').includes('.rmap'),'hand-drawn outline removed');
 assert.ok(h.includes('href="#/lugares/ruta"')&&h.includes('Ver mi Ruta del Tabaco')&&!h.includes('${vRuta()}'),'pasaporte keeps only a shortcut');
 assert.ok(h.includes('Zona ${ZN[k]}</b>'),'zone stamps in Insignias');assert.ok(!/demo|seed/i.test(h.slice(h.indexOf('/* ruta del tabaco'),h.indexOf('function zonaSheet'))),'no demo seed');
 assert.ok(!fs.existsSync(path.join(S,'data','artesanos.json'))&&!/artesanos\.json|places\.json|events\.json|cigarros\.json/.test(sw+js),'duplicate JSONs gone from site/ and sw/app');
 assert.ok(js.includes("fetch('data/bundle.js'"),'refresh reads bundle.js');assert.ok(read('styles.css').includes('.map-wrap{position:relative;isolation:isolate'),'map panes stay under the sheet');});
test('v19: subtítulo del banner',()=>{const ap=fs.readFileSync(path.join(__dirname,'..','site','app.js'),'utf8');assert.equal(I18N().T.es['cat.lead'],'Las vitolas de nuestros artesanos, de norte a sur y de este a oeste de nuestra isla.');assert.ok(ap.includes("<p>${tt('cat.lead')}</p>"));assert.ok(!ap.includes('de Mayagüez a Caguas'));});

test('artisan logos: every id in LOGOS maps to an existing webp and a real artisan',()=>{const js=read('app.js');const ids=JSON.parse(js.match(/const LOGOS=new Set\((\[[^\]]*\])\)/)[1]);
 assert.equal(ids.length,15);const a=new Set(JSON.parse(readD('artesanos.json')).map(x=>x.id));
 for(const id of ids){assert.ok(fs.existsSync(path.join(S,'img/logos',id+'.webp')),'missing logo '+id);assert.ok(a.has(id),'unknown artisan '+id)}
 assert.match(read('sw.js'),/lhb-v57/);});

test('v21: botón "Añadir a mi pantalla" en el home, oculto en modo standalone',()=>{const ap=read('app.js'),hj=read('hoja.js'),css=read('styles.css');
 assert.match(ap,/<button type="button" class="btn-add" id="btnAdd"\$\{installHidden\(window\)\?' hidden':''\}>\$\{tt\('cat.install'\)\}<\/button>/);assert.equal(I18N().T.es['cat.install'],'📲 Instalar App');
 assert.ok(ap.includes("addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferred=e")&&ap.includes('d.prompt()')&&ap.includes("addEventListener('appinstalled'"));
 assert.ok(hj.includes("kind==='instalar'")&&hj.includes('Toca el botón <b>Compartir</b> ⬆️')&&hj.includes('Añadir a pantalla de inicio')&&hj.includes('Instalar app'));
 assert.match(css,/\.btn-add\[hidden\]\{display:none\}/);
 const fn=new Function('return '+ap.match(/function installHidden\(w\)\{.*?\}\r?\n/)[0])();
 const W=(sa,ns,inst)=>({__lhbInstalled:inst,matchMedia:q=>({matches:sa&&q==='(display-mode: standalone)'}),navigator:{standalone:ns}});
 assert.equal(fn(W(false,undefined,false)),false,'navegador: se ve');
 assert.equal(fn(W(true,undefined,false)),true,'display-mode standalone: oculto');
 assert.equal(fn(W(false,true,false)),true,'iOS navigator.standalone: oculto');
 assert.equal(fn(W(false,false,true)),true,'después de appinstalled: oculto');
 assert.match(read('sw.js'),/const VERSION='lhb-v57'/);});
test('v23: 7 artesanos nuevos hechos en PR (28 total), sin teléfonos/emails, Adjuntas en la Ruta',()=>{const a=JSON.parse(readD('artesanos.json'));assert.ok(a.length>=28);assert.equal(new Set(a.map(x=>x.id)).size,a.length);
 const ids=['la-hoja-del-chan','cigarros-j-velez','tabacos-el-roble','el-escondite-adjuntas','hr-handmade-cigars','fumita-pr','monte-mistica'];const b=read('data/bundle.js');
 for(const id of ids){const x=a.find(y=>y.id===id);assert.ok(x,id);assert.ok(x.iniciales&&x.historia&&x.fuentes.length,id);assert.ok(b.includes('"id":"'+id+'"'),id);const s=JSON.stringify(x);assert.ok(!/\d{3}[-. )]+\d{3}[-. ]\d{4}/.test(s),'tel '+id);assert.ok(!/@[a-z0-9-]+\.[a-z]{2,}/i.test(s.replace(/https?:\/\/[^"]+/g,'')),'email '+id)}
 assert.ok(/\|Adjuntas,C,/.test(read('hoja.js')));assert.match(read('sw.js'),/const VERSION='lhb-v57'/);});

test('v24: 4 artesanos aprobados por Sergio (32 total), sin teléfonos/emails, Ponce y Juana Díaz en la Ruta',()=>{const a=JSON.parse(readD('artesanos.json'));assert.equal(a.length,32);assert.equal(new Set(a.map(x=>x.id)).size,32);const b=read('data/bundle.js');
 for(const id of ['casa-robles-cigars','juana-diaz-cigars','el-bastion-cigars','don-chamorro-ponce']){const x=a.find(y=>y.id===id);assert.ok(x,id);assert.ok(x.iniciales&&x.historia&&x.fuentes.length,id);assert.ok(b.includes('"id":"'+id+'"'),id);const s=JSON.stringify(x);assert.ok(!/\d{3}[-. )]+\d{3}[-. ]\d{4}/.test(s),'tel '+id);assert.ok(!/@[a-z0-9-]+\.[a-z]{2,}/i.test(s.replace(/https?:\/\/[^"]+/g,'')),'email '+id)}
 const h=read('hoja.js');assert.ok(h.includes('|Ponce,S,')&&h.includes('|Juana Díaz,S,'));assert.match(read('sw.js'),/const VERSION='lhb-v57'/);});

test('v28: splash con La Ruta del Tabaco, eslogan y flor',()=>{const ix=read('index.html');const m=ix.match(/<div class="splash"[\s\S]*?<div class="campo"/);assert.ok(m);const txt=m[0].replace(/<[^>]+>/g,'').replace(/\s+/g,' ');assert.ok(txt.includes('La Ruta del Tabaco en Puerto Rico'));assert.ok(txt.includes('Cigarros de Puerto Rico'));assert.ok(m[0].includes('La Ruta <em>del Tabaco</em>'));assert.ok(m[0].includes('id="splashFlor"'));assert.ok(read('app.js').includes("VBArt.flor('sf')"));assert.match(read('sw.js'),/const VERSION='lhb-v57'/);});

test('v29: eventos sin marcadores ("no definido"/"por confirmar") y hora/lugar ocultos si faltan',()=>{const S3=path.join(__dirname,'..','site');const e=JSON.parse(fs.readFileSync(path.join(__dirname,'..','data','events.json'),'utf8'));const bad=/no definid|por confirmar|no publicad|sin confirmar/i;
 const bun=fs.readFileSync(path.join(S3,'data','bundle.js'),'utf8');const ev=JSON.parse(bun.slice(bun.indexOf('{'),bun.lastIndexOf('}')+1)).events;
 for(const x of [...e.actividades,...ev.actividades]){for(const k of ['titulo','hora','lugar','pueblo','precio','detalle'])assert.ok(!bad.test(x[k]||''),x.id+' '+k);assert.match(x.fecha,/^\d{4}-\d{2}-\d{2}$/,x.id);assert.ok(x.enlace||x.fuente_url,x.id+' fuente')}
 assert.ok(e.actividades.length>=9);assert.ok(e.actividades.some(x=>x.id==='kuros-halloween-2026-10-31'));
 const h=e.actividades.find(x=>x.id==='humo-y-tambor-2');assert.equal(h.fecha,'2026-10-24');assert.match(h.lugar,/Vaca Brava/);assert.match(h.hora,/5:00 PM.*\$25.*7:00 PM/);
 const hj=fs.readFileSync(path.join(S3,'hoja.js'),'utf8');assert.ok(hj.includes('const NOPH=')&&hj.includes('function evMeta('));
 assert.ok(!/\$\{esc\(e\.lugar\|\|''\)\}/.test(hj),'sin lugar vacío en hoja.js');assert.ok(!/Lugar no definido|Hora no definida|Por confirmar/.test(hj+fs.readFileSync(path.join(S3,'app.js'),'utf8')));
 // render real de la línea de datos con el helper de hoja.js
 const src=hj.match(/const NOPH=[^\n]+\nfunction evMeta[^\n]+/)[0];const esc=s=>String(s),scrub=s=>s;const f=new Function('esc','scrub',src+';return evMeta');const em=f(esc,scrub);
 assert.equal(em({hora:'Hora no definida',lugar:'Lugar no definido',pueblo:'Caguas'}),'Caguas');assert.equal(em({lugar:'Por confirmar'}),'');assert.equal(em({hora:'7 PM',lugar:'X',pueblo:'Y',precio:'$5'}),'7 PM · X, Y · $5');
 for(const x of e.actividades)assert.ok(!bad.test(em(x)),x.id);
});

test('v32: catálogo en orden alfabético',()=>{assert.ok(read('app.js').includes(".sort((a,b)=>(a.nombre||'').localeCompare(b.nombre||'','es'"));});

test('v39 SEO: páginas estáticas por lugar, índice, sitemap y robots',()=>{
 const P=JSON.parse(fs.readFileSync(path.join(__dirname,'..','data','places.json'),'utf8'));const H='https://lahojaboricua.com';
 for(const p of P){const h=read('lugares/'+p.id+'.html');
  assert.ok(h.includes('<h1>'+p.nombre.replace(/&/g,'&amp;').replace(/'/g,'&#x27;').replace(/"/g,'&quot;')+'</h1>'),p.id);assert.ok(h.includes('<link rel="canonical" href="'+H+'/lugares/'+p.id+'">'),p.id);
  assert.match(h,/<title>[^<]+Puerto Rico \| La Hoja Boricua<\/title>/);assert.match(h,/<meta name="description" content="[^"]{40,}">/);
  const ld=JSON.parse(h.match(/<script type="application\/ld\+json">(.*?)<\/script>/)[1]);assert.equal(ld.address.addressRegion,'PR');assert.equal(ld.name,p.nombre);
  assert.ok(h.includes('href="../#/lugares"'),'abrir en la app '+p.id);assert.ok(!/hecho[s]? en (PR|Puerto Rico)/i.test(h),p.id);
  assert.ok(!/\d{3}[-. )]+\d{3}[-. ]\d{4}/.test(h),'tel '+p.id);}
 const ix=read('lugares/index.html');for(const p of P)assert.ok(ix.includes('href="'+p.id+'.html"'),p.id);
 const sm=read('sitemap.xml');assert.ok(sm.includes('<loc>'+H+'/</loc>')&&sm.includes('<loc>'+H+'/lugares/</loc>'));for(const p of P)assert.ok(sm.includes('<loc>'+H+'/lugares/'+p.id+'</loc>'),p.id);
 assert.ok(read('robots.txt').includes('Sitemap: '+H+'/sitemap.xml'));
 const h=read('index.html');assert.ok(h.includes('<a href="lugares/">Cigar lounges en Puerto Rico</a>'));assert.ok(h.includes('<link rel="canonical" href="'+H+'/">'));
 assert.ok(h.includes('google-site-verification'));const d=h.match(/<meta name="description" content="([^"]*)"/)[1];assert.ok(!/Prototipo|hechos en Puerto Rico/.test(d));
 const sw=read('sw.js');assert.ok(!sw.includes("'lugares/"),'lugares fuera del precache');assert.ok(sw.includes("!url.pathname.includes('/lugares/')"),'no pisa el shell');
});

test('v40 SEO: páginas estáticas por artesano, índice y sitemap',()=>{
 const H='https://lahojaboricua.com';const A=JSON.parse(fs.readFileSync(path.join(__dirname,'..','data','artesanos.json'),'utf8'));const C=JSON.parse(fs.readFileSync(path.join(__dirname,'..','data','cigarros.json'),'utf8'));
 const R=f=>fs.readFileSync(path.join(__dirname,'..','site',f),'utf8');const ix=R('artesanos/index.html'),sm=R('sitemap.xml');
 for(const a of A){const h=R('artesanos/'+a.id+'.html');
  assert.ok(h.includes('<link rel="canonical" href="'+H+'/artesanos/'+a.id+'">'),a.id);assert.ok(h.includes('application/ld+json')&&h.includes('<meta name="description"'),a.id);
  assert.ok(h.includes('href="../#/a/'+a.id+'"'),'abrir en la app '+a.id);assert.ok(!/fuerza/i.test(h),'fortaleza '+a.id);assert.ok(!/@[a-z0-9.-]+\.[a-z]{2,}|wa\.me|tel:/i.test(h),'sin emails/teléfonos '+a.id);
  if(!(a.hecho_en_pr===true&&a.hecho_en_pr_fuente))assert.ok(!/(hecho|torcido)s? en (PR|Puerto Rico)/i.test(h),'hecho en PR sin fuente '+a.id);
  for(const c of C.filter(c=>c.artesano_id===a.id))assert.ok(h.includes('href="../cigarros/'+c.id+'.html"'),c.id);
  assert.ok(ix.includes('href="'+a.id+'.html"'),a.id);assert.ok(sm.includes('<loc>'+H+'/artesanos/'+a.id+'</loc>'),a.id);}
 assert.ok(sm.includes('<loc>'+H+'/artesanos/</loc>')&&sm.includes('<loc>'+H+'/lugares/</loc>'));
 assert.ok(R('index.html').includes('<a href="artesanos/">Artesanos de cigarros en Puerto Rico</a>'));assert.ok(R('lugares/index.html').includes('href="../artesanos/"'));
 const sw=R('sw.js');assert.ok(!sw.includes("'artesanos/"),'artesanos fuera del precache');assert.ok(sw.includes("!url.pathname.includes('/artesanos/')"));
});
test('LHB-41 SEO: página estática por cigarro, índice, sitemap y fuera del caché del shell',()=>{
 const H='https://lahojaboricua.com';const C=JSON.parse(readD('cigarros.json'));const A=new Map(JSON.parse(readD('artesanos.json')).map(a=>[a.id,a]));
 const dir=path.join(S,'cigarros');const files=fs.readdirSync(dir).filter(f=>f.endsWith('.html')).sort();
 assert.deepEqual(files,C.map(c=>c.id+'.html').concat('index.html').sort(),'una página por cigarro y nada más');
 const ix=read('cigarros/index.html'),sm=read('sitemap.xml');
 for(const c of C){const h=read('cigarros/'+c.id+'.html');
  assert.ok(h.includes('<link rel="canonical" href="'+H+'/cigarros/'+c.id+'">'),c.id);assert.ok(h.includes('href="../#/c/'+c.id+'"'),'abrir en la app '+c.id);
  const ld=JSON.parse(h.match(/<script type="application\/ld\+json">(.*?)<\/script>/)[1]);
  assert.equal(ld['@type'],'Product',c.id);assert.equal(ld.name,c.nombre,c.id);assert.ok(!('offers' in ld)&&!/precio|\$\s?\d/i.test(JSON.stringify(ld)),'sin precios en JSON-LD '+c.id);
  if(c.notas&&c.notas.trim())assert.ok(h.includes('<p>'+c.notas.trim().replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#x27;')+'</p>'),'notas visibles como en la app '+c.id);
  const a=A.get(c.artesano_id);assert.equal(ld.brand.name,a.nombre,c.id);assert.ok(h.includes('href="../artesanos/'+a.id+'.html"'),c.id);
  if(c.fortaleza)assert.ok(ld.additionalProperty.some(p=>p.name==='Fortaleza'&&p.value===c.fortaleza[0].toUpperCase()+c.fortaleza.slice(1)),c.id);if(c.capa)assert.ok(ld.additionalProperty.some(p=>p.name==='Capa'&&p.value===c.capa.trim()),c.id);
  for(const u of (c.fuentes||[]).filter(u=>String(u).startsWith('http')))assert.ok(h.includes('href="'+u.replace(/&/g,'&amp;')+'"'),'fuente '+c.id);
  const foto=fs.existsSync(path.join(S,'img','cigarros',c.id+'.webp'));assert.equal(h.includes('src="../img/cigarros/'+c.id+'.webp"'),foto,'foto '+c.id);
  assert.ok(!/fuerza/i.test(h),'fortaleza '+c.id);assert.ok(!/@[a-z0-9.-]+\.[a-z]{2,}|wa\.me|tel:/i.test(h),'sin emails/teléfonos '+c.id);assert.ok(!/(hecho|torcido)s? en (PR|Puerto Rico)/i.test(h),'sin reclamo de origen '+c.id);
  assert.ok(ix.includes('href="'+c.id+'.html"'),c.id);assert.ok(sm.includes('<loc>'+H+'/cigarros/'+c.id+'</loc>'),'sitemap '+c.id);}
 assert.ok(sm.includes('<loc>'+H+'/cigarros/</loc>'));
 const sw=read('sw.js');assert.ok(!sw.includes("'cigarros/"),'cigarros fuera del precache');assert.ok(sw.includes("!url.pathname.includes('/cigarros/')"));
});
test('LHB-41: el service worker no guarda una página de cigarro como el shell de la app',async()=>{
 const vm=require('vm');const L={};const put=[];
 const ctx={self:{addEventListener:(t,f)=>{L[t]=f}},location:{origin:'https://lahojaboricua.com'},URL,Response,
  caches:{match:()=>Promise.resolve(null),open:()=>Promise.resolve({put(k){put.push(k)},match(){return Promise.resolve(null)}}),keys:()=>Promise.resolve([])},
  fetch:()=>Promise.resolve(new Response('<html>'))};
 vm.createContext(ctx);vm.runInContext(read('sw.js'),ctx);
 const nav=async u=>{put.length=0;let p;L.fetch({request:{method:'GET',url:'https://lahojaboricua.com'+u,mode:'navigate'},respondWith(x){p=x}});await p;for(let i=0;i<5;i++)await new Promise(r=>setImmediate(r));return put.slice()};
 for(const u of ['/cigarros/yambo-toro','/cigarros/','/artesanos/yambo-cigars','/lugares/','/privacidad','/privacidad.html'])assert.deepEqual(await nav(u),[],u);
 assert.deepEqual(await nav('/'),['./'],'la app sí se guarda como shell');
});
test('LHB-27: cada clave tt() existe en español e inglés, y los dos tienen las mismas claves',()=>{
 const {T}=I18N();const es=Object.keys(T.es).sort(),en=Object.keys(T.en).sort();assert.deepEqual(en,es,'mismas claves');
 const used=new Set([...read('app.js').matchAll(/\btt\('([^']+)'/g)].map(m=>m[1]).filter(k=>k!=='fort.'));
 for(const m of read('hoja.js').matchAll(/LHB_I18N\.t\('([^']+)'/g))used.add(m[1]);
 for(const f of ['suave','media','fuerte'])used.add('fort.'+f);for(const k of ['arts.nVitola','arts.nVitolas'])used.add(k);
 assert.ok(used.size>100,'claves usadas: '+used.size);
 for(const k of used){assert.ok(typeof T.es[k]==='string'&&T.es[k].length,'es '+k);assert.ok(typeof T.en[k]==='string'&&T.en[k].length,'en '+k);}
 for(const k of es)assert.ok(used.has(k),'clave sin usar '+k);
 for(const k of es)assert.deepEqual((T.en[k].match(/\{\w+\}/g)||[]).sort(),(T.es[k].match(/\{\w+\}/g)||[]).sort(),'mismas variables '+k);
});
test('LHB-27: ningún texto en español queda escrito en las vistas de app.js (antes: 161)',()=>{
 const {scan}=require('./i18n-scan.js');assert.deepEqual(scan(read('app.js')),[]);
 const before=fs.readFileSync(path.join(__dirname,'..','evidence','lhb-27-scan-before.txt'),'utf8').trim().split(/\r?\n/);assert.equal(before[before.length-1],'TOTAL 161');
});
test('LHB-27: idioma por navigator.language, se recuerda, y se queda en español hasta E6',()=>{
 const I=I18N();assert.equal(I.ENABLED,false);assert.equal(I.lang,'es');
 assert.equal(I.pick('en-US',null),'en');assert.equal(I.pick('en',null),'en');assert.equal(I.pick('es-PR',null),'es');assert.equal(I.pick('fr',null),'es');assert.equal(I.pick(undefined,null),'es');
 assert.equal(I.pick('en-US','es'),'es');assert.equal(I.pick('es-PR','en'),'en');assert.equal(I.pick('en-US','xx'),'en');
 assert.equal(I.t('lug.lead',{nL:28,nV:13}),'28 lounges y 13 puntos de venta en la isla.');assert.equal(I.t('no.existe',null,'x'),'x');assert.equal(I.t('no.existe'),'no.existe');
 const src=read('i18n.js');assert.ok(src.includes("localStorage.getItem('lhb_lang')")&&src.includes("localStorage.setItem('lhb_lang'"));
 // con el selector activado, inglés para en-*, y el html lang cambia
 const w={navigator:{language:'en-US'},localStorage:{getItem:()=>null},document:{documentElement:{},readyState:'complete',getElementById:()=>null}};
 require('vm').runInNewContext(src.replace('const ENABLED=false;','const ENABLED=true;'),{window:w});
 assert.equal(w.LHB_I18N.lang,'en');assert.equal(w.document.documentElement.lang,'en');assert.equal(w.LHB_I18N.t('cig.notFound'),'We could not find that vitola.');
 const ix=read('index.html');assert.ok(/<button class="lang-switch" type="button" id="langSwitch" hidden><\/button>/.test(ix),'selector escondido');
 assert.ok(ix.indexOf('i18n.js')>0&&ix.indexOf('i18n.js')<ix.indexOf('app.js'),'i18n.js antes de app.js');assert.ok(read('sw.js').includes("'i18n.js'"),'i18n.js en el shell');
 assert.ok(!src.includes('\u2014'),'sin raya larga en i18n.js');
});
test('LHB-44: JSON-LD válido en cada página: migas de pan, tipos con sus propiedades, sameAs de los datos, WebSite en el inicio',()=>{
 const H='https://lahojaboricua.com';const lds=h=>[...h.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/g)].map(m=>JSON.parse(m[1]));
 const prof=r=>['web','instagram','facebook','youtube'].map(k=>String(r[k]||'').trim()).filter((u,i,a)=>u.startsWith('http')&&!/(^|\/\/|\.)wa\.me\b|whatsapp/i.test(u)&&a.indexOf(u)===i);
 const data={lugares:JSON.parse(readD('places.json')),artesanos:JSON.parse(readD('artesanos.json')),cigarros:JSON.parse(readD('cigarros.json'))};
 const SEC={lugares:'Cigar lounges en Puerto Rico',artesanos:'Artesanos de cigarros en Puerto Rico',cigarros:'Cigarros hechos por artesanos boricuas'};
 let pages=0;
 for(const dir of Object.keys(SEC))for(const f of fs.readdirSync(path.join(S,dir)).filter(f=>f.endsWith('.html'))){
  const h=read(dir+'/'+f);const all=lds(h);const id=f.replace(/\.html$/,'');const canon=h.match(/<link rel="canonical" href="([^"]+)">/)[1];pages++;
  const bc=all.filter(o=>o['@type']==='BreadcrumbList');assert.equal(bc.length,1,'una BreadcrumbList '+dir+'/'+f);
  const it=bc[0].itemListElement;assert.deepEqual(it.map(x=>x.position),it.map((_,i)=>i+1),f);assert.equal(it[0].item,H+'/');assert.equal(it[1].item,H+'/'+dir+'/');assert.equal(it[1].name,SEC[dir]);
  assert.equal(it[it.length-1].item,canon,'la última miga es la página '+f);assert.equal(it.length,id==='index'?2:3,f);for(const x of it)assert.ok(x.name&&x['@type']==='ListItem',f);
  if(id==='index')continue;
  const main=all[0];assert.ok(main.name&&main.url===canon,'name y url '+f);const rec=data[dir].find(r=>r.id===id);assert.ok(rec,f);
  if(dir==='cigarros'){assert.equal(main['@type'],'Product');assert.ok(main.brand&&main.brand.name,f);}
  else if(dir==='artesanos'){assert.equal(main['@type'],'Organization');assert.deepEqual(main.sameAs||[],prof(rec),'sameAs '+f);}
  else{assert.ok(['Store','Restaurant','BarOrPub'].includes(main['@type']),f);assert.ok(main.address&&main.address.addressRegion==='PR',f);assert.deepEqual(main.sameAs||[],prof(rec),'sameAs '+f);}
 }
 assert.equal(pages,data.lugares.length+data.artesanos.length+data.cigarros.length+3,'cada página contada');
 const home=lds(read('index.html'));assert.equal(home.length,1);const g=home[0]['@graph'];
 // Google pide al menos dos ListItem en una BreadcrumbList; el inicio es la raíz y no lleva migas
 assert.ok(!g.some(o=>o['@type']==='BreadcrumbList')&&!/BreadcrumbList/.test(read('index.html')),'sin migas en el inicio');
 assert.ok(!/dateModified|datePublished/.test(read('index.html')),'sin fechas inventadas en el inicio');
 const py=require('child_process').spawnSync('python',['-c','import sys;sys.path.insert(0,"tools");from schema import same_as;print("|".join(same_as({"web":"https://WA.ME/15555550100","instagram":"https://www.instagram.com/x/","facebook":"https://api.WhatsApp.com/send?phone=1","youtube":"https://www.instagram.com/x/"})))'],{cwd:path.join(__dirname,'..'),encoding:'utf8'});
 assert.equal(py.stdout.trim(),'https://www.instagram.com/x/','WhatsApp fuera de sameAs sin importar mayúsculas; sin repetidos');
 const ws=g.find(o=>o['@type']==='WebSite'),org=g.find(o=>o['@type']==='Organization');
 assert.equal(ws.url,H+'/');assert.equal(ws.name,'La Hoja Boricua');assert.equal(ws.publisher['@id'],org['@id']);assert.equal(org.url,H+'/');assert.ok(fs.existsSync(path.join(S,org.logo.replace(H+'/',''))),'logo existe');
 for(const dir of Object.keys(SEC))for(const f of fs.readdirSync(path.join(S,dir)).filter(f=>f.endsWith('.html')))assert.ok(!/dateModified|datePublished/.test(read(dir+'/'+f)),'sin fechas inventadas '+f);
});
test('LHB-25: reglas del @ y del perfil: largo, caracteres, reservados, minúscula, bio 160',async()=>{
 const {pathToFileURL}=require('url');const P=await import(pathToFileURL(path.join(__dirname,'..','functions','_lib','profile.js')).href);
 assert.deepEqual(P.checkHandle('  Sergio_PR '),{handle:'sergio_pr'},'se guarda en minúscula, sin espacios');
 for(const h of ['abc','a_1','x'.repeat(20)])assert.deepEqual(P.checkHandle(h),{handle:h},h);
 for(const h of ['ab','x'.repeat(21),'ab-c','a b','ñandú','a.b','',null,undefined])assert.deepEqual(P.checkHandle(h),{error:'handle-invalid'},String(h));
 for(const h of ['admin','API','lahojaboricua','mihoja','cigarros','privacidad'])assert.deepEqual(P.checkHandle(h),{error:'handle-reserved'},h);
 assert.deepEqual(P.checkHandle('u'),{error:'handle-invalid'},'u es muy corto antes de ser reservado');assert.ok(P.RESERVED.has('u'));
 const ok={handle:'tabaquero',...IDN,avatar_url:AV};
 assert.deepEqual(P.checkProfile(ok),{handle:'tabaquero',first_name:'Ana',last_name:'Mora',gender:'F',birth_date:'1990-05-17',display_name:'Ana M.',bio:null,favorite_brand:null,avatar_key:AV});
 /* LHB-52: la casilla de 21+ ya no vale: sin fecha de nacimiento no hay perfil, diga lo que diga age_ok */
 for(const a of [undefined,false,'true',1,true])assert.deepEqual(P.checkProfile({handle:'tabaquero',age_ok:a,avatar_url:AV}),{error:'first_name-required'},'age_ok '+a+' no reemplaza la identidad');
 assert.deepEqual(P.checkProfile({...ok,age_ok:false}).error,undefined,'y una fecha válida tampoco necesita age_ok');
 for(const b of [null,'x',[],42])assert.deepEqual(P.checkProfile(b),{error:'bad-body'});
 assert.equal(P.checkProfile({...ok,bio:'🌿'.repeat(160)}).bio,'🌿'.repeat(160),'160 caracteres (no bytes)');
 assert.deepEqual(P.checkProfile({...ok,bio:'a'.repeat(161)}),{error:'bio-long'});
 assert.equal(P.checkProfile({...ok,display_name:'Cualquier Otro Nombre'}).display_name,'Ana M.','display_name no lo manda el cliente: sale del nombre y la inicial del apellido');
 assert.deepEqual(P.checkProfile({...ok,favorite_brand:'a'.repeat(61)}),{error:'favorite_brand-long'});
 assert.equal(P.checkProfile({...ok,bio:'línea 1\nlínea 2'}).bio,'línea 1\nlínea 2','la bio admite saltos de línea');
 assert.deepEqual(P.checkProfile({...ok,first_name:'a\nb'}),{error:'first_name-invalid'},'el nombre no admite saltos de línea');
 assert.deepEqual(P.checkProfile({...ok,favorite_brand:7}),{error:'favorite_brand-invalid'});
 assert.deepEqual(P.checkProfile({...ok,first_name:'   '}),{error:'first_name-required'},'un nombre en blanco no cuenta');
 const h=read('hoja.js');const re=h.match(/const HANDLE_RE=(\/[^;]+\/);/)[1];assert.equal(re,'/^[a-z0-9_]{3,20}$/','la app usa la misma regla que el servidor');
 for(const [pk,fapi] of [...h.matchAll(/pk:'(pk_(?:live|test)_[A-Za-z0-9]+)',fapi:'([a-z0-9.-]+)'/g)].map(m=>[m[1],m[2]]))assert.equal(Buffer.from(pk.slice(8),'base64').toString(),fapi+'$',fapi);
 assert.match(h,/CLERK=location\.hostname==='lahojaboricua\.com'\?\{pk:'pk_live_/,'producción usa la llave live; las vistas previas, la de Development');
 assert.match(h,/function vMiHoja\(sub\)\{requireAccount\(\(\)=>vMiHojaIn\(sub\),sub==='editar'\?\{edit:true\}:undefined\)\}/,'Mi Hoja pasa por la cuenta');assert.ok(read('index.html').indexOf('cuenta.js')>0&&read('index.html').indexOf('cuenta.js')<read('index.html').indexOf('hoja.js'),'cuenta.js antes de hoja.js');assert.ok(read('sw.js').includes("'cuenta.js'"),'cuenta.js en el shell');
 assert.ok(!h.includes('obAge')&&!h.includes('Tengo 21 años o más'),'LHB-52: la casilla de 21+ se quitó; la fecha de nacimiento la reemplaza');
});
test('LHB-25: POST /api/profile en SQLite real: 401, 415, 400, 201, @ repetido, perfil repetido; Mi Hoja sin perfil: 403',async()=>{
 const {DatabaseSync}=require('node:sqlite');const db=new DatabaseSync(':memory:');
 const mig=f=>fs.readFileSync(path.join(__dirname,'..','migrations',f),'utf8');db.exec(mig('0001_init.sql'));db.exec(mig('0002_clerk_profiles.sql'));db.exec(mig('0003_identity.sql'));
 const DB={prepare:sql=>{const st=db.prepare(sql);return{bind:(...a)=>({first:async()=>st.get(...a)??null,run:async()=>({success:true,meta:{changes:Number(st.run(...a).changes)}})})}}};
 const {pathToFileURL}=require('url');const imp=f=>import(pathToFileURL(path.join(__dirname,'..','functions',...f.split('/'))).href);
 const auth=await imp('_lib/auth.js'),P=await imp('_lib/profile.js'),api=await imp('api/profile.js'),me=await imp('api/me.js');
 const ISS='https://daring-eagle-8394.clerk.accounts.dev';const alg={name:'RSASSA-PKCS1-v1_5',modulusLength:2048,publicExponent:new Uint8Array([1,0,1]),hash:'SHA-256'};
 const k=await crypto.subtle.generateKey(alg,true,['sign','verify']);const jwk={...await crypto.subtle.exportKey('jwk',k.publicKey),kid:'k1'};
 const b64=b=>Buffer.from(b).toString('base64url');const enc=o=>b64(JSON.stringify(o));const t=Math.floor(Date.now()/1000);
 const tok=async sub=>{const d=enc({alg:'RS256',kid:'k1'})+'.'+enc({iss:ISS,sub,azp:'https://lhb-25-signin.la-hoja-boricua.pages.dev',exp:t+60,nbf:t-5});return d+'.'+b64(new Uint8Array(await crypto.subtle.sign('RSASSA-PKCS1-v1_5',k.privateKey,new TextEncoder().encode(d))))};
 const realFetch=globalThis.fetch;globalThis.fetch=async u=>{assert.equal(String(u),ISS+'/.well-known/jwks.json');return new Response(JSON.stringify({keys:[jwk]}))};
 const env={CLERK_ISSUERS:ISS,DB};
 const req=(token,body,type='application/json')=>({headers:{get:h=>({Authorization:token?'Bearer '+token:null,'Content-Type':type})[h]??null},json:async()=>typeof body==='string'?JSON.parse(body):body});
 const post=async(token,body,type,e=env)=>{const r=await api.onRequestPost({request:req(token,body,type),env:e});return [r.status,await r.json()]};
 try{auth.clearJwksCache();
  const a=await tok('user_a'),b=await tok('user_b'),c=await tok('user_c');
  assert.deepEqual(await post(null,{handle:'x'}),[401,{error:'no-session'}]);
  assert.deepEqual(await post(a,{handle:'tabaquero',...IDN},undefined,{DB}),[503,{error:'no-auth-config'}]);
  assert.deepEqual(await post('basura',{handle:'tabaquero',...IDN}),[401,{error:'no-session'}]);
  assert.deepEqual(await post(a,{handle:'tabaquero',...IDN},'text/plain'),[415,{error:'bad-type'}],'solo JSON');
  assert.deepEqual(await post(a,'{no es json'),[400,{error:'bad-body'}]);
  assert.deepEqual(await post(a,{handle:'tabaquero',age_ok:true}),[400,{error:'first_name-required'}],'sin identidad no hay perfil, ni con age_ok');
  assert.deepEqual(await post(a,{handle:'admin',...IDN}),[400,{error:'handle-reserved'}]);
  assert.equal(db.prepare('SELECT COUNT(*) n FROM profiles').get().n,0,'nada guardado todavía');
  const before=new Date().toISOString();
  assert.deepEqual(await post(a,{handle:'TabaQuero',...IDN,first_name:' Ana ',bio:'Fumo los domingos.',favorite_brand:'Yambo Cigars',avatar_url:AV}),
   [201,{profile:{handle:'tabaquero',display_name:'Ana M.',bio:'Fumo los domingos.',favorite_brand:'Yambo Cigars',avatar_key:AV}}]);
  const row=db.prepare('SELECT * FROM profiles WHERE user_id=?1').get('user_a');assert.equal(row.handle,'tabaquero');assert.ok(row.age_ok_at>=before,'hora del 21+ guardada');assert.equal(row.hidden,0);
  assert.deepEqual(await post(b,{handle:'tabaquero',...IDN,avatar_url:AV}),[409,{error:'handle-taken'}],'@ único');
  assert.deepEqual(await post(b,{handle:'TABAQUERO',...IDN,avatar_url:AV}),[409,{error:'handle-taken'}],'único sin importar mayúsculas');
  assert.deepEqual(await post(a,{handle:'otro_nombre',...IDN,avatar_url:AV}),[409,{error:'profile-exists'}],'cambiar el perfil es de LHB-34');
  assert.equal(db.prepare('SELECT handle FROM profiles WHERE user_id=?1').get('user_a').handle,'tabaquero','el 409 no cambió nada');
  const gate=async token=>{const r=await P.requireProfile(req(token),env);return r instanceof Response?[r.status,await r.json()]:[200,r.profile.handle,r.user.sub]};
  assert.deepEqual(await gate(null),[401,{error:'no-session'}]);
  assert.deepEqual(await gate(c),[403,{error:'no-profile'}],'una API de Mi Hoja rechaza a quien no tiene perfil');
  assert.deepEqual(await gate(a),[200,'tabaquero','user_a']);
  const m=await me.onRequestGet({request:req(a),env});assert.equal((await m.json()).profile.handle,'tabaquero','/api/me ya ve el perfil');
  /* LHB-49: la foto es obligatoria y solo vale una URL de Clerk; un rechazo no guarda nada ni gasta el @ */
  assert.equal(db.prepare('SELECT avatar_key FROM profiles WHERE user_id=?1').get('user_a').avatar_key,AV,'la URL de Clerk quedó en avatar_key');
  assert.equal((await (await me.onRequestGet({request:req(a),env})).json()).profile.avatar_key,AV,'/api/me devuelve la URL guardada');
  assert.deepEqual(await post(c,{handle:'sinfoto',...IDN}),[400,{error:'avatar-required'}],'sin foto no hay perfil');
  assert.deepEqual(await post(c,{handle:'sinfoto',...IDN,avatar_url:''}),[400,{error:'avatar-required'}]);
  for(const bad of ['https://evil.example/x.png','http://img.clerk.com/x','https://img.clerk.com.evil.example/x',42])assert.deepEqual(await post(c,{handle:'sinfoto',...IDN,avatar_url:bad}),[400,{error:'avatar-invalid'}],String(bad));
  assert.equal(db.prepare('SELECT COUNT(*) n FROM profiles WHERE user_id=?1').get('user_c').n,0,'los rechazos no guardaron nada');
  assert.equal((await post(c,{handle:'sinfoto',...IDN,avatar_url:AV}))[0],201,'y el @ no se gastó con los rechazos');
 }finally{globalThis.fetch=realFetch}
});
function CUENTA_HARNESS(over){
 const vm=require('vm');const ctx={window:{}};vm.createContext(ctx);vm.runInContext(read('cuenta.js'),ctx);
 const log=[];let hash='#/mihoja',lis=null,store=null,intent=null,lastNotice=null;const navL=[];
 /* LHB-49: una cuenta de prueba sin hasImage explícito trae foto (la que Clerk importa de Google); las pruebas de la foto lo ponen en false */
 let cu=null;const C={get user(){return cu},set user(v){cu=v&&v.hasImage===undefined?{hasImage:true,imageUrl:'https://img.clerk.com/test-'+v.id,...v}:v},addListener(f){lis=f},signIn(id){C.user=id?{id}:null;lis&&lis({user:C.user})}};
 const D={clerk:async()=>C,api:async()=>({status:0,body:{}}),here:()=>hash,onNav:f=>navL.push(f),reroute:()=>log.push('reroute'),
  store:{get:()=>store,set:v=>{store=v;log.push('store:'+v.sub+':'+v.handle)},clear:()=>{store=null;log.push('clear')}},
  intent:{get:()=>intent,set:v=>{intent=v;log.push('intent')},clear:()=>{intent=null}},
  openSignIn:()=>log.push('open'),ui:{card:h=>log.push('card:'+h),notice:(h,p,b)=>{log.push('notice:'+h);lastNotice=b},closeAll:()=>{lastNotice=null;log.push('closeAll')},onboarding:f=>log.push('onboarding'),identity:f=>log.push('identity'),toast:m=>log.push('toast')},...over};
 const A=ctx.window.LHB_CUENTA(D);
 return {A,C,D,log,notice:()=>lastNotice,go:()=>log.push('GO'),nav:h=>{const ch=h!==hash;hash=h;if(ch)navL.forEach(f=>f())},cache:v=>{store=v},intent:()=>intent,setIntent:v=>{intent=v},ui:()=>D.ui};
}
const tick=async(n=8)=>{for(let i=0;i<n;i++)await new Promise(r=>setImmediate(r))};
const defer=()=>{let ok;const p=new Promise(r=>ok=r);return {p,ok}};
test('LHB-25: la puerta de Mi Hoja: un 401 o 403 cierra aunque haya perfil guardado; sin conexión o 5xx abre solo al mismo usuario',async()=>{
 for(const st of [401,403]){const h=CUENTA_HARNESS({api:async()=>({status:st,body:{error:'no-session'}})});h.C.user={id:'user_a'};h.cache({sub:'user_a',handle:'ana'});
  await h.A.require(h.go);await tick();assert.ok(!h.log.includes('GO'),'status '+st+' no abre Mi Hoja');assert.ok(h.log.includes('clear'),'borra el perfil guardado');assert.ok(h.log.includes('card:No pudimos revisar tu cuenta'))}
 for(const st of [0,500,503]){const h=CUENTA_HARNESS({api:async()=>{if(st===0)throw new Error('offline');return {status:st,body:{}}}});h.C.user={id:'user_a'};h.cache({sub:'user_a',handle:'ana'});
  await h.A.require(h.go);await tick();assert.deepEqual(h.log.filter(x=>x==='GO'),['GO'],'status '+st+': abre con su perfil guardado')}
 const x4=CUENTA_HARNESS({api:async()=>({status:404,body:{}})});x4.C.user={id:'user_a'};x4.cache({sub:'user_a',handle:'ana'});await x4.A.require(x4.go);await tick();assert.ok(!x4.log.includes('GO'),'un 404 tampoco abre desde el perfil guardado');const o=CUENTA_HARNESS({api:async()=>({status:0,body:{}})});o.C.user={id:'user_b'};o.cache({sub:'user_a',handle:'ana'});await o.A.require(o.go);await tick();
 assert.ok(!o.log.includes('GO'),'el perfil guardado de otro usuario no abre');
 const n=CUENTA_HARNESS({api:async()=>({status:0,body:{}})});n.C.user={id:'user_a'};await n.A.require(n.go);await tick();assert.ok(!n.log.includes('GO'),'sin perfil guardado y sin red no abre');
 const k=CUENTA_HARNESS({clerk:async()=>{throw new Error('sin red')}});k.cache({sub:'user_a',handle:'ana'});await k.A.require(k.go);await tick();assert.ok(k.log.includes('GO'),'Clerk no carga y hay perfil guardado: abre');
 const k2=CUENTA_HARNESS({clerk:async()=>{throw new Error('sin red')}});await k2.A.require(k2.go);await tick();assert.ok(!k2.log.includes('GO')&&k2.log.includes('card:Necesitas conexión'));
 const ok=CUENTA_HARNESS({api:async()=>({status:200,body:{profile:{handle:'ana'}}})});ok.C.user={id:'user_a'};await ok.A.require(ok.go);await tick();assert.deepEqual(ok.log.filter(x=>x.startsWith('store')||x==='GO'),['store:user_a:ana','GO']);
});
test('LHB-25: una respuesta tardía no se le pega a otra cuenta ni a otra pantalla',async()=>{
 const d=defer();const h=CUENTA_HARNESS({api:()=>d.p});h.C.user={id:'user_a'};
 const run=h.A.require(h.go);await tick();h.C.signIn('user_b');d.ok({status:200,body:{profile:{handle:'ana'}}});await run;await tick();
 assert.ok(!h.log.some(x=>x.startsWith('store')),'el perfil de A no se guarda bajo B');assert.ok(!h.log.includes('GO'),'no se abre Mi Hoja con la respuesta de A');
 assert.ok(h.log.includes('reroute'),'el cambio de cuenta vuelve a revisar');
 const e=defer();const g=CUENTA_HARNESS({api:()=>e.p});g.C.user={id:'user_a'};const run2=g.A.require(g.go);await tick();g.nav('#/catalogo');e.ok({status:200,body:{profile:{handle:'ana'}}});await run2;await tick();
 assert.ok(!g.log.includes('GO')&&!g.log.some(x=>x.startsWith('store')),'si el usuario se fue de la página, la respuesta se ignora');
 const f=defer();const s=CUENTA_HARNESS({api:()=>f.p});s.C.user={id:'user_a'};const run3=s.A.require(s.go);await tick();s.C.signIn(null);f.ok({status:200,body:{profile:{handle:'ana'}}});await run3;await tick();
 assert.ok(!s.log.includes('GO'),'salir mientras se revisa cierra la puerta');assert.ok(s.log.includes('clear'),'salir borra el perfil guardado');const d3=defer();const t=CUENTA_HARNESS({api:()=>d3.p});t.C.user={id:'user_a'};const run4=t.A.require(t.go);await tick();t.C.user={id:'user_b'};d3.ok({status:200,body:{profile:{handle:'ana'}}});await run4;await tick();assert.ok(!t.log.includes('GO')&&!t.log.some(x=>x.startsWith('store')),'el usuario cambió antes de que Clerk avisara: la respuesta se ignora');const d4=defer(),d5=defer();let n5=0;const u=CUENTA_HARNESS({api:()=>(++n5===1?d4.p:d5.p)});u.C.user={id:'user_a'};const r1=u.A.require(u.go);await tick();const r2=u.A.require(u.go);await tick();d5.ok({status:200,body:{profile:{handle:'ana'}}});await r2;d4.ok({status:200,body:{profile:{handle:'ana'}}});await r1;await tick();assert.deepEqual(u.log.filter(x=>x==='GO'),['GO'],'dos revisiones a la vez abren Mi Hoja una sola vez');const d6=defer();const w=CUENTA_HARNESS({api:()=>d6.p});w.C.user={id:'user_a'};const r6=w.A.require(w.go);await tick();w.C.signIn(null);w.C.signIn('user_a');d6.ok({status:200,body:{profile:{handle:'ana'}}});await r6;await tick();assert.ok(!w.log.includes('GO'),'salir y volver a entrar como la misma persona anula la revisión vieja');
});
test('LHB-25: el perfil nuevo: se guarda una vez, abre Mi Hoja, y un envío pendiente no toca nada si el usuario cambió o se fue',async()=>{
 const mk=async(submitResult,after)=>{const calls=[];let submit;const h=CUENTA_HARNESS({api:async(C,m,p,b)=>{calls.push(m+' '+p);return m==='GET'?{status:200,body:{needsProfile:true}}:submitResult(b)}});
  h.D.ui.onboarding=s=>{submit=s};h.C.user={id:'user_a'};await h.A.require(h.go);await tick();assert.equal(typeof submit,'function','muestra el onboarding');
  const res=submit({handle:'ana',display_name:'',bio:'',favorite_brand:''});after&&after(h);return {h,res:await res,calls}};
 let r=await mk(()=>({status:201,body:{profile:{handle:'ana'}}}));
 assert.deepEqual(r.res,{ok:true});assert.deepEqual(r.h.log.filter(x=>x.startsWith('store')||x==='GO'||x==='toast'),['store:user_a:ana','toast','GO']);
 assert.deepEqual(r.calls,['GET /api/me','POST /api/profile']);
 r=await mk(()=>({status:409,body:{error:'handle-taken'}}));assert.deepEqual(r.res,{error:'handle-taken'});assert.ok(!r.h.log.includes('GO'));
 r=await mk(()=>({status:201,body:{profile:{handle:'ana'}}}),h=>h.C.signIn('user_b'));
 assert.deepEqual(r.res,{stale:true});assert.ok(!r.h.log.includes('GO')&&!r.h.log.includes('toast'),'otro usuario: no abre ni felicita');assert.ok(!r.h.log.some(x=>x.startsWith('store')),'cambió la cuenta: no se guarda ningún perfil');
 r=await mk(()=>({status:201,body:{profile:{handle:'ana'}}}),h=>h.nav('#/catalogo'));
 assert.deepEqual(r.res,{stale:true});assert.ok(!r.h.log.includes('GO'),'el usuario se fue de la pantalla: no se abre Mi Hoja encima');assert.ok(r.h.log.includes('store:user_a:ana'),'pero su perfil, ya creado, sí queda guardado para su cuenta');
 r=await mk(()=>({status:409,body:{error:'profile-exists'}}));assert.deepEqual(r.res,{error:'recheck'},'409 y la revisión no trae el perfil: error, no éxito');assert.ok(!r.h.log.includes('GO'));
});
test('LHB-25: entrar desde una página pública no la reemplaza y retoma la acción; al volver de Google también',async()=>{
 const h=CUENTA_HARNESS({api:async()=>({status:200,body:{profile:{handle:'ana'}}})});h.nav('#/c/yambo-toro');
 await h.A.require(h.go,{inPlace:true,act:'humidor'});await tick();
 assert.ok(h.log.includes('open'),'abre la hoja de entrar');assert.ok(!h.log.some(x=>x.startsWith('card')),'la página de debajo no se reemplaza');assert.ok(!h.log.includes('GO'));assert.deepEqual(h.intent(),{from:'#/c/yambo-toro',act:'humidor'});
 h.C.signIn('user_a');await tick();assert.deepEqual(h.log.filter(x=>x==='GO'),['GO'],'al entrar, la acción empezada corre una vez');assert.equal(h.intent(),null);
 const g=CUENTA_HARNESS({api:async()=>({status:200,body:{profile:{handle:'ana'}}})});g.nav('#/c/yambo-toro');g.A.register('humidor',g.go);
 g.setIntent({from:'#/c/yambo-toro',act:'humidor'});g.C.user={id:'user_a'};await g.A.resume();await tick();assert.deepEqual(g.log.filter(x=>x==='GO'),['GO'],'volver de la redirección retoma la acción');assert.equal(g.intent(),null);
 const c=CUENTA_HARNESS({});c.nav('#/c/yambo-toro');c.A.register('humidor',c.go);c.setIntent({from:'#/c/yambo-toro',act:'humidor'});await c.A.resume();await tick();
 assert.ok(!c.log.includes('open')&&!c.log.includes('GO'),'si cancela en Google no se vuelve a abrir la hoja ni corre la acción');assert.equal(c.intent(),null);
 const o=CUENTA_HARNESS({api:async()=>({status:200,body:{profile:{handle:'ana'}}})});o.C.user={id:'user_a'};o.nav('#/catalogo');o.A.register('humidor',o.go);o.setIntent({from:'#/c/yambo-toro',act:'humidor'});await o.A.resume();await tick();assert.equal(o.intent(),null,'una acción de otra página se descarta');assert.ok(!o.log.includes('GO'),'y no corre en la página equivocada');
 const n=CUENTA_HARNESS({api:async()=>({status:200,body:{needsProfile:true}})});n.nav('#/c/yambo-toro');let sub;n.D.ui.onboarding=s=>{sub=s};n.C.user={id:'user_a'};
 const D2=n.D;D2.api=async(C,m)=>m==='GET'?{status:200,body:{needsProfile:true}}:{status:201,body:{profile:{handle:'ana'}}};
 await n.A.require(n.go,{inPlace:true,act:'humidor'});await tick();const fin=sub({handle:'ana'});await fin;assert.deepEqual(n.log.filter(x=>x==='GO'||x==='reroute'),['reroute','GO'],'tras el perfil nuevo vuelve a pintar la página y hace la acción');
});
test('LHB-25: salir cierra Mi Hoja también por #mihoja y #perfil, igual que el router; el formulario de perfil de una cuenta anterior no queda',async()=>{
 for(const hash of ['#/mihoja','#mihoja','#/mihoja/diario','#perfil','#/perfil/x']){
  const h=CUENTA_HARNESS({api:async()=>({status:200,body:{profile:{handle:'ana'}}})});h.nav(hash);h.C.user={id:'user_a'};await h.A.require(h.go);await tick();
  h.log.length=0;h.C.signIn(null);await tick();assert.ok(h.log.includes('reroute'),'salir repinta '+hash);assert.ok(h.log.includes('clear'));}
 const g=CUENTA_HARNESS({api:async()=>({status:200,body:{profile:{handle:'ana'}}})});g.nav('#/catalogo');g.C.user={id:'user_a'};await g.A.require(g.go,{inPlace:true});await tick();assert.ok(g.log.includes('GO'),'el control de cuenta quedó instalado');g.log.length=0;g.C.signIn(null);await tick();assert.ok(g.log.includes('clear')&&!g.log.includes('reroute'),'una página pública no se repinta al salir');
 const app=read('app.js');assert.match(app,/const h=location\.hash\.replace\(\/\^#\\\/\?\/,''\)\|\|'catalogo';const \[r,arg\]=h\.split\('\/'\)/,'la lectura del hash del router no cambió');
});
test('LHB-25: un formulario de perfil que quedó en pantalla tras cambiar de cuenta no manda nada y se repinta',async()=>{
 const calls=[];let submit;const h=CUENTA_HARNESS({api:async(C,m,p,b,uid)=>{calls.push(m+' '+p+' '+uid);return m==='GET'?{status:200,body:{needsProfile:true}}:{status:201,body:{profile:{handle:'ana'}}}}});
 h.D.ui.onboarding=s=>{submit=s;h.log.push('onboarding')};h.nav('#/c/yambo-toro');h.C.user={id:'user_a'};
 await h.A.require(h.go,{inPlace:true,act:'humidor'});await tick();assert.equal(typeof submit,'function');
 h.log.length=0;h.C.signIn('user_b');await tick();assert.ok(h.log.includes('reroute'),'el cambio de cuenta repinta la página donde estaba el formulario');
 calls.length=0;assert.deepEqual(await submit({handle:'ana'}),{stale:true});assert.deepEqual(calls,[],'no se mandó el perfil de A a nombre de B');assert.ok(!h.log.includes('GO'));
 const ok=[];const g=CUENTA_HARNESS({api:async(C,m,p,b,uid)=>{ok.push(uid);return m==='GET'?{status:200,body:{needsProfile:true}}:{status:201,body:{profile:{handle:'ana'}}}}});
 let s2;g.D.ui.onboarding=s=>{s2=s};g.C.user={id:'user_a'};await g.A.require(g.go,{inPlace:true,act:'x'});await tick();await s2({handle:'ana'});assert.deepEqual(ok,['user_a','user_a'],'cada llamada de la cuenta lleva su usuario, para que el adaptador la ate a esa sesión');
 const hj=read('hoja.js');assert.match(hj,/async function api\(C,method,path,body,uid\)\{const t=await C\.session\.getToken\(\);if\(uid&&\(!C\.user\|\|C\.user\.id!==uid\)\)throw new Error\('account-changed'\)/,'el adaptador se niega si la sesión ya es de otra cuenta');
});
test('LHB-25: si el perfil se creó pero se perdió la respuesta, el reintento termina igual que un 201 y repinta la página de origen',async()=>{
 let gets=0,submit;const h=CUENTA_HARNESS({api:async(C,m)=>{if(m==='GET')return ++gets===1?{status:200,body:{needsProfile:true}}:{status:200,body:{profile:{handle:'ana'}}};return {status:409,body:{error:'profile-exists'}}}});
 h.D.ui.onboarding=s=>{submit=s};h.nav('#/c/yambo-toro');h.C.user={id:'user_a'};await h.A.require(h.go,{inPlace:true,act:'humidor'});await tick();
 assert.deepEqual(await submit({handle:'ana'}),{ok:true});await tick();
 assert.deepEqual(h.log.filter(x=>x==='GO'||x==='reroute'),['reroute','GO'],'repinta la página y luego hace la acción');assert.ok(h.log.includes('store:user_a:ana'));
 const g=CUENTA_HARNESS({api:async(C,m)=>m==='GET'?{status:200,body:{profile:{handle:'ana'}}}:{status:200,body:{}}});g.nav('#/c/yambo-toro');g.C.user={id:'user_a'};await g.A.require(g.go,{inPlace:true,act:'x'});await tick();
 assert.deepEqual(g.log.filter(x=>x==='GO'||x==='reroute'),['GO'],'quien ya tenía perfil no repinta la página');
});
test('LHB-25: si la revisión tras un perfil ya existente falla, el formulario sigue usable y no se anuncia éxito',async()=>{
 let gets=0,posts=0,submit;const h=CUENTA_HARNESS({api:async(C,m)=>{if(m==='GET'){gets++;return gets===1?{status:200,body:{needsProfile:true}}:gets===2?{status:503,body:{}}:{status:200,body:{profile:{handle:'ana'}}}}posts++;return {status:409,body:{error:'profile-exists'}}}});
 h.D.ui.onboarding=s=>{submit=s};h.nav('#/c/yambo-toro');h.C.user={id:'user_a'};await h.A.require(h.go,{inPlace:true,act:'humidor'});await tick();
 assert.deepEqual(await submit({handle:'ana'}),{error:'recheck'});assert.ok(!h.log.includes('GO')&&!h.log.includes('toast'),'sin éxito anunciado');
 const d=defer();let n=0,sub2;const k=CUENTA_HARNESS({api:async(C,m)=>{if(m==='POST')return {status:409,body:{error:'profile-exists'}};return ++n===1?{status:200,body:{needsProfile:true}}:d.p}});
 k.D.ui.onboarding=s=>{sub2=s};k.nav('#/c/yambo-toro');k.C.user={id:'user_a'};await k.A.require(k.go,{inPlace:true,act:'humidor'});await tick();
 const pend=sub2({handle:'ana'});await tick();k.C.signIn('user_b');d.ok({status:200,body:{profile:{handle:'ana'}}});assert.deepEqual(await pend,{stale:true},'la revisión llegó tarde: se ignora');assert.ok(!k.log.includes('GO')&&!k.log.some(x=>x.startsWith('store')),'no abre ni guarda nada a nombre de otra cuenta');
 assert.deepEqual(await submit({handle:'ana'}),{ok:true},'el mismo formulario puede reintentar');assert.equal(posts,2,'el reintento sí llega al servidor');assert.deepEqual(h.log.filter(x=>x==='GO'||x==='reroute'),['reroute','GO']);
});
test('LHB-25: entrar desde una página pública y fallar la revisión muestra el error sobre la página y el reintento conserva la acción',async()=>{
 for(const [st,why] of [[503,'503 sin perfil guardado'],[401,'401'],[403,'403']]){let fails=1;const h=CUENTA_HARNESS({api:async()=>fails-->0?{status:st,body:{}}:{status:200,body:{profile:{handle:'ana'}}}});
  h.nav('#/c/yambo-toro');await h.A.require(h.go,{inPlace:true,act:'humidor'});await tick();h.C.signIn('user_a');await tick();
  assert.ok(h.log.includes('notice:No pudimos revisar tu cuenta'),'error visible: '+why);assert.ok(!h.log.some(x=>x.startsWith('card'))&&!h.log.includes('GO'),'la página no se reemplaza y la acción espera: '+why);
  const retry=h.notice();assert.equal(retry.label,'Intentar otra vez');retry.on();await tick();assert.deepEqual(h.log.filter(x=>x==='GO'),['GO'],'el reintento hace la acción exactamente una vez: '+why);}
 const k=CUENTA_HARNESS({clerk:async()=>{throw new Error('sin red')}});k.nav('#/c/yambo-toro');await k.A.require(k.go,{inPlace:true});await tick();assert.ok(k.log.includes('notice:Necesitas conexión')&&!k.log.some(x=>x.startsWith('card')),'sin conexión también se avisa en sitio');
 const m=CUENTA_HARNESS({api:async()=>({status:503,body:{}})});m.nav('#/mihoja');m.C.user={id:'user_a'};await m.A.require(m.go);await tick();assert.ok(m.log.includes('card:No pudimos revisar tu cuenta')&&!m.log.some(x=>x.startsWith('notice')),'en Mi Hoja el error va en la tarjeta, no en una hoja');
 assert.ok(read('hoja.js').includes('ui:{card:accountCard,notice:accountNotice,onboarding:onboardingForm,identity:submit=>onboardingForm(submit,null,\'identity\'),edit:(prof,submit,picture)=>onboardingForm(submit,picture,\'edit\',prof),toast,closeAll:closeSheetNow}'),'hoja.js pasa el aviso sobre la página');
});
test('LHB-25: un reintento del usuario puede volver a abrir la hoja de entrar y la acción sigue viva',async()=>{
 let status=401;const h=CUENTA_HARNESS({api:async()=>({status,body:status===200?{profile:{handle:'ana'}}:{}})});h.nav('#/c/yambo-toro');
 await h.A.require(h.go,{inPlace:true,act:'humidor'});h.C.signIn('user_a');await tick();assert.ok(h.log.includes('notice:No pudimos revisar tu cuenta'));
 h.C.signIn(null);await tick();assert.ok(h.log.includes('notice:Entra otra vez'),'al salir, la hoja del error se cierra y queda un botón nuevo para entrar');assert.equal(h.notice().label,'Entrar');h.notice().on();await tick();
 assert.equal(h.log.filter(x=>x==='open').length,2,'tras salir, el botón vuelve a abrir la hoja de entrar');
 status=200;h.C.signIn('user_a');await tick();assert.deepEqual(h.log.filter(x=>x==='GO'),['GO'],'al volver a entrar, la acción original corre una vez');
 const x=CUENTA_HARNESS({api:async()=>({status:401,body:{}})});x.nav('#/c/yambo-toro');await x.A.require(x.go,{inPlace:true,act:'humidor'});x.C.signIn('user_a');await tick();
 x.C.user=null;x.notice().on();await tick();assert.equal(x.log.filter(x=>x==='open').length,2,'si la sesión desaparece sin que Clerk avise, el reintento del usuario igual abre la hoja de entrar');
 const g=CUENTA_HARNESS({});g.nav('#/c/yambo-toro');g.A.register('humidor',g.go);g.setIntent({from:'#/c/yambo-toro',act:'humidor'});await g.A.resume();await tick();
 assert.ok(!g.log.includes('open'),'la reanudación automática tras una redirección sigue callada si el usuario canceló');
});
test('LHB-25: un almacenamiento lleno no impide entrar ni crear el perfil; un cambio de cuenta cierra las hojas de Mi Hoja',async()=>{
 const full=()=>{throw new Error('QuotaExceededError')};
 const a=CUENTA_HARNESS({api:async()=>({status:200,body:{profile:{handle:'ana'}}})});a.D.store.set=full;a.C.user={id:'user_a'};await a.A.require(a.go);await tick();assert.deepEqual(a.log.filter(x=>x==='GO'),['GO'],'entra aunque no se pueda guardar el perfil');
 let submit;const b=CUENTA_HARNESS({api:async(C,m)=>m==='GET'?{status:200,body:{needsProfile:true}}:{status:201,body:{profile:{handle:'ana'}}}});b.D.store.set=full;b.D.ui.onboarding=s=>{submit=s};b.C.user={id:'user_a'};await b.A.require(b.go);await tick();
 assert.deepEqual(await submit({handle:'ana'}),{ok:true});assert.deepEqual(b.log.filter(x=>x==='GO'),['GO'],'el perfil nuevo abre Mi Hoja aunque el cache falle');
 let gets=0,sub2;const c=CUENTA_HARNESS({api:async(C,m)=>m==='POST'?{status:409,body:{error:'profile-exists'}}:++gets===1?{status:200,body:{needsProfile:true}}:{status:200,body:{profile:{handle:'ana'}}}});c.D.store.set=full;c.D.ui.onboarding=s=>{sub2=s};c.C.user={id:'user_a'};await c.A.require(c.go);await tick();
 assert.deepEqual(await sub2({handle:'ana'}),{ok:true});assert.deepEqual(c.log.filter(x=>x==='GO'),['GO'],'la recuperación también');
 const hj=read('hoja.js');assert.ok(hj.includes('toast,closeAll:closeSheetNow}'),'hoja.js le da a la cuenta la forma de cerrar cualquier hoja abierta');
 for(const [hash,who] of [['#/mihoja','Mi Hoja'],['#/c/yambo-toro','una página pública']]){const h=CUENTA_HARNESS({api:async()=>({status:200,body:{profile:{handle:'ana'}}})});h.nav(hash);h.C.user={id:'user_a'};await h.A.require(h.go,{inPlace:true});await tick();
  h.log.length=0;h.C.signIn(null);await tick();assert.ok(h.log.includes('closeAll'),'salir cierra el editor abierto en '+who);h.log.length=0;h.C.signIn('user_b');await tick();assert.ok(h.log.includes('closeAll'),'cambiar de cuenta también, en '+who)}
 assert.ok(/function closeSheetNow\(\)\{clearTimeout\(closeT\);const el=\$\('#sheet'\);if\(!el\)return;el\.classList\.remove\('open'\);el\.hidden=true;el\.innerHTML='';/.test(hj),'cierra al instante y vacía la hoja, sin esperar el temporizador');
 assert.ok(hj.includes("let r;try{r=await submit(idm?f:{handle:h,")&&hj.includes("catch(x){r={error:'generic'}}"),'un error inesperado al enviar devuelve el botón en vez de dejarlo apagado');
});
test('LHB-25: el botón de entrar de nuevo solo aparece al salir de una acción que falló, no al cambiar de cuenta ni después de un éxito',async()=>{
 let status=401;const mk=()=>CUENTA_HARNESS({api:async()=>({status,body:status===200?{profile:{handle:'ana'}}:{}})});
 const a=mk();a.nav('#/c/yambo-toro');await a.A.require(a.go,{inPlace:true,act:'humidor'});a.C.signIn('user_a');await tick();a.C.signIn('user_b');await tick();assert.ok(!a.log.includes('notice:Entra otra vez'),'cambiar de cuenta no ofrece seguir la acción de la anterior');
 status=401;const b=mk();b.nav('#/c/yambo-toro');await b.A.require(b.go,{inPlace:true,act:'humidor'});b.C.signIn('user_a');await tick();status=200;b.notice().on();await tick();assert.deepEqual(b.log.filter(x=>x==='GO'),['GO']);b.log.length=0;b.C.signIn(null);await tick();assert.ok(!b.log.includes('notice:Entra otra vez'),'tras un éxito, salir no vuelve a ofrecer la acción');
 status=401;const c=mk();c.nav('#/c/yambo-toro');await c.A.require(c.go,{inPlace:true,act:'humidor'});c.C.signIn('user_a');await tick();c.nav('#/catalogo');c.C.signIn(null);await tick();assert.ok(!c.log.includes('notice:Entra otra vez'),'si el usuario ya se fue de la página, no se le muestra encima de otra');
});
test('LHB-25: una hoja nueva no la borra el temporizador de cierre de la anterior (Escape y luego salir)',()=>{
 const hj=read('hoja.js');const fn=n=>{const i=hj.indexOf('function '+n+'(');return hj.slice(i,hj.indexOf('\nfunction ',i+10)>0?hj.indexOf('\nfunction ',i+10):i+900)};
 assert.ok(/let lastFocus=null,closeT=null;/.test(hj),'un solo temporizador de cierre');
 assert.ok(fn('sheet').startsWith('function sheet(html,label){clearTimeout(closeT);'),'abrir una hoja cancela el cierre pendiente');
 assert.ok(fn('closeSheetNow').startsWith('function closeSheetNow(){clearTimeout(closeT);'),'cerrar al instante cancela el cierre pendiente');
 assert.ok(fn('closeSheet').includes('clearTimeout(closeT);closeT=setTimeout('),'el cierre con animación guarda su temporizador');
});
test('LHB-25: entrar con el perfil guardado (sin conexi\u00f3n) consume la acci\u00f3n guardada; al recargar no se repite',async()=>{
 const tick=()=>new Promise(r=>setTimeout(r,0));
 const run=async(over,label)=>{const g=CUENTA_HARNESS(over);g.nav('#/c/yambo-toro');g.cache({sub:'user_a',handle:'ana'});g.C.user={id:'user_a'};g.A.register('humidor',g.go);g.setIntent({from:'#/c/yambo-toro',act:'humidor'});
  await g.A.resume();await tick();assert.deepEqual(g.log.filter(x=>x==='GO'),['GO'],label+': la acci\u00f3n corre una vez');assert.equal(g.intent(),null,label+': la acci\u00f3n guardada se consume')};
 await run({api:async()=>({status:503,body:{}})},'servidor ca\u00eddo');
 await run({api:async()=>({status:0,body:{}})},'sin red');
 await run({clerk:async()=>{throw new Error('offline')}},'Clerk no carga');
});
function GATE_ACTIONS(over){
 const src=read('hoja.js');const i=src.indexOf('const txt=v=>typeof v');const j=src.indexOf('\nObject.keys(ACTIONS)',i);assert.ok(i>0&&j>i,'bloque de acciones');
 const calls=[];const rec=n=>(...a)=>{calls.push([n,...a]);return n==='toggleFav'||n==='toggleStamp'?true:undefined};
 const S=()=>({favs:{cigarros:[],artesanos:[],lugares:[]},pasaporte:{cigarros:{},artesanos:{},lugares:{}}});
 const deps={S,toggleFav:rec('toggleFav'),toggleStamp:rec('toggleStamp'),setRating:rec('setRating'),openSheet:rec('openSheet'),toast:rec('toast'),closeSheet:rec('closeSheet'),zonaSheet:rec('zonaSheet'),
  badgeIds:()=>[],ruta:()=>({ok:[],lit:[]}),fmtF:x=>x,hoy:()=>'hoy',BADGES:[],$:()=>null,$$:()=>[],A:{route:rec('route')},scrollTo:()=>{},scrollY:0,CSS:{escape:x=>x},
  location:{hash:'#/c/yambo-toro'},window:{LHB_I18N:{t:k=>k}},setTimeout:()=>0,...over};
 const names=Object.keys(deps);
 const f=new Function(...names,'var RLIT=0;'+src.slice(i,j)+'\nreturn ACTIONS');
 return {ACTIONS:f(...names.map(n=>deps[n])),calls};
}
test('LHB-48: las acciones que piden cuenta validan su argumento antes de tocar los datos',()=>{
 const {ACTIONS,calls}=GATE_ACTIONS();const names=c=>calls.filter(x=>x[0]===c);
 ACTIONS.fav('cigarros:yambo-toro');assert.deepEqual(names('toggleFav'),[['toggleFav','cigarros','yambo-toro']],'un corazón válido se hace');
 for(const bad of ['','cigarros','otro:x','constructor:x','__proto__:x','toString:x',undefined,null,7,{},'cigarros:'+'x'.repeat(250)])ACTIONS.fav(bad);
 assert.equal(names('toggleFav').length,1,'ningún argumento inválido llega a los datos (favoritos)');
 ACTIONS.stamp('lugares:mi-sitio');assert.deepEqual(names('toggleStamp'),[['toggleStamp','lugares','mi-sitio']],'un sello válido se hace');
 for(const bad of ['','lugares','otro:x','__proto__:x','constructor:x',undefined,null,7,{}])ACTIONS.stamp(bad);
 assert.equal(names('toggleStamp').length,1,'ningún argumento inválido llega a los datos (sellos)');
 ACTIONS.rate('yambo-toro:4');assert.deepEqual(names('setRating'),[['setRating','yambo-toro',4]],'una estrella válida se pone');
 for(const bad of ['yambo-toro:0','yambo-toro:6','yambo-toro:2.5','yambo-toro:abc','yambo-toro:','yambo-toro',':3','',undefined,null,{}])ACTIONS.rate(bad);
 assert.equal(names('setRating').length,1,'ninguna estrella inválida llega a los datos');
 ACTIONS.humidor('yambo-toro');ACTIONS.humidor(undefined);ACTIONS.humidor({});
 assert.deepEqual(names('openSheet'),[['openSheet','humidor','yambo-toro'],['openSheet','humidor',undefined],['openSheet','humidor',undefined]],'el humidor abre con un texto o sin nada');
});
test('LHB-48: corazón, sello, estrella, humidor, catar y subir pasan por la puerta; ver páginas no',()=>{
 const hj=read('hoja.js'),ap=read('app.js');
 assert.ok(/gate\('fav',f\.dataset\.fav\)/.test(hj),'el corazón de las tarjetas usa la puerta');
 assert.ok(/gate\('stamp',st\.dataset\.stamp,st\)/.test(hj),'el sello usa la puerta');
 assert.ok(/if\(sh\.dataset\.sheet==='humidor'\)gate\('humidor',sh\.dataset\.arg\);else openSheet\(/.test(hj),'añadir al humidor usa la puerta; las demás hojas no');
 assert.ok(/\$\('#fav'\)\.onclick=\(\)=>EXT\.gate\('fav','cigarros:'\+c\.id\)/.test(ap),'el favorito de la vitola usa la puerta');
 assert.ok(/EXT\.gate\('rate',c\.id\+':'\+b\.dataset\.star\)/.test(ap),'la estrella usa la puerta');
 assert.ok(/subir:\(\)=>EXT\.requireAccount\(vSubir,\{fast:true\}\)/.test(ap),'subir una vitola pide cuenta');
 assert.ok(/cata:cid=>requireAccount\(\(\)=>vCata\(cid\),\{fast:true\}\)/.test(hj),'catar pide cuenta');
 assert.ok(/const gate=\(act,arg,el\)=>CUENTA\.quick\(\(\)=>ACTIONS\[act\]\(arg,el\),\{inPlace:true,act,arg\}\)/.test(hj),'la puerta es en sitio y no cancela otras acciones');
 assert.ok(/Object\.keys\(ACTIONS\)\.forEach\(k=>CUENTA\.register\(k,arg=>ACTIONS\[k\]\(arg\)\)\)/.test(hj),'las acciones se registran para retomarlas al volver de Google');
 const outside=src=>src.replace(/function toggleFav\([\s\S]*?\n/,'').replace(/function toggleStamp\([\s\S]*?\n/,'').replace(/function setRating\([\s\S]*?\n/,'');
 const a=hj.indexOf('const ACTIONS={'),b=hj.indexOf('\nObject.keys(ACTIONS)');
 const rest=outside(hj.slice(0,a)+hj.slice(b));
 assert.ok(!/toggleFav\(|toggleStamp\(|setRating\(/.test(rest),'nadie más escribe corazones, sellos o estrellas fuera de las acciones');
 assert.ok(!/EXT\.toggleFav|EXT\.setRating/.test(ap),'app.js ya no escribe corazones ni estrellas directamente');
 assert.ok(!/openSheet\('humidor'/.test(rest),'el humidor no se abre sin pasar por la puerta');
 for(const r of ['catalogo','artesanos','lugares','eventos','maridajes','podcast','buscar'])assert.ok(!new RegExp(r+':[^,]*requireAccount').test(hj+ap),'la página '+r+' sigue abierta sin cuenta');
});
test('LHB-48: una acción en sitio con sesión y perfil guardado no espera a la red; si no, pasa por la revisión completa',async()=>{
 const tick=()=>new Promise(r=>setTimeout(r,0));
 let apis=0;const api=async()=>{apis++;return {status:200,body:{profile:{handle:'ana'}}}};
 const a=CUENTA_HARNESS({api});a.nav('#/c/yambo-toro');a.C.user={id:'user_a'};a.cache({sub:'user_a',handle:'ana'});a.setIntent({from:'#/c/yambo-toro',act:'x'});
 await a.A.require(a.go,{inPlace:true,fast:true,act:'fav'});await tick();
 assert.deepEqual(a.log.filter(x=>x==='GO'),['GO'],'la acción corre una vez');assert.equal(apis,0,'sin pedir /api/me');assert.ok(!a.log.includes('open')&&!a.log.some(x=>x.startsWith('card')||x.startsWith('notice')),'sin hojas ni tarjetas');assert.equal(a.intent(),null,'consume la acción guardada');
 const b=CUENTA_HARNESS({api});b.nav('#/c/yambo-toro');b.C.user={id:'user_b'};b.cache({sub:'user_a',handle:'ana'});
 await b.A.require(b.go,{inPlace:true,fast:true,act:'fav'});await tick();
 assert.equal(apis,1,'con el perfil guardado de otra persona se revisa con el servidor');assert.deepEqual(b.log.filter(x=>x==='GO'),['GO']);
 const c=CUENTA_HARNESS({api});c.nav('#/c/yambo-toro');c.C.user={id:'user_a'};c.cache({sub:'user_a',handle:'ana'});
 await c.A.require(c.go,{inPlace:true});await tick();
 assert.equal(apis,2,'sin la opción rápida (Mi Hoja) siempre se revisa con el servidor');
 const d=CUENTA_HARNESS({api});d.nav('#/c/yambo-toro');
 await d.A.require(d.go,{inPlace:true,fast:true,act:'fav',arg:'cigarros:yambo-toro'});await tick();
 assert.ok(d.log.includes('open'),'sin sesión abre la hoja de entrar');assert.ok(!d.log.includes('GO'),'y no hace la acción todavía');assert.deepEqual(d.intent(),{from:'#/c/yambo-toro',act:'fav',arg:'cigarros:yambo-toro'},'guarda la acción con su argumento');
 const e=CUENTA_HARNESS({});e.nav('#/c/yambo-toro');
 await e.A.require(e.go,{inPlace:true,fast:true,act:'fav',arg:{x:1}});await tick();
 assert.deepEqual(e.intent(),{from:'#/c/yambo-toro',act:'fav'},'un argumento que no es texto no se guarda');
});
test('LHB-48: al volver de Google la acción retoma con su argumento, una vez',async()=>{
 const tick=()=>new Promise(r=>setTimeout(r,0));
 const got=[];const g=CUENTA_HARNESS({api:async()=>({status:200,body:{profile:{handle:'ana'}}})});
 g.nav('#/c/yambo-toro');g.A.register('fav',a=>got.push(a));g.setIntent({from:'#/c/yambo-toro',act:'fav',arg:'cigarros:yambo-toro'});g.C.user={id:'user_a'};
 await g.A.resume();await tick();assert.deepEqual(got,['cigarros:yambo-toro'],'la acción recibe su argumento');assert.equal(g.intent(),null);
 await g.A.resume();await tick();assert.deepEqual(got,['cigarros:yambo-toro'],'una segunda carga no la repite');
 const h=CUENTA_HARNESS({api:async()=>({status:200,body:{profile:{handle:'ana'}}})});h.nav('#/c/yambo-toro');const got2=[];h.A.register('fav',a=>got2.push(a));h.setIntent({from:'#/c/yambo-toro',act:'fav',arg:{x:1}});h.C.user={id:'user_a'};
 await h.A.resume();await tick();assert.deepEqual(got2,[undefined],'un argumento que no es texto se descarta');
});
test('LHB-48: los argumentos con nombres heredados (constructor, __proto__, toString) no llegan a los datos',()=>{
 const {ACTIONS,calls}=GATE_ACTIONS();
 for(const id of ['constructor','__proto__','toString','hasOwnProperty','valueOf','isPrototypeOf']){ACTIONS.fav('cigarros:'+id);ACTIONS.stamp('lugares:'+id);ACTIONS.rate(id+':4')}
 assert.deepEqual(calls.filter(x=>['toggleFav','toggleStamp','setRating'].includes(x[0])),[],'ningún nombre heredado llega a favoritos, sellos o estrellas');
 ACTIONS.fav('cigarros:constructor-fino');ACTIONS.stamp('lugares:toString-bar');ACTIONS.rate('valueOf-x:3');
 assert.equal(calls.filter(x=>['toggleFav','toggleStamp','setRating'].includes(x[0])).length,3,'un id normal que solo se parece sí pasa');
});
test('LHB-48: al cambiar la cuenta, #/cata y #/subir vuelven a pasar por la puerta (no quedan editores abiertos)',async()=>{
 const tick=()=>new Promise(r=>setTimeout(r,0));
 for(const route of ['#/cata/yambo-toro','#/cata','#/subir']){
  const g=CUENTA_HARNESS({api:async()=>({status:200,body:{profile:{handle:'ana'}}})});g.nav(route);g.C.user={id:'user_a'};
  await g.A.require(g.go,{fast:false});await tick();g.log.length=0;g.C.signIn(null);await tick();
  assert.ok(g.log.includes('reroute'),route+': al salir de la cuenta se vuelve a revisar la página');
  g.log.length=0;g.C.signIn('user_b');await tick();assert.ok(g.log.includes('reroute'),route+': al cambiar de cuenta también');
 }
 const p=CUENTA_HARNESS({});p.nav('#/podcast');p.C.user={id:'user_a'};await p.A.require(p.go,{inPlace:true,fast:true});await tick();p.log.length=0;p.C.signIn(null);await tick();
 assert.ok(!p.log.includes('reroute'),'una página abierta no se repinta al salir de la cuenta');
});
test('LHB-48: una subida de fotos empezada por una persona no se guarda cuando ya es otra',()=>{
 const ap=read('app.js');
 assert.ok(/const onFile=async e=>\{const f=e\.target\.files&&e\.target\.files\[0\];if\(!f\)return;const G=EXT\.accountGen\(\),form=\$\('#upForm'\);try\{const b=await resizeImage\(f\);if\(EXT\.accountGen\(\)!==G\|\|\$\('#upForm'\)!==form\)return;pendingPhoto=b;/.test(ap),'la foto elegida se descarta si cambió la cuenta o el formulario mientras se preparaba');
 assert.ok(/const G=EXT\.accountGen\(\),form=\$\('#upForm'\);if\(pendingPhoto\)\{foto='foto_'\+id;await idb\.put\(foto,pendingPhoto\);if\(EXT\.accountGen\(\)!==G\|\|\$\('#upForm'\)!==form\)\{idb\.del\(foto\)\.catch\(\(\)=>\{\}\);return\}\}/.test(ap),'tras esperar la foto se comprueba la cuenta y el formulario antes de guardar');
 assert.ok(/accountGen:CUENTA\.gen/.test(read('hoja.js'))&&/gen:\(\)=>gen/.test(read('cuenta.js')),'la generación de la cuenta llega a app.js');
});
test('LHB-48: si Clerk falla después de cambiar la cuenta, la acción de la anterior no corre con el perfil guardado de la nueva',async()=>{
 const tick=()=>new Promise(r=>setTimeout(r,0));const prof=async()=>({status:200,body:{profile:{handle:'ana'}}});
 let n=0,rej;const pend=new Promise((_,r)=>{rej=r});const g=CUENTA_HARNESS({api:prof,clerk:async()=>{n++;if(n===1)return g.C;return pend}});
 g.nav('#/c/yambo-toro');g.C.user={id:'user_a'};await g.A.quick(()=>{},{inPlace:true,act:'fav'});for(let i=0;i<4;i++)await tick();
 const r=[];g.A.quick(()=>r.push('de A'),{inPlace:true,act:'fav'});await tick();g.C.signIn('user_b');g.cache({sub:'user_b',handle:'bea'});rej(new Error('offline'));for(let i=0;i<6;i++)await tick();
 assert.deepEqual(r,[],'la acción que empezó A no corre con el perfil guardado de B');
});
test('LHB-48: cada toque es una sola acción: corre una vez o ninguna; si se toca otra antes de terminar la revisión, vale la última; los guardados llevan solo la acción y su argumento',async()=>{
 const tick=()=>new Promise(r=>setTimeout(r,0));const ticks=async n=>{for(let i=0;i<n;i++)await tick()};const prof=async()=>({status:200,body:{profile:{handle:'ana'}}});
 // sin sesión: dos toques, una hoja de entrar; al entrar corre solo el último, una vez; lo guardado no lleva lista ni dueño
 const a=CUENTA_HARNESS({api:prof});a.nav('#/c/yambo-toro');const ra=[];a.A.register('fav',x=>ra.push('reg:'+x));
 a.A.quick(()=>ra.push('uno'),{inPlace:true,act:'fav',arg:'1'});a.A.quick(()=>ra.push('dos'),{inPlace:true,act:'fav',arg:'2'});await ticks(4);
 assert.equal(a.log.filter(x=>x==='open').length,1,'una sola hoja de entrar');assert.deepEqual(Object.keys(a.intent()).sort(),['act','arg','from'],'lo guardado: página, acción y argumento, nada más');assert.equal(a.intent().arg,'2');
 a.C.signIn('user_a');await ticks(8);assert.deepEqual(ra,['dos'],'al entrar corre solo el último toque, una vez');
 // con sesión y revisión lenta: dos toques, el primero se cancela y el segundo corre una vez
 let rel;const hold=new Promise(r=>{rel=r});const b=CUENTA_HARNESS({api:async()=>{await hold;return prof()}});b.nav('#/c/yambo-toro');b.C.user={id:'user_a'};const rb=[];
 b.A.quick(()=>rb.push('uno'),{inPlace:true,act:'fav'});await ticks(3);b.A.quick(()=>rb.push('dos'),{inPlace:true,act:'fav'});await ticks(3);rel();await ticks(8);
 assert.deepEqual(rb,['dos'],'vale el último toque');
 // con el perfil guardado de esa persona cada toque corre al instante, los dos
 const c=CUENTA_HARNESS({api:prof});c.nav('#/c/yambo-toro');c.C.user={id:'user_a'};c.cache({sub:'user_a',handle:'ana'});const rc=[];
 c.A.quick(()=>rc.push('uno'),{inPlace:true,act:'fav'});c.A.quick(()=>rc.push('dos'),{inPlace:true,act:'fav'});await ticks(4);
 assert.deepEqual(rc,['uno','dos'],'con el perfil guardado cada toque corre');
});
test('LHB-48: irse de la página o cambiar de cuenta durante la revisión descarta la acción; una abandonada no vuelve; una respuesta tardía no guarda el perfil',async()=>{
 const tick=()=>new Promise(r=>setTimeout(r,0));const ticks=async n=>{for(let i=0;i<n;i++)await tick()};const prof=async()=>({status:200,body:{profile:{handle:'ana'}}});
 // salir mientras se revisa
 let rel;const hold=new Promise(r=>{rel=r});const a=CUENTA_HARNESS({api:async()=>{await hold;return prof()}});a.nav('#/c/yambo-toro');a.C.user={id:'user_a'};const ra=[];
 a.A.quick(()=>ra.push('a'),{inPlace:true,act:'fav'});await tick();a.C.signIn(null);rel();await ticks(6);
 assert.ok(!a.log.some(x=>x.startsWith('store:')),'una respuesta de antes de salir no guarda el perfil');assert.deepEqual(ra,[],'y la acción no corre');
 // irse de la página y volver: la abandonada no corre cuando el siguiente toque pasa
 let n=0,rel2;const hold2=new Promise(r=>{rel2=r});const b=CUENTA_HARNESS({api:async()=>{n++;if(n===1){await hold2;return {status:503,body:{}}}return prof()}});b.nav('#/c/yambo-toro');b.C.user={id:'user_a'};const rb=[];
 b.A.quick(()=>rb.push('abandonada'),{inPlace:true,act:'fav'});await ticks(3);b.nav('#/artesanos');rel2();await ticks(6);b.nav('#/c/yambo-toro');
 b.A.quick(()=>rb.push('nueva'),{inPlace:true,act:'fav'});await ticks(8);assert.deepEqual(rb,['nueva'],'la abandonada no vuelve');
 // cambio de cuenta mientras la revisión espera: no corre para la otra persona
 let rel3;const hold3=new Promise(r=>{rel3=r});const c=CUENTA_HARNESS({api:async()=>{await hold3;return prof()}});c.nav('#/c/yambo-toro');c.C.user={id:'user_a'};const rc=[];
 c.A.quick(()=>rc.push('de A'),{inPlace:true,act:'fav'});await tick();c.C.signIn('user_b');rel3();await ticks(6);
 assert.deepEqual(rc,[],'una acción que empezó A no corre cuando ya es B');
});
test('LHB-48: con el perfil guardado, la acción en sitio no espera a la red pero se descarta si mientras carga Clerk cambia la cuenta o la página; los nombres de acción no se heredan',async()=>{
 const tick=()=>new Promise(r=>setTimeout(r,0));const ticks=async n=>{for(let i=0;i<n;i++)await tick()};
 const mk=async()=>{let n=0,rel;const hold=new Promise(r=>{rel=r});const h=CUENTA_HARNESS({clerk:async()=>{n++;if(n===2)await hold;return h.C}});h.nav('#/c/yambo-toro');h.C.user={id:'user_a'};h.cache({sub:'user_a',handle:'ana'});
  await h.A.quick(()=>{},{inPlace:true,act:'fav'});return {h,rel}};
 // cambia la cuenta mientras Clerk carga: la acción de A no corre para B aunque B tenga su perfil guardado
 let {h,rel}=await mk();const r1=[];h.A.quick(()=>r1.push('de A'),{inPlace:true,act:'fav'});await tick();h.C.signIn('user_b');h.cache({sub:'user_b',handle:'bea'});rel();await ticks(6);
 assert.deepEqual(r1,[],'la acción de A no corre cuando ya es B');
 // cambia la página mientras Clerk carga
 ({h,rel}=await mk());const r2=[];h.A.quick(()=>r2.push('x'),{inPlace:true,act:'fav'});await tick();h.nav('#/artesanos');rel();await ticks(6);
 assert.deepEqual(r2,[],'la acción no corre en otra página');
 // sin cambios corre una vez
 ({h,rel}=await mk());const r3=[];h.A.quick(()=>r3.push('x'),{inPlace:true,act:'fav'});await tick();rel();await ticks(6);assert.deepEqual(r3,['x']);
 // los nombres heredados no son acciones
 assert.ok(/const ACT=Object\.create\(null\)/.test(read('cuenta.js')),'el registro de acciones no hereda nombres (constructor, toString...)');
});
test('LHB-48: en Mi Hoja y las páginas de la cuenta solo espera la puerta de la página; una acción en sitio corre al instante o solo abre la hoja de entrar; en una página pública espera y corre al entrar',async()=>{
 const tick=()=>new Promise(r=>setTimeout(r,0));const ticks=async n=>{for(let i=0;i<n;i++)await tick()};const prof=async()=>({status:200,body:{profile:{handle:'ana'}}});
 for(const page of ['#/mihoja','#/mihoja/favoritos','#/cata/yambo','#/subir']){
  const h=CUENTA_HARNESS({api:prof});h.nav(page);let drawn=0;const ran=[];
  h.A.require(()=>{drawn++});await ticks(3);const opens=h.log.filter(x=>x==='open').length;h.A.quick(()=>ran.push('humidor'),{inPlace:true,act:'humidor'});await ticks(3);
  assert.equal(h.log.filter(x=>x==='open').length,opens+1,'sin sesión solo se abre la hoja de entrar ('+page+')');assert.equal(h.intent(),null,'y no se guarda la acción');
  h.C.signIn('user_a');await ticks(8);assert.equal(drawn,1,'la página se dibuja una vez ('+page+')');assert.deepEqual(ran,[],'la acción no se guardó')}
 // con sesión y el perfil de esa persona guardado corre al instante también ahí
 const g=CUENTA_HARNESS({api:prof});g.nav('#/mihoja');g.C.user={id:'user_a'};g.cache({sub:'user_a',handle:'ana'});const rg=[];g.A.quick(()=>rg.push('x'),{inPlace:true,act:'fav'});await ticks(4);assert.deepEqual(rg,['x'],'con el perfil guardado corre al instante');
 // con sesión pero sin perfil guardado no compite con la puerta de la página
 let rel,n=0;const hold=new Promise(r=>{rel=r});const k0=CUENTA_HARNESS({api:async()=>{n++;if(n===1){await hold}return prof()}});k0.nav('#/mihoja');k0.C.user={id:'user_a'};let d0=0;const r0=[];
 k0.A.require(()=>{d0++});await ticks(3);k0.A.quick(()=>r0.push('x'),{inPlace:true,act:'fav'});await ticks(3);rel();await ticks(8);assert.equal(d0,1,'la página se dibuja una vez');assert.deepEqual(r0,[],'la acción que no pudo ser instantánea no se guarda');
 // en una página pública espera y corre al entrar, sin repintar
 const k=CUENTA_HARNESS({api:prof});k.nav('#/c/yambo-toro');const r3=[];k.A.quick(()=>r3.push('x'),{inPlace:true,act:'fav'});await ticks(3);k.C.signIn('user_a');await ticks(8);
 assert.deepEqual(r3,['x']);assert.ok(!k.log.includes('reroute'),'una página pública no se repinta');
 // la puerta de una acción nunca reemplaza la página con la tarjeta, aunque quien llama no lo pida
 const c0=CUENTA_HARNESS({api:prof});c0.nav('#/c/yambo-toro');c0.A.quick(()=>{},{act:'fav'});await ticks(3);assert.ok(!c0.log.some(x=>x.startsWith('card:')),'sin tarjeta sobre la página');assert.ok(c0.log.includes('open'),'pero sí se abre la hoja de entrar');
});
test('LHB-48: una persona nueva en Mi Hoja con una acción tocada ve un solo formulario y la página se dibuja una vez; irse y volver no revive nada',async()=>{
 const tick=()=>new Promise(r=>setTimeout(r,0));const ticks=async n=>{for(let i=0;i<n;i++)await tick()};const prof=async()=>({status:200,body:{profile:{handle:'ana'}}});
 let n=0,submit;const h=CUENTA_HARNESS({api:async(C,m)=>m==='GET'?{status:200,body:{needsProfile:true}}:{status:201,body:{profile:{handle:'ana'}}}});h.nav('#/mihoja');h.D.ui.onboarding=f=>{n++;submit=f};
 let drawn=0;const ran=[];h.A.require(()=>{drawn++});await ticks(3);h.A.quick(()=>ran.push('humidor'),{inPlace:true,act:'humidor'});await ticks(3);h.C.signIn('user_a');await ticks(8);
 assert.equal(n,1,'un solo formulario de perfil');assert.equal(typeof submit,'function');
 const r=await submit({handle:'ana',display_name:'',bio:'',favorite_brand:''});await ticks(4);
 assert.deepEqual(r,{ok:true});assert.equal(drawn,1,'Mi Hoja se dibuja una vez');assert.deepEqual(ran,[],'la acción no compite con la página');assert.equal(h.log.filter(x=>x==='reroute').length,0,'y no se repinta dos veces');
 // irse de la página y volver antes de que llegue la revisión: no corre
 let rel;const hold=new Promise(x=>{rel=x});const a=CUENTA_HARNESS({api:async()=>{await hold;return prof()}});a.nav('#/c/yambo-toro');a.C.user={id:'user_a'};const ra=[];
 a.A.quick(()=>ra.push('abandonada'),{inPlace:true,act:'fav'});await ticks(3);a.nav('#/artesanos');a.nav('#/c/yambo-toro');rel();await ticks(8);
 assert.deepEqual(ra,[],'una revisión abandonada no se revive al volver a la página');
 // lo mismo con una acción que esperaba la hoja de entrar
 const b=CUENTA_HARNESS({api:prof});b.nav('#/c/yambo-toro');const rb=[];b.A.quick(()=>rb.push('abandonada'),{inPlace:true,act:'fav'});await ticks(3);b.nav('#/artesanos');b.nav('#/c/yambo-toro');b.C.signIn('user_a');await ticks(8);
 assert.deepEqual(rb,[],'una acción que esperaba la hoja de entrar no se revive al volver');
});
test('LHB-48: irse y volver mientras carga Clerk descarta la acción (también si Clerk falla); cada cosa que espera se retoma sola; la página avisa de la navegación',async()=>{
 const tick=()=>new Promise(r=>setTimeout(r,0));const ticks=async n=>{for(let i=0;i<n;i++)await tick()};
 const mk=async fail=>{let n=0,rel;const hold=new Promise(r=>{rel=r});const h=CUENTA_HARNESS({clerk:async()=>{n++;if(n===2){await hold;if(fail)throw new Error('sin red')}return h.C}});h.nav('#/c/yambo-toro');h.C.user={id:'user_a'};h.cache({sub:'user_a',handle:'ana'});
  await h.A.quick(()=>{},{inPlace:true,act:'fav'});return {h,rel}};
 for(const fail of [false,true]){
  let {h,rel}=await mk(fail);const r1=[];h.A.quick(()=>r1.push('x'),{inPlace:true,act:'fav'});await tick();h.nav('#/artesanos');h.nav('#/c/yambo-toro');rel();await ticks(6);
  assert.deepEqual(r1,[],'irse y volver mientras carga Clerk descarta la acción (Clerk falla: '+fail+')');
  ({h,rel}=await mk(fail));const r2=[];h.A.quick(()=>r2.push('x'),{inPlace:true,act:'fav'});await tick();rel();await ticks(6);assert.deepEqual(r2,['x'],'sin irse corre una vez (Clerk falla: '+fail+')')}
 // la puerta de una página sola se retoma al entrar y dibuja una vez
 const p=CUENTA_HARNESS({api:async()=>({status:200,body:{profile:{handle:'ana'}}})});p.nav('#/mihoja');let drawn=0;p.A.require(()=>{drawn++});await ticks(3);p.C.signIn('user_a');await ticks(8);
 assert.equal(drawn,1,'Mi Hoja se dibuja una vez al entrar');
 assert.ok(/onNav:f=>window\.addEventListener\('hashchange',f\)/.test(read('hoja.js')),'la página le avisa a la puerta cuando cambia de página');
});
test('LHB-48: al volver de Google a Mi Hoja la acción guardada no compite con la puerta de la página; irse de la página borra lo guardado para volver',async()=>{
 const tick=()=>new Promise(r=>setTimeout(r,0));const ticks=async n=>{for(let i=0;i<n;i++)await tick()};const prof=async()=>({status:200,body:{profile:{handle:'ana'}}});const f0={handle:'ana',display_name:'',bio:'',favorite_brand:''};
 // persona nueva que vuelve de Google a Mi Hoja con una acción guardada: un formulario, la página una vez, la acción no corre y lo guardado se borra
 const forms=[];const ran=[];let drawn=0;
 const h=CUENTA_HARNESS({api:async(C,m)=>m==='POST'?{status:201,body:{profile:{handle:'ana'}}}:{status:200,body:{needsProfile:true}}});
 h.nav('#/mihoja');h.C.user={id:'user_a'};h.A.register('humidor',()=>ran.push('humidor'));h.setIntent({from:'#/mihoja',act:'humidor'});h.D.ui.onboarding=f=>forms.push(f);
 h.A.require(()=>drawn++);await tick();h.A.resume();await ticks(8);
 assert.equal(forms.length,1,'un solo formulario');assert.equal(h.intent(),null,'lo guardado de una página de la cuenta se borra');await forms[0](f0);await ticks(4);assert.equal(drawn,1,'Mi Hoja se dibuja una vez');assert.deepEqual(ran,[]);
 // irse de la página borra lo guardado para volver de Google (un reinicio no lo revive)
 const m=CUENTA_HARNESS({api:prof});m.nav('#/c/yambo-toro');m.A.quick(()=>{},{inPlace:true,act:'fav',arg:'cigarros:yambo-toro'});await ticks(3);
 assert.equal(m.intent().act,'fav','antes de irse, lo guardado está');m.nav('#/artesanos');assert.equal(m.intent(),null,'al irse de la página se borra');
});
test('LHB-48: un 401 y volver a entrar conserva la acción (la persona que entra en este equipo la continúa); un fallo de Clerk usa el perfil guardado solo del mismo momento',async()=>{
 const tick=()=>new Promise(r=>setTimeout(r,0));const ticks=async n=>{for(let i=0;i<n;i++)await tick()};const prof=async()=>({status:200,body:{profile:{handle:'ana'}}});
 const run=async who=>{let ok=false;const x=CUENTA_HARNESS({api:async()=>ok?await prof():{status:401,body:{}}});x.nav('#/c/yambo-toro');x.C.user={id:'user_a'};const ran=[];
  x.A.quick(()=>ran.push('a'),{inPlace:true,act:'fav'});await ticks(6);
  x.C.signIn(null);await tick();ok=true;const n=x.notice();n.on();await tick();x.C.signIn(who);await ticks(8);return ran};
 assert.deepEqual(await run('user_a'),['a'],'tras el 401, salir y entrar de nuevo continúa la acción, una vez');
 // Clerk no carga: con perfil guardado la acción corre una vez; sin él se avisa y no corre
 const k=CUENTA_HARNESS({clerk:async()=>{throw new Error('sin red')}});k.nav('#/c/yambo-toro');k.cache({sub:'user_a',handle:'ana'});const rk=[];k.A.quick(()=>rk.push('k'),{inPlace:true,act:'fav'});await ticks(4);
 assert.deepEqual(rk,['k'],'Clerk no carga y hay perfil guardado: corre una vez');
 const k2=CUENTA_HARNESS({clerk:async()=>{throw new Error('sin red')}});k2.nav('#/c/yambo-toro');const rk2=[];k2.A.quick(()=>rk2.push('k'),{inPlace:true,act:'fav'});await ticks(4);
 assert.deepEqual(rk2,[],'Clerk no carga y no hay perfil guardado: no corre');assert.ok(k2.log.includes('notice:Necesitas conexión'),'y se avisa');
});
test('LHB-48: un toque nuevo sustituye al anterior también en lo guardado para volver de Google',async()=>{
 const tick=()=>new Promise(r=>setTimeout(r,0));const ticks=async n=>{for(let i=0;i<n;i++)await tick()};
 // volver de Google en una página pública con una acción guardada, revisión lenta, y un toque nuevo: lo guardado de la anterior se borra
 let rel,n=0;const hold=new Promise(r=>{rel=r});const h=CUENTA_HARNESS({api:async()=>{n++;if(n===1){await hold;return {status:200,body:{profile:{handle:'ana'}}}}return {status:503,body:{}}}});
 h.nav('#/c/yambo-toro');h.C.user={id:'user_a'};const ran=[];h.A.register('fav',x=>ran.push(x));h.setIntent({from:'#/c/yambo-toro',act:'fav',arg:'cigarros:yambo-toro'});
 h.A.resume();await ticks(3);assert.equal(h.intent().act,'fav','mientras la anterior espera, lo guardado sigue ahí');
 h.A.quick(()=>ran.push('estrella'),{inPlace:true,act:'rate',arg:'yambo-toro:5'});await ticks(3);assert.equal(h.intent(),null,'el toque nuevo borra lo guardado de la anterior');
 rel();await ticks(8);assert.deepEqual(ran,[],'ninguna corre: la anterior quedó sustituida y la nueva no pasó la revisión');assert.equal(h.intent(),null);
 // sin sesión, el toque nuevo guarda lo suyo
 const g=CUENTA_HARNESS({api:async()=>({status:200,body:{profile:{handle:'ana'}}})});g.nav('#/c/yambo-toro');g.A.register('fav',()=>{});g.A.register('rate',()=>{});
 g.A.quick(()=>{},{inPlace:true,act:'fav',arg:'a'});await ticks(3);g.A.quick(()=>{},{inPlace:true,act:'rate',arg:'b:1'});await ticks(3);assert.equal(g.intent().act,'rate');assert.equal(g.intent().arg,'b:1');
});
test('LHB-48: lo guardado para volver de Google solo se retoma si es una acción registrada de esta página pública',async()=>{
 const tick=()=>new Promise(r=>setTimeout(r,0));const ticks=async n=>{for(let i=0;i<n;i++)await tick()};const prof=async()=>({status:200,body:{profile:{handle:'ana'}}});
 // lo guardado solo se retoma si la acción está registrada y es de esta página
 const g=CUENTA_HARNESS({api:prof});g.nav('#/c/yambo-toro');g.C.user={id:'user_a'};g.cache({sub:'user_a',handle:'ana'});const rg=[];g.A.register('fav',x=>rg.push(x));
 for(const bad of [{from:'#/c/yambo-toro',act:'constructor',arg:'x'},{from:'#/c/yambo-toro',act:'__proto__'},{from:'#/otra',act:'fav',arg:'x'},{from:'#/c/yambo-toro',act:'nada'}]){g.setIntent(bad);g.A.resume();await ticks(2);assert.equal(g.intent(),null,'se borra lo que no es una acción registrada de esta página: '+bad.act)}
 assert.deepEqual(rg,[],'y ninguna de ellas corre');g.setIntent({from:'#/c/yambo-toro',act:'fav',arg:'bien'});g.A.resume();await ticks(3);assert.deepEqual(rg,['bien'],'la buena sí, una vez');
});
test('LHB-51: Perfil ya no guarda ni muestra una foto local de todo el teléfono (la foto es la de la cuenta, LHB-55)',()=>{
 const app=read('app.js');assert.ok(!app.includes("idb.put('perfil'")&&!app.includes("photoURL('perfil')")&&!app.includes('id="pCam"'),'ni se guarda ni se pide la foto local de Perfil');
});
test('LHB-42: llms.txt lista cada página del sitemap una vez; robots.txt deja pasar a todos los bots',()=>{
 const sm=[...read('sitemap.xml').matchAll(/<loc>([^<]+)<\/loc>/g)].map(m=>m[1]);const tx=read('llms.txt').replace(/\r\n/g,'\n');
 assert.ok(tx.startsWith('# La Hoja Boricua\n\n> '),'título y resumen');
 assert.deepEqual([...tx.matchAll(/^## (.+)$/gm)].map(m=>m[1]),['Secciones','Lugares','Artesanos','Cigarros'],'secciones H2');
 const links=[...tx.matchAll(/^- \[[^\]\n]+\]\((https:\/\/lahojaboricua\.com\/[^)\s]*)\)/gm)].map(m=>m[1]);
 assert.deepEqual([...links].sort(),[...sm].sort(),'las mismas páginas que el sitemap');assert.equal(new Set(links).size,links.length,'sin repetidas');
 for(const l of tx.split('\n'))if(l.startsWith('- '))assert.match(l,/^- \[[^\]]+\]\([^)]+\)(: \S.*)?$/,l);
 assert.ok(!tx.includes('\u2014')&&!/wa\.me|tel:|@[a-z0-9-]+\.[a-z]{2,}/i.test(tx),'sin raya larga, teléfonos ni correos');
 assert.equal(read('robots.txt').replace(/\r\n/g,'\n'),'User-agent: *\nAllow: /\n\nSitemap: https://lahojaboricua.com/sitemap.xml\n','todos los bots, incluidos los de entrenamiento (decisión del dueño 2026-10-25)');
});
test('dominio propio: lahojaboricua.com, sin tab.bot, 404 real',()=>{const H='https://lahojaboricua.com';
 const files=['index.html','sitemap.xml','robots.txt','hoja.js'].concat(fs.readdirSync(path.join(S,'lugares')).filter(f=>f.endsWith('.html')).map(f=>'lugares/'+f),fs.readdirSync(path.join(S,'artesanos')).filter(f=>f.endsWith('.html')).map(f=>'artesanos/'+f),fs.existsSync(path.join(S,'cigarros'))?fs.readdirSync(path.join(S,'cigarros')).filter(f=>f.endsWith('.html')).map(f=>'cigarros/'+f):[]);
 for(const f of files){const t=read(f).replace(/UID:[^`]*@lahojaboricua\.sites\.tab\.bot/,'');assert.ok(!t.includes('lahojaboricua.sites.tab.bot'),f);}
 assert.ok(!/<loc>[^<]*\.html<\/loc>/.test(read('sitemap.xml')),'sitemap sin .html');
 const ix=read('index.html');for(const m of ['rel="canonical" href="'+H+'/"','og:url" content="'+H+'/"','og:image" content="'+H+'/og.jpg"'])assert.ok(ix.includes(m),m);
 assert.ok(read('hoja.js').includes("const APP_URL='"+H+"/'"));
 const re404=new Function('return '+read('sw.js').match(/!(\/\\\/404\(\\\.html\)\?\$\/)\.test\(url\.pathname\)/)[1])();for(const p of ['/404','/404.html'])assert.ok(re404.test(p),p);for(const p of ['/','/index.html','/x404'])assert.ok(!re404.test(p),p);
 const nf=read('404.html');assert.ok(nf.includes('name="robots" content="noindex"'));assert.ok(nf.includes('href="/lugares/l.css"')&&fs.existsSync(path.join(S,'lugares','l.css')));
});
test('LHB-24: el service worker no responde /api/ (siempre red), sí lo demás',()=>{
 const vm=require('vm');const L={};
 const ctx={self:{addEventListener:(t,f)=>{L[t]=f}},location:{origin:'https://lahojaboricua.com'},URL,Response,
  caches:{match:()=>Promise.resolve(null),open:()=>Promise.resolve({put(){},match(){return Promise.resolve(null)}}),keys:()=>Promise.resolve([])},
  fetch:()=>Promise.resolve(new Response('x'))};
 vm.createContext(ctx);vm.runInContext(read('sw.js'),ctx);
 const fire=(url,mode)=>{let n=0;L.fetch({request:{method:'GET',url,mode},respondWith(p){n++;Promise.resolve(p).catch(()=>{})}});return n};
 for(const u of ['/api/me','/api/mihoja','/api/auth/email/start'])assert.equal(fire('https://lahojaboricua.com'+u,'cors'),0,u);
 assert.equal(fire('https://lahojaboricua.com/styles.css','no-cors'),1,'estáticos siguen en caché');
 assert.equal(fire('https://lahojaboricua.com/','navigate'),1,'navegación sigue con el shell');
 assert.equal(fire('https://lahojaboricua.com/apiario','navigate'),1,'solo /api/, no cualquier ruta que empiece igual');
});
test('LHB-24: _routes.json manda solo /api/* a Functions',()=>{const r=JSON.parse(read('_routes.json'));
 assert.equal(r.version,1);assert.deepEqual(r.include,['/api/*']);assert.deepEqual(r.exclude,[]);});
test('LHB-24: token de Clerk (RS256) verificado con JWKS: iss, exp, nbf, azp, firma, alg, kid',async()=>{
 const {pathToFileURL}=require('url');const m=await import(pathToFileURL(path.join(__dirname,'..','functions','_lib','auth.js')).href);
 const ISS='https://clerk.lahojaboricua.com',DEV='https://ejemplo-12.clerk.accounts.dev';const issuers=[ISS,DEV];
 const alg={name:'RSASSA-PKCS1-v1_5',modulusLength:2048,publicExponent:new Uint8Array([1,0,1]),hash:'SHA-256'};
 const k1=await crypto.subtle.generateKey(alg,true,['sign','verify']),k2=await crypto.subtle.generateKey(alg,true,['sign','verify']);
 const jwk={...await crypto.subtle.exportKey('jwk',k1.publicKey),kid:'k1',use:'sig',alg:'RS256'};
 const asked=[];const fetchJwks=async u=>{asked.push(u);if(u===ISS+'/.well-known/jwks.json'||u===DEV+'/.well-known/jwks.json')return{keys:[jwk]};throw new Error('no')};
 const b64=b=>Buffer.from(b).toString('base64url');const enc=o=>b64(JSON.stringify(o));
 const sign=async(h,p,key=k1.privateKey)=>{const d=enc(h)+'.'+enc(p);return d+'.'+b64(new Uint8Array(await crypto.subtle.sign('RSASSA-PKCS1-v1_5',key,new TextEncoder().encode(d))))};
 const now=Date.parse('2026-10-25T20:00:00Z'),t=now/1000;const H={alg:'RS256',kid:'k1',typ:'JWT'};
 const P={iss:ISS,sub:'user_2abc',sid:'sess_1',azp:'https://lahojaboricua.com',iat:t-5,nbf:t-5,exp:t+55};
 const v=(tok,o={})=>m.verifyToken(tok,{issuers,now,fetchJwks,...o});
 m.clearJwksCache();
 assert.deepEqual(await v(await sign(H,P)),{ok:true,sub:'user_2abc',sid:'sess_1',iss:ISS});
 assert.equal((await v(await sign(H,{...P,iss:DEV,azp:'https://lhb-24-backend.la-hoja-boricua.pages.dev'}))).ok,true,'Development y vista previa');
 assert.equal(asked.length,2,'una vez por emisor; luego del caché');
 assert.equal((await v(await sign(H,P))).ok,true);assert.equal(asked.length,2,'caché');
 const why=async(h,p,key)=>(await v(await sign(h,p,key))).why;
 assert.equal(await why(H,{...P,iss:'https://otro.clerk.accounts.dev'}),'iss');assert.equal(asked.length,2,'no busca llaves de un emisor fuera de la lista');
 assert.equal(await why(H,{...P,exp:t-10}),'exp','vencido');assert.equal(await why(H,{...P,exp:undefined}),'exp','sin exp');
 assert.equal((await v(await sign(H,{...P,exp:t-3}))).ok,true,'5 s de tolerancia');
 assert.equal(await why(H,{...P,nbf:t+30}),'nbf','nbf en el futuro');
 assert.equal(await why(H,{...P,nbf:String(t+30)}),'nbf','nbf como texto');assert.equal(await why(H,{...P,nbf:null}),'nbf','nbf null');
 assert.equal(await why(H,{...P,exp:String(t+60)}),'exp','exp como texto');
 const raw=async(hTxt,pTxt)=>{const d=b64(hTxt)+'.'+b64(pTxt);return d+'.'+b64(new Uint8Array(await crypto.subtle.sign('RSASSA-PKCS1-v1_5',k1.privateKey,new TextEncoder().encode(d))))};
 assert.equal((await v(await raw(JSON.stringify(H),JSON.stringify(P).replace(/"exp":\d+/,'"exp":1e400')))).why,'exp','exp infinito');
 for(const [hh,pp] of [['null',JSON.stringify(P)],[JSON.stringify(H),'null'],['[]',JSON.stringify(P)],[JSON.stringify(H),'7']])assert.equal((await v(await raw(hh,pp))).why,'format',hh+' '+pp);
 assert.equal(await why(H,{...P,azp:'https://evil.example'}),'azp');assert.equal(await why(H,{...P,azp:undefined}),'azp','sin azp');
 assert.equal(await why(H,{...P,azp:'https://x.la-hoja-boricua.pages.dev.evil.example'}),'azp','no basta con contener el dominio');
 assert.equal(await why(H,{...P,sub:''}),'sub');
 const good=await sign(H,P);const [h0,,s0]=good.split('.');
 assert.equal((await v(h0+'.'+enc({...P,sub:'user_otro'})+'.'+s0)).why,'sig','contenido cambiado');
 assert.equal(await why(H,P,k2.privateKey),'sig','otra llave con el mismo kid');
 assert.equal((await v(enc({alg:'none',typ:'JWT'})+'.'+enc(P)+'.')).why,'alg','alg none');
 assert.equal((await v(enc({alg:'HS256',kid:'k1'})+'.'+enc(P)+'.'+s0)).why,'alg','HS256');
 assert.equal(await why({...H,kid:'k9'},P),'kid','kid desconocido');assert.equal(asked.length,2,'kid desconocido recién pedido: no vuelve a pedir');
 assert.equal((await v(await sign({...H,kid:'k9'},P),{now:now+61e3})).why,'kid');assert.equal(asked.length,3,'pasado un minuto sí vuelve a pedir');
 for(const bad of ['', 'a.b', 'x.y.z', null])assert.equal((await v(bad)).ok,false,String(bad));
 assert.deepEqual(m.issuersOf({CLERK_ISSUERS:' https://a.dev/ ,https://b.dev'}),['https://a.dev','https://b.dev']);assert.deepEqual(m.issuersOf({}),[]);
 const req=(c,a)=>({headers:{get:k=>k==='Cookie'?c:k==='Authorization'?a:null}});
 assert.equal(m.tokenOf(req('a=1; __session=TOK; b=2',null)),'TOK');assert.equal(m.tokenOf(req(null,'Bearer BEAR')),'BEAR');assert.equal(m.tokenOf(req('__session=TOK','Bearer BEAR')),'BEAR');
 assert.equal(m.tokenOf(req('x__session=1',null)),null);assert.equal(m.tokenOf(req(null,'Basic abc')),null);
});
test('LHB-24: migraciones 0001, 0002 y 0003 en SQLite real; /api/me: 401, needsProfile, perfil',async()=>{
 const {DatabaseSync}=require('node:sqlite');const db=new DatabaseSync(':memory:');db.exec('PRAGMA foreign_keys=ON');
 const mig=f=>fs.readFileSync(path.join(__dirname,'..','migrations',f),'utf8');db.exec(mig('0001_init.sql'));db.exec(mig('0002_clerk_profiles.sql'));db.exec(mig('0003_identity.sql'));
 const tables=db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all().map(r=>r.name);assert.deepEqual(tables,['mihoja','profiles']);
 const ins=db.prepare('INSERT INTO profiles (user_id,handle,age_ok_at,created_at,updated_at) VALUES (?1,?2,?3,?4,?4)');
 ins.run('user_2abc','sergio','2026-10-25T20:00:00Z','2026-10-25T20:00:00Z');
 assert.throws(()=>ins.run('user_x','sergio','2026-10-25T20:00:00Z','2026-10-25T20:00:00Z'),/UNIQUE/,'handle único');
 assert.throws(()=>db.prepare('INSERT INTO profiles (user_id,handle,created_at,updated_at) VALUES (?1,?2,?3,?3)').run('user_y','y','x'),/NOT NULL/,'21+ obligatorio');
 db.prepare("INSERT INTO mihoja (user_id,doc,schema,updated_at) VALUES ('user_2abc','{}',1,'x')").run();
 assert.equal(db.prepare('SELECT hidden FROM profiles WHERE user_id=?1').get('user_2abc').hidden,0);
 const DB={prepare:sql=>{const st=db.prepare(sql);return{bind:(...a)=>({first:async()=>st.get(...a)??null,run:async()=>st.run(...a)})}}};
 const {pathToFileURL}=require('url');const auth=await import(pathToFileURL(path.join(__dirname,'..','functions','_lib','auth.js')).href);
 const me=await import(pathToFileURL(path.join(__dirname,'..','functions','api','me.js')).href);
 const ISS='https://clerk.lahojaboricua.com';const alg={name:'RSASSA-PKCS1-v1_5',modulusLength:2048,publicExponent:new Uint8Array([1,0,1]),hash:'SHA-256'};
 const k=await crypto.subtle.generateKey(alg,true,['sign','verify']);const jwk={...await crypto.subtle.exportKey('jwk',k.publicKey),kid:'k1'};
 const b64=b=>Buffer.from(b).toString('base64url');const enc=o=>b64(JSON.stringify(o));const t=Math.floor(Date.now()/1000);
 const tok=async sub=>{const d=enc({alg:'RS256',kid:'k1'})+'.'+enc({iss:ISS,sub,azp:'https://lahojaboricua.com',exp:t+60,nbf:t-5});return d+'.'+b64(new Uint8Array(await crypto.subtle.sign('RSASSA-PKCS1-v1_5',k.privateKey,new TextEncoder().encode(d))))};
 const realFetch=globalThis.fetch;globalThis.fetch=async u=>{assert.equal(String(u),ISS+'/.well-known/jwks.json');return new Response(JSON.stringify({keys:[jwk]}))};
 try{auth.clearJwksCache();
  const call=async(cookie,env)=>{const r=await me.onRequestGet({request:{headers:{get:h=>h==='Cookie'?cookie:null}},env});return [r.status,await r.json(),r.headers.get('cache-control')]};
  const env={CLERK_ISSUERS:ISS,DB};
  assert.deepEqual(await call(null,env),[401,{error:'no-session'},'no-store']);
  assert.deepEqual((await call('__session='+await tok('user_2abc'),{DB}))[0],503,'sin CLERK_ISSUERS');
  assert.deepEqual((await call('__session=basura',env))[0],401);
  assert.deepEqual(await call('__session=bnVsbA.e30.',env),[401,{error:'no-session'},'no-store'],'cabecera null: 401, no excepción');
  assert.deepEqual(await call('__session='+await tok('user_nuevo'),env),[200,{needsProfile:true},'no-store']);
  const [st,body]=await call('__session='+await tok('user_2abc'),env);assert.equal(st,200);assert.equal(body.profile.handle,'sergio');assert.ok(!('user_id' in body.profile)&&!('age_ok_at' in body.profile));
  assert.deepEqual((await call('__session='+await tok('user_2abc'),{CLERK_ISSUERS:ISS}))[0],503,'sin DB');
 }finally{globalThis.fetch=realFetch}
});

test('LHB-49: el servidor solo acepta la URL de una foto de Clerk (https://img.clerk.com/): falta, otro host, parecidos y caracteres raros',async()=>{
 const {pathToFileURL}=require('url');const P=await import(pathToFileURL(path.join(__dirname,'..','functions','_lib','profile.js')).href);
 assert.deepEqual(P.checkAvatar(AV),{avatar_key:AV});assert.deepEqual(P.checkAvatar(AV+'?width=160&height=160'),{avatar_key:AV+'?width=160&height=160'},'con query también');
 const edge=P.AVATAR_PREFIX+'a'.repeat(P.AVATAR_MAX-P.AVATAR_PREFIX.length);assert.equal(edge.length,P.AVATAR_MAX);assert.deepEqual(P.checkAvatar(edge),{avatar_key:edge},'el largo máximo exacto pasa');
 for(const v of [undefined,null,''])assert.deepEqual(P.checkAvatar(v),{error:'avatar-required'},'falta: '+String(v));
 const bad=['http://img.clerk.com/x','https://img.clerk.com','https://img.clerk.com/','https://img.clerk.com.evil.example/x','https://img.clerk.com@evil.example/x','https://evil.example/https://img.clerk.com/x',
  'https://IMG.clerk.com/x','HTTPS://img.clerk.com/x','https://img.clerk.com:444/x','https://images.clerk.dev/x','//img.clerk.com/x','javascript:https://img.clerk.com/x',' https://img.clerk.com/x','https://img.clerk.com/x ',
  'https://img.clerk.com/x y','https://img.clerk.com/x\n','https://img.clerk.com/\u0000','https://img.clerk.com/\\@evil.example','https://img.clerk.com/ñ','https://img.clerk.com/ ',edge+'a',
  42,true,{},['https://img.clerk.com/x'],{toString:()=>AV}];
 for(const v of bad)assert.deepEqual(P.checkAvatar(v),{error:'avatar-invalid'},'rechazada: '+JSON.stringify(v));
 assert.deepEqual(P.checkProfile({handle:'tabaquero',...IDN}),{error:'avatar-required'},'un perfil válido sin foto no se crea');
 assert.deepEqual(P.checkProfile({handle:'tabaquero',...IDN,avatar_url:'https://evil.example/x.png'}),{error:'avatar-invalid'});
 assert.deepEqual(P.checkProfile({handle:'ab',...IDN}),{error:'handle-invalid'},'los otros errores siguen primero');
 assert.equal(P.checkProfile({handle:'tabaquero',...IDN,avatar_url:AV,avatar_key:'https://evil.example/x'}).avatar_key,AV,'avatar_key del cliente no cuenta, solo avatar_url');
});
async function ONB(user,apiFn){const posts=[],calls=[];let submit,picture;
 const h=CUENTA_HARNESS({api:async(C,m,p,b)=>{calls.push(m+' '+p);if(m==='GET')return {status:200,body:{needsProfile:true}};posts.push(b);return apiFn?apiFn(b):{status:201,body:{profile:{handle:b.handle}}}}});
 h.D.ui.onboarding=(s,p)=>{submit=s;picture=p};h.C.user=user;await h.A.require(h.go);await tick();assert.equal(typeof submit,'function','muestra el onboarding');
 return {h,posts,calls,picture,submit:f=>submit(f||{handle:'ana',...IDN,bio:'',favorite_brand:''})}}
const DEFAULT_IMG='https://img.clerk.com/eyJ0eXBlIjoiZGVmYXVsdCJ9';
const IMG=name=>({type:'image/jpeg',name});
test('LHB-49: la foto de la cuenta (Google, Apple) viene puesta y se manda; la silueta de Clerk o una URL que no es de Clerk no cuentan',async()=>{
 let o=await ONB({id:'user_a',hasImage:true,imageUrl:AV});
 assert.equal(o.picture.url(),AV,'la foto importada viene puesta');assert.deepEqual(await o.submit(),{ok:true});assert.equal(o.posts.length,1);assert.equal(o.posts[0].avatar_url,AV,'se manda la URL de Clerk');assert.ok(!('age_ok' in o.posts[0]),'LHB-52: ya no se manda la casilla de 21+');assert.deepEqual([o.posts[0].first_name,o.posts[0].last_name,o.posts[0].gender,o.posts[0].birth_date],['Ana','Mora','F','1990-05-17'],'se manda la identidad');
 o=await ONB({id:'user_a',hasImage:false,imageUrl:DEFAULT_IMG});assert.equal(o.picture.url(),null,'la silueta (hasImage false) no es una foto');
 o=await ONB({id:'user_a',hasImage:true,imageUrl:'https://lh3.googleusercontent.com/a/x'});assert.equal(o.picture.url(),null,'solo URLs de Clerk');
 o=await ONB({id:'user_a',hasImage:true,imageUrl:'http://img.clerk.com/x'});assert.equal(o.picture.url(),null,'solo https');
 o=await ONB({id:'user_a',hasImage:true});assert.equal(o.picture.url(),null,'sin imageUrl');
 o=await ONB({id:'user_a',hasImage:'yes',imageUrl:AV});assert.equal(o.picture.url(),null,'hasImage tiene que ser true');
});
test('LHB-49: sin foto no se crea el perfil: no se manda nada al servidor, y el error del servidor también llega al formulario',async()=>{
 let o=await ONB({id:'user_a',hasImage:false,imageUrl:DEFAULT_IMG});
 assert.deepEqual(await o.submit(),{error:'avatar-required'});assert.deepEqual(o.posts,[],'ningún POST sin foto');assert.ok(!o.h.log.includes('GO')&&!o.h.log.includes('toast'));
 o=await ONB({id:'user_a',hasImage:true,imageUrl:AV},()=>({status:400,body:{error:'avatar-invalid'}}));assert.deepEqual(await o.submit(),{error:'avatar-invalid'});assert.ok(!o.h.log.includes('GO'));
 o=await ONB({id:'user_a',hasImage:true,imageUrl:AV},()=>({status:400,body:{error:'avatar-required'}}));assert.deepEqual(await o.submit(),{error:'avatar-required'});
});
test('LHB-49: subir su propia foto: solo imágenes, Clerk la guarda, se lee la URL nueva y esa es la que se manda; si falla, sigue sin foto',async()=>{
 const AV2='https://img.clerk.com/eyJ0eXBlIjoidXBsb2FkIn0';
 const mkUser=(extra={})=>{const u={id:'user_a',hasImage:false,imageUrl:DEFAULT_IMG,sets:[],reloads:0,async setProfileImage(a){u.sets.push(a)},async reload(){u.reloads++;u.hasImage=true;u.imageUrl=AV2},...extra};return u};
 let u=mkUser(),o=await ONB(u);const f=IMG('perfil.jpg');
 assert.deepEqual(await o.picture.upload(f),{url:AV2});assert.equal(u.sets.length,1);assert.equal(u.sets[0].file,f,'Clerk recibe el archivo');assert.equal(u.reloads,1,'se recarga la cuenta para leer la URL nueva');
 assert.equal(o.picture.url(),AV2);assert.deepEqual(await o.submit(),{ok:true});assert.equal(o.posts[0].avatar_url,AV2,'se manda la foto subida');
 for(const bad of [null,undefined,{},{type:'text/plain'},{type:'application/pdf'},{type:'image'},{type:5}]){u=mkUser();o=await ONB(u);assert.deepEqual(await o.picture.upload(bad),{error:'avatar-type'},JSON.stringify(bad));assert.equal(u.sets.length,0,'no se sube lo que no es imagen');assert.equal(o.picture.url(),null)}
 u=mkUser({async setProfileImage(){throw new Error('413')}});o=await ONB(u);assert.deepEqual(await o.picture.upload(f),{error:'avatar-upload'});assert.equal(o.picture.url(),null);assert.deepEqual(await o.submit(),{error:'avatar-required'},'sin foto subida no hay perfil');assert.deepEqual(o.posts,[]);
 u=mkUser({async reload(){}});o=await ONB(u);assert.deepEqual(await o.picture.upload(f),{error:'avatar-upload'},'Clerk no dejó foto (hasImage sigue en false)');assert.equal(o.picture.url(),null);
 u=mkUser({async reload(){throw new Error('red')},async setProfileImage(a){u.sets.push(a);u.hasImage=true;u.imageUrl=AV2}});o=await ONB(u);assert.deepEqual(await o.picture.upload(f),{error:'avatar-upload'},'si no se pudo recargar la cuenta no hay con qué confirmar la foto nueva');assert.equal(o.picture.url(),null);
 u=mkUser({hasImage:true,imageUrl:AV,async reload(){throw new Error('red')}});o=await ONB(u);assert.deepEqual(await o.picture.upload(f),{error:'avatar-upload'},'la recarga falla y el objeto sigue con la foto de antes: eso no confirma la nueva');assert.equal(o.picture.url(),AV,'se queda la foto de antes');assert.deepEqual(await o.submit(),{ok:true});assert.equal(o.posts[0].avatar_url,AV,'y esa es la que se manda');assert.equal(u.sets.length,1,'la prueba sí subió el archivo');
 u=mkUser({reload:undefined});o=await ONB(u);assert.deepEqual(await o.picture.upload(f),{error:'avatar-upload'},'una cuenta sin reload tampoco confirma');
 u=mkUser({async setProfileImage(a){u.sets.push(a);u.hasImage=true;u.imageUrl='https://evil.example/x.png'},async reload(){}});o=await ONB(u);assert.deepEqual(await o.picture.upload(f),{error:'avatar-upload'},'una URL que no es de Clerk no se acepta');assert.equal(o.picture.url(),null);
 u=mkUser({hasImage:true,imageUrl:AV});o=await ONB(u);assert.equal(o.picture.url(),AV);assert.deepEqual(await o.picture.upload(f),{url:AV2},'quien trae foto de su cuenta puede escoger otra');assert.deepEqual(await o.submit(),{ok:true});assert.equal(o.posts[0].avatar_url,AV2);
 u=mkUser({async setProfileImage(){throw new Error('x')},hasImage:true,imageUrl:AV});o=await ONB(u);assert.deepEqual(await o.picture.upload(f),{error:'avatar-upload'});assert.equal(o.picture.url(),AV,'una subida que falla no quita la foto que ya tenía');
});
test('LHB-49: una subida de otra cuenta, de otra pantalla o ya superada no cambia la foto del formulario',async()=>{
 const AV2='https://img.clerk.com/eyJ0eXBlIjoidXBsb2FkMiJ9',AV3='https://img.clerk.com/eyJ0eXBlIjoidXBsb2FkMyJ9';
 const gate=defer();let n=0,act=0,maxAct=0;
 const u={id:'user_a',hasImage:false,imageUrl:DEFAULT_IMG,async setProfileImage(){n++;act++;maxAct=Math.max(maxAct,act);if(n===1)await gate.p;act--},async reload(){u.hasImage=true;u.imageUrl=n>=2?AV3:AV2}};
 let o=await ONB(u);const p1=o.picture.upload(IMG('a.jpg'));await tick();const p2=o.picture.upload(IMG('b.jpg'));const p3=o.picture.upload(IMG('c.jpg'));await tick();
 assert.equal(n,1,'las subidas nuevas esperan su turno: Clerk recibe una escritura a la vez');gate.ok();
 assert.deepEqual(await p1,{stale:true},'la primera, ya superada, se descarta');assert.deepEqual(await p2,{stale:true},'la de en medio, superada antes de empezar, se descarta');assert.deepEqual(await p3,{url:AV3},'la última subida es la que vale');assert.equal(o.picture.url(),AV3);
 assert.equal(maxAct,1,'nunca dos escrituras a la vez');assert.equal(n,2,'la de en medio ni siquiera se escribe en Clerk');
 const g2=defer();const u2={id:'user_a',hasImage:false,imageUrl:DEFAULT_IMG,async setProfileImage(){await g2.p},async reload(){u2.hasImage=true;u2.imageUrl=AV2}};
 o=await ONB(u2);const q=o.picture.upload(IMG('a.jpg'));await tick();o.h.C.signIn('user_b');g2.ok();assert.deepEqual(await q,{stale:true},'cambió la cuenta durante la subida');assert.equal(o.picture.url(),null,'la foto de la otra cuenta no se adopta');
 const g3=defer();const u3={id:'user_a',hasImage:false,imageUrl:DEFAULT_IMG,async setProfileImage(){await g3.p},async reload(){u3.hasImage=true;u3.imageUrl=AV2}};
 o=await ONB(u3);const w=o.picture.upload(IMG('a.jpg'));await tick();o.h.nav('#/catalogo');g3.ok();assert.deepEqual(await w,{stale:true},'el usuario se fue de la pantalla');assert.equal(o.picture.url(),null);
 const g4=defer();const u4={id:'user_a',hasImage:false,imageUrl:DEFAULT_IMG,async setProfileImage(){await g4.p;throw new Error('x')},async reload(){}};
 o=await ONB(u4);const z=o.picture.upload(IMG('a.jpg'));await tick();o.h.C.signIn('user_b');g4.ok();assert.deepEqual(await z,{stale:true},'un error de otra cuenta tampoco se le muestra a esta pantalla');
});
test('LHB-49: una subida que sigue en curso cuando se cierra el formulario no le pone su foto al formulario nuevo: las subidas van en orden aunque cambie la pantalla',async()=>{
 const AV2='https://img.clerk.com/eyJ0eXBlIjoidXBsb2FkMiJ9',AV3='https://img.clerk.com/eyJ0eXBlIjoidXBsb2FkMyJ9';
 const gA=defer();let w=0,act=0,maxAct=0,last=null;const ord=[];
 const u={id:'user_a',hasImage:false,imageUrl:DEFAULT_IMG,async setProfileImage({file}){const k=++w;ord.push('start:'+file.name);act++;maxAct=Math.max(maxAct,act);if(k===1)await gA.p;last=file.name;ord.push('end:'+file.name);act--},async reload(){u.hasImage=true;u.imageUrl=last==='a.jpg'?AV2:AV3}};
 const pics=[];const h=CUENTA_HARNESS({api:async(C,m,p,b)=>m==='GET'?{status:200,body:{needsProfile:true}}:{status:201,body:{profile:{handle:b.handle}}}});
 h.D.ui.onboarding=(s,p)=>pics.push({s,p});h.C.user=u;await h.A.require(h.go);await tick();
 const a1=pics[0].p.upload(IMG('a.jpg'));await tick();
 h.nav('#/catalogo');await tick();h.nav('#/mihoja');await h.A.require(h.go);await tick();
 assert.equal(pics.length,2,'se abrió otro formulario mientras la primera subida seguía en curso');
 const b2=pics[1].p.upload(IMG('b.jpg'));await tick();
 assert.deepEqual(ord,['start:a.jpg'],'la subida del formulario nuevo espera a que termine la anterior');gA.ok();
 assert.deepEqual(await a1,{stale:true},'la del formulario cerrado no cambia nada');assert.deepEqual(await b2,{url:AV3},'la URL que se lee es la de la subida nueva, no la que dejó la vieja');
 assert.equal(pics[1].p.url(),AV3);assert.equal(pics[0].p.url(),null,'y el formulario cerrado no adopta nada');
 assert.deepEqual(ord,['start:a.jpg','end:a.jpg','start:b.jpg','end:b.jpg']);assert.equal(maxAct,1);
 assert.deepEqual(await pics[1].s({handle:'ana',display_name:'',bio:'',favorite_brand:''}),{ok:true});
});
test('LHB-49: mientras se sube una foto no se envía el perfil, y mientras se envía no se cambia la foto',async()=>{
 const AV2='https://img.clerk.com/eyJ0eXBlIjoidXBsb2FkMiJ9';
 const g=defer();const u={id:'user_a',hasImage:true,imageUrl:AV,async setProfileImage(){await g.p},async reload(){u.imageUrl=AV2}};
 let o=await ONB(u);const up=o.picture.upload(IMG('a.jpg'));await tick();
 assert.deepEqual(await o.submit(),{error:'avatar-busy'},'con una subida en curso no se envía');assert.deepEqual(o.posts,[]);
 g.ok();assert.deepEqual(await up,{url:AV2});assert.deepEqual(await o.submit(),{ok:true});assert.equal(o.posts[0].avatar_url,AV2,'terminada la subida se manda la foto nueva');
 const gp=defer();const u2={id:'user_a',hasImage:true,imageUrl:AV,sets:0,async setProfileImage(){u2.sets++},async reload(){u2.imageUrl=AV2}};
 o=await ONB(u2,()=>gp.p);const s=o.submit();await tick();
 assert.deepEqual(await o.picture.upload(IMG('b.jpg')),{error:'avatar-busy'},'con el envío en curso no se cambia la foto');assert.equal(u2.sets,0,'ni se toca la cuenta de Clerk');
 gp.ok({status:201,body:{profile:{handle:'ana'}}});assert.deepEqual(await s,{ok:true});assert.equal(o.posts.length,1);assert.equal(o.posts[0].avatar_url,AV,'lo enviado es la foto que se veía');
 const u3={id:'user_a',hasImage:true,imageUrl:AV,async setProfileImage(){},async reload(){u3.imageUrl=AV2}};
 o=await ONB(u3,()=>({status:409,body:{error:'handle-taken'}}));assert.deepEqual(await o.submit(),{error:'handle-taken'});
 assert.deepEqual(await o.picture.upload(IMG('c.jpg')),{url:AV2},'si el envío falla el formulario sigue vivo y la foto se puede cambiar');
});
test('LHB-49: si otra acción toca después y falla, el formulario de perfil que sigue en pantalla se puede terminar (subir foto y crear); uno reemplazado por otro, no',async()=>{
 const AV2='https://img.clerk.com/eyJ0eXBlIjoidXBsb2FkMiJ9';
 const mk=(second,over)=>{const pics=[],posts=[],ran=[];let gets=0;
  const u={id:'user_a',hasImage:true,imageUrl:AV,async setProfileImage(){},async reload(){u.hasImage=true;u.imageUrl=AV2}};
  const h=CUENTA_HARNESS({api:async(C,m,p,b)=>{if(m==='GET'){gets++;return gets===1?{status:200,body:{needsProfile:true}}:second(gets)}posts.push(b);return {status:201,body:{profile:{handle:b.handle}}}},...over});
  h.nav('#/c/yambo-toro');h.D.ui.onboarding=(s,p)=>pics.push({s,p});h.C.user=u;
  return {h,pics,posts,ran,u,A:()=>h.A.quick(()=>ran.push('A'),{inPlace:true,act:'a'}),B:()=>h.A.quick(()=>ran.push('B'),{inPlace:true,act:'b'})}};
 const F={handle:'ana',display_name:'',bio:'',favorite_brand:''};
 /* 1. la acción nueva falla con un 503 y solo abre un aviso: el formulario viejo sigue vivo */
 let x=mk(()=>({status:503,body:{}}));x.A();await tick();x.B();await tick();
 assert.equal(x.pics.length,1,'un solo formulario');assert.ok(x.h.log.some(l=>l.startsWith('notice:')),'la acción nueva falló y avisó');
 assert.deepEqual(await x.pics[0].p.upload(IMG('a.jpg')),{url:AV2},'el formulario que sigue en pantalla todavía puede subir la foto');
 assert.deepEqual(await x.pics[0].s(F),{ok:true},'y crear el perfil');assert.equal(x.posts.length,1);assert.equal(x.posts[0].avatar_url,AV2);assert.deepEqual(x.ran,['A'],'la acción del formulario corrió una vez');
 /* 2. la acción nueva sigue en vuelo cuando se crea el perfil: la del formulario corre una vez y la que estaba en vuelo se descarta */
 const d=defer();x=mk(()=>d.p);x.A();await tick();x.B();await tick();
 assert.deepEqual(await x.pics[0].s(F),{ok:true});assert.deepEqual(x.ran,['A']);d.ok({status:200,body:{profile:{handle:'ana'}}});await tick();
 assert.deepEqual(x.ran,['A'],'la acción más nueva, que seguía en vuelo, no corre además de la del formulario');
 /* 3. la acción nueva abre su propio formulario: el viejo ya no vale */
 x=mk(()=>({status:200,body:{needsProfile:true}}));x.A();await tick();x.B();await tick();
 assert.equal(x.pics.length,2,'la acción nueva abrió otro formulario');
 assert.deepEqual(await x.pics[0].s(F),{stale:true},'el formulario reemplazado no manda nada');assert.deepEqual(x.posts,[]);
 assert.deepEqual(await x.pics[0].p.upload(IMG('a.jpg')),{stale:true},'ni sube');
 assert.deepEqual(await x.pics[1].s(F),{ok:true},'el último formulario sí vale');assert.equal(x.posts.length,1);
 /* 4. aunque el formulario siga vivo, un cambio de cuenta o de página lo descarta */
 x=mk(()=>({status:503,body:{}}));x.A();await tick();x.B();await tick();x.h.C.signIn('user_b');
 assert.deepEqual(await x.pics[0].s(F),{stale:true},'otra cuenta');assert.deepEqual(x.posts,[]);
 x=mk(()=>({status:503,body:{}}));x.A();await tick();x.B();await tick();x.h.nav('#/catalogo');
 assert.deepEqual(await x.pics[0].s(F),{stale:true},'otra página');assert.deepEqual(x.posts,[]);
 /* 5. la página y la cuenta se revisan por sí solas, aunque no llegue el aviso de navegación ni el de cuenta */
 let hash='#/c/yambo-toro';x=mk(()=>({status:503,body:{}}),{here:()=>hash});x.A();await tick();x.B();await tick();hash='#/catalogo';
 assert.deepEqual(await x.pics[0].s(F),{stale:true},'otra página sin aviso de navegación');assert.deepEqual(await x.pics[0].p.upload(IMG('a.jpg')),{stale:true});assert.deepEqual(x.posts,[]);
 x=mk(()=>({status:503,body:{}}));x.A();await tick();x.B();await tick();x.h.C.user={id:'user_b'};
 assert.deepEqual(await x.pics[0].s(F),{stale:true},'otra cuenta sin aviso de cuenta');assert.deepEqual(x.posts,[]);
 /* 6. la acción que falló y quedó para volver se descarta cuando el formulario termina: al salir no revive */
 x=mk(()=>({status:503,body:{}}));x.A();await tick();x.B();await tick();
 assert.deepEqual(await x.pics[0].s(F),{ok:true});assert.deepEqual(x.ran,['A']);x.h.log.length=0;x.h.C.signIn(null);await tick();
 assert.ok(!x.h.log.some(l=>l.startsWith('notice:Entra otra vez')),'la acción descartada no se ofrece otra vez al salir');
});
test('LHB-49: si otra acción gana primero porque el perfil ya existe, el formulario viejo no corre su acción además: ni con la respuesta 201 ni con profile-exists',async()=>{
 const F={handle:'ana',display_name:'',bio:'',favorite_brand:''};
 for(const kind of ['201','exists']){
  const dB=defer(),dP=defer();let gets=0;const ran=[],pics=[];
  const h=CUENTA_HARNESS({api:async(C,m)=>{if(m==='GET'){gets++;if(gets===1)return {status:200,body:{needsProfile:true}};if(gets===2)return dB.p;return {status:200,body:{profile:{handle:'ana'}}}}return dP.p}});
  h.nav('#/c/yambo-toro');h.D.ui.onboarding=(s,p)=>pics.push({s,p});h.C.user={id:'user_a',hasImage:true,imageUrl:AV};
  h.A.quick(()=>ran.push('A'),{inPlace:true,act:'a'});await tick();
  h.A.quick(()=>ran.push('B'),{inPlace:true,act:'b'});await tick();
  const sub=pics[0].s(F);await tick();
  dB.ok({status:200,body:{profile:{handle:'ana'}}});await tick();
  assert.deepEqual(ran,['B'],kind+': la acción más nueva corrió porque el perfil ya existía');assert.equal(h.log.filter(l=>l==='reroute').length,1,kind+': y el formulario viejo se retiró de la pantalla');
  dP.ok(kind==='201'?{status:201,body:{profile:{handle:'ana'}}}:{status:409,body:{error:'profile-exists'}});
  assert.deepEqual(await sub,{stale:true},kind+': la respuesta tardía del formulario viejo se ignora');await tick();
  assert.deepEqual(ran,['B'],kind+': su acción no corre además de la otra');assert.ok(!h.log.includes('toast'),kind+': ni felicita dos veces');
 }
});
/* el formulario de perfil de hoja.js corre tal cual sobre un DOM de mentira (un mapa de selectores a elementos), sin dependencias nuevas */
function FORM_HARNESS(picture,submit,resize,opts){opts=opts||{};
 const vm=require('vm');const src=read('hoja.js').replace(/\r\n/g,'\n');
 const code=src.match(/const HANDLE_RE=.*\n/)[0]+src.match(/const OB_ERR=.*\n/)[0]+src.slice(src.indexOf('const ID_BAD='),src.indexOf('\nconst CUENTA='));
 let els={};const mkEl=()=>{const e={disabled:false,hidden:false,value:'',checked:false,children:[],style:{cssText:''},scrolls:0,scrollIntoView(){e.scrolls++},onclick:null,onchange:null,onsubmit:null,oninput:null,clicks:0,
  appendChild(c){e.children.push(c)},click(){e.clicks++}};let tc='';Object.defineProperty(e,'textContent',{get:()=>tc,set:v=>{tc=v;e.children=[]}});return e};
 const $=s=>s==='#obForm'?els.form:(els[s]||(els[s]=mkEl()));
 let html='';const view={set innerHTML(h){els={form:mkEl()};html=h}};
 const uploads=[];class FakeFile{constructor(parts,name,o){this.parts=parts;this.name=name;this.type=o&&o.type}}
 const ctx={view,$,A:{resizeImage:resize||(async f=>({blob:f.name}))},D:()=>({artesanos:[]}),esc:s=>s,document:{createElement:()=>({})},File:FakeFile};
 /* un reloj fijo para el formulario (new Date() sin argumentos); con argumentos, el Date de siempre */
 if(opts.now){const RD=Date;ctx.Date=class extends RD{constructor(...a){if(a.length)super(...a);else super(opts.now)}}}
 vm.createContext(ctx);vm.runInContext(code+';this.onboardingForm=onboardingForm;this.OB_ERR=OB_ERR;this.idProblem=idProblem',ctx);
 ctx.onboardingForm(submit,picture,opts.mode,opts.init);
 const pick=f=>ctx.$('#obPf').onchange({target:{files:[f],value:'x'}});
 /* send llena el formulario (nombre, apellido, género y fecha; el @ solo en el formulario nuevo) y lo envía; lo que no se da, se llena con una identidad válida */
 const send=(v={})=>{if(opts.mode!=='identity')ctx.$('#obH').value=v.handle===undefined?'ana':v.handle;
  ctx.$('#obFn').value=v.first===undefined?'Ana':v.first;ctx.$('#obLn').value=v.last===undefined?'Mora':v.last;
  const g=v.gender===undefined?'F':v.gender;ctx.$('#obGM').checked=g==='M';ctx.$('#obGF').checked=g==='F';ctx.$('#obD').value=v.birth===undefined?'1990-05-17':v.birth;
  return ctx.$('#obForm').onsubmit({preventDefault(){}})};
 const state=()=>({go:ctx.$('#obGo').disabled,pb:ctx.$('#obPb').disabled,err:ctx.$('#obErr').hidden?'':ctx.$('#obErr').textContent,hint:ctx.$('#obPh').textContent,img:ctx.$('#obPv').children[0]&&ctx.$('#obPv').children[0].src});
 return {ctx,$:ctx.$,pick,send,state,html:()=>html,idProblem:ctx.idProblem,remount:()=>ctx.onboardingForm(submit,picture,opts.mode,opts.init),OB:ctx.OB_ERR};
}
test('LHB-49: el formulario real sobre un DOM de mentira: la foto escogida se achica y se sube, y cada salida suelta los botones',async()=>{
 const AV2='https://img.clerk.com/eyJ0eXBlIjoidXBsb2FkMiJ9';
 /* éxito */
 let cur=null,calls=[],resized=[];
 let f=FORM_HARNESS({url:()=>cur,upload:async file=>{calls.push(file);cur=AV2;return {url:AV2}}},async()=>({ok:true}),async(file,w,q)=>{resized.push([file.name,w,q]);return {blob:1}});
 assert.equal(f.state().pb,false);assert.match(f.state().hint,/necesitas una foto/);
 await f.pick({name:'a.png',type:'image/png'});
 assert.deepEqual(resized,[['a.png',512,.85]],'se achica a 512 con calidad .85');assert.equal(calls.length,1);assert.equal(calls[0].name,'perfil.jpg');assert.equal(calls[0].type,'image/jpeg','a Clerk le llega el JPEG achicado');
 assert.deepEqual([f.state().go,f.state().pb],[false,false],'terminada la subida los dos botones responden');assert.match(f.state().hint,/Listo/);assert.equal(f.state().img,AV2,'y se ve la foto nueva');
 /* un archivo que no es imagen ni se achica ni se sube */
 calls=[];resized=[];await f.pick({name:'x.txt',type:'text/plain'});assert.deepEqual([calls.length,resized.length],[0,0]);assert.equal(f.state().err,f.OB['avatar-type']);assert.deepEqual([f.state().go,f.state().pb],[false,false]);
 /* error de subida, y que la subida se rechace con una excepción */
 for(const upload of [async()=>({error:'avatar-upload'}),async()=>{throw new Error('red')}]){
  f=FORM_HARNESS({url:()=>null,upload},async()=>({ok:true}));await f.pick({name:'a.png',type:'image/png'});
  assert.deepEqual([f.state().go,f.state().pb],[false,false],'un error suelta los botones');assert.ok(f.state().err.length>0,'y se avisa');assert.ok(!/Listo/.test(f.state().hint),'sin decir que ya hay foto');
 }
 /* mientras se sube, nada más responde */
 const g=defer();let ups=0,subs=0;f=FORM_HARNESS({url:()=>AV2,upload:async()=>{ups++;await g.p;return {url:AV2}}},async()=>{subs++;return {ok:true}});
 const p1=f.pick({name:'a.png',type:'image/png'});await tick();
 assert.deepEqual([f.state().go,f.state().pb],[true,true],'subiendo: los dos botones apagados');
 f.pick({name:'b.png',type:'image/png'});f.send();await tick();assert.deepEqual([ups,subs],[1,0],'otra foto o un envío mientras se sube se ignoran');
 g.ok();await p1;assert.deepEqual([f.state().go,f.state().pb],[false,false]);
 /* una subida invalidada con el formulario todavía en pantalla suelta los botones; con otro formulario encima no toca nada */
 const g2=defer();f=FORM_HARNESS({url:()=>null,upload:async()=>{await g2.p;return {stale:true}}},async()=>({ok:true}));
 const p2=f.pick({name:'a.png',type:'image/png'});await tick();assert.equal(f.state().go,true);g2.ok();await p2;assert.deepEqual([f.state().go,f.state().pb],[false,false],'invalidada pero en pantalla: los botones responden');
 const g3=defer();f=FORM_HARNESS({url:()=>null,upload:async()=>{await g3.p;return {url:AV2}}},async()=>({ok:true}));
 const p3=f.pick({name:'a.png',type:'image/png'});await tick();f.remount();g3.ok();await p3;assert.deepEqual([f.state().go,f.state().pb,f.state().img],[false,false,undefined],'si otro formulario ocupó la pantalla, la subida vieja no le cambia la foto ni los botones');
});
test('LHB-49: el formulario real sobre un DOM de mentira: pide la foto primero y cada salida del envío suelta los botones',async()=>{
 const AV2='https://img.clerk.com/eyJ0eXBlIjoidXBsb2FkMiJ9';
 let subs=[];let f=FORM_HARNESS({url:()=>null,upload:async()=>({url:AV2})},async v=>{subs.push(v);return {ok:true}});
 await f.send();assert.equal(subs.length,0,'sin foto no se llama a submit');assert.equal(f.state().err,f.OB['avatar-required']);assert.deepEqual([f.state().go,f.state().pb],[false,false]);
 await f.send({handle:'a',birth:'2010-01-01'});assert.equal(subs.length,0);assert.equal(f.state().err,f.OB['avatar-required'],'sin foto y con el @ y la fecha mal: primero se pide la foto');
 f=FORM_HARNESS({url:()=>AV2,upload:async()=>({url:AV2})},async v=>{subs.push(v);return {ok:true}},undefined,{now:'2026-10-26T15:00:00.000Z'});
 await f.send({handle:'a'});assert.equal(subs.length,0);assert.equal(f.state().err,f.OB['handle-invalid'],'luego el @');
 await f.send({birth:'2010-01-01'});assert.equal(subs.length,0);assert.equal(f.state().err,f.OB['age-under-21'],'luego la fecha: menos de 21 años');
 /* mientras se envía, la foto no cambia */
 const g=defer();let ups=0;f=FORM_HARNESS({url:()=>AV2,upload:async()=>{ups++;return {url:AV2}}},async()=>{await g.p;return {ok:true}});
 const s1=f.send();await tick();assert.deepEqual([f.state().go,f.state().pb],[true,true],'enviando: los dos botones apagados');
 f.pick({name:'a.png',type:'image/png'});f.send();await tick();assert.equal(ups,0,'no se sube otra foto mientras se envía');
 g.ok();await s1;assert.deepEqual([f.state().go,f.state().pb],[false,false],'un envío que termina bien suelta los botones');
 /* error, excepción y envío invalidado con el formulario en pantalla */
 for(const [submit,quien] of [[async()=>({error:'handle-taken'}),'error'],[async()=>{throw new Error('x')},'excepción'],[async()=>({stale:true}),'invalidado'],[async()=>null,'sin respuesta']]){
  f=FORM_HARNESS({url:()=>AV2,upload:async()=>({url:AV2})},submit);await f.send();
  assert.deepEqual([f.state().go,f.state().pb],[false,false],quien+': los botones responden');
  if(quien==='error')assert.equal(f.state().err,f.OB['handle-taken']);
  if(quien==='excepción')assert.ok(f.state().err.length>0,'se avisa');
 }
});
test('LHB-49: toda salida que da por buena la cuenta con perfil retira el formulario abierto: el camino rápido con el perfil guardado y el de sin conexión también',async()=>{
 const F={handle:'ana',display_name:'',bio:'',favorite_brand:''};
 for(const via of ['rapido','sin conexion']){
  const dA=defer(),dB=defer(),dC=defer();let gets=0,posts=0;const ran=[],pics=[];
  const h=CUENTA_HARNESS({api:async(C,m)=>{
   if(m==='GET'){gets++;if(gets<=2)return {status:200,body:{needsProfile:true}};if(gets===3&&via==='sin conexion')return dC.p;return {status:200,body:{profile:{handle:'ana'}}}}
   posts++;return posts===1?dA.p:dB.p}});
  h.nav('#/c/yambo-toro');h.D.ui.onboarding=(s,p)=>pics.push({s,p});h.C.user={id:'user_a',hasImage:true,imageUrl:AV};
  h.A.quick(()=>ran.push('A'),{inPlace:true,act:'a'});await tick();
  const sa=pics[0].s(F);await tick();
  h.A.quick(()=>ran.push('B'),{inPlace:true,act:'b'});await tick();
  assert.equal(pics.length,2,via+': la acción B abrió otro formulario');
  const sb=pics[1].s(F);await tick();
  if(via==='sin conexion'){h.A.quick(()=>ran.push('C'),{inPlace:true,act:'c'});await tick()}
  dA.ok({status:201,body:{profile:{handle:'ana'}}});assert.deepEqual(await sa,{stale:true},via+': A fue reemplazado');
  if(via==='rapido'){h.A.quick(()=>ran.push('C'),{inPlace:true,act:'c'});await tick()}
  else{dC.ok({status:503,body:{}});await tick()}
  assert.deepEqual(ran,['C'],via+': la acción C corrió con el perfil guardado');
  dB.ok({status:409,body:{error:'profile-exists'}});assert.deepEqual(await sb,{stale:true},via+': B ya no vale: C retiró el formulario');await tick();
  assert.deepEqual(ran,['C'],via+': y la acción de B no corre además');assert.ok(!h.log.includes('toast'),via+': ni felicita');
 }
});
test('LHB-49: el formulario pide la foto antes de crear el perfil, achica la imagen en el navegador y la sube a la cuenta; el servidor guarda la URL',()=>{
 const h=read('hoja.js'),app=read('app.js'),css=read('styles.css'),cu=read('cuenta.js'),pf=fs.readFileSync(path.join(__dirname,'..','functions','api','profile.js'),'utf8');
 assert.ok(h.includes('function onboardingForm(submit,picture,mode,init){'),'el formulario recibe la foto (y, desde LHB-52, el modo)');
 assert.ok(h.includes('<input type="file" accept="image/*" id="obPf" class="sr" tabindex="-1">'),'solo imágenes');
 const i=h.indexOf('function onboardingForm'),form=h.slice(i,h.indexOf('\nconst CUENTA=',i));
 assert.ok(form.includes("A.resizeImage(f,512,.85)")&&form.includes("picture.upload(new File([b],'perfil.jpg',{type:'image/jpeg'}))"),'se achica antes de subir');
 const a=form.indexOf("picture.url())return err(OB_ERR['avatar-required'])");assert.ok(a>0&&a<form.indexOf('HANDLE_RE.test(h)'),'la foto se pide primero al enviar');
 assert.ok(/id="obPb"/.test(form)&&form.includes("'Cambiar foto':'Elegir foto'")&&form.includes('Usamos la foto de tu cuenta'),'la foto de la cuenta se anuncia y se puede cambiar');
 for(const k of ['avatar-required','avatar-invalid','avatar-type','avatar-upload','avatar-busy'])assert.ok(h.includes("'"+k+"':'"),'mensaje de '+k);
 assert.ok(form.includes("let working=false;const busy=b=>{working=b;$('#obGo').disabled=b;const pb=$('#obPb');if(pb)pb.disabled=b};"),'una sola operación a la vez: el botón de foto y el de crear se apagan juntos');
 assert.ok(form.includes("e.preventDefault();if(working)return;")&&/err\(''\);busy\(true\);\s*let r;try\{r=await submit\(/.test(form)&&form.includes("busy(false);if(r.error)err("),'el envío toma y suelta el mismo candado');
 assert.ok(/if\(!f\|\|working\)return;/.test(form),'y una foto escogida mientras algo corre se ignora');
 /* cada salida de cada manejador suelta el candado, también si la operación quedó invalidada con el formulario todavía en pantalla (ronda 2, hallazgo 1) */
 const up=form.slice(form.indexOf("$('#obPf').onchange="),form.indexOf("$('#obB').oninput")),sb=form.slice(form.indexOf('form.onsubmit='));
 for(const [nombre,src] of [['subir',up],['enviar',sb]])assert.ok(src.includes("if($('#obForm')!==form)return;if(!r||r.stale){busy(false);return}"),'una operación invalidada con el formulario aún en pantalla suelta el candado al enviar/subir: '+nombre);
 assert.ok(/busy\(false\);if\(r\.error\)return err\(OB_ERR\[r\.error\]\|\|OB_ERR\['avatar-upload'\]\);\s*own=true;showPic\(\)/.test(up),'subir: éxito y error sueltan el candado');
 assert.ok(/busy\(false\);if\(r\.error\)err\(OB_ERR\[r\.error\]\|\|\(idm\|\|edm\?'No pudimos guardar tu perfil\. Intenta otra vez\.':'No pudimos crear tu perfil/.test(sb),'enviar: éxito y error sueltan el candado');
 assert.ok(cu.includes('let uq=Promise.resolve();')&&cu.includes('uq.then(async()=>{try{')&&cu.includes('uq=job.catch(()=>{})'),'las subidas van en cola, una a la vez');
 assert.ok(app.includes('vPerfil,resizeImage,hydrate:'),'app.js le pasa resizeImage a Mi Hoja');
 assert.ok(css.includes('.ob-pic-img{'),'estilos de la foto');
 assert.ok(cu.includes("const CLERK_IMG='https://img.clerk.com/';")&&cu.includes('avatar_url:pic'),'cuenta.js manda la URL de la foto');
 assert.ok(pf.includes('avatar_key, first_name')&&pf.includes('p.avatar_key')&&!pf.includes('avatar_key: null'),'el servidor guarda la URL y la devuelve');
 assert.match(read('sw.js'),/const VERSION='lhb-v57'/,'el shell nuevo se publica con otra versión del caché');
});
/* ===================== LHB-52: identidad al crear el perfil (nombre, apellido, género, fecha de nacimiento) ===================== */
const T0='2026-10-26T15:00:00.000Z';/* "hoy" fijo (UTC) para las reglas de edad: 2026-10-26 */
/* la API de perfil sobre SQLite real: migraciones, JWT de Clerk de mentira y un reloj que se puede fijar (solo new Date() sin argumentos; Date.now sigue real para los tokens) */
async function API52(opts){opts=opts||{};
 const {DatabaseSync}=require('node:sqlite');const db=new DatabaseSync(':memory:');
 const mig=f=>fs.readFileSync(path.join(__dirname,'..','migrations',f),'utf8');db.exec(mig('0001_init.sql'));db.exec(mig('0002_clerk_profiles.sql'));if(!opts.legacy)db.exec(mig('0003_identity.sql'));
 const DB={prepare:sql=>{const st=db.prepare(sql);return{bind:(...a)=>({first:async()=>st.get(...a)??null,all:async()=>({results:st.all(...a).map(r=>({...r}))}),run:async()=>({success:true,meta:{changes:Number(st.run(...a).changes)}})})}}};
 const {pathToFileURL}=require('url');const imp=f=>import(pathToFileURL(path.join(__dirname,'..','functions',...f.split('/'))).href);
 const auth=await imp('_lib/auth.js'),P=await imp('_lib/profile.js'),api=await imp('api/profile.js'),me=await imp('api/me.js');
 const ISS='https://daring-eagle-8394.clerk.accounts.dev';const alg={name:'RSASSA-PKCS1-v1_5',modulusLength:2048,publicExponent:new Uint8Array([1,0,1]),hash:'SHA-256'};
 const k=await crypto.subtle.generateKey(alg,true,['sign','verify']);const jwk={...await crypto.subtle.exportKey('jwk',k.publicKey),kid:'k1'};
 const b64=b=>Buffer.from(b).toString('base64url');const enc=o=>b64(JSON.stringify(o));const t=Math.floor(Date.now()/1000);
 const tok=async sub=>{const d=enc({alg:'RS256',kid:'k1'})+'.'+enc({iss:ISS,sub,azp:'https://lhb-52.la-hoja-boricua.pages.dev',exp:t+60,nbf:t-5});return d+'.'+b64(new Uint8Array(await crypto.subtle.sign('RSASSA-PKCS1-v1_5',k.privateKey,new TextEncoder().encode(d))))};
 const realFetch=globalThis.fetch;globalThis.fetch=async u=>{assert.equal(String(u),ISS+'/.well-known/jwks.json');return new Response(JSON.stringify({keys:[jwk]}))};auth.clearJwksCache();
 const env={CLERK_ISSUERS:ISS,DB};
 const req=(token,body,type='application/json')=>({headers:{get:h=>({Authorization:token?'Bearer '+token:null,'Content-Type':type})[h]??null},json:async()=>typeof body==='string'?JSON.parse(body):body});
 const call=async(fn,token,body,type,e=env)=>{const r=await fn({request:req(token,body,type),env:e});return [r.status,await r.json()]};
 const RealDate=Date;const freeze=iso=>{globalThis.Date=class extends RealDate{constructor(...a){if(a.length)super(...a);else super(iso)}}};const thaw=()=>{globalThis.Date=RealDate};
 return {db,DB,P,env,tok,imp,mig,
  post:(token,body,type,e)=>call(api.onRequestPost,token,body,type,e),put:(token,body,type,e)=>call(api.onRequestPut,token,body,type,e),me:(token,e)=>call(me.onRequestGet,token,undefined,undefined,e),
  freeze,thaw,done:()=>{thaw();globalThis.fetch=realFetch}}}
const ROW=(db,u)=>db.prepare('SELECT * FROM profiles WHERE user_id=?1').get(u);
const COUNT=db=>db.prepare('SELECT COUNT(*) n FROM profiles').get().n;
test('LHB-52: reglas de la identidad en el servidor: nombre y apellido, género, fecha real, no futura, 21 años o más en la fecha UTC',async()=>{
 const {pathToFileURL}=require('url');const P=await import(pathToFileURL(path.join(__dirname,'..','functions','_lib','profile.js')).href);
 const now=new Date(T0);const ID=(o)=>P.checkIdentity({...IDN,...o},now);
 assert.deepEqual(ID({}),{first_name:'Ana',last_name:'Mora',gender:'F',birth_date:'1990-05-17',display_name:'Ana M.'});
 /* los cuatro son obligatorios: falta, null, vacío y en blanco */
 for(const f of ['first_name','last_name'])for(const v of [undefined,null,'','   ','\t'])assert.deepEqual(ID({[f]:v}),{error:f+'-required'},f+' '+JSON.stringify(v));
 for(const v of [undefined,null,''])assert.deepEqual(ID({gender:v}),{error:'gender-required'},'género '+v);
 for(const v of [undefined,null,''])assert.deepEqual(ID({birth_date:v}),{error:'birth_date-required'},'fecha '+v);
 /* los nombres: 1 a 50 caracteres (no bytes), sin caracteres de control */
 assert.equal(ID({first_name:'a'}).first_name,'a','1 carácter');assert.equal(ID({first_name:'a'.repeat(50)}).first_name.length,50,'50 caracteres');assert.deepEqual(ID({first_name:'a'.repeat(51)}),{error:'first_name-long'});assert.deepEqual(ID({last_name:'a'.repeat(51)}),{error:'last_name-long'});
 assert.equal(ID({last_name:'🌿'.repeat(50)}).last_name,'🌿'.repeat(50),'50 caracteres que pesan 200 bytes');assert.deepEqual(ID({last_name:'🌿'.repeat(51)}),{error:'last_name-long'});
 assert.equal(ID({first_name:'  '+'a'.repeat(50)+'  '}).first_name.length,50,'se mide ya sin los espacios de los lados');
 for(const c of ['\u0000','\n','\r','\t','\u001f','\u007f','\u0085','\u009f',' ',' '])for(const f of ['first_name','last_name'])assert.deepEqual(ID({[f]:'An'+c+'a'}),{error:f+'-invalid'},f+' con U+'+c.charCodeAt(0).toString(16));
 for(const v of [42,true,{},['Ana'],{toString:()=>'Ana'}])assert.deepEqual(ID({first_name:v}),{error:'first_name-invalid'},'no es texto: '+JSON.stringify(v));
 assert.equal(ID({first_name:'Ana María',last_name:'de la Cruz'}).display_name,'Ana María D.','espacios por dentro sí');assert.equal(ID({first_name:'Ñandú',last_name:'ñoño'}).display_name,'Ñandú Ñ.','acentos y eñes');assert.equal(ID({first_name:'ana',last_name:'mora'}).display_name,'ana M.','la inicial va en mayúscula');
 assert.equal(ID({last_name:'🌿x'}).display_name,'Ana 🌿.','la inicial es un carácter, no media pareja de bytes');
 assert.ok(!ID({}).display_name.includes('Mora'),'el apellido completo no está en el nombre público');
 /* el género: M o F exactos */
 assert.equal(ID({gender:'M'}).gender,'M');assert.equal(ID({gender:'F'}).gender,'F');
 for(const v of ['X','m','f','Male','Female','Masculino','MF',' M',1,true,{},['M']])assert.deepEqual(ID({gender:v}),{error:'gender-invalid'},'género '+JSON.stringify(v));
 /* la fecha, con hoy = 2026-10-26: exactamente 21 hoy pasa, 20 años y 364 días no */
 for(const d of ['2005-10-26','2005-10-25','1990-05-17','1900-01-01','2004-02-29','2000-02-29'])assert.equal(ID({birth_date:d}).birth_date,d,'pasa '+d);
 for(const d of ['2005-10-27','2005-10-28','2005-11-26','2006-01-01','2010-01-01','2026-10-26'])assert.deepEqual(ID({birth_date:d}),{error:'age-under-21'},'menos de 21: '+d);
 for(const d of ['2026-10-27','2026-12-31','2030-01-01','9999-12-31'])assert.deepEqual(ID({birth_date:d}),{error:'birth_date-future'},'futura: '+d);
 for(const d of ['2000-02-30','2001-02-29','2100-02-29','2000-13-01','2000-00-10','2000-01-00','2000-04-31','2000-1-1','00-01-01','abcd-ef-gh','2000/01/01','2000-01-01T00:00:00Z',' 2000-01-01','2000-01-01\n','1990-05-17 ','１９９０-０５-１７','19900517',19900517,{},['1990-05-17'],true,'1899-12-31','0001-01-01'])assert.deepEqual(ID({birth_date:d}),{error:'birth_date-invalid'},'inválida: '+JSON.stringify(d));
 /* el cuerpo entero */
 for(const x of [null,'x',[],42,undefined])assert.deepEqual(P.checkIdentity(x,now),{error:'bad-body'});
 /* la edad se mide en la fecha UTC del servidor, no en la del teléfono: a las 23:30 en Puerto Rico del 26 ya es 27 en UTC */
 const tarde=new Date('2026-10-26T23:30:00-04:00');assert.equal(P.utcDay(tarde),'2026-10-27');
 assert.equal(P.checkIdentity({...IDN,birth_date:'2005-10-27'},tarde).birth_date,'2005-10-27','el 27 UTC ya cumple 21');assert.deepEqual(P.checkIdentity({...IDN,birth_date:'2005-10-27'},new Date('2026-10-26T23:59:59Z')),{error:'age-under-21'},'un segundo antes de la medianoche UTC todavía no');
 /* los bordes del calendario */
 const at=(iso,d)=>P.checkIdentity({...IDN,birth_date:d},new Date(iso));
 assert.deepEqual(at('2025-02-28T12:00:00Z','2004-02-29'),{error:'age-under-21'},'nacida el 29 de febrero: el 28 de febrero todavía no cumple');assert.equal(at('2025-03-01T12:00:00Z','2004-02-29').birth_date,'2004-02-29','el 1 de marzo sí');
 assert.equal(at('2028-02-29T12:00:00Z','2007-02-28').birth_date,'2007-02-28');assert.deepEqual(at('2028-02-29T12:00:00Z','2007-03-01'),{error:'age-under-21'},'hoy es 29 de febrero y nació el 1 de marzo');assert.equal(at('2028-02-29T12:00:00Z','2007-02-28').birth_date,'2007-02-28');
 assert.equal(at('2026-01-01T00:00:00Z','2005-01-01').birth_date,'2005-01-01','cumple 21 el 1 de enero');assert.deepEqual(at('2026-01-01T00:00:00Z','2005-01-02'),{error:'age-under-21'});
 /* checkProfile usa lo mismo, y el orden de los errores no se mezcla con el @ ni con la foto */
 const full={handle:'tabaquero',...IDN,avatar_url:AV};
 assert.deepEqual(P.checkProfile({...full,birth_date:'2010-01-01'},now),{error:'age-under-21'});assert.equal(P.checkProfile(full,now).birth_date,'1990-05-17');assert.equal(P.checkProfile(full,now).display_name,'Ana M.');
 assert.deepEqual(P.checkProfile({...full,gender:'X'},now),{error:'gender-invalid'});
 assert.equal(P.checkProfile({handle:'tabaquero',...IDN,avatar_url:AV},new Date(T0)).error,undefined);
});
test('LHB-52: POST /api/profile en SQLite real: cada rechazo (falta un dato, fecha mala, 20 años y 364 días, futura) no crea nada; exactamente 21 hoy sí; el 21+ sale de la fecha',async()=>{
 const a=await API52();
 try{
  const tkA=await a.tok('user_a'),tkB=await a.tok('user_b');const body=(o)=>({handle:'tabaquero',...IDN,avatar_url:AV,...o});
  a.freeze(T0);
  const rejects=[
   ['falta el nombre',{first_name:undefined},'first_name-required'],['falta el apellido',{last_name:undefined},'last_name-required'],['falta el género',{gender:undefined},'gender-required'],['falta la fecha',{birth_date:undefined},'birth_date-required'],
   ['nombre en blanco',{first_name:'   '},'first_name-required'],['nombre de 51 caracteres',{first_name:'a'.repeat(51)},'first_name-long'],['apellido con salto de línea',{last_name:'Mo\nra'},'last_name-invalid'],
   ['género fuera de M y F',{gender:'X'},'gender-invalid'],['fecha que no existe',{birth_date:'2001-02-29'},'birth_date-invalid'],['fecha con otro formato',{birth_date:'17/05/1990'},'birth_date-invalid'],
   ['20 años y 364 días',{birth_date:'2005-10-27'},'age-under-21'],['nació hoy',{birth_date:'2026-10-26'},'age-under-21'],['fecha futura',{birth_date:'2026-10-27'},'birth_date-future'],
   ['la casilla vieja sin fecha',{birth_date:undefined,age_ok:true},'birth_date-required']];
  for(const [que,o,err] of rejects){const b=body(o);for(const k of Object.keys(b))if(b[k]===undefined)delete b[k];
   assert.deepEqual(await a.post(tkA,b),[400,{error:err}],que);assert.equal(COUNT(a.db),0,que+': no se creó nada');}
  assert.deepEqual(await a.post(tkA,body({birth_date:'2005-10-27'})),[400,{error:'age-under-21'}]);
  /* exactamente 21 hoy: se crea, el 21+ queda sellado con la hora del servidor, y nada privado vuelve en la respuesta */
  const r=await a.post(tkA,body({birth_date:'2005-10-26'}));assert.equal(r[0],201);
  assert.deepEqual(r[1],{profile:{handle:'tabaquero',display_name:'Ana M.',bio:null,favorite_brand:null,avatar_key:AV}},'la respuesta no trae género ni fecha de nacimiento');
  const row=ROW(a.db,'user_a');assert.deepEqual([row.first_name,row.last_name,row.gender,row.birth_date,row.display_name],['Ana','Mora','F','2005-10-26','Ana M.']);
  assert.equal(row.age_ok_at,T0,'age_ok_at lo sella el servidor cuando la fecha muestra 21 o más');assert.equal(row.created_at,T0);
  /* el @ no se gastó con los rechazos, y los demás errores siguen igual */
  assert.deepEqual(await a.post(tkB,body({handle:'tabaquero'})),[409,{error:'handle-taken'}]);
  assert.deepEqual(await a.post(tkA,body({handle:'otro'})),[409,{error:'profile-exists'}]);
  assert.equal(ROW(a.db,'user_a').handle,'tabaquero');
  /* quien trae display_name o age_ok en el cuerpo no cambia nada: el nombre público sale del nombre y la inicial */
  const r2=await a.post(tkB,body({handle:'bea',first_name:' Bea ',last_name:'ñoño',gender:'F',birth_date:'1985-01-01',display_name:'Beatriz Ñoño Completa',age_ok:true}));
  assert.equal(r2[0],201);assert.equal(r2[1].profile.display_name,'Bea Ñ.');assert.equal(ROW(a.db,'user_b').first_name,'Bea');
 }finally{a.done()}
});
test('LHB-52: DOB y género son privados: ninguna lectura pública los trae, /api/me solo se los da a su dueño',async()=>{
 const a=await API52();
 try{
  const tkA=await a.tok('user_a'),tkB=await a.tok('user_b');
  assert.equal((await a.post(tkA,{handle:'tabaquero',...IDN,avatar_url:AV,bio:'Fumo los domingos.'}))[0],201);
  assert.equal((await a.post(tkB,{handle:'bea',first_name:'Bea',last_name:'Soto',gender:'M',birth_date:'1980-02-03',avatar_url:AV}))[0],201);
  const secretos=['Mora','1990-05-17','"F"'];
  /* la lectura pública: solo las cinco columnas públicas, también con los datos privados en la fila */
  const pub=await a.P.publicProfile(a.DB,'tabaquero');
  assert.deepEqual(Object.keys(pub).sort(),['avatar_key','bio','display_name','favorite_brand','handle'],'las columnas públicas, y solo esas');
  assert.deepEqual(pub,{handle:'tabaquero',display_name:'Ana M.',bio:'Fumo los domingos.',favorite_brand:null,avatar_key:AV});
  for(const s of secretos)assert.ok(!JSON.stringify(pub).includes(s),'la lectura pública no trae '+s);
  for(const k of ['first_name','last_name','gender','birth_date','age_ok_at','user_id'])assert.ok(!(k in pub),k+' no sale');
  assert.equal(a.P.PUBLIC_COLUMNS,'handle, display_name, bio, favorite_brand, avatar_key');
  a.db.prepare("UPDATE profiles SET hidden=1 WHERE user_id='user_b'").run();assert.equal(await a.P.publicProfile(a.DB,'bea'),null,'un perfil oculto no se lee en público');
  /* lo que la puerta de Mi Hoja le da a las APIs tampoco lo trae */
  const g=await a.P.requireProfile({headers:{get:h=>({Authorization:'Bearer '+tkA})[h]??null}},a.env);
  assert.deepEqual(Object.keys(g.profile).sort(),['avatar_key','bio','display_name','favorite_brand','handle','hidden']);for(const s of secretos)assert.ok(!JSON.stringify(g.profile).includes(s));
  /* /api/me: a su dueño, con todo; a otra persona, solo lo suyo */
  const [st,m]=await a.me(tkA);assert.equal(st,200);
  assert.deepEqual(m,{profile:{handle:'tabaquero',display_name:'Ana M.',bio:'Fumo los domingos.',favorite_brand:null,avatar_key:AV,first_name:'Ana',last_name:'Mora',gender:'F',birth_date:'1990-05-17'},needsIdentity:false});
  const [,mb]=await a.me(tkB);assert.deepEqual([mb.profile.first_name,mb.profile.gender,mb.profile.birth_date],['Bea','M','1980-02-03']);assert.ok(!JSON.stringify(mb).includes('Mora')&&!JSON.stringify(mb).includes('1990-05-17'),'cada quien ve lo suyo');
  assert.deepEqual(await a.me(null),[401,{error:'no-session'}]);
  /* ningún otro archivo del servidor lee esas columnas hacia afuera: hoy solo /api/me las selecciona, y publicProfile no las nombra */
  const dir=path.join(__dirname,'..','functions');const files=[];(function w(d){for(const f of fs.readdirSync(d,{withFileTypes:true}))f.isDirectory()?w(path.join(d,f.name)):/\.js$/.test(f.name)&&files.push(path.join(d,f.name))})(dir);
  const reads=files.filter(f=>/SELECT[^;`']*\b(birth_date|gender)\b/.test(fs.readFileSync(f,'utf8').replace(/\r\n/g,'\n').replace(/'\s*\+\s*\n\s*'/g,''))).map(f=>path.relative(dir,f).replace(/\\/g,'/'));
  assert.deepEqual(reads,['api/me.js'],'solo /api/me selecciona la fecha y el género');
 }finally{a.done()}
});
test('LHB-52: la migración 0003 agrega cuatro columnas nulas, no rellena nada, y la base rechaza un género o una fecha que no son',async()=>{
 const a=await API52({legacy:true});
 try{
  /* un perfil de antes de 0003 (el del dueño es uno): con nombre público viejo y sin identidad */
  a.db.prepare("INSERT INTO profiles (user_id,handle,display_name,age_ok_at,created_at,updated_at) VALUES ('user_old','sergio','Sergio B','2026-10-25T20:00:00.000Z','2026-10-25T20:00:00.000Z','2026-10-25T20:00:00.000Z')").run();
  const antes=ROW(a.db,'user_old');assert.ok(!('first_name' in antes),'antes de 0003 no existen');
  a.db.exec(a.mig('0003_identity.sql'));
  const cols=a.db.prepare("PRAGMA table_info(profiles)").all();for(const c of ['first_name','last_name','gender','birth_date']){const col=cols.find(x=>x.name===c);assert.ok(col,c+' existe');assert.equal(col.notnull,0,c+' admite null');assert.equal(col.type,'TEXT')}
  const dsp=ROW(a.db,'user_old');assert.deepEqual([dsp.first_name,dsp.last_name,dsp.gender,dsp.birth_date],[null,null,null,null],'ninguna fila existente se rellena');
  for(const k of Object.keys(antes))assert.equal(dsp[k],antes[k],k+' no cambió');
  const ins=(g,b)=>a.db.prepare("INSERT INTO profiles (user_id,handle,age_ok_at,created_at,updated_at,gender,birth_date) VALUES (?1,?1,'x','x','x',?2,?3)").run('u_'+Math.random().toString(36).slice(2),g,b);
  assert.doesNotThrow(()=>ins('M','1990-05-17'));assert.doesNotThrow(()=>ins('F',null));assert.doesNotThrow(()=>ins(null,'2000-01-01'));
  for(const g of ['X','m','f','Male','',' M'])assert.throws(()=>ins(g,null),/CHECK/,'género '+JSON.stringify(g));
  for(const d of ['ayer','1990-5-7','90-05-17','1990/05/17','','1990-05-1'])assert.throws(()=>ins(null,d),/CHECK/,'fecha '+JSON.stringify(d));
  /* un perfil de antes llega a /api/me con needsIdentity, con sus nulos y su nombre público viejo */
  const [st,m]=await a.me(await a.tok('user_old'));assert.equal(st,200);
  assert.deepEqual(m,{profile:{handle:'sergio',display_name:'Sergio B',bio:null,favorite_brand:null,avatar_key:null,first_name:null,last_name:null,gender:null,birth_date:null},needsIdentity:true});
  /* a medias también cuenta como incompleto: basta con que falte uno */
  for(const c of ['first_name','last_name','gender','birth_date']){a.db.prepare("UPDATE profiles SET first_name='A',last_name='B',gender='M',birth_date='1990-01-01' WHERE user_id='user_old'").run();a.db.prepare("UPDATE profiles SET "+c+"=NULL WHERE user_id='user_old'").run();
   assert.equal((await a.me(await a.tok('user_old')))[1].needsIdentity,true,'falta '+c)}
  a.db.prepare("UPDATE profiles SET first_name='A',last_name='B',gender='M',birth_date='1990-01-01' WHERE user_id='user_old'").run();assert.equal((await a.me(await a.tok('user_old')))[1].needsIdentity,false,'con los cuatro ya no');
 }finally{a.done()}
});
test('LHB-52: PUT /api/profile completa la identidad de un perfil de antes, una sola vez, sin tocar lo demás',async()=>{
 const a=await API52({legacy:true});
 try{
  const mkOld=(u,h,dn)=>a.db.prepare("INSERT INTO profiles (user_id,handle,display_name,bio,age_ok_at,created_at,updated_at) VALUES (?1,?2,?3,'mi bio','2026-10-25T20:00:00.000Z','2026-10-25T20:00:00.000Z','2026-10-25T20:00:00.000Z')").run(u,h,dn);
  mkOld('user_old','sergio','Sergio B');mkOld('user_nodn','sinnombre',null);
  a.db.exec(a.mig('0003_identity.sql'));
  const tk=await a.tok('user_old');a.freeze(T0);
  /* el prólogo es el de POST */
  assert.deepEqual(await a.put(null,IDN),[401,{error:'no-session'}]);assert.deepEqual(await a.put(tk,IDN,undefined,{DB:a.DB}),[503,{error:'no-auth-config'}]);
  assert.deepEqual(await a.put(tk,IDN,'text/plain'),[415,{error:'bad-type'}]);assert.deepEqual(await a.put(tk,'{no es json'),[400,{error:'bad-body'}]);
  /* cada rechazo deja la fila como estaba */
  const intacta=ROW(a.db,'user_old');
  for(const [que,o,err] of [['falta el nombre',{first_name:''},'first_name-required'],['sin género',{gender:null},'gender-required'],['fecha mala',{birth_date:'2001-02-29'},'birth_date-invalid'],['20 años y 364 días',{birth_date:'2005-10-27'},'age-under-21'],['futura',{birth_date:'2027-01-01'},'birth_date-future'],['género raro',{gender:'X'},'gender-invalid']])
   {assert.deepEqual(await a.put(tk,{...IDN,...o}),[400,{error:err}],que);assert.deepEqual(ROW(a.db,'user_old'),intacta,que+': la fila no cambió')}
  /* completar: guarda los cuatro, deja el nombre público viejo, el 21+ original y el @ */
  assert.deepEqual(await a.put(tk,{...IDN,first_name:' Sergio ',last_name:'Báez',gender:'M',birth_date:'1975-03-04',handle:'otro',display_name:'Otro',age_ok:false}),[200,{ok:true}]);
  const r=ROW(a.db,'user_old');assert.deepEqual([r.first_name,r.last_name,r.gender,r.birth_date],['Sergio','Báez','M','1975-03-04']);
  assert.equal(r.display_name,'Sergio B','el nombre público que ya existía se queda (display_name legacy sigue legible)');assert.equal(r.handle,'sergio','el @ no se cambia por aquí');assert.equal(r.age_ok_at,'2026-10-25T20:00:00.000Z','el sello del 21+ original no se toca');assert.equal(r.bio,'mi bio');assert.equal(r.updated_at,T0);
  /* una segunda vez: 409, y nada cambia */
  const hecha=ROW(a.db,'user_old');assert.deepEqual(await a.put(tk,{...IDN,first_name:'Otra'}),[409,{error:'identity-exists'}]);assert.deepEqual(ROW(a.db,'user_old'),hecha,'ya completo: no se sobrescribe');
  /* uno sin nombre público lo recibe de su nombre y la inicial */
  assert.deepEqual(await a.put(await a.tok('user_nodn'),IDN),[200,{ok:true}]);assert.equal(ROW(a.db,'user_nodn').display_name,'Ana M.');
  /* sin perfil: 403; y nadie toca el perfil de otro */
  assert.deepEqual(await a.put(await a.tok('user_nuevo'),IDN),[403,{error:'no-profile'}]);assert.equal(COUNT(a.db),2,'PUT no crea perfiles');
  a.db.prepare("INSERT INTO profiles (user_id,handle,age_ok_at,created_at,updated_at,first_name,last_name,gender,birth_date) VALUES ('user_c','c','x','x','x','Cata','Rey','F','1990-01-01')").run();
  assert.deepEqual(await a.put(await a.tok('user_c'),IDN),[409,{error:'identity-exists'}]);assert.equal(ROW(a.db,'user_c').first_name,'Cata');
 }finally{a.done()}
});
test('LHB-52: cuenta.js manda al paso "Completa tu perfil" a quien existía sin identidad, antes de abrir Mi Hoja, y lo termina una sola vez',async()=>{
 const mk=async(putRes,after,me,over)=>{const calls=[];let submit;const h=CUENTA_HARNESS({api:async(C,m,p,b)=>{calls.push(m+' '+p);if(m==='GET')return typeof me==='function'?me(calls):{status:200,body:me||{profile:{handle:'sergio'},needsIdentity:true}};h.puts=(h.puts||[]).concat([b]);return putRes(b)},...over});
  h.D.ui.identity=s=>{submit=s;h.log.push('identity')};h.D.ui.onboarding=()=>h.log.push('onboarding');h.nav('#/mihoja');h.C.user={id:'user_a'};await h.A.require(h.go,over&&over.inPlaceOpts);await tick();return {h,calls,submit:f=>{const r=submit(f);after&&after(h);return r},raw:()=>submit}};
 /* la puerta: no abre, no guarda el perfil para abrir sin red, no pide foto ni @ */
 let r=await mk(()=>({status:200,body:{ok:true}}));
 assert.equal(typeof r.raw(),'function','muestra el paso de identidad');assert.ok(r.h.log.includes('identity'));assert.ok(!r.h.log.includes('GO')&&!r.h.log.includes('onboarding'),'todavía no abre Mi Hoja ni pide un perfil nuevo');
 assert.ok(r.h.log.includes('clear')&&!r.h.log.some(x=>x.startsWith('store')),'el perfil guardado de antes se borra y no se vuelve a guardar hasta completar');
 /* completar: manda solo los cuatro datos, luego guarda, felicita y abre */
 const F={first_name:'Sergio',last_name:'Báez',gender:'M',birth_date:'1975-03-04',handle:'otro',bio:'x',favorite_brand:'y',display_name:'Z',age_ok:true,avatar_url:'https://img.clerk.com/x'};
 r=await mk(()=>({status:200,body:{ok:true}}));assert.deepEqual(await r.submit(F),{ok:true});
 assert.deepEqual(r.h.puts,[{first_name:'Sergio',last_name:'Báez',gender:'M',birth_date:'1975-03-04'}],'el PUT lleva solo nombre, apellido, género y fecha');
 assert.deepEqual(r.calls,['GET /api/me','PUT /api/profile']);assert.deepEqual(r.h.log.filter(x=>x.startsWith('store')||x==='GO'||x==='toast'),['store:user_a:sergio','toast','GO']);
 /* un rechazo del servidor deja el formulario vivo y no abre nada; luego el mismo formulario puede reintentar */
 let n=0;r=await mk(()=>++n===1?{status:400,body:{error:'age-under-21'}}:{status:200,body:{ok:true}});
 assert.deepEqual(await r.submit(F),{error:'age-under-21'});assert.ok(!r.h.log.includes('GO')&&!r.h.log.includes('toast'));assert.deepEqual(await r.submit(F),{ok:true});assert.deepEqual(r.h.log.filter(x=>x==='GO'),['GO'],'el reintento abre una sola vez');
 r=await mk(()=>({status:500,body:{}}));assert.deepEqual(await r.submit(F),{error:'generic'});r=await mk(()=>{throw new Error('sin red')});assert.deepEqual(await r.submit(F),{error:'generic'});assert.ok(!r.h.log.includes('GO'));
 /* ya estaba completo (otra pestaña, o la respuesta se perdió): se revisa de nuevo y, si sale completo, termina igual que un 200; si no, error y se puede reintentar */
 r=await mk(()=>({status:409,body:{error:'identity-exists'}}),null,calls=>calls.filter(c=>c.startsWith('GET')).length===1?{status:200,body:{profile:{handle:'sergio'},needsIdentity:true}}:{status:200,body:{profile:{handle:'sergio'},needsIdentity:false}});
 assert.deepEqual(await r.submit(F),{ok:true});assert.deepEqual(r.h.log.filter(x=>x==='GO'||x==='toast'),['toast','GO']);
 r=await mk(()=>({status:409,body:{error:'identity-exists'}}),null,()=>({status:200,body:{profile:{handle:'sergio'},needsIdentity:true}}));assert.deepEqual(await r.submit(F),{error:'recheck'},'si la revisión sigue diciendo que falta, no se anuncia éxito');assert.ok(!r.h.log.includes('GO'));
 /* un solo envío a la vez */
 const d=defer();r=await mk(()=>d.p);const p1=r.submit(F);const p2=await Promise.race([r.submit(F),tick(20).then(()=>'colgado')]);assert.deepEqual(p2,{error:'busy'},'el segundo envío no espera ni manda');d.ok({status:200,body:{ok:true}});assert.deepEqual(await p1,{ok:true});assert.deepEqual(r.h.puts.length,1,'un solo PUT');
 /* cuenta o página distintas: no se manda ni se abre nada */
 r=await mk(()=>({status:200,body:{ok:true}}),h=>h.C.signIn('user_b'));assert.deepEqual(await r.submit(F),{stale:true});assert.ok(!r.h.log.includes('GO')&&!r.h.log.includes('toast'),'otra cuenta: no abre ni felicita');assert.ok(!r.h.log.some(x=>x.startsWith('store')));
 r=await mk(()=>({status:200,body:{ok:true}}),h=>h.nav('#/catalogo'));assert.deepEqual(await r.submit(F),{stale:true});assert.ok(!r.h.log.includes('GO'),'el usuario se fue de la pantalla: no se abre Mi Hoja encima');
 r=await mk(()=>({status:200,body:{ok:true}}));r.h.C.signIn('user_b');await tick();const pc=r.h.puts?r.h.puts.length:0;assert.deepEqual(await r.raw()(F),{stale:true});assert.equal(r.h.puts?r.h.puts.length:0,pc,'un formulario que quedó de otra cuenta no manda nada');
 /* desde una página pública: tras completar repinta la página y hace la acción */
 const h=CUENTA_HARNESS({api:async(C,m)=>m==='GET'?{status:200,body:{profile:{handle:'sergio'},needsIdentity:true}}:{status:200,body:{ok:true}}});let sub;h.D.ui.identity=s=>{sub=s};h.nav('#/c/yambo-toro');h.C.user={id:'user_a'};
 await h.A.require(h.go,{inPlace:true,act:'humidor'});await tick();assert.deepEqual(await sub(F),{ok:true});assert.deepEqual(h.log.filter(x=>x==='GO'||x==='reroute'),['reroute','GO'],'repinta la página y hace la acción');
 /* quien ya tiene su identidad (needsIdentity false, o sin la marca) no ve el paso */
 for(const body of [{profile:{handle:'ana'},needsIdentity:false},{profile:{handle:'ana'}}]){const k=CUENTA_HARNESS({api:async()=>({status:200,body})});let seen=false;k.D.ui.identity=()=>{seen=true};k.C.user={id:'user_a'};await k.A.require(k.go);await tick();assert.ok(!seen&&k.log.includes('GO'),'sin la marca no hay paso extra: '+JSON.stringify(body))}
 /* y un 401 o 403 con la marca no abre nada (la puerta sigue igual) */
 const z=CUENTA_HARNESS({api:async()=>({status:403,body:{needsIdentity:true,profile:{handle:'x'}}})});let sz=false;z.D.ui.identity=()=>{sz=true};z.C.user={id:'user_a'};await z.A.require(z.go);await tick();assert.ok(!sz&&!z.log.includes('GO'));
});
test('LHB-52: el formulario real: una fecha de menos de 21 años no manda nada; faltar un dato, tampoco; la casilla de los 21 ya no existe',async()=>{
 const AV2='https://img.clerk.com/eyJ0eXBlIjoidXBsb2FkMiJ9';const now='2026-10-26T15:00:00.000Z';const subs=[];
 const mk=(o)=>FORM_HARNESS({url:()=>AV2,upload:async()=>({url:AV2})},async v=>{subs.push(v);return {ok:true}},undefined,{now,...o});
 let f=mk();
 /* la forma: nombre, apellido, género, fecha (con tope hoy) y ninguna casilla de 21 */
 const html=f.html();for(const id of ['obFn','obLn','obGM','obGF','obD'])assert.ok(html.includes('id="'+id+'"'),id+' está');assert.ok(!html.includes('obAge')&&!html.includes('Tengo 21')&&!html.includes('id="obN"'),'ni casilla de 21 ni nombre público opcional');
 assert.match(html,/id="obD" type="date"[^>]*min="1900-01-01"[^>]*max="2026-10-26"/,'la fecha es un campo de fecha, con tope hoy');assert.match(html,/Masculino/);assert.match(html,/Femenino/);assert.ok(!/Otro|No binario/i.test(html),'solo dos opciones');assert.match(html,/privad/);
 /* cada dato que falta: no se manda nada y se dice cuál */
 for(const [v,err] of [[{first:''},'first_name-required'],[{first:'   '},'first_name-required'],[{last:''},'last_name-required'],[{first:'a'.repeat(51)},'first_name-long'],[{last:'Mo\nra'},'last_name-invalid'],[{gender:''},'gender-required'],[{birth:''},'birth_date-required'],[{birth:'2001-02-29'},'birth_date-invalid'],[{birth:'2026-10-27'},'birth_date-future'],[{birth:'2005-10-27'},'age-under-21'],[{birth:'2026-10-26'},'age-under-21']]){
  subs.length=0;f=mk();await f.send(v);assert.equal(subs.length,0,JSON.stringify(v)+': no se manda nada');assert.equal(f.state().err,f.OB[err],JSON.stringify(v)+' dice '+err);assert.deepEqual([f.state().go,f.state().pb],[false,false],'los botones responden');}
 assert.ok(f.OB['age-under-21']&&/21/.test(f.OB['age-under-21']),'el mensaje de menores es claro y menciona los 21');
 /* exactamente 21 hoy: se manda, con el @, la identidad y nada de display_name, age_ok ni casilla */
 subs.length=0;f=mk();await f.send({birth:'2005-10-26'});assert.equal(subs.length,1);assert.deepEqual(subs[0],{handle:'ana',first_name:'Ana',last_name:'Mora',gender:'F',birth_date:'2005-10-26',bio:'',favorite_brand:''});assert.equal(f.state().err,'');
 subs.length=0;f=mk();await f.send({first:'  Ana María ',last:' de la Cruz ',gender:'M'});assert.deepEqual([subs[0].first_name,subs[0].last_name,subs[0].gender],['Ana María','de la Cruz','M'],'los espacios de los lados se recortan');
 /* la fecha se compara contra el día UTC, no contra la hora de la persona */
 subs.length=0;f=mk({now:'2026-10-26T23:59:59.000Z'});await f.send({birth:'2005-10-27'});assert.equal(subs.length,0);subs.length=0;f=mk({now:'2026-10-27T00:00:00.000Z'});await f.send({birth:'2005-10-27'});assert.equal(subs.length,1,'a partir de la medianoche UTC ya cumple');
 /* el formulario de completar: sin foto, @, bio ni marca; solo los cuatro datos; también rechaza a un menor */
 const idm=(o)=>FORM_HARNESS(null,async v=>{subs.push(v);return {ok:true}},undefined,{now,mode:'identity',...o});
 f=idm();const h2=f.html();assert.match(h2,/Completa tu <em>perfil<\/em>/);assert.ok(h2.includes('Guardar')&&!h2.includes('Crear mi perfil'));for(const id of ['obH','obPf','obPb','obB','obM','obAge'])assert.ok(!h2.includes('id="'+id+'"'),id+' no está en el paso de completar');
 for(const id of ['obFn','obLn','obGM','obGF','obD'])assert.ok(h2.includes('id="'+id+'"'),id+' sí');
 subs.length=0;await f.send({birth:'2010-01-01'});assert.equal(subs.length,0);assert.equal(f.state().err,f.OB['age-under-21']);
 subs.length=0;f=idm();await f.send({});assert.deepEqual(subs,[{first_name:'Ana',last_name:'Mora',gender:'F',birth_date:'1990-05-17'}],'solo los cuatro datos, sin @');
 for(const e of ['first_name-required','last_name-required','last_name-long','last_name-invalid','gender-required','birth_date-required','birth_date-invalid','birth_date-future','age-under-21','identity-exists','busy'])assert.ok(f.OB[e],'hay mensaje para '+e);
 assert.ok(!f.OB['age-required'],'el mensaje de la casilla ya no existe');
});
test('LHB-52: el formulario y el servidor aplican las mismas reglas de nombre, género y fecha (una sola matriz para los dos)',async()=>{
 const {pathToFileURL}=require('url');const P=await import(pathToFileURL(path.join(__dirname,'..','functions','_lib','profile.js')).href);
 const now=new Date(T0);const today=P.utcDay(now);const f=FORM_HARNESS({url:()=>AV,upload:async()=>({url:AV})},async()=>({ok:true}),undefined,{now:T0});
 const names=['Ana','','   ','a'.repeat(50),'a'.repeat(51),'🌿'.repeat(50),'🌿'.repeat(51),'An\na','An\u0000a','An a','Ñandú','  Ana  '];
 const genders=['M','F',''];const births=['1990-05-17','2005-10-26','2005-10-27','2026-10-26','2026-10-27','2001-02-29','2000-02-29','1899-12-31','1900-01-01','0001-01-01','9999-12-31','','17/05/1990','2000-1-1','2000-13-01'];
 let n=0;
 for(const a of names)for(const b of [names[0],names[3]])for(const g of genders)for(const d of births){const o={first_name:a,last_name:b,gender:g,birth_date:d};
  const s=P.checkIdentity(o,now),c=f.idProblem(o,today);assert.equal(c||undefined,s.error,JSON.stringify(o));n++}
 for(const a of names)for(const g of genders)for(const d of births){const o={first_name:'Ana',last_name:a,gender:g,birth_date:d};assert.equal(f.idProblem(o,today)||undefined,P.checkIdentity(o,now).error,JSON.stringify(o));n++}
 assert.ok(n>1000,'la matriz tiene casos: '+n);
 /* los mismos mensajes: cada error que el servidor puede dar tiene texto en el formulario */
 for(const e of ['first_name-required','first_name-long','first_name-invalid','last_name-required','last_name-long','last_name-invalid','gender-required','gender-invalid','birth_date-required','birth_date-invalid','birth_date-future','age-under-21','identity-exists'])assert.ok(f.OB[e],e+' tiene mensaje');
});
test('LHB-52: la versión del caché sube, y el shell nuevo no guarda ni toca los datos privados',async()=>{
 const sw=read('sw.js');assert.match(sw,/const VERSION='lhb-v57'/);
 /* el formulario y cuenta.js no escriben la fecha ni el género en ningún almacenamiento del navegador */
 for(const f of ['hoja.js','cuenta.js']){const t=read(f).replace(/\r\n/g,'\n');for(const m of t.matchAll(/(localStorage|sessionStorage|indexedDB)[^\n]*/g))assert.ok(!/birth|gender|first_name|last_name/.test(m[0]),f+': '+m[0].slice(0,80))}
 const cu=read('cuenta.js');assert.ok(!cu.includes('age_ok'),'cuenta.js ya no manda age_ok');assert.ok(!read('hoja.js').includes('obAge'),'la casilla de 21 se fue');
});
test('LHB-52: un perfil guardado de antes de pedir la identidad no abre Mi Hoja sin conexión ni por el camino rápido (la llave del almacenamiento cambió)',async()=>{
 const vm=require('vm');const src=read('hoja.js').replace(/\r\n/g,'\n');const line=src.match(/const acct=\{.*\};\n/)[0];
 const mem=new Map();const ls={getItem:k=>mem.has(k)?mem.get(k):null,setItem:(k,v)=>mem.set(k,String(v)),removeItem:k=>mem.delete(k)};
 const ctx={A:{LS:{get(k,d){try{const v=ls.getItem('vb_'+k);return v==null?d:JSON.parse(v)}catch(e){return d}},set(k,v){ls.setItem('vb_'+k,JSON.stringify(v))}}},localStorage:ls};vm.createContext(ctx);vm.runInContext(line+';this.acct=acct',ctx);
 /* lo que guardó la versión anterior: otra llave, y ya no se lee */
 ls.setItem('vb_cuenta',JSON.stringify({sub:'user_a',handle:'sergio'}));assert.equal(ctx.acct.get(),null,'el perfil guardado antes de LHB-52 no cuenta');
 ctx.acct.set({sub:'user_a',handle:'sergio'});assert.deepEqual(ctx.acct.get(),{sub:'user_a',handle:'sergio'},'lo nuevo sí se guarda y se lee');assert.ok(mem.has('vb_cuenta2'));
 ctx.acct.clear();assert.equal(ctx.acct.get(),null);assert.ok(!mem.has('vb_cuenta2')&&!mem.has('vb_cuenta'),'salir borra la llave nueva y la vieja');
 /* y el gate, con ese almacén vacío: sin conexión no abre, y la acción rápida pasa por /api/me y por el paso de identidad */
 const off=CUENTA_HARNESS({api:async()=>({status:0,body:{}})});off.C.user={id:'user_a'};await off.A.require(off.go);await tick();assert.ok(!off.log.includes('GO'),'sin perfil guardado y sin red no abre');
 const calls=[];const fast=CUENTA_HARNESS({api:async(C,m,p)=>{calls.push(m+' '+p);return {status:200,body:{profile:{handle:'sergio'},needsIdentity:true}}}});fast.D.ui.identity=()=>fast.log.push('identity');fast.nav('#/c/yambo-toro');fast.C.user={id:'user_a'};
 fast.A.quick(()=>fast.log.push('ACTION'),{inPlace:true,act:'humidor'});await tick();assert.deepEqual(calls,['GET /api/me'],'sin perfil guardado la acción rápida revisa en el servidor');assert.ok(fast.log.includes('identity')&&!fast.log.includes('ACTION'),'y pide la identidad antes de hacer la acción');
 assert.ok(src.includes("A.LS.get('cuenta2',null)")&&src.includes("A.LS.set('cuenta2',v)"),'la llave nueva');
});
test('LHB-52: si el perfil ya existía al crearlo (409) y sigue sin identidad, se pide completar antes de guardar o abrir',async()=>{
 let gets=0;const h=CUENTA_HARNESS({api:async(C,m)=>m==='POST'?{status:409,body:{error:'profile-exists'}}:++gets===1?{status:200,body:{needsProfile:true}}:{status:200,body:{profile:{handle:'sergio'},needsIdentity:true}}});
 let onb,idn;h.D.ui.onboarding=s=>{onb=s};h.D.ui.identity=s=>{idn=s;h.log.push('identity')};h.nav('#/c/yambo-toro');h.C.user={id:'user_a'};
 await h.A.require(h.go,{inPlace:true,act:'humidor'});await tick();assert.equal(typeof onb,'function');
 assert.deepEqual(await onb({handle:'sergio',first_name:'Ana',last_name:'Mora',gender:'F',birth_date:'1990-01-01'}),{stale:true},'el formulario de perfil nuevo queda reemplazado');
 assert.equal(typeof idn,'function','aparece el paso de completar');assert.ok(!h.log.includes('GO')&&!h.log.some(x=>x.startsWith('store')),'no abre ni guarda el perfil sin identidad');
 /* completarlo termina igual que siempre: guarda, felicita, repinta y hace la acción */
 h.D.api=async(C,m)=>({status:200,body:{ok:true}});assert.deepEqual(await idn({first_name:'Ana',last_name:'Mora',gender:'F',birth_date:'1990-01-01'}),{ok:true});
 assert.deepEqual(h.log.filter(x=>x==='GO'||x==='reroute'||x.startsWith('store')),['store:user_a:sergio','reroute','GO']);
});
test('LHB-52: el error del formulario se ve: caja roja con borde y letra grande, la pantalla baja hasta ella y se quita al corregir',async()=>{
 const f=FORM_HARNESS({url:()=>AV,upload:async()=>({url:AV})},async()=>({ok:true}),undefined,{now:T0});
 await f.send({birth:'2019-09-09'});const e=f.$('#obErr');
 assert.equal(e.hidden,false);assert.equal(e.textContent,f.OB['age-under-21']);
 assert.match(e.style.cssText,/border:2px solid var\(--flam\)/);assert.match(e.style.cssText,/font-size:16px/);assert.match(e.style.cssText,/background:rgba\(208,25,46/);
 assert.equal(e.scrolls,1,'la pantalla baja hasta el error');
 await f.send({});assert.equal(e.hidden,true,'al corregir, el error desaparece');assert.equal(e.style.cssText,'');assert.equal(e.scrolls,1,'y no vuelve a moverse la pantalla');
});


/* ===================== LHB-55: editar el perfil (una pantalla para cambiar todo, también la foto) ===================== */
const AV55='https://img.clerk.com/eyJ0eXBlIjoidXBsb2FkMiJ9';
const PERFIL55=o=>({handle:'tabaquero',...IDN,avatar_url:AV,bio:'Fumo los domingos.',favorite_brand:'Cohiba',...o});
test('LHB-55: PUT /api/profile edita el perfil entero del dueño en SQLite real: cada campo se guarda, el nombre público se arma otra vez, lo privado no vuelve y el @ viejo queda libre',async()=>{
 const a=await API52();
 try{
  const tkA=await a.tok('user_a'),tkB=await a.tok('user_b');
  a.freeze(T0);assert.equal((await a.post(tkA,{handle:'tabaquero',...IDN,avatar_url:AV}))[0],201);
  const antes=ROW(a.db,'user_a');a.thaw();a.freeze('2026-10-27T12:00:00.000Z');
  const r=await a.put(tkA,PERFIL55({handle:'Nuevo_Nombre',first_name:' Beatriz ',last_name:'ñoño',gender:'M',birth_date:'1980-02-03',bio:'Otra bio',favorite_brand:'Padrón',avatar_url:AV55}));
  assert.deepEqual(r,[200,{profile:{handle:'nuevo_nombre',display_name:'Beatriz Ñ.',bio:'Otra bio',favorite_brand:'Padrón',avatar_key:AV55}}],'la respuesta no trae género ni fecha de nacimiento');
  const row=ROW(a.db,'user_a');
  assert.deepEqual([row.handle,row.first_name,row.last_name,row.gender,row.birth_date,row.bio,row.favorite_brand,row.avatar_key,row.display_name],['nuevo_nombre','Beatriz','ñoño','M','1980-02-03','Otra bio','Padrón',AV55,'Beatriz Ñ.'],'cada campo se guardó (el @ en minúscula)');
  assert.equal(row.created_at,antes.created_at,'created_at no cambia');assert.equal(row.age_ok_at,antes.age_ok_at,'el sello del 21+ no se toca');assert.equal(row.updated_at,'2026-10-27T12:00:00.000Z');assert.equal(COUNT(a.db),1,'no se creó otra fila');
  const [st,m]=await a.me(tkA);assert.equal(st,200);assert.deepEqual(m,{profile:{handle:'nuevo_nombre',display_name:'Beatriz Ñ.',bio:'Otra bio',favorite_brand:'Padrón',avatar_key:AV55,first_name:'Beatriz',last_name:'ñoño',gender:'M',birth_date:'1980-02-03'},needsIdentity:false},'el dueño lo ve todo en /api/me');
  const pub=await a.P.publicProfile(a.DB,'nuevo_nombre');assert.deepEqual(Object.keys(pub).sort(),['avatar_key','bio','display_name','favorite_brand','handle']);for(const s of ['ñoño','1980-02-03','"M"'])assert.ok(!JSON.stringify(pub).includes(s),'lo público no trae '+s);
  /* el @ viejo queda libre; guardar con el mismo @ no choca consigo mismo; vaciar la bio y la marca las deja en null */
  assert.equal((await a.post(tkB,{handle:'tabaquero',...IDN,avatar_url:AV}))[0],201,'otra persona toma el @ que quedó libre');
  assert.equal((await a.put(tkA,PERFIL55({handle:'nuevo_nombre',bio:'',favorite_brand:'  ',avatar_url:AV55})))[0],200,'el mismo @ no es un choque');
  assert.deepEqual([ROW(a.db,'user_a').bio,ROW(a.db,'user_a').favorite_brand],[null,null]);
  /* el perfil ajeno no se toca: B edita lo suyo y A queda igual */
  const deA=ROW(a.db,'user_a');assert.equal((await a.put(tkB,PERFIL55({handle:'bea',first_name:'Bea',last_name:'Soto',avatar_url:AV})))[0],200);
  assert.deepEqual(ROW(a.db,'user_a'),deA,'editar el perfil propio no toca el de otra persona');assert.equal(ROW(a.db,'user_b').handle,'bea');
 }finally{a.done()}
});
test('LHB-55: PUT /api/profile rechaza sin cambiar nada: @ mal o reservado o ajeno, menos de 21, fecha futura, datos que faltan, foto que no es de Clerk, textos largos; sin sesión, sin perfil, sin JSON',async()=>{
 const a=await API52();
 try{
  const tkA=await a.tok('user_a'),tkB=await a.tok('user_b'),tkC=await a.tok('user_c');
  a.freeze(T0);assert.equal((await a.post(tkA,{handle:'tabaquero',...IDN,avatar_url:AV}))[0],201);assert.equal((await a.post(tkB,{handle:'bea',...IDN,avatar_url:AV}))[0],201);
  const intacta=ROW(a.db,'user_a'),deB=ROW(a.db,'user_b');
  const rechazos=[
   ['@ muy corto',{handle:'ab'},400,'handle-invalid'],['@ con caracteres raros',{handle:'ana mora'},400,'handle-invalid'],['@ reservado',{handle:'admin'},400,'handle-reserved'],['@ de otra persona',{handle:'bea'},409,'handle-taken'],['@ de otra persona en mayúsculas',{handle:'BEA'},409,'handle-taken'],
   ['20 años y 364 días',{birth_date:'2005-10-27'},400,'age-under-21'],['fecha futura',{birth_date:'2026-10-27'},400,'birth_date-future'],['fecha que no existe',{birth_date:'2001-02-29'},400,'birth_date-invalid'],
   ['sin nombre',{first_name:'  '},400,'first_name-required'],['sin apellido',{last_name:''},400,'last_name-required'],['género X',{gender:'X'},400,'gender-invalid'],['sin género',{gender:null},400,'gender-required'],
   ['foto vacía',{avatar_url:''},400,'avatar-required'],['foto de otro sitio',{avatar_url:'https://evil.example/x.png'},400,'avatar-invalid'],['bio de 161 caracteres',{bio:'x'.repeat(161)},400,'bio-long'],['marca de 61 caracteres',{favorite_brand:'x'.repeat(61)},400,'favorite_brand-long']];
  for(const [que,o,st,err] of rechazos){assert.deepEqual(await a.put(tkA,PERFIL55(o)),[st,{error:err}],que);assert.deepEqual(ROW(a.db,'user_a'),intacta,que+': la fila no cambió');assert.deepEqual(ROW(a.db,'user_b'),deB,que+': la de otra persona tampoco')}
  /* sin la foto en el cuerpo no es una edición: es la ruta de completar la identidad, que a un perfil completo le da 409 y no cambia nada */
  const sinFoto=PERFIL55({handle:'otro'});delete sinFoto.avatar_url;assert.deepEqual(await a.put(tkA,sinFoto),[409,{error:'identity-exists'}]);assert.deepEqual(ROW(a.db,'user_a'),intacta);
  /* quien no es el dueño o no tiene cuenta */
  assert.deepEqual(await a.put(null,PERFIL55()),[401,{error:'no-session'}],'sin sesión');
  assert.deepEqual(await a.put(tkA,PERFIL55(),'text/plain'),[415,{error:'bad-type'}],'solo JSON');
  assert.deepEqual(await a.put(tkC,PERFIL55({handle:'nuevo'})),[403,{error:'no-profile'}],'sin perfil no se crea uno por aquí');assert.equal(COUNT(a.db),2,'ninguna fila nueva');
  assert.deepEqual(await a.put(tkA,'{no es json'),[400,{error:'bad-body'}]);assert.deepEqual(ROW(a.db,'user_a'),intacta);
 }finally{a.done()}
});
/* editar por la puerta de la cuenta, con una Clerk de mentira y /api/me y /api/profile de mentira */
const PROF55={handle:'ana',display_name:'Ana M.',bio:'hola',favorite_brand:'Cohiba',avatar_key:AV,...IDN};
async function EDT(user,over){over=over||{};const puts=[],calls=[];let prof,submit,picture,editors=0,identities=0;
 const h=CUENTA_HARNESS({api:async(C,m,p,b)=>{calls.push(m+' '+p);if(m==='GET')return over.me||{status:200,body:{profile:PROF55,needsIdentity:false}};puts.push(b);return over.put?over.put(b):{status:200,body:{profile:{handle:b.handle}}}}});
 h.D.ui.edit=(p,s,pc)=>{prof=p;submit=s;picture=pc;editors++};h.D.ui.identity=()=>{identities++};
 h.C.user=user;const run=()=>h.A.require(h.go,{edit:true});await run();await tick();
 return {h,puts,calls,run,get prof(){return prof},get picture(){return picture},raw:()=>submit,editors:()=>editors,identities:()=>identities,submit:f=>submit(f||{handle:'ana',...IDN,bio:'hola',favorite_brand:'Cohiba'})}}
const GOS=h=>h.log.filter(x=>x==='GO').length;
test('LHB-55: editar pasa por la puerta de la cuenta, abre el formulario con lo guardado y solo al guardar corre la acción, una vez',async()=>{
 const o=await EDT({id:'user_a',hasImage:true,imageUrl:AV});
 assert.equal(o.editors(),1,'se abre el formulario de editar');assert.deepEqual(o.prof,PROF55,'con lo que el servidor tiene guardado');assert.equal(o.picture.url(),AV,'y su foto puesta');assert.equal(GOS(o.h),0,'ver el formulario no es haber guardado');assert.deepEqual(o.puts,[]);
 assert.deepEqual(await o.submit({handle:'ana2',first_name:'Bea',last_name:'Soto',gender:'M',birth_date:'1980-02-03',bio:'',favorite_brand:''}),{ok:true});
 assert.equal(o.puts.length,1);assert.deepEqual(o.puts[0],{handle:'ana2',first_name:'Bea',last_name:'Soto',gender:'M',birth_date:'1980-02-03',bio:'',favorite_brand:'',avatar_url:AV},'se manda el perfil entero con la foto puesta');
 assert.deepEqual(o.calls,['GET /api/me','PUT /api/profile']);assert.ok(o.h.log.includes('store:user_a:ana2'),'el perfil guardado en el teléfono lleva el @ nuevo');assert.ok(o.h.log.includes('toast'));assert.equal(GOS(o.h),1,'la acción corre una vez');
});
test('LHB-55: un guardado que falla deja el formulario vivo con lo escrito, y se puede reintentar; el que ya guardó no corre dos veces',async()=>{
 let n=0;const o=await EDT({id:'user_a',hasImage:true,imageUrl:AV},{put:()=>++n===1?{status:409,body:{error:'handle-taken'}}:n===2?{status:0,body:{}}:{status:200,body:{profile:{handle:'ana'}}}});
 assert.deepEqual(await o.submit(),{error:'handle-taken'},'el error llega al formulario');assert.equal(GOS(o.h),0);assert.ok(!o.h.log.includes('toast'));assert.deepEqual(o.h.log.filter(x=>x.startsWith('store')),['store:user_a:ana'],'solo el perfil que ya estaba al abrir: el rechazo no guarda nada nuevo en el teléfono');
 assert.deepEqual(await o.submit(),{error:'generic'},'sin red: error, el formulario sigue');assert.equal(GOS(o.h),0);
 assert.deepEqual(await o.submit(),{ok:true},'el mismo formulario reintenta');assert.equal(GOS(o.h),1);
});
test('LHB-55: la foto de editar usa la misma subida que el perfil nuevo; si falla se queda la de antes, y subir y guardar nunca corren a la vez',async()=>{
 /* una subida que falla deja la foto de antes y es esa la que se manda */
 let u={id:'user_a',hasImage:true,imageUrl:AV,async setProfileImage(){throw new Error('413')}};let o=await EDT(u);
 assert.deepEqual(await o.picture.upload(IMG('a.jpg')),{error:'avatar-upload'});assert.equal(o.picture.url(),AV,'sigue la foto de antes');await o.submit();assert.equal(o.puts[0].avatar_url,AV);
 /* una subida buena: Clerk la guarda, se lee la URL nueva y esa es la que se manda */
 u={id:'user_a',hasImage:true,imageUrl:AV,sets:[],async setProfileImage(f){u.sets.push(f)},async reload(){u.imageUrl=AV55}};o=await EDT(u);
 assert.deepEqual(await o.picture.upload(IMG('a.jpg')),{url:AV55});assert.equal(u.sets.length,1);assert.equal(o.picture.url(),AV55);await o.submit();assert.equal(o.puts[0].avatar_url,AV55,'se manda la foto nueva');
 /* no es imagen: ni se sube */
 u={id:'user_a',hasImage:true,imageUrl:AV,sets:[],async setProfileImage(f){u.sets.push(f)},async reload(){}};o=await EDT(u);assert.deepEqual(await o.picture.upload({type:'text/plain'}),{error:'avatar-type'});assert.equal(u.sets.length,0);
 /* una URL que no es de Clerk tras la subida no se acepta, y la de antes se queda */
 u={id:'user_a',hasImage:true,imageUrl:AV,async setProfileImage(){u.imageUrl='https://evil.example/x.png'},async reload(){}};o=await EDT(u);assert.deepEqual(await o.picture.upload(IMG('a.jpg')),{error:'avatar-upload'});assert.equal(o.picture.url(),AV);
 /* sin foto guardada en el perfil: la de la cuenta; sin ninguna, no se guarda */
 o=await EDT({id:'user_a',hasImage:true,imageUrl:AV55},{me:{status:200,body:{profile:{...PROF55,avatar_key:null},needsIdentity:false}}});assert.equal(o.picture.url(),AV55,'toma la foto de la cuenta');
 o=await EDT({id:'user_a',hasImage:false,imageUrl:DEFAULT_IMG},{me:{status:200,body:{profile:{...PROF55,avatar_key:null},needsIdentity:false}}});assert.deepEqual(await o.submit(),{error:'avatar-required'});assert.deepEqual(o.puts,[],'sin foto no se manda nada');
 /* la foto del perfil guardado es la que vale aunque la cuenta de Clerk solo tenga la silueta; una guardada que no es de Clerk no se usa */
 o=await EDT({id:'user_a',hasImage:false,imageUrl:DEFAULT_IMG});assert.equal(o.picture.url(),AV,'la foto guardada en el perfil');await o.submit();assert.equal(o.puts[0].avatar_url,AV,'y esa se manda');
 o=await EDT({id:'user_a',hasImage:true,imageUrl:AV55},{me:{status:200,body:{profile:{...PROF55,avatar_key:'https://evil.example/x.png'},needsIdentity:false}}});assert.equal(o.picture.url(),AV55,'una foto guardada que no es de Clerk no se usa: queda la de la cuenta');
 /* subir y guardar no corren a la vez */
 const g=defer();u={id:'user_a',hasImage:true,imageUrl:AV,async setProfileImage(){await g.p},async reload(){u.imageUrl=AV55}};o=await EDT(u);
 const up=o.picture.upload(IMG('a.jpg'));await tick();assert.deepEqual(await o.submit(),{error:'avatar-busy'},'con una subida en curso no se guarda');assert.deepEqual(o.puts,[]);g.ok();assert.deepEqual(await up,{url:AV55});
 const g2=defer();o=await EDT({id:'user_a',hasImage:true,imageUrl:AV,async setProfileImage(){throw new Error('x')},async reload(){}},{put:()=>g2.p});
 const env=o.submit();await tick();assert.deepEqual(await o.picture.upload(IMG('a.jpg')),{error:'avatar-busy'},'con un guardado en curso no se sube');g2.ok({status:200,body:{profile:{handle:'ana'}}});assert.deepEqual(await env,{ok:true});
});
test('LHB-55: un formulario de editar viejo no manda nada: otra cuenta, otro formulario encima, sin conexión y sin perfil completo',async()=>{
 /* cambió la cuenta */
 let o=await EDT({id:'user_a',hasImage:true,imageUrl:AV});o.h.C.signIn(null);assert.deepEqual(await o.submit(),{stale:true});assert.deepEqual(o.puts,[],'a nombre de nadie se manda');assert.equal(GOS(o.h),0);
 o=await EDT({id:'user_a',hasImage:true,imageUrl:AV});o.h.C.signIn('user_b');assert.deepEqual(await o.submit(),{stale:true},'otra persona entró');assert.deepEqual(o.puts,[]);
 /* otro formulario encima: el viejo ya no vale y el nuevo sí */
 o=await EDT({id:'user_a',hasImage:true,imageUrl:AV});const viejo=o.raw();await o.run();await tick();assert.equal(o.editors(),2);
 assert.deepEqual(await viejo({handle:'ana',...IDN}),{stale:true},'el formulario reemplazado no guarda');assert.deepEqual(o.puts,[]);assert.deepEqual(await o.submit(),{ok:true});assert.equal(o.puts.length,1);
 /* se fue de la página */
 o=await EDT({id:'user_a',hasImage:true,imageUrl:AV});o.h.nav('#/catalogo');assert.deepEqual(await o.submit(),{stale:true},'otra página');assert.deepEqual(o.puts,[]);
 /* sin conexión no se edita con lo guardado en el teléfono: se avisa */
 const h2=CUENTA_HARNESS({api:async()=>({status:0,body:{}})});h2.C.user={id:'user_a'};h2.cache({sub:'user_a',handle:'ana'});let abrio=0;h2.D.ui.edit=()=>abrio++;
 await h2.A.require(h2.go,{edit:true});await tick();assert.equal(abrio,0);assert.ok(!h2.log.includes('GO'),'editar sin conexión no abre nada');assert.ok(h2.log.includes('card:No pudimos revisar tu cuenta'),'y se avisa');
 const h3=CUENTA_HARNESS({clerk:async()=>{throw new Error('sin red')}});h3.cache({sub:'user_a',handle:'ana'});await h3.A.require(h3.go,{edit:true});await tick();assert.ok(!h3.log.includes('GO')&&h3.log.includes('card:Necesitas conexión'),'sin Clerk tampoco se edita con el perfil del teléfono');
 /* un perfil de antes sin identidad la completa primero, y no abre el editor */
 o=await EDT({id:'user_a',hasImage:true,imageUrl:AV},{me:{status:200,body:{profile:{...PROF55,first_name:null},needsIdentity:true}}});assert.equal(o.identities(),1,'primero completa la identidad');assert.equal(o.editors(),0);
 /* sin cuenta (401): nada */
 o=await EDT({id:'user_a',hasImage:true,imageUrl:AV},{me:{status:401,body:{error:'no-session'}}});assert.equal(o.editors(),0);assert.equal(GOS(o.h),0);
});
test('LHB-55: el formulario real de editar sobre un DOM de mentira: viene lleno, guarda todo, una fecha de menos de 21 no manda nada y un error deja lo escrito',async()=>{
 const subs=[];let res={ok:true};
 const f=FORM_HARNESS({url:()=>AV,upload:async()=>({url:AV55})},async v=>{subs.push(v);return res},null,{mode:'edit',init:PROF55});
 assert.match(f.html(),/Editar <em>perfil<\/em>/);assert.match(f.html(),/id="obGo">Guardar<\/button>/);assert.match(f.html(),/<a class="lbtn" href="#\/mihoja\/perfil" id="obCancel">Cancelar<\/a>/,'hay cómo salir sin guardar');assert.ok(!/Crear mi perfil/.test(f.html()));
 assert.deepEqual([f.$('#obH').value,f.$('#obFn').value,f.$('#obLn').value,f.$('#obGM').checked,f.$('#obGF').checked,f.$('#obD').value,f.$('#obB').value,f.$('#obM').value],['ana','Ana','Mora',false,true,'1990-05-17','hola','Cohiba'],'viene con lo guardado');
 assert.equal(f.$('#obPb').textContent,'Cambiar foto');assert.match(f.state().hint,/Esta es tu foto de perfil/);assert.equal(f.state().img,AV,'se ve la foto de ahora');
 /* guarda todo lo cambiado */
 f.$('#obB').value='Otra bio';f.$('#obM').value='Padrón';await f.send({handle:'nuevo',first:'Bea',last:'Soto',gender:'M',birth:'1980-02-03'});
 assert.deepEqual(subs,[{handle:'nuevo',first_name:'Bea',last_name:'Soto',gender:'M',birth_date:'1980-02-03',bio:'Otra bio',favorite_brand:'Padrón'}]);assert.deepEqual([f.state().go,f.state().pb],[false,false],'termina y suelta los botones');
 /* menos de 21: no se manda nada */
 subs.length=0;await f.send({birth:'2010-01-01'});assert.equal(subs.length,0);assert.equal(f.state().err,f.OB['age-under-21']);
 await f.send({handle:'ab'});assert.equal(subs.length,0);assert.equal(f.state().err,f.OB['handle-invalid']);
 /* un error del servidor deja el formulario con lo escrito */
 res={error:'handle-taken'};await f.send({handle:'ocupado',first:'Cami'});assert.equal(subs.length,1);assert.equal(f.state().err,f.OB['handle-taken']);assert.deepEqual([f.$('#obH').value,f.$('#obFn').value],['ocupado','Cami'],'lo escrito sigue ahí');assert.deepEqual([f.state().go,f.state().pb],[false,false],'y se puede reintentar');
 res={error:'inventado'};await f.send({});assert.equal(f.state().err,'No pudimos guardar tu perfil. Intenta otra vez.','un error desconocido dice guardar, no crear');
 /* una foto que no se pudo subir deja la de antes */
 const g=FORM_HARNESS({url:()=>AV,upload:async()=>({error:'avatar-upload'})},async()=>({ok:true}),null,{mode:'edit',init:PROF55});await g.pick({name:'a.png',type:'image/png'});
 assert.equal(g.state().err,g.OB['avatar-upload']);assert.equal(g.state().img,AV,'la foto de antes sigue puesta');assert.deepEqual([g.state().go,g.state().pb],[false,false]);
 /* el formulario nuevo y el de completar siguen como estaban */
 const nuevo=FORM_HARNESS({url:()=>null,upload:async()=>({url:AV})},async()=>({ok:true}));assert.match(nuevo.html(),/Crear mi perfil/);assert.ok(!/obCancel/.test(nuevo.html()));
});
test('LHB-55: lo que se comparte y por dónde se llega: un solo selector de foto, la ruta #/mihoja/editar, el enlace en el encabezado y el caché nuevo',()=>{
 const cu=read('cuenta.js').replace(/\r\n/g,'\n'),h=read('hoja.js').replace(/\r\n/g,'\n'),pf=fs.readFileSync(path.join(__dirname,'..','functions','api','profile.js'),'utf8');
 assert.equal((cu.match(/U\.setProfileImage\(/g)||[]).length,1,'una sola subida a Clerk: el selector se comparte, no se copia');
 assert.ok(cu.includes('function picker(U,live,pic0,sending){')&&/function onboard\([^)]*\)\{[\s\S]*?picker\(U,live,picOf\(U\)/.test(cu)&&/function edit\([^)]*\)\{[\s\S]*?picker\(U,live,/.test(cu),'el perfil nuevo y el de editar usan picker()');
 assert.ok(cu.includes("D.api(C,'PUT','/api/profile',{...f,avatar_url:pic},uid)"),'editar manda el perfil entero con la foto');
 assert.ok(cu.includes('if(r.status===200&&r.body.profile&&o.edit){')&&cu.includes('if(D.store.get()&&!o.edit)')&&cu.includes('c&&c.sub===uid&&!o.edit&&'),'editar nunca se abre con lo guardado en el teléfono');
 assert.ok(h.includes('<a class="lbtn" href="#/mihoja/editar" id="mhEdit">Editar perfil</a>'),'el encabezado de Mi Hoja (y de Perfil) lleva el enlace a editar');
 assert.ok(h.includes("if(sub==='editar'){location.hash='#/mihoja/perfil';return}"),'al guardar vuelve a Perfil');
 assert.ok(h.includes('edit:(prof,submit,picture)=>onboardingForm(submit,picture,\'edit\',prof)'));
 assert.ok(pf.includes("Object.prototype.hasOwnProperty.call(it.body, 'avatar_url')) return editProfile(it, env)"),'PUT con la foto es editar; sin ella es completar la identidad');
 assert.match(read('sw.js'),/const VERSION='lhb-v57'/,'el shell nuevo se publica con otra versión del caché');
});
test('LHB-55 (Codex ronda 1): una subida que sigue en curso de un formulario ya cerrado bloquea el guardado del formulario nuevo; terminada, se guarda',async()=>{
 const g=defer();const u={id:'user_a',hasImage:true,imageUrl:AV,async setProfileImage(){await g.p},async reload(){u.imageUrl=AV55}};
 const o=await EDT(u);const up=o.picture.upload(IMG('a.jpg'));await tick();
 /* Cancelar y volver a abrir Editar perfil: otro formulario, con su propio selector de foto, mientras la subida vieja sigue */
 await o.run();await tick();assert.equal(o.editors(),2);
 assert.deepEqual(await o.submit(),{error:'avatar-busy'},'la cuenta de Clerk es una sola: con la subida vieja en curso el formulario nuevo no guarda');assert.deepEqual(o.puts,[],'ni un PUT');
 g.ok();assert.deepEqual(await up,{stale:true},'la subida del formulario cerrado ya no cambia ninguna foto');await tick();
 assert.deepEqual(await o.submit(),{ok:true},'terminada la subida, el formulario nuevo guarda');assert.equal(o.puts.length,1);
 /* lo mismo con el formulario del perfil nuevo reemplazado por otro */
 const g2=defer();const u2={id:'user_b',hasImage:false,imageUrl:DEFAULT_IMG,async setProfileImage(){await g2.p},async reload(){u2.hasImage=true;u2.imageUrl=AV55}};
 const posts=[];let pics=[],subs=[];const h=CUENTA_HARNESS({api:async(C,m,p,b)=>{if(m==='GET')return {status:200,body:{needsProfile:true}};posts.push(b);return {status:201,body:{profile:{handle:b.handle}}}}});
 h.D.ui.onboarding=(s,p)=>{subs.push(s);pics.push(p)};h.C.user=u2;await h.A.require(h.go);await tick();
 const up2=pics[0].upload(IMG('a.jpg'));await tick();await h.A.require(h.go);await tick();assert.equal(subs.length,2);
 assert.deepEqual(await subs[1]({handle:'ana',...IDN,bio:'',favorite_brand:''}),{error:'avatar-busy'},'el formulario de perfil nuevo tampoco crea con una subida vieja en curso');assert.deepEqual(posts,[]);
 g2.ok();await up2;await tick();
});
test('LHB-55 (Codex ronda 2): un guardado que sigue en curso de un formulario ya cerrado bloquea la subida del formulario nuevo; terminado, se sube',async()=>{
 const g=defer();let setCalls=0;const u={id:'user_a',hasImage:true,imageUrl:AV,async setProfileImage(){setCalls++},async reload(){u.imageUrl=AV55}};
 const o=await EDT(u,{put:()=>g.p.then(()=>({status:200,body:{profile:{handle:'ana'}}}))});
 const sv=o.submit();await tick();assert.equal(o.puts.length,1,'el guardado viejo salio y sigue en curso');
 /* Cancelar y volver a abrir Editar perfil: otro formulario, con su propio selector de foto, mientras el PUT viejo sigue */
 await o.run();await tick();assert.equal(o.editors(),2);
 assert.deepEqual(await o.picture.upload(IMG('a.jpg')),{error:'avatar-busy'},'la cuenta es una sola: con un guardado viejo en curso el formulario nuevo no sube');assert.equal(setCalls,0,'Clerk no se toca');
 g.ok();await sv;await tick();
 const r=await o.picture.upload(IMG('a.jpg'));assert.equal(r.url,AV55,'terminado el guardado, el formulario nuevo sube');assert.equal(setCalls,1);
 /* lo mismo con el formulario de perfil nuevo */
 const g2=defer();let sc2=0;const u2={id:'user_b',hasImage:true,imageUrl:AV,async setProfileImage(){sc2++},async reload(){u2.hasImage=true;u2.imageUrl=AV55}};
 let pics=[],subs=[];const h=CUENTA_HARNESS({api:async(C,m,p,b)=>{if(m==='GET')return {status:200,body:{needsProfile:true}};await g2.p;return {status:201,body:{profile:{handle:b.handle}}}}});
 h.D.ui.onboarding=(s,p)=>{subs.push(s);pics.push(p)};h.C.user=u2;await h.A.require(h.go);await tick();
 const sv2=subs[0]({handle:'ana',...IDN,bio:'',favorite_brand:''});await tick();await h.A.require(h.go);await tick();assert.equal(subs.length,2);
 assert.deepEqual(await pics[1].upload(IMG('a.jpg')),{error:'avatar-busy'},'el formulario de perfil nuevo tampoco sube con un guardado viejo en curso');assert.equal(sc2,0);
 g2.ok();await sv2;await tick();
});

/* ===================== LHB-57: buscar personas por @ o por nombre ===================== */
async function API57(){
 const a=await API52();
 const P=await a.imp('api/people.js'),PL=await a.imp('_lib/people.js');
 const rq=(token,url)=>({url,headers:{get:h=>({Authorization:token?'Bearer '+token:null})[h]??null}});
 const mk=(u,handle,first,last,extra)=>{extra=extra||{};a.db.prepare("INSERT INTO profiles (user_id,handle,display_name,avatar_key,first_name,last_name,gender,birth_date,hidden,age_ok_at,created_at,updated_at) VALUES (?1,?2,?3,?4,?5,?6,'F','1990-05-17',?7,'2026-10-26T00:00:00.000Z','2026-10-26T00:00:00.000Z','2026-10-26T00:00:00.000Z')").run(u,handle,first&&last?first+' '+[...last][0].toUpperCase()+'.':null,AV,first||null,last||null,extra.hidden?1:0)};
 const get=async(u,url)=>{const r=await P.onRequestGet({request:rq(u?await a.tok(u):null,url),env:a.env});return [r.status,await r.json()]};
 const find=(u,q,cursor)=>get(u,'https://x.test/api/people?q='+encodeURIComponent(q)+(cursor?'&cursor='+encodeURIComponent(cursor):''));
 return {...a,PL,mk,find,get}}
const handles57=r=>r[1].people.map(p=>p.handle);
test('LHB-57: buscar por prefijo en el @, el nombre, el apellido o nombre y apellido, sin importar mayúsculas; un perfil oculto y quien busca nunca salen',async()=>{
 const a=await API57();
 try{
  a.mk('u_yo','yo_mismo','Yolanda','Mora');a.mk('u_ana','ana_mora','Ana','Mora');a.mk('u_anita','anita','Anita','Soto');a.mk('u_beto','beto_a','Beto','Anaya');
  a.mk('u_oculta','ana_oculta','Anabel','Oculta',{hidden:true});a.mk('u_viejo','viejo_pr',null,null);a.mk('u_luz','luz_n','Luz','Ana María');a.mk('u_zeta','zeta','Zoe','Zapata');
  /* "ana": el @ de ana_mora, el apellido Anaya de beto_a y el apellido Ana María de luz_n; Anita no (ani no es ana); Anabel está oculta */
  assert.deepEqual(handles57(await a.find('u_yo','ana')),['ana_mora','beto_a','luz_n'],'por @, por apellido y por nombre; de la A a la Z por @');
  assert.deepEqual(handles57(await a.find('u_yo','ANA')),['ana_mora','beto_a','luz_n'],'mayúsculas');assert.deepEqual(handles57(await a.find('u_yo','@ana')),['ana_mora','beto_a','luz_n'],'un @ de entrada no cuenta');
  assert.deepEqual(handles57(await a.find('u_yo','ani')),['anita'],'por nombre: Anita');assert.deepEqual(handles57(await a.find('u_yo','soto')),['anita'],'por apellido');
  assert.deepEqual(handles57(await a.find('u_yo','ana mo')),['ana_mora'],'nombre y apellido juntos');assert.deepEqual(handles57(await a.find('u_yo','  ana    mo  ')),['ana_mora'],'los espacios se acomodan');
  assert.deepEqual(handles57(await a.find('u_yo','na')),[],'prefijo, no una parte de en medio: "na" no es de nadie');assert.deepEqual(handles57(await a.find('u_yo','zapata')),['zeta']);
  assert.deepEqual(handles57(await a.find('u_yo','viejo')),['viejo_pr'],'un perfil de antes, sin nombre, se encuentra por su @');
  /* quien busca no se encuentra a sí misma */
  assert.deepEqual(handles57(await a.find('u_yo','yo')),[],'yo_mismo soy yo');assert.deepEqual(handles57(await a.find('u_yo','mora')),['ana_mora'],'Yolanda Mora soy yo: solo sale Ana');assert.deepEqual(handles57(await a.find('u_ana','mora')),['yo_mismo']);
  /* un perfil oculto no sale ni por @ ni por nombre ni por apellido, y al dejar de estar oculto sí */
  for(const q of ['ana_o','anab','oculta','anabel oc'])assert.deepEqual(handles57(await a.find('u_yo',q)),[],'oculta: '+q);
  a.db.prepare("UPDATE profiles SET hidden=0 WHERE user_id='u_oculta'").run();assert.deepEqual(handles57(await a.find('u_yo','anab')),['ana_oculta'],'sin ocultar, la búsqueda sí la encuentra: el filtro es lo que la esconde');
  a.db.prepare("UPDATE profiles SET hidden=1 WHERE user_id='u_oculta'").run();
  /* lo que sale: solo lo público */
  const r=await a.find('u_yo','ana');for(const p of r[1].people)assert.deepEqual(Object.keys(p).sort(),['avatar_key','display_name','handle']);assert.deepEqual(r[1].people[1],{handle:'beto_a',display_name:'Beto A.',avatar_key:AV},'el apellido sale solo como inicial');
  const todo=JSON.stringify([r,await a.find('u_yo','mora'),await a.find('u_yo','viejo'),await a.find('u_yo','soto')]);for(const s of ['Anaya','Mora','Soto','Zapata','1990-05-17','"F"','user_','last_name','first_name','birth_date','gender'])assert.ok(!todo.includes(s),'ninguna respuesta trae '+s);
  assert.deepEqual((await a.find('u_yo','viejo'))[1].people,[{handle:'viejo_pr',display_name:null,avatar_key:AV}],'sin nombre público queda null: la pantalla muestra el @');
 }finally{a.done()}
});
test('LHB-57: una consulta corta, vacía, larga o rara se rechaza; % y _ valen como letras; sin cuenta o sin perfil no se busca',async()=>{
 const a=await API57();
 try{
  a.mk('u_yo','yo_mismo','Yolanda','Mora');a.mk('u_ana','ana_mora','Ana','Mora');a.mk('u_beto','beto_a','Beto','Anaya');a.mk('u_luz','luz_n','Luz','Ana María');a.mk('u_p','p_q_r','Pia','Quiroz');
  for(const q of ['','a',' a ','@','@a','  ','\t'])assert.deepEqual(await a.find('u_yo',q),[400,{error:'q-short'}],'corta: '+JSON.stringify(q));
  assert.deepEqual(await a.get('u_yo','https://x.test/api/people'),[400,{error:'q-short'}],'sin q no hay lista de todos');
  assert.equal((await a.find('u_yo','ab'))[0],200,'dos caracteres alcanzan');assert.equal((await a.find('u_yo','x'.repeat(40)))[0],200,'cuarenta caben');assert.deepEqual(await a.find('u_yo','x'.repeat(41)),[400,{error:'q-long'}]);
  assert.equal((await a.find('u_yo','🌿'.repeat(40)))[0],200,'se cuentan caracteres, no bytes');assert.deepEqual(await a.find('u_yo','🌿'.repeat(41)),[400,{error:'q-long'}]);
  for(const q of ['an\u0000a','an\u0085a','an\u0007a'])assert.deepEqual(await a.find('u_yo',q),[400,{error:'q-invalid'}],'caracteres de control: '+JSON.stringify(q));
  /* U+2028 y el salto de linea cuentan como espacio: se normalizan, no se rechazan */
  assert.equal((await a.find('u_yo','ana\nmora'))[0],200,'un salto de linea es un espacio');
  assert.deepEqual(handles57(await a.find('u_yo','ana\nmora')),['ana_mora'],'un salto de línea o un tab entre palabras es un espacio');
  /* % y _ no son comodines */
  assert.deepEqual(handles57(await a.find('u_yo','ana_')),['ana_mora'],'"_" vale como "_": no como cualquier letra (Anaya y "Ana María" no entran)');
  assert.deepEqual(handles57(await a.find('u_yo','%%')),[],'"%" no es comodín');assert.deepEqual(handles57(await a.find('u_yo','%a')),[]);assert.deepEqual(handles57(await a.find('u_yo','__')),[],'"__" no es "cualquier cosa"');assert.deepEqual(handles57(await a.find('u_yo','p_q')),['p_q_r']);assert.deepEqual(handles57(await a.find('u_yo','\\a')),[]);
  /* la cuenta */
  assert.deepEqual(await a.get(null,'https://x.test/api/people?q=ana'),[401,{error:'no-session'}],'sin sesión');
  assert.deepEqual(await a.get('u_sinperfil','https://x.test/api/people?q=ana'),[403,{error:'no-profile'}],'sin perfil');
  /* cursores malos */
  for(const c of ['AB','x',"a' OR '1'='1",'ana mora','a'.repeat(21),'ana;DROP TABLE profiles'])assert.deepEqual(await a.find('u_yo','ana',c),[400,{error:'bad-cursor'}],JSON.stringify(c));
  assert.equal(a.db.prepare('SELECT COUNT(*) n FROM profiles').get().n,5,'la tabla sigue entera');
 }finally{a.done()}
});
test('LHB-57 (Codex ronda 2): si la primera palabra reúne a muchos y nadie coincide con todo lo escrito, se revisa hasta el tope y next sigue desde ahí',async()=>{
 const a=await API57();
 try{
  a.mk('u_yo','yo_mismo','Yolanda','Mora');
  const ins=a.db.prepare("INSERT INTO profiles (user_id,handle,display_name,avatar_key,first_name,last_name,gender,birth_date,hidden,age_ok_at,created_at,updated_at) VALUES (?1,?2,'Ana Z.',NULL,'Ana','Zeta','F','1990-05-17',0,'2026-10-26T00:00:00.000Z','2026-10-26T00:00:00.000Z','2026-10-26T00:00:00.000Z')");
  a.db.exec('BEGIN');for(let i=0;i<1100;i++)ins.run('u_'+i,'p'+String(i).padStart(4,'0'));a.db.exec('COMMIT');
  a.mk('u_fin','zzz_ultima','Ana','Qqq');
  const r1=await a.find('u_yo','ana qq');assert.equal(r1[0],200);assert.deepEqual(r1[1],{people:[],next:'p0999'},'se revisaron 1000 sin hallar a nadie: sigue desde el último revisado');
  const r2=await a.find('u_yo','ana qq',r1[1].next);assert.deepEqual(r2[1],{people:[{handle:'zzz_ultima',display_name:'Ana Q.',avatar_key:AV}],next:null},'la siguiente llamada la encuentra');
  assert.equal(a.PL.SCANMAX,1000);assert.equal(a.PL.SCAN,100);
 }finally{a.done()}
});
test('LHB-57: 20 por página con cursor, de la A a la Z por @, sin repetir ni saltar a nadie; exactamente 20 no promete otra página',async()=>{
 const a=await API57();
 try{
  a.mk('u_yo','yo_mismo','Yolanda','Mora');const hs=[];for(let i=0;i<45;i++){const h='pers'+String(i).padStart(2,'0');hs.push(h);a.mk('u_'+h,h,'Persona','Zeta')}
  a.mk('u_otro','otro_xx','Otro','Zeta');
  const vistos=[];let cur=null,paginas=0;
  for(;;){const [st,r]=await a.find('u_yo','pers',cur);assert.equal(st,200);paginas++;assert.deepEqual(Object.keys(r).sort(),['next','people']);vistos.push(...r.people.map(p=>p.handle));
   if(!r.next){assert.ok(r.people.length<=20);break}assert.equal(r.people.length,20,'las páginas intermedias van llenas');assert.equal(r.next,r.people[19].handle,'el cursor es el @ de la última');cur=r.next;if(paginas>5)assert.fail('el cursor no termina')}
  assert.equal(paginas,3,'45 personas: 20, 20 y 5');assert.deepEqual(vistos,hs.slice().sort(),'de la A a la Z, sin repetir ni saltar');assert.ok(!vistos.includes('otro_xx'),'otro_xx no empieza por pers ni por @ ni por nombre ni por apellido');
 }catch(e){throw e}finally{a.done()}
});
test('LHB-57 (Codex ronda 1): el nombre público se arma con nombre e inicial aunque haya un display_name viejo con el apellido; sin nombre guardado no sale ninguno',async()=>{
 const a=await API57();
 try{
  a.mk('u_yo','yo_mismo','Yolanda','Mora');a.mk('u_ana','ana_mora','Ana','Mora');a.mk('u_sin','sergio_b',null,null);
  a.db.prepare("UPDATE profiles SET display_name='Ana Mora' WHERE user_id='u_ana'").run();
  a.db.prepare("UPDATE profiles SET display_name='Sergio Báez' WHERE user_id='u_sin'").run();
  const r=await a.find('u_yo','ana');assert.deepEqual(r[1].people,[{handle:'ana_mora',display_name:'Ana M.',avatar_key:AV}],'un display_name viejo con el apellido entero no sale');
  const s=await a.find('u_yo','sergio');assert.deepEqual(s[1].people,[{handle:'sergio_b',display_name:null,avatar_key:AV}],'sin nombre y apellido guardados no hay nombre público: ni el viejo sale');
  assert.ok(!JSON.stringify([r,s]).includes('Báez')&&!JSON.stringify([r,s]).includes('Mora'));
 }finally{a.done()}
});
test('LHB-57 (Codex ronda 1): sin importar mayúsculas también para Á, ñ, É: cada combinación de las letras fuera del ASCII',async()=>{
 const a=await API57();
 try{
  a.mk('u_yo','yo_mismo','Yolanda','Mora');a.mk('u_alv','alvaro_p','Álvaro','Peña');a.mk('u_nan','nandu','Ñandú','Ñoño');a.mk('u_mix','mixto','ÁLvaro','PEÑA');a.mk('u_asc','ascii_x','Ana','Soto');
  for(const q of ['ál','ÁL','Ál','álvaro','ÁLVARO','álvaro pe','ÁLVARO PEÑ'])assert.deepEqual(handles57(await a.find('u_yo',q)),['alvaro_p','mixto'],'nombre: '+q);
  for(const q of ['peñ','PEÑ','Peñ','pEÑ'])assert.deepEqual(handles57(await a.find('u_yo',q)),['alvaro_p','mixto'],'apellido: '+q);
  for(const q of ['ñand','ÑAND','Ñand','ñoñ','ÑOÑ'])assert.deepEqual(handles57(await a.find('u_yo',q)),['nandu'],q);
  assert.deepEqual(handles57(await a.find('u_yo','ANA')),['ascii_x'],'lo ASCII sigue igual');
  /* seis letras fuera del ASCII caben (64 formas); con más se prueba minúscula, mayúscula e inicial y no revienta */
  assert.equal((await a.find('u_yo','ñññññá'))[0],200);assert.equal((await a.find('u_yo','ñññññññá'))[0],200);
  /* con más de seis letras fuera del ASCII, la inicial en mayúscula y todo en mayúscula también se encuentran */
  a.mk('u_lg','largo_x','Ñññññññáb','Zeta');a.mk('u_lg2','largo_y','ÑÑÑÑÑÑÑÁB','Zeta');
  assert.deepEqual(handles57(await a.find('u_yo','ñññññññá')),['largo_x','largo_y'],'minúscula escrita, inicial en mayúscula y todo en mayúscula guardados');
  /* un nombre largo con muchas letras con acento: lo escrito en minúsculas o con las mayúsculas guardadas encuentra lo mismo */
  a.mk('u_mj','maria_j','María José','Ñúñez Álvarez Peña');
  for(const q of ['María José Ñúñez Álvarez Peñ','maría josé ñúñez álvarez peñ','MARÍA JOSÉ ÑÚÑEZ ÁLVAREZ PEÑ','maría josé ñ'])assert.deepEqual(handles57(await a.find('u_yo',q)),['maria_j'],q);
  assert.deepEqual(handles57(await a.find('u_yo','maría josé zz')),[],'todo lo escrito cuenta, no solo la primera palabra');assert.deepEqual(handles57(await a.find('u_yo','ñúñez álvarez peñ')),['maria_j'],'el apellido con varias palabras');
  /* la ß y la ẞ son la misma letra; lo escrito con un acento suelto (NFD) es el mismo texto */
  a.mk('u_ss','sara_s','ẞara','Gómez');assert.deepEqual(handles57(await a.find('u_yo','ßa')),['sara_s']);assert.deepEqual(handles57(await a.find('u_yo','ẞa')),['sara_s']);
  assert.deepEqual(handles57(await a.find('u_yo','n\u0303and')),['nandu'],'ñ escrita como n y un tilde aparte');
  assert.equal(a.PL.patternsOf('ñññññá').length,64);assert.equal(a.PL.stemOf('ñññññññá'),'ññññññ','el comienzo que reúne candidatos lleva a lo sumo 6 letras de dos formas');assert.equal(a.PL.patternsOf(a.PL.stemOf('ñññññññá')).length,64);assert.deepEqual(a.PL.patternsOf('ana'),['ana%']);assert.equal(a.PL.stemOf('ana mora'),'ana','solo la primera palabra');
  assert.deepEqual(a.PL.patternsOf('a_%').length,1,'% y _ siguen escapados');assert.deepEqual(a.PL.patternsOf('a_%'),['a\\_\\%%']);
 }finally{a.done()}
});
/* la pantalla Personas de hoja.js corre tal cual sobre un DOM de mentira */
function PERSONAS_HARNESS(apiFn){
 const vm=require('vm');const src=read('hoja.js').replace(/\r\n/g,'\n');
 const code=src.slice(src.indexOf('const PQ_MIN=2;'),src.indexOf('\nfunction vHumidor'));
 let els={},html='';const mkEl=()=>{const e={value:'',hidden:false,onsubmit:null,oninput:null,onclick:null,list:'',n:0,tc:''};
  Object.defineProperty(e,'textContent',{get:()=>e.tc,set:v=>{e.tc=v}});
  Object.defineProperty(e,'innerHTML',{get:()=>e.list,set:v=>{e.list=v;e.n=(v.match(/<li /g)||[]).length}});
  Object.defineProperty(e,'children',{get:()=>({length:e.n})});
  e.insertAdjacentHTML=(w,h)=>{e.list+=h;e.n+=(h.match(/<li /g)||[]).length};return e};
 const $=s=>els[s]||(els[s]=mkEl());
 const view={set innerHTML(h){els={};html=h}};
 const calls=[],timers=[];const ctx={view,$,esc:s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])),subnav:c=>'<nav>'+c+'</nav>',clerk:async()=>({}),
  api:async(C,m,p)=>{calls.push(m+' '+p);return apiFn(p)},setTimeout:fn=>{timers.push(fn);return timers.length},clearTimeout:()=>{}};
 vm.createContext(ctx);vm.runInContext(code+';this.vPersonas=vPersonas;this.pqOk=pqOk;this.pqText=pqText;this.personRow=personRow',ctx);
 ctx.vPersonas();
 const search=async q=>{$('#psQ').value=q;return $('#psF').onsubmit({preventDefault(){}})};
 return {ctx,$,calls,timers,search,html:()=>html,more:()=>$('#psMore').onclick(),remount:()=>ctx.vPersonas(),type:q=>{$('#psQ').value=q;return $('#psQ').oninput()}}}
test('LHB-57: la pantalla Personas: pide 2 caracteres, escapa todo, pinta solo lo público, pide más con el cursor y no pinta respuestas viejas',async()=>{
 const AVP='https://img.clerk.com/eyJ0eXBlIjoicHJveHkifQ';
 const mkp=(h,n)=>({handle:h,display_name:n,avatar_key:AVP});
 /* la regla de 2 caracteres, igual que el servidor */
 let H=PERSONAS_HARNESS(async()=>({status:200,body:{people:[],next:null}}));
 for(const q of ['',' ','a','@','@a','  a  ',null,undefined])assert.equal(H.ctx.pqOk(q),false,'corta: '+JSON.stringify(q));for(const q of ['ab','@ab',' ab ','ana mora'])assert.equal(H.ctx.pqOk(q),true,q);
 assert.equal(H.ctx.pqText('  @Ana   Mo '),'Ana Mo');
 /* una consulta corta no llama a ningún lado */
 await H.search('a');assert.deepEqual(H.calls,[],'sin red por una letra');assert.match(H.$('#psH').textContent,/al menos 2 letras/);
 /* una buena: llama una vez con el texto escapado y pinta */
 H=PERSONAS_HARNESS(async p=>({status:200,body:{people:[mkp('ana_mora','Ana M.'),mkp('beto_a','Beto A.')],next:'beto_a'}}));
 await H.search(' @ana mo ');assert.deepEqual(H.calls,['GET /api/people?q=ana%20mo'],'el @ y los espacios sobrantes no viajan');assert.equal(H.$('#psL').n,2);assert.equal(H.$('#psMore').hidden,false,'hay más: aparece Ver más');assert.equal(H.$('#psH').textContent,'');
 assert.match(H.$('#psL').innerHTML,/data-handle="ana_mora"/);assert.match(H.$('#psL').innerHTML,/<b>Ana M\.<\/b><span class="s">@ana_mora<\/span>/);assert.match(H.$('#psL').innerHTML,/<img src="https:\/\/img\.clerk\.com\/eyJ0eXBlIjoicHJveHkifQ"/);
 /* Ver más pide la siguiente con el cursor y agrega */
 H=PERSONAS_HARNESS(async p=>p.includes('cursor=')?{status:200,body:{people:[mkp('zeta','Zoe Z.')],next:null}}:{status:200,body:{people:[mkp('ana_mora','Ana M.')],next:'ana_mora'}});
 await H.search('an');await H.more();assert.deepEqual(H.calls,['GET /api/people?q=an','GET /api/people?q=an&cursor=ana_mora']);assert.equal(H.$('#psL').n,2,'agrega, no reemplaza');assert.equal(H.$('#psMore').hidden,true,'sin siguiente se esconde');
 /* sin resultados y con error */
 H=PERSONAS_HARNESS(async()=>({status:200,body:{people:[],next:null}}));await H.search('zz');assert.match(H.$('#psH').textContent,/No encontramos a nadie/);
 H=PERSONAS_HARNESS(async()=>({status:200,body:{people:[],next:'p0999'}}));await H.search('zz');assert.equal(H.$('#psH').textContent,'','sin nadie en esta tanda pero con más por revisar no dice que no hay nadie');assert.equal(H.$('#psMore').hidden,false);
 for(const r of [{status:500,body:{}},{status:0,body:{}},{status:403,body:{error:'no-profile'}},{status:200,body:{}}]){H=PERSONAS_HARNESS(async()=>r);await H.search('zz');assert.match(H.$('#psH').textContent,/No pudimos buscar/,JSON.stringify(r));assert.equal(H.$('#psL').n,0)}
 H=PERSONAS_HARNESS(async()=>{throw new Error('red')});await H.search('zz');assert.match(H.$('#psH').textContent,/No pudimos buscar/,'una excepción tampoco rompe');
 /* una respuesta vieja no pinta: la primera búsqueda contesta después de la segunda, y después de que otra pantalla ocupó este lugar */
 let res1,res2;H=PERSONAS_HARNESS(p=>p.includes('q=aa')?new Promise(r=>res1=r):new Promise(r=>res2=r));
 const s1=H.search('aa');await tick();const s2=H.search('bb');await tick();res2({status:200,body:{people:[mkp('bb_uno','Bb U.')],next:null}});await s2;res1({status:200,body:{people:[mkp('aa_viejo','Aa V.')],next:null}});await s1;
 assert.match(H.$('#psL').innerHTML,/bb_uno/);assert.ok(!/aa_viejo/.test(H.$('#psL').innerHTML),'la respuesta de la búsqueda vieja se descarta');
 let res3;H=PERSONAS_HARNESS(()=>new Promise(r=>res3=r));const s3=H.search('cc');await tick();const antes=H.$('#psL');H.remount();res3({status:200,body:{people:[mkp('cc_uno','Cc U.')],next:null}});await s3;assert.equal(H.$('#psL').n,0,'si otra pantalla ocupó el lugar, la respuesta vieja no pinta');
 /* escapado: un nombre o @ con HTML no se vuelve HTML, y una foto que no es de Clerk no se carga */
 const fila=H.ctx.personRow({handle:'x<img src=x onerror=alert(1)>',display_name:'<script>alert(1)</script>',avatar_key:'https://evil.example/x.png'});
 assert.ok(!/<script|<img src=x/.test(fila),'todo escapado');assert.ok(!/evil\.example/.test(fila),'una foto que no es de Clerk no se carga');assert.match(fila,/>&lt;/);
 assert.match(H.ctx.personRow({handle:'ana_mora',display_name:null,avatar_key:null}),/>A<\/span>[\s\S]*<b>@ana_mora<\/b>/,'sin nombre público: la inicial del @ y el @');
});
test('LHB-57 (Codex ronda 1): la pantalla Personas: escribir descarta lo que iba en camino y su Ver más; un temporizador de otra pantalla no hace nada',async()=>{
 const AVP='https://img.clerk.com/eyJ0eXBlIjoicHJveHkifQ';const mkp=(h,n)=>({handle:h,display_name:n,avatar_key:AVP});
 /* escribo ana, escribo beto antes de la pausa, llega la respuesta de ana: no se pinta, Ver más no sale y el siguiente Ver más no lleva el cursor de ana */
 let res1;const H=PERSONAS_HARNESS(async p=>p.includes('q=ana')?new Promise(r=>res1=r):{status:200,body:{people:[mkp('beto_x','Beto X.')],next:null}});
 const s1=H.search('ana');await tick();H.type('beto');res1({status:200,body:{people:[mkp('ana_mora','Ana M.')],next:'ana_mora'}});await s1;
 assert.equal(H.$('#psL').n,0,'la respuesta de ana no se pinta bajo beto');assert.equal(H.$('#psMore').hidden,true,'Ver más no aparece');
 await H.more();assert.deepEqual(H.calls.filter(c=>c.includes('beto')),['GET /api/people?q=beto'],'y si se pide, sin el cursor de ana');
 /* ana ya se pintó y tiene siguiente; se escribe beto y se pide Ver más antes de la pausa: no lleva el cursor de ana */
 const J=PERSONAS_HARNESS(async()=>({status:200,body:{people:[mkp('ana_mora','Ana M.')],next:'ana_mora'}}));await J.search('ana');assert.equal(J.$('#psMore').hidden,false);
 J.type('beto');assert.equal(J.$('#psMore').hidden,true,'al teclear, Ver más se esconde');await J.more();assert.ok(!J.calls.some(c=>c.includes('q=beto')&&c.includes('cursor')),'ni se pide con el cursor de otra búsqueda');
 /* se escribe, no llega la pausa, se deja la pantalla; después se cumple la pausa: no pide nada ni falla */
 const G=PERSONAS_HARNESS(async()=>({status:200,body:{people:[],next:null}}));
 G.type('ana');assert.equal(G.timers.length,1);G.remount();G.$('#psQ').value='ana';const antes=G.calls.length;await G.timers[0]();assert.equal(G.calls.length,antes,'el temporizador de la pantalla anterior no busca');
 G.ctx.view.innerHTML='<otra pantalla>';await G.timers[0]();assert.equal(G.calls.length,antes);
});
test('LHB-57: por dónde se llega y qué no cambia: la pestaña Personas en Mi Hoja, la ruta, el debounce, los estilos y el caché nuevo',()=>{
 const h=read('hoja.js').replace(/\r\n/g,'\n'),css=read('styles.css');
 assert.ok(h.includes("['favoritos','Favoritos'],['personas','Personas'],['perfil','Perfil']];"),'la pestaña Personas está en el submenú de Mi Hoja');
 assert.ok(h.includes('favoritos:vFavoritos,personas:vPersonas}[sub]||vHumidor)()'),'#/mihoja/personas abre la pantalla');
 assert.ok(h.includes('setTimeout(()=>run(false),350)')&&h.includes("api(C,'GET','/api/people?q='"),'busca mientras se escribe, con una pausa, y por la API');
 assert.ok(css.includes('.people{')&&css.includes('.person{'),'estilos de la lista');
 assert.match(read('sw.js'),/const VERSION='lhb-v57'/,'el shell nuevo se publica con otra versión del caché');
 const fn=fs.readFileSync(path.join(__dirname,'..','functions','api','people.js'),'utf8'),lib=fs.readFileSync(path.join(__dirname,'..','functions','_lib','people.js'),'utf8');
 assert.ok(fn.includes('const g = await requireProfile(request, env);'),'buscar pide cuenta y perfil');
 assert.ok(lib.includes('hidden = 0')&&lib.includes('user_id <> ?1'),'el filtro de ocultos y el de quien busca están en la consulta');
 assert.ok(!/\bSELECT\b[^;`']*\b(birth_date|gender|email|display_name)\b/.test(lib.replace(/\/\*[\s\S]*?\*\//g,'').replace(/^\s*\/\/.*$/gm,'').replace(/'[^']*LIKE[^']*'/g,'')),'lo que se selecciona no incluye datos privados ni el display_name guardado');
 assert.ok(lib.includes('display_name: r.first_name && r.last_name ? publicName(r.first_name, r.last_name) : null'),'el nombre público se arma aquí con nombre e inicial, nunca se copia lo guardado ni el apellido');
});
/* ===================== LHB-51: la foto y el nombre de la cuenta en el encabezado y en Perfil ===================== */
/* app.js corre tal cual (de AV_HOST a topAvatar) sobre un DOM de mentira */
function PERFIL_HARNESS(opts){
 opts=opts||{};const vm=require('vm');const src=read('app.js').replace(/\r\n/g,'\n');
 const code=src.slice(src.indexOf("/* LHB-51: la foto y el nombre de Perfil"),src.indexOf('/* ---------- v6: Mi Hoja y demás (hoja.js)'));
 let els={},html='';const store={cuenta2:opts.cuenta2===undefined?null:opts.cuenta2,perfil:opts.perfil||{nombre:'',capa:''}};
 const mkEl=()=>{let h='';const e={firstChild:null,onchange:null,onsubmit:null,value:''};Object.defineProperty(e,'innerHTML',{get:()=>h,set:v=>{h=v;e.firstChild=null}});e.replaceChildren=n=>{h='[node]';e.firstChild=n};return e};
 const $=s=>{if(s!=='#topAvatar'&&!html.includes('id="'+s.slice(1)+'"'))return null;return els[s]||(els[s]=mkEl())};
 const view={set innerHTML(h){els={};html=h},get innerHTML(){return html}};
 const calls={photoURL:0,toast:[],route:0,hydrate:0};
 let photoP=opts.photoURL||Promise.resolve(null);
 function Image(){}
 const ctx={$,view,Image,esc:s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])),tt:k=>k,
  LS:{get:(k,d)=>store[k]===undefined||store[k]===null?d:store[k],set:(k,v)=>{store[k]=v}},
  photoURL:async()=>{calls.photoURL++;return photoP},uploads:()=>[],EXT:{subnav:()=>'',S:()=>({favs:{cigarros:[]},ratings:{}})},cigarById:()=>null,cigarCard:()=>'',cigarSVG:()=>'',artisanName:()=>'',emptyCoqui:()=>'',
  hydratePhotos:()=>{calls.hydrate++},toast:m=>calls.toast.push(m),route:()=>{calls.route++},idb:{put:async()=>{}},urlCache:{},resizeImage:async f=>f};
 vm.createContext(ctx);vm.runInContext(code+';this.vPerfil=vPerfil;this.topAvatar=topAvatar;this.acctNow=acctNow;this.acctAvatar=acctAvatar;this.paintAvatar=paintAvatar;this.initialsOf=initialsOf',ctx);
 return {ctx,$,store,calls,html:()=>html,setPhoto:p=>{photoP=p}}}
const CLK='https://img.clerk.com/eyJ0eXBlIjoicHJveHkifQ';
test('LHB-51: el encabezado muestra la foto de la cuenta que entró y nunca la foto local del teléfono',async()=>{
 let H=PERFIL_HARNESS({cuenta2:{sub:'user_a',handle:'ana',name:'Ana M.',avatar:CLK},photoURL:Promise.resolve('blob:foto-local-de-otra-cuenta')});
 await H.ctx.topAvatar();const img=H.$('#topAvatar').firstChild;
 assert.ok(img&&img.src===CLK,'el círculo de arriba lleva la foto de la cuenta');assert.equal(img.alt,'');assert.equal(H.calls.photoURL,0,'ni se pide la foto local del teléfono');
 /* una foto que no es de Clerk no se carga: queda la inicial del nombre público */
 H=PERFIL_HARNESS({cuenta2:{sub:'user_a',handle:'ana',name:'Ana M.',avatar:'https://evil.example/x.png'}});await H.ctx.topAvatar();
 assert.equal(H.$('#topAvatar').firstChild,null);assert.match(H.$('#topAvatar').innerHTML,/^<span>AM<\/span>$/,'las iniciales del nombre, como Google');
 /* sin nombre público guardado (lo de antes de este cambio): la inicial del @ */
 H=PERFIL_HARNESS({cuenta2:{sub:'user_a',handle:'zeta'}});await H.ctx.topAvatar();assert.match(H.$('#topAvatar').innerHTML,/^<span>Z<\/span>$/);
 /* la foto vencida no deja un hueco: si no carga, queda la inicial */
 H=PERFIL_HARNESS({cuenta2:{sub:'user_a',handle:'ana',name:'Beto S.',avatar:CLK}});await H.ctx.topAvatar();const im2=H.$('#topAvatar').firstChild;im2.onerror();assert.match(H.$('#topAvatar').innerHTML,/^<span>BS<\/span>$/,'si la foto no carga, las iniciales');
 /* lo guardado que no tiene forma de cuenta no cuenta */
 for(const bad of ['x',7,{},{sub:'',handle:'a'},{sub:'u'},{handle:'a'}]){H=PERFIL_HARNESS({cuenta2:bad});assert.equal(H.ctx.acctNow(),null,JSON.stringify(bad))}
 /* sin cuenta guardada (nadie entró, o acaba de cambiar la cuenta): la estrella, y nunca la foto ni el nombre locales de todo el teléfono (Codex ronda 1) */
 H=PERFIL_HARNESS({cuenta2:null,perfil:{nombre:'Luis Local',capa:''},photoURL:Promise.resolve('blob:local-de-la-cuenta-anterior')});H.ctx.topAvatar();assert.equal(H.$('#topAvatar').innerHTML,'<span>\u2606</span>','sin cuenta guardada, la estrella');assert.equal(H.calls.photoURL,0,'no se pide la foto local');assert.equal(H.$('#topAvatar').firstChild,null);
 /* y al guardarse la cuenta, el círculo pasa de la estrella a las iniciales */
 H.store.cuenta2={sub:'user_b',handle:'beto',name:'Beto S.',avatar:''};H.ctx.topAvatar();assert.equal(H.$('#topAvatar').innerHTML,'<span>BS</span>');
 /* las iniciales: la primera letra del nombre y la de la última palabra */
 const I=H.ctx.initialsOf;for(const [n,e] of [['Ana M.','AM'],['Ana','A'],['  ana   mora ','AM'],['José Luis Pérez','JP'],['Ñandú R.','ÑR'],['María-José S.','MS'],['E\u0301mile','E\u0301'],['हर्ष','ह'],['ana_mora','AM'],['','']  ,['@@..',''],[null,''],[undefined,''],[7,'7']])assert.equal(I(n),e,JSON.stringify(n));
});
test('LHB-51: Mi perfil pinta la foto y el nombre de la cuenta y no ofrece cambiar la foto local; sin cuenta queda como antes',async()=>{
 let H=PERFIL_HARNESS({cuenta2:{sub:'user_a',handle:'ana',name:'Ana M.',avatar:CLK},perfil:{nombre:'Viejo Local',capa:'Habano'},photoURL:Promise.resolve('blob:foto-local-de-otra-cuenta')});
 await H.ctx.vPerfil();const h=H.html();
 assert.match(h,/<div class="n">Ana M\.<\/div>/,'el nombre es el público de la cuenta');assert.match(h,/<div class="c">@ana · pf\.favCapa: Habano<\/div>/,'el @ y la capa');assert.ok(!/Viejo Local/.test(h.replace(/value="[^"]*"/g,'')),'no sale el nombre local');
 assert.ok(H.$('#mePic').firstChild&&H.$('#mePic').firstChild.src===CLK,'la tarjeta lleva la foto de la cuenta');assert.equal(H.calls.photoURL,0,'no se pide la foto local');
 assert.ok(!h.includes('id="pN"')&&!h.includes('id="pCam"')&&!h.includes('id="pGal"'),'con cuenta no hay nombre ni foto locales que editar');assert.ok(h.includes('id="pC"'),'queda la capa favorita');assert.ok(h.includes('<summary>pf.favCapa</summary>'));
 H.$('#pC').value='Maduro';H.$('#pForm').onsubmit({preventDefault(){}});assert.deepEqual(H.store.perfil,{nombre:'Viejo Local',capa:'Maduro'},'guardar la capa no borra lo demás');
 /* sin foto de Clerk: la inicial del nombre */
 H=PERFIL_HARNESS({cuenta2:{sub:'user_a',handle:'ana',name:'Ana M.',avatar:''}});await H.ctx.vPerfil();assert.match(H.$('#mePic').innerHTML,/^<span>AM<\/span>$/,'las iniciales del nombre');
 /* sin nombre público guardado: el @ hace de nombre */
 H=PERFIL_HARNESS({cuenta2:{sub:'user_a',handle:'zeta',name:'',avatar:''}});await H.ctx.vPerfil();assert.match(H.html(),/<div class="n">@zeta<\/div>/,'sin nombre público sale el @');assert.match(H.$('#mePic').innerHTML,/^<span>Z<\/span>$/);
 /* sin cuenta guardada (por ejemplo, no se pudo escribir en el teléfono): tarjeta neutra, nunca el nombre ni la foto locales de todo el teléfono (Codex ronda 2) */
 H=PERFIL_HARNESS({cuenta2:null,perfil:{nombre:'Luis Local',capa:''},photoURL:Promise.resolve('blob:local-de-otra-cuenta')});await H.ctx.vPerfil();
 assert.match(H.html(),/<div class="n">pf\.yourName<\/div>/,'sin cuenta guardada, ni el nombre local');assert.ok(!/Luis Local/.test(H.html()));assert.ok(H.html().includes('id="mePic">\u2606</div>'),'la estrella');assert.equal(H.calls.photoURL,0,'ni se pide la foto local');assert.ok(!H.html().includes('id="pN"')&&!H.html().includes('id="pCam"'),'ni se ofrece cambiar nombre o foto locales');
 /* un nombre con HTML no se vuelve HTML */
 H=PERFIL_HARNESS({cuenta2:{sub:'u',handle:'ana',name:'<img src=x onerror=alert(1)>',avatar:''}});await H.ctx.vPerfil();assert.ok(!/<img src=x/.test(H.html()),'el nombre va escapado');
});
test('LHB-51: la puerta de la cuenta guarda en el teléfono solo lo público (nombre público y foto de Clerk), también al editar; y el encabezado se repinta al guardar y al salir',async()=>{
 const CL='https://img.clerk.com/eyJ0eXBlIjoicHJveHkifQ';
 const run=async prof=>{const h=CUENTA_HARNESS({api:async()=>({status:200,body:{profile:prof}})});h.C.user={id:'user_a'};await h.A.require(h.go);await tick();return h.D.store.get()};
 assert.deepEqual(await run({handle:'ana',display_name:'Ana M.',avatar_key:CL,bio:'x',favorite_brand:'y'}),{sub:'user_a',handle:'ana',name:'Ana M.',avatar:CL},'nada de bio ni marca, solo lo del encabezado');
 assert.deepEqual(await run({handle:'ana',display_name:'Ana M.',avatar_key:'https://evil.example/x.png'}),{sub:'user_a',handle:'ana',name:'Ana M.',avatar:''},'una foto que no es de Clerk no se guarda');
 assert.deepEqual(await run({handle:'ana'}),{sub:'user_a',handle:'ana',name:'',avatar:''},'un perfil de antes, sin nombre ni foto, tampoco rompe');
 assert.deepEqual(await run({handle:'ana',display_name:7,avatar_key:7}),{sub:'user_a',handle:'ana',name:'',avatar:''},'ni valores que no son texto');
 /* al editar y guardar, lo guardado trae el nombre y la foto nuevos */
 const o=await EDT({id:'user_a',hasImage:true,imageUrl:AV},{put:b=>({status:200,body:{profile:{handle:b.handle,display_name:'Bea S.',avatar_key:AV55}}})});
 assert.deepEqual(await o.submit(),{ok:true});assert.deepEqual(o.h.D.store.get(),{sub:'user_a',handle:'ana',name:'Bea S.',avatar:AV55},'tras editar, el teléfono guarda el nombre y la foto nuevos');
 /* hoja.js repinta el encabezado cuando se guarda o se borra lo guardado, y app.js se lo da */
 const hj=read('hoja.js').replace(/\r\n/g,'\n'),ap=read('app.js');
 assert.ok(hj.includes("set:v=>{A.LS.set('cuenta2',v);if(A.topAvatar)A.topAvatar()}")&&/clear:\(\)=>\{try\{localStorage\.removeItem\('vb_cuenta2'\);localStorage\.removeItem\('vb_cuenta'\)\}catch\(e\)\{\}if\(A\.topAvatar\)A\.topAvatar\(\)\}/.test(hj),'guardar y borrar repintan el encabezado');
 assert.ok(ap.includes('window.LHB_EXT({topAvatar,'),'app.js le pasa topAvatar a Mi Hoja');
 assert.match(read('sw.js'),/const VERSION='lhb-v57'/,'el shell nuevo se publica con otra versión del caché');
});
test('LHB-51: al salir o al cambiar de cuenta se borra lo guardado de la cuenta anterior, para que el encabezado nunca muestre a una persona con la sesión de otra',async()=>{
 const h=CUENTA_HARNESS({api:async()=>({status:200,body:{profile:{handle:'ana',display_name:'Ana M.',avatar_key:'https://img.clerk.com/eyJ0eXBlIjoicHJveHkifQ'}}})});
 h.C.user={id:'user_a'};await h.A.require(h.go);await tick();assert.equal(h.D.store.get().sub,'user_a','la cuenta A queda guardada');
 h.C.signIn('user_b');assert.equal(h.D.store.get(),null,'de A a B directo: lo de A se borra aunque nadie haya salido');
 h.cache({sub:'user_b',handle:'beto',name:'Beto S.',avatar:''});h.C.signIn(null);assert.equal(h.D.store.get(),null,'al salir se borra');
});
test('LHB-51 (Codex ronda 1): al cargar Clerk, lo guardado de otra cuenta (o de ninguna) se descarta aunque /api/me falle',async()=>{
 for(const [nombre,user] of [['otra cuenta',{id:'user_b'}],['nadie entró',null]]){
  const h=CUENTA_HARNESS({api:async()=>({status:503,body:{}})});h.cache({sub:'user_a',handle:'ana',name:'Ana M.',avatar:''});h.C.user=user;await h.A.require(h.go);await tick();
  assert.equal(h.D.store.get(),null,nombre+': lo de A ya no vale');assert.ok(!h.log.includes('GO'));
 }
 /* la misma cuenta que dice Clerk: se queda (sirve sin conexión) */
 const ok=CUENTA_HARNESS({api:async()=>({status:503,body:{}})});ok.cache({sub:'user_a',handle:'ana',name:'Ana M.',avatar:''});ok.C.user={id:'user_a'};await ok.A.require(ok.go);await tick();assert.equal(ok.D.store.get().sub,'user_a','la misma cuenta se queda');
});
test('LHB-51 (Codex ronda 2): al abrir la app con una cuenta guardada, Clerk confirma quién es; otra cuenta o nadie la borra, sin conexión se queda',async()=>{
 const mk=(user,over)=>{const h=CUENTA_HARNESS(over);h.cache({sub:'user_a',handle:'ana',name:'Ana M.',avatar:''});h.C.user=user;return h};
 let h=mk({id:'user_b'});await h.A.reconcile();assert.equal(h.D.store.get(),null,'Clerk dice B: lo de A se va');
 h=mk(null);await h.A.reconcile();assert.equal(h.D.store.get(),null,'Clerk dice nadie: se va');
 h=mk({id:'user_a'});await h.A.reconcile();assert.equal(h.D.store.get().sub,'user_a','la misma cuenta se queda');
 h=mk({id:'user_b'},{clerk:async()=>{throw new Error('sin red')}});await h.A.reconcile();assert.equal(h.D.store.get().sub,'user_a','sin conexión no se puede saber: se queda');
 let called=0;h=CUENTA_HARNESS({clerk:async()=>{called++;throw new Error('x')}});await h.A.reconcile();assert.equal(called,0,'sin cuenta guardada no se carga Clerk');
 /* y después de confirmar, un cambio de cuenta sigue borrando */
 h=mk({id:'user_a'});await h.A.reconcile();h.cache({sub:'user_a',handle:'ana',name:'Ana M.',avatar:''});h.C.signIn('user_b');assert.equal(h.D.store.get(),null,'el cambio posterior se oye');
 const hj=read('hoja.js');assert.ok(hj.includes("setTimeout(()=>{if(acct.get())CUENTA.reconcile()},2500);"),'hoja.js lo pide al abrir');
});
test('LHB-51 (Codex ronda 3): si al confirmar la cuenta lo guardado era de otra, Mi Hoja ya pintada se vuelve a pasar por la puerta; en otra página no se mueve nada',async()=>{
 const mk=nav=>{const h=CUENTA_HARNESS();h.nav(nav);h.cache({sub:'user_a',handle:'ana',name:'Ana M.',avatar:''});h.C.user={id:'user_b'};return h};
 let h=mk('#/mihoja/perfil');await h.A.reconcile();assert.equal(h.D.store.get(),null);assert.equal(h.log.filter(x=>x==='reroute').length,1,'Perfil de A se repinta por la puerta de B');
 h=mk('#/catalogo');await h.A.reconcile();assert.equal(h.D.store.get(),null);assert.equal(h.log.filter(x=>x==='reroute').length,0,'en otra página no se repinta nada');
 h=mk('#/mihoja/perfil');h.C.user={id:'user_a'};await h.A.reconcile();assert.equal(h.log.filter(x=>x==='reroute').length,0,'la misma cuenta no mueve nada');
});
