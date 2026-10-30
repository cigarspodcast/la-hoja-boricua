/* LHB-95: rendered-width regression check. Serves site/ on a local port, opens it in headless Chrome over the DevTools protocol
   (no npm dependency: Node's own WebSocket) and measures:
   - the drawn width of EVERY catalog card photo (.grid .card .ph.has-foto img) at the LHB-85 viewports, and of a card in a
     .mini-row at the same viewports, against the width SIZES_GRID / SIZES_MINI (site/app.js) declare there: never below it,
     at most 3 px over;
   - the header for a Spanish and an English reader at 320, 360, 412 and 1024 px (LHB-109: the language left the header for the
     menu): div.top-actions holds exactly its three controls (search, menu, account), each drawn (displayed, visible, with a
     size); the swap the English reader gets after load moves div.top-actions and each control by under 1 px on every edge; the
     page never scrolls sideways; no #langSwitch is left; and the menu's language row is drawn with the other language's name,
     in that language.
   Every DevTools command has a deadline, a closed socket fails what is pending, and a watchdog ends the run before the test's
   own timeout, so the browser and its temporary profile are always removed.
   Prints a table and one PASS or FAIL line per check, and exits 1 on any FAIL (2 when the browser cannot run).
   usage: node tools/widths.mjs [SITE_DIR]   (env CHROME: the browser; default the usual Chrome install on Windows) */
import { createServer } from 'node:http';
import { readFile, mkdtemp } from 'node:fs/promises';
import { existsSync, readFileSync, rmSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join, resolve, extname, normalize } from 'node:path';

const SITE = resolve(process.argv[2] || join(import.meta.dirname, '..', 'site'));
const CHROME = process.env.CHROME || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const GRID_W = [320, 360, 375, 390, 412, 430, 500, 619, 620, 700, 759, 760, 1024, 1440];
const HEADER_W = [320, 360, 412, 1024];
const CMD_MS = 15000, WATCHDOG_MS = 90000; // one DevTools command; the whole run (the test gives the tool 120 s)
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
// the browser starts inside the protected block below; a launch that fails (spawn throws, or an 'error' event) is NO BROWSER and still cleans up
let chrome = null, gone = Promise.resolve(), launchFail = null, ws = null;
// the browser and its profile go on every way out: the end, a failure, a failed launch, the watchdog
const cleanup = async () => {
  try { ws && ws.close(); } catch (e) {}
  try { chrome && chrome.kill(); } catch (e) {}
  server.close();
  await Promise.race([gone, new Promise(r => setTimeout(r, 3000))]);
  for (let i = 0; i < 10; i++) { try { rmSync(prof, { recursive: true, force: true }); break; } catch (e) { await new Promise(r => setTimeout(r, 300)); } }
};
const watchdog = setTimeout(async () => { console.log('FAIL the run itself: watchdog, no result after ' + WATCHDOG_MS / 1000 + ' s'); console.log('RESULT FAIL watchdog'); await cleanup(); process.exit(1); }, WATCHDOG_MS);
const deadline = (p, ms, what) => Promise.race([p, new Promise((_, no) => setTimeout(() => no(new Error('no answer in ' + ms + ' ms: ' + what)), ms))]);

const out = [], bad = [];
const check = (ok, line) => { out.push((ok ? 'PASS ' : 'FAIL ') + line); if (!ok) bad.push(line); };
let code = 0;
try {
  try {
    chrome = spawn(CHROME, ['--headless=new', '--remote-debugging-port=0', '--user-data-dir=' + prof, '--no-first-run', '--no-default-browser-check',
      '--hide-scrollbars', '--force-device-scale-factor=1', 'about:blank'], { stdio: 'ignore' });
  } catch (e) { console.log('NO BROWSER: ' + e.message); code = 2; throw null; }
  gone = new Promise(r => { chrome.once('exit', r); chrome.once('error', r); });
  chrome.once('error', e => { launchFail = e; });
  let port = null;
  for (let i = 0; i < 100 && !port && !launchFail; i++) {
    await new Promise(r => setTimeout(r, 100));
    try { port = readFileSync(join(prof, 'DevToolsActivePort'), 'utf8').split(/\r?\n/)[0]; } catch (e) {}
  }
  if (launchFail) { console.log('NO BROWSER: ' + launchFail.message); code = 2; throw null; }
  if (!port) { console.log('NO BROWSER: DevToolsActivePort never appeared'); code = 2; throw null; }
  const get = async u => (await fetch('http://127.0.0.1:' + port + u, { signal: AbortSignal.timeout(CMD_MS) })).json();

  // one page target over the DevTools protocol
  const list = await get('/json/list');
  ws = new WebSocket(list.find(t => t.type === 'page').webSocketDebuggerUrl);
  await deadline(new Promise((ok, no) => { ws.onopen = ok; ws.onerror = no; }), CMD_MS, 'the DevTools socket');
  let seq = 0; const wait = new Map(), events = [];
  ws.onmessage = m => { const d = JSON.parse(m.data); if (d.id && wait.has(d.id)) { const w = wait.get(d.id); wait.delete(d.id); clearTimeout(w.t); d.error ? w.no(new Error(JSON.stringify(d.error))) : w.ok(d.result); } else if (d.method) events.push(d); };
  // a closed socket fails every command still waiting, instead of leaving it pending forever
  ws.onclose = () => { for (const [id, w] of wait) { wait.delete(id); clearTimeout(w.t); w.no(new Error('the DevTools socket closed')); } };
  const cdp = (method, params = {}) => new Promise((ok, no) => {
    if (ws.readyState !== WebSocket.OPEN) { no(new Error('the DevTools socket is closed: ' + method)); return; }
    const id = ++seq;
    const t = setTimeout(() => { if (wait.delete(id)) no(new Error('no answer in ' + CMD_MS + ' ms: ' + method)); }, CMD_MS);
    wait.set(id, { ok, no, t }); ws.send(JSON.stringify({ id, method, params }));
  });
  const js = async expr => { const r = await cdp('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true }); if (r.exceptionDetails) throw new Error(expr.slice(0, 80) + ': ' + JSON.stringify(r.exceptionDetails).slice(0, 300)); return r.result.value; };
  await cdp('Page.enable'); await cdp('Runtime.enable');
  let langScript = null, navs = 0;
  // a new viewport width on the loaded page: the media queries apply as on a load at that width; two frames for layout
  const size = async width => { await cdp('Emulation.setDeviceMetricsOverride', { width, height: 900, deviceScaleFactor: 1, mobile: false }); await js('new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(()=>r(true))))'); };
  const open = async (width, lang, hash) => {
    await cdp('Emulation.setDeviceMetricsOverride', { width, height: 900, deviceScaleFactor: 1, mobile: false });
    if (langScript) await cdp('Page.removeScriptToEvaluateOnNewDocument', { identifier: langScript });
    // a fresh reader: nothing remembered, the browser language decides (i18n.js), as for someone who opens the site the first time
    langScript = (await cdp('Page.addScriptToEvaluateOnNewDocument', { source: `try{localStorage.clear()}catch(e){};Object.defineProperty(navigator,'language',{get:()=>${JSON.stringify(lang)}});Object.defineProperty(navigator,'languages',{get:()=>[${JSON.stringify(lang)}]});` })).identifier;
    events.length = 0;
    // a query that changes every time: a navigation that only changes the hash fires no load event
    await cdp('Page.navigate', { url: ORIGIN + '/?lhb95=' + (++navs) + hash });
    for (let i = 0; i < 200 && !events.some(e => e.method === 'Page.loadEventFired'); i++) await new Promise(r => setTimeout(r, 50));
    await js('document.fonts.ready.then(()=>true)');
  };
  const until = async (expr, what) => { for (let i = 0; i < 100; i++) { if (await js(expr)) return; await new Promise(r => setTimeout(r, 100)); } throw new Error('never: ' + what); };
  // the width the sizes attribute declares at this viewport: the first media condition that holds, its length resolved by the browser
  const DECL = `(s=>{for(const part of s.split(/,(?![^(]*\\))/)){const t=part.trim(),m=t.match(/^(\\([^)]*\\))\\s+(.+)$/);if(m&&!matchMedia(m[1]).matches)continue;const len=m?m[2]:t;const d=document.createElement('div');d.style.cssText='position:absolute;visibility:hidden;width:'+len;document.body.appendChild(d);const w=d.getBoundingClientRect().width;d.remove();return w}return null})`;
  const r1 = x => Math.round(x * 10) / 10;

  out.push('LHB-95 rendered widths, site ' + SITE + ', measured ' + new Date().toISOString().slice(0, 16) + 'Z in headless Chrome (' + (await get('/json/version')).Browser + ').');
  out.push('Counting basis: getBoundingClientRect() in CSS px, device scale 1, classic scrollbars hidden (clientWidth = viewport).');
  out.push('');
  out.push('card photos (.grid .card .ph.has-foto img), every one on the catalog page, against the sizes each declares');
  out.push('viewport  photos  drawn min-max   least over  most over');
  await open(GRID_W[0], 'es-PR', '#/catalogo');
  await until(`!!document.querySelector('.grid .card .ph.has-foto img')`, 'a catalog card with a photo');
  for (const w of GRID_W) {
    await size(w);
    const m = await js(`(()=>{const a=[...document.querySelectorAll('.grid .card .ph.has-foto img')].map((i,k)=>({k,drawn:i.getBoundingClientRect().width,decl:${DECL}(i.getAttribute('sizes'))}));return {a,cw:document.documentElement.clientWidth}})()`);
    const overs = m.a.map(i => i.decl - i.drawn), drawn = m.a.map(i => i.drawn);
    const off = m.a.filter((i, k) => !(overs[k] >= 0 && overs[k] <= 3));
    out.push(String(w).padStart(8) + String(m.a.length).padStart(8) + ('  ' + r1(Math.min(...drawn)) + '-' + r1(Math.max(...drawn))).padEnd(16) + String(r1(Math.min(...overs))).padStart(11) + String(r1(Math.max(...overs))).padStart(11));
    check(m.cw === w, `grid ${w}: clientWidth ${m.cw} equals the viewport`);
    // every photo: the declared width at or above the drawn width, by at most 3 px
    check(m.a.length >= 2 && off.length === 0 && overs.every(over => over >= 0 && over <= 3), `grid ${w}: all ${m.a.length} photos declare at or above their drawn width by at most 3 px` + (off.length ? ` (off: ${off.map(i => 'photo ' + (i.k + 1) + ' drawn ' + r1(i.drawn) + ' declared ' + r1(i.decl)).join('; ')})` : ''));
  }
  // the mini row (Mi Hoja: my uploads, my favorites): a catalog card cloned into a .mini-row at the top of #view, as LHB-85 measured it
  await js(`(()=>{const c=document.querySelector('.grid .card').cloneNode(true);c.querySelector('.ph.has-foto img').id='lhb95mini';const r=document.createElement('div');r.className='mini-row';r.appendChild(c);document.getElementById('view').prepend(r);return true})()`);
  out.push('');
  out.push('mini-row card photo against SIZES_MINI ' + MINI);
  out.push('viewport   drawn  declared  over');
  for (const w of GRID_W) {
    await size(w);
    const m = await js(`(()=>{const i=document.getElementById('lhb95mini');return {drawn:i.getBoundingClientRect().width,decl:${DECL}(${JSON.stringify(MINI)})}})()`);
    const over = m.decl - m.drawn;
    out.push(String(w).padStart(8) + String(r1(m.drawn)).padStart(8) + String(r1(m.decl)).padStart(10) + String(r1(over)).padStart(6));
    check(over >= 0 && over <= 3, `mini row ${w}: SIZES_MINI ${r1(m.decl)} is at or above drawn ${r1(m.drawn)} by at most 3 px (over ${r1(over)})`);
  }
  out.push('');
  out.push('header controls (div.top-actions: search, menu, account) and the menu language row, Spanish reader (as shipped) and English reader (swapped after load)');
  out.push('viewport  reader   controls  top-actions.left  scrollWidth');
  const got = {}, rows = {};
  // drawn: displayed, visible, with a size; the attribute hidden alone says nothing about CSS
  const SHOWN = `(e=>{const s=getComputedStyle(e),r=e.getBoundingClientRect();return s.display!=='none'&&s.visibility==='visible'&&r.width>0&&r.height>0})`;
  for (const [lang, name, html] of [['es-PR', 'Spanish', 'es-PR'], ['en-US', 'English', 'en']]) {
    await open(HEADER_W[0], lang, '');
    await until(`(()=>{const t=document.querySelector('.top-actions');return !!t&&document.documentElement.lang===${JSON.stringify(html)}&&[...t.children].every(${SHOWN})})()`, 'the header drawn for ' + name);
    for (const w of HEADER_W) {
      await size(w);
      const m = await js(`(()=>{const t=document.querySelector('.top-actions'),rt=t.getBoundingClientRect();const box=r=>({l:r.left,t:r.top,r:r.right,b:r.bottom});const kids=[...t.children].map(e=>({id:e.id||e.className,box:box(e.getBoundingClientRect()),shown:${SHOWN}(e)}));return {tl:rt.left,tbox:box(rt),kids,sw:document.documentElement.scrollWidth,old:!!document.getElementById('langSwitch')}})()`);
      (got[w] = got[w] || {})[name] = m;
      out.push(String(w).padStart(8) + '  ' + name.padEnd(8) + String(m.kids.length).padStart(10) + String(r1(m.tl)).padStart(18) + String(m.sw).padStart(13));
      check(m.sw === w, `header ${w} ${name}: no sideways scroll (scrollWidth ${m.sw})`);
      check(!m.old && m.kids.length === 3 && m.kids.every(k => k.shown), `header ${w} ${name}: top-actions holds its 3 controls, all drawn, and no #langSwitch (${m.kids.map(k => k.id).join(', ')})`);
    }
    // the menu: its language row names the other language, in that language
    await js(`document.querySelector('[data-sheet="menu"]').click()`);
    await until(`(()=>{const b=document.querySelector('.menu-dest[data-lang]');return !!b&&${SHOWN}(b)})()`, 'the language row drawn for ' + name);
    rows[name] = await js(`(()=>{const b=document.querySelector('.menu-dest[data-lang]'),n=b.querySelector('b');return {to:b.dataset.lang,text:n.textContent,lang:n.getAttribute('lang')}})()`);
    out.push('  menu row for ' + name + ': ' + rows[name].text + ' (lang ' + rows[name].lang + ', switches to ' + rows[name].to + ')');
  }
  check(rows.Spanish.to === 'en' && rows.Spanish.text === 'English' && rows.Spanish.lang === 'en', `menu row, Spanish reader: English, marked lang="en" (${rows.Spanish.text})`);
  check(rows.English.to === 'es' && rows.English.text === 'Espa\u00f1ol' && rows.English.lang === 'es', `menu row, English reader: Espa\u00f1ol, marked lang="es" (${rows.English.text})`);
  const moved = (a, b) => Math.max(Math.abs(a.l - b.l), Math.abs(a.t - b.t), Math.abs(a.r - b.r), Math.abs(a.b - b.b));
  for (const w of HEADER_W) {
    const g = got[w], dt = Math.abs(g.Spanish.tl - g.English.tl);
    // each control on every edge, and the container's own box: a control can move without the container moving
    const same = g.Spanish.kids.length === g.English.kids.length;
    const mv = same ? g.Spanish.kids.map((k, i) => ({ id: k.id, d: moved(k.box, g.English.kids[i].box) })) : [];
    const worst = mv.reduce((a, b) => (b.d > a.d ? b : a), { id: '-', d: 0 }), dbox = moved(g.Spanish.tbox, g.English.tbox);
    check(dt < 1 && same && mv.every(x => x.d < 1) && dbox < 1, `header ${w}: the English swap moves every control in top-actions under 1 px on every edge (most: ${worst.id} ${r1(worst.d)} px; container ${r1(dbox)} px)`);
  }
} catch (e) {
  if (e !== null) { out.push('FAIL the run itself: ' + (e && e.message)); bad.push('run'); }
}
clearTimeout(watchdog);
if (code !== 2) {
  out.push('');
  out.push(bad.length ? 'RESULT FAIL ' + bad.length + ' of ' + out.filter(l => /^(PASS|FAIL) /.test(l)).length + ' checks' : 'RESULT PASS ' + out.filter(l => /^PASS /.test(l)).length + ' of ' + out.filter(l => /^PASS /.test(l)).length + ' checks');
  console.log(out.join('\n'));
}
await cleanup();
process.exit(code || (bad.length ? 1 : 0));
