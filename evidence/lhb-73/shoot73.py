"""LHB-73 screenshots: About, the menu opened from About, and the intro credits page, at 390 by 844 and 768 by 1024, from the running
build of this branch served by the local mock. Then Ver intro is pressed in a real browser: the intro must open, and the address must end
back on About without intro=1. Last, with reduced motion, About must not offer Ver intro.
usage: python evidence/lhb-73/shoot73.py BASE_URL OUTDIR   (BASE_URL like http://127.0.0.1:8767; needs websocket-client)"""
import base64, json, os, subprocess, sys, tempfile, time, urllib.request
import websocket

BASE, OUT = sys.argv[1].rstrip('/'), sys.argv[2]
os.makedirs(OUT, exist_ok=True)
chrome = r'C:\Program Files\Google\Chrome\Application\chrome.exe'
port = 9335
checks = []


def check(name, ok, detail=''):
    checks.append(bool(ok))
    print('%-58s %s %s' % (name, 'PASS' if ok else 'FAIL', detail), flush=True)


for w, h in ((390, 844), (768, 1024)):
    prof = tempfile.mkdtemp(prefix='lhb73shots-')
    proc = subprocess.Popen([chrome, '--headless=new', '--disable-gpu', '--hide-scrollbars', '--remote-debugging-port=%d' % port, '--user-data-dir=' + prof,
                             '--lang=es-PR', '--autoplay-policy=no-user-gesture-required', 'about:blank'], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
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
                if m.get('method') == 'Runtime.exceptionThrown':
                    d = m['params']['exceptionDetails']
                    seen.append('EXC %s' % (d.get('exception', {}).get('description') or d.get('text'))[:300])

        def js(expr):
            return cdp('Runtime.evaluate', expression=expr, awaitPromise=True, returnByValue=True).get('result', {}).get('value')

        def wait(expr, t=30):
            for _ in range(int(t / .25)):
                if js(expr):
                    return True
                time.sleep(.25)
            return False

        def shot(name, full=False):
            y = js('scrollY') or 0
            hh = max(h, js('document.documentElement.scrollHeight')) if full else h
            png = cdp('Page.captureScreenshot', format='png', captureBeyondViewport=full, clip={'x': 0, 'y': 0 if full else y, 'width': w, 'height': hh, 'scale': 1})['data']
            fn = os.path.join(OUT, '%s-%dx%d.png' % (name, w, h))
            open(fn, 'wb').write(base64.b64decode(png))
            return os.path.basename(fn)

        cdp('Page.enable')
        cdp('Runtime.enable')
        cdp('Page.addScriptToEvaluateOnNewDocument', source="history.scrollRestoration='manual'")
        cdp('Emulation.setDeviceMetricsOverride', width=w, height=h, deviceScaleFactor=1, mobile=w < 768)
        cdp('Emulation.setTouchEmulationEnabled', enabled=w < 768)
        cdp('Page.navigate', url=BASE + '/__mock/seed?to=%23/acerca')
        wait("!!document.querySelector('#view .about-sec')")
        # the intro was seen a minute ago in this session: only Ver intro may bring it back
        js("localStorage.setItem('vb_introAt',String(Date.now()-60e3));sessionStorage.setItem('vb_intro','1')")
        cdp('Page.navigate', url=BASE + '/#/acerca')
        wait("!!document.querySelector('#view .about-sec')")
        time.sleep(.8)
        r = js("(()=>{const a=document.querySelector('[data-intro-replay]');return {intro:!!document.querySelector('.intro'),href:a&&a.getAttribute('href'),text:a&&a.textContent.trim(),cred:!!document.querySelector('#view a[href=\"#/creditos\"]')}})()")
        check('About: Ver intro offered, no intro on a deep link', r and r['href'] == '/?intro=1#/acerca' and r['text'] == 'Ver intro' and not r['intro'] and r['cred'], json.dumps(r, ensure_ascii=False))
        print('  ', shot('acerca'), flush=True)
        js("document.querySelector('[data-sheet=\"menu\"]').click()")
        time.sleep(1.2)
        cur = js("[...document.querySelectorAll('.menu-dest[aria-current=\"page\"]')].map(a=>a.getAttribute('href'))")
        check('menu from About marks About', cur == ['#/acerca'], json.dumps(cur))
        js("document.querySelector('.menu-dest[href=\"#/acerca\"]').scrollIntoView({block:'center'})")
        time.sleep(.3)
        print('  ', shot('menu-acerca'), flush=True)
        js("document.querySelector('.menu-dest[href=\"#/acerca\"]').click()")
        time.sleep(.8)
        js("document.querySelector('#view a[href=\"#/creditos\"]').click()")
        wait("!!document.querySelector('.cred-list')")
        time.sleep(.6)
        c = js("(()=>({items:[...document.querySelectorAll('.cred-item')].map(li=>li.innerText.replace(/\\s+/g,' ').trim()),links:[...document.querySelectorAll('#view a[target=_blank]')].map(a=>a.href),endorse:!!document.querySelector('.cred-endorse')}))()")
        check('credits: two entries with their links', c and len(c['items']) == 2 and len(c['links']) == 5 and c['endorse'], json.dumps(c, ensure_ascii=False))
        print('  ', shot('creditos', full=True), flush=True)
        js("document.querySelector('[data-back]').click()")
        time.sleep(.6)
        check('credits: Volver goes to About', js('location.hash') == '#/acerca', js('location.hash'))
        js("document.querySelector('[data-intro-replay]').click()")
        ok = wait("!!document.querySelector('.intro')", 15)
        time.sleep(.6)
        st = js("({intro:!!document.querySelector('.intro'),url:location.pathname+location.search+location.hash})")
        check('Ver intro: the intro opens and the address is back on About', ok and st['url'] == '/#/acerca', json.dumps(st))
        print('  ', shot('ver-intro'), flush=True)
        # reduced motion: no intro, so no button
        cdp('Emulation.setEmulatedMedia', features=[{'name': 'prefers-reduced-motion', 'value': 'reduce'}])
        cdp('Page.navigate', url=BASE + '/#/catalogo')
        time.sleep(.5)
        cdp('Page.navigate', url=BASE + '/#/acerca')
        wait("!!document.querySelector('#view .about-sec')")
        time.sleep(.6)
        rr = js("({btn:!!document.querySelector('[data-intro-replay]'),note:(document.querySelector('#view .about-sec .hint')||{}).textContent})")
        check('reduced motion: no Ver intro, a note instead', rr and not rr['btn'] and rr['note'], json.dumps(rr, ensure_ascii=False))
        print('  ', shot('acerca-menos-movimiento'), flush=True)
        check('no script errors', not seen, '; '.join(seen))
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
print('RESULT %d of %d checks pass' % (sum(checks), len(checks)))
