"""LHB-79 proof: one call per route through tools/ai_routes.py, synthetic text only, each checked against an answer fixed before
the call; then, inside this process (which holds the keys), a search of the branch's added lines for each key's first and last
four characters, printing only found or not found. A refused route is recorded as its result and never retried.
usage: python tools/ai_proof.py BASE   (BASE: the commit the branch starts from; run from the repo root)"""
import os, re, subprocess, sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import ai_routes as A

BASE = sys.argv[1]
T, R = 'LHB-79', 'proof call, known answer'
norm = lambda s: re.sub(r'[^a-záéíóúñ]', '', str(s).strip().lower())
results = []


def run(name, expected, fn):
    if not A.present(name):
        print('%-12s SKIPPED key %s absent' % (name, A.KEYS[name]))
        results.append((name, 'skipped'))
        return
    try:
        got = fn()
        ok = got == expected
        print('%-12s answered; expected %r, got %r -> %s' % (name, expected, got, 'PASS' if ok else 'WRONG ANSWER'))
        results.append((name, 'pass' if ok else 'wrong'))
    except A.RouteError as e:
        print('%-12s REFUSED status %s (%s); recorded, not retried' % (name, e.status, e.detail))
        results.append((name, 'refused %s' % e.status))


for n in A.KEYS:
    print('key %-20s %s' % (A.KEYS[n], 'present' if A.present(n) else 'absent'))

run('jev', 'tobacco', lambda: A.jev_choice(
    'La hoja de tabaco se cura colgada en un rancho de madera durante semanas.',
    'Which crop is this sentence about?',
    {'tobacco': 'Tobacco, the leaf that is cured', 'coffee': 'Coffee, the bean that is roasted', 'sugarcane': 'Sugarcane, the stalk that is pressed'},
    T, R)['choice'])
# max_tokens leaves room for models that spend tokens reasoning before the one-word answer
run('opencode-go', 'hoja', lambda: norm(A.opencode_chat('glm-5.3-flash', [{'role': 'user', 'content': 'Reply with exactly one word, in lowercase, with no punctuation: hoja'}], T, R, max_tokens=512)))
# Together: gpt-oss-120b is on Together's serverless list and absent from the Go plan's /models list (both read
# 2026-10-29), so the not-on-go case applies
run('together', 'tabaco', lambda: norm(A.together_chat('openai/gpt-oss-120b', [{'role': 'user', 'content': 'Reply with exactly one word, in lowercase, with no punctuation: tabaco'}], T, R, case='not-on-go', max_tokens=512)))

added = subprocess.run(['git', 'diff', BASE, '--', '.'], capture_output=True, text=True, encoding='utf-8', errors='replace').stdout
added += '\n'.join(open(p, encoding='utf-8', errors='replace').read() for p in subprocess.run(['git', 'ls-files', '--others', '--exclude-standard'], capture_output=True, text=True).stdout.split() if os.path.isfile(p))
plus = '\n'.join(l for l in added.splitlines() if l.startswith('+') or not l.startswith(('-', ' ', '@', 'diff ', 'index ')))
for n, var in A.KEYS.items():
    k = A._key(var)
    if not k:
        print('leak check %-20s skipped (absent)' % var)
        continue
    hit = (k[:4] in plus) or (k[-4:] in plus)
    print('leak check %-20s first or last four characters in the added lines: %s' % (var, 'FOUND' if hit else 'not found'))
    k = None
print('RESULT ' + ', '.join('%s %s' % r for r in results))
