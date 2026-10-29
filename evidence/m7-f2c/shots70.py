"""LHB-70: screenshots for the owner. Serves site/ on PORT (evidence/lhb-100/failserver.py, failing nothing), takes a headless
Chrome screenshot of the app at 390 by 844 and crops the header, copies the install icons and the share image beside it, then
stops the server by the PID it recorded.
usage: python evidence/m7-f2c/shots70.py WORKTREE PORT"""
import os, shutil, subprocess, sys, tempfile, time, urllib.request
from PIL import Image

WT, PORT = sys.argv[1], sys.argv[2]
OUT = os.path.join(WT, 'evidence', 'm7-f2c')
chrome = r'C:\Program Files\Google\Chrome\Application\chrome.exe'
pidf = os.path.join(tempfile.mkdtemp(prefix='lhb70srv-'), 'srv.pid')
srv = subprocess.Popen([sys.executable, os.path.join(WT, 'evidence', 'lhb-100', 'failserver.py'), os.path.join(WT, 'site'), PORT, '--pidfile', pidf],
                       stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
try:
    for _ in range(50):
        try:
            urllib.request.urlopen('http://127.0.0.1:%s/manifest.webmanifest' % PORT)
            break
        except Exception:
            time.sleep(.2)
    full = os.path.join(OUT, 'app-390x844.png')
    prof = tempfile.mkdtemp(prefix='lhb70-')
    subprocess.run([chrome, '--headless=new', '--disable-gpu', '--hide-scrollbars', '--user-data-dir=' + prof, '--window-size=390,844', '--force-prefers-reduced-motion',
                    '--virtual-time-budget=6000', '--screenshot=' + full, 'http://127.0.0.1:%s/#/catalogo' % PORT], capture_output=True, timeout=90)
    im = Image.open(full)
    im.crop((0, 0, 390, 110)).resize((780, 220)).save(os.path.join(OUT, 'header-390.png'))
    print('app', im.size, '-> header-390.png')
    for f in ('icon-512.png', 'icon-maskable-512.png', 'apple-touch-icon.png', 'favicon-32.png', 'favicon-16.png'):
        shutil.copy(os.path.join(WT, 'site', 'icons', f), os.path.join(OUT, 'install-' + f))
    shutil.copy(os.path.join(WT, 'site', 'og.jpg'), os.path.join(OUT, 'share-og.jpg'))
    print('copied icons and share image')
finally:
    pid = int(open(pidf).read())
    subprocess.run(['taskkill', '/PID', str(pid), '/F'], capture_output=True)
    srv.wait(timeout=10)
    print('server pid %d stopped' % pid)
