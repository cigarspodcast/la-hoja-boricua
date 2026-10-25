"""Compare sha256 of every tracked file under site/ at HEAD with the live copy on a host.
Usage: python -I verify_live.py <repo> <base-url>"""
import hashlib, re, subprocess, sys, urllib.request, urllib.error
BEACON = re.compile(rb'<script [^>]*static\.cloudflareinsights\.com/beacon\.min\.js[^>]*></script>\n?')
stripped = 0

repo, base = sys.argv[1], sys.argv[2].rstrip('/')
files = subprocess.run(['git', '-C', repo, 'ls-files', 'site'], capture_output=True, text=True, check=True).stdout.split()
ok = bad = 0
for f in files:
    rel = f[len('site/'):]
    want = hashlib.sha256(subprocess.run(['git', '-C', repo, 'show', f'HEAD:{f}'], capture_output=True, check=True).stdout).hexdigest()
    path = rel
    if path.endswith('index.html'):
        path = path[:-len('index.html')]
    elif path.endswith('.html'):
        path = path[:-len('.html')]
    url = f'{base}/{path}'
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'curl/8.0 lhb-verify', 'Cache-Control': 'no-cache'})
        with urllib.request.urlopen(req, timeout=30) as r:
            body, n = BEACON.subn(b'', r.read())
            stripped += n
            got = hashlib.sha256(body).hexdigest()
            status = r.status
    except urllib.error.HTTPError as e:
        got, status = 'HTTPERROR', e.code
    if got == want:
        ok += 1
    else:
        bad += 1
        print(f'MISMATCH {status} {url}')
print(f'basis: tracked files under site/ at HEAD; matched {ok} of {len(files)}, mismatched {bad}; Web Analytics beacon elements stripped before hashing: {stripped}')
