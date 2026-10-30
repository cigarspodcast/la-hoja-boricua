// LHB-7: pruebas del aviso de mudanza (404.html) y del service worker que retira la copia vieja (sw.js).
// node --test evidence/retiro.test.js
const test=require('node:test'),assert=require('node:assert'),fs=require('fs'),path=require('path'),vm=require('vm');
const ROOT=path.join(__dirname,'..');
const html=()=>fs.readFileSync(path.join(ROOT,'404.html'),'utf8');
const script=()=>{const m=html().match(/<script>([\s\S]*?)<\/script>/);assert.ok(m,'404.html tiene su script');return m[1]};
function page(o){
 const store=new Map(Object.entries(o.store||{}).map(([k,v])=>[k,typeof v==='string'?v:JSON.stringify(v)]));
 const els={};const el=id=>els[id]||(els[id]={id,hidden:['datos','listo'].includes(id),href:'',onclick:null});
 const replaced=[];
 const w={location:{pathname:o.path||'/la-hoja-boricua/',search:o.search||'',hash:o.hash||'',replace:u=>replaced.push(u)},
  localStorage:{getItem:k=>store.has(k)?store.get(k):null},
  document:{getElementById:el}};
 vm.runInNewContext(script(),{window:w,Blob,URL,setTimeout,JSON,Object,Array,String,Date});
 return {w,el,replaced,R:w.LHB_RETIRO};
}
test('LHB-7: cada dirección vieja lleva a la misma en lahojaboricua.com',()=>{
 const R=page({}).R;
 assert.equal(R.destino({pathname:'/la-hoja-boricua/'}),'https://lahojaboricua.com/');
 assert.equal(R.destino({pathname:'/la-hoja-boricua'}),'https://lahojaboricua.com/');
 assert.equal(R.destino({pathname:'/la-hoja-boricua/lugares/vc-lounge',search:'?a=1',hash:'#/mihoja'}),'https://lahojaboricua.com/lugares/vc-lounge?a=1#/mihoja');
 assert.equal(R.destino({pathname:'/la-hoja-boricua-otra/x'}),'https://lahojaboricua.com/la-hoja-boricua-otra/x');
});
test('LHB-7: sin Mi Hoja guardada, redirige enseguida',()=>{
 const p=page({path:'/la-hoja-boricua/artesanos/x',store:{lhb_mihoja_v1:{schema:1,humidor:[],diario:[],pasaporte:{artesanos:{},cigarros:{},lugares:{}},favs:{cigarros:[],artesanos:[],lugares:[]},ratings:{}}}});
 assert.deepEqual(p.replaced,['https://lahojaboricua.com/artesanos/x']);
 assert.equal(p.el('datos').hidden,true);
 assert.equal(p.el('enlace').href,'https://lahojaboricua.com/artesanos/x');
});
test('LHB-7: con Mi Hoja guardada, no redirige y ofrece el respaldo',()=>{
 for(const store of [{lhb_mihoja_v1:{humidor:[{id:'h1'}]}},{lhb_mihoja_v1:{pasaporte:{lugares:{l1:'2026-01-01'}}}},{lhb_mihoja_v1:{ratings:{c1:4}}},{vb_favs:['c1']},{vb_uploads:[{id:'u1'}]}]){
  const p=page({store});
  assert.deepEqual(p.replaced,[],JSON.stringify(store));
  assert.equal(p.el('datos').hidden,false);assert.equal(p.el('ir').hidden,true);
  assert.equal(typeof p.el('bajar').onclick,'function');
  assert.equal(p.el('ir2').href,'https://lahojaboricua.com/');
 }
});
test('LHB-7: el respaldo tiene el formato que importa la app nueva',()=>{
 const mh={schema:1,creado:'2026-01-01',humidor:[{id:'h1'}],diario:[{id:'d1'}],pasaporte:{artesanos:{},cigarros:{},lugares:{}},favs:{cigarros:['c1'],artesanos:[],lugares:[]},ratings:{},draft:{x:1}};
 const j=JSON.parse(JSON.stringify(page({store:{lhb_mihoja_v1:mh,vb_perfil:{n:'A'},vb_uploads:[{id:'u1'}]}}).R.respaldo()));
 assert.equal(j.app,'La Hoja Boricua');assert.equal(j.tipo,'respaldo-mi-hoja');assert.equal(j.schema,1);
 assert.deepEqual(j.mihoja,{...mh,draft:null});
 assert.deepEqual(j.extra,{perfil:{n:'A'},sugeridas:[],subidas:[{id:'u1'}]});
 // la app nueva acepta j.mihoja (site/hoja.js, importar): app es 'La Hoja Boricua' y mihoja existe
 assert.ok(j.mihoja&&j.app==='La Hoja Boricua');
 // sin Mi Hoja: trae favoritos y estrellas viejos, como load() en la app vieja
 const k=JSON.parse(JSON.stringify(page({store:{vb_favs:['c2',3],vb_ratings:{c2:5}}}).R.respaldo()));
 assert.deepEqual(k.mihoja.favs.cigarros,['c2']);assert.deepEqual(k.mihoja.ratings,{c2:5});
});
test('LHB-7: no hay index.html, así la raíz contesta 404 con el aviso',()=>{
 assert.equal(fs.existsSync(path.join(ROOT,'index.html')),false);
 assert.ok(/name="robots" content="noindex"/.test(html()));
});
test('LHB-7: el service worker borra los cachés, se da de baja y no toca localStorage',async()=>{
 const src=fs.readFileSync(path.join(ROOT,'sw.js'),'utf8');
 assert.ok(!/localStorage/.test(src.replace(/\/\*[\s\S]*?\*\//g,'')));
 const L={},deleted=[],nav=[];let unreg=false,skip=false;
 const self={addEventListener:(t,f)=>L[t]=f,skipWaiting:()=>{skip=true},registration:{unregister:async()=>{unreg=true;return true}},
  clients:{matchAll:async()=>[{url:'https://cigarspodcast.github.io/la-hoja-boricua/',navigate:async u=>{nav.push(u)}}]}};
 const caches={keys:async()=>['lhb-v44','vb-tiles'],delete:async k=>{deleted.push(k);return true}};
 vm.runInNewContext(src,{self,caches});
 L.install({});assert.equal(skip,true);
 let p;L.activate({waitUntil:x=>p=x});await p;
 assert.deepEqual(deleted.sort(),['lhb-v44','vb-tiles']);assert.equal(unreg,true);
 assert.deepEqual(nav,['https://cigarspodcast.github.io/la-hoja-boricua/']);
});
