/* LHB-95: rendered-width regression check. Serves site/ on a local port, opens it in headless Chrome over the DevTools protocol
   (no npm dependency: Node's own WebSocket) and measures:
   - the drawn width of the catalog card image (.grid .card .ph.has-foto img) at the LHB-85 viewports, and of a card in a
     .mini-row, against the width SIZES_GRID / SIZES_MINI (site/app.js) declare there: never below it, at most 3 px over;
   - #langSwitch for a Spanish and an English reader at 320, 360, 412 and 1024 px: the swap the English reader gets after load
     moves the switch and its neighbours (div.top-actions) by under 1 px, and the page never scrolls sideways.
   Prints a table and one PASS or FAIL line per check, and exits 1 on any FAIL (2 when the browser cannot run).
   usage: node tools/widths.mjs [SITE_DIR]   (env CHROME: the browser; default the usual Chrome install on Windows) */
import { createServer } from 'node:http';
import { readFile, mkdtemp, rm } from 'node:fs/promises';
import { existsSync, readFileSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join, resolve, extname, normalize } from 'node:path';

const SITE = resolve(process.argv[2] || join(import.meta.dirname, '..', 'site'));
const CHROME = process.env.CHROME || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const GRID_W = [320, 360, 375, 390, 412, 430, 500, 619, 620, 700, 759, 760, 1024, 1440];
const SWITCH_W = [320, 360, 412, 1024];
// what a mini-row card declares (the grid card's sizes is read from each rendered image)
const MINI = (readFileSync(join(SITE, 'app.js'), 'utf8').match(/SIZES_MINI='([^']*)'/) || [])[1];
if (!MINI) { console.log('FAIL SIZES_MINI not found in app.js'); process.exit(1); }
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json',
  '.webp': 'image/webp', '.jpg': 'image/jpeg', '.png': 'image/png', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.webmanifest': 'application/manifest+json' };

// the site as Pages serves it, minus the service worker (its first install reloads the page in the middle of a measurement)
const server = createServer(async (req, res) => {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (p === '/sw.js' || p.startsWith('/api/')) { res.writeHead(404); res.end(); return; }
  if (p.endsWith('/')) p += 'index.html';
  const f = normalize(join(SITE, p));
  if (!f.startsWith(SITE)) { res.writeHead(403); res.end(); return; }
  try { const b = await readFile(f); res.writeHead(200, { 'content-type': MIME[extname(f)] || 'application/octet-stream' }); res.end(b); }
  catch (e) { res.writeHead(404); res.end(); }
});
await new Promise(ok => server.listen(0, '127.0.0.1', ok));
const ORIGIN = 'http://127.0.0.1:' + server.address().port;

if (!existsSync(CHROME)) { console.log('NO BROWSER at ' + CHROME); server.close(); process.exit(2); }
const prof = await mkdtemp(join(tmpdir(), 'lhb95-'));
const chrome = spawn(CHROME, ['--headless=new', '--remote-debugging-port=0', '--user-data-dir=' + prof, '--no-first-run', '--no-default-browser-check',
  '--hide-scrollbars', '--force-device-scale-factor=1', 'about:blank'], { stdio: 'ignore' });
let port = null;
for (let i = 0; i < 100 && !port; i++) {
  await new Promise(r => setTimeout(r, 100));
  try { port = readFileSync(join(prof, 'DevToolsActivePort'), 'utf8').split(/\r?\n/)[0]; } catch (e) {}
}
const fail = async (why, code) => { if (why) console.log(why); try { chrome.kill(); } catch (e) {} server.close(); await new Promise(r => setTimeout(r, 300)); await rm(prof, { recursive: true, force: true }).catch(() => {}); process.exit(code); };
if (!port) await fail('NO BROWSER: DevToolsActivePort never appeared', 2);

// one page target over the DevTools protocol
const list = await (await fetch('http://127.0.0.1:' + port + '/json/list')).json();
const ws = new WebSocket(list.find(t => t.type === 'page').webSocketDebuggerUrl);
await new Promise((ok, no) => { ws.onopen = ok; ws.onerror = no; });
let seq = 0; const wait = new Map(), events = [];
ws.onmessage = m => { const d = JSON.parse(m.data); if (d.id && wait.has(d.id)) { const w = wait.get(d.id); wait.delete(d.id); d.error ? w.no(new Error(JSON.stringify(d.error))) : w.ok(d.result); } else if (d.method) events.push(d); };
const cdp = (method, params = {}) => new Promise((ok, no) => { const id = ++seq; wait.set(id, { ok, no }); ws.send(JSON.stringify({ id, method, params })); });
const js = async expr => { const r = await cdp('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true }); if (r.exceptionDetails) throw new Error(expr.slice(0, 80) + ': ' + JSON.stringify(r.exceptionDetails).slice(0, 300)); return r.result.value; };
await cdp('Page.enable'); await cdp('Runtime.enable');
let langScript = null, navs = 0;
// a new viewport width on the loaded page: the media queries apply as on a load at that width; two frames for layout
const size = async width => { await cdp('Emulation.setDeviceMetricsOverride', { width, height: 900, deviceScaleFactor: 1, mobile: false }); await js('new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(()=>r(true))))'); };
async function open(width, lang, hash) {
  await cdp('Emulation.setDeviceMetricsOverride', { width, height: 900, deviceScaleFactor: 1, mobile: false });
  if (langScript) await cdp('Page.removeScriptToEvaluateOnNewDocument', { identifier: langScript });
  // a fresh reader: nothing remembered, the browser language decides (i18n.js), as for someone who opens the site the first time
  langScript = (await cdp('Page.addScriptToEvaluateOnNewDocument', { source: `try{localStorage.clear()}catch(e){};Object.defineProperty(navigator,'language',{get:()=>${JSON.stringify(lang)}});Object.defineProperty(navigator,'languages',{get:()=>[${JSON.stringify(lang)}]});` })).identifier;
  events.length = 0;
  // a query that changes every time: a navigation that only changes the hash fires no load event
  await cdp('Page.navigate', { url: ORIGIN + '/?lhb95=' + (++navs) + hash });
  for (let i = 0; i < 200 && !events.some(e => e.method === 'Page.loadEventFired'); i++) await new Promise(r => setTimeout(r, 50));
  await js('document.fonts.ready.then(()=>true)');
}
const until = async (expr, what) => { for (let i = 0; i < 100; i++) { if (await js(expr)) return; await new Promise(r => setTimeout(r, 100)); } throw new Error('never: ' + what); };
// the width the sizes attribute declares at this viewport: the first media condition that holds, its length resolved by the browser
const DECL = `(s=>{for(const part of s.split(/,(?![^(]*\\))/)){const t=part.trim(),m=t.match(/^(\\([^)]*\\))\\s+(.+)$/);if(m&&!matchMedia(m[1]).matches)continue;const len=m?m[2]:t;const d=document.createElement('div');d.style.cssText='position:absolute;visibility:hidden;width:'+len;document.body.appendChild(d);const w=d.getBoundingClientRect().width;d.remove();return w}return null})`;
const r1 = x => Math.round(x * 10) / 10;
const out = [], bad = [];
const check = (ok, line) => { out.push((ok ? 'PASS ' : 'FAIL ') + line); if (!ok) bad.push(line); };
try {
  out.push('LHB-95 rendered widths, site ' + SITE + ', measured ' + new Date().toISOString().slice(0, 16) + 'Z in headless Chrome (' + (await (await fetch('http://127.0.0.1:' + port + '/json/version')).json()).Browser + ').');
  out.push('Counting basis: getBoundingClientRect().width in CSS px, device scale 1, classic scrollbars hidden (clientWidth = viewport).');
  out.push('');
  out.push('card image (.grid .card .ph.has-foto img) against the sizes the card declares');
  out.push('viewport  drawn   declared  over');
  await open(GRID_W[0], 'es-PR', '#/catalogo');
  await until(`!!document.querySelector('.grid .card .ph.has-foto img')`, 'a catalog card with a photo');
  for (const w of GRID_W) {
    await size(w);
    const m = await js(`(()=>{const i=document.querySelector('.grid .card .ph.has-foto img');return {drawn:i.getBoundingClientRect().width,sizes:i.getAttribute('sizes'),decl:${DECL}(i.getAttribute('sizes')),cw:document.documentElement.clientWidth}})()`);
    const over = m.decl - m.drawn;
    out.push(String(w).padStart(8) + String(r1(m.drawn)).padStart(8) + String(r1(m.decl)).padStart(10) + String(r1(over)).padStart(6));
    check(m.cw === w, `grid ${w}: clientWidth ${m.cw} equals the viewport`);
    check(over >= 0 && over <= 3, `grid ${w}: declared ${r1(m.decl)} is at or above drawn ${r1(m.drawn)} by at most 3 px (over ${r1(over)})`);
  }
  // the mini row (Mi Hoja: my uploads, my favorites): a catalog card cloned into a .mini-row at the top of #view, as LHB-85 measured it
  await js(`(()=>{const c=document.querySelector('.grid .card').cloneNode(true);c.querySelector('.ph.has-foto img').id='lhb95mini';const r=document.createElement('div');r.className='mini-row';r.appendChild(c);document.getElementById('view').prepend(r);return true})()`);
  for (const w of [320, 1024]) {
    await size(w);
    const m = await js(`(()=>{const i=document.getElementById('lhb95mini');return {drawn:i.getBoundingClientRect().width,decl:${DECL}(${JSON.stringify(MINI)})}})()`);
    const decl = m.decl, over = decl - m.drawn;
    out.push('mini ' + String(w).padStart(4) + String(r1(m.drawn)).padStart(7) + String(r1(decl)).padStart(10) + String(r1(over)).padStart(6));
    check(over >= 0 && over <= 3, `mini row ${w}: SIZES_MINI ${r1(decl)} is at or above drawn ${r1(m.drawn)} by at most 3 px (over ${r1(over)})`);
  }
  out.push('');
  out.push('language switch (#langSwitch) and its neighbours (div.top-actions), Spanish reader (as shipped) and English reader (swapped after load)');
  out.push('viewport  reader   text      width  switch.left  top-actions.left  scrollWidth');
  const got = {};
  for (const [lang, name] of [['es-PR', 'Spanish'], ['en-US', 'English']]) {
    await open(SWITCH_W[0], lang, '');
    await until(`(()=>{const b=document.getElementById('langSwitch');return !!b&&!b.hidden})()`, 'the switch shown for ' + name);
    for (const w of SWITCH_W) {
      await size(w);
      const m = await js(`(()=>{const b=document.getElementById('langSwitch'),t=document.querySelector('.top-actions');const rb=b.getBoundingClientRect(),rt=t.getBoundingClientRect();const vis=[...b.children].filter(e=>getComputedStyle(e).display!=='none').map(e=>e.textContent).join('');return {text:vis,width:rb.width,left:rb.left,tl:rt.left,sw:document.documentElement.scrollWidth}})()`);
      (got[w] = got[w] || {})[name] = m;
      out.push(String(w).padStart(8) + '  ' + name.padEnd(8) + ' ' + m.text.padEnd(9) + String(r1(m.width)).padStart(6) + String(r1(m.left)).padStart(13) + String(r1(m.tl)).padStart(18) + String(m.sw).padStart(13));
      check(m.sw === w, `switch ${w} ${name}: no sideways scroll (scrollWidth ${m.sw})`);
    }
  }
  for (const w of SWITCH_W) {
    const g = got[w], ds = Math.abs(g.Spanish.left - g.English.left), dt = Math.abs(g.Spanish.tl - g.English.tl);
    check(ds < 1 && dt < 1, `switch ${w}: the English swap moves the switch by ${r1(ds)} px and top-actions by ${r1(dt)} px (under 1 px)`);
    check(g.Spanish.text !== g.English.text, `switch ${w}: the label differs by reader (${g.Spanish.text} / ${g.English.text})`);
  }
} catch (e) {
  out.push('FAIL the run itself: ' + e.message);
  bad.push('run');
}
out.push('');
out.push(bad.length ? 'RESULT FAIL ' + bad.length + ' of ' + out.filter(l => /^(PASS|FAIL) /.test(l)).length + ' checks' : 'RESULT PASS ' + out.filter(l => /^PASS /.test(l)).length + ' of ' + out.filter(l => /^PASS /.test(l)).length + ' checks');
console.log(out.join('\n'));
ws.close();
await fail('', bad.length ? 1 : 0);
