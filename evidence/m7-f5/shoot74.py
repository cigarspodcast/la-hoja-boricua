"""LHB-74 screenshots at 390 by 844: the passport in color and the stamp celebration, from the running build of this branch served by
the local mock (a stand-in signed-in Clerk; there is no test account). Five cigar stamps are put by clicking, so the fifth earns
Catador; the screen is captured during the celebration, then checked again after it (the class is gone), a tap on the celebrating
stamp reaches the stamp (nothing covers it), and with reduced motion a new stamp shows no celebration.
usage: python evidence/m7-f5/shoot74.py BASE_URL OUTDIR   (BASE_URL like http://127.0.0.1:8767; needs websocket-client)"""
import base64, json, os, subprocess, sys, tempfile, time, urllib.request
import websocket

BASE, OUT = sys.argv[1].rstrip('/'), sys.argv[2]
os.makedirs(OUT, exist_ok=True)
chrome = r'C:\Program Files\Google\Chrome\Application\chrome.exe'
port = 9336
w, h = 390, 844
checks = []


def check(name, ok, detail=''):
    checks.append(bool(ok))
    print('%-62s %s %s' % (name, 'PASS' if ok else 'FAIL', detail), flush=True)


prof = tempfile.mkdtemp(prefix='lhb74shots-')
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
        for _ in range(int(t / .2)):
            if js(expr):
                return True
            time.sleep(.2)
        return False

    def shot(name):
        y = js('scrollY') or 0
        png = cdp('Page.captureScreenshot', format='png', clip={'x': 0, 'y': y, 'width': w, 'height': h, 'scale': 1})['data']
        fn = os.path.join(OUT, '%s-%dx%d.png' % (name, w, h))
        open(fn, 'wb').write(base64.b64decode(png))
        return os.path.basename(fn)

    def to(sel, block='start'):
        js("(()=>{const e=document.querySelector('%s');if(e)e.scrollIntoView({block:'%s'});})()" % (sel, block))
        time.sleep(.4)

    cdp('Page.enable')
    cdp('Runtime.enable')
    cdp('Page.addScriptToEvaluateOnNewDocument', source="history.scrollRestoration='manual';try{localStorage.setItem('vb_introAt',String(Date.now()));sessionStorage.setItem('vb_intro','1')}catch(e){}")
    cdp('Emulation.setDeviceMetricsOverride', width=w, height=h, deviceScaleFactor=1, mobile=True)
    cdp('Emulation.setTouchEmulationEnabled', enabled=True)
    cdp('Page.navigate', url=BASE + '/__mock/reset?to=%23/catalogo')
    time.sleep(2)
    cdp('Page.navigate', url=BASE + '/__mock/seed?to=%23/mihoja/pasaporte')
    ok = wait("!!document.querySelector('#view .stamps .stamp')")
    check('the passport opens signed in', ok, js('location.hash'))
    print('  ', shot('pasaporte-portada'), flush=True)
    # the mock's saved Mi Hoja may already carry cigar stamps: bring the count to exactly four, one click at a time, letting each repaint
    CIG = "[...document.querySelectorAll('.stamps .stamp[data-stamp^=\"cigarros:\"]')]"
    print('  cigar stamps already put:', js(CIG + ".filter(b=>b.getAttribute('aria-pressed')==='true').length"), flush=True)
    for _ in range(40):
        on = js(CIG + ".filter(b=>b.getAttribute('aria-pressed')==='true').map(b=>b.dataset.stamp)")
        if len(on) == 4:
            break
        pick = on[-1] if len(on) > 4 else js(CIG + ".find(b=>b.getAttribute('aria-pressed')==='false').dataset.stamp")
        js("document.querySelector('[data-stamp=\"%s\"]').click()" % pick)
        time.sleep(2.6)
    check('four cigar stamps before the fifth', len(js(CIG + ".filter(b=>b.getAttribute('aria-pressed')==='true')")) == 4)
    fifth = js(CIG + ".find(b=>b.getAttribute('aria-pressed')==='false').dataset.stamp")
    cig = [None] * 4 + [fifth]
    # the fifth earns Catador: catch the celebration during its 0.58 s
    # Codex round 2: the passport repaints 350 ms after the tap; the running animation must go on from where it was, not restart.
    # In one page call: tap, wait 470 ms, then read each running lhb-stamp animation's elapsed active time (local time minus its delay)
    run = js("(async()=>{const b=document.querySelector('[data-stamp=\"%s\"]');const t0=performance.now();b.click();await new Promise(r=>setTimeout(r,470));"
             "const now=Math.round(performance.now()-t0);return {now,an:document.getAnimations().filter(a=>a.animationName==='lhb-stamp').map(a=>{const t=a.effect.target,s=t.closest('[data-stamp]'),g=t.closest('[data-badge]');"
             "return {el:s?s.dataset.stamp:(g?g.dataset.badge:t.tagName),ran:Math.round(a.effect.getComputedTiming().localTime-a.effect.getTiming().delay)}})}})()" % cig[4])
    ran = dict((a['el'], a['ran']) for a in (run or {}).get('an', []))
    check('the 350 ms repaint does not restart the stamp (runs from the tap)', run and cig[4] in ran and abs(ran[cig[4]] - run['now']) <= 80, json.dumps(run))
    check('Catador starts when the repaint shows it earned', 'catador' in ran and 0 <= ran['catador'] <= run['now'] - 300, json.dumps(ran))
    got = wait("document.querySelectorAll('.is-new').length>0", 3)
    news = js("[...document.querySelectorAll('.is-new')].map(e=>e.dataset.stamp||e.dataset.badge)")
    check('the fifth stamp and Catador celebrate', got and cig[4] in (news or []) and 'catador' in (news or []), json.dumps(news))
    hit = js("(()=>{const b=document.querySelector('.stamp.is-new');if(!b)return null;b.scrollIntoView({block:'center',behavior:'instant'});const r=b.getBoundingClientRect();const e=document.elementFromPoint(r.left+r.width/2,r.top+r.height/2);"
             "return {ok:!!(e&&b.contains(e)),hit:e?(e.tagName+'.'+String(e.className)).slice(0,60):null,y:Math.round(r.top),still:b.classList.contains('is-new')}})()")
    check('a tap on the celebrating stamp reaches it', hit and hit['ok'] and hit['still'], json.dumps(hit))
    anim = js("(()=>{const b=document.querySelector('.stamp.is-new');return b?getComputedStyle(b,'::after').animationName+' '+getComputedStyle(b,'::after').animationIterationCount:null})()")
    check('it runs lhb-stamp once', anim == 'lhb-stamp 1', str(anim))
    to('.badges', 'center')
    print('  ', shot('celebracion-insignia'), flush=True)
    time.sleep(1.6)
    left = js("document.querySelectorAll('.is-new').length")
    check('after one run the class is gone', left == 0, str(left))
    to('.badges', 'center')
    print('  ', shot('insignias'), flush=True)
    to('.stamps', 'start')
    print('  ', shot('sellos'), flush=True)
    # reduced motion: a new stamp, no celebration
    cdp('Emulation.setEmulatedMedia', features=[{'name': 'prefers-reduced-motion', 'value': 'reduce'}])
    nxt = js("[...document.querySelectorAll('.stamps .stamp[data-stamp^=\"cigarros:\"][aria-pressed=\"false\"]')][0].dataset.stamp")
    js("document.querySelector('[data-stamp=\"%s\"]').click()" % nxt)
    time.sleep(1.0)
    rm = js("({news:document.querySelectorAll('.is-new').length,pressed:document.querySelector('[data-stamp=\"%s\"]').getAttribute('aria-pressed')})" % nxt)
    check('reduced motion: the stamp is put, nothing celebrates', rm and rm['news'] == 0 and rm['pressed'] == 'true', json.dumps(rm))
    to('[data-stamp="%s"]' % nxt, 'center')
    print('  ', shot('menos-movimiento'), flush=True)
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
