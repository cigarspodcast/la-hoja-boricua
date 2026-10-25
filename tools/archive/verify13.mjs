
import pw from '/home/user/node_modules/playwright-core/index.js'; const {chromium}=pw;
const base='https://lahojaboricua.sites.tab.bot/'; const out=process.argv[2];
const b=await chromium.launch({executablePath:'/home/user/.cache/ms-playwright/chromium-1248/chrome-linux64/chrome',args:['--no-sandbox']});
const ctx=await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true});
const p=await ctx.newPage(); const errs=[]; p.on('pageerror',e=>errs.push('pageerror '+e.message)); p.on('console',m=>{if(m.type()==='error')errs.push(m.text())});
p.on('requestfailed',r=>errs.push('reqfail '+r.url()+' '+(r.failure()?.errorText||'')));
await p.goto(base+'?v13='+Date.now(),{waitUntil:'load'});
await p.waitForTimeout(1200);
const mid=await p.evaluate(()=>({splash:!!document.querySelector('#splash'),anims:document.getAnimations().length,flag:!!document.querySelector('#splash .splash-bandera'),logo:(()=>{const i=document.querySelector('#splash img[src*="icon.svg"]');return i?{nw:i.naturalWidth,complete:i.complete}:null})()}));
await p.screenshot({path:out+'/splash.png'});
await p.waitForTimeout(4000);
const splashGone=!(await p.evaluate(()=>!!document.querySelector('#splash')));
await p.evaluate(async()=>{await navigator.serviceWorker.ready}); await p.waitForTimeout(2500);
const info=await p.evaluate(async()=>{const ks=await caches.keys();const sw=await (await fetch('sw.js',{cache:'no-store'})).text();const counts={};for(const k of ['artesanos','cigarros','places']){counts[k]=(await (await fetch('data/'+k+'.json',{cache:'no-store'})).json()).length}
 const m=await (await fetch('manifest.webmanifest',{cache:'no-store'})).json();const icons=[];
 for(const i of [...m.icons,{src:'icons/apple-touch-icon.png',sizes:'180x180'},{src:'icons/favicon-32.png',sizes:'32x32'}]){const r=await fetch(i.src,{cache:'no-store'});const bm=await createImageBitmap(await r.blob());icons.push([i.src,i.sizes,r.status,bm.width+'x'+bm.height])}
 const hdr=[...document.querySelectorAll('img[src*="icon"]')].map(i=>[i.getAttribute('src'),i.naturalWidth]);
 return {ks,ver:sw.match(/VERSION='([^']+)'/)[1],counts,icons,hdr,controlled:!!navigator.serviceWorker.controller,fotosKeys:Object.keys(window.LHB_FOTOS).length}});
const allF=await p.evaluate(async()=>{const F=window.LHB_FOTOS;const bad=[];let n=0;for(const k in F){for(const u of [F[k].img,F[k].thumb]){const r=await fetch(u,{cache:'no-store'});if(!r.ok)bad.push(u);else{const bm=await createImageBitmap(await r.blob());if(!bm.width)bad.push(u)}}n++}return {n,bad}});
// Lugares list
await p.evaluate(()=>{location.hash='#/lugares'}); await p.waitForTimeout(1500);
const lug=await p.evaluate(()=>({sub:document.querySelector('.view, main')?.innerText.match(/\d+ lounges y \d+ puntos de venta/)?.[0]}));
const mapInfo=await p.evaluate(()=>({markers:document.querySelectorAll('.leaflet-marker-icon').length,off:document.querySelectorAll('.offline-pin').length}));
await p.evaluate(()=>{const b=document.querySelector('[data-mode="lista"]');b&&b.click()}); await p.waitForTimeout(1200);
const row=await p.evaluate(()=>{const rows=[...document.querySelectorAll('.list .row')];const r=rows.find(x=>x.querySelector('.t')?.textContent.trim()==='El Chalet');if(!r)return null;scrollTo(0,r.getBoundingClientRect().top+scrollY-260);return {rows:rows.length,text:r.innerText}});
await p.waitForTimeout(700); await p.screenshot({path:out+'/chalet_list.png'});
// map pin for El Chalet
await p.evaluate(()=>{const b=document.querySelector('[data-mode="mapa"]');b&&b.click();scrollTo(0,0)}); await p.waitForTimeout(2500);
const mapInfo2=await p.evaluate(()=>({markers:document.querySelectorAll('.leaflet-marker-icon').length,off:document.querySelectorAll('.offline-pin').length}));
const idx=await p.evaluate(()=>window.VB_DATA.places.findIndex(x=>x.id==='el-chalet-aguadilla'));
await p.evaluate(()=>{const m=document.querySelector('#map');m&&m.scrollIntoView({block:'start'})});await p.waitForTimeout(500);
await p.screenshot({path:out+'/map.png'});
await p.evaluate(()=>{location.hash='#/catalogo';scrollTo(0,0)}); await p.waitForTimeout(1500);
await ctx.setOffline(true); await p.reload({waitUntil:'load'}); await p.waitForTimeout(5500); await p.evaluate(()=>{location.hash='#/lugares'}); await p.waitForTimeout(1500);
const off=await p.evaluate(()=>({txt:document.body.innerText.includes('El Chalet')||document.body.innerHTML.includes('El Chalet'),ks:null}));
const offKs=await p.evaluate(async()=>caches.keys());
console.log(JSON.stringify({mid,splashGone,info,allF,lug,mapInfo,row,mapInfo2,idx,off,offKs,errs},null,1)); await b.close();
