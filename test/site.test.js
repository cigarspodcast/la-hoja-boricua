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
 assert.match(sw,/const VERSION='lhb-v66'/);assert.ok(sw.includes("'hoja.js'"));assert.ok(ix.indexOf('hoja.js')<ix.indexOf('app.js'));
 for(const w of ['Cata guiada','Aroma en frío','Encendido','Primer tercio','Segundo tercio','Tercer tercio','Fortaleza','Cuerpo','Final','Madera','Tierra','Especias','Dulce','Cacao','Frutos','Floral','Cuero','Nuez','Humidor','Diario','Pasaporte','Insignias','Exportar respaldo','Importar respaldo','Añadir a calendario','BEGIN:VCALENDAR','https://forms.gle/4iL5cgzun3LqdXBRA','/humoytambor','Maridajes','Pídelo directo','Escucha en Cigars Podcast','https://cigarspodcast.sites.tab.bot/','canShare','toBlob','La Hoja Boricua','lahojaboricua.com'])assert.ok(h.includes(w),w);
 assert.ok(/lhb_mihoja_v1/.test(h)&&/vb_favs|legacy\('favs'\)/.test(h),'versioned key + migration');
 const all=['index.html','app.js','hoja.js','art.js','data/bundle.js'].map(read).join('\n');
 assert.ok(!/don\s*q\b|serrall/i.test(all),'Don Q / Serrallés');assert.ok(!/bad bunny/i.test(all));assert.ok(!/fuerza/i.test(all));
 assert.ok(!/wa\.me|whatsapp/i.test(h.slice(h.indexOf('function pideloLink'),h.indexOf('function artisanExtras'))),'Pídelo directo never uses WhatsApp');
 const a=JSON.parse(readD('artesanos.json'));assert.ok(!a.some(x=>'alerta' in x),'alerta stays out');
 for(const u of [...h.matchAll(/POD\+'([^']+)'/g)].map(m=>m[1]))assert.ok(/^articulos\/[a-z0-9-]+$/.test(u),u);});
test('v6: data counts',()=>{const a=JSON.parse(readD('artesanos.json')),c=JSON.parse(readD('cigarros.json')),p=JSON.parse(readD('places.json'));
 assert.equal(a.length,32);assert.equal(c.length,48);assert.equal(p.length,41);const b=read('data/bundle.js');for(const x of [...a,...c,...p])assert.ok(b.includes('"id":"'+x.id+'"'),'bundle '+x.id);});

test('v7: fotos reales de producto',()=>{const src=read('fotos.js');const F=JSON.parse(src.slice(src.indexOf('=')+1).trim().replace(/;$/,''));const sw=read('sw.js'),js=read('app.js'),h=read('hoja.js'),ix=read('index.html');
 const c=JSON.parse(readD('cigarros.json'));const ids=new Set(c.map(x=>x.id));assert.equal(Object.keys(F).length,33);
 for(const [id,f] of Object.entries(F)){assert.ok(ids.has(id),'foto for unknown cigar '+id);assert.ok(['exacta','linea'].includes(f.match));assert.match(f.credito,/^Foto: /);
  for(const p of [f.img,f.thumb,...(f.galeria||[]).flatMap(g=>[g.img,g.thumb])])assert.ok(fs.existsSync(path.join(S,p)),'missing '+p);
  assert.ok(sw.includes("'"+f.thumb+"'"),'thumb not precached '+id);assert.ok(!sw.includes("'"+f.img+"'"),'large precached '+id)}
 assert.ok(F['yambo-toro'].galeria.length>=4&&F['yambo-toro'].credito==='Foto: Yambó');
 assert.ok(ix.indexOf('fotos.js')<ix.indexOf('hoja.js'));assert.ok(js.includes('loading="lazy"')&&I18N().T.es['cig.lineFoto']==='Foto de la línea'&&js.includes("tt('cig.lineFoto')")&&h.includes('LHB_FOTOS'));
 assert.ok(!/fuerza|bad bunny|don\s*q\b/i.test(src));});
test('v8: guagua B (recorte + campo de tabaco en el splash)',()=>{const sw=read('sw.js'),a=read('art.js'),ix=read('index.html'),css=read('styles.css'),js=read('app.js');
 assert.match(sw,/const VERSION='lhb-v66'/);for(const f of ['img/guagua/guagua_recorte.webp','img/guagua/campo.webp','img/guagua/hojas.webp']){assert.ok(sw.includes("'"+f+"'"),f);assert.ok(fs.existsSync(path.join(__dirname,'..','site',f)),f)}
 assert.ok(a.includes('img/guagua/guagua_recorte.webp')&&a.includes("VEHICULO='guagua'"));assert.ok(ix.includes('campo-hojas')&&ix.includes('splashCar'));
 assert.ok(css.includes('@keyframes rock'));assert.ok(js.includes("addEventListener('click',done)"));
 for(const f of ['img/guagua/guagua_recorte.webp','img/guagua/campo.webp','img/guagua/hojas.webp'])assert.ok(fs.statSync(path.join(__dirname,'..','site',f)).size<62000,f);});

test('v9: splash por capas + garita fuera del header',()=>{const ix=read('index.html'),css=read('styles.css'),js=read('app.js'),sw=read('sw.js');
 assert.match(sw,/const VERSION='lhb-v66'/);for(const c of ['l-hills','l-field','l-mid','l-fg','l-fg2','nube','id="dust"','id="wake"'])assert.ok(ix.includes(c),c);
 for(const c of ['.vsh{','.whl i{','@keyframes rock','@keyframes sway','.vb .van-i{'])assert.ok(css.includes(c),c);
 assert.ok(js.includes('REDUCED_ALL')&&js.includes("className='puff'")&&js.includes("className='wleaf'"));assert.ok(!js.includes('VBArt.garita("hero-garita")'));});

test('v10/v11: fotos Monte & Mística (Entre Humos), Maduro encendido (v11)',()=>{const src=read('fotos.js');const F=JSON.parse(src.slice(src.indexOf('=')+1).trim().replace(/;$/,''));const sw=read('sw.js');
 assert.match(sw,/const VERSION='lhb-v66'/);
 assert.equal(F['monte-mistica-corojo'].match,'exacta');assert.equal(F['monte-mistica-connecticut'].match,'linea');
 for(const id of ['monte-mistica-corojo','monte-mistica-connecticut']){assert.equal(F[id].credito,'Foto: Entre Humos');assert.ok(sw.includes("'"+F[id].thumb+"'"));assert.ok(fs.statSync(path.join(S,F[id].img)).size<80000)}
 assert.equal(F['monte-mistica-maduro'].match,'linea');
 for(const id of ['monte-mistica-maduro']){assert.equal(F[id].credito,'Foto: Entre Humos');assert.ok(sw.includes("'"+F[id].thumb+"'"));assert.ok(fs.existsSync(path.join(S,F[id].img)));assert.ok(fs.statSync(path.join(S,F[id].img)).size<80000)}});

test('v12: bandera de PR (opción A, triángulo celeste) en vez de la silla + fotos Galiz y Villareño',()=>{const ix=read('index.html'),css=read('styles.css'),sw=read('sw.js'),js=read('app.js'),art=read('art.js');
 assert.match(sw,/const VERSION='lhb-v66'/);
 for(const s of [ix,css,js,art])assert.ok(!/silla|chair|monobloc/i.test(s),'sin silla');
 assert.ok(ix.includes('class="splash-bandera"')&&ix.includes('aria-label="Bandera de Puerto Rico"'));
 const svg=ix.slice(ix.indexOf('class="splash-bandera"'),ix.indexOf('</svg>',ix.indexOf('class="splash-bandera"')));
 assert.equal((svg.match(/fill="#E92A2F"/g)||[]).length,3,'3 franjas rojas');assert.ok(svg.includes('class="tela"'));
 const tri=svg.match(/<path d="M[^"]*Z" fill="(#5FB4E5)"/i);assert.ok(/#9a6a3c/.test(svg)&&/#5b7a3a/.test(svg),'asta de madera + grama');assert.ok(tri,'triángulo');
 const hex=tri[1].slice(1),r=parseInt(hex.slice(0,2),16),g=parseInt(hex.slice(2,4),16),b=parseInt(hex.slice(4,6),16);
 assert.ok(b>200&&g>150&&r>60&&r<130,'triángulo celeste: '+tri[1]);assert.ok(!/#0050F0/i.test(ix)&&!/%230050F0/i.test(css));
 const em=css.slice(css.indexOf('.empty::before'),css.indexOf('}',css.indexOf('.empty::before')));assert.ok(em.includes('%239a6a3c'),'asta de madera en vacíos');assert.ok(em.includes('%235FB4E5')&&em.includes('%23E92A2F'),'bandera celeste en vacíos');
 assert.ok(/\.tela\{[^}]*animation:ondea/.test(css)&&/@media \(prefers-reduced-motion:reduce\)\{\*,\*::before,\*::after\{animation:none!important/.test(css));
 const src=read('fotos.js');const F=JSON.parse(src.slice(src.indexOf('=')+1).trim().replace(/;$/,''));assert.equal(Object.keys(F).length,33);
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

test('v14: botón de Spotify en Podcast',()=>{const hj=fs.readFileSync(path.join(S,'hoja.js'),'utf8');assert.ok(hj.includes("const SPOTIFY='https://open.spotify.com/show/5DUCZkx89z9cTeBaczq6Gr'"));assert.match(hj,/class="lbtn spotify" href="\$\{SPOTIFY\}" target="_blank" rel="noopener">\$\{SPOT_SVG\}Escúchalo en Spotify/);assert.match(fs.readFileSync(path.join(S,'sw.js'),'utf8'),/const VERSION='lhb-v66'/);});

test('v15: banner de Sergio en el catálogo, sin guagua',()=>{const js=fs.readFileSync(path.join(S,'app.js'),'utf8'),css=fs.readFileSync(path.join(S,'styles.css'),'utf8'),sw=fs.readFileSync(path.join(S,'sw.js'),'utf8');
 assert.ok(js.includes('<img class="hero-bg" src="img/hero/banner.webp"'));assert.ok(!js.includes('hero-volky')&&!js.includes('hero-art'));
 assert.ok(!css.includes('hero-art')&&!css.includes('@keyframes park')&&!css.includes('@keyframes idle'));assert.match(css,/\.hero-bg\{[^}]*object-fit:cover/);
 assert.match(sw,/const VERSION='lhb-v66'/);assert.ok(sw.includes("'img/hero/banner.webp'"));
 assert.ok(fs.statSync(path.join(S,'img/hero/banner.webp')).size<=35000);
 assert.ok(js.includes("VBArt.carro('mini')"));});
test('v16: paleta B Bandera (verdes intactos)',()=>{const c=fs.readFileSync(path.join(S,'styles.css'),'utf8'),a=fs.readFileSync(path.join(S,'app.js'),'utf8'),h=fs.readFileSync(path.join(S,'hoja.js'),'utf8');
 for(const v of ['--bg:#0e2417','--card:#173a26','--gold:#8fd162','--verde:#a9c487','--flam:#d0192e','--ado-d:#0050f0','--pr-red:#ed0000','--pr-blue:#0050f0','--cream:#f8f8f4','--celeste:#8fb8ff'])assert.ok(c.includes(v),v);
 assert.ok(!c.includes('--flam:#c93f25'));assert.ok(a.includes("const FACADE=['#0050f0','#ed0000','#f8f8f4','#ed0000','#f8f8f4','#0050f0']"));
 for(const old of ['#e2a39a','#efc56f','#86c0c6','#c3a2cf','#9fcdea','#b5162b','#1d3f7a','#f3f1e2'])assert.ok(!a.includes(old)&&!h.includes(old),old);
 assert.ok(fs.readFileSync(path.join(S,'index.html'),'utf8').toLowerCase().includes('5fb4e5')||c.toLowerCase().includes('5fb4e5'));});
test('v17: flor de tabaco reemplaza la garita, flamboyán nuevo',()=>{const S2=path.join(__dirname,'..','site');const a=fs.readFileSync(path.join(S2,'art.js'),'utf8'),ap=fs.readFileSync(path.join(S2,'app.js'),'utf8'),hj=fs.readFileSync(path.join(S2,'hoja.js'),'utf8');assert.ok(a.includes('function flor'));assert.ok(!ap.includes('VBArt.garita(')&&!hj.includes('VBArt.garita('));assert.ok(ap.includes('VBArt.flor()')&&hj.includes('VBArt.flor()'));assert.match(fs.readFileSync(path.join(S2,'sw.js'),'utf8'),/const VERSION='lhb-v66'/);});

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
 assert.match(read('sw.js'),/lhb-v66/);});

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
 assert.match(read('sw.js'),/const VERSION='lhb-v66'/);});
test('v23: 7 artesanos nuevos hechos en PR (28 total), sin teléfonos/emails, Adjuntas en la Ruta',()=>{const a=JSON.parse(readD('artesanos.json'));assert.ok(a.length>=28);assert.equal(new Set(a.map(x=>x.id)).size,a.length);
 const ids=['la-hoja-del-chan','cigarros-j-velez','tabacos-el-roble','el-escondite-adjuntas','hr-handmade-cigars','fumita-pr','monte-mistica'];const b=read('data/bundle.js');
 for(const id of ids){const x=a.find(y=>y.id===id);assert.ok(x,id);assert.ok(x.iniciales&&x.historia&&x.fuentes.length,id);assert.ok(b.includes('"id":"'+id+'"'),id);const s=JSON.stringify(x);assert.ok(!/\d{3}[-. )]+\d{3}[-. ]\d{4}/.test(s),'tel '+id);assert.ok(!/@[a-z0-9-]+\.[a-z]{2,}/i.test(s.replace(/https?:\/\/[^"]+/g,'')),'email '+id)}
 assert.ok(/\|Adjuntas,C,/.test(read('hoja.js')));assert.match(read('sw.js'),/const VERSION='lhb-v66'/);});

test('v24: 4 artesanos aprobados por Sergio (32 total), sin teléfonos/emails, Ponce y Juana Díaz en la Ruta',()=>{const a=JSON.parse(readD('artesanos.json'));assert.equal(a.length,32);assert.equal(new Set(a.map(x=>x.id)).size,32);const b=read('data/bundle.js');
 for(const id of ['casa-robles-cigars','juana-diaz-cigars','el-bastion-cigars','don-chamorro-ponce']){const x=a.find(y=>y.id===id);assert.ok(x,id);assert.ok(x.iniciales&&x.historia&&x.fuentes.length,id);assert.ok(b.includes('"id":"'+id+'"'),id);const s=JSON.stringify(x);assert.ok(!/\d{3}[-. )]+\d{3}[-. ]\d{4}/.test(s),'tel '+id);assert.ok(!/@[a-z0-9-]+\.[a-z]{2,}/i.test(s.replace(/https?:\/\/[^"]+/g,'')),'email '+id)}
 const h=read('hoja.js');assert.ok(h.includes('|Ponce,S,')&&h.includes('|Juana Díaz,S,'));assert.match(read('sw.js'),/const VERSION='lhb-v66'/);});

test('v28: splash con La Ruta del Tabaco, eslogan y flor',()=>{const ix=read('index.html');const m=ix.match(/<div class="splash"[\s\S]*?<div class="campo"/);assert.ok(m);const txt=m[0].replace(/<[^>]+>/g,'').replace(/\s+/g,' ');assert.ok(txt.includes('La Ruta del Tabaco en Puerto Rico'));assert.ok(txt.includes('Cigarros de Puerto Rico'));assert.ok(m[0].includes('La Ruta <em>del Tabaco</em>'));assert.ok(m[0].includes('id="splashFlor"'));assert.ok(read('app.js').includes("VBArt.flor('sf')"));assert.match(read('sw.js'),/const VERSION='lhb-v66'/);});

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
 const hj=read('hoja.js');assert.match(hj,/async function api\(C,method,path,body,uid,extra\)\{const t=await C\.session\.getToken\(\);if\(uid&&\(!C\.user\|\|C\.user\.id!==uid\)\)throw new Error\('account-changed'\)/,'el adaptador se niega si la sesión ya es de otra cuenta');
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
 assert.ok(read('hoja.js').includes('ui:{card:accountCard,notice:accountNotice,onboarding:(submit,picture,check)=>onboardingForm(submit,picture,undefined,undefined,check),identity:submit=>onboardingForm(submit,null,\'identity\'),edit:(prof,submit,picture,check)=>onboardingForm(submit,picture,\'edit\',prof,check),toast,closeAll:closeSheetNow}'),'hoja.js pasa el aviso sobre la página');
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
 const timers=[];let tid=0;
 const ctx={view,$,A:{resizeImage:resize||(async f=>({blob:f.name}))},D:()=>({artesanos:[]}),esc:s=>s,document:{createElement:()=>({})},File:FakeFile,
  setTimeout:(fn,ms)=>{timers.push({id:++tid,fn,ms});return tid},clearTimeout:id=>{const i=timers.findIndex(x=>x.id===id);if(i>=0)timers.splice(i,1)}};
 /* un reloj fijo para el formulario (new Date() sin argumentos); con argumentos, el Date de siempre */
 if(opts.now){const RD=Date;ctx.Date=class extends RD{constructor(...a){if(a.length)super(...a);else super(opts.now)}}}
 vm.createContext(ctx);vm.runInContext(code+';this.onboardingForm=onboardingForm;this.OB_ERR=OB_ERR;this.idProblem=idProblem',ctx);
 ctx.onboardingForm(submit,picture,opts.mode,opts.init,opts.check);
 const pick=f=>ctx.$('#obPf').onchange({target:{files:[f],value:'x'}});
 /* send llena el formulario (nombre, apellido, género y fecha; el @ solo en el formulario nuevo) y lo envía; lo que no se da, se llena con una identidad válida */
 const send=(v={})=>{if(opts.mode!=='identity')ctx.$('#obH').value=v.handle===undefined?'ana':v.handle;
  ctx.$('#obFn').value=v.first===undefined?'Ana':v.first;ctx.$('#obLn').value=v.last===undefined?'Mora':v.last;
  const g=v.gender===undefined?'F':v.gender;ctx.$('#obGM').checked=g==='M';ctx.$('#obGF').checked=g==='F';ctx.$('#obD').value=v.birth===undefined?'1990-05-17':v.birth;
  return ctx.$('#obForm').onsubmit({preventDefault(){}})};
 const state=()=>({go:ctx.$('#obGo').disabled,pb:ctx.$('#obPb').disabled,err:ctx.$('#obErr').hidden?'':ctx.$('#obErr').textContent,hint:ctx.$('#obPh').textContent,img:ctx.$('#obPv').children[0]&&ctx.$('#obPv').children[0].src});
 /* LHB-63: escribir en el @ y avanzar el reloj de mentira (fire corre el aviso pendiente, si lo hay) */
 const type=v=>{ctx.$('#obH').value=v;ctx.$('#obH').oninput()};const fire=async()=>{const x=timers.shift();if(x)x.fn();await tick();return !!x};
 const hs=()=>({text:ctx.$('#obHs').textContent,cls:ctx.$('#obHs').className});
 return {ctx,$:ctx.$,pick,send,state,html:()=>html,idProblem:ctx.idProblem,remount:()=>ctx.onboardingForm(submit,picture,opts.mode,opts.init,opts.check),OB:ctx.OB_ERR,type,fire,hs,timers};
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
 assert.ok(h.includes('function onboardingForm(submit,picture,mode,init,check){'),'el formulario recibe la foto (y, desde LHB-52, el modo)');
 assert.ok(h.includes('<input type="file" accept="image/*" id="obPf" class="sr" tabindex="-1">'),'solo imágenes');
 const i=h.indexOf('function onboardingForm'),form=h.slice(i,h.indexOf('\nconst CUENTA=',i));
 assert.ok(form.includes("A.resizeImage(f,512,.85)")&&form.includes("picture.upload(new File([b],'perfil.jpg',{type:'image/jpeg'}))"),'se achica antes de subir');
 const a=form.indexOf("picture.url())return err(OB_ERR['avatar-required'])");assert.ok(a>0&&a<form.indexOf('HANDLE_RE.test(h))return err('),'la foto se pide primero al enviar');
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
 assert.match(read('sw.js'),/const VERSION='lhb-v66'/,'el shell nuevo se publica con otra versión del caché');
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
 const sw=read('sw.js');assert.match(sw,/const VERSION='lhb-v66'/);
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
 assert.ok(h.includes('edit:(prof,submit,picture,check)=>onboardingForm(submit,picture,\'edit\',prof,check)'));
 assert.ok(pf.includes("Object.prototype.hasOwnProperty.call(it.body, 'avatar_url')) return editProfile(it, env)"),'PUT con la foto es editar; sin ella es completar la identidad');
 assert.match(read('sw.js'),/const VERSION='lhb-v66'/,'el shell nuevo se publica con otra versión del caché');
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

/* ===================== LHB-56: seguir (una vía, sin aprobación): la tabla, seguir y dejar de seguir, listas y conteos ===================== */
async function API56(){
 const a=await API52();a.db.exec('PRAGMA foreign_keys=ON');a.db.exec(a.mig('0004_follows.sql'));
 const F=await a.imp('api/follow.js'),FS=await a.imp('api/followers.js'),FG=await a.imp('api/following.js'),FL=await a.imp('_lib/follow.js');
 const rq=(token,body,o)=>{o=o||{};return {url:o.url||'https://x.test/api/follow',headers:{get:h=>({Authorization:token?'Bearer '+token:null,'Content-Type':o.type||'application/json'})[h]??null},json:async()=>typeof body==='string'?JSON.parse(body):body}};
 const call=async(fn,token,body,o,e)=>{const r=await fn({request:rq(token,body,o),env:e||a.env});return [r.status,await r.json()]};
 const tks={};const tk=async u=>tks[u]||(tks[u]=await a.tok(u));
 /* un perfil por SQL (rápido, para muchos); la identidad de prueba es siempre la misma */
 const mk=(u,handle,extra)=>{extra=extra||{};a.db.prepare("INSERT INTO profiles (user_id,handle,display_name,avatar_key,first_name,last_name,gender,birth_date,hidden,age_ok_at,created_at,updated_at) VALUES (?1,?2,?3,?4,'Ana','Secreta','F','1990-05-17',?5,'2026-10-26T00:00:00.000Z','2026-10-26T00:00:00.000Z','2026-10-26T00:00:00.000Z')").run(u,handle,extra.name||(handle+' S.'),AV,extra.hidden?1:0)};
 const fol=(from,to,at)=>a.db.prepare('INSERT INTO follows (follower_id,followee_id,created_at) VALUES (?1,?2,?3)').run(from,to,at);
 const rows=()=>a.db.prepare('SELECT follower_id,followee_id,created_at FROM follows ORDER BY follower_id,followee_id').all().map(r=>({...r}));
 return {...a,F,FS,FG,FL,tk,mk,fol,rows,
  follow:async(u,handle,e)=>call(F.onRequestPost,await tk(u),{handle},null,e),unfollow:async(u,handle)=>call(F.onRequestDelete,await tk(u),{handle}),
  state:async(handle,u)=>call(F.onRequestGet,u?await tk(u):null,undefined,{url:'https://x.test/api/follow?handle='+encodeURIComponent(handle)}),
  list:async(dir,handle,cursor)=>call((dir==='followers'?FS:FG).onRequestGet,null,undefined,{url:'https://x.test/api/'+dir+'?handle='+encodeURIComponent(handle)+(cursor?'&cursor='+encodeURIComponent(cursor):'')}),
  raw:(fn,token,body,o)=>call(fn,token,body,o)}}
const SECRETOS56=['Secreta','1990-05-17','"F"','user_','birth_date','gender','last_name','first_name'];
test('LHB-56: la migración 0004 crea follows con llave del par, sin seguirse a uno mismo, con índices por los dos lados y sin tocar lo que ya había',async()=>{
 const a=await API52();
 try{
  a.db.exec('PRAGMA foreign_keys=ON');
  a.db.prepare("INSERT INTO profiles (user_id,handle,display_name,age_ok_at,created_at,updated_at) VALUES ('u1','uno','Uno','x','x','x'),('u2','dos','Dos','x','x','x')").run();
  const antes=a.db.prepare('SELECT * FROM profiles ORDER BY user_id').all().map(r=>({...r}));
  a.db.exec(a.mig('0004_follows.sql'));
  assert.deepEqual(a.db.prepare('SELECT * FROM profiles ORDER BY user_id').all().map(r=>({...r})),antes,'las filas que ya había no cambian');assert.equal(a.db.prepare('SELECT COUNT(*) n FROM follows').get().n,0,'la tabla nueva nace vacía');
  const cols=a.db.prepare('PRAGMA table_info(follows)').all();assert.deepEqual(cols.map(c=>c.name),['follower_id','followee_id','created_at']);for(const c of cols)assert.equal(c.notnull,1,c.name+' no admite null');
  assert.deepEqual(cols.filter(c=>c.pk).map(c=>c.name).sort(),['followee_id','follower_id'],'la llave es el par');
  const idx=a.db.prepare('PRAGMA index_list(follows)').all().map(i=>i.name);assert.ok(idx.includes('follows_by_followee')&&idx.includes('follows_by_follower'),'índices por los dos lados');
  const ecols=a.db.prepare('PRAGMA table_info(follow_events)').all();assert.deepEqual(ecols.map(c=>c.name),['follower_id','created_at'],'el registro de seguidas nuevas');for(const c of ecols)assert.equal(c.notnull,1,c.name+' no admite null');assert.ok(a.db.prepare('PRAGMA index_list(follow_events)').all().map(i=>i.name).includes('follow_events_by_follower'));
  /* Codex ronda 2: la fila y su registro nacen juntos (disparador), y no hay otra via */
  assert.deepEqual(a.db.prepare("SELECT name FROM sqlite_master WHERE type='trigger'").all().map(r=>r.name),['follows_event'],'el disparador que anota cada seguir nuevo');
  const ins=(x,y)=>a.db.prepare("INSERT INTO follows (follower_id,followee_id,created_at) VALUES (?1,?2,'x')").run(x,y);
  ins('u1','u2');assert.throws(()=>ins('u1','u2'),/UNIQUE|constraint/i,'el mismo par no se repite');assert.doesNotThrow(()=>ins('u2','u1'),'el par al revés es otra fila');
  assert.throws(()=>ins('u1','u1'),/CHECK|constraint/i,'nadie se sigue a sí mismo ni por SQL');assert.throws(()=>ins('u1','nadie'),/FOREIGN|constraint/i,'ni se sigue a un perfil que no existe');
  assert.throws(()=>a.db.prepare("INSERT INTO follows (follower_id,followee_id) VALUES ('u1','u2')").run(),/NOT NULL|constraint/i);
 }finally{a.done()}
});
test('LHB-56: seguir y dejar de seguir en SQLite real: una vía, idempotente, y cada rechazo no deja nada',async()=>{
 const a=await API56();
 try{
  a.mk('u_ana','ana');a.mk('u_bea','bea');a.mk('u_oculta','oculta',{hidden:true});a.mk('u_cami','cami');
  a.freeze('2026-10-27T10:00:00.000Z');
  /* seguir: crea la fila del par en un solo sentido y devuelve el conteo de seguidores de la otra persona */
  assert.deepEqual(await a.follow('u_ana','bea'),[200,{following:true,followers:1}]);
  assert.deepEqual(a.rows(),[{follower_id:'u_ana',followee_id:'u_bea',created_at:'2026-10-27T10:00:00.000Z'}],'una vía: ana sigue a bea, bea no sigue a ana');
  /* idempotente: repetirlo no cambia nada, ni la fecha */
  a.freeze('2026-10-27T11:00:00.000Z');assert.deepEqual(await a.follow('u_ana','bea'),[200,{following:true,followers:1}]);assert.equal(a.rows().length,1);assert.equal(a.rows()[0].created_at,'2026-10-27T10:00:00.000Z','seguir otra vez no cambia la fecha');
  assert.deepEqual(await a.follow('u_ana','BEA'),[200,{following:true,followers:1}],'el @ en mayúsculas es el mismo');
  /* seguir de vuelta es otra fila, no una amistad aprobada */
  assert.deepEqual(await a.follow('u_bea','ana'),[200,{following:true,followers:1}]);assert.equal(a.rows().length,2);
  /* dejar de seguir: quita la fila, y repetirlo no falla */
  assert.deepEqual(await a.unfollow('u_ana','bea'),[200,{following:false,followers:0}]);assert.equal(a.rows().length,1);assert.deepEqual(await a.unfollow('u_ana','bea'),[200,{following:false,followers:0}],'dejar de seguir dos veces es lo mismo');assert.equal(a.rows().length,1);
  /* los rechazos no dejan filas */
  const antes=a.rows();
  assert.deepEqual(await a.follow('u_ana','ana'),[400,{error:'self-follow'}],'no se sigue a uno mismo');
  assert.deepEqual(await a.follow('u_ana','oculta'),[404,{error:'not-found'}],'ni a un perfil oculto');
  assert.deepEqual(await a.follow('u_ana','nadie_asi'),[404,{error:'not-found'}],'ni a uno que no existe');
  for(const h of ['ab','admin','ana mora','',undefined,null,42,{},['ana'],'a'.repeat(21)])assert.deepEqual(await a.follow('u_ana',h),[404,{error:'not-found'}],'@ que no puede existir: '+JSON.stringify(h));
  assert.deepEqual(a.rows(),antes,'ningún rechazo dejó una fila');
  /* quien dejó de seguir a alguien que luego se ocultó: se puede; a uno que no existe, no */
  assert.deepEqual(await a.follow('u_cami','bea'),[200,{following:true,followers:1}]);a.db.prepare("UPDATE profiles SET hidden=1 WHERE user_id='u_bea'").run();
  assert.deepEqual(await a.unfollow('u_cami','bea'),[200,{following:false}],'dejar de seguir a un perfil oculto se puede, y no sale su conteo');assert.equal(a.rows().filter(r=>r.follower_id==='u_cami').length,0);
  assert.deepEqual(await a.unfollow('u_cami','nadie_asi'),[404,{error:'not-found'}]);
  /* Codex ronda 1: quien nunca siguio a un perfil oculto no puede saber ni que existe ni cuantos lo siguen: igual que un @ que no existe */
  assert.deepEqual(await a.unfollow('u_cami','bea'),[404,{error:'not-found'}],'ya no lo sigue: para cami el perfil oculto no existe');assert.deepEqual(await a.unfollow('u_ana','bea'),[404,{error:'not-found'}],'ana nunca lo siguio');
  /* el que no tiene perfil, la sesión, el JSON */
  const tkC=await a.tok('u_sinperfil');
  assert.deepEqual(await a.raw(a.F.onRequestPost,tkC,{handle:'ana'}),[403,{error:'no-profile'}],'sin perfil no se sigue');assert.deepEqual(await a.raw(a.F.onRequestPost,null,{handle:'ana'}),[401,{error:'no-session'}]);assert.deepEqual(await a.raw(a.F.onRequestDelete,null,{handle:'ana'}),[401,{error:'no-session'}]);
  const tkA=await a.tk('u_ana');
  assert.deepEqual(await a.raw(a.F.onRequestPost,tkA,{handle:'bea'},{type:'text/plain'}),[415,{error:'bad-type'}]);assert.deepEqual(await a.raw(a.F.onRequestPost,tkA,'{no es json'),[400,{error:'bad-body'}]);for(const b of [null,[],'x',42])assert.deepEqual(await a.raw(a.F.onRequestPost,tkA,b),[400,{error:'bad-body'}],JSON.stringify(b));
  assert.deepEqual(a.rows().filter(r=>r.follower_id==='u_ana'),[],'ana no tiene filas tras tanto rechazo');assert.equal(a.rows().length,1,'solo queda la de bea hacia ana');
  /* la lectura pública del estado de ana: bea la sigue pero se ocultó, así que ya no cuenta */
  assert.deepEqual(await a.raw(a.F.onRequestGet,null,undefined,{url:'https://x.test/api/follow?handle=ana'}),[200,{handle:'ana',display_name:'ana S.',avatar_key:AV,followers:0,following:0,self:false,viewerFollows:null}]);
 }finally{a.done()}
});
test('LHB-56: los conteos salen de la tabla y solo cuentan perfiles visibles; GET dice si yo lo sigo; nada privado sale en ninguna respuesta',async()=>{
 const a=await API56();
 try{
  a.mk('u_ana','ana');a.mk('u_bea','bea');a.mk('u_cami','cami');a.mk('u_oculta','oculta',{hidden:true});
  const T='2026-10-27T10:00:00.000Z';
  a.fol('u_bea','u_ana',T);a.fol('u_cami','u_ana',T);a.fol('u_oculta','u_ana',T);a.fol('u_ana','u_bea',T);a.fol('u_ana','u_oculta',T);
  /* ana: la siguen bea y cami (la oculta no cuenta); ana sigue a bea (a la oculta no cuenta) */
  let [st,s]=await a.state('ana');assert.equal(st,200);assert.deepEqual(s,{handle:'ana',display_name:'ana S.',avatar_key:AV,followers:2,following:1,self:false,viewerFollows:null},'sin sesión: los conteos y viewerFollows nulo');
  /* los conteos se mueven con la tabla, no con un número guardado */
  a.fol('u_cami','u_bea',T);[,s]=await a.state('bea');assert.equal(s.followers,2);a.db.prepare("DELETE FROM follows WHERE follower_id='u_cami'").run();[,s]=await a.state('bea');assert.equal(s.followers,1,'borrar filas baja el conteo sin tocar nada más');
  /* con sesión: si yo la sigo, si soy yo */
  [,s]=await a.state('ana','u_bea');assert.deepEqual([s.viewerFollows,s.self],[true,false],'bea sigue a ana');[,s]=await a.state('ana','u_cami');assert.deepEqual([s.viewerFollows,s.self],[false,false]);[,s]=await a.state('ana','u_ana');assert.deepEqual([s.viewerFollows,s.self],[null,true],'yo mismo: ni sigo ni dejo de seguir');
  /* una sesión inválida no rompe la lectura pública */
  assert.deepEqual((await a.raw(a.F.onRequestGet,'basura.basura.basura',undefined,{url:'https://x.test/api/follow?handle=ana'}))[1].viewerFollows,null,'un token malo se lee como sin sesión');
  /* ocultos y desconocidos: 404; los conteos de una persona oculta no se publican */
  assert.deepEqual(await a.state('oculta'),[404,{error:'not-found'}]);assert.deepEqual(await a.state('nadie_asi'),[404,{error:'not-found'}]);assert.deepEqual(await a.state(''),[404,{error:'not-found'}]);
  /* nada privado en ninguna respuesta: ni apellido, ni fecha, ni género, ni user_id */
  const todo=JSON.stringify([await a.state('ana'),await a.state('ana','u_bea'),await a.follow('u_cami','ana'),await a.unfollow('u_cami','ana'),await a.list('followers','ana'),await a.list('following','ana')]);
  for(const s2 of SECRETOS56)assert.ok(!todo.includes(s2),'ninguna respuesta trae '+s2);
 }finally{a.done()}
});
test('LHB-56: las listas van con cursor, las más nuevas primero, sin repetir ni saltar a nadie, solo con lo público y sin perfiles ocultos',async()=>{
 const a=await API56();
 try{
  a.mk('u_ana','ana');a.mk('u_oculta','oculta',{hidden:true});
  /* 45 seguidoras: las fechas se repiten de tres en tres para probar el desempate por @ */
  const hs=[];for(let i=0;i<45;i++){const h='fan'+String(i).padStart(2,'0');hs.push(h);a.mk('u_'+h,h);a.fol('u_'+h,'u_ana','2026-10-27T10:'+String(10+Math.floor(i/3)).padStart(2,'0')+':00.000Z')}
  a.fol('u_oculta','u_ana','2026-10-27T23:00:00.000Z');
  const esperado=[...hs].sort((x,y)=>{const fx=Math.floor(+x.slice(3)/3),fy=Math.floor(+y.slice(3)/3);return fy-fx||(x<y?1:-1)});
  const vistos=[];let cur=null,paginas=0;
  for(;;){const [st,r]=await a.list('followers','ana',cur);assert.equal(st,200);paginas++;assert.deepEqual(Object.keys(r).sort(),['next','people']);for(const p of r.people){assert.deepEqual(Object.keys(p).sort(),['avatar_key','display_name','handle'],'solo lo público de cada persona');vistos.push(p.handle)}
   if(!r.next){assert.ok(r.people.length<=20);break}assert.equal(r.people.length,20,'las páginas intermedias van llenas');cur=r.next;if(paginas>5)assert.fail('el cursor no termina')}
  assert.equal(paginas,3,'45 personas: 20, 20 y 5');assert.deepEqual(vistos,esperado,'más nuevas primero, empates por @ de mayor a menor, sin repetir ni saltar');assert.ok(!vistos.includes('oculta'),'la persona oculta no sale');assert.equal(new Set(vistos).size,45);
  /* una página justa de 20: no promete otra */
  a.db.prepare("DELETE FROM follows WHERE follower_id IN (SELECT user_id FROM profiles WHERE handle >= 'fan20' AND handle LIKE 'fan%')").run();
  const [,p1]=await a.list('followers','ana');assert.equal(p1.people.length,20);assert.equal(p1.next,null,'exactamente 20: no hay página siguiente');
  /* hacia el otro lado: a quién sigue ana, también con cursor */
  for(let i=0;i<25;i++){a.mk('u_f'+i,'seguido'+String(i).padStart(2,'0'));a.fol('u_ana','u_f'+i,'2026-10-27T12:'+String(10+i).padStart(2,'0')+':00.000Z')}
  const [,g1]=await a.list('following','ana');assert.equal(g1.people.length,20);assert.equal(g1.people[0].handle,'seguido24','la más nueva primero');assert.ok(g1.next);const [,g2]=await a.list('following','ana',g1.next);assert.equal(g2.people.length,5);assert.equal(g2.next,null);assert.equal(g2.people[4].handle,'seguido00');
  /* un cursor malo, nunca SQL */
  for(const c of ['x','2026-10-27~ana',"2026-10-27T10:00:00.000Z~ana' OR '1'='1",'2026-10-27T10:00:00.000Z~','~ana','2026-10-27T10:00:00.000Z~AN;DROP TABLE follows'])assert.deepEqual(await a.list('followers','ana',c),[400,{error:'bad-cursor'}],JSON.stringify(c));
  assert.equal(a.db.prepare('SELECT COUNT(*) n FROM follows').get().n>0,true,'la tabla sigue ahí');
  /* un perfil oculto o inexistente no tiene listas */
  a.fol('u_ana','u_oculta','2026-10-27T13:00:00.000Z');for(const d of ['followers','following']){assert.deepEqual(await a.list(d,'oculta'),[404,{error:'not-found'}],d+' de un perfil oculto');assert.deepEqual(await a.list(d,'nadie_asi'),[404,{error:'not-found'}]);assert.deepEqual(await a.list(d,''),[404,{error:'not-found'}])}
  /* una persona que se oculta después desaparece de las listas de los demás */
  a.db.prepare("UPDATE profiles SET hidden=1 WHERE handle='fan05'").run();const todos=[];let c2=null;for(let i=0;i<4;i++){const [,r]=await a.list('followers','ana',c2);todos.push(...r.people.map(p=>p.handle));if(!r.next)break;c2=r.next}assert.ok(!todos.includes('fan05'),'fan05 se ocultó: ya no sale');
  /* nada privado */
  const sc=JSON.stringify([await a.list('followers','ana'),await a.list('following','ana'),g1,g2]);for(const s of SECRETOS56)assert.ok(!sc.includes(s),'las listas no traen '+s);
 }finally{a.done()}
});
test('LHB-56: los topes de prueba: por hora y en total; repetir un seguir ya hecho no gasta tope; dejar de seguir no reinicia el tope; los de hace más de una hora no cuentan',async()=>{
 const a=await API56();
 try{
  a.mk('u_ana','ana');a.freeze('2026-10-27T10:00:00.000Z');
  const FL=a.FL;assert.deepEqual([FL.FOLLOW_PER_HOUR,FL.FOLLOW_MAX],[60,5000],'los topes de prueba documentados');
  const evs=u=>a.db.prepare('SELECT COUNT(*) n FROM follow_events WHERE follower_id=?1').get(u).n;
  for(let i=0;i<60;i++){a.mk('u_p'+i,'persona'+String(i).padStart(2,'0'));a.fol('u_ana','u_p'+i,'2026-10-27T09:30:00.000Z')}assert.equal(evs('u_ana'),60,'cada fila nueva anota un renglon (disparador)');
  a.mk('u_nueva','nueva');
  assert.deepEqual(await a.follow('u_ana','nueva'),[429,{error:'follow-rate'}],'60 en la última hora: el 61 espera');assert.equal(a.rows().filter(r=>r.followee_id==='u_nueva').length,0);assert.equal(evs('u_ana'),60,'un rechazo no anota nada');
  assert.deepEqual(await a.follow('u_ana','persona03'),[200,{following:true,followers:1}],'repetir uno ya hecho no gasta tope');assert.equal(evs('u_ana'),60,'ni anota');
  /* Codex ronda 1: dejar de seguir no libera cupo por hora (si no, seguir y dejar de seguir se repetiria sin limite) */
  assert.deepEqual(await a.unfollow('u_ana','persona03'),[200,{following:false,followers:0}],'dejar de seguir no tiene tope');
  assert.deepEqual(await a.follow('u_ana','nueva'),[429,{error:'follow-rate'}],'dejar de seguir no reinicia el tope por hora');
  /* la ventana es de una hora: a los 59 minutos todavia cuenta, a los 61 ya no */
  a.freeze('2026-10-27T10:29:00.000Z');assert.deepEqual(await a.follow('u_ana','nueva'),[429,{error:'follow-rate'}],'a los 59 minutos todavia cuenta');
  a.freeze('2026-10-27T10:31:00.000Z');assert.deepEqual(await a.follow('u_ana','nueva'),[200,{following:true,followers:1}],'pasada la hora los de antes ya no cuentan');
  assert.equal(evs('u_ana'),1,'los de mas de una hora se podan y queda el nuevo');
  /* el tope total */
  for(let i=0;i<5000;i++){const u='u_m'+i;a.db.prepare("INSERT INTO profiles (user_id,handle,age_ok_at,created_at,updated_at) VALUES (?1,?2,'x','x','x')").run(u,'masa'+i);}
  a.db.exec('BEGIN');for(let i=0;i<4998;i++)a.fol('u_ana','u_m'+i,'2026-10-20T00:00:00.000Z');a.db.exec('COMMIT');
  a.db.exec("DELETE FROM follows WHERE follower_id='u_ana' AND followee_id LIKE 'u_p%'");const n2=a.db.prepare("SELECT COUNT(*) n FROM follows WHERE follower_id='u_ana'").get().n;assert.equal(n2,4999,'4998 de masa mas nueva');
  assert.deepEqual(await a.follow('u_ana','masa4999'),[200,{following:true,followers:1}],'el 5000 todavía cabe');
  assert.deepEqual(await a.follow('u_ana','persona00'),[429,{error:'follow-cap'}],'el 5001 no');
  assert.deepEqual(await a.follow('u_ana','masa4999'),[200,{following:true,followers:1}],'y repetir uno ya hecho sigue valiendo en el tope');
 }finally{a.done()}
});
/* un DB que, justo despues de preguntar si ya se seguia, deja pasar a un pedido competidor (lo que hace otro Worker a la vez) */
const RACING56=(a,hook)=>({...a.env,DB:{prepare:s=>{const st=a.env.DB.prepare(s);if(!/SELECT 1 AS n FROM follows WHERE follower_id = \?1 AND followee_id = \?2/.test(s))return st;
 return {bind:(...x)=>{const q=st.bind(...x);return {first:async()=>{const r=await q.first();if(hook){const h=hook;hook=null;h()}return r},all:q.all.bind(q),run:q.run.bind(q)}}}}}});
test('LHB-56 (Codex ronda 1): los topes se cumplen aunque otro pedido de la misma cuenta llegue entre la revisión y la escritura',async()=>{
 const a=await API56();
 try{
  a.mk('u_ana','ana');a.mk('u_nueva','nueva');a.mk('u_otra','otra');a.freeze('2026-10-27T10:00:00.000Z');
  const prof=(u,h)=>a.db.prepare("INSERT INTO profiles (user_id,handle,age_ok_at,created_at,updated_at) VALUES (?1,?2,'x','x','x')").run(u,h);
  /* por hora: 59 seguidas en la ultima hora y el competidor sigue a la 60 antes que este pedido */
  for(let i=0;i<60;i++)prof('u_h'+i,'hora'+i);
  for(let i=0;i<59;i++)a.fol('u_ana','u_h'+i,'2026-10-27T09:45:00.000Z');
  let r=await a.follow('u_ana','nueva',RACING56(a,()=>a.fol('u_ana','u_h59','2026-10-27T09:59:59.000Z')));
  assert.deepEqual(r,[429,{error:'follow-rate'}],'el competidor tomó el ultimo cupo por hora: este no pasa');assert.equal(a.rows().filter(x=>x.followee_id==='u_nueva').length,0,'y no deja fila');
  a.db.exec("DELETE FROM follows WHERE follower_id='u_ana'");a.db.exec("DELETE FROM follow_events");
  /* total: 4999 seguidas y el competidor sigue a la 5000 antes que este pedido */
  for(let i=0;i<5000;i++)prof('u_m'+i,'masa'+i);
  a.db.exec('BEGIN');for(let i=0;i<4999;i++)a.fol('u_ana','u_m'+i,'2026-10-20T00:00:00.000Z');a.db.exec('COMMIT');
  r=await a.follow('u_ana','nueva',RACING56(a,()=>a.fol('u_ana','u_m4999','2026-10-27T09:59:59.000Z')));
  assert.deepEqual(r,[429,{error:'follow-cap'}],'el competidor tomó el ultimo lugar: este no pasa');assert.equal(a.db.prepare("SELECT COUNT(*) n FROM follows WHERE follower_id='u_ana'").get().n,5000,'nunca 5001');
  /* y si el competidor era el MISMO pedido (doble toque), el segundo es solo un seguir ya hecho */
  a.db.exec("DELETE FROM follows WHERE follower_id='u_ana'");a.db.exec("DELETE FROM follow_events");
  r=await a.follow('u_ana','otra',RACING56(a,()=>a.fol('u_ana','u_otra','2026-10-27T09:59:59.000Z')));
  assert.deepEqual(r,[200,{following:true,followers:1}],'un doble toque no es un error');assert.equal(a.rows().filter(x=>x.followee_id==='u_otra').length,1);
 }finally{a.done()}
});
test('LHB-56 (Codex ronda 2): un seguir repetido o rechazado por el tope total no gasta cupo por hora',async()=>{
 const a=await API56();
 try{
  a.mk('u_ana','ana');a.mk('u_otra','otra');a.mk('u_nueva','nueva');a.freeze('2026-10-27T10:00:00.000Z');
  const evs=()=>a.db.prepare("SELECT COUNT(*) n FROM follow_events WHERE follower_id='u_ana'").get().n;
  /* dos pedidos iguales a la vez: un solo seguir y un solo renglon, y el segundo no es un error */
  let r=await a.follow('u_ana','otra',RACING56(a,()=>a.fol('u_ana','u_otra','2026-10-27T09:59:59.000Z')));
  assert.deepEqual(r,[200,{following:true,followers:1}],'el doble toque contesta bien');assert.equal(a.rows().filter(x=>x.followee_id==='u_otra').length,1);assert.equal(evs(),1,'un seguir, un renglon (el del competidor); el segundo pedido no anota otro');
  assert.deepEqual(await a.follow('u_ana','otra'),[200,{following:true,followers:1}]);assert.equal(evs(),1,'repetirlo despues tampoco anota');
  /* 5000 seguidas (las demas viejas) y 65 intentos rechazados por el tope total: no gastan cupo por hora */
  for(let i=0;i<5000;i++)a.db.prepare("INSERT INTO profiles (user_id,handle,age_ok_at,created_at,updated_at) VALUES (?1,?2,'x','x','x')").run('u_m'+i,'masa'+i);
  a.db.exec('BEGIN');for(let i=0;i<4999;i++)a.fol('u_ana','u_m'+i,'2026-10-20T00:00:00.000Z');a.db.exec('COMMIT');
  a.db.exec("DELETE FROM follow_events WHERE created_at < '2026-10-27'");assert.equal(evs(),1,'queda el renglon de hoy');
  for(let i=0;i<65;i++)assert.deepEqual(await a.follow('u_ana','nueva'),[429,{error:'follow-cap'}],'el tope total rechaza, intento '+i);
  assert.equal(evs(),1,'65 rechazos por el tope total no anotaron nada');assert.equal(a.rows().filter(x=>x.followee_id==='u_nueva').length,0);
  /* dejar de seguir a uno libera lugar en el tope total, y el seguir legitimo pasa (no hay follow-rate) */
  assert.deepEqual(await a.unfollow('u_ana','masa0'),[200,{following:false,followers:0}]);
  assert.deepEqual(await a.follow('u_ana','nueva'),[200,{following:true,followers:1}],'tras 65 rechazos un seguir legitimo pasa');assert.equal(evs(),2);
 }finally{a.done()}
});
test('LHB-56: borrar un perfil borra sus filas de los dos lados, y los conteos de los demás bajan con la tabla',async()=>{
 const a=await API56();
 try{
  a.mk('u_ana','ana');a.mk('u_bea','bea');a.mk('u_cami','cami');const T='2026-10-27T10:00:00.000Z';
  a.fol('u_ana','u_bea',T);a.fol('u_bea','u_ana',T);a.fol('u_cami','u_bea',T);a.fol('u_bea','u_cami',T);a.fol('u_ana','u_cami',T);
  assert.equal(a.rows().length,5);
  a.db.prepare("DELETE FROM profiles WHERE user_id='u_bea'").run();
  assert.deepEqual(a.rows().map(r=>r.follower_id+'>'+r.followee_id),['u_ana>u_cami'],'ninguna fila de bea, ni como quien sigue ni como seguida');
  assert.equal((await a.state('cami'))[1].followers,1);assert.equal((await a.state('ana'))[1].followers,0,'ana ya no tiene a bea entre sus seguidoras');
  assert.deepEqual(await a.follow('u_ana','bea'),[404,{error:'not-found'}],'y no se puede seguir al perfil borrado');
  /* la cascada necesita llaves foráneas activas; el SQL de la tabla las declara con ON DELETE CASCADE por los dos lados */
  const sql=a.mig('0004_follows.sql');assert.equal((sql.match(/REFERENCES profiles\(user_id\) ON DELETE CASCADE/g)||[]).length,3,'follows por los dos lados y el registro de seguidas nuevas');
  a.mk('u_dani','dani');a.db.prepare("INSERT INTO follow_events (follower_id,created_at) VALUES ('u_dani','2026-10-27T10:00:00.000Z')").run();a.db.prepare("DELETE FROM profiles WHERE user_id='u_dani'").run();assert.equal(a.db.prepare("SELECT COUNT(*) n FROM follow_events WHERE follower_id='u_dani'").get().n,0,'borrar el perfil borra su registro de seguidas');
 }finally{a.done()}
});
test('LHB-56: la regla de bloqueo ya está en su sitio (no hace nada hasta LHB-62), y el código no lee ni escribe nada privado',async()=>{
 const a=await API56();
 try{
  assert.equal(await a.FL.isBlocked(a.DB,'u_a','u_b'),false,'hasta que lleguen los bloqueos ningún par está bloqueado');
  const src=fs.readFileSync(path.join(__dirname,'..','functions','api','follow.js'),'utf8');
  assert.ok(src.includes("if (await isBlocked(env.DB, me, who.user_id)) return json({ error: 'blocked' }, 403);"),'seguir pregunta por el bloqueo y contesta 403 blocked');
  assert.ok(src.indexOf('isBlocked(env.DB')<src.indexOf('INSERT INTO follows'),'el bloqueo se pregunta antes de escribir');
  /* ningún archivo de seguir selecciona la fecha de nacimiento, el género ni el apellido */
  for(const f of ['_lib/follow.js','api/follow.js','api/followers.js','api/following.js'])assert.ok(!/birth_date|gender|last_name|first_name/.test(fs.readFileSync(path.join(__dirname,'..','functions',...f.split('/')),'utf8').replace(/\/\*[\s\S]*?\*\//g,'').replace(/^\s*\/\/.*$/gm,'')),f+' no toca datos privados');
 }finally{a.done()}
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
 assert.match(read('sw.js'),/const VERSION='lhb-v66'/,'el shell nuevo se publica con otra versión del caché');
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

/* ---------- LHB-63: el @ libre, mientras se escribe ---------- */
async function API63(opts){opts=opts||{};
 const a=await API52();if(!opts.sin0005)a.db.exec(a.mig('0005_handle_checks.sql'));
 const H=await a.imp('api/handle.js');const tks={};const tk=async u=>tks[u]||(tks[u]=await a.tok(u));
 const mk=(u,handle,hidden)=>a.db.prepare("INSERT INTO profiles (user_id,handle,display_name,age_ok_at,created_at,updated_at,hidden) VALUES (?1,?2,?3,'2026-10-26T00:00:00.000Z','2026-10-26T00:00:00.000Z','2026-10-26T00:00:00.000Z',?4)").run(u,handle,handle,hidden?1:0);
 const get=async(u,h,e)=>{const token=u?await tk(u):null;const r=await H.onRequestGet({request:{url:'https://x.test/api/handle'+(h===undefined?'':'?h='+encodeURIComponent(h)),headers:{get:k=>({Authorization:token?'Bearer '+token:null})[k]??null}},env:e||a.env});return [r.status,await r.json(),r.headers.get('Cache-Control')]};
 const checks=u=>a.db.prepare('SELECT COUNT(*) n FROM handle_checks'+(u?" WHERE user_id='"+u+"'":'')).get().n;
 return {...a,H,mk,get,checks}}
test('LHB-63: la migración 0005 crea handle_checks con su índice y no toca lo que ya había',async()=>{
 const a=await API52();
 try{
  const before=a.db.prepare("SELECT name,sql FROM sqlite_master WHERE name NOT LIKE 'sqlite_%' ORDER BY name").all().map(r=>({...r}));
  a.db.exec(a.mig('0005_handle_checks.sql'));
  const cols=a.db.prepare('PRAGMA table_info(handle_checks)').all();assert.deepEqual(cols.map(c=>c.name),['user_id','created_at']);for(const c of cols)assert.equal(c.notnull,1,c.name+' no admite null');
  assert.ok(a.db.prepare('PRAGMA index_list(handle_checks)').all().map(i=>i.name).includes('handle_checks_by_user'));
  assert.deepEqual(a.db.prepare('PRAGMA foreign_key_list(handle_checks)').all(),[],'sin llave a profiles: en el registro todavía no hay perfil');
  const after=a.db.prepare("SELECT name,sql FROM sqlite_master WHERE name NOT LIKE 'sqlite_%' ORDER BY name").all().map(r=>({...r}));
  assert.deepEqual(after.filter(r=>before.some(x=>x.name===r.name)),before,'lo anterior queda igual');assert.deepEqual(after.filter(r=>!before.some(x=>x.name===r.name)).map(r=>r.name).sort(),['handle_checks','handle_checks_by_user']);
  assert.ok(!/\u2014/.test(a.mig('0005_handle_checks.sql')),'sin raya larga');
 }finally{a.done()}
});
test('LHB-63: el @ libre, tomado, reservado o inválido, con las mismas reglas que al guardar; el tuyo sale libre; un perfil oculto cuenta como tomado',async()=>{
 const a=await API63();
 try{
  a.mk('u_ana','ana');a.mk('u_oculta','callada',true);a.mk('u_bea','bea_77');
  const R=async(h,u)=>{const [s,b,c]=await a.get(u||'u_bea',h);assert.equal(s,200,String(h));assert.equal(c,'no-store','la respuesta no se guarda (json() ya lo pone, una sola vez)');return b};
  assert.deepEqual(await R('libre_99'),{available:true});
  /* tomado, con cualquier mayúscula y con espacios de los lados (el servidor guarda minúscula y sin espacios) */
  for(const h of ['ana','ANA','Ana','  ana  ','aNa\t'])assert.deepEqual(await R(h),{available:false,reason:'taken'},JSON.stringify(h));
  /* un perfil oculto cuenta como tomado, y la respuesta es igual a la de uno visible */
  assert.deepEqual(await R('callada'),await R('ana'),'oculto y visible contestan igual');
  /* reservado: los de la lista, en cualquier mayúscula */
  for(const h of ['admin','Admin','API','catalogo','perfil'])assert.deepEqual(await R(h),{available:false,reason:'reserved'},h);
  /* inválido: corto, largo, con espacio o signos, con acentos, vacío, sin el parámetro */
  for(const h of ['ab','a'.repeat(21),'a b','ana!','ñandu','ana-x','',' ','a.b'])assert.deepEqual(await R(h),{available:false,reason:'invalid'},JSON.stringify(h));
  assert.deepEqual(await R(undefined),{available:false,reason:'invalid'},'sin parámetro');
  assert.deepEqual(await R('abc'),{available:true},'3 caracteres: el mínimo');assert.deepEqual(await R('a'.repeat(20)),{available:true},'20: el máximo');
  /* el @ que ya es tuyo sale libre, aunque lo escribas distinto; el de otro no */
  assert.deepEqual(await R('bea_77','u_bea'),{available:true});assert.deepEqual(await R('BEA_77 ','u_bea'),{available:true});assert.deepEqual(await R('ana','u_bea'),{available:false,reason:'taken'});
  /* mismo @ para quien no es dueño: tomado, y la respuesta no dice de quién */
  const [,b]=await a.get('u_ana','bea_77');assert.deepEqual(Object.keys(b).sort(),['available','reason']);assert.ok(!JSON.stringify(b).includes('u_bea'));
 }finally{a.done()}
});
test('LHB-63: sin sesión no se contesta; solo se exporta GET; sin base o sin la tabla de la migración 0005 no se inventa nada',async()=>{
 const a=await API63();
 try{
  assert.deepEqual(Object.keys(a.H).sort(),['CHECKS_PER_MINUTE','onRequestGet'],'solo lectura: ni POST, ni PUT, ni DELETE');
  assert.deepEqual((await a.get(null,'libre_99')).slice(0,2),[401,{error:'no-session'}]);
  const r=await a.H.onRequestGet({request:{url:'https://x.test/api/handle?h=libre_99',headers:{get:k=>k==='Authorization'?'Bearer basura':null}},env:a.env});assert.equal(r.status,401,'una ficha inválida tampoco');
  assert.deepEqual((await a.get('u_x','libre_99',{...a.env,DB:undefined})).slice(0,2),[503,{error:'no-db'}]);
  assert.deepEqual((await a.get('u_x','libre_99',{CLERK_ISSUERS:''})).slice(0,2),[503,{error:'no-auth-config'}]);
  /* un perfil NO hace falta: en el registro todavía no hay */
  assert.deepEqual((await a.get('u_nuevo','libre_99')).slice(0,2),[200,{available:true}]);
 }finally{a.done()}
 const b=await API63({sin0005:true});
 try{
  const [s,body,c]=await b.get('u_x','libre_99');assert.deepEqual([s,body,c],[503,{error:'unavailable'},'no-store'],'sin la tabla: no disponible, nunca "libre" inventado');
  assert.deepEqual((await b.get('u_x','ab')).slice(0,2),[200,{available:false,reason:'invalid'}],'lo que las reglas rechazan no necesita la base');
 }finally{b.done()}
});
test('LHB-63: el tope por cuenta: 30 por minuto, lo que las reglas rechazan no gasta, cada cuenta el suyo, y el minuto se vence',async()=>{
 const a=await API63();
 try{
  a.mk('u_ana','ana');a.freeze('2026-10-27T10:00:00.000Z');
  assert.equal(a.H.CHECKS_PER_MINUTE,30,'el tope de prueba documentado');
  for(let i=0;i<40;i++)assert.equal((await a.get('u_bea','!'+i)).at(0),200);/* '!0'.. no pasan las reglas: no gastan */
  assert.equal(a.checks(),0,'lo que las reglas rechazan no escribe nada');
  for(let i=0;i<30;i++)assert.deepEqual((await a.get('u_bea','libre'+i)).slice(0,2),[200,{available:true}],'revisión '+i);
  assert.equal(a.checks('u_bea'),30);
  assert.deepEqual((await a.get('u_bea','libre30')).slice(0,2),[429,{error:'handle-rate'}],'la 31 espera');assert.equal(a.checks('u_bea'),30,'un rechazo no anota nada');
  assert.deepEqual((await a.get('u_bea','ab')).slice(0,2),[200,{available:false,reason:'invalid'}],'inválido sigue contestando aunque el tope esté lleno');
  assert.deepEqual((await a.get('u_cami','libre30')).slice(0,2),[200,{available:true}],'otra cuenta tiene su propio tope');
  /* a los 59 segundos todavía cuenta; pasado el minuto, se vencen y se podan */
  a.freeze('2026-10-27T10:00:59.000Z');assert.equal((await a.get('u_bea','libre30')).at(0),429);
  a.freeze('2026-10-27T10:01:01.000Z');assert.deepEqual((await a.get('u_bea','libre30')).slice(0,2),[200,{available:true}]);assert.equal(a.checks('u_bea'),1,'los de más de un minuto se podan y queda el nuevo');
 }finally{a.done()}
});
test('LHB-63: revisar un @ no escribe ningún perfil ni toca uno que existe',async()=>{
 const a=await API63();
 try{
  a.mk('u_ana','ana');a.mk('u_bea','bea_77');const snap=()=>JSON.stringify(a.db.prepare('SELECT * FROM profiles ORDER BY user_id').all());const antes=snap();
  for(const h of ['ana','bea_77','libre_99','admin','ab'])await a.get('u_bea',h);await a.get('u_nuevo','libre_99');
  assert.equal(snap(),antes,'ningún perfil cambió ni se creó');
  const src=fs.readFileSync(path.join(__dirname,'..','functions','api','handle.js'),'utf8').replace(/\/\*[\s\S]*?\*\//,'');
  assert.deepEqual([...src.matchAll(/\b(INSERT|UPDATE|DELETE)\b[^'"]*?\b(\w+)/g)].map(m=>m[1]+' '+m[2]).sort(),['DELETE FROM','INSERT INTO'].sort(),'solo escribe en su propio contador');
  assert.ok(!/(INSERT INTO|UPDATE|DELETE FROM)\s+profiles/.test(src),'nunca escribe en profiles');
 }finally{a.done()}
});
test('LHB-63: el formulario avisa mientras se escribe: lo inválido al instante y sin pedir; lo demás 400 ms después de la última tecla; Disponible, tomado y reservado',async()=>{
 const asked=[];const ANS={v:{available:true}};
 const f=FORM_HARNESS({url:()=>AV,upload:async()=>({url:AV})},async()=>({ok:true}),undefined,{check:async h=>{asked.push(h);return ANS.v}});
 assert.match(f.html(),/<p class="hint" id="obHs" aria-live="polite"><\/p>/,'el aviso existe y se lee solo');
 /* lo que las reglas rechazan: al instante, sin reloj ni pregunta */
 f.type('an');assert.equal(f.hs().text,f.OB['handle-invalid']);assert.match(f.hs().cls,/hs-bad/);assert.equal(f.timers.length,0);assert.deepEqual(asked,[]);
 f.type('ana!');assert.equal(f.hs().text,f.OB['handle-invalid']);assert.equal(f.timers.length,0,'tampoco pregunta');
 /* uno válido: calla y pregunta 400 ms después, con el texto normalizado */
 f.type('  Ana_9 ');assert.equal(f.hs().text,'','mientras espera no dice nada');assert.equal(f.timers.length,1);assert.equal(f.timers[0].ms,400);assert.deepEqual(asked,[]);
 await f.fire();assert.deepEqual(asked,['ana_9'],'pregunta por el @ ya en minúscula y sin espacios');assert.equal(f.hs().text,'Disponible');assert.match(f.hs().cls,/hs-ok/);
 ANS.v={available:false,reason:'taken'};f.type('ana');await f.fire();assert.equal(f.hs().text,f.OB['handle-taken']);assert.match(f.hs().cls,/hs-bad/);
 ANS.v={available:false,reason:'reserved'};f.type('admin');await f.fire();assert.equal(f.hs().text,f.OB['handle-reserved']);
 /* un aviso viejo se borra en cuanto se escribe otra cosa */
 f.type('nuevo');assert.equal(f.hs().text,'','al seguir escribiendo el aviso anterior se quita');
});
test('LHB-63: el formulario espera a que se deje de escribir y solo pinta la respuesta a lo último escrito',async()=>{
 const asked=[],gates=[];
 const f=FORM_HARNESS({url:()=>AV,upload:async()=>({url:AV})},async()=>({ok:true}),undefined,{check:h=>{asked.push(h);const g=defer();gates.push(g);return g.p}});
 /* tres teclas seguidas: un solo reloj, el último */
 f.type('ana');f.type('anab');f.type('anabe');assert.equal(f.timers.length,1,'los relojes anteriores se cancelan');await f.fire();assert.deepEqual(asked,['anabe'],'se pregunta una vez, por lo último');
 /* una respuesta tardía de un texto viejo no pisa lo nuevo, llegue antes o después */
 f.type('uno');await f.fire();f.type('dos');await f.fire();assert.deepEqual(asked.slice(1),['uno','dos']);
 gates[2].ok({available:false,reason:'taken'});await tick();assert.equal(f.hs().text,f.OB['handle-taken'],'la de dos (la última) se pinta');
 gates[1].ok({available:true});await tick();assert.equal(f.hs().text,f.OB['handle-taken'],'la de uno llegó tarde y se descarta');
 const g2=[];const f2=FORM_HARNESS({url:()=>AV,upload:async()=>({url:AV})},async()=>({ok:true}),undefined,{check:h=>{const g=defer();g2.push(g);return g.p}});
 f2.type('uno');await f2.fire();f2.type('dos');await f2.fire();g2[0].ok({available:true});await tick();assert.equal(f2.hs().text,'','la de uno, antes que la de dos, tampoco se pinta');
 g2[1].ok({available:true});await tick();assert.equal(f2.hs().text,'Disponible');
 /* escribir algo inválido o borrar el campo con una pregunta en vuelo: la respuesta ya no se pinta */
 const g3=[];const f3=FORM_HARNESS({url:()=>AV,upload:async()=>({url:AV})},async()=>({ok:true}),undefined,{check:h=>{const g=defer();g3.push(g);return g.p}});
 f3.type('ana');await f3.fire();f3.type('');g3[0].ok({available:true});await tick();assert.equal(f3.hs().text,'','campo vacío: no se pinta');
 f3.type('ana');await f3.fire();f3.type('a');g3[1].ok({available:true});await tick();assert.equal(f3.hs().text,f3.OB['handle-invalid'],'queda el aviso de lo inválido, no el "Disponible" viejo');
 /* si otro formulario ocupó la pantalla, la respuesta vieja no le pinta nada */
 const g4=[];const f4=FORM_HARNESS({url:()=>AV,upload:async()=>({url:AV})},async()=>({ok:true}),undefined,{check:h=>{const g=defer();g4.push(g);return g.p}});
 f4.type('ana');await f4.fire();f4.remount();g4[0].ok({available:false,reason:'taken'});await tick();assert.equal(f4.hs().text,'','el formulario nuevo queda limpio');
});
test('LHB-63: el formulario nunca se bloquea por el aviso: fallos y respuestas raras no dicen nada, y Guardar sigue mandando (guardar revisa igual)',async()=>{
 const AVX=AV;
 for(const [quien,check] of [['lanza',async()=>{throw new Error('sin red')}],['null',async()=>null],['indefinida',async()=>undefined],['sin available',async()=>({reason:'taken'})],['available no booleano',async()=>({available:'yes'})],['razón rara',async()=>({available:false,reason:'otra'})],['sin razón',async()=>({available:false})]]){
  const subs=[];const f=FORM_HARNESS({url:()=>AVX,upload:async()=>({url:AVX})},async v=>{subs.push(v);return {ok:true}},undefined,{check});
  f.type('ana');await f.fire();assert.equal(f.hs().text,'',quien+': no dice nada');
  await f.send({handle:'ana'});assert.equal(subs.length,1,quien+': Guardar manda');assert.equal(subs[0].handle,'ana');assert.deepEqual([f.state().go,f.state().pb],[false,false]);
 }
 /* aun diciendo "tomado" el formulario manda: la autoridad es el servidor (409) y muestra el mismo mensaje de siempre */
 const subs=[];const f=FORM_HARNESS({url:()=>AVX,upload:async()=>({url:AVX})},async v=>{subs.push(v);return {error:'handle-taken'}},undefined,{check:async()=>({available:false,reason:'taken'})});
 f.type('ana');await f.fire();assert.equal(f.hs().text,f.OB['handle-taken']);assert.deepEqual([f.state().go,f.state().pb],[false,false],'un @ tomado no apaga Guardar');await f.send({handle:'ana'});assert.equal(subs.length,1,'el aviso no reemplaza la revisión del servidor');assert.equal(f.state().err,f.OB['handle-taken']);
 /* sin la pregunta (por ejemplo una cuenta sin conexión) escribir válido no falla ni deja relojes */
 const g=FORM_HARNESS({url:()=>AVX,upload:async()=>({url:AVX})},async()=>({ok:true}));g.type('ana');assert.equal(g.timers.length,0);assert.equal(g.hs().text,'');
});
test('LHB-63: Editar perfil no marca tu @ de siempre, y sí revisa uno distinto; Completa tu perfil no tiene el aviso',async()=>{
 const asked=[];const init={handle:'ana',first_name:'Ana',last_name:'Mora',gender:'F',birth_date:'1990-05-17',bio:'',favorite_brand:''};
 const f=FORM_HARNESS({url:()=>AV,upload:async()=>({url:AV})},async()=>({ok:true}),undefined,{mode:'edit',init,check:async h=>{asked.push(h);return {available:true}}});
 assert.match(f.html(),/id="obHs"/);
 for(const v of ['ana','ANA','  Ana ']){f.type(v);assert.equal(f.timers.length,0,JSON.stringify(v)+': es el tuyo, no se pregunta');assert.equal(f.hs().text,'')}
 f.type('bea');assert.equal(f.timers.length,1);await f.fire();assert.deepEqual(asked,['bea']);assert.equal(f.hs().text,'Disponible');
 f.type('ana');assert.equal(f.hs().text,'','volver al tuyo quita el aviso');
 const id=FORM_HARNESS({url:()=>null,upload:async()=>({})},async()=>({ok:true}),undefined,{mode:'identity',check:async()=>({available:true})});assert.ok(!id.html().includes('obHs'),'sin @ no hay aviso');
});
test('LHB-63: la cuenta le da al formulario la pregunta del @ (registro y Editar perfil), y solo la contesta si la cuenta y la página siguen siendo las mismas',async()=>{
 const calls=[];let resp={status:200,body:{available:true}};
 const api=async(C,m,p,b)=>{calls.push(m+' '+p);if(p==='/api/me')return state.me;return resp};
 const state={me:{status:200,body:{needsProfile:true}}};
 let chk;const h=CUENTA_HARNESS({api});h.D.ui.onboarding=(s,pc,c)=>{chk=c};h.C.user={id:'user_a'};await h.A.require(h.go);await tick();
 assert.equal(typeof chk,'function','el registro recibe la pregunta');
 assert.deepEqual(await chk('ana_9'),{available:true});assert.ok(calls.includes('GET /api/handle?h=ana_9'));
 assert.deepEqual(await chk('a b'),{available:true});assert.ok(calls.includes('GET /api/handle?h=a%20b'),'el texto va codificado');
 for(const bad of [{status:429,body:{error:'handle-rate'}},{status:503,body:{error:'unavailable'}},{status:401,body:{}},{status:200,body:{}},{status:200,body:{available:'yes'}},{status:200,body:null}]){resp=bad;assert.equal(await chk('ana_9'),null,JSON.stringify(bad)+' no dice nada')}
 resp=async()=>{throw new Error('x')};const api2=api;
 /* sin conexión */
 const off=CUENTA_HARNESS({api:async(C,m,p)=>{if(p==='/api/me')return {status:200,body:{needsProfile:true}};throw new Error('offline')}});let c2;off.D.ui.onboarding=(s,pc,c)=>{c2=c};off.C.user={id:'user_a'};await off.A.require(off.go);await tick();assert.equal(await c2('ana_9'),null);
 /* cambió la cuenta: ni se pregunta */
 resp={status:200,body:{available:true}};calls.length=0;h.C.signIn('user_b');assert.equal(await chk('ana_9'),null);assert.ok(!calls.some(x=>x.includes('/api/handle')),'otra cuenta: no se manda nada con la ficha de la anterior');
 /* la respuesta llega cuando la cuenta ya cambió */
 const gate=defer();const h2=CUENTA_HARNESS({api:async(C,m,p)=>p==='/api/me'?{status:200,body:{needsProfile:true}}:gate.p});let c3;h2.D.ui.onboarding=(s,pc,c)=>{c3=c};h2.C.user={id:'user_a'};await h2.A.require(h2.go);await tick();
 const pend=c3('ana_9');await tick();h2.C.signIn('user_b');gate.ok({status:200,body:{available:true}});assert.equal(await pend,null,'una respuesta que llega con otra cuenta no se usa');
 /* Editar perfil recibe la misma pregunta como cuarto argumento */
 let chk4,pf;const h3=CUENTA_HARNESS({api:async(C,m,p)=>p==='/api/me'?{status:200,body:{profile:PROF55,needsIdentity:false}}:{status:200,body:{available:false,reason:'taken'}}});
 h3.D.ui.edit=(p,s,pc,c)=>{pf=p;chk4=c};h3.C.user={id:'user_a',hasImage:true,imageUrl:AV};await h3.A.require(h3.go,{edit:true});await tick();
 assert.equal(typeof chk4,'function','Editar perfil recibe la pregunta');assert.deepEqual(await chk4('bea_77'),{available:false,reason:'taken'});
 /* hoja.js la reparte a los dos formularios */
 const hj=fs.readFileSync(path.join(__dirname,'..','site','hoja.js'),'utf8').replace(/\r\n/g,'\n');
 assert.ok(hj.includes("onboarding:(submit,picture,check)=>onboardingForm(submit,picture,undefined,undefined,check),"));assert.ok(hj.includes("edit:(prof,submit,picture,check)=>onboardingForm(submit,picture,'edit',prof,check),"));
});

/* ===================== LHB-28 / LHB-31: Mi Hoja en la cuenta (servidor, juntar, motor) ===================== */
async function API28(){
 const a=await API52();const M=await a.imp('api/mihoja.js'),ML=await a.imp('_lib/mihoja.js');
 const mk=(u,handle)=>a.db.prepare("INSERT INTO profiles (user_id,handle,display_name,avatar_key,first_name,last_name,gender,birth_date,hidden,age_ok_at,created_at,updated_at) VALUES (?1,?2,'Ana M.',NULL,'Ana','Mora','F','1990-05-17',0,'2026-10-26T00:00:00.000Z','2026-10-26T00:00:00.000Z','2026-10-26T00:00:00.000Z')").run(u,handle);
 const rq=(token,body,o)=>{o=o||{};return {headers:{get:h=>({Authorization:token?'Bearer '+token:null,'Content-Type':o.type!==undefined?o.type:'application/json','If-Match':o.match!==undefined?o.match:null,'Content-Length':o.len!==undefined?o.len:null})[h]??null},json:async()=>typeof body==='string'?JSON.parse(body):body,text:async()=>typeof body==='string'?body:JSON.stringify(body)}};
 const get=async(u,e=a.env)=>{const r=await M.onRequestGet({request:rq(u?await a.tok(u):null),env:e});return [r.status,await r.json()]};
 const put=async(u,body,match,o,e=a.env)=>{const r=await M.onRequestPut({request:rq(u?await a.tok(u):null,body,{match,...(o||{})}),env:e});return [r.status,await r.json()]};
 const rows=()=>a.db.prepare('SELECT COUNT(*) n FROM mihoja').get().n;
 return {...a,M,ML,mk,get,put,rows,rq}}
const DOC28={schema:1,creado:'2026-10-01T00:00:00.000Z',humidor:[{id:'h1',marca:'Don Rey',actualizado:'2026-10-02'}],diario:[{id:'d1',fecha:'2026-10-03',nota:'buena'}],pasaporte:{artesanos:{a1:'2026-10-04'},cigarros:{},lugares:{}},favs:{artesanos:['a1'],cigarros:[],lugares:[]},ratings:{c1:4}};
test('LHB-28: GET /api/mihoja pide sesión y perfil; sin copia en el servidor dice rev 0 y doc null; la copia de una cuenta no se ve desde otra',async()=>{
 const a=await API28();
 try{
  assert.deepEqual(await a.get(null),[401,{error:'no-session'}]);
  {const r=await a.M.onRequestGet({request:a.rq('basura'),env:a.env});assert.deepEqual([r.status,await r.json()],[401,{error:'no-session'}],'un token que no es de Clerk');}
  assert.deepEqual(await a.get('user_a'),[403,{error:'no-profile'}],'una cuenta sin perfil no tiene Mi Hoja en el servidor');
  a.mk('user_a','ana_a');a.mk('user_b','beto_b');
  assert.deepEqual(await a.get('user_a'),[200,{rev:0,schema:null,doc:null,updated_at:null}]);
  assert.equal((await a.put('user_a',{schema:1,doc:DOC28},'0'))[0],200);
  const [s,b]=await a.get('user_a');assert.equal(s,200);assert.equal(b.rev,1);assert.equal(b.schema,1);assert.deepEqual(b.doc,DOC28);assert.ok(/^20\d\d-\d\d-\d\dT/.test(b.updated_at));
  assert.deepEqual(await a.get('user_b'),[200,{rev:0,schema:null,doc:null,updated_at:null}],'la otra cuenta no ve nada');
  assert.equal(a.rows(),1);
  a.db.prepare("UPDATE mihoja SET doc='no es json' WHERE user_id='user_a'").run();
  assert.deepEqual(await a.get('user_a'),[500,{error:'corrupt'}],'una fila dañada no se manda como si fuera buena');
 }finally{a.done()}
});
test('LHB-28: PUT /api/mihoja exige JSON, If-Match y un cuerpo válido; cada rechazo no crea ni cambia nada',async()=>{
 const a=await API28();
 try{
  a.mk('user_a','ana_a');
  const ok={schema:1,doc:DOC28};
  assert.deepEqual(await a.put(null,ok,'0'),[401,{error:'no-session'}]);
  assert.deepEqual(await a.put('user_a',ok,'0',{type:'text/plain'}),[415,{error:'bad-type'}],'solo JSON');
  assert.deepEqual(await a.put('user_a',ok,'0',{type:null}),[415,{error:'bad-type'}]);
  for(const m of [null,'','abc','-1','1.5','1e3','0x1','1 2',' ','9999999999','1,2'])assert.deepEqual(await a.put('user_a',ok,m),[428,{error:'if-match-required'}],'If-Match '+JSON.stringify(m));
  assert.deepEqual(await a.put('user_a','no es json','0'),[400,{error:'bad-body'}]);
  for(const b of [null,[],'x',42,true])assert.deepEqual(await a.put('user_a',b,'0'),[400,{error:'bad-body'}],'cuerpo '+JSON.stringify(b));
  for(const s of [0,2,-1,1.5,'1',null,undefined,true])assert.deepEqual(await a.put('user_a',{schema:s,doc:DOC28},'0'),[400,{error:'schema-unsupported'}],'schema '+JSON.stringify(s));
  for(const d of [null,[],'x',42,undefined])assert.deepEqual(await a.put('user_a',{schema:1,doc:d},'0'),[400,{error:'bad-doc'}],'doc '+JSON.stringify(d));
  for(const k of ['humidor','diario'])assert.deepEqual(await a.put('user_a',{schema:1,doc:{[k]:'x'}},'0'),[400,{error:'bad-doc'}],k+' no es lista');
  for(const k of ['pasaporte','favs','ratings'])for(const v of [[],'x',42])assert.deepEqual(await a.put('user_a',{schema:1,doc:{[k]:v}},'0'),[400,{error:'bad-doc'}],k+' no es mapa');
  assert.deepEqual(await a.put('user_a',{schema:1,doc:{humidor:Array.from({length:5001},(_,i)=>({id:'h'+i}))}},'0'),[413,{error:'too-big'}],'más de 5000 entradas');
  assert.deepEqual(await a.put('user_a',{schema:1,doc:{humidor:Array.from({length:3400},(_,i)=>({id:'h'+i,nota:'x'.repeat(250)}))}},'0'),[413,{error:'too-big'}],'más de 900000 caracteres del documento, con un cuerpo aún menor que el tope del cuerpo');
  assert.equal((await a.put('user_a',{schema:1,doc:{humidor:Array.from({length:5000},(_,i)=>({id:'h'+i}))}},'0'))[0],200,'exactamente 5000 pasa');
  assert.equal(a.rows(),1,'solo el último PUT creó la fila');
 }finally{a.done()}
});
test('LHB-28: el rev manda: If-Match 0 crea, el rev vigente actualiza, uno viejo o futuro da 409 con la copia de ahora y no pisa nada; dos a la vez no pasan los dos',async()=>{
 const a=await API28();
 try{
  a.mk('user_a','ana_a');a.mk('user_b','beto_b');
  const v1={schema:1,doc:{...DOC28,humidor:[{id:'h1',marca:'uno'}]}},v2={schema:1,doc:{...DOC28,humidor:[{id:'h1',marca:'dos'}]}},v3={schema:1,doc:{...DOC28,humidor:[{id:'h1',marca:'tres'}]}};
  let r=await a.put('user_a',v1,'0');assert.equal(r[0],200);assert.equal(r[1].rev,1);
  r=await a.put('user_a',v2,'0');assert.equal(r[0],409,'crear otra vez no pisa');assert.equal(r[1].error,'conflict');assert.equal(r[1].rev,1);assert.deepEqual(r[1].doc,v1.doc,'trae la copia vigente');
  r=await a.put('user_a',v2,'1');assert.equal(r[0],200);assert.equal(r[1].rev,2);
  r=await a.put('user_a',v3,'1');assert.equal(r[0],409,'rev viejo');assert.equal(r[1].rev,2);assert.deepEqual(r[1].doc,v2.doc);
  r=await a.put('user_a',v3,'5');assert.equal(r[0],409,'rev del futuro');assert.equal(r[1].rev,2);
  assert.deepEqual((await a.get('user_a'))[1].doc,v2.doc,'nada se pisó');
  assert.equal((await a.put('user_a',v3,'"2"'))[1].rev,3,'If-Match entre comillas');assert.equal((await a.put('user_a',v1,'W/"3"'))[1].rev,4,'validador débil');assert.equal((await a.put('user_a',v2,' 4 '))[1].rev,5,'con espacios');
  const [x,y]=await Promise.all([a.put('user_a',v1,'5'),a.put('user_a',v2,'5')]);assert.deepEqual([x[0],y[0]].sort(),[200,409],'de dos con el mismo rev pasa uno');
  assert.equal((await a.get('user_a'))[1].rev,6);
  assert.equal((await a.get('user_b'))[1].rev,0,'la otra cuenta sigue vacía');assert.equal((await a.put('user_b',v1,'0'))[1].rev,1,'cada cuenta lleva su propio rev');
  assert.equal(a.rows(),2);
  /* el servidor guarda lo que llegó, sin tocarlo */
  const raw=a.db.prepare("SELECT doc FROM mihoja WHERE user_id='user_b'").get().doc;assert.equal(raw,JSON.stringify(v1.doc));
  /* un D1 caído se dice como 503, no como éxito */
  const dead={...a.env,DB:{prepare:(sql)=>sql.startsWith('SELECT doc')?{bind:()=>({first:async()=>{throw new Error('d1')}})}:a.env.DB.prepare(sql)}};
  assert.deepEqual(await a.get('user_a',dead),[503,{error:'unavailable'}]);
  const dead2={...a.env,DB:{prepare:(sql)=>sql.startsWith('SELECT')?a.env.DB.prepare(sql):{bind:()=>({run:async()=>{throw new Error('d1')}})}}};
  assert.deepEqual(await a.put('user_a',v1,'6',undefined,dead2),[503,{error:'unavailable'}]);
 }finally{a.done()}
});
test('LHB-28: Mi Hoja del servidor solo sale por /api/mihoja y solo para su dueña: ninguna otra ruta ni columna pública la toca',()=>{
 const fs2=require('fs'),path2=require('path');const root=path.join(__dirname,'..','functions');const hits=[];
 (function walk(d){for(const f of fs2.readdirSync(d,{withFileTypes:true})){const p=path2.join(d,f.name);if(f.isDirectory())walk(p);else if(/mihoja/i.test(fs2.readFileSync(p,'utf8')))hits.push(path2.relative(root,p).replace(/\\/g,'/'))}})(root);
 assert.deepEqual(hits.sort(),['_lib/mihoja.js','_lib/profile.js','api/mihoja.js'],'solo estos archivos del servidor mencionan mihoja');
 const pf=fs2.readFileSync(path.join(root,'_lib','profile.js'),'utf8');{const ls=pf.split(String.fromCharCode(10)).filter(l=>/mihoja/i.test(l));assert.equal(ls.length,1);assert.ok(ls[0].includes("'mihoja', 'cata'"),'profile.js solo la nombra en la lista de @ reservados')}
});
function SYNC28(){const win={};new Function('window',read('sync.js'))(win);return win}
function rng28(seed){let s=seed>>>0;return()=>{s=(s+0x6D2B79F5)>>>0;let t=s;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/4294967296}}
test('LHB-28: juntar dos copias con la base: lo que solo uno agregó se queda; borrar sin tocar se va; borrar contra editar deja lo editado; los dos cambios en el mismo registro lo más nuevo gana',()=>{
 const {LHB_MERGE:X}=SYNC28();const E=(o)=>({schema:1,creado:'2026-10-01',humidor:[],diario:[],pasaporte:{artesanos:{},cigarros:{},lugares:{}},favs:{artesanos:[],cigarros:[],lugares:[]},ratings:{},...o});
 const h=(id,extra)=>({id,marca:'m'+id,actualizado:'2026-10-01',...extra});
 const ids=d=>d.humidor.map(x=>x.id).sort();
 /* unión sin base: nada se pierde */
 assert.deepEqual(ids(X.merge(null,E({humidor:[h('a')]}),E({humidor:[h('b')]}))),['a','b']);
 /* borrar: la base lo tenía */
 const base=E({humidor:[h('a'),h('b')]});
 assert.deepEqual(ids(X.merge(base,E({humidor:[h('b')]}),base)),['b'],'este lo borró, el otro no lo tocó: se va');
 assert.deepEqual(ids(X.merge(base,base,E({humidor:[h('b')]}))),['b'],'el otro lo borró, este no lo tocó: se va');
 assert.deepEqual(ids(X.merge(base,E({humidor:[h('b')]}),E({humidor:[h('a',{marca:'editada',actualizado:'2026-10-05'}),h('b')]}))),['a','b'],'uno borró y el otro editó: queda lo editado');
 assert.equal(X.merge(base,E({humidor:[h('b')]}),E({humidor:[h('a',{marca:'editada',actualizado:'2026-10-05'}),h('b')]})).humidor.find(x=>x.id==='a').marca,'editada');
 /* dos ediciones: la más nueva; empate: igual en los dos sentidos */
 const e1=E({humidor:[h('a',{marca:'uno',actualizado:'2026-10-02'})]}),e2=E({humidor:[h('a',{marca:'dos',actualizado:'2026-10-03'})]});
 assert.equal(X.merge(base,e1,e2).humidor[0].marca,'dos');assert.equal(X.merge(base,e2,e1).humidor[0].marca,'dos');
 const t1=E({humidor:[h('a',{marca:'uno'})]}),t2=E({humidor:[h('a',{marca:'dos'})]});
 assert.equal(X.merge(base,t1,t2).humidor[0].marca,X.merge(base,t2,t1).humidor[0].marca,'un empate se resuelve igual juntando en cualquier sentido');
 assert.equal(X.merge(null,t1,t2,{prefer:'local'}).humidor[0].marca,'uno','al importar un respaldo gana lo de este teléfono');
 {const a1=E({humidor:[h('a',{marca:'aaa'})]}),z1=E({humidor:[h('a',{marca:'zzz'})]});assert.equal(X.merge(null,a1,z1,{prefer:'local'}).humidor[0].marca,'aaa','gana lo de aquí aunque el desempate lo dejaría de último');assert.equal(X.merge(null,z1,a1,{prefer:'local'}).humidor[0].marca,'zzz');}
 /* solo uno cambió: pasa lo que cambió */
 assert.equal(X.merge(base,E({humidor:[h('a',{marca:'solo yo',actualizado:'2026-09-01'}),h('b')]}),base).humidor.find(x=>x.id==='a').marca,'solo yo','aunque su fecha sea más vieja, el otro no lo tocó');
 /* favoritos */
 const fb=E({favs:{artesanos:['x','y'],cigarros:[],lugares:[]}});
 assert.deepEqual(X.merge(fb,E({favs:{artesanos:['y','z'],cigarros:[],lugares:[]}}),E({favs:{artesanos:['x','y','w'],cigarros:[],lugares:[]}})).favs.artesanos.sort(),['w','y','z'],'x lo quitó uno; z y w las agregaron');
 /* pasaporte: la fecha más antigua; sellos de un solo lado se quedan */
 const p=X.merge(null,E({pasaporte:{artesanos:{a:'2026-10-05',b:'2026-10-01'},cigarros:{},lugares:{}}}),E({pasaporte:{artesanos:{a:'2026-10-02'},cigarros:{},lugares:{c:'2026-10-09'}}}));
 assert.deepEqual(p.pasaporte.artesanos,{a:'2026-10-02',b:'2026-10-01'});assert.deepEqual(p.pasaporte.lugares,{c:'2026-10-09'});
 /* estrellas: la mayor; borrada en uno y sin tocar en el otro, se va */
 assert.deepEqual(X.merge(null,E({ratings:{c:3,d:5}}),E({ratings:{c:4}})).ratings,{c:4,d:5});
 assert.deepEqual(X.merge(E({ratings:{c:3}}),E({ratings:{}}),E({ratings:{c:3}})).ratings,{});
 /* creado: el más viejo; schema: el mayor; lo que es solo del teléfono no viaja */
 const m=X.merge(null,{...E({creado:'2026-10-09'}),draft:{x:1},cambios:3,respaldo:'z',sync:1},E({creado:'2026-10-02'}));
 assert.equal(m.creado,'2026-10-02');for(const k of X.LOCAL_ONLY)assert.ok(!(k in m),k+' no viaja');
 assert.ok(!('draft' in X.strip({draft:1,humidor:[]})));
 assert.equal(X.merge(null,E({schema:1}),E({schema:2})).schema,2,'schema: el mayor');
 assert.deepEqual(X.merge(null,E({humidor:[h('a')]}),E({humidor:[h('b')]})).humidor.map(x=>x.id),['b','a'],'lo que llega de la cuenta va primero');
 assert.deepEqual(X.merge(null,E({humidor:[h('a')]}),E({humidor:[h('b')]}),{prefer:'local'}).humidor.map(x=>x.id),['a','b'],'al importar, lo de este teléfono va primero');
 assert.deepEqual(X.merge(null,E({diario:[{id:'d1',fecha:'2026-10-01'}]}),E({diario:[{id:'d2',fecha:'2026-10-05'}]})).diario.map(x=>x.id),['d2','d1'],'el diario va de lo más nuevo a lo más viejo');
 {const z=X.merge(null,E({foo:1,bar:{a:1}}),E({baz:2,bar:{b:2}}));assert.equal(z.foo,1);assert.equal(z.baz,2);assert.ok(z.bar,'los campos que esta versión no conoce también viajan');}
 /* registros sin id se descartan; datos raros no rompen */
 assert.deepEqual(X.merge(null,{humidor:[{marca:'sin id'},null,5,{id:''}],diario:'x'},null).humidor,[]);
 assert.equal(X.hasData(E({})),false);assert.equal(X.hasData(E({ratings:{a:1}})),true);assert.equal(X.hasData(null),false);assert.equal(X.hasData(E({favs:{artesanos:['a'],cigarros:[],lugares:[]}})),true);
});
test('LHB-28: propiedades de juntar con 400 casos al azar: el orden no importa, juntar lo mismo no cambia nada, nada de lo agregado se pierde y quien junta después con la base llega al mismo resultado',()=>{
 const {LHB_MERGE:X}=SYNC28();const R=rng28(2810);const pick=(a)=>a[Math.floor(R()*a.length)];
 const day=()=>'2026-10-'+String(1+Math.floor(R()*28)).padStart(2,'0');
 const E=()=>({schema:1,creado:'2026-10-01',humidor:[],diario:[],pasaporte:{artesanos:{},cigarros:{},lugares:{}},favs:{artesanos:[],cigarros:[],lugares:[]},ratings:{}});
 const KS=['artesanos','cigarros','lugares'];
 const op=(d,n)=>{const t=Math.floor(R()*9);const list=pick(['humidor','diario']);
  if(t===0)d[list].push({id:list[0]+n+'_'+Math.floor(R()*1e6),marca:'m'+Math.floor(R()*5),actualizado:day(),fecha:day()});
  else if(t===1&&d[list].length)d[list].splice(Math.floor(R()*d[list].length),1);
  else if(t===2&&d[list].length){const x=pick(d[list]);x.marca='e'+Math.floor(R()*5);x.actualizado=day();x.fecha=x.actualizado}
  else if(t===3){const k=pick(KS),id='f'+Math.floor(R()*6);if(!d.favs[k].includes(id))d.favs[k].push(id)}
  else if(t===4){const k=pick(KS);if(d.favs[k].length)d.favs[k].splice(Math.floor(R()*d.favs[k].length),1)}
  else if(t===5){const k=pick(KS);d.pasaporte[k]['p'+Math.floor(R()*5)]=day()}
  else if(t===6){const k=pick(KS),ks=Object.keys(d.pasaporte[k]);if(ks.length)delete d.pasaporte[k][pick(ks)]}
  else if(t===7)d.ratings['c'+Math.floor(R()*5)]=1+Math.floor(R()*5);
  else{const ks=Object.keys(d.ratings);if(ks.length)delete d.ratings[pick(ks)]}};
 let failures=[];
 for(let i=0;i<400;i++){
  const b=E();for(let k=0;k<Math.floor(R()*8);k++)op(b,'b');
  const l=JSON.parse(JSON.stringify(b)),r=JSON.parse(JSON.stringify(b));for(let k=0;k<Math.floor(R()*6);k++)op(l,'l');for(let k=0;k<Math.floor(R()*6);k++)op(r,'r');
  const m=X.merge(b,l,r),m2=X.merge(b,r,l);
  const bad=(w)=>failures.push(i+': '+w);
  if(X.canon(m)!==X.canon(m2))bad('el orden importa');
  if(X.canon(X.merge(b,l,l))!==X.canon(l))bad('juntar lo mismo cambia algo');
  if(X.canon(X.merge(b,m,m))!==X.canon(m))bad('juntar el resultado consigo mismo');
  if(X.canon(X.merge(b,r,m))!==X.canon(m))bad('quien junta después no llega al mismo resultado');
  if(X.canon(X.merge(b,l,m))!==X.canon(m))bad('el otro lado tampoco');
  if(X.canon(X.merge(m,m,r))!==X.canon(m)&&X.canon(X.merge(m,m,m))!==X.canon(m))bad('con la base nueva');
  for(const list of ['humidor','diario'])for(const side of [l,r])for(const x of side[list])if(!b[list].some(y=>y.id===x.id)&&!m[list].some(y=>y.id===x.id))bad('se perdió un '+list+' agregado '+x.id);
  for(const k of KS)for(const side of [l,r])for(const f of side.favs[k])if(!b.favs[k].includes(f)&&!m.favs[k].includes(f))bad('se perdió un favorito agregado');
  for(const k of KS)for(const side of [l,r])for(const p of Object.keys(side.pasaporte[k]))if(!(p in b.pasaporte[k])&&!(p in m.pasaporte[k]))bad('se perdió un sello agregado');
 }
 assert.deepEqual(failures.slice(0,5),[],failures.length+' casos fallan');
});
/* un teléfono de mentira para probar el motor contra el servidor de verdad (SQLite): su almacenamiento, su reloj, sus temporizadores y su red */
function DEV28(a,sub,o){o=o||{};const KEY='lhb_mihoja_v1';const ls=new Map();const net={off:false,log:[],beforePut:null,status:null};const timers=[];const toasts=[];const st={acct:sub,user:sub,failSet:false,full:false,failKey:null,failBigKey:null,failBig:0,applied:0,clock:Date.parse('2026-10-27T12:00:00Z'),setDocs:0,states:[]};const handlers={};let eng=null;
 const rawDoc=()=>{try{return JSON.parse(ls.get(KEY))||{}}catch(e){return {}}};
 const D={ls:{get:k=>ls.has(k)?ls.get(k):null,set:(k,v)=>{if(st.full||k===st.failKey||(k===st.failBigKey&&String(v).length>st.failBig))throw new Error('QuotaExceededError');ls.set(k,v)}},
  getDoc:()=>rawDoc(),setDoc:(d,exp)=>{st.setDocs++;if(st.beforeApply){const f=st.beforeApply;st.beforeApply=null;f()}if(exp!==undefined&&win.LHB_MERGE.stable(rawDoc())!==exp)return 'stale';if(st.failSet)return false;ls.set(KEY,JSON.stringify(d));if(eng)eng.changed();return true},
  clerk:async()=>{if(net.off)throw new Error('sin red');return {user:st.user?{id:st.user}:null}},
  api:async(C,method,path,body,uid,headers)=>{if(net.off)throw new TypeError('sin red');if(uid&&(!C.user||C.user.id!==uid))throw new Error('account-changed');
   net.log.push(method);if(net.status&&net.status[method])return {status:net.status[method],body:{}};if(method==='GET'&&net.beforeGet){const f=net.beforeGet;net.beforeGet=null;await f()}
   if(method==='PUT'&&net.beforePut){const f=net.beforePut;net.beforePut=null;await f()}
   const r=await (method==='GET'?a.M.onRequestGet:a.M.onRequestPut)({request:a.rq(await a.tok(st.user),body,{match:headers&&headers['If-Match']}),env:a.env});if(method==='PUT'&&net.dropAfterPut){net.dropAfterPut=false;throw new TypeError('sin red')}if(method==='PUT'&&net.afterPut){const f=net.afterPut;net.afterPut=null;await f()}if(method==='PUT'&&net.badBody){net.badBody=false;return {status:r.status,body:{}}}return {status:r.status,body:await r.json()}},
  acct:()=>st.acct?{sub:st.acct}:null,now:()=>new Date(st.clock).toISOString(),nowMs:()=>st.clock,
  setTimer:(fn,ms)=>{const t={fn,ms,live:true};timers.push(t);return t},clearTimer:t=>{if(t)t.live=false},
  toast:m=>toasts.push(m),listen:(ev,fn)=>{handlers[ev]=fn},onState:s=>{st.states.push(s.state)},onApplied:()=>{st.applied++}};
 const win=SYNC28();eng=win.LHB_SYNC(D);
 const settle=async()=>{await new Promise(r=>setTimeout(r,2));for(let i=0;i<2000&&eng._busy();i++)await new Promise(r=>setTimeout(r,2))};
 const dev={D,eng,ls,net,timers,toasts,st,handlers,X:win.LHB_MERGE,KEY,
  doc:rawDoc,seed:d=>{ls.set(KEY,JSON.stringify(d))},
  edit:fn=>{const prev=ls.has(KEY)?ls.get(KEY):null;const d=rawDoc();fn(d);ls.set(KEY,JSON.stringify(d));eng.changed(prev)},
  live:()=>timers.filter(t=>t.live),
  fire:async()=>{for(const t of timers.filter(x=>x.live)){t.live=false;t.fn()}await settle()},
  sync:async(why)=>{const r=await eng.run(why||'prueba');await settle();return r},
  advance:ms=>{st.clock+=ms}};
 return dev}
async function ENG28(){const a=await API28();a.mk('user_a','ana_a');a.mk('user_b','beto_b');a.mk('user_c','cata_c');return a}
const srv28=(a,u)=>{const r=a.db.prepare('SELECT doc, rev FROM mihoja WHERE user_id=?1').get(u);return r?{doc:JSON.parse(r.doc),rev:r.rev}:null};
const hid28=d=>(d.humidor||[]).map(x=>x.id).sort();
test('LHB-28: entrar por primera vez lleva lo guardado en el teléfono a la cuenta, sin lo que es solo del teléfono, y avisa una vez',async()=>{
 const a=await ENG28();
 try{
  const p=DEV28(a,'user_a');p.seed({...DOC28,draft:{x:1},cambios:7,respaldo:'2026-10-01',recordarDespues:'z',migrado:true,sync:{x:1}});
  const r=await p.sync('entrar');assert.equal(r.ok,true);assert.equal(r.pushed,true);assert.equal(r.pulled,false);
  const s=srv28(a,'user_a');assert.equal(s.rev,1);assert.deepEqual(s.doc,p.X.strip(DOC28),'la cuenta recibe la copia sin lo del teléfono');for(const k of p.X.LOCAL_ONLY)assert.ok(!(k in s.doc),k);
  assert.equal(p.doc().draft.x,1,'lo del teléfono se queda en el teléfono');assert.equal(p.doc().cambios,7);
  assert.deepEqual(p.toasts,['Tu Mi Hoja de este teléfono ya está en tu cuenta ✓']);
  const meta=JSON.parse(p.ls.get('lhb_mihoja_v1_sync'));assert.equal(meta.sub,'user_a');assert.equal(meta.rev,1);assert.deepEqual(meta.base,s.doc);
  assert.equal(p.eng.status().state,'ok');assert.equal(p.st.setDocs,0,'lo que se subió ya estaba en el teléfono: no se reescribe');assert.equal(p.st.applied,0,'nada llegó de la cuenta');
  /* segunda pasada sin cambios: ni un PUT */
  p.net.log.length=0;const r2=await p.sync('otra');assert.equal(r2.ok,true);assert.equal(r2.pushed,false);assert.deepEqual(p.net.log,['GET']);assert.equal(p.toasts.length,1,'el aviso sale una sola vez');
  /* un teléfono vacío no avisa nada */
  const q=DEV28(a,'user_b');await q.sync('entrar');assert.deepEqual(q.toasts,[]);assert.equal(srv28(a,'user_b').rev,1,'una cuenta vacía también queda creada');
 }finally{a.done()}
});
test('LHB-28: entrar con una cuenta que ya tiene Mi Hoja la trae al teléfono; con las dos, se juntan y las dos quedan iguales',async()=>{
 const a=await ENG28();
 try{
  const p1=DEV28(a,'user_a');p1.seed(DOC28);await p1.sync();
  const p2=DEV28(a,'user_a');p2.seed({draft:{x:1},cambios:2});
  let r=await p2.sync('entrar');assert.equal(p2.doc().draft.x,1,'lo que es solo del teléfono sobrevive a lo que llega');assert.equal(p2.doc().cambios,2);assert.equal(r.pulled,true);assert.equal(r.pushed,false);assert.deepEqual(p2.X.strip(p2.doc()),p2.X.strip(DOC28));assert.equal(p2.st.applied,1);assert.equal(srv28(a,'user_a').rev,1,'no se subió nada');
  /* el otro teléfono ya tenía cosas suyas */
  const p3=DEV28(a,'user_a');p3.seed({...DOC28,humidor:[{id:'h9',marca:'Mío',actualizado:'2026-10-09'}],diario:[],favs:{artesanos:[],cigarros:['k1'],lugares:[]},pasaporte:{artesanos:{},cigarros:{},lugares:{}},ratings:{c2:5}});
  r=await p3.sync('entrar');assert.equal(r.ok,true);assert.equal(r.pushed,true);assert.equal(r.pulled,true);
  assert.deepEqual(hid28(p3.doc()),['h1','h9']);assert.deepEqual(p3.doc().diario.map(x=>x.id),['d1']);assert.deepEqual(p3.doc().favs.cigarros,['k1']);assert.deepEqual(p3.doc().favs.artesanos,['a1']);assert.deepEqual(p3.doc().ratings,{c1:4,c2:5});
  assert.deepEqual(srv28(a,'user_a').doc,p3.X.strip(p3.doc()),'el teléfono y la cuenta quedaron iguales');assert.equal(srv28(a,'user_a').rev,2);
  /* el primero se pone al día en su próxima pasada */
  r=await p1.sync();assert.equal(r.pulled,true);assert.deepEqual(hid28(p1.doc()),['h1','h9']);assert.equal(srv28(a,'user_a').rev,2,'sin subir nada');
 }finally{a.done()}
});
test('LHB-31: dos teléfonos: lo agregado, lo editado y lo borrado en uno llega al otro, y el borrado no vuelve',async()=>{
 const a=await ENG28();
 try{
  const A=DEV28(a,'user_a'),B=DEV28(a,'user_a');A.seed(DOC28);await A.sync();await B.sync();assert.deepEqual(hid28(B.doc()),['h1']);
  A.edit(d=>{d.humidor.push({id:'h2',marca:'Nuevo',actualizado:'2026-10-10'})});await A.fire();
  await B.sync();assert.deepEqual(hid28(B.doc()),['h1','h2'],'lo agregado llegó');
  B.edit(d=>{d.humidor=d.humidor.filter(x=>x.id!=='h1');d.humidor.find(x=>x.id==='h2').marca='Editado';d.humidor.find(x=>x.id==='h2').actualizado='2026-10-11'});await B.fire();
  await A.sync();assert.deepEqual(hid28(A.doc()),['h2'],'el borrado llegó y no volvió');assert.equal(A.doc().humidor[0].marca,'Editado');
  await B.sync();assert.deepEqual(hid28(B.doc()),['h2'],'tampoco volvió en el otro sentido');assert.deepEqual(hid28(srv28(a,'user_a').doc),['h2']);
  /* cambios a la vez en los dos sin sincronizar: se juntan */
  A.edit(d=>{d.favs.lugares.push('l1')});B.edit(d=>{d.diario.push({id:'d2',fecha:'2026-10-12',nota:'otra'})});
  await A.fire();await B.fire();await A.sync();
  for(const P of [A,B]){assert.deepEqual(P.doc().favs.lugares,['l1']);assert.deepEqual(P.doc().diario.map(x=>x.id).sort(),['d1','d2'])}
  assert.deepEqual(srv28(a,'user_a').doc,A.X.strip(A.doc()));
 }finally{a.done()}
});
test('LHB-31: si otro teléfono guarda en medio, el PUT da 409, se junta con la copia nueva y se reintenta sin perder ninguno de los dos cambios',async()=>{
 const a=await ENG28();
 try{
  const A=DEV28(a,'user_a'),B=DEV28(a,'user_a');A.seed(DOC28);await A.sync();await B.sync();
  A.edit(d=>{d.humidor.push({id:'hA',marca:'A',actualizado:'2026-10-10'})});B.edit(d=>{d.humidor.push({id:'hB',marca:'B',actualizado:'2026-10-10'})});
  /* justo antes del PUT de B, A guarda lo suyo */
  B.net.beforePut=async()=>{await A.eng.run('mientras')};
  const r=await B.sync('guardado');assert.equal(r.ok,true,JSON.stringify(r));assert.deepEqual(hid28(srv28(a,'user_a').doc),['h1','hA','hB'],'ninguno se perdió');
  assert.deepEqual(B.net.log.filter(m=>m==='PUT').length,2,'un PUT con 409 y otro que pasó');assert.deepEqual(hid28(B.doc()),['h1','hA','hB']);
  await A.sync();assert.deepEqual(hid28(A.doc()),['h1','hA','hB']);
  /* si el servidor sigue dando 409 siempre, se cansa y lo dice sin tocar nada */
  const C=DEV28(a,'user_a');C.seed(DOC28);await C.sync();C.edit(d=>{d.humidor.push({id:'hC',marca:'C',actualizado:'2026-10-13'})});
  const orig=C.D.api;let n=0;C.D.api=async(Cl,m,p,b,u,h)=>{if(m==='PUT'){n++;await A.eng.run('x');A.edit(d=>{d.diario.push({id:'z'+n,fecha:'2026-10-2'+n%9,nota:'x'})});await A.eng.run('y')}return orig(Cl,m,p,b,u,h)};
  const r2=await C.sync('guardado');assert.equal(r2.fail,'conflict');assert.equal(C.eng.status().state,'error');assert.ok(C.doc().humidor.some(x=>x.id==='hC'),'lo de este teléfono sigue en el teléfono');
 }finally{a.done()}
});
test('LHB-31: sin conexión nada se pierde ni se rompe: queda pendiente, reintenta con espera creciente y sigue al volver la red',async()=>{
 const a=await ENG28();
 try{
  const A=DEV28(a,'user_a');A.seed(DOC28);await A.sync();
  A.net.off=true;A.edit(d=>{d.humidor.push({id:'h2',marca:'sin red',actualizado:'2026-10-10'})});
  assert.equal(A.live().length,1,'un solo temporizador de guardado');assert.equal(A.live()[0].ms,2500,'espera 2,5 segundos');
  await A.fire();assert.equal(A.eng.status().state,'offline');assert.deepEqual(hid28(A.doc()),['h1','h2'],'lo escrito sigue en el teléfono');assert.deepEqual(hid28(srv28(a,'user_a').doc),['h1']);
  assert.deepEqual(A.live().map(t=>t.ms),[20e3],'reintenta en 20 s');
  await A.fire();assert.deepEqual(A.live().map(t=>t.ms),[40e3],'luego 40 s');
  await A.fire();assert.deepEqual(A.live().map(t=>t.ms),[80e3]);await A.fire();assert.deepEqual(A.live().map(t=>t.ms),[160e3]);await A.fire();assert.deepEqual(A.live().map(t=>t.ms),[300e3]);await A.fire();assert.deepEqual(A.live().map(t=>t.ms),[300e3],'tope de 5 minutos');
  /* vuelve la red: el aviso del navegador sincroniza ya, sin esperar el temporizador */
  A.net.off=false;A.eng.start();assert.ok(A.handlers.online&&A.handlers.visible,'escucha cuando vuelve la red y cuando la página se ve');
  A.handlers.online();await new Promise(r=>setImmediate(r));await A.sync();
  assert.deepEqual(hid28(srv28(a,'user_a').doc),['h1','h2']);assert.equal(A.eng.status().state,'ok');assert.equal(A.live().filter(t=>t.ms>=20e3).length,0,'el reintento pendiente se canceló');
  A.net.off=true;A.edit(d=>{d.ratings.z=2});await A.fire();assert.deepEqual(A.live().map(t=>t.ms),[20e3],'tras un éxito la espera vuelve a empezar');
 }finally{a.done()}
});
test('LHB-31: errores del servidor y de la cuenta: 5xx reintenta; un esquema nuevo no se toca; sin cuenta o con otra cuenta no manda nada',async()=>{
 const a=await ENG28();
 try{
  const A=DEV28(a,'user_a');A.seed(DOC28);
  A.net.status={GET:503};let r=await A.sync();assert.equal(r.fail,'get-503');assert.equal(A.eng.status().state,'error');assert.deepEqual(A.net.log,['GET']);assert.deepEqual(A.live().map(t=>t.ms),[20e3]);
  A.net.status=null;A.net.status={PUT:500};r=await A.sync();assert.equal(r.fail,'put-500');assert.deepEqual(A.live().map(t=>t.ms).slice(-1),[40e3],'la espera crece');
  A.net.status=null;
  a.db.prepare("UPDATE mihoja SET schema=2 WHERE user_id='user_a'").run();
  /* sin cuenta */
  const S=DEV28(a,'user_a');S.st.acct=null;S.seed(DOC28);r=await S.sync();assert.equal(r.skip,'signed-out');assert.equal(S.eng.status().state,'off');assert.deepEqual(S.net.log,[]);assert.equal(S.live().length,0);
  /* la sesión de Clerk es de otra cuenta que la guardada */
  const O=DEV28(a,'user_a');O.st.user='user_b';O.seed(DOC28);r=await O.sync();assert.equal(r.skip,'other-account');assert.deepEqual(O.net.log,[]);
  /* Clerk sin red */
  const F=DEV28(a,'user_a');F.net.off=true;F.seed(DOC28);r=await F.sync();assert.equal(r.skip,'offline');
  /* una sola pasada a la vez */
  const G=DEV28(a,'user_b');G.seed(DOC28);const p1=G.eng.run('a'),p2=G.eng.run('b');assert.equal(p1,p2,'la segunda petición comparte la pasada en curso');await G.sync();
  /* una pasada reciente no se repite al ver la página */
  G.advance(10e3);r=await G.eng.run('visible',{minAge:30e3});assert.equal(r.skip,'reciente');G.advance(40e3);r=await G.eng.run('visible',{minAge:30e3});assert.equal(r.ok,true);
 }finally{a.done()}
});
test('LHB-28: un esquema más nuevo en la cuenta no se toca ni se pisa desde esta versión',async()=>{
 const a=await ENG28();
 try{
  const A=DEV28(a,'user_a');A.seed(DOC28);await A.sync();
  a.db.prepare("UPDATE mihoja SET schema=2 WHERE user_id='user_a'").run();
  A.edit(d=>{d.humidor.push({id:'h2',marca:'nuevo',actualizado:'2026-10-10'})});const before=JSON.stringify(A.doc());
  const r=await A.sync('guardado');assert.equal(r.fail,'schema');assert.equal(a.db.prepare("SELECT schema FROM mihoja").get().schema,2);assert.deepEqual(hid28(srv28(a,'user_a').doc),['h1'],'no se subió nada');assert.equal(JSON.stringify(A.doc()),before,'el teléfono quedó igual');
 }finally{a.done()}
});
test('LHB-28: cambiar de cuenta en el mismo teléfono aparta la Mi Hoja anterior (no se borra ni se sube a la otra cuenta) y empieza con la de la nueva',async()=>{
 const a=await ENG28();
 try{
  const A=DEV28(a,'user_a');A.seed(DOC28);await A.sync();
  const other=DEV28(a,'user_b');other.seed({...DOC28,humidor:[{id:'hb',marca:'de b',actualizado:'2026-10-02'}],diario:[]});await other.sync();
  /* el mismo teléfono ahora entra con user_b */
  A.st.acct='user_b';A.st.user='user_b';const toasts0=A.toasts.length;
  const r=await A.sync('entrar');assert.equal(r.ok,true,JSON.stringify(r));
  assert.deepEqual(hid28(A.doc()),['hb'],'el teléfono muestra lo de la cuenta nueva');assert.ok(!hid28(srv28(a,'user_b').doc).includes('h1'),'lo de la otra cuenta no se subió');
  const parked=JSON.parse(A.ls.get('lhb_mihoja_v1_de_user_a'));assert.deepEqual(hid28(parked),['h1'],'la copia de la cuenta anterior se guardó aparte');
  assert.equal(JSON.parse(A.ls.get('lhb_mihoja_v1_sync')).sub,'user_b');assert.equal(A.toasts.length,toasts0,'no se dice que se subió lo de la otra cuenta');
  /* si no se puede apartar, no se borra nada */
  const B=DEV28(a,'user_a');B.seed(DOC28);await B.sync();B.st.acct='user_c';B.st.user='user_c';B.st.full=true;
  const r2=await B.sync('entrar');assert.equal(r2.fail,'park');assert.deepEqual(hid28(B.doc()),['h1'],'sin lugar para apartarla, la copia se queda como está');
 }finally{a.done()}
});
test('LHB-31: si el teléfono se quedó vacío sin que la persona borrara (almacenamiento limpiado), se trae la cuenta en vez de vaciarla',async()=>{
 const a=await ENG28();
 try{
  const A=DEV28(a,'user_a');A.seed(DOC28);await A.sync();
  A.ls.delete(A.KEY);
  const r=await A.sync('abrir');assert.equal(r.ok,true);assert.equal(r.pulled,true);assert.deepEqual(hid28(A.doc()),['h1']);assert.deepEqual(hid28(srv28(a,'user_a').doc),['h1'],'la cuenta no se vació');
  /* borrar de verdad una entrada sí se sincroniza */
  A.edit(d=>{d.humidor=[]});await A.fire();assert.deepEqual(hid28(srv28(a,'user_a').doc),[]);
  /* y vaciar todo a mano, entrada por entrada, también */
  A.edit(d=>{d.diario=[];d.favs={artesanos:[],cigarros:[],lugares:[]};d.pasaporte={artesanos:{},cigarros:{},lugares:{}};d.ratings={}});await A.fire();
  const s=srv28(a,'user_a').doc;assert.equal(A.X.hasData(s),false,'lo que la persona quitó se quitó en la cuenta');
 }finally{a.done()}
});
test('LHB-31: si el teléfono no puede guardar lo traído, lo dice y no marca la pasada como buena; lo escrito mientras se sincroniza se junta en vez de pisarse',async()=>{
 const a=await ENG28();
 try{
  const A=DEV28(a,'user_a'),B=DEV28(a,'user_a');A.seed(DOC28);await A.sync();
  B.st.failSet=true;let r=await B.sync('entrar');assert.equal(r.fail,'storage');assert.equal(B.eng.status().state,'error');assert.equal(JSON.parse(B.ls.get('lhb_mihoja_v1_sync')).at,null,'la meta solo dice de quién es: la pasada no se marcó como hecha');assert.deepEqual(B.live().map(t=>t.ms),[20e3]);
  B.st.failSet=false;r=await B.sync('reintento');assert.equal(r.ok,true);assert.deepEqual(hid28(B.doc()),['h1']);
  /* alguien escribe en el teléfono mientras la pasada está en el aire */
  B.net.beforePut=null;A.edit(d=>{d.humidor.push({id:'hA',marca:'A',actualizado:'2026-10-10'})});await A.fire();
  const orig=B.D.api;let hit=false;B.D.api=async(C,m,p,b,u,h)=>{const out=await orig(C,m,p,b,u,h);if(m==='GET'&&!hit){hit=true;const d=B.doc();d.humidor.push({id:'hB',marca:'B',actualizado:'2026-10-11'});B.ls.set(B.KEY,JSON.stringify(d))}return out};
  r=await B.sync('abrir');assert.equal(r.ok,true);assert.deepEqual(hid28(B.doc()),['h1','hA','hB'],'lo traído y lo escrito en medio están los dos');
  await B.fire();await B.sync();assert.deepEqual(hid28(srv28(a,'user_a').doc),['h1','hA','hB'],'lo escrito en medio llegó a la cuenta en la pasada siguiente');
 }finally{a.done()}
});
test('LHB-31: guardar en el teléfono sincroniza tras una pausa y una sola vez; lo que la propia sincronización escribe no la dispara otra vez, y sin cambios no hay red',async()=>{
 const a=await ENG28();
 try{
  const A=DEV28(a,'user_a');A.seed(DOC28);await A.sync();A.net.log.length=0;
  A.edit(d=>{d.ratings.c9=3});A.edit(d=>{d.ratings.c9=4});A.edit(d=>{d.ratings.c9=5});
  assert.equal(A.live().length,1,'tres cambios seguidos, un solo temporizador');
  await A.fire();assert.deepEqual(A.net.log,['GET','PUT']);assert.equal(srv28(a,'user_a').doc.ratings.c9,5);
  A.net.log.length=0;await A.fire();assert.deepEqual(A.net.log,[],'nada pendiente');
  /* un cambio solo de lo del teléfono no toca la red */
  A.edit(d=>{d.draft={x:2};d.cambios=9});await A.fire();assert.deepEqual(A.net.log,[],'lo que solo es del teléfono no sincroniza');
  /* lo traído de otro teléfono no dispara un guardado (setDoc avisa a changed, pero se ignora) */
  const B=DEV28(a,'user_a');await B.sync();B.edit(d=>{d.ratings.c8=2});await B.fire();A.net.log.length=0;
  await A.sync();assert.equal(A.doc().ratings.c8,2);assert.equal(A.live().filter(t=>t.ms===2500).length,0,'ningún guardado nuevo quedó pendiente');
  /* sin cuenta, un cambio no pide nada */
  const S=DEV28(a,'user_a');S.st.acct=null;S.seed(DOC28);S.edit(d=>{d.ratings.z=1});await S.fire();assert.deepEqual(S.net.log,[]);
  /* abrir la app con cuenta sincroniza a los 1,5 s; sin cuenta no */
  const O=DEV28(a,'user_a');O.eng.start();assert.deepEqual(O.live().map(t=>t.ms),[1500]);const N=DEV28(a,'user_a');N.st.acct=null;N.eng.start();assert.deepEqual(N.live().map(t=>t.ms),[]);
 }finally{a.done()}
});
test('LHB-28: importar un respaldo junta con lo que ya hay y nunca reemplaza; hoja.js manda Mi Hoja por el juntador y avisa al motor en cada escritura',()=>{
 const h=read('hoja.js').replace(/\r\n/g,'\n'),ix=read('index.html'),sw=read('sw.js');
 assert.ok(/const m=LHB_MERGE\.merge\(null,s,inc,\{prefer:'local'\}\)/.test(h),'importar junta con prefer local');
 assert.ok(!/s\.humidor=inc\.humidor|s\.diario=inc\.diario/.test(h),'importar ya no reemplaza las listas');
 assert.ok(/function write\(s,quiet\)\{if\(SYNC&&!SYNC\.isolate\(\)\)\{[^}]*\}if\(SYNC&&!quiet&&!SYNC\.ensureOwner\(\)\)\{[^}]*\}let prev=null;try\{if\(SYNC&&!quiet\)prev=localStorage\.getItem\(KEY\);const txt=JSON\.stringify\(s\);localStorage\.setItem\(KEY,txt\);STRAW=txt\}catch\(e\)\{[^}]*\}if\(SYNC&&!quiet\)SYNC\.changed\(prev\)/.test(h),'cada escritura de la persona avisa al motor y exige poder anotar la dueña');
 assert.ok(h.includes('SYNC=window.LHB_SYNC({')&&h.includes('SYNC.start();'),'hoja.js arma y arranca el motor');
 assert.ok(h.includes("SYNC.run('mi-hoja',{minAge:20e3})"),'abrir Mi Hoja sincroniza si pasaron 20 segundos');
 assert.ok(h.includes("onApplied:()=>{if(/^#\\/mihoja(\\/(humidor|diario|pasaporte|favoritos))?$/.test(location.hash)&&!document.body.classList.contains('sheet-on'))A.route()}"),'lo que llega de otro teléfono se pinta solo en las listas de Mi Hoja y sin una hoja abierta');
 assert.ok(h.includes("listen:(ev,f)=>{if(ev==='online')window.addEventListener('online',f);else document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')f()})}"),'el navegador avisa al volver la red y al ver la página');
 assert.ok(h.includes("setDoc:(d,exp)=>{if(exp!==undefined&&LHB_MERGE.stable(load())!==exp)return 'stale';ST=normalize(d);return write(ST)}"),'lo que llega se guarda por write, solo si la copia sigue igual a la que se leyó, y devuelve si se pudo');
 assert.ok(ix.indexOf('sync.js')>0&&ix.indexOf('sync.js')<ix.indexOf('hoja.js'),'sync.js carga antes que hoja.js');
 assert.ok(sw.includes("'sync.js'"),'sync.js está en el caché del shell');
});
test('LHB-31: borrar la última entrada mientras se sincroniza también llega a la cuenta, y no se confunde con una pérdida',async()=>{
 const a=await ENG28();
 try{
  const A=DEV28(a,'user_a');A.seed({...DOC28,diario:[],favs:{artesanos:[],cigarros:[],lugares:[]},pasaporte:{artesanos:{},cigarros:{},lugares:{}},ratings:{}});await A.sync();assert.deepEqual(hid28(srv28(a,'user_a').doc),['h1']);
  const orig=A.D.api;let hit=false;A.D.api=async(C,m,p,b,u,h)=>{const out=await orig(C,m,p,b,u,h);if(m==='GET'&&!hit){hit=true;A.edit(d=>{d.humidor=[]})}return out};
  await A.sync('guardado');await A.fire();await A.sync();
  const s=srv28(a,'user_a').doc;assert.deepEqual(hid28(s),[],'el borrado de la última entrada llegó');assert.deepEqual(hid28(A.doc()),[]);
  assert.equal(JSON.parse(A.ls.get('lhb_mihoja_v1_sync')).dirty,false,'al terminar nada queda marcado como pendiente');
  /* una copia que desaparece sin que nadie escriba sí se trae */
  const B=DEV28(a,'user_a');B.seed(DOC28);await B.sync();B.ls.delete(B.KEY);await B.sync();assert.deepEqual(hid28(B.doc()),['h1']);
 }finally{a.done()}
});
test('LHB-28: la tarjeta de entrar dice que lo guardado en el teléfono pasa a la cuenta solo cuando hay algo guardado',async()=>{
 const body=async(hasLocal)=>{let txt=null;const h=CUENTA_HARNESS({hasLocal});h.D.ui.card=(t,p)=>{if(t==='Entra para usar Mi Hoja')txt=p};await h.A.require(h.go);await tick();return txt};
 const con=await body(()=>true),sin=await body(()=>false),nada=await body(undefined);
 assert.ok(con&&con.includes('Lo que ya tienes guardado en este teléfono pasa a tu cuenta al entrar.'),'con datos guardados lo dice');
 assert.ok(sin&&!sin.includes('pasa a tu cuenta'),'sin datos no promete nada');assert.ok(nada&&!nada.includes('pasa a tu cuenta'),'sin la función tampoco');
 assert.ok(con.startsWith('Tu humidor, tu diario, tu pasaporte y tus favoritos quedan con tu cuenta.')&&con.endsWith('siguen abiertos sin cuenta.'),'el resto del texto no cambia');
 const hj=read('hoja.js');assert.ok(hj.includes('hasLocal:()=>LHB_MERGE.hasData(S())'),'hoja.js decide con lo guardado de verdad');
});
test('LHB-31: la línea de estado del respaldo dice si Mi Hoja está en la cuenta, sincronizando, sin conexión o con error; y el aviso de respaldo ya no dice que todo vive solo en el teléfono',async()=>{
 const a=await ENG28();
 try{
  const A=DEV28(a,'user_a');A.seed(DOC28);await A.sync();assert.deepEqual(A.st.states,['syncing','ok']);
  const s=A.eng.status();assert.equal(s.state,'ok');assert.equal(s.at,'2026-10-27T12:00:00.000Z');
  A.st.states.length=0;A.net.off=true;A.edit(d=>{d.ratings.q=1});await A.fire();assert.deepEqual(A.st.states.slice(0,2),['syncing','offline']);assert.equal(A.eng.status().state,'offline');
  A.st.states.length=0;A.net.off=false;A.net.status={GET:500};await A.sync();assert.deepEqual(A.st.states,['syncing','error']);
  const S=DEV28(a,'user_a');S.st.acct=null;await S.sync();assert.equal(S.eng.status().state,'off');
  /* una función de aviso que falla no rompe la sincronización */
  const B=DEV28(a,'user_a');B.D.onState=()=>{throw new Error('pantalla')};B.seed(DOC28);const r=await B.sync();assert.equal(r.ok,true);
 }finally{a.done()}
 const h=read('hoja.js').replace(/\r\n/g,'\n');
 const line=h.match(/const syncLine=\(\)=>\{[\s\S]*?\n/)[0];
 for(const m of ['Tu Mi Hoja está en tu cuenta','Sincronizando con tu cuenta','Sin conexión. Tus cambios quedan en este teléfono','No pudimos sincronizar con tu cuenta'])assert.ok(line.includes(m),m);
 assert.ok(/id="syncSt" aria-live="polite"/.test(line),'se anuncia sin interrumpir');
 assert.ok(/\$\{syncLine\(\)\}<\/section>/.test(h),'está en el panel de respaldo');
 assert.ok(/onState:\(\)=>\{const el=document\.getElementById\('syncSt'\);if\(el\)el\.outerHTML=syncLine\(\)\}/.test(h),'se repinta cuando cambia el estado');
 assert.ok(!h.includes('viven solo en este teléfono'),'el aviso ya no dice que todo vive solo en el teléfono');
});
test('LHB-28: exportar e importar solo se alcanzan desde las listas de Mi Hoja, que ya pasan por la puerta; ningún otro archivo los menciona',()=>{
 const h=read('hoja.js').replace(/\r\n/g,'\n');const cnt=(s,re)=>(s.match(re)||[]).length;
 for(const f of ['app.js','index.html','cuenta.js'])assert.equal(cnt(read(f),/exportar|importar|impF|data-exp/g),0,f+' no menciona el respaldo');
 assert.equal(cnt(h,/\bexportar\b/g),2,'exportar: su definición y el botón del panel');
 assert.equal(cnt(h,/\bimportar\b/g),3,'importar: su definición, un comentario y el selector del panel');
 const chunk=n=>{const i=h.indexOf('\nfunction '+n+'(');assert.ok(i>0,n);const j=h.indexOf('\nfunction ',i+10);return h.slice(i,j>0?j:h.length)};
 for(const v of ['vHumidor','vDiario','vPasaporte','vFavoritos'])assert.equal(cnt(chunk(v),/backupPanel\(\)/g),1,v+' trae el panel de respaldo');
 assert.equal(cnt(h,/backupPanel\(\)/g),4,'el panel solo está en esas cuatro listas');
 assert.equal(cnt(h,/\$\{backupBanner\(\)\}|backupBanner\(\)`/g),1,'el aviso solo cuelga del submenú de Mi Hoja');
 assert.deepEqual(['vHumidor','vDiario','vPasaporte','vFavoritos'].map(n=>cnt(h,new RegExp('\\b'+n+'\\b','g'))),[4,3,2,2],'esas listas solo se llaman desde Mi Hoja y desde sí mismas');
 for(const n of ['vHumidor','vDiario','vPasaporte','vFavoritos'])assert.equal(cnt(read('app.js'),new RegExp('\\b'+n+'\\b','g')),0,'app.js no abre '+n);
 assert.ok(/function vMiHoja\(sub\)\{requireAccount\(\(\)=>vMiHojaIn\(sub\)/.test(h),'Mi Hoja pasa por la cuenta');
 assert.ok(/headers:\{Authorization:'Bearer '\+t,\.\.\.\(body\?\{'Content-Type':'application\/json'\}:\{\}\),\.\.\.\(extra\|\|\{\}\)\}/.test(h),'api manda las cabeceras de más (If-Match)');
});
test('LHB-31 (Codex ronda 1): de quién es lo guardado se anota antes de la red: si la primera pasada falla y luego entra otra cuenta, lo de la primera no se sube a la segunda',async()=>{
 const a=await ENG28();
 try{
  const P=DEV28(a,'user_a');P.seed({...DOC28,diario:[{id:'dA',fecha:'2026-10-20',nota:'privada de A'}]});
  P.net.status={GET:503};let r=await P.sync('entrar');assert.equal(r.fail,'get-503');
  assert.equal(P.ls.get('lhb_mihoja_v1_owner'),'user_a','la dueña quedó anotada aunque la pasada falló');
  P.net.status=null;P.st.acct='user_b';P.st.user='user_b';
  r=await P.sync('entrar');assert.equal(r.ok,true,JSON.stringify(r));
  assert.deepEqual((srv28(a,'user_b').doc.diario||[]).map(x=>x.id),[],'lo de A no llegó a la cuenta de B');
  assert.deepEqual(JSON.parse(P.ls.get('lhb_mihoja_v1_de_user_a')).diario.map(x=>x.id),['dA'],'lo de A quedó apartado');
  assert.equal(P.ls.get('lhb_mihoja_v1_owner'),'user_b');
  /* si no se puede ni anotar la dueña, no se toca la red */
  const Q=DEV28(a,'user_c');Q.seed(DOC28);Q.st.failKey='lhb_mihoja_v1_owner';Q.net.log.length=0;
  r=await Q.sync('entrar');assert.equal(r.fail,'storage');assert.deepEqual(Q.net.log,[],'sin anotar la dueña no se pide nada');
 }finally{a.done()}
});
test('LHB-31 (Codex ronda 1): si no se puede anotar lo sincronizado, la pasada falla, conserva la dueña y la siguiente no se fía de la base vieja',async()=>{
 const a=await ENG28();
 try{
  const P=DEV28(a,'user_a');P.seed(DOC28);await P.sync('entrar');
  P.edit(d=>{d.diario.push({id:'d2',fecha:'2026-10-21',nota:'x'})});
  P.st.failKey='lhb_mihoja_v1_sync';let r=await P.eng.run('guardado');await new Promise(x=>setTimeout(x,20));
  assert.equal(r.fail,'storage');assert.equal(P.eng.status().state,'error');assert.equal(P.ls.get('lhb_mihoja_v1_owner'),'user_a','la dueña sigue anotada');
  P.st.failKey=null;P.edit(d=>{d.diario.push({id:'d4',fecha:'2026-10-23',nota:'z'})});
  /* otro teléfono recibe d2 (que subió la pasada que no pudo anotar la meta) y la borra junto con h1; esta pestaña recuerda la base de esa pasada, así que los dos borrados se respetan y lo escrito después aquí no se pierde */
  const B=DEV28(a,'user_a');await B.sync();assert.ok(B.doc().diario.some(x=>x.id==='d2'),'B recibió d2');B.edit(d=>{d.humidor=[];d.diario=d.diario.filter(x=>x.id!=='d2')});await B.fire();
  r=await P.sync('reintento');assert.equal(r.ok,true,JSON.stringify(r));assert.ok(P.doc().diario.some(x=>x.id==='d4'),'lo escrito aquí no se pierde');assert.ok(!P.doc().humidor.some(x=>x.id==='h1'),'el borrado del otro teléfono sobrevive a la pasada que no pudo anotar la meta');assert.ok(!P.doc().diario.some(x=>x.id==='d2'),'lo que subió esa pasada y el otro borró no vuelve (la base vieja no lo conoce)');
  /* con la meta ya buena, la siguiente pasada vuelve a usar la base y respeta los borrados */
  B.edit(d=>{d.diario=d.diario.filter(x=>x.id!=='d1')});await B.fire();await P.sync();assert.ok(!P.doc().diario.some(x=>x.id==='d1'),'el borrado de otro teléfono llega otra vez');
  /* cambiar de cuenta tras el fallo no sube lo de A a B */
  P.st.failKey='lhb_mihoja_v1_sync';P.edit(d=>{d.diario.push({id:'d3',fecha:'2026-10-22',nota:'y'})});await P.eng.run('guardado');await new Promise(x=>setTimeout(x,20));P.st.failKey=null;
  P.st.acct='user_b';P.st.user='user_b';r=await P.sync('entrar');assert.equal(r.ok,true);assert.ok(!(srv28(a,'user_b').doc.diario||[]).some(x=>x.id==='d3'),'lo de A no llegó a B');
 }finally{a.done()}
});
test('LHB-31 (Codex ronda 1): un reintento tras fallar la red al cambiar de cuenta no pisa lo apartado ni lo de la cuenta nueva; lo apartado nunca se sobrescribe',async()=>{
 const a=await ENG28();
 try{
  const P=DEV28(a,'user_a');P.seed({...DOC28,diario:[{id:'dA',fecha:'2026-10-20',nota:'A'}]});await P.sync('entrar');
  P.edit(d=>{d.diario.push({id:'dA2',fecha:'2026-10-21',nota:'sin subir'})});
  P.st.acct='user_b';P.st.user='user_b';P.net.status={GET:503};
  let r=await P.sync('entrar');assert.equal(r.fail,'get-503');
  assert.deepEqual(P.doc().diario||[],[],'B empieza con Mi Hoja vacía');assert.equal(P.ls.get('lhb_mihoja_v1_owner'),'user_b');
  P.edit(d=>{d.diario=[{id:'dB',fecha:'2026-10-22',nota:'de B'}]});
  P.net.status=null;r=await P.sync('reintento');assert.equal(r.ok,true,JSON.stringify(r));
  assert.deepEqual(P.doc().diario.map(x=>x.id),['dB'],'lo de B sigue en B');assert.deepEqual(srv28(a,'user_b').doc.diario.map(x=>x.id),['dB']);
  assert.deepEqual(JSON.parse(P.ls.get('lhb_mihoja_v1_de_user_a')).diario.map(x=>x.id).sort(),['dA','dA2'],'lo de A (con lo que no se había subido) sigue apartado');
  /* ya hay una copia apartada de A: la próxima se guarda en otra llave */
  P.st.acct='user_a';P.st.user='user_a';P.edit(d=>{d.diario=[{id:'dA3',fecha:'2026-10-23',nota:'otra vez A'}]});
  P.st.acct='user_b';P.st.user='user_b';P.st.acct='user_a';P.eng.isolate();P.edit(d=>{d.diario=[{id:'dX',fecha:'2026-10-24',nota:'x'}]});P.st.acct='user_b';P.st.user='user_b';
  assert.equal(P.eng.isolate(),true);
  assert.deepEqual(JSON.parse(P.ls.get('lhb_mihoja_v1_de_user_a')).diario.map(x=>x.id).sort(),['dA','dA2'],'la copia apartada antes no se sobrescribió');
  assert.ok(P.ls.get('lhb_mihoja_v1_de_user_a_2'),'la nueva copia apartada tiene su propia llave');
 }finally{a.done()}
});
test('LHB-31 (Codex ronda 1): al cambiar de cuenta, Mi Hoja se aísla al momento (sin esperar la red) y una pasada reciente de otra cuenta no cuenta',async()=>{
 const a=await ENG28();
 try{
  const P=DEV28(a,'user_a');P.seed(DOC28);await P.sync('entrar');P.net.log.length=0;
  P.advance(5e3);P.st.acct='user_b';P.st.user='user_b';
  assert.equal(P.eng.isolate(),true);assert.deepEqual(P.doc().humidor||[],[],'B ve su Mi Hoja vacía al instante');assert.deepEqual(P.net.log,[],'sin tocar la red');assert.equal(P.ls.get('lhb_mihoja_v1_owner'),'user_b');
  P.st.acct='user_a';P.st.user='user_a';P.eng.isolate();P.advance(5e3);P.st.acct='user_b';P.st.user='user_b';
  const r=await P.eng.run('mi-hoja',{minAge:20e3});assert.notEqual(r.skip,'reciente','la pasada de A hace poco no vale para B');await new Promise(x=>setTimeout(x,20));
  /* sin cuenta o con la misma dueña, isolate no toca nada */
  const S=DEV28(a,'user_a');S.st.acct=null;S.seed(DOC28);assert.equal(S.eng.isolate(),true);assert.deepEqual(S.doc().humidor.map(x=>x.id),['h1']);
  const T=DEV28(a,'user_a');let locks=0;T.D.lock=f=>{locks++;return f()};T.seed(DOC28);await T.sync();assert.equal(locks,1,'la pasada corre dentro del candado entre pestañas');assert.equal(T.eng.isolate(),true);assert.deepEqual(T.doc().humidor.map(x=>x.id),['h1']);
 }finally{a.done()}
});
test('LHB-31 (Codex ronda 1): si la cuenta cambia mientras una pasada espera la red, esa pasada no aplica nada ni anota nada',async()=>{
 const a=await ENG28();
 try{
  const P=DEV28(a,'user_a');P.seed(DOC28);await P.sync('entrar');
  P.edit(d=>{d.humidor.push({id:'hA',marca:'A',actualizado:'2026-10-25'})});
  const orig=P.D.api;let swapped=false;
  P.D.api=async(C,m,p,b,u,h)=>{const out=await orig(C,m,p,b,u,h);if(m==='PUT'&&!swapped){swapped=true;P.st.acct='user_b';P.st.user='user_b';P.eng.isolate();P.edit(d=>{d.humidor=[{id:'hB',marca:'B',actualizado:'2026-10-25'}]})}return out};
  let r=await P.sync('guardado');assert.equal(r.skip,'other-account');
  const meta=JSON.parse(P.ls.get('lhb_mihoja_v1_sync'));assert.equal(meta.sub,'user_b','la meta no vuelve a nombrar a A');
  assert.deepEqual(P.doc().humidor.map(x=>x.id),['hB'],'lo de B sigue intacto');
  P.D.api=orig;r=await P.sync('entrar');assert.equal(r.ok,true,JSON.stringify(r));
  assert.deepEqual(srv28(a,'user_b').doc.humidor.map(x=>x.id),['hB'],'a B le llega solo lo suyo');assert.deepEqual(hid28(srv28(a,'user_a').doc),['h1','hA'],'lo de A llegó a A');
 }finally{a.done()}
});
test('LHB-31 (Codex ronda 1): con la cuenta cambiada durante la lectura o durante el guardado, la pasada se detiene al instante y no manda nada más',async()=>{
 const a=await ENG28();
 try{
  const mk=async()=>{const P=DEV28(a,'user_a');P.seed(DOC28);await P.sync('entrar');P.edit(d=>{d.humidor.push({id:'hA',marca:'A',actualizado:'2026-10-25'})});P.net.log.length=0;return P};
  const swapOn=(P,method)=>{const orig=P.D.api;let swapped=false;P.D.api=async(C,m,p,b,u,h)=>{const out=await orig(C,m,p,b,u,h);if(m===method&&!swapped){swapped=true;P.st.acct='user_b';P.st.user='user_b';P.eng.isolate()}return out}};
  let P=await mk();swapOn(P,'GET');let r=await P.sync('guardado');
  assert.equal(r.skip,'other-account');assert.deepEqual(P.net.log,['GET'],'tras el cambio durante la lectura no se manda el guardado de A');
  P=await mk();P.net.status={PUT:500};swapOn(P,'PUT');r=await P.sync('guardado');
  assert.equal(r.skip,'other-account','una respuesta de error que llega ya con otra cuenta no cuenta como fallo de la nueva');assert.equal(P.eng.status().state,'off');assert.deepEqual(P.net.log,['GET','PUT']);
 }finally{a.done()}
});
test('LHB-31 (Codex ronda 1): una pasada hecha hace poco por otra cuenta no frena la de ahora',async()=>{
 const a=await ENG28();
 try{
  const P=DEV28(a,'user_a');P.seed(DOC28);await P.sync('entrar');P.advance(5e3);P.st.acct='user_b';P.st.user='user_b';
  const r=await P.eng.run('mi-hoja',{minAge:20e3});assert.notEqual(r.skip,'reciente','el tiempo de A no vale para B');
  const Q=DEV28(a,'user_a');Q.seed(DOC28);await Q.sync('entrar');Q.advance(5e3);Q.net.log.length=0;
  assert.equal((await Q.eng.run('mi-hoja',{minAge:20e3})).skip,'reciente','la misma cuenta sí espera');assert.deepEqual(Q.net.log,[]);
 }finally{a.done()}
});
test('LHB-31 (Codex ronda 2): lo escrito antes de la primera pasada ya es de quien lo escribió, aunque entre otra cuenta',async()=>{
 const a=await ENG28();
 try{
  const P=DEV28(a,'user_a');P.seed(DOC28);P.edit(d=>{d.humidor.push({id:'hA',marca:'A',actualizado:'2026-10-25'})});
  assert.equal(P.ls.get('lhb_mihoja_v1_owner'),'user_a','al escribir queda anotada la dueña');
  P.st.acct='user_b';P.st.user='user_b';const r=await P.sync('b');assert.equal(r.ok,true,JSON.stringify(r));
  assert.deepEqual(hid28(srv28(a,'user_b').doc),[],'a B no le llega nada de A');assert.ok(String(P.ls.get('lhb_mihoja_v1_de_user_a')).includes('hA'),'lo de A queda apartado');
 }finally{a.done()}
});
test('LHB-31 (Codex ronda 2): si la dueña se anota y la meta no, la meta de otra cuenta no sirve de base y no borra nada de la cuenta nueva',async()=>{
 const a=await ENG28();
 try{
  const Q=DEV28(a,'user_b');Q.seed(DOC28);await Q.sync('b');
  const P=DEV28(a,'user_a');P.seed(DOC28);await P.sync('a');
  P.st.acct='user_b';P.st.user='user_b';P.st.failKey='lhb_mihoja_v1_sync';assert.equal(P.eng.isolate(),false,'la meta no se pudo escribir');
  P.st.failKey=null;assert.equal(P.eng.isolate(),true);
  P.seed({...P.doc(),diario:[{id:'d9',fecha:'2026-10-25',nota:'b'}]});const r=await P.sync('b');assert.equal(r.ok,true,JSON.stringify(r));
  const s=srv28(a,'user_b').doc;assert.equal(s.ratings.c1,4,'la estrella de B sigue');assert.ok(s.favs.artesanos.includes('a1'),'el favorito de B sigue');assert.deepEqual(hid28({humidor:s.diario}),['d1','d9']);
 }finally{a.done()}
});
test('LHB-31 (Codex ronda 2): lo que otra pestaña borra mientras esta espera la red queda marcado como pendiente y el borrado llega a la cuenta',async()=>{
 const a=await ENG28();
 try{
  const base={...DOC28,diario:[],pasaporte:{artesanos:{},cigarros:{},lugares:{}},favs:{artesanos:[],cigarros:[],lugares:[]},ratings:{}};
  const P=DEV28(a,'user_a');P.seed(base);await P.sync('entrar');
  const E2=SYNC28().LHB_SYNC(P.D);const orig=P.D.api;let done=false;
  P.D.api=async(...args)=>{const out=await orig(...args);if(args[1]==='GET'&&!done){done=true;const d=P.doc();d.humidor=[];P.ls.set(P.KEY,JSON.stringify(d));E2.changed()}return out};
  let r=await P.sync('guardado');assert.equal(r.ok,true,JSON.stringify(r));
  P.D.api=orig;r=await P.sync('siguiente');assert.equal(r.ok,true,JSON.stringify(r));
  assert.deepEqual(hid28(P.doc()),[],'lo borrado no vuelve');assert.deepEqual(hid28(srv28(a,'user_a').doc),[],'el borrado llega a la cuenta');
 }finally{a.done()}
});
test('LHB-31 (Codex ronda 2): lo borrado antes de recargar la página sigue siendo un borrado: la marca de pendiente está en la meta, no solo en la pestaña',async()=>{
 const a=await ENG28();
 try{
  const base={...DOC28,diario:[],pasaporte:{artesanos:{},cigarros:{},lugares:{}},favs:{artesanos:[],cigarros:[],lugares:[]},ratings:{}};
  const P=DEV28(a,'user_a');P.seed(base);await P.sync('entrar');
  P.edit(d=>{d.humidor=[]});assert.equal(JSON.parse(P.ls.get('lhb_mihoja_v1_sync')).dirty,true,'la meta guarda que la persona escribió');
  const P2=SYNC28().LHB_SYNC(P.D);const r=await P2.run('recarga');assert.equal(r.ok,true,JSON.stringify(r));
  assert.deepEqual(hid28(P.doc()),[],'tras recargar, lo borrado no vuelve');assert.deepEqual(hid28(srv28(a,'user_a').doc),[],'el borrado llega a la cuenta');
 }finally{a.done()}
});
test('LHB-31 (Codex ronda 3): sin poder anotar la dueña no se guarda; la base recordada no pisa una meta más nueva de otra pestaña; una llave __proto__ anidada cuenta al comparar',async()=>{
 const a=await ENG28();
 try{
  const P=DEV28(a,'user_a');P.st.failKey='lhb_mihoja_v1_owner';assert.equal(P.eng.ensureOwner(),false,'si la dueña no se puede anotar, hoja.js no guarda');
  P.st.failKey=null;assert.equal(P.eng.ensureOwner(),true);assert.equal(P.ls.get('lhb_mihoja_v1_owner'),'user_a');assert.equal(P.eng.ensureOwner(),true,'ya anotada no hace nada');
  const S=DEV28(a,'user_a');S.st.acct=null;assert.equal(S.eng.ensureOwner(),true,'sin cuenta no hay a quién anotar');
  /* la pestaña 1 sube una adición y no puede anotar la meta; la pestaña 2 sincroniza dos veces y deja una meta más nueva; otro teléfono borra lo de la pestaña 2 */
  const base={...DOC28,diario:[],pasaporte:{artesanos:{},cigarros:{},lugares:{}},favs:{artesanos:[],cigarros:[],lugares:[]},ratings:{}};
  const T=DEV28(a,'user_a');T.seed(base);await T.sync('entrar');
  T.edit(d=>{d.humidor.push({id:'one',marca:'1',actualizado:'2026-10-25'})});T.st.failKey='lhb_mihoja_v1_sync';let r=await T.eng.run('guardado');assert.equal(r.fail,'storage');T.st.failKey=null;
  const E2=SYNC28().LHB_SYNC(T.D);r=await E2.run('pestana 2');assert.equal(r.ok,true,JSON.stringify(r));
  T.edit(d=>{d.humidor.push({id:'two',marca:'2',actualizado:'2026-10-26'})});r=await E2.run('pestana 2 otra vez');assert.equal(r.ok,true,JSON.stringify(r));
  const B=DEV28(a,'user_a');await B.sync();B.edit(d=>{d.humidor=d.humidor.filter(x=>x.id!=='two')});await B.fire();
  r=await T.sync('reintento');assert.equal(r.ok,true,JSON.stringify(r));
  assert.ok(!T.doc().humidor.some(x=>x.id==='two'),'la base más nueva de la pestaña 2 hace que el borrado de "two" sobreviva');assert.ok(T.doc().humidor.some(x=>x.id==='one'));
  const {LHB_MERGE:X}=SYNC28();assert.equal(X.same(JSON.parse('{"a":{"__proto__":{"x":1}}}'),JSON.parse('{"a":{"__proto__":{"x":2}}}')),false,'dos registros con distinta llave __proto__ anidada no son iguales');
  assert.equal(X.same(JSON.parse('{"a":{"__proto__":{"x":1}}}'),JSON.parse('{"a":{"__proto__":{"x":1}}}')),true);
 }finally{a.done()}
});
test('LHB-31 (Codex ronda 4): un teléfono que se quedó vacío por pérdida trae la cuenta aunque la pasada anterior no pudo anotar la meta',async()=>{
 const a=await ENG28();
 try{
  const T=DEV28(a,'user_a');T.seed(DOC28);await T.sync('entrar');const B=DEV28(a,'user_a');await B.sync();
  B.edit(d=>{d.humidor.push({id:'x1',marca:'X',actualizado:'2026-10-25'})});await B.fire();
  T.st.failKey='lhb_mihoja_v1_sync';let r=await T.eng.run('trae');assert.equal(r.fail,'storage');T.st.failKey=null;
  T.seed({schema:1,creado:'',humidor:[],diario:[],pasaporte:{artesanos:{},cigarros:{},lugares:{}},favs:{artesanos:[],cigarros:[],lugares:[]},ratings:{}});
  r=await T.sync('reintento');assert.equal(r.ok,true,JSON.stringify(r));
  assert.deepEqual(hid28(T.doc()),['h1','x1'],'lo vacío por pérdida no se toma por borrado: se trae la cuenta');assert.deepEqual(hid28(srv28(a,'user_a').doc),['h1','x1']);
 }finally{a.done()}
});
test('LHB-31 (Codex ronda 5): tras una pasada que no pudo anotar la meta, recargar no hace que el teléfono borre en la cuenta lo que otro volvió a agregar; y una cata a medias se aparta al cambiar de cuenta',async()=>{
 const a=await ENG28();
 try{
  const P=DEV28(a,'user_a');P.seed(DOC28);await P.sync('entrar');const Q=DEV28(a,'user_a');await Q.sync();
  Q.edit(d=>{d.favs.artesanos=[]});await Q.fire();
  P.st.failBigKey='lhb_mihoja_v1_sync';P.st.failBig=300;let r=await P.eng.run('trae');assert.equal(r.fail,'storage');assert.deepEqual(P.doc().favs.artesanos,[],'P recibió el borrado');
  const m=JSON.parse(P.ls.get('lhb_mihoja_v1_sync'));assert.equal(m.base,null,'la base vieja quedó tachada con una meta mínima');
  P.st.failBigKey=null;const P2=SYNC28().LHB_SYNC(P.D);
  Q.edit(d=>{d.favs.artesanos=['a1']});await Q.fire();
  r=await P2.run('recarga');assert.equal(r.ok,true,JSON.stringify(r));
  assert.deepEqual(srv28(a,'user_a').doc.favs.artesanos,['a1'],'lo que Q volvió a agregar sigue en la cuenta');
  const D=DEV28(a,'user_a');D.eng.ensureOwner();D.seed({schema:1,creado:'',humidor:[],diario:[],pasaporte:{artesanos:{},cigarros:{},lugares:{}},favs:{artesanos:[],cigarros:[],lugares:[]},ratings:{},draft:{marca:'a medias'}});
  D.st.acct='user_b';D.st.user='user_b';assert.equal(D.eng.isolate(),true);assert.ok(String(D.ls.get('lhb_mihoja_v1_de_user_a')).includes('a medias'),'la cata a medias de A queda apartada');
 }finally{a.done()}
});
test('LHB-31 (Codex ronda 6): quitar un corazón antes de la primera sincronización no se deshace; el que se quita en la cuenta tampoco vuelve; lo que solo estaba en uno se conserva',async()=>{
 const a=await ENG28();
 try{
  const P=DEV28(a,'user_a');P.seed({...DOC28,diario:[...DOC28.diario,{id:'d2',fecha:'2026-10-05',nota:'de P'}]});await P.sync('entrar');
  assert.deepEqual(srv28(a,'user_a').doc.favs.artesanos,['a1']);
  /* el teléfono Q traía lo suyo sin cuenta; entra, y la acción pendiente (quitar el corazón) corre antes de la primera pasada */
  const Q=DEV28(a,'user_a');Q.seed({...DOC28,humidor:[...DOC28.humidor,{id:'h9',marca:'Mío',actualizado:'2026-10-09'}]});
  assert.equal(Q.eng.ensureOwner(),true);Q.edit(d=>{d.favs.artesanos=[]});Q.edit(d=>{d.ratings.c9=3});
  const m0=JSON.parse(Q.ls.get('lhb_mihoja_v1_sync'));assert.ok(m0.seed&&m0.seed.favs.artesanos.includes('a1'),'la semilla guarda cómo estaba antes de la primera edición');
  const r=await Q.sync('entrar');assert.equal(r.ok,true,JSON.stringify(r));
  const s=srv28(a,'user_a').doc;assert.deepEqual(s.favs.artesanos,[],'el corazón quitado no vuelve');assert.deepEqual(hid28(s),['h1','h9'],'lo que solo traía Q se sube');assert.deepEqual(s.diario.map(x=>x.id).sort(),['d1','d2'],'lo que solo estaba en la cuenta llega');
  assert.deepEqual(Q.doc().favs.artesanos,[]);assert.deepEqual(Q.doc().diario.map(x=>x.id).sort(),['d1','d2']);
  assert.equal(JSON.parse(Q.ls.get('lhb_mihoja_v1_sync')).seed,undefined,'tras la pasada la semilla se va y queda la base');
  /* la base de verdad: P trae el borrado y no lo deshace */
  await P.sync();assert.deepEqual(P.doc().favs.artesanos,[]);
  /* la semilla no inventa borrados: una entrada que solo tenía el teléfono y se editó queda */
  const pr=JSON.parse('{"ratings":{"__proto__":{"x":1},"a":2},"pasaporte":{"artesanos":{"__proto__":"2026-10-01","b":"2026-10-02"}}}');const mp=Q.X.meet(pr,pr);assert.deepEqual(mp.ratings,{a:2});assert.deepEqual(mp.pasaporte.artesanos,{b:'2026-10-02'});assert.equal(Object.getPrototypeOf(mp.ratings),Object.prototype);assert.equal(({}).x,undefined);
  const meet=Q.X.meet(DOC28,{...DOC28,humidor:[],favs:{artesanos:[],cigarros:[],lugares:[]}});assert.deepEqual(meet.humidor,[]);assert.deepEqual(meet.favs.artesanos,[]);assert.deepEqual(Q.X.meet({...DOC28,humidor:[{id:'x'}]},DOC28).humidor,[],'lo que solo estaba en una copia no es de la base');
  /* sin meta (la llave se perdió) pero con dueña, la primera edición la vuelve a crear con la semilla */
  const W=DEV28(a,'user_a');W.seed(DOC28);assert.equal(W.eng.ensureOwner(),true);W.ls.delete('lhb_mihoja_v1_sync');W.edit(d=>{d.favs.artesanos=[]});const mw=JSON.parse(W.ls.get('lhb_mihoja_v1_sync'));assert.equal(mw.sub,'user_a');assert.ok(mw.seed&&mw.seed.favs.artesanos.includes('a1'),'la meta perdida se recrea con la semilla');
 }finally{a.done()}
});
test('LHB-31 (Codex ronda 6): si otra pestaña guarda justo antes de aplicar lo que llegó, no se pisa: la pasada vuelve a empezar y junta las dos cosas',async()=>{
 const a=await ENG28();
 try{
  const A=DEV28(a,'user_a'),B=DEV28(a,'user_a');A.seed(DOC28);await A.sync();await B.sync();B.edit(d=>{d.favs.cigarros=['k1']});await B.fire();
  const T=SYNC28().LHB_SYNC(A.D);
  A.st.beforeApply=()=>{const prev=A.ls.get(A.KEY);const d=A.doc();d.favs.lugares=['l1'];A.ls.set(A.KEY,JSON.stringify(d));T.changed(prev)};
  const r=await A.sync('trae');assert.equal(r.ok,true,JSON.stringify(r));
  assert.deepEqual(A.doc().favs.lugares,['l1'],'lo que la otra pestaña guardó sigue en el teléfono');assert.deepEqual(A.doc().favs.cigarros,['k1'],'y lo que llegó también');
  const s=srv28(a,'user_a').doc;assert.deepEqual(s.favs.lugares,['l1'],'y sube a la cuenta');assert.deepEqual(s.favs.cigarros,['k1']);
  assert.ok(A.st.setDocs>=2,'primero se intentó aplicar y se rechazó, después se aplicó lo junto');
 }finally{a.done()}
});
test('LHB-31 (Codex ronda 6): dos fallos seguidos sin recargar (meta, luego aplicar) no hacen que el teléfono borre en la cuenta lo que otro volvió a agregar, quepa o no la meta mínima',async()=>{
 for(const lim of [300,10]){
 const a=await ENG28();
 try{
  const P=DEV28(a,'user_a');P.seed(DOC28);await P.sync('entrar');const Q=DEV28(a,'user_a');await Q.sync();
  /* 1: P sube una adición pero no puede anotar la meta (cabe solo la mínima) */
  P.edit(d=>{d.favs.cigarros=['k1']});P.st.failBigKey='lhb_mihoja_v1_sync';P.st.failBig=lim;
  let r=await P.eng.run('p1');assert.equal(r.fail,'storage');
  Q.edit(d=>{d.favs.lugares=['l1']});await Q.sync();await Q.fire();
  /* 2: P quita a1, sube, y no puede aplicar lo que llegó */
  P.edit(d=>{d.favs.artesanos=[]});P.st.failSet=true;r=await P.eng.run('p2');assert.equal(r.fail,'storage');assert.deepEqual(srv28(a,'user_a').doc.favs.artesanos,[],'P subió el borrado');
  /* Q trae el borrado y vuelve a agregar a1 a propósito */
  await Q.sync();Q.edit(d=>{d.favs.artesanos=['a1']});await Q.fire();assert.deepEqual(srv28(a,'user_a').doc.favs.artesanos,['a1']);
  /* 3: P reintenta sin recargar */
  P.st.failSet=false;P.st.failBigKey=null;r=await P.eng.run('p3');assert.equal(r.ok,true,JSON.stringify(r));
  assert.deepEqual(srv28(a,'user_a').doc.favs.artesanos,['a1'],'lo que Q volvió a agregar sigue en la cuenta');assert.deepEqual(P.doc().favs.artesanos,['a1'],'y llega a P');
  assert.deepEqual(srv28(a,'user_a').doc.favs.cigarros,['k1']);assert.deepEqual(srv28(a,'user_a').doc.favs.lugares,['l1']);
  /* tras una pasada completa la base vuelve a servir: un borrado posterior sí viaja */
  P.edit(d=>{d.favs.cigarros=[]});r=await P.eng.run('p4');assert.equal(r.ok,true,JSON.stringify(r));assert.deepEqual(srv28(a,'user_a').doc.favs.cigarros,[],'el borrado de después sí se sincroniza');
 }finally{a.done()}
 }
});
test('LHB-31 (Codex ronda 7): si otra pestaña guarda justo antes de aplicar, se vuelve a juntar con lo leído de nuevo: la acción nueva (volver a agregar) y lo ajeno se conservan, y el borrador más nuevo no se pisa',async()=>{
 const a=await ENG28();
 try{
  const A=DEV28(a,'user_a'),B=DEV28(a,'user_a');A.seed(DOC28);await A.sync();await B.sync();
  A.edit(d=>{d.favs.artesanos=[]});B.edit(d=>{d.favs.cigarros=['k1']});await B.fire();
  const T=SYNC28().LHB_SYNC(A.D);
  A.st.beforeApply=()=>{const prev=A.ls.get(A.KEY);const d=A.doc();d.favs.artesanos=['a1'];A.ls.set(A.KEY,JSON.stringify(d));T.changed(prev)};
  let r=await A.sync('trae');assert.equal(r.ok,true,JSON.stringify(r));
  assert.deepEqual(A.doc().favs.artesanos,['a1'],'volver a agregar en la otra pestaña no se pierde');assert.deepEqual(A.doc().favs.cigarros,['k1'],'lo que llegó de B sí se aplicó');
  await A.fire();await A.sync();
  assert.deepEqual(srv28(a,'user_a').doc.favs.artesanos,['a1'],'y la cuenta lo tiene');assert.deepEqual(srv28(a,'user_a').doc.favs.cigarros,['k1']);
  /* el borrador (cata a medias) no entra en canon: la comparación mira la copia entera */
  const C=DEV28(a,'user_a'),E=DEV28(a,'user_a');C.seed({...DOC28,draft:{marca:'viejo'}});await C.sync();await E.sync();E.edit(d=>{d.ratings.c7=2});await E.fire();
  C.st.beforeApply=()=>{const d=C.doc();d.draft={marca:'nuevo'};C.ls.set(C.KEY,JSON.stringify(d))};
  r=await C.sync('trae');assert.equal(r.ok,true,JSON.stringify(r));assert.deepEqual(C.doc().draft,{marca:'nuevo'},'el borrador más nuevo sigue');assert.equal(C.doc().ratings.c7,2,'y lo que llegó se aplicó');
 }finally{a.done()}
});
test('LHB-31 (Codex ronda 7): un PUT sin respuesta que sí llegó no hace que el teléfono borre lo que otro volvió a agregar; uno que no llegó no deshace un borrado',async()=>{
 const a=await ENG28();
 try{
  /* llegó, se perdió la respuesta, B trae el borrado y vuelve a agregar a1 */
  const A=DEV28(a,'user_a'),B=DEV28(a,'user_a');A.seed(DOC28);await A.sync();await B.sync();
  A.edit(d=>{d.favs.artesanos=[]});A.net.dropAfterPut=true;let r=await A.eng.run('p1');assert.equal(r.skip,'offline');assert.deepEqual(srv28(a,'user_a').doc.favs.artesanos,[],'el PUT sí llegó');
  await B.sync();assert.deepEqual(B.doc().favs.artesanos,[]);B.edit(d=>{d.favs.artesanos=['a1']});await B.fire();assert.deepEqual(srv28(a,'user_a').doc.favs.artesanos,['a1']);
  r=await A.eng.run('p2');assert.equal(r.ok,true,JSON.stringify(r));assert.deepEqual(srv28(a,'user_a').doc.favs.artesanos,['a1'],'lo que B volvió a agregar sigue en la cuenta');
  /* una pasada completa borra el recuerdo del PUT sin respuesta: más tarde, con la cuenta muy adelantada, un borrado normal sigue valiendo */
  B.edit(d=>{d.favs.cigarros=['k1']});await B.fire();await A.sync();B.edit(d=>{d.ratings.r1=1});await B.fire();B.edit(d=>{d.ratings.r2=2});await B.fire();
  A.edit(d=>{d.favs.cigarros=[]});r=await A.eng.run('p3');assert.equal(r.ok,true,JSON.stringify(r));assert.deepEqual(srv28(a,'user_a').doc.favs.cigarros,[],'el borrado normal no se deshace por un recuerdo viejo');
  /* no llegó: el borrado sigue valiendo en el reintento */
  const C=DEV28(a,'user_a');C.seed(DOC28);await C.sync();
  C.edit(d=>{d.favs.cigarros=['k9']});await C.sync();
  C.edit(d=>{d.favs.cigarros=[]});C.net.beforePut=async()=>{throw new TypeError('sin red')};r=await C.eng.run('p1');assert.equal(r.skip,'offline');assert.deepEqual(srv28(a,'user_a').doc.favs.cigarros,['k9']);
  r=await C.eng.run('p2');assert.equal(r.ok,true,JSON.stringify(r));assert.deepEqual(srv28(a,'user_a').doc.favs.cigarros,[],'el borrado que no llegó se sube en el reintento y no se deshace');
  /* un 409 es una respuesta clara: no deja un PUT incierto que luego descarte la base */
  const F=DEV28(a,'user_a'),G=DEV28(a,'user_a');F.seed(DOC28);await F.sync();await G.sync();F.edit(d=>{d.favs.lugares=['l1']});await F.sync();await G.sync();
  F.edit(d=>{d.favs.lugares=[]});F.net.status={PUT:409};r=await F.eng.run('p1');assert.equal(r.fail,'conflict');F.net.status=null;
  G.edit(d=>{d.ratings.q1=1});await G.fire();G.edit(d=>{d.ratings.q2=2});await G.fire();
  r=await F.eng.run('p2');assert.equal(r.ok,true,JSON.stringify(r));assert.deepEqual(srv28(a,'user_a').doc.favs.lugares,[],'el borrado sigue valiendo tras un 409 aunque la cuenta avance');
 }finally{a.done()}
});
test('LHB-31 (Codex ronda 8): un PUT que llegó pero cuya respuesta no se pudo leer, o cuya cuenta salió mientras volvía, no hace que el teléfono borre lo que otro volvió a agregar',async()=>{
 const a=await ENG28();
 try{
  for(const modo of ['cuerpo','salida']){
   const A=DEV28(a,'user_a'),B=DEV28(a,'user_a');A.seed(DOC28);await A.sync();await B.sync();
   const rev0=srv28(a,'user_a').rev;
   A.edit(d=>{d.favs.artesanos=[]});
   if(modo==='cuerpo')A.net.badBody=true;else A.net.afterPut=async()=>{A.st.acct=null;A.st.user=null};
   let r=await A.eng.run('p1');assert.ok(r.fail==='put-200'||r.skip==='other-account',modo+' '+JSON.stringify(r));assert.deepEqual(srv28(a,'user_a').doc.favs.artesanos,[],modo+': el PUT sí llegó');
   await B.sync();B.edit(d=>{d.favs.artesanos=['a1']});await B.fire();assert.deepEqual(srv28(a,'user_a').doc.favs.artesanos,['a1']);
   A.st.acct='user_a';A.st.user='user_a';
   r=await A.eng.run('p2');assert.equal(r.ok,true,modo+' '+JSON.stringify(r));assert.deepEqual(srv28(a,'user_a').doc.favs.artesanos,['a1'],modo+': lo que B volvió a agregar sigue en la cuenta');
   assert.ok(srv28(a,'user_a').rev>rev0);
  }
 }finally{a.done()}
});
test('LHB-31 (Codex ronda 8): si el contador compartido no se puede crear (almacenamiento lleno), lo que otra pestaña borró mientras esta esperaba la red sigue marcado como pendiente y el borrado llega a la cuenta',async()=>{
 const a=await ENG28();
 try{
  const E={schema:1,creado:'2026-10-01T00:00:00.000Z',humidor:[],diario:[],pasaporte:{artesanos:{},cigarros:{},lugares:{}},favs:{artesanos:['a1'],cigarros:[],lugares:[]},ratings:{}};
  const A=DEV28(a,'user_a');A.seed(E);await A.sync();assert.deepEqual(srv28(a,'user_a').doc.favs.artesanos,['a1']);
  const T=SYNC28().LHB_SYNC(A.D);
  A.net.beforeGet=async()=>{A.st.failKey='lhb_mihoja_v1_seq';const prev=A.ls.get(A.KEY);const d=A.doc();d.favs.artesanos=[];A.ls.set(A.KEY,JSON.stringify(d));T.changed(prev)};
  let r=await A.sync('trae');assert.equal(r.ok,true,JSON.stringify(r));
  A.st.failKey=null;
  r=await A.sync('otra');assert.equal(r.ok,true,JSON.stringify(r));
  assert.deepEqual(srv28(a,'user_a').doc.favs.artesanos,[],'el borrado llegó a la cuenta');assert.deepEqual(A.doc().favs.artesanos,[],'y no volvió al teléfono');
 }finally{a.done()}
});
test('LHB-31 (Codex ronda 8): si la meta no se puede escribir, borrar lo último que había sigue siendo un borrado de la persona (la marca en memoria) y no una pérdida que se vuelve a traer',async()=>{
 const a=await ENG28();
 try{
  const E={schema:1,creado:'2026-10-01T00:00:00.000Z',humidor:[],diario:[],pasaporte:{artesanos:{},cigarros:{},lugares:{}},favs:{artesanos:['a1'],cigarros:[],lugares:[]},ratings:{}};
  const P=DEV28(a,'user_a');P.seed(E);await P.sync();P.st.failKey='lhb_mihoja_v1_sync';
  P.edit(d=>{d.favs.artesanos=[]});const r=await P.eng.run('borra');assert.equal(r.fail,'storage','la meta no se pudo anotar');
  assert.deepEqual(srv28(a,'user_a').doc.favs.artesanos,[],'el borrado llegó a la cuenta');assert.deepEqual(P.doc().favs.artesanos,[],'y no se volvió a traer');
 }finally{a.done()}
});
test('LHB-28 (Codex ronda 1): juntar no se rompe con llaves como constructor o __proto__ y no contamina nada',()=>{
 const {LHB_MERGE:X}=SYNC28();const E=o=>({schema:1,creado:'2026-10-01',humidor:[],diario:[],pasaporte:{artesanos:{},cigarros:{},lugares:{}},favs:{artesanos:[],cigarros:[],lugares:[]},ratings:{},...o});
 const base=JSON.parse('{"ratings":{"constructor":3,"toString":2}}');
 let m;assert.doesNotThrow(()=>{m=X.merge(base,E({}),E({ratings:{constructor:3,toString:2}}))});assert.deepEqual(m.ratings,{},'lo que se quitó aquí y el otro no tocó se va, aunque se llame constructor');
 assert.doesNotThrow(()=>{m=X.merge(null,JSON.parse('{"ratings":{"__proto__":{"x":1},"a":2},"pasaporte":{"artesanos":{"__proto__":"2026-10-01","b":"2026-10-02"}}}'),E({}))});
 assert.deepEqual(m.ratings,{a:2});assert.deepEqual(m.pasaporte.artesanos,{b:'2026-10-02'});assert.equal(({}).x,undefined,'Object.prototype intacto');
 assert.equal(Object.getPrototypeOf(m.ratings),Object.prototype,'el resultado no cambia su propio prototipo');assert.equal(m.ratings.x,undefined,'lo de una llave __proto__ no se hereda');
 m=X.merge(null,E({ratings:{constructor:5}}),E({ratings:{}}));assert.equal(m.ratings.constructor,5,'una llave llamada constructor se guarda como cualquier otra');
});
test('LHB-28 (Codex ronda 1): el servidor mira el tamaño antes de leer el JSON, topa también favoritos, sellos y estrellas, rechaza If-Match mal cerrado y responde 503 si D1 falla al revisar el perfil',async()=>{
 const a=await API28();
 try{
  a.mk('user_a','ana_a');
  const big=n=>Array.from({length:n},(_,i)=>'f'+i);
  assert.equal((await a.put('user_a',{schema:1,doc:{favs:{cigarros:big(5001)}}},'0'))[0],413,'más de 5000 favoritos');
  assert.equal((await a.put('user_a',{schema:1,doc:{favs:{cigarros:'x'}}},'0'))[0],400,'favoritos que no son lista');
  assert.equal((await a.put('user_a',{schema:1,doc:{pasaporte:{lugares:Object.fromEntries(big(5001).map(k=>[k,'2026-10-01']))}}},'0'))[0],413,'más de 5000 sellos');
  assert.equal((await a.put('user_a',{schema:1,doc:{ratings:Object.fromEntries(big(5001).map(k=>[k,3]))}},'0'))[0],413,'más de 5000 estrellas');
  assert.equal((await a.put('user_a',{schema:1,doc:{favs:{cigarros:big(5000)}}},'0'))[0],200,'exactamente 5000 pasa');
  let parsed=0;const huge=a.rq(await a.tok('user_a'),'x'.repeat(1000001),{match:'1'});const orig=huge.json;huge.json=async()=>{parsed++;return orig()};
  let r=await a.M.onRequestPut({request:huge,env:a.env});assert.equal(r.status,413,'un cuerpo enorme se rechaza');assert.equal(parsed,0);
  r=await a.M.onRequestPut({request:a.rq(await a.tok('user_a'),{schema:1,doc:DOC28},{match:'1',len:'5000000'}),env:a.env});assert.equal(r.status,413,'el Content-Length enorme se rechaza sin leer el cuerpo');
  for(const m of ['"3','3"','"3 ','W/"3','""'])assert.deepEqual(await a.put('user_a',{schema:1,doc:DOC28},m),[428,{error:'if-match-required'}],'If-Match '+m);
  assert.equal((await a.put('user_a',{schema:1,doc:DOC28},'"1"'))[0],200,'comillas bien cerradas');
  const down={...a.env,DB:{prepare:sql=>sql.includes('FROM profiles')?{bind:()=>({first:async()=>{throw new Error('d1')}})}:a.env.DB.prepare(sql)}};
  assert.deepEqual(await a.get('user_a',down),[503,{error:'unavailable'}]);assert.deepEqual(await a.put('user_a',{schema:1,doc:DOC28},'2',undefined,down),[503,{error:'unavailable'}]);
 }finally{a.done()}
});
test('LHB-31 (Codex ronda 1): hoja.js lee Mi Hoja fresca para sincronizar, deja la copia en memoria por vieja cuando otra pestaña escribe, aparta lo de otra cuenta antes de leer y no cuenta como cambio lo que la app escribe sola',()=>{
 const h=read('hoja.js').replace(/\r\n/g,'\n');
 assert.ok(h.includes("getDoc:()=>{ST=load();STRAW=localStorage.getItem(KEY);return ST}"),'la sincronización lee del almacenamiento y no de la copia en memoria');
 assert.ok(h.includes("window.addEventListener('storage',e=>{if(e.key===null||e.key===KEY)ST=null})"),'otra pestaña que escribe invalida la copia en memoria');
 assert.ok(h.includes("const S=()=>{if(SYNC&&!SYNC.isolate())return DEF();if(ST&&localStorage.getItem(KEY)===STRAW)return ST;ST=load();STRAW=localStorage.getItem(KEY);return ST};"),'S aparta lo de otra cuenta antes de leer, no muestra lo de la otra si no pudo y solo confía en la copia en memoria si el texto guardado no cambió');
 assert.ok(h.includes("if(SYNC&&!SYNC.isolate()){ST=null;toast('No se pudo separar lo de la otra cuenta. Libera espacio y vuelve a entrar.');return false}"),'write no escribe si no se pudo apartar lo de la otra cuenta y suelta la copia en memoria');
 assert.ok(h.includes("if(SYNC&&!quiet&&!SYNC.ensureOwner()){ST=null;toast('No hay espacio para guardar. Exporta un respaldo.');return false}")&&h.includes("STRAW=txt}catch(e){ST=null;toast('No hay espacio para guardar. Exporta un respaldo.');return false}"),'una escritura rechazada suelta la copia en memoria, que ya traía el cambio rechazado');
 assert.ok(read('sync.js').includes('if(inIso)return true;'),'aislar dentro de aislar se corta (write llama a isolate y isolate escribe por setDoc)');
 assert.ok(h.includes("s.migrado=(f||r)?'v5':'nuevo';write(s,true);return s}"),'la copia nueva o dañada que la app crea sola no cuenta como un cambio de la persona');
 assert.ok(h.includes("function write(s,quiet){")&&h.includes("if(SYNC&&!quiet)SYNC.changed(prev)")&&h.includes("if(SYNC&&!quiet)prev=localStorage.getItem(KEY)"),'write acepta quiet y pasa al motor lo que había antes de escribir');
 assert.ok(h.includes("lock:f=>navigator.locks&&navigator.locks.request?navigator.locks.request('lhb_mihoja_sync',f):f()"),'una sola pasada entre pestañas');
 assert.ok(h.includes("SYNC.isolate();SYNC.run('mi-hoja',{minAge:20e3})"),'abrir Mi Hoja aísla antes de pintar');
});
