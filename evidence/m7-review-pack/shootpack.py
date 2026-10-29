"""LHB-75 review pack: screenshots of the facelift at 320 by 568, 390 by 844 and 768 by 1024 (viewport only, what a visitor sees
without scrolling), from the running build of this branch served by the local mock (a stand-in signed-in Clerk and canned /api
replies; there is no test account). Screens: the intro on a first run, home, menu, a cigar page, the lounges list (the app has
no page of its own per lounge) and a lounge's static page, a maker page, the passport, the profile, another person's profile,
People search, About and the intro credits. Writes manifest.json beside the
shots: one row per file with its screen, size, the hash it was taken on and the check that the screen was the intended one.
usage: python evidence/m7-review-pack/shootpack.py BASE_URL OUTDIR   (BASE_URL like http://127.0.0.1:8767; needs websocket-client)"""
import base64, hashlib, json, os, subprocess, sys, tempfile, time, urllib.request
import websocket

BASE, OUT = sys.argv[1].rstrip('/'), sys.argv[2]
SHOTS = os.path.join(OUT, 'shots')
os.makedirs(SHOTS, exist_ok=True)
SIZES = ((320, 568), (390, 844), (768, 1024))
chrome = r'C:\Program Files\Google\Chrome\Application\chrome.exe'
port = 9338
rows, errors = [], []
LUGAR = 'casa-de-montecristo-vsj'  # a lounge with a static page in site/lugares/


def first_href(prefix):
    return "(()=>{const a=document.querySelector('#view a[href^=\"%s\"]');return a?a.getAttribute('href'):null})()" % prefix


for w, h in SIZES:
    prof = tempfile.mkdtemp(prefix='lhb75pack-')
    proc = subprocess.Popen([chrome, '--headless=new', '--disable-gpu', '--hide-scrollbars', '--autoplay-policy=no-user-gesture-required',
                             '--remote-debugging-port=%d' % port, '--user-data-dir=' + prof, '--lang=es-PR', 'about:blank'],
                            stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    print('chrome pid', proc.pid, 'for', w, 'by', h, flush=True)
    try:
        for _ in range(50):
            try:
                page = [t for t in json.load(urllib.request.urlopen('http://127.0.0.1:%d/json' % port)) if t.get('type') == 'page'][0]
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

        def shot(name, check, ok):
            js('scrollTo(0,0)')
            time.sleep(.5)
            png = base64.b64decode(cdp('Page.captureScreenshot', format='png', clip={'x': 0, 'y': 0, 'width': w, 'height': h, 'scale': 1})['data'])
            fn = '%s-%dx%d.png' % (name, w, h)
            open(os.path.join(SHOTS, fn), 'wb').write(png)
            row = {'file': 'shots/' + fn, 'screen': name, 'width': w, 'height': h, 'hash': js('location.hash'), 'check': check, 'ok': bool(ok),
                   'bytes': len(png), 'sha256': hashlib.sha256(png).hexdigest()}
            rows.append(row)
            print('  %-34s %s %s' % (fn, 'OK ' if ok else 'BAD', check), flush=True)

        def route(hash_, sel, t=20):
            cdp('Page.navigate', url=BASE + '/' + hash_)
            return wait("!document.getElementById('splash')&&!!document.querySelector(\"%s\")" % sel, t)

        cdp('Page.enable')
        cdp('Runtime.enable')
        cdp('Emulation.setDeviceMetricsOverride', width=w, height=h, deviceScaleFactor=1, mobile=w < 768)
        cdp('Emulation.setTouchEmulationEnabled', enabled=w < 768)
        # 1. the intro on a first run: a fresh profile, the bare address first (any earlier load would count as the first visit)
        cdp('Page.navigate', url=BASE + '/')
        got = wait("!!document.querySelector('.intro video')&&document.querySelector('.intro video').currentTime>1.5", 15)
        if not got:
            print('  intro state', js("JSON.stringify({o:!!document.querySelector('.intro'),why:window.LHB_INTRO&&window.LHB_INTRO.last,t:(document.querySelector('.intro video')||{}).currentTime})"), flush=True)
        shot('intro', 'the intro overlay is open and its video has played past 1.5 s', got)
        js("(()=>{const s=document.querySelector('.intro-skip');if(s)s.click()})()")
        time.sleep(1)
        cdp('Page.navigate', url=BASE + '/__mock/reset?to=%23/catalogo')
        time.sleep(2)
        # from here on, no intro: a returning visitor, signed in through the mock
        cdp('Page.addScriptToEvaluateOnNewDocument', source="history.scrollRestoration='manual';try{localStorage.setItem('vb_introAt',String(Date.now()));sessionStorage.setItem('vb_intro','1')}catch(e){}")
        cdp('Page.navigate', url=BASE + '/__mock/seed?to=%23/catalogo')
        got = wait("!document.getElementById('splash')&&!!document.querySelector(\"#view a[href^='#/c/']\")", 30)
        shot('inicio', 'home shows the catalog with cigar cards', got)
        js("document.querySelector('[data-sheet=\"menu\"]').click()")
        got = wait("!!document.querySelector('.menu-dest')", 5)
        time.sleep(.8)
        shot('menu', 'the menu sheet is open with its destinations', got)
        js("document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}))")
        cigar = js(first_href('#/c/'))
        got = route(cigar or '#/catalogo', '#view .back')
        shot('cigarro', 'a cigar page (%s)' % cigar, got and cigar)
        # lounges: the app shows them as a map or a list (no page of its own per lounge); each lounge has its static page
        route('#/lugares', "#view [data-mode='lista']")
        js("document.querySelector(\"#view [data-mode='lista']\").click()")
        got = wait("!!document.querySelector('#view .list .row')", 5)
        shot('lugares', 'the lounges list in the app', got)
        cdp('Page.navigate', url=BASE + '/lugares/' + LUGAR)
        got = wait("document.readyState==='complete'&&!!document.querySelector('h1')", 15)
        shot('lugar', 'a lounge page (/lugares/%s)' % LUGAR, got and LUGAR in js('location.pathname'))
        route('#/artesanos', "#view a[href^='#/a/']")
        maker = js(first_href('#/a/'))
        got = route(maker or '#/artesanos', '#view .back')
        shot('artesano', 'a maker page (%s)' % maker, got and maker)
        got = route('#/mihoja/pasaporte', '#view .stamps .stamp')
        shot('pasaporte', 'the passport with its stamps', got)
        got = route('#/perfil', '#view h1, #view h2')
        shot('perfil', 'the signed-in profile', got and js("location.hash")=='#/perfil')
        got = route('#/u/carlos_humo', '#view h1, #view h2')
        shot('persona', "another person's profile (carlos_humo)", got and js("location.hash")=='#/u/carlos_humo')
        got = route('#/mihoja/personas', '#view input')
        shot('personas', 'People search', got)
        got = route('#/acerca', '#view [data-intro-replay], #view .about-sec')
        shot('acerca', 'About', got)
        got = route('#/creditos', '#view [data-credit]')
        shot('creditos', 'the intro credits', got)
        if seen:
            errors.extend('%dx%d %s' % (w, h, s) for s in seen)
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

json.dump({'sizes': ['%dx%d' % s for s in SIZES], 'shots': rows, 'script_errors': errors}, open(os.path.join(OUT, 'manifest.json'), 'w'), indent=1)
print('script errors:', len(errors))
for e in errors:
    print('  ', e)
print('RESULT %d of %d shots OK, %d files in the manifest' % (sum(r['ok'] for r in rows), len(rows), len(rows)))
