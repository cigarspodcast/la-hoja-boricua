"""LHB-67 screenshots: every app screen at 320, 390 and 768 px wide, full page, from the running build of this branch served by the
local mock (stand-in Clerk and canned /api replies; there is no test account). Drives headless Chrome over the DevTools protocol
so a narrow viewport is emulated exactly (a plain --window-size crops below about 500 px).
usage: python evidence/m7-f1b/shoot67.py BASE_URL OUTDIR   (BASE_URL like http://127.0.0.1:8767; needs websocket-client)"""
import base64, json, os, subprocess, sys, tempfile, time, urllib.request
import websocket

BASE, OUT = sys.argv[1].rstrip('/'), sys.argv[2]
os.makedirs(OUT, exist_ok=True)
SCREENS = [
    ('inicio', '/#/'), ('catalogo', '/#/catalogo'), ('cigarro', '@cigar'), ('artesanos', '/#/artesanos'), ('lugares', '/#/lugares'),
    ('ruta', '/#/lugares/ruta'), ('eventos', '/#/eventos'), ('buscar', '/#/buscar'), ('cata', '/#/cata'), ('maridajes', '/#/maridajes'),
    ('podcast', '/#/podcast'), ('perfil', '/#/mihoja/perfil'), ('editar-perfil', '/#/mihoja/editar'), ('personas', '@people'),
    ('siguiendo-feed', '/#/mihoja/siguiendo'), ('humidor-sync', '/#/mihoja/humidor'), ('pasaporte-insignias', '/#/mihoja/pasaporte'),
    ('diario', '/#/mihoja/diario'), ('perfil-ajeno-siguiendo', '/#/u/carlos_humo'), ('perfil-ajeno-seguir', '/#/u/manu_rosa'),
    ('seguidores', '/#/u/ana/seguidores'), ('pasaporte-publico', '/u/carlos_humo'),
]
WIDTHS = (320, 390, 768)

chrome = r'C:\Program Files\Google\Chrome\Application\chrome.exe'
prof = tempfile.mkdtemp(prefix='lhb67shots-')
port = 9333
proc = subprocess.Popen([chrome, '--headless=new', '--disable-gpu', '--hide-scrollbars', '--remote-debugging-port=%d' % port, '--user-data-dir=' + prof,
                         '--lang=es-PR', 'about:blank'], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
print('chrome pid', proc.pid, flush=True)
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

    def cdp(method, **params):
        n[0] += 1
        ws.send(json.dumps({'id': n[0], 'method': method, 'params': params}))
        while True:
            m = json.loads(ws.recv())
            if m.get('id') == n[0]:
                if 'error' in m:
                    raise RuntimeError(method + ' ' + json.dumps(m['error']))
                return m.get('result', {})

    def js(expr):
        return cdp('Runtime.evaluate', expression=expr, awaitPromise=True, returnByValue=True).get('result', {}).get('value')

    def go(url, wait=3.2):
        cdp('Page.navigate', url=url)
        time.sleep(wait)

    cdp('Page.enable')
    cdp('Emulation.setEmulatedMedia', features=[{'name': 'prefers-reduced-motion', 'value': 'reduce'}])
    go(BASE + '/__mock/seed?to=%23/mihoja/perfil', 4)
    go(BASE + '/#/catalogo')
    cigar = js("(document.querySelector('a[href^=\"#/c/\"]')||{}).getAttribute&&document.querySelector('a[href^=\"#/c/\"]').getAttribute('href')") or '#/catalogo'
    print('cigar route', cigar, flush=True)
    shots = 0
    for w in WIDTHS:
        cdp('Emulation.setDeviceMetricsOverride', width=w, height=844, deviceScaleFactor=1, mobile=w < 768)
        cdp('Emulation.setTouchEmulationEnabled', enabled=w < 768)
        for name, url in SCREENS:
            if url == '@cigar':
                go(BASE + '/' + cigar)
            elif url == '@people':
                go(BASE + '/#/mihoja/personas', 2.5)
                js("(()=>{const i=document.querySelector('#view input[type=search],#view input');if(!i)return 'no input';i.focus();i.value='ma';i.dispatchEvent(new Event('input',{bubbles:true}));return 'ok'})()")
                time.sleep(2.5)
            else:
                go(BASE + url)
            h = int(js('Math.max(document.documentElement.scrollHeight,document.body?document.body.scrollHeight:0)') or 844)
            h = max(844, min(h, 12000))
            png = cdp('Page.captureScreenshot', format='png', captureBeyondViewport=True, clip={'x': 0, 'y': 0, 'width': w, 'height': h, 'scale': 1})['data']
            fn = os.path.join(OUT, '%s-%d.png' % (name, w))
            open(fn, 'wb').write(base64.b64decode(png))
            shots += 1
            print('%-26s %4d px  %5d px tall  %s' % (name, w, h, os.path.basename(fn)), flush=True)
    print('RESULT %d screenshots, %d screens at %s px' % (shots, len(SCREENS), ', '.join(map(str, WIDTHS))))
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
    print('chrome pid %d exited %s' % (proc.pid, proc.returncode))
