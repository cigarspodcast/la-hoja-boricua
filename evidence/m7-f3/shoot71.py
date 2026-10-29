"""LHB-71 screenshots: the home and the menu at 320 by 568, 390 by 844 and 768 by 1024, viewport only (what a visitor sees without
scrolling), from the running build of this branch served by the local mock (stand-in Clerk and canned /api replies; there is no test
account). For each size: the first visit (full home), a keystroke in the same visit (still the full home), the returning visit (a new page load: compact home), the returning visit after the Cigarros card,
and the menu opened from the catalog and from a cigar page. Prints where the first result sits against the viewport and the tab bar, measured in the page; VISIBLE means at least 48 px of the
first result shows above the tab bar's top edge.
usage: python evidence/m7-f3/shoot71.py BASE_URL OUTDIR [SIZES like 320x568,390x844]   (BASE_URL like http://127.0.0.1:8767; needs websocket-client)"""
import base64, json, os, subprocess, sys, tempfile, time, urllib.request
import websocket

BASE, OUT = sys.argv[1].rstrip('/'), sys.argv[2]
os.makedirs(OUT, exist_ok=True)
SIZES = tuple(tuple(map(int, x.split('x'))) for x in (sys.argv[3].split(',') if len(sys.argv) > 3 else ['320x568', '390x844', '768x1024']))
FIRST = "(()=>{const a=document.querySelector('#view .grid a[href^=\"#/c/\"]');if(!a)return null;const r=a.getBoundingClientRect();const t=document.querySelector('.tabbar');return {top:Math.round(r.top),bottom:Math.round(r.bottom),vh:innerHeight,bar:t?Math.round(t.getBoundingClientRect().top):innerHeight,href:a.getAttribute('href'),active:document.activeElement&&document.activeElement.id||document.activeElement.tagName}})()"

chrome = r'C:\Program Files\Google\Chrome\Application\chrome.exe'
port = 9334
ok = 0
for w, h in SIZES:
    prof = tempfile.mkdtemp(prefix='lhb71shots-')
    proc = subprocess.Popen([chrome, '--headless=new', '--disable-gpu', '--hide-scrollbars', '--remote-debugging-port=%d' % port, '--user-data-dir=' + prof,
                             '--lang=es-PR', 'about:blank'], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    print('chrome pid', proc.pid, 'for', w, 'by', h, flush=True)
    try:
        for _ in range(50):
            try:
                tabs = json.load(urllib.request.urlopen('http://127.0.0.1:%d/json' % port))
                page = [t for t in tabs if t.get('type') == 'page'][0]
                break
            except Exception:
                time.sleep(.2)
        ws = websocket.create_connection(page['webSocketDebuggerUrl'], timeout=60)
        n = [0]
        seen = []

        def cdp(method, **params):
            n[0] += 1
            ws.send(json.dumps({'id': n[0], 'method': method, 'params': params}))
            while True:
                m = json.loads(ws.recv())
                if m.get('id') == n[0]:
                    if 'error' in m:
                        raise RuntimeError(method + ' ' + json.dumps(m['error']))
                    return m.get('result', {})
                ev = m.get('method')
                if ev == 'Runtime.exceptionThrown':
                    d = m['params']['exceptionDetails']
                    seen.append('EXC %s' % (d.get('exception', {}).get('description') or d.get('text'))[:300])
                elif ev == 'Log.entryAdded' and m['params']['entry'].get('level') in ('error', 'warning'):
                    seen.append('LOG %s %s' % (m['params']['entry'].get('level'), m['params']['entry'].get('text', '')[:200]))
                elif ev == 'Page.frameNavigated' and not m['params']['frame'].get('parentId'):
                    seen.append('NAV %s' % m['params']['frame'].get('url'))

        def js(expr):
            return cdp('Runtime.evaluate', expression=expr, awaitPromise=True, returnByValue=True).get('result', {}).get('value')

        def go(url, wait=3.2):
            cdp('Page.navigate', url=url)
            time.sleep(wait)

        def ready(sel="#view .grid a[href^='#/c/']", t=40):
            for _ in range(int(t / .25)):
                if js('!document.getElementById("splash")&&!!document.querySelector("%s")' % sel):
                    return True
                time.sleep(.25)
            print('  TIMEOUT waiting %d s for %s with the splash gone' % (t, sel), flush=True)
            print('  state', js("JSON.stringify({u:location.href,rs:document.readyState,ss:sessionStorage.getItem('vb_splash'),sp:!!document.getElementById('splash'),view:(document.getElementById('view')||{innerHTML:''}).innerHTML.length,ext:typeof EXT,ctl:!!(navigator.serviceWorker&&navigator.serviceWorker.controller),va:typeof window.VBArt,ext2:typeof window.LHB_EXT,scripts:performance.getEntriesByType('resource').filter(e=>e.initiatorType==='script').map(e=>e.name.split('/').pop()+':'+e.responseStatus+':'+e.encodedBodySize+':'+e.transferSize+':'+(e.deliveryType||'-')).join(' ')})"), flush=True)
            print('  events since start:', flush=True)
            for e in seen:
                print('   ', e, flush=True)
            return False

        def reload():
            cdp('Page.reload', ignoreCache=False)
            time.sleep(1)
            ready()
            js('scrollTo(0,0)')
            time.sleep(.6)
            print('  after reload: scrollY', js('scrollY'), flush=True)

        def shot(name):
            y = js('scrollY') or 0
            png = cdp('Page.captureScreenshot', format='png', clip={'x': 0, 'y': y, 'width': w, 'height': h, 'scale': 1})['data']
            fn = os.path.join(OUT, '%s-%dx%d.png' % (name, w, h))
            open(fn, 'wb').write(base64.b64decode(png))
            return os.path.basename(fn)

        cdp('Page.enable')
        cdp('Runtime.enable')
        cdp('Log.enable')
        cdp('Page.addScriptToEvaluateOnNewDocument', source="history.scrollRestoration='manual'")
        cdp('Emulation.setEmulatedMedia', features=[{'name': 'prefers-reduced-motion', 'value': 'reduce'}])
        cdp('Emulation.setDeviceMetricsOverride', width=w, height=h, deviceScaleFactor=1, mobile=w < 768)
        cdp('Emulation.setTouchEmulationEnabled', enabled=w < 768)
        go(BASE + '/__mock/seed?to=%23/catalogo', 4)
        ready()
        js("(()=>{try{for(const k of Object.keys(localStorage))if(/homeSeen/.test(k))localStorage.removeItem(k)}catch(e){}})()")
        reload()
        f = js(FIRST)
        print('first visit   ', shot('inicio-primera'), 'compact', js("!!document.querySelector('.hero.compact')"), 'first result', f, flush=True)
        js("document.getElementById('q').value='x';document.getElementById('q').dispatchEvent(new Event('input',{bubbles:true}))")
        time.sleep(.5)
        print('same visit, after a keystroke: compact', js("!!document.querySelector('.hero.compact')"), flush=True)
        js("document.getElementById('q').value='';document.getElementById('q').dispatchEvent(new Event('input',{bubbles:true}))")
        reload()
        f = js(FIRST)
        vis = bool(f) and f['top'] + 48 <= f['bar']
        ok += vis
        print('returning     ', shot('inicio-vuelve'), 'compact', js("!!document.querySelector('.hero.compact')"), 'first result', f, 'VISIBLE' if vis else 'NOT VISIBLE', flush=True)
        js("document.querySelector('[data-catalog-start]').click()")
        time.sleep(1)
        print('Cigarros card ', shot('inicio-cigarros'), 'first result', js(FIRST), flush=True)
        js("scrollTo(0,0)")
        js("document.querySelector('[data-sheet=\"menu\"]').click()")
        time.sleep(1.2)
        print('menu          ', shot('menu-catalogo'), 'current', js("[...document.querySelectorAll('.menu-dest[aria-current=\"page\"]')].map(a=>a.getAttribute('href'))"), flush=True)
        cigar = js("(document.querySelector('#view .grid a[href^=\"#/c/\"]')||{}).getAttribute&&document.querySelector('#view .grid a[href^=\"#/c/\"]').getAttribute('href')")
        go(BASE + '/' + (cigar or '#/catalogo'), 1)
        ready('#view .back')
        time.sleep(.5)
        js("document.querySelector('[data-sheet=\"menu\"]').click()")
        time.sleep(1.2)
        print('menu (cigar)  ', shot('menu-cigarro'), cigar, 'current', js("[...document.querySelectorAll('.menu-dest[aria-current=\"page\"]')].map(a=>a.getAttribute('href'))"), flush=True)
        try:
            cdp('Browser.close')
        except Exception:
            pass
    finally:
        try:
            proc.wait(timeout=10)
        except Exception:
            proc.terminate()
            proc.wait(timeout=10)
        print('chrome pid %d exited %s' % (proc.pid, proc.returncode), flush=True)
print('RESULT first result visible on the returning home at %d of %d sizes' % (ok, len(SIZES)))
