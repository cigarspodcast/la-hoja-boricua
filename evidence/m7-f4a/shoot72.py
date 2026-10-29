"""LHB-72 real-browser capture: the intro on a first run (it plays and closes by itself), the skip path, and the paths where it must not
appear (same session, reduced motion, a deep link), in headless Chrome over the DevTools protocol against the local mock of this branch.
Each path uses a fresh browser profile. Prints what the page reports (overlay present, video time, paused, muted, stored date, focus).
usage: python evidence/m7-f4a/shoot72.py BASE_URL OUTDIR   (needs websocket-client)"""
import base64, json, os, subprocess, sys, tempfile, time, urllib.request
import websocket

BASE, OUT = sys.argv[1].rstrip('/'), sys.argv[2]
os.makedirs(OUT, exist_ok=True)
chrome = r'C:\Program Files\Google\Chrome\Application\chrome.exe'
STATE = ("JSON.stringify((()=>{const o=document.querySelector('.intro'),v=o&&o.querySelector('video');return {intro:!!o,src:v&&v.currentSrc.split('/').pop(),"
         "t:v?Math.round(v.currentTime*100)/100:null,paused:v?v.paused:null,muted:v?v.muted:null,ready:v?v.readyState:null,"
         "stored:localStorage.getItem('vb_introAt'),session:sessionStorage.getItem('vb_intro'),why:window.LHB_INTRO&&window.LHB_INTRO.last,"
         "inert:!!(document.getElementById('app')||{}).inert,focus:document.activeElement&&(document.activeElement.className||document.activeElement.id||document.activeElement.tagName),"
         "cards:document.querySelectorAll('#view .grid a').length}})())")
result = {}


def session(name, w, h, url, steps, reduced=False):
    prof = tempfile.mkdtemp(prefix='lhb72-')
    port = 9336
    proc = subprocess.Popen([chrome, '--headless=new', '--disable-gpu', '--hide-scrollbars', '--autoplay-policy=no-user-gesture-required', '--remote-debugging-port=%d' % port,
                             '--user-data-dir=' + prof, '--lang=es-PR', 'about:blank'], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    print('== %s: chrome pid %d' % (name, proc.pid), flush=True)
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
                    if 'error' in m:
                        raise RuntimeError(method + ' ' + json.dumps(m['error']))
                    return m.get('result', {})

        def js(e):
            return cdp('Runtime.evaluate', expression=e, awaitPromise=True, returnByValue=True).get('result', {}).get('value')

        def shot(tag):
            png = cdp('Page.captureScreenshot', format='png', clip={'x': 0, 'y': 0, 'width': w, 'height': h, 'scale': 1})['data']
            fn = '%s-%s-%dx%d.png' % (name, tag, w, h)
            open(os.path.join(OUT, fn), 'wb').write(base64.b64decode(png))
            return fn

        cdp('Page.enable')
        cdp('Emulation.setEmulatedMedia', features=[{'name': 'prefers-reduced-motion', 'value': 'reduce' if reduced else 'no-preference'}])
        cdp('Emulation.setDeviceMetricsOverride', width=w, height=h, deviceScaleFactor=1, mobile=w < 768)
        cdp('Page.navigate', url=url)
        t0 = time.time()
        for at, act in steps:
            time.sleep(max(0, at - (time.time() - t0)))
            if act == 'reload':
                cdp('Page.reload')
                print('  %4.1fs reload' % (time.time() - t0), flush=True)
                continue
            if act.startswith('js:'):
                js(act[3:])
                print('  %4.1fs %s' % (time.time() - t0, act[3:60]), flush=True)
                continue
            s = json.loads(js(STATE) or '{}')
            fn = shot(act)
            result.setdefault(name, []).append((act, round(time.time() - t0, 1), s))
            print('  %4.1fs %-10s %s %s' % (time.time() - t0, act, fn, json.dumps(s)), flush=True)
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
        print('   chrome pid %d exited %s' % (proc.pid, proc.returncode), flush=True)


session('first-run', 390, 844, BASE + '/', [(0.8, 'start'), (3.0, 'middle'), (5.0, 'late'), (10.5, 'after'), (11, 'reload'), (14, 'same-session')])
session('first-run-wide', 1280, 720, BASE + '/', [(1.0, 'start'), (3.5, 'middle')])
session('skip', 390, 844, BASE + '/', [(1.2, 'before-skip'), (1.3, "js:document.querySelector('.intro-skip').click()"), (1.8, 'after-skip')])
session('escape', 390, 844, BASE + '/', [(1.2, 'before-esc'), (1.3, "js:document.querySelector('.intro').dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}))"), (1.8, 'after-esc')])
session('reduced', 390, 844, BASE + '/', [(3.0, 'reduced')], reduced=True)
session('deep-link', 390, 844, BASE + '/#/artesanos', [(3.0, 'deep')])
ok = []
f = dict((a, s) for a, _, s in result.get('first-run', []))
ok.append(('first run: the intro shows and the video plays muted', f.get('start', {}).get('intro') and f.get('middle', {}).get('t', 0) > 0 and f['middle'].get('muted') is True))
ok.append(('first run: it closes by itself, the app is back, the date is stored', not f.get('after', {}).get('intro') and not f['after'].get('inert') and bool(f['after'].get('stored')) and f['after'].get('cards', 0) > 0))
ok.append(('same session: no intro after a reload', not f.get('same-session', {}).get('intro') and f['same-session'].get('why') == 'session'))
wv = dict((a, s) for a, _, s in result.get('first-run-wide', []))
ok.append(('wide screen: the landscape video', (wv.get('middle', {}).get('src') or '').startswith('intro-landscape.mp4')))
sk = dict((a, s) for a, _, s in result.get('skip', []))
ok.append(('skip: Saltar closes it at once and the focus goes to the view', sk.get('before-skip', {}).get('intro') and not sk.get('after-skip', {}).get('intro') and sk['after-skip'].get('focus') in ('view', 'view view')))
es = dict((a, s) for a, _, s in result.get('escape', []))
ok.append(('Escape closes it', es.get('before-esc', {}).get('intro') and not es.get('after-esc', {}).get('intro')))
ok.append(('reduced motion: never shown', result['reduced'][0][2].get('why') == 'reduced' and not result['reduced'][0][2].get('intro')))
ok.append(('deep link: never shown', result['deep-link'][0][2].get('why') == 'deep' and not result['deep-link'][0][2].get('intro')))
for k, v in ok:
    print('%-70s %s' % (k, 'PASS' if v else 'FAIL'))
print('RESULT %d of %d checks pass' % (sum(1 for _, v in ok if v), len(ok)))
