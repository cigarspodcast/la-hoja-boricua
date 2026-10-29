"""LHB-79: LHB's own client for three AI routes, called directly with keys the Windows user environment holds, never through
the estate gateway. The rules travel with the code (CLAUDE.md, "AI routes"):
- A key is read from the environment at the moment of the call (process environment, then HKCU\\Environment) and is never
  printed, logged, written to a file, returned, or put in an exception message.
- Jev takes data class none only: synthetic text or public site content, never ticket text, code, review notes or anyone's data.
- OpenCode Go is called under https://opencode.ai/zen/go/v1 only, never anything under /inference (metered).
- Together is a fallback only: the caller must say which case applies, 'not-on-go' (the model is not on the Go plan) or
  'go-exhausted' (an OpenCode call was refused because the subscription is used up).
- Every call appends one line to evidence/ai-calls.log: UTC time with Z, route, model, ticket, reason, HTTP status. No key,
  no request or response text.
usage (library): from ai_routes import jev_choice, opencode_chat, together_chat"""
import datetime, json, os, urllib.error, urllib.request

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
LOG = os.path.join(ROOT, 'evidence', 'ai-calls.log')
JEV_URL = 'https://api.typesafe.ai/v1/systemone'
GO_BASE = 'https://opencode.ai/zen/go/v1'
TOGETHER_URL = 'https://api.together.ai/v1/chat/completions'
KEYS = {'jev': 'TYPESAFE_API_KEY', 'opencode-go': 'OPENCODE_GO_API_KEY', 'together': 'TOGETHER_API_KEY'}
TOGETHER_CASES = ('not-on-go', 'go-exhausted')


class RouteError(Exception):
    """a call that did not answer 200: carries the route and the HTTP status (0 for no answer), never a key"""
    def __init__(self, route, status, detail):
        super().__init__('%s answered %s: %s' % (route, status, detail))
        self.route, self.status, self.detail = route, status, detail


def _key(name):
    v = os.environ.get(name)
    if not v and os.name == 'nt':
        try:
            import winreg
            with winreg.OpenKey(winreg.HKEY_CURRENT_USER, 'Environment') as k:
                v = winreg.QueryValueEx(k, name)[0]
        except OSError:
            v = None
    return v or None


def present(route):
    """whether the route's key is set, read by presence only"""
    return _key(KEYS[route]) is not None


def _log(route, model, ticket, reason, status):
    os.makedirs(os.path.dirname(LOG), exist_ok=True)
    t = datetime.datetime.now(datetime.timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')
    clean = lambda s: str(s).replace('\t', ' ').replace('\n', ' ')
    with open(LOG, 'a', encoding='utf-8') as f:
        f.write('\t'.join([t, route, clean(model), clean(ticket), clean(reason), str(status)]) + '\n')


def _post(route, url, body, headers, model, ticket, reason, opener=urllib.request.urlopen):
    if not ticket or not reason:
        raise ValueError('every call names its ticket and its reason')
    key = _key(KEYS[route])
    if key is None:
        _log(route, model, ticket, reason, 'no-key')
        raise RouteError(route, 0, 'key %s is not set' % KEYS[route])
    h = {'Content-Type': 'application/json', 'Authorization': 'Bearer ' + key, 'User-Agent': 'lhb-ai-routes/1'}
    h.update(headers)
    req = urllib.request.Request(url, data=json.dumps(body).encode('utf-8'), headers=h, method='POST')
    status = 0
    try:
        with opener(req, timeout=60) as r:
            status = r.status
            data = json.loads(r.read().decode('utf-8'))
    except urllib.error.HTTPError as e:
        status = e.code
        detail = 'HTTP %d' % e.code
    except (urllib.error.URLError, TimeoutError, OSError, ValueError) as e:
        detail = type(e).__name__
    else:
        _log(route, model, ticket, reason, status)
        return data
    finally:
        key = h = req = None
    _log(route, model, ticket, reason, status)
    raise RouteError(route, status, detail)


def jev_choice(state, instructions, criteria, ticket, reason, model='jev-latest', opener=urllib.request.urlopen):
    """one TypeSafe Jev choice question (docs.typesafe.ai/api); state must be data class none. Returns the answer object."""
    body = {'model': model, 'state': state, 'questions': {'q': {'type': 'choice', 'instructions': instructions, 'criteria': criteria}}}
    return _post('jev', JEV_URL, body, {}, model, ticket, reason, opener)['answers']['q']


def opencode_chat(model, messages, ticket, reason, max_tokens=64, opener=urllib.request.urlopen):
    """one chat completion on the OpenCode Go plan (OpenAI shape). Returns the reply text."""
    data = _post('opencode-go', GO_BASE + '/chat/completions', {'model': model, 'messages': messages, 'max_tokens': max_tokens}, {}, model, ticket, reason, opener)
    return data['choices'][0]['message']['content']


def together_chat(model, messages, ticket, reason, case, max_tokens=64, opener=urllib.request.urlopen):
    """one Together chat completion, ONLY for case 'not-on-go' or 'go-exhausted' (owner ruling ee2ea5c). Returns the reply text."""
    if case not in TOGETHER_CASES:
        raise ValueError('Together is a fallback: case must be one of %s' % (TOGETHER_CASES,))
    data = _post('together', TOGETHER_URL, {'model': model, 'messages': messages, 'max_tokens': max_tokens}, {}, model, ticket, reason + ' [' + case + ']', opener)
    return data['choices'][0]['message']['content']
