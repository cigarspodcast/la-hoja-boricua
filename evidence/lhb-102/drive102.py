"""LHB-102: in a fresh headless Chrome at 390 by 844, store SEED under vb_uploads, open the catalog, then the search, and record for each:
script errors, whether the boot-failure notice shows, how much the view holds and how many cigar cards it lists; then read vb_uploads back
to see that reading did not rewrite it. PASS only with no script error, no notice, both views filled and the stored value unchanged.
usage: python evidence/lhb-102/drive102.py BASE_URL SEED OUTPREFIX   (needs websocket-client)"""
import base64, json, subprocess, sys, tempfile, time, urllib.request
import websocket

BASE, SEED, OUT = sys.argv[1].rstrip('/'), sys.argv[2], sys.argv[3]
chrome = r'C:\Program Files\Google\Chrome\Application\chrome.exe'
port = 9342
prof = tempfile.mkdtemp(prefix='lhb102-')
proc = subprocess.Popen([chrome, '--headless=new', '--disable-gpu', '--hide-scrollbars', '--remote-debugging-port=%d' % port, '--user-data-dir=' + prof,
                         '--lang=es-PR', 'about:blank'], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
print('chrome pid', proc.pid, flush=True)
seen = []
try:
    for _ in range(50):
        try:
            page = [t for t in json.load(urllib.request.urlopen('http://127.0.0.1:%d/json' % port)) if t.get('type') == 'page'][0]
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
                return m.get('result', {})
            if m.get('method') == 'Runtime.exceptionThrown':
                d = m['params']['exceptionDetails']
                seen.append('EXC %s' % (d.get('exception', {}).get('description') or d.get('text'))[:160].split('\n')[0])

    def js(e):
        return cdp('Runtime.evaluate', expression=e, returnByValue=True).get('result', {}).get('value')

    cdp('Page.enable')
    cdp('Runtime.enable')
    cdp('Emulation.setDeviceMetricsOverride', width=390, height=844, deviceScaleFactor=1, mobile=True)
    cdp('Page.navigate', url=BASE + '/manifest.webmanifest')
    time.sleep(1)
    js('localStorage.setItem("vb_uploads",%s);sessionStorage.setItem("vb_splash","1");1' % json.dumps(SEED))
    STATE = ("JSON.stringify({msg:!!document.getElementById('bootFail'),view:((document.getElementById('view')||{}).innerHTML||'').length,"
             "cards:document.querySelectorAll('#view a[href^=\"#/c/\"]').length})")
    res = {}
    for route, wait in (('#/catalogo', 4), ('#/buscar', 3)):
        if route == '#/catalogo':
            cdp('Page.navigate', url=BASE + '/' + route)
        else:
            js('location.hash=%s;1' % json.dumps(route))
        time.sleep(wait)
        st = json.loads(js(STATE) or '{}')
        res[route] = st
        print('  %s %s' % (route, json.dumps(st)), flush=True)
        png = cdp('Page.captureScreenshot', format='png', clip={'x': 0, 'y': 0, 'width': 390, 'height': 844, 'scale': 1})['data']
        fn = '%s-%s-390x844.png' % (OUT, route.strip('#/'))
        open(fn, 'wb').write(base64.b64decode(png))
        print('  shot', fn, flush=True)
    after = js('localStorage.getItem("vb_uploads")')
    print('  stored after: %s (seed %s)' % (json.dumps(after), json.dumps(SEED)), flush=True)
    print('events:', '; '.join(seen) or 'none', flush=True)
    ok = (not seen and all(not v.get('msg') and v.get('view', 0) > 1000 for v in res.values()) and res['#/catalogo'].get('cards', 0) > 0 and after == SEED)
    print('RESULT %s' % ('PASS' if ok else 'FAIL'), flush=True)
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
