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
 assert.match(sw,/const VERSION='lhb-v46'/);assert.ok(sw.includes("'hoja.js'"));assert.ok(ix.indexOf('hoja.js')<ix.indexOf('app.js'));
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
 assert.match(sw,/const VERSION='lhb-v46'/);for(const f of ['img/guagua/guagua_recorte.webp','img/guagua/campo.webp','img/guagua/hojas.webp']){assert.ok(sw.includes("'"+f+"'"),f);assert.ok(fs.existsSync(path.join(__dirname,'..','site',f)),f)}
 assert.ok(a.includes('img/guagua/guagua_recorte.webp')&&a.includes("VEHICULO='guagua'"));assert.ok(ix.includes('campo-hojas')&&ix.includes('splashCar'));
 assert.ok(css.includes('@keyframes rock'));assert.ok(js.includes("addEventListener('click',done)"));
 for(const f of ['img/guagua/guagua_recorte.webp','img/guagua/campo.webp','img/guagua/hojas.webp'])assert.ok(fs.statSync(path.join(__dirname,'..','site',f)).size<62000,f);});

test('v9: splash por capas + garita fuera del header',()=>{const ix=read('index.html'),css=read('styles.css'),js=read('app.js'),sw=read('sw.js');
 assert.match(sw,/const VERSION='lhb-v46'/);for(const c of ['l-hills','l-field','l-mid','l-fg','l-fg2','nube','id="dust"','id="wake"'])assert.ok(ix.includes(c),c);
 for(const c of ['.vsh{','.whl i{','@keyframes rock','@keyframes sway','.vb .van-i{'])assert.ok(css.includes(c),c);
 assert.ok(js.includes('REDUCED_ALL')&&js.includes("className='puff'")&&js.includes("className='wleaf'"));assert.ok(!js.includes('VBArt.garita("hero-garita")'));});

test('v10/v11: fotos Monte & Mística (Entre Humos), Maduro encendido (v11)',()=>{const src=read('fotos.js');const F=JSON.parse(src.slice(src.indexOf('=')+1).trim().replace(/;$/,''));const sw=read('sw.js');
 assert.match(sw,/const VERSION='lhb-v46'/);
 assert.equal(F['monte-mistica-corojo'].match,'exacta');assert.equal(F['monte-mistica-connecticut'].match,'linea');
 for(const id of ['monte-mistica-corojo','monte-mistica-connecticut']){assert.equal(F[id].credito,'Foto: Entre Humos');assert.ok(sw.includes("'"+F[id].thumb+"'"));assert.ok(fs.statSync(path.join(S,F[id].img)).size<80000)}
 assert.equal(F['monte-mistica-maduro'].match,'linea');
 for(const id of ['monte-mistica-maduro']){assert.equal(F[id].credito,'Foto: Entre Humos');assert.ok(sw.includes("'"+F[id].thumb+"'"));assert.ok(fs.existsSync(path.join(S,F[id].img)));assert.ok(fs.statSync(path.join(S,F[id].img)).size<80000)}});

test('v12: bandera de PR (opción A, triángulo celeste) en vez de la silla + fotos Galiz y Villareño',()=>{const ix=read('index.html'),css=read('styles.css'),sw=read('sw.js'),js=read('app.js'),art=read('art.js');
 assert.match(sw,/const VERSION='lhb-v46'/);
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

test('v14: botón de Spotify en Podcast',()=>{const hj=fs.readFileSync(path.join(S,'hoja.js'),'utf8');assert.ok(hj.includes("const SPOTIFY='https://open.spotify.com/show/5DUCZkx89z9cTeBaczq6Gr'"));assert.match(hj,/class="lbtn spotify" href="\$\{SPOTIFY\}" target="_blank" rel="noopener">\$\{SPOT_SVG\}Escúchalo en Spotify/);assert.match(fs.readFileSync(path.join(S,'sw.js'),'utf8'),/const VERSION='lhb-v46'/);});

test('v15: banner de Sergio en el catálogo, sin guagua',()=>{const js=fs.readFileSync(path.join(S,'app.js'),'utf8'),css=fs.readFileSync(path.join(S,'styles.css'),'utf8'),sw=fs.readFileSync(path.join(S,'sw.js'),'utf8');
 assert.ok(js.includes('<img class="hero-bg" src="img/hero/banner.webp"'));assert.ok(!js.includes('hero-volky')&&!js.includes('hero-art'));
 assert.ok(!css.includes('hero-art')&&!css.includes('@keyframes park')&&!css.includes('@keyframes idle'));assert.match(css,/\.hero-bg\{[^}]*object-fit:cover/);
 assert.match(sw,/const VERSION='lhb-v46'/);assert.ok(sw.includes("'img/hero/banner.webp'"));
 assert.ok(fs.statSync(path.join(S,'img/hero/banner.webp')).size<=35000);
 assert.ok(js.includes("VBArt.carro('mini')"));});
test('v16: paleta B Bandera (verdes intactos)',()=>{const c=fs.readFileSync(path.join(S,'styles.css'),'utf8'),a=fs.readFileSync(path.join(S,'app.js'),'utf8'),h=fs.readFileSync(path.join(S,'hoja.js'),'utf8');
 for(const v of ['--bg:#0e2417','--card:#173a26','--gold:#8fd162','--verde:#a9c487','--flam:#d0192e','--ado-d:#0050f0','--pr-red:#ed0000','--pr-blue:#0050f0','--cream:#f8f8f4','--celeste:#8fb8ff'])assert.ok(c.includes(v),v);
 assert.ok(!c.includes('--flam:#c93f25'));assert.ok(a.includes("const FACADE=['#0050f0','#ed0000','#f8f8f4','#ed0000','#f8f8f4','#0050f0']"));
 for(const old of ['#e2a39a','#efc56f','#86c0c6','#c3a2cf','#9fcdea','#b5162b','#1d3f7a','#f3f1e2'])assert.ok(!a.includes(old)&&!h.includes(old),old);
 assert.ok(fs.readFileSync(path.join(S,'index.html'),'utf8').toLowerCase().includes('5fb4e5')||c.toLowerCase().includes('5fb4e5'));});
test('v17: flor de tabaco reemplaza la garita, flamboyán nuevo',()=>{const S2=path.join(__dirname,'..','site');const a=fs.readFileSync(path.join(S2,'art.js'),'utf8'),ap=fs.readFileSync(path.join(S2,'app.js'),'utf8'),hj=fs.readFileSync(path.join(S2,'hoja.js'),'utf8');assert.ok(a.includes('function flor'));assert.ok(!ap.includes('VBArt.garita(')&&!hj.includes('VBArt.garita('));assert.ok(ap.includes('VBArt.flor()')&&hj.includes('VBArt.flor()'));assert.match(fs.readFileSync(path.join(S2,'sw.js'),'utf8'),/const VERSION='lhb-v46'/);});

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
 assert.match(read('sw.js'),/lhb-v46/);});

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
 assert.match(read('sw.js'),/const VERSION='lhb-v46'/);});
test('v23: 7 artesanos nuevos hechos en PR (28 total), sin teléfonos/emails, Adjuntas en la Ruta',()=>{const a=JSON.parse(readD('artesanos.json'));assert.ok(a.length>=28);assert.equal(new Set(a.map(x=>x.id)).size,a.length);
 const ids=['la-hoja-del-chan','cigarros-j-velez','tabacos-el-roble','el-escondite-adjuntas','hr-handmade-cigars','fumita-pr','monte-mistica'];const b=read('data/bundle.js');
 for(const id of ids){const x=a.find(y=>y.id===id);assert.ok(x,id);assert.ok(x.iniciales&&x.historia&&x.fuentes.length,id);assert.ok(b.includes('"id":"'+id+'"'),id);const s=JSON.stringify(x);assert.ok(!/\d{3}[-. )]+\d{3}[-. ]\d{4}/.test(s),'tel '+id);assert.ok(!/@[a-z0-9-]+\.[a-z]{2,}/i.test(s.replace(/https?:\/\/[^"]+/g,'')),'email '+id)}
 assert.ok(/\|Adjuntas,C,/.test(read('hoja.js')));assert.match(read('sw.js'),/const VERSION='lhb-v46'/);});

test('v24: 4 artesanos aprobados por Sergio (32 total), sin teléfonos/emails, Ponce y Juana Díaz en la Ruta',()=>{const a=JSON.parse(readD('artesanos.json'));assert.equal(a.length,32);assert.equal(new Set(a.map(x=>x.id)).size,32);const b=read('data/bundle.js');
 for(const id of ['casa-robles-cigars','juana-diaz-cigars','el-bastion-cigars','don-chamorro-ponce']){const x=a.find(y=>y.id===id);assert.ok(x,id);assert.ok(x.iniciales&&x.historia&&x.fuentes.length,id);assert.ok(b.includes('"id":"'+id+'"'),id);const s=JSON.stringify(x);assert.ok(!/\d{3}[-. )]+\d{3}[-. ]\d{4}/.test(s),'tel '+id);assert.ok(!/@[a-z0-9-]+\.[a-z]{2,}/i.test(s.replace(/https?:\/\/[^"]+/g,'')),'email '+id)}
 const h=read('hoja.js');assert.ok(h.includes('|Ponce,S,')&&h.includes('|Juana Díaz,S,'));assert.match(read('sw.js'),/const VERSION='lhb-v46'/);});

test('v28: splash con La Ruta del Tabaco, eslogan y flor',()=>{const ix=read('index.html');const m=ix.match(/<div class="splash"[\s\S]*?<div class="campo"/);assert.ok(m);const txt=m[0].replace(/<[^>]+>/g,'').replace(/\s+/g,' ');assert.ok(txt.includes('La Ruta del Tabaco en Puerto Rico'));assert.ok(txt.includes('Cigarros de Puerto Rico'));assert.ok(m[0].includes('La Ruta <em>del Tabaco</em>'));assert.ok(m[0].includes('id="splashFlor"'));assert.ok(read('app.js').includes("VBArt.flor('sf')"));assert.match(read('sw.js'),/const VERSION='lhb-v46'/);});

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
 for(const u of ['/cigarros/yambo-toro','/cigarros/','/artesanos/yambo-cigars','/lugares/'])assert.deepEqual(await nav(u),[],u);
 assert.deepEqual(await nav('/'),['./'],'la app sí se guarda como shell');
});
test('LHB-27: cada clave tt() existe en español e inglés, y los dos tienen las mismas claves',()=>{
 const {T}=I18N();const es=Object.keys(T.es).sort(),en=Object.keys(T.en).sort();assert.deepEqual(en,es,'mismas claves');
 const used=new Set([...read('app.js').matchAll(/\btt\('([^']+)'/g)].map(m=>m[1]).filter(k=>k!=='fort.'));
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
