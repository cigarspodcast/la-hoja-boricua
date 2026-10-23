const test=require('node:test');const assert=require('node:assert');const fs=require('fs');const path=require('path');
const S=path.join(__dirname,'..','site');const read=f=>fs.readFileSync(path.join(S,f),'utf8');const DD=path.join(__dirname,'..','data');const readD=f=>fs.readFileSync(path.join(DD,f),'utf8');
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
test('Spanish UI, Fortaleza wording, prototype note, forbidden names absent',()=>{const all=['index.html','app.js','art.js','hoja.js','fotos.js','data/bundle.js'].map(read).join('\n');
 assert.ok(all.includes('Fortaleza'));assert.ok(!/fuerza/i.test(all),'uses "fuerza"');assert.ok(!/Lector de la Hoja/i.test(all));
 assert.ok(read('app.js').includes('información pública, sujeta a verificación'));
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
 assert.match(sw,/const VERSION='lhb-v37'/);assert.ok(sw.includes("'hoja.js'"));assert.ok(ix.indexOf('hoja.js')<ix.indexOf('app.js'));
 for(const w of ['Cata guiada','Aroma en frío','Encendido','Primer tercio','Segundo tercio','Tercer tercio','Fortaleza','Cuerpo','Final','Madera','Tierra','Especias','Dulce','Cacao','Frutos','Floral','Cuero','Nuez','Humidor','Diario','Pasaporte','Insignias','Exportar respaldo','Importar respaldo','Añadir a calendario','BEGIN:VCALENDAR','https://forms.gle/4iL5cgzun3LqdXBRA','/humoytambor','Maridajes','Pídelo directo','Escucha en Cigars Podcast','https://cigarspodcast.sites.tab.bot/','canShare','toBlob','La Hoja Boricua','lahojaboricua.sites.tab.bot'])assert.ok(h.includes(w),w);
 assert.ok(/lhb_mihoja_v1/.test(h)&&/vb_favs|legacy\('favs'\)/.test(h),'versioned key + migration');
 const all=['index.html','app.js','hoja.js','art.js','data/bundle.js'].map(read).join('\n');
 assert.ok(!/don\s*q\b|serrall/i.test(all),'Don Q / Serrallés');assert.ok(!/bad bunny/i.test(all));assert.ok(!/fuerza/i.test(all));
 assert.ok(!/wa\.me|whatsapp/i.test(h.slice(h.indexOf('function pideloLink'),h.indexOf('function artisanExtras'))),'Pídelo directo never uses WhatsApp');
 const a=JSON.parse(readD('artesanos.json'));assert.ok(!a.some(x=>'alerta' in x),'alerta stays out');
 for(const u of [...h.matchAll(/POD\+'([^']+)'/g)].map(m=>m[1]))assert.ok(/^articulos\/[a-z0-9-]+$/.test(u),u);});
test('v6: data counts',()=>{const a=JSON.parse(readD('artesanos.json')),c=JSON.parse(readD('cigarros.json')),p=JSON.parse(readD('places.json'));
 assert.equal(a.length,32);assert.equal(c.length,43);assert.equal(p.length,40);const b=read('data/bundle.js');for(const x of [...a,...c,...p])assert.ok(b.includes('"id":"'+x.id+'"'),'bundle '+x.id);});

test('v7: fotos reales de producto',()=>{const src=read('fotos.js');const F=JSON.parse(src.slice(src.indexOf('=')+1).trim().replace(/;$/,''));const sw=read('sw.js'),js=read('app.js'),h=read('hoja.js'),ix=read('index.html');
 const c=JSON.parse(readD('cigarros.json'));const ids=new Set(c.map(x=>x.id));assert.equal(Object.keys(F).length,25);
 for(const [id,f] of Object.entries(F)){assert.ok(ids.has(id),'foto for unknown cigar '+id);assert.ok(['exacta','linea'].includes(f.match));assert.match(f.credito,/^Foto: /);
  for(const p of [f.img,f.thumb,...(f.galeria||[]).flatMap(g=>[g.img,g.thumb])])assert.ok(fs.existsSync(path.join(S,p)),'missing '+p);
  assert.ok(sw.includes("'"+f.thumb+"'"),'thumb not precached '+id);assert.ok(!sw.includes("'"+f.img+"'"),'large precached '+id)}
 assert.ok(F['yambo-toro'].galeria.length>=4&&F['yambo-toro'].credito==='Foto: Yambó');
 assert.ok(ix.indexOf('fotos.js')<ix.indexOf('hoja.js'));assert.ok(js.includes('loading="lazy"')&&js.includes('Foto de la línea')&&h.includes('LHB_FOTOS'));
 assert.ok(!/fuerza|bad bunny|don\s*q\b/i.test(src));});
test('v8: guagua B (recorte + campo de tabaco en el splash)',()=>{const sw=read('sw.js'),a=read('art.js'),ix=read('index.html'),css=read('styles.css'),js=read('app.js');
 assert.match(sw,/const VERSION='lhb-v37'/);for(const f of ['img/guagua/guagua_recorte.webp','img/guagua/campo.webp','img/guagua/hojas.webp']){assert.ok(sw.includes("'"+f+"'"),f);assert.ok(fs.existsSync(path.join(__dirname,'..','site',f)),f)}
 assert.ok(a.includes('img/guagua/guagua_recorte.webp')&&a.includes("VEHICULO='guagua'"));assert.ok(ix.includes('campo-hojas')&&ix.includes('splashCar'));
 assert.ok(css.includes('@keyframes rock'));assert.ok(js.includes("addEventListener('click',done)"));
 for(const f of ['img/guagua/guagua_recorte.webp','img/guagua/campo.webp','img/guagua/hojas.webp'])assert.ok(fs.statSync(path.join(__dirname,'..','site',f)).size<62000,f);});

test('v9: splash por capas + garita fuera del header',()=>{const ix=read('index.html'),css=read('styles.css'),js=read('app.js'),sw=read('sw.js');
 assert.match(sw,/const VERSION='lhb-v37'/);for(const c of ['l-hills','l-field','l-mid','l-fg','l-fg2','nube','id="dust"','id="wake"'])assert.ok(ix.includes(c),c);
 for(const c of ['.vsh{','.whl i{','@keyframes rock','@keyframes sway','.vb .van-i{'])assert.ok(css.includes(c),c);
 assert.ok(js.includes('REDUCED_ALL')&&js.includes("className='puff'")&&js.includes("className='wleaf'"));assert.ok(!js.includes('VBArt.garita("hero-garita")'));});

test('v10/v11: fotos Monte & Mística (Entre Humos), Maduro encendido (v11)',()=>{const src=read('fotos.js');const F=JSON.parse(src.slice(src.indexOf('=')+1).trim().replace(/;$/,''));const sw=read('sw.js');
 assert.match(sw,/const VERSION='lhb-v37'/);
 assert.equal(F['monte-mistica-corojo'].match,'exacta');assert.equal(F['monte-mistica-connecticut'].match,'linea');
 for(const id of ['monte-mistica-corojo','monte-mistica-connecticut']){assert.equal(F[id].credito,'Foto: Entre Humos');assert.ok(sw.includes("'"+F[id].thumb+"'"));assert.ok(fs.statSync(path.join(S,F[id].img)).size<80000)}
 assert.equal(F['monte-mistica-maduro'].match,'linea');
 for(const id of ['monte-mistica-maduro']){assert.equal(F[id].credito,'Foto: Entre Humos');assert.ok(sw.includes("'"+F[id].thumb+"'"));assert.ok(fs.existsSync(path.join(S,F[id].img)));assert.ok(fs.statSync(path.join(S,F[id].img)).size<80000)}});

test('v12: bandera de PR (opción A, triángulo celeste) en vez de la silla + fotos Galiz y Villareño',()=>{const ix=read('index.html'),css=read('styles.css'),sw=read('sw.js'),js=read('app.js'),art=read('art.js');
 assert.match(sw,/const VERSION='lhb-v37'/);
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
 assert.equal(p.filter(x=>x.categoria==='lounge').length,27);assert.equal(p.filter(x=>x.categoria==='venta').length,13);
 assert.ok(read('app.js').includes('p.horario'));});

test('v14: botón de Spotify en Podcast',()=>{const hj=fs.readFileSync(path.join(S,'hoja.js'),'utf8');assert.ok(hj.includes("const SPOTIFY='https://open.spotify.com/show/5DUCZkx89z9cTeBaczq6Gr'"));assert.match(hj,/class="lbtn spotify" href="\$\{SPOTIFY\}" target="_blank" rel="noopener">\$\{SPOT_SVG\}Escúchalo en Spotify/);assert.match(fs.readFileSync(path.join(S,'sw.js'),'utf8'),/const VERSION='lhb-v37'/);});

test('v15: banner de Sergio en el catálogo, sin guagua',()=>{const js=fs.readFileSync(path.join(S,'app.js'),'utf8'),css=fs.readFileSync(path.join(S,'styles.css'),'utf8'),sw=fs.readFileSync(path.join(S,'sw.js'),'utf8');
 assert.ok(js.includes('<img class="hero-bg" src="img/hero/banner.webp"'));assert.ok(!js.includes('hero-volky')&&!js.includes('hero-art'));
 assert.ok(!css.includes('hero-art')&&!css.includes('@keyframes park')&&!css.includes('@keyframes idle'));assert.match(css,/\.hero-bg\{[^}]*object-fit:cover/);
 assert.match(sw,/const VERSION='lhb-v37'/);assert.ok(sw.includes("'img/hero/banner.webp'"));
 assert.ok(fs.statSync(path.join(S,'img/hero/banner.webp')).size<=35000);
 assert.ok(js.includes("VBArt.carro('mini')"));});
test('v16: paleta B Bandera (verdes intactos)',()=>{const c=fs.readFileSync(path.join(S,'styles.css'),'utf8'),a=fs.readFileSync(path.join(S,'app.js'),'utf8'),h=fs.readFileSync(path.join(S,'hoja.js'),'utf8');
 for(const v of ['--bg:#0e2417','--card:#173a26','--gold:#8fd162','--verde:#a9c487','--flam:#d0192e','--ado-d:#0050f0','--pr-red:#ed0000','--pr-blue:#0050f0','--cream:#f8f8f4','--celeste:#8fb8ff'])assert.ok(c.includes(v),v);
 assert.ok(!c.includes('--flam:#c93f25'));assert.ok(a.includes("const FACADE=['#0050f0','#ed0000','#f8f8f4','#ed0000','#f8f8f4','#0050f0']"));
 for(const old of ['#e2a39a','#efc56f','#86c0c6','#c3a2cf','#9fcdea','#b5162b','#1d3f7a','#f3f1e2'])assert.ok(!a.includes(old)&&!h.includes(old),old);
 assert.ok(fs.readFileSync(path.join(S,'index.html'),'utf8').toLowerCase().includes('5fb4e5')||c.toLowerCase().includes('5fb4e5'));});
test('v17: flor de tabaco reemplaza la garita, flamboyán nuevo',()=>{const S2=path.join(__dirname,'..','site');const a=fs.readFileSync(path.join(S2,'art.js'),'utf8'),ap=fs.readFileSync(path.join(S2,'app.js'),'utf8'),hj=fs.readFileSync(path.join(S2,'hoja.js'),'utf8');assert.ok(a.includes('function flor'));assert.ok(!ap.includes('VBArt.garita(')&&!hj.includes('VBArt.garita('));assert.ok(ap.includes('VBArt.flor()')&&hj.includes('VBArt.flor()'));assert.match(fs.readFileSync(path.join(S2,'sw.js'),'utf8'),/const VERSION='lhb-v37'/);});

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
test('v19: subtítulo del banner',()=>{const ap=fs.readFileSync(path.join(__dirname,'..','site','app.js'),'utf8');assert.ok(ap.includes('<p>Las vitolas de nuestros artesanos, de norte a sur y de este a oeste de nuestra isla.</p>'));assert.ok(!ap.includes('de Mayagüez a Caguas'));});

test('artisan logos: every id in LOGOS maps to an existing webp and a real artisan',()=>{const js=read('app.js');const ids=JSON.parse(js.match(/const LOGOS=new Set\((\[[^\]]*\])\)/)[1]);
 assert.equal(ids.length,15);const a=new Set(JSON.parse(readD('artesanos.json')).map(x=>x.id));
 for(const id of ids){assert.ok(fs.existsSync(path.join(S,'img/logos',id+'.webp')),'missing logo '+id);assert.ok(a.has(id),'unknown artisan '+id)}
 assert.match(read('sw.js'),/lhb-v37/);});

test('v21: botón "Añadir a mi pantalla" en el home, oculto en modo standalone',()=>{const ap=read('app.js'),hj=read('hoja.js'),css=read('styles.css');
 assert.match(ap,/<button type="button" class="btn-add" id="btnAdd"\$\{installHidden\(window\)\?' hidden':''\}>📲 Instalar App<\/button>/);
 assert.ok(ap.includes("addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferred=e")&&ap.includes('d.prompt()')&&ap.includes("addEventListener('appinstalled'"));
 assert.ok(hj.includes("kind==='instalar'")&&hj.includes('Toca el botón <b>Compartir</b> ⬆️')&&hj.includes('Añadir a pantalla de inicio')&&hj.includes('Instalar app'));
 assert.match(css,/\.btn-add\[hidden\]\{display:none\}/);
 const fn=new Function('return '+ap.match(/function installHidden\(w\)\{.*?\}\n/)[0])();
 const W=(sa,ns,inst)=>({__lhbInstalled:inst,matchMedia:q=>({matches:sa&&q==='(display-mode: standalone)'}),navigator:{standalone:ns}});
 assert.equal(fn(W(false,undefined,false)),false,'navegador: se ve');
 assert.equal(fn(W(true,undefined,false)),true,'display-mode standalone: oculto');
 assert.equal(fn(W(false,true,false)),true,'iOS navigator.standalone: oculto');
 assert.equal(fn(W(false,false,true)),true,'después de appinstalled: oculto');
 assert.match(read('sw.js'),/const VERSION='lhb-v37'/);});
test('v23: 7 artesanos nuevos hechos en PR (28 total), sin teléfonos/emails, Adjuntas en la Ruta',()=>{const a=JSON.parse(readD('artesanos.json'));assert.ok(a.length>=28);assert.equal(new Set(a.map(x=>x.id)).size,a.length);
 const ids=['la-hoja-del-chan','cigarros-j-velez','tabacos-el-roble','el-escondite-adjuntas','hr-handmade-cigars','fumita-pr','monte-mistica'];const b=read('data/bundle.js');
 for(const id of ids){const x=a.find(y=>y.id===id);assert.ok(x,id);assert.ok(x.iniciales&&x.historia&&x.fuentes.length,id);assert.ok(b.includes('"id":"'+id+'"'),id);const s=JSON.stringify(x);assert.ok(!/\d{3}[-. )]+\d{3}[-. ]\d{4}/.test(s),'tel '+id);assert.ok(!/@[a-z0-9-]+\.[a-z]{2,}/i.test(s.replace(/https?:\/\/[^"]+/g,'')),'email '+id)}
 assert.ok(/\|Adjuntas,C,/.test(read('hoja.js')));assert.match(read('sw.js'),/const VERSION='lhb-v37'/);});

test('v24: 4 artesanos aprobados por Sergio (32 total), sin teléfonos/emails, Ponce y Juana Díaz en la Ruta',()=>{const a=JSON.parse(readD('artesanos.json'));assert.equal(a.length,32);assert.equal(new Set(a.map(x=>x.id)).size,32);const b=read('data/bundle.js');
 for(const id of ['casa-robles-cigars','juana-diaz-cigars','el-bastion-cigars','don-chamorro-ponce']){const x=a.find(y=>y.id===id);assert.ok(x,id);assert.ok(x.iniciales&&x.historia&&x.fuentes.length,id);assert.ok(b.includes('"id":"'+id+'"'),id);const s=JSON.stringify(x);assert.ok(!/\d{3}[-. )]+\d{3}[-. ]\d{4}/.test(s),'tel '+id);assert.ok(!/@[a-z0-9-]+\.[a-z]{2,}/i.test(s.replace(/https?:\/\/[^"]+/g,'')),'email '+id)}
 const h=read('hoja.js');assert.ok(h.includes('|Ponce,S,')&&h.includes('|Juana Díaz,S,'));assert.match(read('sw.js'),/const VERSION='lhb-v37'/);});

test('v28: splash con La Ruta del Tabaco, eslogan y flor',()=>{const ix=read('index.html');const m=ix.match(/<div class="splash"[\s\S]*?<div class="campo"/);assert.ok(m);const txt=m[0].replace(/<[^>]+>/g,'').replace(/\s+/g,' ');assert.ok(txt.includes('La Ruta del Tabaco en Puerto Rico'));assert.ok(txt.includes('Cigarros de Puerto Rico'));assert.ok(m[0].includes('La Ruta <em>del Tabaco</em>'));assert.ok(m[0].includes('id="splashFlor"'));assert.ok(read('app.js').includes("VBArt.flor('sf')"));assert.match(read('sw.js'),/const VERSION='lhb-v37'/);});

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
