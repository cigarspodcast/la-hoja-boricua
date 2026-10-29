"""LHB-100: a local static server for site/ that answers 500 to the FIRST request for one named file (a script that fails to load once,
as on a weak network), and serves everything else normally. Logs each request with its status.
usage: python evidence/lhb-100/failserver.py SITE PORT [FAILNAME] --pidfile FILE"""
import http.server, os, socketserver, sys, threading

SITE, PORT = sys.argv[1], int(sys.argv[2])
FAIL = sys.argv[3] if len(sys.argv) > 3 and not sys.argv[3].startswith('--') else None
if '--pidfile' in sys.argv:
    open(sys.argv[sys.argv.index('--pidfile') + 1], 'w').write(str(os.getpid()))
lock = threading.Lock()
failed = [False]


class H(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *a, **k):
        super().__init__(*a, directory=SITE, **k)

    def do_GET(self):
        name = self.path.split('?')[0].lstrip('/')
        with lock:
            hit = FAIL and name == FAIL and not failed[0]
            if hit:
                failed[0] = True
        if hit:
            self.send_response(500)
            self.send_header('Content-Length', '0')
            self.end_headers()
            print('FAILED once:', self.path, flush=True)
            return
        return super().do_GET()

    def log_message(self, fmt, *args):
        print('%s %s' % (self.requestline, args[1] if len(args) > 1 else ''), flush=True)


class S(socketserver.ThreadingMixIn, http.server.HTTPServer):
    daemon_threads = True
    request_queue_size = 128


print('serving', SITE, 'on', PORT, 'failing once:', FAIL, flush=True)
S(('127.0.0.1', PORT), H).serve_forever()
