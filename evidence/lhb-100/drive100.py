"""LHB-100: open the app once in a fresh headless Chrome at 390 by 844 and record, every half second for 15 s, whether the splash is still
there, whether the boot-failure message shows, and how much the view holds; take a screenshot at 6 s and at 15 s. With EXPECT=fail the
check passes only if the splash is gone and the message shows by 15 s; with EXPECT=ok, only if the splash is gone, the view is filled
and no message shows.
usage: python evidence/lhb-100/drive100.py BASE_URL OUTPREFIX EXPECT   (EXPECT is fail or ok; needs websocket-client)"""
import base64, json, subprocess, sys, tempfile, time, urllib.request
import websocket

BASE, OUT, EXPECT = sys.argv[1].rstrip('/'), sys.argv[2], sys.argv[3]
chrome = r'C:\Program Files\Google\Chrome\Application\chrome.exe'
port = 9341
prof = tempfile.mkdtemp(prefix='lhb100-')
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
                seen.append('EXC %s' % (d.get('exception', {}).get('description') or d.get('text'))[:200].split('\n')[0])
            elif m.get('method') == 'Network.loadingFailed':
                seen.append('NETFAIL %s' % m['params'].get('errorText'))
            elif m.get('method') == 'Network.responseReceived' and m['params']['response'].get('status', 200) >= 400:
                seen.append('HTTP %s %s' % (m['params']['response']['status'], m['params']['response']['url'].split('/')[-1]))

    def js(e):
        return cdp('Runtime.evaluate', expression=e, returnByValue=True).get('result', {}).get('value')

    def shot(name):
        png = cdp('Page.captureScreenshot', format='png', clip={'x': 0, 'y': 0, 'width': 390, 'height': 844, 'scale': 1})['data']
        fn = '%s-%s-390x844.png' % (OUT, name)
        open(fn, 'wb').write(base64.b64decode(png))
        print('  shot', fn, flush=True)

    cdp('Page.enable')
    cdp('Runtime.enable')
    cdp('Network.enable')
    cdp('Emulation.setDeviceMetricsOverride', width=390, height=844, deviceScaleFactor=1, mobile=True)
    cdp('Page.navigate', url=BASE + '/')
    STATE = ("JSON.stringify({splash:!!document.getElementById('splash'),msg:(document.getElementById('bootFail')||{}).textContent||null,"
             "view:((document.getElementById('view')||{}).innerHTML||'').length})")
    last = None
    for i in range(31):
        time.sleep(.5)
        st = json.loads(js(STATE) or '{}')
        if st != last:
            print('  t=%4.1fs %s' % ((i + 1) * .5, json.dumps(st, ensure_ascii=False)), flush=True)
            last = st
        if i == 11:
            shot('6s')
    shot('15s')
    ok = (not last['splash'] and bool(last['msg'])) if EXPECT == 'fail' else (not last['splash'] and not last['msg'] and last['view'] > 1000)
    print('events:', '; '.join(seen) or 'none', flush=True)
    print('RESULT %s (expected %s)' % ('PASS' if ok else 'FAIL', EXPECT), flush=True)
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
