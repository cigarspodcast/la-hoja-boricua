"""LHB-79 proof: one call per route through tools/ai_routes.py, synthetic text only, each checked against an answer fixed before
the call; then, inside this process (which holds the keys), a leak check: each key's first and last four characters searched in
everything the branch adds, printing only found or not found. A refused route is recorded as its result and never retried.
What the leak check reads (Codex rondas 1 y 2): every file version any commit since BASE wrote, read whole from git, text or
binary (so a key committed and then removed is still found, and no diff parsing can drop a line), every file the working tree
changed or added, read whole, and evidence/ai-calls.log, which .gitignore would otherwise hide. If git cannot list or read any
of these, the check fails instead of looking clean.
usage: python tools/ai_proof.py BASE   (BASE: the commit the branch starts from; run from the repo root)"""
import os, re, subprocess, sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import ai_routes as A

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
        # the answer is printed only when it is the one fixed before the call: anything else stays unprinted, whatever it holds
        print('%-12s answered; expected %r -> %s' % (name, expected, 'PASS, got %r' % got if ok else 'WRONG ANSWER (not printed)'))
        results.append((name, 'pass' if ok else 'wrong'))
    except A.RouteError as e:
        print('%-12s REFUSED status %s (%s); recorded, not retried' % (name, e.status, e.detail))
        results.append((name, 'refused %s' % e.status))


def git(*args, stdin=None):
    r = subprocess.run(['git'] + list(args), capture_output=True, input=stdin)
    if r.returncode != 0:
        print('leak check FAILED: git %s exited %d; nothing is reported clean' % (' '.join(args), r.returncode))
        sys.exit(3)
    return r.stdout


def fail(why):
    print('leak check FAILED: %s; nothing is reported clean' % why)
    sys.exit(3)


def blobs(shas):
    """each blob's whole content, read with git cat-file --batch. Every record is checked (Codex ronda 3): a sha git answers
    "missing", a record of another kind or a short read fails the check instead of being searched as if it were the content"""
    out = git('cat-file', '--batch', stdin=('\n'.join(shas) + '\n').encode())
    texts, i = [], 0
    for sha in shas:
        j = out.find(b'\n', i)
        head = out[i:j].split() if j >= 0 else []
        if len(head) != 3 or head[0].decode('ascii', 'replace') != sha or head[1] != b'blob' or not head[2].isdigit():
            fail('git could not read object %s (%s)' % (sha, b' '.join(head[1:]).decode('ascii', 'replace') or 'no answer'))
        n = int(head[2])
        body = out[j + 1:j + 1 + n]
        if len(body) != n or out[j + 1 + n:j + 2 + n] != b'\n':
            fail('object %s was cut short' % sha)
        texts.append(body.decode('utf-8', 'replace'))
        i = j + 2 + n
    if i != len(out):
        fail('git answered more than was asked')
    return texts


def added_text(base):
    """everything the branch adds, as one text: each file version written by a commit since BASE, read whole from git, and each
    file the working tree changed or added, plus the call log, read whole from disk"""
    parts = []
    # one line per file each commit wrote: ":oldmode newmode oldsha newsha status<TAB>path"; a deletion's new sha is all zeros,
    # and a submodule (mode 160000) is a commit, not a file. -m lists a merge against each parent (Codex ronda 3), so a file the
    # merge itself wrote (a resolved conflict) is read too
    raw = git('log', '-m', '--raw', '--no-abbrev', '--no-renames', '--format=', base + '..HEAD').decode('utf-8', 'replace')
    shas = sorted({f[3] for f in (l.split('\t')[0].split() for l in raw.splitlines() if l.startswith(':')) if len(f) >= 4 and f[1] != '160000' and set(f[3]) != {'0'}})
    if shas:
        parts += blobs(shas)
    names = [n for n in git('diff', '--name-only', '-z', 'HEAD', '--').decode('utf-8', 'replace').split('\0') if n]
    names += [n for n in git('ls-files', '-z', '--others', '--exclude-standard').decode('utf-8', 'replace').split('\0') if n]
    names.append(os.path.relpath(A.LOG))
    for n in names:
        if os.path.isfile(n):
            with open(n, 'rb') as f:
                parts.append(f.read().decode('utf-8', 'replace'))
    return '\n'.join(parts), len(names)


def main(BASE):
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

    text, nfiles = added_text(BASE)
    print('leak check read %d characters: the commits since %s, uncommitted changes, %d untracked or log files' % (len(text), BASE, nfiles))
    for n, var in A.KEYS.items():
        k = A._key(var)
        if not k:
            print('leak check %-20s skipped (absent)' % var)
            continue
        hit = (k[:4] in text) or (k[-4:] in text)
        print('leak check %-20s first or last four characters in what the branch adds: %s' % (var, 'FOUND' if hit else 'not found'))
        k = None
    print('RESULT ' + ', '.join('%s %s' % r for r in results))


if __name__ == '__main__':
    main(sys.argv[1])
