"""LHB-34 mutation proof: each mutation breaks one thing on a scratch copy of the worktree, runs the LHB-34 tests,
and must turn them red; the copy is restored after each.
usage: python evidence/lhb-34-mutations.py WORKTREE SCRATCH [M1,M2,...]"""
import os, re, shutil, subprocess, sys

WT, D = sys.argv[1], sys.argv[2]
ONLY = set(sys.argv[3].split(',')) if len(sys.argv) > 3 else None
if os.path.exists(D):
    shutil.rmtree(D)
shutil.copytree(WT, D, ignore=shutil.ignore_patterns('.git', 'node_modules'))
PAT = 'LHB-34'
FILES = ('functions/_lib/account.js', 'functions/api/account.js', 'site/sync.js', 'site/hoja.js', 'site/app.js')


def edit(rel, old, new):
    p = os.path.join(D, rel)
    s = open(p, 'rb').read().decode('utf-8')
    assert s.count(old) == 1, (rel, old, s.count(old))
    open(p, 'wb').write(s.replace(old, new).encode('utf-8'))


LIB, API, SY, HO, AP = FILES
skip = lambda t: lambda: edit(LIB, 'export const deletes = (db, present, sub) => present.map(', "export const deletes = (db, present, sub) => present.filter(([t]) => t !== '%s').map(" % t)
M = [
    ('M1 handle_checks skipped', skip('handle_checks')),
    ('M2 mihoja skipped', skip('mihoja')),
    ('M3 profiles skipped', skip('profiles')),
    ('M4 follows skipped (red without foreign keys)', skip('follows')),
    ('M5 follow_events skipped (red without foreign keys)', skip('follow_events')),
    ('M6 follows only on the follower side', lambda: edit(LIB, "['follows', ['follower_id', 'followee_id']],", "['follows', ['follower_id']],")),
    ('M7 the Clerk delete skipped', lambda: edit(API, 'if (!(await deleteClerkUser(key, user.sub, fetchFn)))', 'if (false)')),
    ('M8 Clerk 404 is a failure', lambda: edit(LIB, 'return r.status === 200 || r.status === 404;', 'return r.status === 200;')),
    ('M9 unknown tables ignored (fail open)', lambda: edit(API, "if (t.unknown.length) return json({ error: 'unknown-table' }, 503);", '')),
    ('M10 d1_migrations counted as unknown', lambda: edit(LIB, " || n === 'd1_migrations'", '')),
    ('M11 no typed confirmation', lambda: edit(API, "if (!typed || typed !== (p ? String(p.handle).toLowerCase() : 'borrar'))", 'if (false)')),
    ('M12 any Clerk key for any instance', lambda: edit(LIB, "return k.startsWith(dev ? 'sk_test_' : 'sk_live_') ? k : null;", 'return k;')),
    ('M13 Clerk deleted before the base', lambda: edit(API, "    await env.DB.batch(deletes(env.DB, t.present, user.sub));\r\n  } catch (e) {\r\n    return json({ error: 'unavailable' }, 503);\r\n  }\r\n  if (!(await deleteClerkUser(key, user.sub, fetchFn))) return json({ error: 'clerk-failed' }, 502);",
                                                         "    if (!(await deleteClerkUser(key, user.sub, fetchFn))) return json({ error: 'clerk-failed' }, 502);\r\n    await env.DB.batch(deletes(env.DB, t.present, user.sub));\r\n  } catch (e) {\r\n    return json({ error: 'unavailable' }, 503);\r\n  }")),
    ('M14 sign-out check removed (the Proof)', lambda: edit(HO, "  if(!r.ok){acMsg(r.why==='draft'?tt('ac.draft'):tt('ac.pending'));return}\r\n", '')),
    ('M15 settled: pending check removed', lambda: edit(SY, "  if(dirty||!m||!acc||m.sub!==acc.sub||m.dirty||!m.base||canon(d)!==canon(m.base))return {ok:false,why:'pending'};\r\n", '')),
    ('M16 settled: draft check removed', lambda: edit(SY, "  if(isObj(d)&&isObj(d.draft)&&Object.keys(d.draft).length)return {ok:false,why:'draft'};\r\n", '')),
    ('M17 settled: any backup counts', lambda: edit(SY, "if(typeof o.backup==='string'&&canon(d)===o.backup)", "if(typeof o.backup==='string')")),
    ('M18 forget keeps the sync meta', lambda: edit(SY, 'for(const k of [KEY,META,OWNER,SEQ])', 'for(const k of [KEY])')),
    ('M19 held passes still run', lambda: edit(SY, "  if(held)return Promise.resolve({skip:'held'});\r\n", '')),
    ('M20 a refused delete leaves sync stopped', lambda: edit(HO, "  SYNC.hold(false);\r\n  acMsg(!r?", "  acMsg(!r?")),
    ('M21 after a half delete the retry sends the @ again', lambda: edit(HO, "if(r&&r.status===502){acRetry='borrar';", "if(r&&r.status===502){")),
    ('M22 delete button always enabled', lambda: edit(HO, "inp.oninput=()=>{del.disabled=!acRetry&&inp.value", "inp.oninput=()=>{del.disabled=false&&inp.value")),
    ('M23 no privacy link in the panel', lambda: edit(HO, ' <p class="hint">${tt(\'h.leeQueGuardamosY\')} <a href="/privacidad">${tt(\'h.privacidadYCuenta\')}</a>.</p></section>`}', ' </section>`}')),
    ('M24 Perfil does not bind the panel', lambda: edit(AP, "EXT.bindAccount();", '')),
]
red = 0
ran = 0
for name, mut in M:
    if ONLY and name.split()[0] not in ONLY:
        continue
    ran += 1
    snap = {rel: open(os.path.join(D, rel), 'rb').read() for rel in FILES}
    try:
        mut()
        r = subprocess.run(['node', '--test', '--test-timeout=60000', '--test-name-pattern=' + PAT, 'test/site.test.js'], cwd=D, capture_output=True, text=True, encoding='utf-8', errors='replace')
        fails = re.findall(r'^ℹ fail (\d+)', r.stdout, re.M)
        ok = r.returncode != 0 and fails and int(fails[-1]) > 0
        red += bool(ok)
        print('%-52s rc %d fail %s -> %s' % (name, r.returncode, fails[-1] if fails else '?', 'RED' if ok else 'SURVIVED'), flush=True)
    finally:
        for rel, b in snap.items():
            open(os.path.join(D, rel), 'wb').write(b)
r = subprocess.run(['node', '--test', '--test-timeout=60000', '--test-name-pattern=' + PAT, 'test/site.test.js'], cwd=D, capture_output=True, text=True, encoding='utf-8', errors='replace')
n = re.findall(r'^ℹ pass (\d+)', r.stdout, re.M)
print('baseline after restore: rc %d pass %s' % (r.returncode, n[-1] if n else '?'))
print('RESULT %d of %d mutations red' % (red, ran))
