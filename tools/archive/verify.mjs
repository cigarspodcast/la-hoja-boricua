
import pw from '/home/user/node_modules/playwright-core/index.js'; const {chromium}=pw;
const base='https://lahojaboricua.sites.tab.bot/'; const out=process.argv[2];
const b=await chromium.launch({executablePath:'/home/user/.cache/ms-playwright/chromium-1248/chrome-linux64/chrome',args:['--no-sandbox']});
const ctx=await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true,userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'});
const p=await ctx.newPage(); const errs=[]; p.on('pageerror',e=>errs.push('pageerror '+e.message)); p.on('console',m=>{if(m.type()==='error')errs.push(m.text()+' @'+(m.location()?.url||''))});
p.on('requestfailed',r=>errs.push('reqfail '+r.url()+' '+(r.failure()?.errorText||'')));
await p.goto(base+'?v7='+Date.now(),{waitUntil:'networkidle'});
await p.evaluate(async()=>{await navigator.serviceWorker.ready});
await p.waitForTimeout(2500);
const info=await p.evaluate(async()=>{const ks=await caches.keys();const c=await caches.open('lhb-v5');const reqs=(await c.keys()).map(r=>new URL(r.url).pathname);
 const sw=await (await fetch('sw.js',{cache:'no-store'})).text();
 const counts={};for(const k of ['artesanos','cigarros','places']){counts[k]=(await (await fetch('data/'+k+'.json',{cache:'no-store'})).json()).length}
 return {ks,thumbsCached:reqs.filter(u=>u.includes('_thumb.webp')).length,largeCached:reqs.filter(u=>u.includes('/img/')&&!u.includes('_thumb')).length,ver:sw.match(/VERSION='([^']+)'/)[1],counts,controlled:!!navigator.serviceWorker.controller}});
console.log('INFO',JSON.stringify(info));
await p.evaluate(()=>{location.hash='#/catalogo'}); await p.waitForTimeout(1200);
const cat=await p.evaluate(()=>{const cards=[...document.querySelectorAll('.grid .card')];const f=cards.filter(c=>c.querySelector('.ph.has-foto img'));return {cards:cards.length,foto:f.length,loaded:f.filter(c=>c.querySelector('img').naturalWidth>0).length,svg:cards.filter(c=>c.querySelector('.ph svg')).length}});
console.log('CAT',JSON.stringify(cat));
await p.evaluate(()=>{const g=document.querySelector('.grid');scrollTo(0,g.getBoundingClientRect().top+scrollY-70)}); await p.waitForTimeout(700);
await p.screenshot({path:out+'/v7_catalogo.jpg',type:'jpeg',quality:82});
async function detail(id,shot){await p.evaluate(i=>{location.hash='#/c/'+i},id);await p.waitForTimeout(1500);
 const d=await p.evaluate(()=>{const im=document.querySelector('#fotoMain');return {img:im?im.currentSrc.split('/').pop():null,nw:im?im.naturalWidth:0,cred:document.querySelector('.foto-cred')?.innerText||null,gal:document.querySelectorAll('.foto-th').length,svg:!!document.querySelector('.detail-ph svg'),note:document.body.innerText.includes('información pública, sujeta a verificación')}});
 console.log('DET',id,JSON.stringify(d)); if(shot){await p.evaluate(()=>scrollTo(0,0));await p.waitForTimeout(300);await p.screenshot({path:out+'/'+shot,type:'jpeg',quality:82})} return d}
await detail('turro-barber-pole','v7_ficha_turro.jpg');
await detail('puerto-rico-965');
await detail('cohoba-cigars');
const ids=await p.evaluate(()=>[...document.querySelectorAll('a')].length);
await detail('yambo-toro');
await p.click('.foto-th:nth-child(4)'); await p.waitForTimeout(800);
console.log('GALCLICK',await p.evaluate(()=>[document.querySelector('#fotoMain').currentSrc.split('/').pop(),document.querySelector('#fotoMain').naturalWidth]));
await p.click('.foto-th:nth-child(1)'); await p.waitForTimeout(600);
await p.evaluate(()=>{const g=document.querySelector('.foto-gal');scrollTo(0,Math.max(0,g.getBoundingClientRect().bottom+scrollY-700))});await p.waitForTimeout(400);
await p.screenshot({path:out+'/v7_ficha_yambo.jpg',type:'jpeg',quality:82});
// share
await detail('turro-barber-pole');
await p.click('[data-sheet="share"]'); await p.waitForTimeout(3500);
console.log('SHARE',await p.evaluate(()=>{const im=document.querySelector('#shPrev img');return im?[im.naturalWidth,im.naturalHeight]:document.querySelector('#shPrev')?.innerText}));
await p.screenshot({path:out+'/v7_compartir.jpg',type:'jpeg',quality:82});
// offline
await ctx.setOffline(true);
await p.goto(base,{waitUntil:'load'}).catch(e=>errs.push('offline goto '+e.message)); await p.waitForTimeout(2000);
await p.evaluate(()=>{location.hash='#/catalogo'}); await p.waitForTimeout(1500);
const off=await p.evaluate(()=>{const f=[...document.querySelectorAll('.grid .card .ph.has-foto img')];return {cards:document.querySelectorAll('.grid .card').length,foto:f.length,loaded:f.filter(i=>i.complete&&i.naturalWidth>0).length}});
console.log('OFFLINE',JSON.stringify(off));
await p.evaluate(()=>{location.hash='#/artesanos'}); await p.waitForTimeout(800);
console.log('OFF_ART',await p.$$eval('.list .row',e=>e.length));
await ctx.setOffline(false);
console.log('ERRS',JSON.stringify(errs.filter(e=>!/offline goto/.test(e))),'OFFLINE_ERRS',errs.length);
await b.close();
