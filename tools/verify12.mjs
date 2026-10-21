
import pw from '/home/user/node_modules/playwright-core/index.js'; const {chromium}=pw;
const base='https://lahojaboricua.sites.tab.bot/'; const out=process.argv[2];
const b=await chromium.launch({executablePath:'/home/user/.cache/ms-playwright/chromium-1248/chrome-linux64/chrome',args:['--no-sandbox']});
const ctx=await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true});
const p=await ctx.newPage(); const errs=[]; p.on('pageerror',e=>errs.push('pageerror '+e.message)); p.on('console',m=>{if(m.type()==='error')errs.push(m.text())});
p.on('requestfailed',r=>errs.push('reqfail '+r.url()+' '+(r.failure()?.errorText||'')));
await p.goto(base+'?v12='+Date.now(),{waitUntil:'load'});
await p.waitForTimeout(1300);
const fl=await p.evaluate(()=>{const e=document.querySelector('#splash .splash-bandera');if(!e)return null;const r=e.getBoundingClientRect();const tri=e.querySelector('.tela path:nth-of-type(6)');return {x:r.x,y:r.y,w:r.width,h:r.height,vis:getComputedStyle(e).visibility,op:getComputedStyle(e).opacity,anim:getComputedStyle(e.querySelector('.tela')).animationName,tri:tri?.getAttribute('fill')}});
const mid=await p.evaluate(()=>({anims:document.getAnimations().length,puffs:document.querySelectorAll('.puff').length}));
if(fl){const cx=fl.x+fl.w/2,cy=fl.y+fl.h/2;await p.screenshot({path:out+'/splash_clip.png',clip:{x:Math.max(0,cx-110),y:Math.max(0,cy-120),width:220,height:190}});}
await p.screenshot({path:out+'/splash_full.png'});
await p.waitForTimeout(4000);
const splashGone=!(await p.evaluate(()=>!!document.querySelector('#splash')));
await p.evaluate(async()=>{await navigator.serviceWorker.ready}); await p.waitForTimeout(2500);
const info=await p.evaluate(async()=>{const ks=await caches.keys();const c=await caches.open('lhb-v10');const reqs=(await c.keys()).map(r=>new URL(r.url).pathname);
 const sw=await (await fetch('sw.js',{cache:'no-store'})).text();const counts={};for(const k of ['artesanos','cigarros','places']){counts[k]=(await (await fetch('data/'+k+'.json',{cache:'no-store'})).json()).length}
 return {ks,precached:reqs.length,newThumbs:reqs.filter(u=>u.includes('galiz')||u.includes('villareno')),fotosKeys:Object.keys(window.LHB_FOTOS).length,ver:sw.match(/VERSION='([^']+)'/)[1],counts,controlled:!!navigator.serviceWorker.controller}});
await p.evaluate(()=>{location.hash='#/mihoja'}); await p.waitForTimeout(1500);
const empty=await p.evaluate(()=>{const es=[...document.querySelectorAll('.empty')];return es.map(e=>{const s=getComputedStyle(e,'::before');return {t:e.textContent.slice(0,40),bg:s.backgroundImage.includes('5FB4E5'),w:s.width,h:s.height}})});
await p.evaluate(()=>{const e=document.querySelector('.empty');if(e)scrollTo(0,e.getBoundingClientRect().top+scrollY-200)});await p.waitForTimeout(500);
await p.screenshot({path:out+'/empty.png'});
await p.evaluate(()=>{location.hash='#/catalogo';scrollTo(0,0)}); await p.waitForTimeout(1500);
const cat=async()=>p.evaluate(()=>{const cards=[...document.querySelectorAll('.grid .card')];const f=cards.filter(c=>c.querySelector('.ph.has-foto img'));
 return {cards:cards.length,foto:f.length,loaded:f.filter(c=>c.querySelector('img').naturalWidth>0).length,nw:cards.filter(c=>/galiz-spirit|villareno-surtido/.test(c.getAttribute('href'))).map(c=>[c.getAttribute('href'),c.querySelector('.ph.has-foto img')?.naturalWidth||0])}});
const c1=await cat();
await p.evaluate(async()=>{const cs=[...document.querySelectorAll('.grid .card')].filter(c=>/galiz-spirit|villareno-surtido/.test(c.getAttribute('href')));const ys=cs.map(c=>c.getBoundingClientRect().top+scrollY);scrollTo(0,Math.min(...ys)-140)});
await p.waitForTimeout(1500);
const pos=await p.evaluate(()=>[...document.querySelectorAll('.grid .card')].filter(c=>/galiz-spirit|villareno-surtido/.test(c.getAttribute('href'))).map(c=>{const r=c.getBoundingClientRect();return [c.getAttribute('href'),Math.round(r.top),Math.round(r.bottom)]}));
await p.screenshot({path:out+'/cat.png'});
const fichas={};for(const id of ['galiz-spirit','villareno-surtido']){await p.evaluate(id=>{location.hash='#/c/'+id;scrollTo(0,0)},id);await p.waitForTimeout(1600);
 fichas[id]=await p.evaluate(()=>{const i=document.querySelector('figure img, .foto img');return {img:i?.getAttribute('src'),nw:i?.naturalWidth,cred:document.querySelector('.foto-cred')?.textContent||null}});await p.screenshot({path:out+'/ficha_'+id+'.png'});}
const allF=await p.evaluate(async()=>{const F=window.LHB_FOTOS;const bad=[];let n=0;for(const k in F){for(const u of [F[k].img,F[k].thumb]){const r=await fetch(u,{cache:'no-store'});if(!r.ok)bad.push(u);else{const bm=await createImageBitmap(await r.blob());if(!bm.width)bad.push(u)}}n++}return {n,bad}});
await p.evaluate(()=>{location.hash='#/catalogo'}); await p.waitForTimeout(800);
await ctx.setOffline(true); await p.reload({waitUntil:'load'}); await p.waitForTimeout(5500); await p.evaluate(()=>{location.hash='#/catalogo'}); await p.waitForTimeout(1500);
const off=await cat();
const offKs=await p.evaluate(async()=>caches.keys());
console.log(JSON.stringify({fl,mid,splashGone,info,empty,cat:c1,pos,fichas,allF,offline:off,offKs,errs},null,1)); await b.close();
