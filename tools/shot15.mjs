
import pw from '/home/user/node_modules/playwright-core/index.js'; const {chromium}=pw;
const base=process.argv[2], out=process.argv[3];
const b=await chromium.launch({executablePath:'/home/user/.cache/ms-playwright/chromium-1248/chrome-linux64/chrome',args:['--no-sandbox']});
const ctx=await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true});
const p=await ctx.newPage(); const errs=[]; p.on('pageerror',e=>errs.push('pageerror '+e.message)); p.on('console',m=>{if(m.type()==='error')errs.push(m.text())});
await p.goto(base+'?t='+Date.now()+'#/catalogo',{waitUntil:'load'});
await p.waitForTimeout(6000);
await p.evaluate(()=>{const s=document.querySelector('#splash');if(s)s.remove()});
await p.waitForSelector('.hero');await p.waitForTimeout(800);
const info=await p.evaluate(async()=>{const h=document.querySelector('.hero');const r=h.getBoundingClientRect();const img=h.querySelector('.hero-bg');
 let ver=null;try{ver=(await (await fetch('sw.js',{cache:'no-store'})).text()).match(/VERSION='([^']+)'/)[1]}catch(e){}
 const cs=getComputedStyle(h);
 const tx=[...h.querySelectorAll('.eyebrow,h1,p')].map(e=>{const rr=e.getBoundingClientRect();return {t:e.tagName,cls:e.className,color:getComputedStyle(e).color,size:getComputedStyle(e).fontSize,weight:getComputedStyle(e).fontWeight,x:rr.x,y:rr.y,w:rr.width,h:rr.height}});
 return {ver,rect:{x:r.x,y:r.y,w:r.width,h:r.height},radius:cs.borderRadius,img:img?{src:img.currentSrc,nw:img.naturalWidth,complete:img.complete,of:getComputedStyle(img).objectFit}:null,
  guaguaInHero:!!h.querySelector('.guagua,.volky,.hero-art'),facades:!!h.querySelector('.facades'),tx,anyGuaguaVisible:[...document.querySelectorAll('#view .guagua')].length}});
await p.screenshot({path:out});
console.log(JSON.stringify({info,errs}));
await b.close();
