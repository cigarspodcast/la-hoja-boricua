"""LHB-79: the proof's leak check on its own, with no AI call: each key's first and last four characters searched in what the
branch adds (ai_proof.added_text), printing only found or not found. Exits 1 if any is found, 3 if git cannot be read.
usage: python tools/ai_leakcheck.py BASE   (from the repo root)"""
import os, sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import ai_proof as P
import ai_routes as A

base = sys.argv[1]
text, n = P.added_text(base)
print('leak check read %d characters: every file version the commits since %s wrote, %d changed, untracked or log files' % (len(text), base, n))
found = False
for var in A.KEYS.values():
    k = A._key(var)
    if not k:
        print('leak check %-20s skipped (absent)' % var)
        continue
    hit = (k[:4] in text) or (k[-4:] in text)
    found = found or hit
    print('leak check %-20s first or last four characters in what the branch adds: %s' % (var, 'FOUND' if hit else 'not found'))
    k = None
sys.exit(1 if found else 0)
