"""LHB-24 (Clerk rework) mutation check: each check in auth.js, me.js and 0002 is removed in turn;
the suite must go red each time. The files are restored after each mutation."""
import os, re, subprocess
R = r'C:\Users\Owner\la-hoja-boricua'
F = {'auth': os.path.join(R, 'functions', '_lib', 'auth.js'), 'me': os.path.join(R, 'functions', 'api', 'me.js'),
     'mig': os.path.join(R, 'migrations', '0002_clerk_profiles.sql')}
SNAP = {k: open(p, encoding='utf-8', newline='').read() for k, p in F.items()}
def run():
    p = subprocess.run(['node', '--test', 'test/site.test.js'], cwd=R, capture_output=True, text=True, encoding='utf-8')
    return re.search(r'^ℹ fail (\d+)', p.stdout, re.M).group(1), sorted(set(re.findall(r'^✖ (.+?) \(\d', p.stdout, re.M)) - {'failing tests:'})
def mut(k, a, b):
    s = SNAP[k]; assert s.count(a) == 1, (k, a); open(F[k], 'w', encoding='utf-8', newline='').write(s.replace(a, b))
def restore():
    for k, p in F.items(): open(p, 'w', encoding='utf-8', newline='').write(SNAP[k])
MUTS = [
    ('A1 issuer allowlist removed', 'auth', "if (!iss || !(issuers || []).includes(iss)) return { ok: false, why: 'iss' };", ''),
    ('A2 exp check removed', 'auth', "if (!Number.isFinite(body.exp) || t > body.exp + LEEWAY) return { ok: false, why: 'exp' };", ''),
    ('A3 nbf check removed', 'auth', "if (body.nbf !== undefined && (!Number.isFinite(body.nbf) || t + LEEWAY < body.nbf)) return { ok: false, why: 'nbf' };", ''),
    ('A13 exp accepts any number (round-1 B1: Infinity)', 'auth', "if (!Number.isFinite(body.exp) || t > body.exp + LEEWAY)", "if (typeof body.exp !== 'number' || t > body.exp + LEEWAY)"),
    ('A14 nbf only checked when numeric (round-1 B1)', 'auth', "if (body.nbf !== undefined && (!Number.isFinite(body.nbf) || t + LEEWAY < body.nbf))", "if (typeof body.nbf === 'number' && t + LEEWAY < body.nbf)"),
    ('A15 header and payload object check removed (round-1 note)', 'auth', "if (!isObj(head) || !isObj(body)) return { ok: false, why: 'format' };", ''),
    ('A4 azp check removed', 'auth', "if (!originOk(body.azp)) return { ok: false, why: 'azp' };", ''),
    ('A5 signature result ignored', 'auth', "if (!good) return { ok: false, why: 'sig' };", ''),
    ('A6 alg check removed', 'auth', "if (head.alg !== 'RS256' || typeof head.kid !== 'string') return { ok: false, why: 'alg' };", ''),
    ('A7 preview origin pattern unanchored', 'auth', "pages\\.dev$/;", "pages\\.dev/;"),
    ('A8 unknown-kid refetch limit removed', 'auth', "if (fresh && !c.keys.has(kid) && now - c.at < 60e3) return null;", ''),
    ('A9 0002 keeps the users table', 'mig', "DROP TABLE IF EXISTS users;", ''),
    ('A10 0002 handle not unique', 'mig', "handle TEXT UNIQUE NOT NULL,", "handle TEXT NOT NULL,"),
    ('A11 me.js returns every column', 'me', "'SELECT handle, display_name, bio, favorite_brand, avatar_key FROM profiles WHERE user_id = ?1'", "'SELECT * FROM profiles WHERE user_id = ?1'"),
    ('A12 me.js skips the issuer config check', 'me', "if (!issuersOf(env).length) return json({ error: 'no-auth-config' }, 503);", ''),
]
print('baseline', run())
for name, k, a, b in MUTS:
    mut(k, a, b); print(name, '->', run()); restore()
print('restored', run())
