"""LHB-79: LHB's own client for three AI routes, called directly with keys the Windows user environment holds, never through
the estate gateway. The rules travel with the code (CLAUDE.md, "AI routes"):
- A key is read from the environment at the moment of the call (process environment, then HKCU\\Environment) and is never
  printed, logged, written to a file, returned, or put in an exception message.
- Jev takes data class none only: synthetic text or public site content, never ticket text, code, review notes or anyone's data.
- OpenCode Go is called under https://opencode.ai/zen/go/v1 only, never anything under /inference (metered).
- Together is a fallback only: the caller must say which case applies, 'not-on-go' (the model is not on the Go plan) or
  'go-exhausted' (an OpenCode call was refused because the subscription is used up).
- Every call appends one line to evidence/ai-calls.log: UTC time with Z, route, model, ticket, reason, HTTP status. No key,
  no request or response text. A call refused before it is sent is logged too, with why in the status field.
usage (library): from ai_routes import jev_choice, opencode_chat, together_chat"""
import datetime, json, os, re, urllib.error, urllib.request, uuid

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
LOG = os.path.join(ROOT, 'evidence', 'ai-calls.log')
JEV_URL = 'https://api.typesafe.ai/v1/systemone'
GO_BASE = 'https://opencode.ai/zen/go/v1'
TOGETHER_URL = 'https://api.together.ai/v1/chat/completions'
KEYS = {'jev': 'TYPESAFE_API_KEY', 'opencode-go': 'OPENCODE_GO_API_KEY', 'together': 'TOGETHER_API_KEY'}
TOGETHER_CASES = ('not-on-go', 'go-exhausted')
# OpenCode Go refuses a request without x-opencode-session (400 MissingSessionID); its docs ask for a stable id per
# conversation, so one process is one conversation unless the caller passes its own
GO_SESSION = 'lhb-' + uuid.uuid4().hex
# the provider's error kind ("MissingSessionID", "invalid_request_error"), the only provider text a refusal keeps: its free-text
# message can echo a key in any encoding or cut, so it is never kept (Codex ronda 1)
KIND = re.compile(r'[A-Za-z][A-Za-z0-9_.\-]{0,39}')


class RouteError(Exception):
    """a call that did not answer 200: carries the route and the HTTP status (0 for no answer), never a key"""
    def __init__(self, route, status, detail):
        super().__init__('%s answered %s: %s' % (route, status, detail))
        self.route, self.status, self.detail = route, status, detail


class _NoRedirect(urllib.request.HTTPRedirectHandler):
    # a redirect would carry the Authorization header to a URL the client never chose (a /inference path, another host):
    # none is followed, and the 3xx comes back as a refusal
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


_open = urllib.request.build_opener(_NoRedirect).open


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


# every line break Python's str.splitlines knows, and the tab that separates the fields
_BREAKS = re.compile('[\t\n\r\v\f\x1c\x1d\x1e\x85\u2028\u2029]')


def _log(route, model, ticket, reason, status):
    os.makedirs(os.path.dirname(LOG), exist_ok=True)
    t = datetime.datetime.now(datetime.timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')
    clean = lambda s: _BREAKS.sub(' ', str(s))
    with open(LOG, 'a', encoding='utf-8') as f:
        f.write('\t'.join([t, route, clean(model), clean(ticket), clean(reason), clean(status)]) + '\n')


def _kind(raw, key):
    """the provider's error kind from a JSON error body, or '' (never the message, never anything holding part of the key)"""
    try:
        e = json.loads(raw)
        e = e.get('error', e) if isinstance(e, dict) else {}
        e = e if isinstance(e, dict) else {}
    except ValueError:
        return ''
    for f in ('type', 'code'):
        v = e.get(f)
        if isinstance(v, str) and KIND.fullmatch(v) and not any(key[i:i + 6] in v for i in range(max(1, len(key) - 5))):
            return v
    return ''


def _refuse(route, model, ticket, reason, why):
    _log(route, model, ticket, reason, why)
    return RouteError(route, 0, why)


def _post(route, url, body, headers, model, ticket, reason, opener=None):
    opener = opener or _open
    if not isinstance(ticket, str) or not ticket.strip() or not isinstance(reason, str) or not reason.strip():
        raise _refuse(route, model, ticket, reason, 'refused: every call names its ticket and its reason')
    try:
        payload = json.dumps(body).encode('utf-8')
    except Exception:
        # TypeError, ValueError, and a RecursionError from a body nested too deep (Codex ronda 2): all refused and logged the same way
        raise _refuse(route, model, ticket, reason, 'refused: body is not JSON')
    key = _key(KEYS[route])
    if key is None:
        raise _refuse(route, model, ticket, reason, 'no-key')
    h = {'Content-Type': 'application/json', 'Authorization': 'Bearer ' + key, 'User-Agent': 'lhb-ai-routes/1'}
    h.update(headers)
    req = urllib.request.Request(url, data=payload, headers=h, method='POST')
    status, detail, data = 0, '', None
    try:
        try:
            with opener(req, timeout=60) as r:
                status = r.status
                raw = r.read().decode('utf-8', 'replace')
            data = json.loads(raw)
            # a provider that echoes the key in an answer does not get it returned or printed (Codex ronda 1), in any JSON encoding
            if key in raw or key in json.dumps(data, ensure_ascii=False):
                status, detail, data = 'key-echo', 'the answer contained the key; dropped', None
        except urllib.error.HTTPError as e:
            status = e.code
            try:
                kind = _kind(e.read().decode('utf-8', 'replace'), key)
            except Exception:
                kind = ''
            detail = ('HTTP %d %s' % (e.code, kind)).strip()
        except Exception as e:
            # any other failure (no answer, a malformed answer, http.client errors): its name only, never its text, which can hold what the server sent
            status, detail, data = 0, type(e).__name__, None
    finally:
        key = h = req = None
    _log(route, model, ticket, reason, status)
    if data is None:
        raise RouteError(route, status, detail or 'no answer')
    return data


def jev_choice(state, instructions, criteria, ticket, reason, model='jev-latest', opener=None):
    """one TypeSafe Jev choice question (docs.typesafe.ai/api); state must be data class none. Returns the answer object."""
    body = {'model': model, 'state': state, 'questions': {'q': {'type': 'choice', 'instructions': instructions, 'criteria': criteria}}}
    return _post('jev', JEV_URL, body, {}, model, ticket, reason, opener)['answers']['q']


def opencode_chat(model, messages, ticket, reason, max_tokens=64, session=None, opener=None):
    """one chat completion on the OpenCode Go plan (OpenAI shape). Returns the reply text."""
    data = _post('opencode-go', GO_BASE + '/chat/completions', {'model': model, 'messages': messages, 'max_tokens': max_tokens},
                 {'x-opencode-session': session or GO_SESSION}, model, ticket, reason, opener)
    return data['choices'][0]['message']['content']


def together_chat(model, messages, ticket, reason, case, max_tokens=64, opener=None):
    """one Together chat completion, ONLY for case 'not-on-go' or 'go-exhausted' (owner ruling ee2ea5c). Returns the reply text."""
    if case not in TOGETHER_CASES:
        # a fixed status: the rejected value is the caller's text and never goes into the log (Codex ronda 2)
        _log('together', model, ticket, reason, 'refused: not a fallback case')
        raise ValueError('Together is a fallback: case must be one of %s' % (TOGETHER_CASES,))
    # the case goes into the logged reason, but only onto a real reason: an empty one is still refused by _post
    tagged = reason + ' [' + case + ']' if isinstance(reason, str) and reason.strip() else reason
    data = _post('together', TOGETHER_URL, {'model': model, 'messages': messages, 'max_tokens': max_tokens}, {}, model, ticket, tagged, opener)
    return data['choices'][0]['message']['content']
