"""LHB-102: the browser proof for one site folder. Starts evidence/lhb-100/failserver.py on PORT (failing nothing), runs drive102.py once per
seed with a fresh Chrome profile, then stops the server by the PID it recorded.
usage: python evidence/lhb-102/run102.py SITE PORT OUTPREFIX"""
import os, subprocess, sys, tempfile, time, urllib.request

SITE, PORT, OUT = sys.argv[1:4]
here = os.path.dirname(os.path.abspath(__file__))
srvpy = os.path.join(here, '..', 'lhb-100', 'failserver.py')
pidf = os.path.join(tempfile.mkdtemp(prefix='lhb102srv-'), 'srv.pid')
log = open(OUT + '-server.log', 'w')
srv = subprocess.Popen([sys.executable, srvpy, SITE, PORT, '--pidfile', pidf], stdout=log, stderr=subprocess.STDOUT)
SEEDS = ['{}', '"x"', 'null', '[1,"a",null,{"id":"u1","nombre":"Al Alba","capa":"Maduro"}]']
try:
    for _ in range(50):
        try:
            urllib.request.urlopen('http://127.0.0.1:%s/manifest.webmanifest' % PORT)
            break
        except Exception:
            time.sleep(.2)
    for i, seed in enumerate(SEEDS):
        print('case: vb_uploads = %s' % seed, flush=True)
        r = subprocess.run([sys.executable, os.path.join(here, 'drive102.py'), 'http://127.0.0.1:%s' % PORT, seed, '%s-seed%d' % (OUT, i)], capture_output=True,
                           text=True, encoding='utf-8', errors='replace', env=dict(os.environ, PYTHONIOENCODING='utf-8'))
        print(r.stdout, end='', flush=True)
        if r.returncode:
            print('driver rc %d %s' % (r.returncode, r.stderr[-300:]), flush=True)
finally:
    pid = int(open(pidf).read())
    subprocess.run(['taskkill', '/PID', str(pid), '/F'], capture_output=True)
    srv.wait(timeout=10)
    print('server pid %d stopped (rc %s)' % (pid, srv.returncode), flush=True)
