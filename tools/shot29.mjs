
import pw from '/home/user/node_modules/playwright-core/index.js'; const {chromium}=pw;
const base='https://lahojaboricua.sites.tab.bot/';
const b=await chromium.launch({executablePath:'/home/user/.cache/ms-playwright/chromium-1248/chrome-linux64/chrome',args:['--no-sandbox']});
const ctx=await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true,serviceWorkers:'block'});
const p=await ctx.newPage(); const errs=[]; p.on('pageerror',e=>errs.push('pageerror '+e.message)); p.on('console',m=>{if(m.type()==='error')errs.push(m.text())});
await p.goto(base+'?v29='+Date.now()+'#/eventos',{waitUntil:'load'});
await p.waitForTimeout(5500);
await p.evaluate(()=>{const s=document.querySelector('#splash');if(s)s.remove();});
await p.evaluate(()=>{if(!location.hash.includes('eventos'))location.hash='#/eventos'});
await p.waitForTimeout(1200);
const info=await p.evaluate(async()=>{const sw=await (await fetch('sw.js?x='+Date.now(),{cache:'no-store'})).text();
 const t=document.querySelector('#view')?.innerText||document.body.innerText;
 return {ver:(sw.match(/lhb-v\d+/)||[])[0],cards:[...document.querySelectorAll('article.ev .t, .anchor h2')].map(x=>x.textContent),bad:/no definid|por confirmar|no publicad|sin confirmar/i.test(document.body.innerText),emptyS:[...document.querySelectorAll('article.ev .s, .anchor .s')].filter(x=>!x.textContent.trim()).length,hash:location.hash}});
console.log(JSON.stringify(info,null,1));
// scroll a bit past the header so the list shows
await p.evaluate(()=>{const a=document.querySelector('.anchor');if(a)window.scrollTo(0,a.getBoundingClientRect().top+scrollY-70)});
await p.waitForTimeout(500);
await p.screenshot({path:process.argv[2]+'/ev1.png'});
await p.evaluate(()=>{const a=document.querySelector('#ev-don-rey-mockingbird-2026-10-25');if(a)window.scrollTo(0,a.getBoundingClientRect().top+scrollY-80)});
await p.waitForTimeout(400);await p.screenshot({path:process.argv[2]+'/ev2.png'});
console.log('ERRS',JSON.stringify(errs));
await b.close();
