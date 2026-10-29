"""LHB-100: one case of the browser proof. Starts failserver.py on a fresh port (failing FAILNAME once, or nothing for 'none'), runs
drive100.py against it, then stops the server by the PID it recorded.
usage: python evidence/lhb-100/runcase.py SITE PORT FAILNAME EXPECT OUTPREFIX"""
import os, subprocess, sys, tempfile, time, urllib.request

SITE, PORT, FAIL, EXPECT, OUT = sys.argv[1:6]
here = os.path.dirname(os.path.abspath(__file__))
pidf = os.path.join(tempfile.mkdtemp(prefix='lhb100srv-'), 'srv.pid')
args = [sys.executable, os.path.join(here, 'failserver.py'), SITE, PORT] + ([] if FAIL == 'none' else [FAIL]) + ['--pidfile', pidf]
log = open(OUT + '-server.log', 'w')
srv = subprocess.Popen(args, stdout=log, stderr=subprocess.STDOUT)
try:
    for _ in range(50):
        try:
            urllib.request.urlopen('http://127.0.0.1:%s/manifest.webmanifest' % PORT)
            break
        except Exception:
            time.sleep(.2)
    print('case: fail %s, expect %s' % (FAIL, EXPECT), flush=True)
    r = subprocess.run([sys.executable, os.path.join(here, 'drive100.py'), 'http://127.0.0.1:%s' % PORT, OUT, EXPECT], capture_output=True, text=True,
                       encoding='utf-8', errors='replace', env=dict(os.environ, PYTHONIOENCODING='utf-8'))
    print(r.stdout, end='', flush=True)
finally:
    pid = int(open(pidf).read())
    subprocess.run(['taskkill', '/PID', str(pid), '/F'], capture_output=True)
    srv.wait(timeout=10)
    print('server pid %d stopped (rc %s)' % (pid, srv.returncode), flush=True)
