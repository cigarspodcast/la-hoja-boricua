"""LHB-61 red-before proof: copy the whole worktree (migrations included, unlike the first attempt kept as lhb-61-red-before-r1fix.txt,
which failed on ENOENT for migrations/0001_init.sql), put functions/_lib/feed.js back as it was at REV, and run the LHB-61 tests.
usage: python evidence/lhb-61-red-before.py WORKTREE SCRATCH REV"""
import os, re, shutil, subprocess, sys

WT, D, REV = sys.argv[1], sys.argv[2], sys.argv[3]
if os.path.exists(D):
    shutil.rmtree(D)
shutil.copytree(WT, D, ignore=shutil.ignore_patterns('.git', 'node_modules'))
old = subprocess.run(['git', 'show', REV + ':functions/_lib/feed.js'], cwd=WT, capture_output=True, check=True).stdout
open(os.path.join(D, 'functions', '_lib', 'feed.js'), 'wb').write(old)
print('feed.js from', REV, len(old), 'bytes; migrations present:', os.path.exists(os.path.join(D, 'migrations', '0001_init.sql')), flush=True)
r = subprocess.run(['node', '--test', '--test-timeout=60000', '--test-name-pattern=LHB-61', 'test/site.test.js'], cwd=D, capture_output=True, text=True, encoding='utf-8', errors='replace')
for line in r.stdout.splitlines():
    if line.startswith('✔') or line.startswith('✖') or re.match(r'^ℹ (tests|pass|fail)', line) or 'AssertionError' in line or 'ENOENT' in line:
        print(line)
print('rc', r.returncode)
