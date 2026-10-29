"""LHB-79: each mutation of tools/ai_routes.py must turn tools/test_ai_routes.py red. Runs on a temporary copy, never the
real file. usage: python evidence/lhb-79/mutations.py   (from the repo root)"""
import os, shutil, subprocess, sys, tempfile

SRC = open('tools/ai_routes.py', encoding='utf-8').read()
MUTS = [
    ('no session header', "{'x-opencode-session': session or GO_SESSION}", '{}'),
    ('caller session ignored', 'session or GO_SESSION', 'GO_SESSION'),
    ('key not cut from the provider message', "msg.replace(key, '[key]') if key else msg", 'msg'),
    ('Go under /inference', "GO_BASE = 'https://opencode.ai/zen/go/v1'", "GO_BASE = 'https://opencode.ai/inference/go/v1'"),
    ('Together without a case check', 'if case not in TOGETHER_CASES:', 'if False:'),
]
red = 0
for name, a, b in MUTS:
    assert SRC.count(a) == 1, name
    d = tempfile.mkdtemp()
    os.makedirs(os.path.join(d, 'tools'))
    open(os.path.join(d, 'tools', 'ai_routes.py'), 'w', encoding='utf-8').write(SRC.replace(a, b))
    shutil.copy('tools/test_ai_routes.py', os.path.join(d, 'tools'))
    r = subprocess.run([sys.executable, '-m', 'unittest', 'tools/test_ai_routes.py'], cwd=d, capture_output=True, text=True)
    ok = r.returncode != 0
    red += ok
    print('%-40s %s' % (name, 'RED (caught)' if ok else 'GREEN (survived)'))
print('RESULT %d of %d red' % (red, len(MUTS)))
