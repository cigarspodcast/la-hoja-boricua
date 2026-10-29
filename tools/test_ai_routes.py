"""LHB-79: tests for tools/ai_routes.py with a fake opener; no network, and a fake key set only in this process.
usage: python -m unittest tools/test_ai_routes.py   (from the repo root)"""
import io, json, os, subprocess, sys, tempfile, unittest, urllib.error

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import ai_routes as A

FAKE = 'sk-FAKE-1234567890-abcd'


class Resp:
    def __init__(self, body, status=200):
        self.status, self._b = status, json.dumps(body).encode('utf-8')

    def read(self):
        return self._b

    def __enter__(self):
        return self

    def __exit__(self, *a):
        return False


class Opener:
    def __init__(self, body=None, error=None):
        self.body, self.error, self.req = body, error, None

    def __call__(self, req, timeout=None):
        self.req = req
        if self.error:
            raise self.error
        return Resp(self.body)


class T(unittest.TestCase):
    def setUp(self):
        self.d = tempfile.mkdtemp()
        A.LOG = os.path.join(self.d, 'ai-calls.log')
        for n in A.KEYS.values():
            os.environ[n] = FAKE
        self._key = A._key
        A._key = lambda n: os.environ.get(n) or None

    def tearDown(self):
        A._key = self._key
        for n in A.KEYS.values():
            os.environ.pop(n, None)

    def log(self):
        with open(A.LOG, encoding='utf-8') as f:
            return f.read()

    def test_jev_body_headers_and_log(self):
        o = Opener({'answers': {'q': {'type': 'choice', 'choice': 'b', 'confidence': .9, 'probabilities': {'a': .1, 'b': .9}}}})
        a = A.jev_choice('texto sintético', '¿Cuál?', {'a': 'uno', 'b': 'dos'}, 'LHB-79', 'proof', opener=o)
        self.assertEqual(a['choice'], 'b')
        self.assertEqual(o.req.full_url, 'https://api.typesafe.ai/v1/systemone')
        body = json.loads(o.req.data)
        self.assertEqual(body['model'], 'jev-latest')
        self.assertEqual(body['questions']['q']['type'], 'choice')
        self.assertEqual(o.req.get_header('Authorization'), 'Bearer ' + FAKE)
        line = self.log().strip().split('\t')
        self.assertTrue(line[0].endswith('Z'))
        self.assertEqual(line[1:], ['jev', 'jev-latest', 'LHB-79', 'proof', '200'])
        self.assertNotIn(FAKE, self.log())

    def test_opencode_never_inference(self):
        o = Opener({'choices': [{'message': {'content': 'hoja'}}]})
        self.assertEqual(A.opencode_chat('glm-5.3-flash', [{'role': 'user', 'content': 'x'}], 'LHB-79', 'proof', opener=o), 'hoja')
        self.assertTrue(o.req.full_url.startswith('https://opencode.ai/zen/go/v1/'))
        self.assertNotIn('/inference', o.req.full_url)
        self.assertEqual(o.req.get_header('X-opencode-session'), A.GO_SESSION, 'Go refuses a call without a session id')
        A.opencode_chat('glm-5.3-flash', [{'role': 'user', 'content': 'x'}], 'LHB-79', 'proof', session='conv-2', opener=o)
        self.assertEqual(o.req.get_header('X-opencode-session'), 'conv-2')

    def test_together_needs_a_case(self):
        o = Opener({'choices': [{'message': {'content': 'tabaco'}}]})
        with self.assertRaises(ValueError):
            A.together_chat('m', [], 'LHB-79', 'proof', case='default', opener=o)
        self.assertIsNone(o.req, 'nothing is sent without a fallback case')
        A.together_chat('m', [{'role': 'user', 'content': 'x'}], 'LHB-79', 'proof', case='not-on-go', opener=o)
        self.assertIn('[not-on-go]', self.log())

    def test_refusal_is_recorded_not_retried_and_hides_the_key(self):
        err = urllib.error.HTTPError('https://api.together.ai', 401, 'Unauthorized', {}, io.BytesIO(b'{"error":"bad key ' + FAKE.encode() + b'"}'))
        calls = []

        def o(req, timeout=None):
            calls.append(req)
            raise err
        with self.assertRaises(A.RouteError) as c:
            A.together_chat('m', [], 'LHB-79', 'proof', case='not-on-go', opener=o)
        self.assertEqual(c.exception.status, 401)
        self.assertEqual(len(calls), 1, 'no retry')
        self.assertNotIn(FAKE, str(c.exception))
        self.assertIn('\t401', self.log())
        self.assertNotIn(FAKE, self.log())

    def test_no_key_no_call(self):
        os.environ.pop('TYPESAFE_API_KEY')
        o = Opener({})
        with self.assertRaises(A.RouteError) as c:
            A.jev_choice('x', 'y', {'a': 'a'}, 'LHB-79', 'proof', opener=o)
        self.assertEqual(c.exception.status, 0)
        self.assertIsNone(o.req)
        self.assertIn('no-key', self.log())

    def test_ticket_and_reason_required(self):
        o = Opener({})
        for t, r in (('', 'proof'), ('LHB-79', ''), ('LHB-79', '   '), (None, 'proof')):
            with self.assertRaises(A.RouteError):
                A.opencode_chat('m', [], t, r, opener=o)
        # Together tags the case onto the reason; an empty reason is still refused, not passed as " [not-on-go]"
        with self.assertRaises(A.RouteError):
            A.together_chat('m', [], 'LHB-79', '', case='not-on-go', opener=o)
        self.assertIsNone(o.req, 'nothing is sent')

    # ---- Codex ronda 1 ----
    def lines(self):
        return self.log().splitlines()

    def test_refusals_before_sending_are_logged_once(self):
        o = Opener({})
        with self.assertRaises(A.RouteError):
            A.opencode_chat('m', [], '', 'proof', opener=o)
        self.assertEqual(len(self.lines()), 1)
        with self.assertRaises(ValueError):
            A.together_chat('m', [], 'LHB-79', 'proof', case='default', opener=o)
        self.assertEqual(len(self.lines()), 2)
        circular = []
        circular.append(circular)
        with self.assertRaises(A.RouteError):
            A._post('jev', A.JEV_URL, {'x': circular}, {}, 'jev-latest', 'LHB-79', 'proof', o)
        self.assertEqual(len(self.lines()), 3)
        # Codex ronda 2: a body nested past the recursion limit is refused and logged like any other bad body
        nested = []
        # 50000 deep: Python 3.14's C encoder passes 1100 and raises RecursionError by 20000 (measured 2026-10-29)
        for _ in range(50000):
            nested = [nested]
        with self.assertRaises(A.RouteError):
            A.opencode_chat('m', nested, 'LHB-79', 'proof', opener=o)
        self.assertEqual(len(self.lines()), 4)
        # and a rejected case is never copied into the log, whatever it holds
        with self.assertRaises(ValueError):
            A.together_chat('m', [], 'LHB-79', 'proof', case=FAKE, opener=o)
        self.assertEqual(len(self.lines()), 5)
        self.assertNotIn(FAKE[:6], self.log())
        self.assertIsNone(o.req)
        self.assertTrue(all(l.split('\t')[5].startswith('refused') for l in self.lines()))

    def test_line_breaks_never_split_a_log_line(self):
        o = Opener({'choices': [{'message': {'content': 'x'}}]})
        A.opencode_chat('m\u2028x', [{'role': 'user', 'content': 'x'}], 'LHB-79', 'reason\rsecond\x85third\u2029fourth\tfifth', opener=o)
        self.assertEqual(len(self.lines()), 1)
        self.assertEqual(len(self.lines()[0].split('\t')), 6)

    def test_provider_error_text_is_never_kept(self):
        esc = ''.join('\\u%04x' % ord(c) for c in FAKE)
        bodies = [
            b'{"error":{"type":"MissingSessionID","message":"bad key ' + FAKE.encode() + b'"}}',
            b'{"error":{"message":"' + b'x' * 292 + FAKE.encode() + b'"}}',
            b'{"error":{"message":"' + esc.encode() + b'"}}',
            b'{"error":{"type":"' + FAKE[2:20].encode() + b'","message":"m"}}',
            b'not json ' + FAKE[-8:].encode(),
        ]
        for i, b in enumerate(bodies):
            err = urllib.error.HTTPError('https://opencode.ai', 400, 'Bad', {}, io.BytesIO(b))
            with self.assertRaises(A.RouteError) as c:
                A.opencode_chat('m', [], 'LHB-79', 'proof', opener=Opener(error=err))
            text = str(c.exception) + c.exception.detail
            for j in range(len(FAKE) - 5):
                self.assertNotIn(FAKE[j:j + 6], text, 'body %d leaks part of the key' % i)
        # the error kind alone is kept, so a refusal still says why
        err = urllib.error.HTTPError('https://opencode.ai', 400, 'Bad', {}, io.BytesIO(bodies[0]))
        with self.assertRaises(A.RouteError) as c:
            A.opencode_chat('m', [], 'LHB-79', 'proof', opener=Opener(error=err))
        self.assertEqual(c.exception.detail, 'HTTP 400 MissingSessionID')
        self.assertNotIn(FAKE[:6], self.log())

    def test_transport_exceptions_are_named_not_quoted_and_logged(self):
        import http.client
        for exc in (http.client.BadStatusLine(FAKE), http.client.IncompleteRead(FAKE.encode()), RuntimeError(FAKE)):
            with self.assertRaises(A.RouteError) as c:
                A.jev_choice('x', 'y', {'a': 'a'}, 'LHB-79', 'proof', opener=Opener(error=exc))
            self.assertNotIn(FAKE, str(c.exception) + c.exception.detail)
            self.assertNotIn(FAKE[:6], str(c.exception))
        self.assertEqual(len(self.lines()), 3, 'one line per call')

    def test_an_answer_that_echoes_the_key_is_dropped(self):
        esc = ''.join('\\u%04x' % ord(c) for c in FAKE)
        for body in ({'choices': [{'message': {'content': FAKE}}]}, None):
            if body is None:
                class R(Resp):
                    def __init__(self):
                        self.status, self._b = 200, ('{"choices":[{"message":{"content":"' + esc + '"}}]}').encode()
                o = lambda req, timeout=None: R()
            else:
                o = Opener(body)
            with self.assertRaises(A.RouteError) as c:
                A.opencode_chat('m', [], 'LHB-79', 'proof', opener=o)
            self.assertEqual(c.exception.status, 'key-echo')
            self.assertNotIn(FAKE, str(c.exception))
        self.assertIn('\tkey-echo', self.log())

    def test_redirects_are_not_followed(self):
        import http.server, threading
        hits = []

        class B(http.server.BaseHTTPRequestHandler):
            def do_POST(self):
                hits.append(self.headers.get('Authorization'))
                self.rfile.read(int(self.headers.get('Content-Length') or 0))
                self.send_response(200)
                self.send_header('Content-Length', '2')
                self.end_headers()
                self.wfile.write(b'{}')
            do_GET = do_POST

            def log_message(self, *a):
                pass
        sb = http.server.HTTPServer(('127.0.0.1', 0), B)

        class R(http.server.BaseHTTPRequestHandler):
            def do_POST(self):
                # read the body before answering: on Windows, closing with unread data resets the connection (the client sees no answer)
                self.rfile.read(int(self.headers.get('Content-Length') or 0))
                self.send_response(302)
                self.send_header('Location', 'http://127.0.0.1:%d/inference/go/v1/chat/completions' % sb.server_port)
                self.send_header('Content-Length', '0')
                self.end_headers()

            def log_message(self, *a):
                pass
        # 302: urllib follows it for a POST (as a GET, still carrying Authorization); 307 it would refuse by itself
        sr = http.server.HTTPServer(('127.0.0.1', 0), R)
        for s in (sb, sr):
            threading.Thread(target=s.handle_request, daemon=True).start()
        try:
            with self.assertRaises(A.RouteError) as c:
                A._post('opencode-go', 'http://127.0.0.1:%d/zen/go/v1/chat/completions' % sr.server_port, {}, {}, 'm', 'LHB-79', 'proof')
            self.assertEqual(c.exception.status, 302)
            self.assertEqual(hits, [], 'the key never reaches the redirect target')
        finally:
            sb.server_close()
            sr.server_close()


class LeakScan(unittest.TestCase):
    """Codex ronda 1: the proof's leak check reads everything the branch adds, and fails instead of looking clean"""
    def setUp(self):
        import ai_proof
        self.P = ai_proof
        self.cwd = os.getcwd()
        self.d = tempfile.mkdtemp()
        os.chdir(self.d)
        g = lambda *a: subprocess.run(['git'] + list(a), check=True, capture_output=True)
        self.g = g
        g('init', '-q')
        g('config', 'user.email', 't@example.invalid')
        g('config', 'user.name', 't')
        with open('.gitignore', 'w') as f:
            f.write('*.log\n')
        g('add', '.gitignore')
        g('commit', '-q', '-m', 'base')
        self.base = subprocess.run(['git', 'rev-parse', 'HEAD'], capture_output=True, text=True).stdout.strip()
        self.log0 = A.LOG

    def tearDown(self):
        os.chdir(self.cwd)
        A.LOG = self.log0

    def test_it_finds_a_key_wherever_the_branch_put_it(self):
        k1, k2, k3, k4 = 'KONE' + 'x' * 20, 'KTWO' + 'y' * 20, 'KTHR' + 'z' * 20, 'KFOU' + 'w' * 20
        with open('cfg.txt', 'w') as f:
            f.write(k1 + '\n')
        self.g('add', 'cfg.txt')
        self.g('commit', '-q', '-m', 'add')
        os.remove('cfg.txt')
        self.g('commit', '-q', '-am', 'remove')
        with open('a b.txt', 'w') as f:
            f.write('- ' + k2 + '\n')
        A.LOG = os.path.join(self.d, 'evidence', 'ai-calls.log')
        os.makedirs(os.path.dirname(A.LOG))
        with open(A.LOG, 'w') as f:
            f.write('@' + k3 + '\n')
        with open('.gitignore', 'a') as f:
            f.write(k4 + '\n')
        # Codex ronda 2: a content line starting with ++ (git shows +++, like a file header) and a binary file, committed and then removed
        k5, k6 = 'KFIV' + 'v' * 20, 'KSIX' + 'u' * 20
        with open('plus.txt', 'w') as f:
            f.write('++' + k5 + '\n')
        with open('blob.bin', 'wb') as f:
            f.write(b'\x00' + k6.encode() + b'\n')
        self.g('add', 'plus.txt', 'blob.bin')
        self.g('commit', '-q', '-m', 'odd shapes')
        os.remove('blob.bin')
        self.g('commit', '-q', '-am', 'drop the binary')
        text, n = self.P.added_text(self.base)
        self.assertIn(k5, text, 'a line that starts with ++')
        self.assertIn(k6, text, 'a binary file, committed and then removed')
        self.assertIn(k1, text, 'committed and then removed')
        self.assertIn(k2, text, 'untracked file with a space in its name, line starting with -')
        self.assertIn(k3, text, 'the call log, ignored by *.log')
        self.assertIn(k4, text, 'an uncommitted change to a tracked file')

    def test_git_failure_is_not_clean(self):
        with self.assertRaises(SystemExit) as c:
            self.P.added_text('no-such-commit')
        self.assertEqual(c.exception.code, 3)


if __name__ == '__main__':
    unittest.main()
