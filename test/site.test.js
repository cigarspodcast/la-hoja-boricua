const test=require('node:test');const assert=require('node:assert');const fs=require('fs');const path=require('path');
const S=path.join(__dirname,'..','site');const read=f=>fs.readFileSync(path.join(S,f),'utf8');const DD=path.join(__dirname,'..','data');const readD=f=>fs.readFileSync(path.join(DD,f),'utf8');
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
 assert.match(sw,/const VERSION='lhb-v50'/);assert.ok(sw.includes("'hoja.js'"));assert.ok(ix.indexOf('hoja.js')<ix.indexOf('app.js'));
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
 assert.match(sw,/const VERSION='lhb-v50'/);for(const f of ['img/guagua/guagua_recorte.webp','img/guagua/campo.webp','img/guagua/hojas.webp']){assert.ok(sw.includes("'"+f+"'"),f);assert.ok(fs.existsSync(path.join(__dirname,'..','site',f)),f)}
 assert.ok(a.includes('img/guagua/guagua_recorte.webp')&&a.includes("VEHICULO='guagua'"));assert.ok(ix.includes('campo-hojas')&&ix.includes('splashCar'));
 assert.ok(css.includes('@keyframes rock'));assert.ok(js.includes("addEventListener('click',done)"));
 for(const f of ['img/guagua/guagua_recorte.webp','img/guagua/campo.webp','img/guagua/hojas.webp'])assert.ok(fs.statSync(path.join(__dirname,'..','site',f)).size<62000,f);});

test('v9: splash por capas + garita fuera del header',()=>{const ix=read('index.html'),css=read('styles.css'),js=read('app.js'),sw=read('sw.js');
 assert.match(sw,/const VERSION='lhb-v50'/);for(const c of ['l-hills','l-field','l-mid','l-fg','l-fg2','nube','id="dust"','id="wake"'])assert.ok(ix.includes(c),c);
 for(const c of ['.vsh{','.whl i{','@keyframes rock','@keyframes sway','.vb .van-i{'])assert.ok(css.includes(c),c);
 assert.ok(js.includes('REDUCED_ALL')&&js.includes("className='puff'")&&js.includes("className='wleaf'"));assert.ok(!js.includes('VBArt.garita("hero-garita")'));});

test('v10/v11: fotos Monte & Mística (Entre Humos), Maduro encendido (v11)',()=>{const src=read('fotos.js');const F=JSON.parse(src.slice(src.indexOf('=')+1).trim().replace(/;$/,''));const sw=read('sw.js');
 assert.match(sw,/const VERSION='lhb-v50'/);
 assert.equal(F['monte-mistica-corojo'].match,'exacta');assert.equal(F['monte-mistica-connecticut'].match,'linea');
 for(const id of ['monte-mistica-corojo','monte-mistica-connecticut']){assert.equal(F[id].credito,'Foto: Entre Humos');assert.ok(sw.includes("'"+F[id].thumb+"'"));assert.ok(fs.statSync(path.join(S,F[id].img)).size<80000)}
 assert.equal(F['monte-mistica-maduro'].match,'linea');
 for(const id of ['monte-mistica-maduro']){assert.equal(F[id].credito,'Foto: Entre Humos');assert.ok(sw.includes("'"+F[id].thumb+"'"));assert.ok(fs.existsSync(path.join(S,F[id].img)));assert.ok(fs.statSync(path.join(S,F[id].img)).size<80000)}});

test('v12: bandera de PR (opción A, triángulo celeste) en vez de la silla + fotos Galiz y Villareño',()=>{const ix=read('index.html'),css=read('styles.css'),sw=read('sw.js'),js=read('app.js'),art=read('art.js');
 assert.match(sw,/const VERSION='lhb-v50'/);
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

test('v14: botón de Spotify en Podcast',()=>{const hj=fs.readFileSync(path.join(S,'hoja.js'),'utf8');assert.ok(hj.includes("const SPOTIFY='https://open.spotify.com/show/5DUCZkx89z9cTeBaczq6Gr'"));assert.match(hj,/class="lbtn spotify" href="\$\{SPOTIFY\}" target="_blank" rel="noopener">\$\{SPOT_SVG\}Escúchalo en Spotify/);assert.match(fs.readFileSync(path.join(S,'sw.js'),'utf8'),/const VERSION='lhb-v50'/);});

test('v15: banner de Sergio en el catálogo, sin guagua',()=>{const js=fs.readFileSync(path.join(S,'app.js'),'utf8'),css=fs.readFileSync(path.join(S,'styles.css'),'utf8'),sw=fs.readFileSync(path.join(S,'sw.js'),'utf8');
 assert.ok(js.includes('<img class="hero-bg" src="img/hero/banner.webp"'));assert.ok(!js.includes('hero-volky')&&!js.includes('hero-art'));
 assert.ok(!css.includes('hero-art')&&!css.includes('@keyframes park')&&!css.includes('@keyframes idle'));assert.match(css,/\.hero-bg\{[^}]*object-fit:cover/);
 assert.match(sw,/const VERSION='lhb-v50'/);assert.ok(sw.includes("'img/hero/banner.webp'"));
 assert.ok(fs.statSync(path.join(S,'img/hero/banner.webp')).size<=35000);
 assert.ok(js.includes("VBArt.carro('mini')"));});
test('v16: paleta B Bandera (verdes intactos)',()=>{const c=fs.readFileSync(path.join(S,'styles.css'),'utf8'),a=fs.readFileSync(path.join(S,'app.js'),'utf8'),h=fs.readFileSync(path.join(S,'hoja.js'),'utf8');
 for(const v of ['--bg:#0e2417','--card:#173a26','--gold:#8fd162','--verde:#a9c487','--flam:#d0192e','--ado-d:#0050f0','--pr-red:#ed0000','--pr-blue:#0050f0','--cream:#f8f8f4','--celeste:#8fb8ff'])assert.ok(c.includes(v),v);
 assert.ok(!c.includes('--flam:#c93f25'));assert.ok(a.includes("const FACADE=['#0050f0','#ed0000','#f8f8f4','#ed0000','#f8f8f4','#0050f0']"));
 for(const old of ['#e2a39a','#efc56f','#86c0c6','#c3a2cf','#9fcdea','#b5162b','#1d3f7a','#f3f1e2'])assert.ok(!a.includes(old)&&!h.includes(old),old);
 assert.ok(fs.readFileSync(path.join(S,'index.html'),'utf8').toLowerCase().includes('5fb4e5')||c.toLowerCase().includes('5fb4e5'));});
test('v17: flor de tabaco reemplaza la garita, flamboyán nuevo',()=>{const S2=path.join(__dirname,'..','site');const a=fs.readFileSync(path.join(S2,'art.js'),'utf8'),ap=fs.readFileSync(path.join(S2,'app.js'),'utf8'),hj=fs.readFileSync(path.join(S2,'hoja.js'),'utf8');assert.ok(a.includes('function flor'));assert.ok(!ap.includes('VBArt.garita(')&&!hj.includes('VBArt.garita('));assert.ok(ap.includes('VBArt.flor()')&&hj.includes('VBArt.flor()'));assert.match(fs.readFileSync(path.join(S2,'sw.js'),'utf8'),/const VERSION='lhb-v50'/);});

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
 assert.match(read('sw.js'),/lhb-v50/);});

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
 assert.match(read('sw.js'),/const VERSION='lhb-v50'/);});
test('v23: 7 artesanos nuevos hechos en PR (28 total), sin teléfonos/emails, Adjuntas en la Ruta',()=>{const a=JSON.parse(readD('artesanos.json'));assert.ok(a.length>=28);assert.equal(new Set(a.map(x=>x.id)).size,a.length);
 const ids=['la-hoja-del-chan','cigarros-j-velez','tabacos-el-roble','el-escondite-adjuntas','hr-handmade-cigars','fumita-pr','monte-mistica'];const b=read('data/bundle.js');
 for(const id of ids){const x=a.find(y=>y.id===id);assert.ok(x,id);assert.ok(x.iniciales&&x.historia&&x.fuentes.length,id);assert.ok(b.includes('"id":"'+id+'"'),id);const s=JSON.stringify(x);assert.ok(!/\d{3}[-. )]+\d{3}[-. ]\d{4}/.test(s),'tel '+id);assert.ok(!/@[a-z0-9-]+\.[a-z]{2,}/i.test(s.replace(/https?:\/\/[^"]+/g,'')),'email '+id)}
 assert.ok(/\|Adjuntas,C,/.test(read('hoja.js')));assert.match(read('sw.js'),/const VERSION='lhb-v50'/);});

test('v24: 4 artesanos aprobados por Sergio (32 total), sin teléfonos/emails, Ponce y Juana Díaz en la Ruta',()=>{const a=JSON.parse(readD('artesanos.json'));assert.equal(a.length,32);assert.equal(new Set(a.map(x=>x.id)).size,32);const b=read('data/bundle.js');
 for(const id of ['casa-robles-cigars','juana-diaz-cigars','el-bastion-cigars','don-chamorro-ponce']){const x=a.find(y=>y.id===id);assert.ok(x,id);assert.ok(x.iniciales&&x.historia&&x.fuentes.length,id);assert.ok(b.includes('"id":"'+id+'"'),id);const s=JSON.stringify(x);assert.ok(!/\d{3}[-. )]+\d{3}[-. ]\d{4}/.test(s),'tel '+id);assert.ok(!/@[a-z0-9-]+\.[a-z]{2,}/i.test(s.replace(/https?:\/\/[^"]+/g,'')),'email '+id)}
 const h=read('hoja.js');assert.ok(h.includes('|Ponce,S,')&&h.includes('|Juana Díaz,S,'));assert.match(read('sw.js'),/const VERSION='lhb-v50'/);});

test('v28: splash con La Ruta del Tabaco, eslogan y flor',()=>{const ix=read('index.html');const m=ix.match(/<div class="splash"[\s\S]*?<div class="campo"/);assert.ok(m);const txt=m[0].replace(/<[^>]+>/g,'').replace(/\s+/g,' ');assert.ok(txt.includes('La Ruta del Tabaco en Puerto Rico'));assert.ok(txt.includes('Cigarros de Puerto Rico'));assert.ok(m[0].includes('La Ruta <em>del Tabaco</em>'));assert.ok(m[0].includes('id="splashFlor"'));assert.ok(read('app.js').includes("VBArt.flor('sf')"));assert.match(read('sw.js'),/const VERSION='lhb-v50'/);});

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
test('LHB-25: reglas del @ y del perfil: largo, caracteres, reservados, minúscula, bio 160, 21+',async()=>{
 const {pathToFileURL}=require('url');const P=await import(pathToFileURL(path.join(__dirname,'..','functions','_lib','profile.js')).href);
 assert.deepEqual(P.checkHandle('  Sergio_PR '),{handle:'sergio_pr'},'se guarda en minúscula, sin espacios');
 for(const h of ['abc','a_1','x'.repeat(20)])assert.deepEqual(P.checkHandle(h),{handle:h},h);
 for(const h of ['ab','x'.repeat(21),'ab-c','a b','ñandú','a.b','',null,undefined])assert.deepEqual(P.checkHandle(h),{error:'handle-invalid'},String(h));
 for(const h of ['admin','API','lahojaboricua','mihoja','cigarros','privacidad'])assert.deepEqual(P.checkHandle(h),{error:'handle-reserved'},h);
 assert.deepEqual(P.checkHandle('u'),{error:'handle-invalid'},'u es muy corto antes de ser reservado');assert.ok(P.RESERVED.has('u'));
 const ok={handle:'tabaquero',age_ok:true};
 assert.deepEqual(P.checkProfile(ok),{handle:'tabaquero',display_name:null,bio:null,favorite_brand:null});
 for(const a of [undefined,false,'true',1])assert.deepEqual(P.checkProfile({...ok,age_ok:a}),{error:'age-required'},'21+ '+a);
 for(const b of [null,'x',[],42])assert.deepEqual(P.checkProfile(b),{error:'bad-body'});
 assert.equal(P.checkProfile({...ok,bio:'🌿'.repeat(160)}).bio,'🌿'.repeat(160),'160 caracteres (no bytes)');
 assert.deepEqual(P.checkProfile({...ok,bio:'a'.repeat(161)}),{error:'bio-long'});
 assert.deepEqual(P.checkProfile({...ok,display_name:'a'.repeat(51)}),{error:'display_name-long'});
 assert.deepEqual(P.checkProfile({...ok,favorite_brand:'a'.repeat(61)}),{error:'favorite_brand-long'});
 assert.equal(P.checkProfile({...ok,bio:'línea 1\nlínea 2'}).bio,'línea 1\nlínea 2','la bio admite saltos de línea');
 assert.deepEqual(P.checkProfile({...ok,display_name:'a\nb'}),{error:'display_name-invalid'},'el nombre no');
 assert.deepEqual(P.checkProfile({...ok,favorite_brand:7}),{error:'favorite_brand-invalid'});
 assert.equal(P.checkProfile({...ok,display_name:'   '}).display_name,null,'vacío se guarda null');
 const h=read('hoja.js');const re=h.match(/const HANDLE_RE=(\/[^;]+\/);/)[1];assert.equal(re,'/^[a-z0-9_]{3,20}$/','la app usa la misma regla que el servidor');
 for(const [pk,fapi] of [...h.matchAll(/pk:'(pk_(?:live|test)_[A-Za-z0-9]+)',fapi:'([a-z0-9.-]+)'/g)].map(m=>[m[1],m[2]]))assert.equal(Buffer.from(pk.slice(8),'base64').toString(),fapi+'$',fapi);
 assert.match(h,/CLERK=location\.hostname==='lahojaboricua\.com'\?\{pk:'pk_live_/,'producción usa la llave live; las vistas previas, la de Development');
 assert.match(h,/function vMiHoja\(sub\)\{requireAccount\(\(\)=>vMiHojaIn\(sub\)\)\}/,'Mi Hoja pasa por la cuenta');assert.ok(read('index.html').indexOf('cuenta.js')>0&&read('index.html').indexOf('cuenta.js')<read('index.html').indexOf('hoja.js'),'cuenta.js antes de hoja.js');assert.ok(read('sw.js').includes("'cuenta.js'"),'cuenta.js en el shell');
 assert.ok(h.includes('<input type="checkbox" id="obAge" required> Tengo 21 años o más.'),'casilla 21+ con el texto aprobado (LHB-21)');
});
test('LHB-25: POST /api/profile en SQLite real: 401, 415, 400, 201, @ repetido, perfil repetido; Mi Hoja sin perfil: 403',async()=>{
 const {DatabaseSync}=require('node:sqlite');const db=new DatabaseSync(':memory:');
 const mig=f=>fs.readFileSync(path.join(__dirname,'..','migrations',f),'utf8');db.exec(mig('0001_init.sql'));db.exec(mig('0002_clerk_profiles.sql'));
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
  assert.deepEqual(await post(a,{handle:'tabaquero',age_ok:true},undefined,{DB}),[503,{error:'no-auth-config'}]);
  assert.deepEqual(await post('basura',{handle:'tabaquero',age_ok:true}),[401,{error:'no-session'}]);
  assert.deepEqual(await post(a,{handle:'tabaquero',age_ok:true},'text/plain'),[415,{error:'bad-type'}],'solo JSON');
  assert.deepEqual(await post(a,'{no es json'),[400,{error:'bad-body'}]);
  assert.deepEqual(await post(a,{handle:'tabaquero'}),[400,{error:'age-required'}],'sin 21+ no hay perfil');
  assert.deepEqual(await post(a,{handle:'admin',age_ok:true}),[400,{error:'handle-reserved'}]);
  assert.equal(db.prepare('SELECT COUNT(*) n FROM profiles').get().n,0,'nada guardado todavía');
  const before=new Date().toISOString();
  assert.deepEqual(await post(a,{handle:'TabaQuero',display_name:' Ana ',bio:'Fumo los domingos.',favorite_brand:'Yambo Cigars',age_ok:true}),
   [201,{profile:{handle:'tabaquero',display_name:'Ana',bio:'Fumo los domingos.',favorite_brand:'Yambo Cigars',avatar_key:null}}]);
  const row=db.prepare('SELECT * FROM profiles WHERE user_id=?1').get('user_a');assert.equal(row.handle,'tabaquero');assert.ok(row.age_ok_at>=before,'hora del 21+ guardada');assert.equal(row.hidden,0);
  assert.deepEqual(await post(b,{handle:'tabaquero',age_ok:true}),[409,{error:'handle-taken'}],'@ único');
  assert.deepEqual(await post(b,{handle:'TABAQUERO',age_ok:true}),[409,{error:'handle-taken'}],'único sin importar mayúsculas');
  assert.deepEqual(await post(a,{handle:'otro_nombre',age_ok:true}),[409,{error:'profile-exists'}],'cambiar el perfil es de LHB-34');
  assert.equal(db.prepare('SELECT handle FROM profiles WHERE user_id=?1').get('user_a').handle,'tabaquero','el 409 no cambió nada');
  const gate=async token=>{const r=await P.requireProfile(req(token),env);return r instanceof Response?[r.status,await r.json()]:[200,r.profile.handle,r.user.sub]};
  assert.deepEqual(await gate(null),[401,{error:'no-session'}]);
  assert.deepEqual(await gate(c),[403,{error:'no-profile'}],'una API de Mi Hoja rechaza a quien no tiene perfil');
  assert.deepEqual(await gate(a),[200,'tabaquero','user_a']);
  const m=await me.onRequestGet({request:req(a),env});assert.equal((await m.json()).profile.handle,'tabaquero','/api/me ya ve el perfil');
 }finally{globalThis.fetch=realFetch}
});
function CUENTA_HARNESS(over){
 const vm=require('vm');const ctx={window:{}};vm.createContext(ctx);vm.runInContext(read('cuenta.js'),ctx);
 const log=[];let hash='#/mihoja',lis=null,store=null,intent=null,lastNotice=null;
 const C={user:null,addListener(f){lis=f},signIn(id){C.user=id?{id}:null;lis&&lis({user:C.user})}};
 const D={clerk:async()=>C,api:async()=>({status:0,body:{}}),here:()=>hash,reroute:()=>log.push('reroute'),
  store:{get:()=>store,set:v=>{store=v;log.push('store:'+v.sub+':'+v.handle)},clear:()=>{store=null;log.push('clear')}},
  intent:{get:()=>intent,set:v=>{intent=v;log.push('intent')},clear:()=>{intent=null}},
  openSignIn:()=>log.push('open'),ui:{card:h=>log.push('card:'+h),notice:(h,p,b)=>{log.push('notice:'+h);lastNotice=b},closeAll:()=>{lastNotice=null;log.push('closeAll')},onboarding:f=>log.push('onboarding'),toast:m=>log.push('toast')},...over};
 const A=ctx.window.LHB_CUENTA(D);
 return {A,C,D,log,notice:()=>lastNotice,go:()=>log.push('GO'),nav:h=>{hash=h},cache:v=>{store=v},intent:()=>intent,setIntent:v=>{intent=v},ui:()=>D.ui};
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
 assert.ok(read('hoja.js').includes('ui:{card:accountCard,notice:accountNotice,onboarding:onboardingForm,toast,closeAll:closeSheetNow}'),'hoja.js pasa el aviso sobre la página');
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
 assert.ok(hj.includes("let r;try{r=await submit({handle:h,")&&hj.includes("catch(x){r={error:'generic'}}"),'un error inesperado al enviar devuelve el botón en vez de dejarlo apagado');
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
test('LHB-48: varias acciones seguidas en sitio no se cancelan; una sola revisión compartida; se descartan si cambia la persona o la página',async()=>{
 const tick=()=>new Promise(r=>setTimeout(r,0));const prof=async()=>({status:200,body:{profile:{handle:'ana'}}});
 // con perfil guardado: al instante, sin red, todas
 let n=0;const a=CUENTA_HARNESS({api:async()=>{n++;return prof()}});a.nav('#/c/yambo-toro');a.C.user={id:'user_a'};a.cache({sub:'user_a',handle:'ana'});a.setIntent({from:'#/c/yambo-toro',act:'fav',arg:'x'});
 a.A.quick(a.go,{inPlace:true,act:'fav',arg:'x'});a.A.quick(a.go,{inPlace:true,act:'fav',arg:'y'});await tick();assert.equal(a.intent(),null,'consume la acción guardada');
 assert.deepEqual(a.log.filter(x=>x==='GO'),['GO','GO'],'dos toques, dos acciones');assert.equal(n,0,'sin pedir /api/me');
 // sin perfil guardado: una sola revisión para todos, y todos corren
 let m=0;let release;const gate=new Promise(r=>{release=r});const b=CUENTA_HARNESS({api:async()=>{m++;await gate;return prof()}});b.nav('#/c/yambo-toro');b.C.user={id:'user_a'};
 b.A.quick(b.go,{inPlace:true,act:'fav',arg:'x'});b.A.quick(b.go,{inPlace:true,act:'fav',arg:'y'});b.A.quick(b.go,{inPlace:true,act:'fav',arg:'z'});await tick();
 assert.ok(!b.log.includes('GO'),'mientras se revisa no corre nada');release();await tick();await tick();
 assert.deepEqual(b.log.filter(x=>x==='GO'),['GO','GO','GO'],'al terminar corren las tres');assert.equal(m,1,'con una sola revisión compartida');
 // cambia la persona mientras se espera: se descarta, no corre para la otra
 let rel2;const g2=new Promise(r=>{rel2=r});const c=CUENTA_HARNESS({api:async()=>{await g2;return prof()}});c.nav('#/c/yambo-toro');c.C.user={id:'user_a'};
 c.A.quick(c.go,{inPlace:true,act:'fav',arg:'x'});await tick();c.C.signIn('user_b');rel2();await tick();await tick();
 assert.ok(!c.log.includes('GO'),'una acción de la persona anterior no corre para la nueva');
 // cambia la página mientras se espera: se descarta
 let rel3;const g3=new Promise(r=>{rel3=r});const d=CUENTA_HARNESS({api:async()=>{await g3;return prof()}});d.nav('#/c/yambo-toro');d.C.user={id:'user_a'};
 d.A.quick(d.go,{inPlace:true,act:'fav',arg:'x'});await tick();d.nav('#/artesanos');rel3();await tick();await tick();
 assert.ok(!d.log.includes('GO'),'si la página cambió, la acción no corre');
 // sin sesión: hoja de entrar y la acción guardada con su argumento
 const e=CUENTA_HARNESS({});e.nav('#/c/yambo-toro');await e.A.quick(e.go,{inPlace:true,act:'fav',arg:'cigarros:yambo-toro'});await tick();
 assert.ok(e.log.includes('open')&&!e.log.includes('GO'),'sin sesión abre la hoja de entrar y no hace nada todavía');assert.deepEqual(e.intent(),{from:'#/c/yambo-toro',act:'fav',arg:'cigarros:yambo-toro'});
 // el servidor dice que no hay perfil: crea el perfil, no corre la acción
 const f=CUENTA_HARNESS({api:async()=>({status:200,body:{needsProfile:true}})});f.nav('#/c/yambo-toro');f.C.user={id:'user_a'};await f.A.quick(f.go,{inPlace:true,act:'fav',arg:'x'});await tick();
 assert.ok(f.log.includes('onboarding')&&!f.log.includes('GO'),'sin perfil se pide el perfil primero');
 // 401: no corre, avisa
 const h=CUENTA_HARNESS({api:async()=>({status:401,body:{}})});h.nav('#/c/yambo-toro');h.C.user={id:'user_a'};await h.A.quick(h.go,{inPlace:true,act:'fav',arg:'x'});await tick();
 assert.ok(!h.log.includes('GO')&&h.log.some(x=>x.startsWith('notice')),'un 401 no deja pasar y avisa');
 // Clerk no carga: con perfil guardado corre una vez y consume la acción; sin perfil guardado avisa
 const k=CUENTA_HARNESS({clerk:async()=>{throw new Error('offline')}});k.nav('#/c/yambo-toro');k.cache({sub:'user_a',handle:'ana'});k.setIntent({from:'#/c/yambo-toro',act:'fav'});
 await k.A.quick(k.go,{inPlace:true,act:'fav'});await tick();assert.deepEqual(k.log.filter(x=>x==='GO'),['GO']);assert.equal(k.intent(),null);
 const l=CUENTA_HARNESS({clerk:async()=>{throw new Error('offline')}});l.nav('#/c/yambo-toro');await l.A.quick(l.go,{inPlace:true,act:'fav'});await tick();
 assert.ok(!l.log.includes('GO')&&l.log.some(x=>x.startsWith('notice')),'sin Clerk y sin perfil guardado no pasa y avisa');
 // el perfil guardado de otra persona no sirve: se revisa con el servidor
 let q=0;const o=CUENTA_HARNESS({api:async()=>{q++;return prof()}});o.nav('#/c/yambo-toro');o.C.user={id:'user_b'};o.cache({sub:'user_a',handle:'ana'});
 await o.A.quick(o.go,{inPlace:true,act:'fav'});await tick();assert.equal(q,1);assert.deepEqual(o.log.filter(x=>x==='GO'),['GO']);
 // y si el servidor no responde, el perfil guardado de otra persona tampoco deja pasar
 const w=CUENTA_HARNESS({api:async()=>({status:503,body:{}})});w.nav('#/c/yambo-toro');w.C.user={id:'user_b'};w.cache({sub:'user_a',handle:'ana'});
 await w.A.quick(w.go,{inPlace:true,act:'fav'});await tick();assert.ok(!w.log.includes('GO'),'otra persona con el servidor caído: no corre');
});
test('LHB-48: si la revisión compartida falla todas las acciones en espera se conservan juntas; guardar el perfil no es requisito; otra persona no recibe la acción de la anterior',async()=>{
 const tick=()=>new Promise(r=>setTimeout(r,0));const prof=async()=>({status:200,body:{profile:{handle:'ana'}}});
 // la revisión compartida falla (503) y el reintento sale bien: las dos acciones corren, una vez cada una
 let calls=0;const a=CUENTA_HARNESS({api:async()=>{calls++;return calls===1?{status:503,body:{}}:prof()}});a.nav('#/c/yambo-toro');a.C.user={id:'user_a'};
 const ran=[];a.A.quick(()=>ran.push('uno'),{inPlace:true,act:'fav',arg:'x'});a.A.quick(()=>ran.push('dos'),{inPlace:true,act:'fav',arg:'y'});
 for(let i=0;i<6;i++)await tick();
 assert.deepEqual(ran.slice().sort(),['dos','uno'],'las dos acciones se conservan y corren una vez');assert.equal(calls,2,'una revisión compartida y una sola reintentada, no una por toque');
 // el teléfono no deja guardar el perfil: la revisión salió bien, las dos corren igual
 let nb=0;const b=CUENTA_HARNESS({api:async()=>{nb++;return prof()},store:{get:()=>null,set:()=>{throw new Error('quota')},clear:()=>{}}});b.nav('#/c/yambo-toro');b.C.user={id:'user_a'};
 const rb=[];b.A.quick(()=>rb.push(1),{inPlace:true,act:'fav'});b.A.quick(()=>rb.push(2),{inPlace:true,act:'fav'});for(let i=0;i<6;i++)await tick();
 assert.deepEqual(rb.slice().sort(),[1,2],'sin poder guardar el perfil, las dos corren');assert.equal(nb,1,'con una sola revisión, sin reintentos');
 // cambia la cuenta mientras se espera a Clerk: la acción de A no corre para B
 let release;const waitClerk=new Promise(r=>{release=r});let first=true;
 const c=CUENTA_HARNESS({api:prof,clerk:async()=>{if(first){first=false;return c.C}await waitClerk;return c.C}});c.nav('#/c/yambo-toro');c.C.user={id:'user_a'};
 await c.A.quick(()=>{},{inPlace:true,act:'fav'});for(let i=0;i<4;i++)await tick();// instala el aviso de cambios de cuenta
 const rc=[];c.A.quick(()=>rc.push('de A'),{inPlace:true,act:'fav'});await tick();c.C.signIn('user_b');c.cache({sub:'user_b',handle:'bea'});release();for(let i=0;i<6;i++)await tick();
 assert.deepEqual(rc,[],'la acción que empezó A no corre cuando ya es B');
 // cambia la cuenta mientras se espera la revisión compartida: la acción de A no corre
 let rel;const hold=new Promise(r=>{rel=r});const d=CUENTA_HARNESS({api:async()=>{await hold;return prof()}});d.nav('#/c/yambo-toro');d.C.user={id:'user_a'};
 const rd=[];d.A.quick(()=>rd.push('de A'),{inPlace:true,act:'fav'});await tick();d.C.signIn('user_b');rel();for(let i=0;i<6;i++)await tick();
 assert.deepEqual(rd,[],'la acción de A, esperando la revisión, no corre cuando ya es B');
 // salir y volver a entrar con la misma cuenta mientras se espera: la misma persona conserva sus acciones en el reintento
 let rel4;const hold4=new Promise(r=>{rel4=r});let n4=0;const e=CUENTA_HARNESS({api:async()=>{n4++;if(n4===1){await hold4;return {status:503,body:{}}}return prof()}});e.nav('#/c/yambo-toro');e.C.user={id:'user_a'};
 const re=[];e.A.quick(()=>re.push('antes'),{inPlace:true,act:'fav'});await tick();e.C.signIn(null);e.C.signIn('user_a');await tick();
 e.A.quick(()=>re.push('despues'),{inPlace:true,act:'fav'});await tick();rel4();for(let i=0;i<8;i++)await tick();
 assert.deepEqual(re,['antes','despues'],'la misma persona que vuelve a entrar conserva sus acciones en espera');
});
test('LHB-48: sin sesión, los toques hechos mientras carga Clerk forman un lote: una hoja de entrar y al entrar corren todos, también al volver de Google',async()=>{
 const tick=()=>new Promise(r=>setTimeout(r,0));const prof=async()=>({status:200,body:{profile:{handle:'ana'}}});
 let release;const slow=new Promise(r=>{release=r});
 const mk=()=>{let first=true;const g=CUENTA_HARNESS({api:prof,clerk:async()=>{await slow;return g.C}});return g};
 const g=mk();g.nav('#/c/yambo-toro');g.A.register('fav',a=>ran.push(a));const ran=[];
 g.A.quick(()=>ran.push('uno'),{inPlace:true,act:'fav',arg:'cigarros:uno'});g.A.quick(()=>ran.push('dos'),{inPlace:true,act:'fav',arg:'cigarros:dos'});
 release();for(let i=0;i<6;i++)await tick();
 assert.equal(g.log.filter(x=>x==='open').length,1,'una sola hoja de entrar');
 assert.deepEqual(g.intent(),{from:'#/c/yambo-toro',act:'fav',arg:'cigarros:dos',more:[{act:'fav',arg:'cigarros:uno'}]},'lo guardado para volver de Google lleva las dos acciones');
 g.C.signIn('user_a');for(let i=0;i<8;i++)await tick();
 assert.deepEqual(ran,['uno','dos'],'al entrar corren las dos, en orden');
 // al volver de Google: se retoman las dos, una vez
 const back=[];const h=CUENTA_HARNESS({api:prof});h.nav('#/c/yambo-toro');h.A.register('fav',a=>back.push(a));h.A.register('stamp',a=>back.push('s:'+a));
 h.setIntent({from:'#/c/yambo-toro',act:'fav',arg:'cigarros:dos',more:[{act:'fav',arg:'cigarros:uno'},{act:'nope',arg:'x'},{act:'stamp',arg:'lugares:l1'},{act:'fav',arg:{x:1}}]});h.C.user={id:'user_a'};
 await h.A.resume();await tick();
 assert.deepEqual(back,['cigarros:uno','s:lugares:l1',undefined,'cigarros:dos'],'solo acciones registradas, en orden, con argumentos de texto');assert.equal(h.intent(),null);
 // lo que se guarda para volver de Google solo lleva acciones registradas: ni desconocidas ni nombres heredados
 let rel2;const slow2=new Promise(r=>{rel2=r});const m=CUENTA_HARNESS({api:prof,clerk:async()=>{await slow2;return m.C}});m.nav('#/c/yambo-toro');m.A.register('fav',()=>{});
 m.A.quick(()=>{},{inPlace:true,act:'nope',arg:'x'});m.A.quick(()=>{},{inPlace:true,act:'constructor',arg:'x'});m.A.quick(()=>{},{inPlace:true,act:'__proto__',arg:'x'});m.A.quick(()=>{},{inPlace:true,act:'fav',arg:'a'});
 rel2();for(let i=0;i<6;i++)await tick();
 assert.deepEqual(m.intent(),{from:'#/c/yambo-toro',act:'fav',arg:'a'},'solo acciones registradas viajan en lo guardado');
 // un intento abandonado no se mezcla con el siguiente
 const k=CUENTA_HARNESS({api:prof});k.nav('#/c/yambo-toro');const rk=[];
 await k.A.quick(()=>rk.push('abandonada'),{inPlace:true,act:'fav'});await tick();
 await k.A.quick(()=>rk.push('nueva'),{inPlace:true,act:'fav'});await tick();k.C.signIn('user_a');for(let i=0;i<8;i++)await tick();
 assert.deepEqual(rk,['nueva'],'la hoja que se cerró sin entrar no deja su acción para después');
});
test('LHB-48: una respuesta tardía no devuelve el acceso después de salir; un reintento explícito de la misma persona conserva la acción y otra persona no la recibe',async()=>{
 const tick=()=>new Promise(r=>setTimeout(r,0));const prof=async()=>({status:200,body:{profile:{handle:'ana'}}});
 // salir mientras se revisa: la respuesta tardía no guarda el perfil
 let rel;const hold=new Promise(r=>{rel=r});const a=CUENTA_HARNESS({api:async()=>{await hold;return prof()}});a.nav('#/c/yambo-toro');a.C.user={id:'user_a'};
 a.A.quick(()=>{},{inPlace:true,act:'fav'});await tick();a.C.signIn(null);rel();for(let i=0;i<6;i++)await tick();
 assert.ok(!a.log.some(x=>x.startsWith('store:')),'una respuesta de antes de salir no guarda el perfil');
 // 401, salir, Entrar, volver como la misma persona: la acción corre una vez
 const run=async who=>{let ok=false;const x=CUENTA_HARNESS({api:async()=>ok?await prof():{status:401,body:{}}});x.nav('#/c/yambo-toro');x.C.user={id:'user_a'};const ran=[];
  x.A.quick(()=>ran.push('a'),{inPlace:true,act:'fav'});for(let i=0;i<6;i++)await tick();
  x.C.signIn(null);await tick();ok=true;const n=x.notice();n.on();await tick();x.C.signIn(who);for(let i=0;i<8;i++)await tick();return ran};
 assert.deepEqual(await run('user_a'),['a'],'la misma persona que vuelve a entrar conserva su acción');
 assert.deepEqual(await run('user_b'),[],'otra persona no recibe la acción de la anterior');
});
test('LHB-48: una subida de fotos empezada por una persona no se guarda cuando ya es otra',()=>{
 const ap=read('app.js');
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
test('LHB-48: un reintento con varias acciones sobrevive a la redirección de Google, con su dueño: la misma persona las recibe, otra no; la lista restaurada es completa y a prueba de nombres heredados',async()=>{
 const tick=()=>new Promise(r=>setTimeout(r,0));const prof=async()=>({status:200,body:{profile:{handle:'ana'}}});
 let ok=false;const x=CUENTA_HARNESS({api:async()=>ok?await prof():{status:401,body:{}}});x.nav('#/c/yambo-toro');x.C.user={id:'user_a'};x.A.register('fav',()=>{});
 x.A.quick(()=>{},{inPlace:true,act:'fav',arg:'cigarros:uno'});x.A.quick(()=>{},{inPlace:true,act:'fav',arg:'cigarros:dos'});for(let i=0;i<6;i++)await tick();
 x.C.signIn(null);await tick();ok=true;x.notice().on();await tick();
 const saved=x.intent();
 assert.deepEqual(saved,{from:'#/c/yambo-toro',act:'fav',arg:'cigarros:dos',uid:'user_a',more:[{act:'fav',arg:'cigarros:uno'}]},'lo guardado lleva las dos acciones y a su dueño');
 const back=async who=>{const out=[];const y=CUENTA_HARNESS({api:prof});y.nav('#/c/yambo-toro');y.A.register('fav',a=>out.push(a));y.setIntent(saved);y.C.user=who?{id:who}:null;await y.A.resume();for(let i=0;i<6;i++)await tick();return out};
 assert.deepEqual(await back('user_a'),['cigarros:uno','cigarros:dos'],'al volver la misma persona, corren las dos');
 assert.deepEqual(await back('user_b'),[],'al volver otra persona, no corre ninguna');
 // diez acciones guardadas: se restauran las diez
 const ten=[];const t=CUENTA_HARNESS({api:prof});t.nav('#/c/yambo-toro');t.A.register('fav',a=>ten.push(a));
 t.setIntent({from:'#/c/yambo-toro',act:'fav',arg:'10',more:[1,2,3,4,5,6,7,8,9].map(n=>({act:'fav',arg:String(n)}))});t.C.user={id:'user_a'};await t.A.resume();for(let i=0;i<4;i++)await tick();
 assert.deepEqual(ten,['1','2','3','4','5','6','7','8','9','10'],'la última no se pierde por el tope');
 // nombres heredados y acciones que fallan no frenan a las demás
 const out=[];const w=CUENTA_HARNESS({api:prof});w.nav('#/c/yambo-toro');w.A.register('fav',a=>out.push(a));w.A.register('bad',()=>{throw new Error('x')});
 w.setIntent({from:'#/c/yambo-toro',act:'fav',arg:'cigarros:valida',more:[{act:'__proto__',arg:'x'},{act:'constructor',arg:'x'},{act:'toString'},{act:'bad',arg:'x'}]});w.C.user={id:'user_a'};
 await w.A.resume();for(let i=0;i<4;i++)await tick();
 assert.deepEqual(out,['cigarros:valida'],'la acción válida corre aunque haya nombres heredados o una acción que falla');
});
test('LHB-48: más de diez toques mientras carga Clerk: el lote acepta diez, los mismos diez que se guardan; volver de Google no cancela el dibujo de Mi Hoja; la foto elegida pertenece a quien la eligió',async()=>{
 const tick=()=>new Promise(r=>setTimeout(r,0));const prof=async()=>({status:200,body:{profile:{handle:'ana'}}});
 let release;const slow=new Promise(r=>{release=r});const g=CUENTA_HARNESS({api:prof,clerk:async()=>{await slow;return g.C}});g.nav('#/c/yambo-toro');g.A.register('fav',()=>{});
 const ran=[];for(let n=1;n<=11;n++)g.A.quick(()=>ran.push(n),{inPlace:true,act:'fav',arg:String(n)});
 release();for(let i=0;i<6;i++)await tick();const it=g.intent();assert.equal(it.arg,'10','lo guardado termina en la décima');assert.equal(it.more.length,9,'con nueve antes');
 g.C.signIn('user_a');for(let i=0;i<8;i++)await tick();
 assert.deepEqual(ran,[1,2,3,4,5,6,7,8,9,10],'el lote acepta diez');
 // volver de Google en una página que pasa por la puerta (Mi Hoja): la acción corre y la página también se dibuja
 let rel;const hold=new Promise(r=>{rel=r});const h=CUENTA_HARNESS({api:async()=>{await hold;return prof()}});h.nav('#/mihoja/favoritos');h.C.user={id:'user_a'};
 const fav=[];h.A.register('fav',a=>fav.push(a));h.setIntent({from:'#/mihoja/favoritos',act:'fav',arg:'cigarros:x'});let drawn=0;
 h.A.require(()=>{drawn++});await tick();h.A.resume();await tick();rel();for(let i=0;i<8;i++)await tick();
 assert.deepEqual(fav,['cigarros:x'],'la acción guardada corre');assert.equal(drawn,1,'y Mi Hoja se dibuja');
 // la foto
 const ap=read('app.js');
 assert.ok(/const onFile=async e=>\{const f=e\.target\.files&&e\.target\.files\[0\];if\(!f\)return;const G=EXT\.accountGen\(\),form=\$\('#upForm'\);try\{const b=await resizeImage\(f\);if\(EXT\.accountGen\(\)!==G\|\|\$\('#upForm'\)!==form\)return;pendingPhoto=b;/.test(ap),'la foto elegida se descarta si cambió la cuenta o el formulario mientras se preparaba');
});
test('LHB-48: lo restaurado conserva a su dueño y toda su lista en cada reintento; dos reintentos seguidos se conservan entre sí',async()=>{
 const tick=()=>new Promise(r=>setTimeout(r,0));const prof=async()=>({status:200,body:{profile:{handle:'ana'}}});
 // una acción de A restaurada cuando ya es B: no corre, no pide nada y se borra lo guardado
 let calls=0;const a=CUENTA_HARNESS({api:async()=>{calls++;return prof()}});a.nav('#/c/yambo-toro');const ra=[];a.A.register('fav',x=>ra.push(x));
 a.setIntent({from:'#/c/yambo-toro',act:'fav',arg:'x',uid:'user_a'});a.C.user={id:'user_b'};await a.A.resume();for(let i=0;i<6;i++)await tick();
 assert.deepEqual(ra,[],'la acción de A no corre para B');assert.equal(a.intent(),null,'y se borra lo guardado');assert.equal(calls,0,'sin tocar la red');
 // restaurada como A y con 401: al pulsar Entrar se guarda de nuevo con las dos acciones y el mismo dueño
 let ok=false;const b=CUENTA_HARNESS({api:async()=>ok?await prof():{status:401,body:{}}});b.nav('#/c/yambo-toro');b.A.register('fav',()=>{});
 b.setIntent({from:'#/c/yambo-toro',act:'fav',arg:'dos',more:[{act:'fav',arg:'uno'}],uid:'user_a'});b.C.user={id:'user_a'};await b.A.resume();for(let i=0;i<8;i++)await tick();
 b.C.signIn(null);await tick();ok=true;b.notice().on();await tick();
 assert.deepEqual(b.intent(),{from:'#/c/yambo-toro',act:'fav',arg:'dos',uid:'user_a',more:[{act:'fav',arg:'uno'}]},'el reintento conserva la lista completa y a su dueño');
 // dos toques cuyas revisiones fallan una tras otra: el segundo reintento no borra al primero
 let n=0,rel;const hold=new Promise(r=>{rel=r});const c=CUENTA_HARNESS({api:async()=>{n++;if(n===1||n===3)return {status:503,body:{}};if(n===2){await hold;return prof()}return prof()}});c.nav('#/c/yambo-toro');c.C.user={id:'user_a'};
 const rc=[];c.A.quick(()=>rc.push('uno'),{inPlace:true,act:'fav'});for(let i=0;i<6;i++)await tick();
 c.A.quick(()=>rc.push('dos'),{inPlace:true,act:'fav'});for(let i=0;i<8;i++)await tick();rel();for(let i=0;i<6;i++)await tick();
 assert.deepEqual(rc.slice().sort(),['dos','uno'],'las dos acciones corren, una vez cada una');
});
test('LHB-48: cada acción en espera la hace una sola vez quien la reclama; las canceladas no vuelven; el dueño se respeta también sin Clerk y en el lote; el tope cuenta las aceptadas',async()=>{
 const tick=()=>new Promise(r=>setTimeout(r,0));const ticks=async n=>{for(let i=0;i<n;i++)await tick()};const prof=async()=>({status:200,body:{profile:{handle:'ana'}}});
 // 1) un reintento hace las dos acciones y la revisión que seguía pendiente no repite la segunda
 let n1=0,r2,r3;const h2=new Promise(r=>{r2=r}),h3=new Promise(r=>{r3=r});
 const a=CUENTA_HARNESS({api:async()=>{n1++;if(n1===1)return {status:503,body:{}};if(n1===2){await h2;return prof()}await h3;return prof()}});a.nav('#/c/yambo-toro');a.C.user={id:'user_a'};
 const ra=[];a.A.quick(()=>ra.push('uno'),{inPlace:true,act:'fav'});await ticks(6);a.A.quick(()=>ra.push('dos'),{inPlace:true,act:'fav'});await ticks(4);r2();await ticks(6);r3();await ticks(6);
 assert.deepEqual(ra,['uno','dos'],'cada acción corre una sola vez');
 // 2a) una acción que empezó A (sin dueño todavía) no se cuela en el reintento de B
 let wait,rel;const hold=new Promise(r=>{rel=r});let nc=0;let calls=0;const b=CUENTA_HARNESS({api:async()=>{calls++;return calls===1?{status:503,body:{}}:prof()},clerk:async()=>{nc++;if(nc===2){await hold}return b.C}});
 b.nav('#/c/yambo-toro');b.C.user={id:'user_a'};b.cache({sub:'user_a',handle:'ana'});await b.A.quick(()=>{},{inPlace:true,act:'fav'});await ticks(4);
 const rb=[];b.A.quick(()=>rb.push('de A'),{inPlace:true,act:'fav'});await ticks(2);b.C.signIn('user_b');
 b.A.quick(()=>rb.push('de B'),{inPlace:true,act:'fav'});await ticks(10);rel();await ticks(6);
 assert.deepEqual(rb,['de B'],'la acción de A no corre para B');
 // 2b) irse de la página durante la revisión cancela la acción: al volver no se suma al reintento de otra
 let rel4;const hold4=new Promise(r=>{rel4=r});let n4=0;const c=CUENTA_HARNESS({api:async()=>{n4++;if(n4===1){await hold4;return {status:503,body:{}}}if(n4===2)return {status:503,body:{}};return prof()}});
 c.nav('#/c/yambo-toro');c.C.user={id:'user_a'};const rc=[];c.A.quick(()=>rc.push('abandonada'),{inPlace:true,act:'fav'});await ticks(4);c.nav('#/artesanos');rel4();await ticks(6);c.nav('#/c/yambo-toro');
 c.A.quick(()=>rc.push('nueva'),{inPlace:true,act:'fav'});await ticks(10);
 assert.deepEqual(rc,['nueva'],'la abandonada no vuelve');
 // 3) sin Clerk: una acción de A no corre con el perfil guardado de B
 const rd=[];const d=CUENTA_HARNESS({clerk:async()=>{throw new Error('offline')}});d.nav('#/c/yambo-toro');d.A.register('fav',x=>rd.push(x));d.cache({sub:'user_b',handle:'bea'});d.setIntent({from:'#/c/yambo-toro',act:'fav',arg:'de-A',uid:'user_a'});
 await d.A.resume();await ticks(4);assert.deepEqual(rd,[],'sin Clerk, la acción de A no corre con el perfil de B');assert.equal(d.intent(),null);
 const re=[];const e=CUENTA_HARNESS({clerk:async()=>{throw new Error('offline')}});e.nav('#/c/yambo-toro');e.A.register('fav',x=>re.push(x));e.cache({sub:'user_a',handle:'ana'});e.setIntent({from:'#/c/yambo-toro',act:'fav',arg:'de-A',uid:'user_a'});
 await e.A.resume();await ticks(4);assert.deepEqual(re,['de-A'],'sin Clerk, con el perfil de A, corre una vez');
 // 4) una acción restaurada con dueño no se mezcla con el lote sin dueño
 let rel5;const hold5=new Promise(r=>{rel5=r});const f=CUENTA_HARNESS({api:prof,clerk:async()=>{await hold5;return f.C}});f.nav('#/c/yambo-toro');const rf=[];f.A.register('fav',x=>rf.push('guardada:'+x));
 f.setIntent({from:'#/c/yambo-toro',act:'fav',arg:'de-A',uid:'user_a'});f.A.quick(()=>rf.push('nueva'),{inPlace:true,act:'fav',arg:'n'});f.A.resume();rel5();await ticks(6);
 assert.equal(f.intent().uid,undefined,'lo guardado no lleva a la acción con dueño');assert.deepEqual((f.intent().more||[]).map(m=>m.arg),[],'ni como anterior');
 f.C.signIn('user_b');await ticks(8);assert.deepEqual(rf,['nueva'],'al entrar B corre solo lo suyo');
 // 5) once toques con la revisión pendiente: se aceptan diez
 let rel6;const hold6=new Promise(r=>{rel6=r});const g=CUENTA_HARNESS({api:async()=>{await hold6;return prof()}});g.nav('#/c/yambo-toro');g.C.user={id:'user_a'};const rg=[];
 for(let k=1;k<=11;k++){g.A.quick(()=>rg.push(k),{inPlace:true,act:'fav'});await ticks(3)}
 rel6();await ticks(8);assert.deepEqual(rg,[1,2,3,4,5,6,7,8,9,10],'se aceptan diez, y las diez corren');
 // 6) una acción restaurada con nueve anteriores ocupa diez: otro toque no cabe
 let rel7;const hold7=new Promise(r=>{rel7=r});const h=CUENTA_HARNESS({api:async()=>{await hold7;return prof()}});h.nav('#/c/yambo-toro');h.C.user={id:'user_a'};const rh=[];h.A.register('fav',x=>rh.push(x));
 h.setIntent({from:'#/c/yambo-toro',act:'fav',arg:'10',uid:'user_a',more:[1,2,3,4,5,6,7,8,9].map(n=>({act:'fav',arg:String(n)}))});
 h.A.resume();await ticks(4);h.A.quick(()=>rh.push('extra'),{inPlace:true,act:'fav'});await ticks(2);rel7();await ticks(8);
 assert.deepEqual(rh,['1','2','3','4','5','6','7','8','9','10'],'las diez de lo restaurado corren y el toque once no cabe');
});
test('LHB-48: un cambio de cuenta mientras Clerk carga cancela la acción; la acción con dueño sin sesión solo borra lo suyo',async()=>{
 const tick=()=>new Promise(r=>setTimeout(r,0));const ticks=async n=>{for(let i=0;i<n;i++)await tick()};
 // 1) Clerk carga despacio, entra B, y la acción que empezó sin sesión no corre para B aunque su perfil ya esté guardado
 let rel;const hold=new Promise(r=>{rel=r});let nc=0;const a=CUENTA_HARNESS({api:async()=>({status:200,body:{profile:{handle:'bea'}}}),clerk:async()=>{nc++;if(nc===2){await hold}return a.C}});
 a.nav('#/c/yambo-toro');a.C.user={id:'user_a'};a.cache({sub:'user_a',handle:'ana'});await a.A.quick(()=>{},{inPlace:true,act:'fav'});a.C.signIn(null);a.cache({sub:'user_b',handle:'bea'});
 const ra=[];a.A.quick(()=>ra.push('sin sesion'),{inPlace:true,act:'fav'});await ticks(2);a.C.signIn('user_b');rel();await ticks(8);
 assert.deepEqual(ra,[],'la acción que empezó sin sesión no corre para quien entró mientras tanto');
 // 2) lo mismo cuando Clerk termina fallando
 let rel2;const hold2=new Promise(r=>{rel2=r});let nd=0;const b=CUENTA_HARNESS({clerk:async()=>{nd++;if(nd===2){await hold2;throw new Error('sin red')}return b.C}});
 b.nav('#/c/yambo-toro');b.C.user={id:'user_a'};b.cache({sub:'user_a',handle:'ana'});await b.A.quick(()=>{},{inPlace:true,act:'fav'});b.C.signIn(null);b.cache({sub:'user_b',handle:'bea'});
 const rb=[];b.A.quick(()=>rb.push('sin sesion'),{inPlace:true,act:'fav'});await ticks(2);b.C.signIn('user_b');rel2();await ticks(8);
 assert.deepEqual(rb,[],'si Clerk falla tras el cambio de cuenta, la acción tampoco corre');
 // 3) una acción restaurada con dueño, sin sesión: no borra lo guardado por otro lote, y sí lo suyo
 const c=CUENTA_HARNESS();c.nav('#/c/yambo-toro');c.A.register('fav',()=>{});
 c.setIntent({from:'#/c/yambo-toro',act:'fav',arg:'del-lote'});await c.A.quick(()=>{},{inPlace:true,act:'fav',uid:'user_a'});await ticks(4);
 assert.equal(c.intent().arg,'del-lote','lo guardado por el lote sin dueño sigue ahí');
 const d=CUENTA_HARNESS();d.nav('#/c/yambo-toro');d.A.register('fav',()=>{});
 d.setIntent({from:'#/c/yambo-toro',act:'fav',arg:'suya',uid:'user_a'});await d.A.quick(()=>{},{inPlace:true,act:'fav',uid:'user_a'});await ticks(4);
 assert.equal(d.intent(),null,'lo guardado a nombre del mismo dueño se borra');
});
test('LHB-25: la foto de perfil, al terminar, vuelve a pasar por la puerta en vez de repintar el perfil directamente',()=>{
 const app=read('app.js');const i=app.indexOf("const onPic=async e=>");const seg=app.slice(i,app.indexOf('\n',i));
 assert.ok(seg.includes("await idb.put('perfil',b)")&&seg.includes("toast(tt('pf.fotoOk'));route();topAvatar()"),'tras guardar la foto se llama route()');assert.ok(!/fotoOk'\)\);vPerfil\(\)/.test(seg),'no se repinta el perfil sin pasar por la puerta');
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
test('LHB-24: migraciones 0001 y 0002 en SQLite real; /api/me: 401, needsProfile, perfil',async()=>{
 const {DatabaseSync}=require('node:sqlite');const db=new DatabaseSync(':memory:');db.exec('PRAGMA foreign_keys=ON');
 const mig=f=>fs.readFileSync(path.join(__dirname,'..','migrations',f),'utf8');db.exec(mig('0001_init.sql'));db.exec(mig('0002_clerk_profiles.sql'));
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
