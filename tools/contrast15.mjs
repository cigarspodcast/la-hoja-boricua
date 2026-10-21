
import pw from '/home/user/node_modules/playwright-core/index.js'; const {chromium}=pw;
const b=await chromium.launch({executablePath:'/home/user/.cache/ms-playwright/chromium-1248/chrome-linux64/chrome',args:['--no-sandbox']});
const ctx=await b.newContext({viewport:{width:process.argv[3]|0||390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true});
const p=await ctx.newPage();
await p.goto(process.argv[2]+'?t='+Date.now()+'#/catalogo',{waitUntil:'load'});await p.waitForTimeout(6000);
await p.evaluate(()=>{const s=document.querySelector('#splash');if(s)s.remove()});await p.waitForTimeout(500);
const boxes=await p.evaluate(()=>{const h=document.querySelector('.hero');const out=[];for(const e of h.querySelectorAll('.eyebrow,h1,p')){const r=document.createRange();r.selectNodeContents(e);for(const rr of r.getClientRects())out.push({t:e.tagName,color:getComputedStyle(e).color,x:rr.x,y:rr.y,w:rr.width,h:rr.height})}
 for(const e of h.querySelectorAll('.eyebrow,h1,p'))e.style.visibility='hidden';return out});
await p.waitForTimeout(300);
await p.screenshot({path:process.argv[4]});
console.log(JSON.stringify(boxes));await b.close();
