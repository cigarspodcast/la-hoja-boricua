"""LHB-79: tests for tools/ai_routes.py with a fake opener; no network, and a fake key set only in this process.
usage: python -m unittest tools/test_ai_routes.py   (from the repo root)"""
import io, json, os, sys, tempfile, unittest, urllib.error

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
        return open(A.LOG, encoding='utf-8').read()

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
        with self.assertRaises(ValueError):
            A.opencode_chat('m', [], '', 'proof', opener=Opener({}))
        with self.assertRaises(ValueError):
            A.opencode_chat('m', [], 'LHB-79', '', opener=Opener({}))


if __name__ == '__main__':
    unittest.main()
