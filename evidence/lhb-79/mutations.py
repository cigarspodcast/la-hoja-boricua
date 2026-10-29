"""LHB-79: each mutation of tools/ai_routes.py or tools/ai_proof.py must turn tools/test_ai_routes.py red. Runs on temporary
copies, never the real files. The tests import ai_proof, whose live calls run only under __main__, so no mutation makes a call.
usage: python evidence/lhb-79/mutations.py   (from the repo root)"""
import os, shutil, subprocess, sys, tempfile

R, P = 'tools/ai_routes.py', 'tools/ai_proof.py'
MUTS = [
    # round 0
    (R, 'no session header', "{'x-opencode-session': session or GO_SESSION}", '{}'),
    (R, 'caller session ignored', 'session or GO_SESSION', 'GO_SESSION'),
    (R, 'Go under /inference', "GO_BASE = 'https://opencode.ai/zen/go/v1'", "GO_BASE = 'https://opencode.ai/inference/go/v1'"),
    (R, 'Together without a case check', 'if case not in TOGETHER_CASES:', 'if False:'),
    # Codex ronda 1, one per finding
    (R, '1 redirects followed', '_open = urllib.request.build_opener(_NoRedirect).open', '_open = urllib.request.urlopen'),
    (R, '2 provider text kept, key cut', "kind = _kind(e.read().decode('utf-8', 'replace'), key)", "kind = e.read().decode('utf-8', 'replace')[:300].replace(key, '[key]')"),
    (R, '3 only some transport errors caught', 'except Exception as e:\n            # any other', 'except (urllib.error.URLError, TimeoutError, OSError, ValueError) as e:\n            # any other'),
    (R, '4 echo checked in raw text only', 'if key in raw or key in json.dumps(data, ensure_ascii=False):', 'if key in raw:'),
    (P, '5a log file not scanned', 'names.append(os.path.relpath(A.LOG))', 'pass'),
    (P, '5b only the last commit read', "'--format=', base + '..HEAD')", "'--format=', 'HEAD~1..HEAD')"),
    (P, '5c file names split on spaces', "git('ls-files', '-z', '--others', '--exclude-standard').decode('utf-8', 'replace').split('\\0')", "git('ls-files', '--others', '--exclude-standard').decode('utf-8', 'replace').split()"),
    (P, '5d git failure ignored', 'if r.returncode != 0:', 'if False:'),
    (R, '6a missing ticket not logged', "raise _refuse(route, model, ticket, reason, 'refused: every call names its ticket and its reason')", "raise RouteError(route, 0, 'refused')"),
    (R, '6b bad case not logged', "_log('together', model, ticket, reason, 'refused: not a fallback case')", 'pass'),
    # Codex ronda 2
    (P, 'r2-1 history blobs not read', 'if shas:', 'if False:'),
    (P, 'r2-1 worktree changes not read', "names = [n for n in git('diff', '--name-only', '-z', 'HEAD', '--')", "names = [n for n in []"),
    (R, 'r2-2 rejected case copied into the log', "'refused: not a fallback case')", "'refused: case %r' % (case,))"),
    (R, 'r2-3 only TypeError and ValueError refused', "    except Exception:\n        # TypeError, ValueError, and a RecursionError", "    except (TypeError, ValueError):\n        # TypeError, ValueError, and a RecursionError"),
    (R, '7 carriage return kept',r"_BREAKS = re.compile('[\t\n\r\v\f\x1c\x1d\x1e\x85\u2028\u2029]')", r"_BREAKS = re.compile('[\t\n]')"),
]
SRC = {f: open(f, encoding='utf-8').read() for f in (R, P)}
red = 0
for f, name, a, b in MUTS:
    assert SRC[f].count(a) == 1, name
    d = tempfile.mkdtemp()
    os.makedirs(os.path.join(d, 'tools'))
    for g in (R, P):
        open(os.path.join(d, g), 'w', encoding='utf-8').write(SRC[g].replace(a, b) if g == f else SRC[g])
    shutil.copy('tools/test_ai_routes.py', os.path.join(d, 'tools'))
    r = subprocess.run([sys.executable, '-m', 'unittest', 'tools/test_ai_routes.py'], cwd=d, capture_output=True, text=True, timeout=120)
    ok = r.returncode != 0
    red += ok
    print('%-40s %s' % (name, 'RED (caught)' if ok else 'GREEN (survived)'))
print('RESULT %d of %d red' % (red, len(MUTS)))
