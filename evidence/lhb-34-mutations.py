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
FILES = ('functions/_lib/account.js', 'functions/api/account.js', 'site/sync.js', 'site/hoja.js', 'site/app.js', 'functions/api/mihoja.js', 'functions/api/handle.js', 'functions/api/profile.js')


def edit(rel, old, new):
    p = os.path.join(D, rel)
    s = open(p, 'rb').read().decode('utf-8')
    assert s.count(old) == 1, (rel, old, s.count(old))
    open(p, 'wb').write(s.replace(old, new).encode('utf-8'))


LIB, API, SY, HO, AP, MH, HD, PR = FILES
skip = lambda t: lambda: edit(LIB, 'export const deletes = (db, present, sub) => present.map(', "export const deletes = (db, present, sub) => present.filter(([t]) => t !== '%s').map(" % t)
M = [
    ('M1 handle_checks skipped', skip('handle_checks')),
    ('M2 mihoja skipped', skip('mihoja')),
    ('M3 profiles skipped', skip('profiles')),
    ('M4 follows skipped (red without foreign keys)', skip('follows')),
    ('M5 follow_events skipped (red without foreign keys)', skip('follow_events')),
    ('M6 follows only on the follower side', lambda: edit(LIB, "['follows', ['follower_id', 'followee_id']],", "['follows', ['follower_id']],")),
    ('M7 the Clerk delete skipped', lambda: edit(API, 'if (known && !(await deleteClerkUser(key, user.sub, fetchFn)))', 'if (false)')),
    ('M8 Clerk 404 is a failure', lambda: edit(LIB, 'return r.status === 200 || r.status === 404;', 'return r.status === 200;')),
    ('M9 unknown tables ignored (fail open)', lambda: edit(API, "if (t.unknown.length) return json({ error: 'unknown-table' }, 503);", '')),
    ('M10 d1_migrations counted as unknown', lambda: edit(LIB, " || n === 'd1_migrations'", '')),
    ('M11 no typed confirmation', lambda: edit(API, "if (!typed || (p && typed !== String(p.handle).toLowerCase()))", 'if (false)')),
    ('M12 any Clerk key for any instance', lambda: edit(LIB, "return k.startsWith(dev ? 'sk_test_' : 'sk_live_') ? k : null;", 'return k;')),
    ('M13 Clerk deleted before the base', lambda: edit(API, "    await sweep();\r\n  } catch (e) {\r\n    return json({ error: 'unavailable' }, 503);\r\n  }\r\n  if (known && !(await deleteClerkUser(key, user.sub, fetchFn))) return json({ error: 'clerk-failed' }, 502);",
                                                         "    if (known && !(await deleteClerkUser(key, user.sub, fetchFn))) return json({ error: 'clerk-failed' }, 502);\r\n    await sweep();\r\n  } catch (e) {\r\n    return json({ error: 'unavailable' }, 503);\r\n  }")),
    ('M14 sign-out check removed (the Proof)', lambda: edit(HO, "  if(!r.ok){acMsg(r.why==='draft'?tt('ac.draft'):tt('ac.pending'));return}\r\n", '')),
    ('M15 settled: pending check removed', lambda: edit(SY, "  if(dirty||!m||!acc||m.sub!==acc.sub||m.dirty||!m.base||canon(d)!==canon(m.base))return {ok:false,why:'pending'};\r\n", '')),
    ('M16 settled: draft check removed', lambda: edit(SY, "  if(isObj(d)&&isObj(d.draft)&&Object.keys(d.draft).length)return {ok:false,why:'draft'};\r\n", '')),
    ('M17 settled: any backup counts', lambda: edit(SY, "if(typeof o.backup==='string'&&canon(d)===o.backup)", "if(typeof o.backup==='string')")),
    ('M18 forget keeps the sync meta', lambda: edit(SY, 'for(const k of [KEY,META,OWNER,SEQ])', 'for(const k of [KEY])')),
    ('M19 held passes still run', lambda: edit(SY, "  if(held)return Promise.resolve({skip:'held'});\r\n", '')),
    ('M20 a refused delete leaves sync stopped', lambda: edit(HO, "  if(!delMark.get())SYNC.hold(false);\r\n  acMsg(!r?", "  acMsg(!r?")),
    ('M21 a lost response clears the delete mark', lambda: edit(HO, "else if(!had&&r&&((r.status>=400&&r.status<500)||r.status===503))delMark.clear();", "else if(!had&&(!r||(r.status>=400&&r.status<500)||r.status===503))delMark.clear();")),
    ('M22 delete button always enabled', lambda: edit(HO, "inp.oninput=()=>{del.disabled=!typedOk(a,inp.value)};", "inp.oninput=()=>{del.disabled=false};")),
    ('M23 no privacy link in the panel', lambda: edit(HO, ' <p class="hint">${tt(\'h.leeQueGuardamosY\')} <a href="/privacidad">${tt(\'h.privacidadYCuenta\')}</a>.</p></section>`}', ' </section>`}')),
    ('M24 Perfil does not bind the panel', lambda: edit(AP, "EXT.bindAccount();", '')),
    ('M25 Codex r1: Mi Hoja create without the profile in the same statement', lambda: edit(MH, "SELECT ?1, ?2, ?3, 1, ?4 WHERE EXISTS (SELECT 1 FROM profiles WHERE user_id = ?1) ON CONFLICT", "VALUES (?1, ?2, ?3, 1, ?4) ON CONFLICT")),
    ('M26 Codex r1: a Mi Hoja PUT without a profile is not a 403', lambda: edit(MH, "    if (!(await env.DB.prepare('SELECT 1 AS n FROM profiles WHERE user_id = ?1').bind(me).first())) return json({ error: 'no-profile' }, 403);\r\n", '')),
    ('M27 Codex r1: no sweep after Clerk', lambda: edit(API, "  try { await sweep(); } catch (e) { return json({ error: 'cleanup-failed' }, 502); }\r\n", '')),
    ('M28 Codex r1: old handle checks pruned per account only', lambda: edit(HD, "'DELETE FROM handle_checks WHERE created_at <= ?1').bind(since)", "'DELETE FROM handle_checks WHERE user_id = ?1 AND created_at <= ?2').bind(user.sub, since)")),
    ('M29 Codex r1: forget ignores the mark', lambda: edit(SY, "if(mark){const now=markNow();if(now.raw!==mark.raw||now.seq!==mark.seq)return false}", "")),
    ('M30 Codex r1: a failed sign-out is checked again (no retry)', lambda: edit(HO, "  if(!outDone){const r=", "  if(true){const r=")),
    ('M31 Codex r1: resume for another account', lambda: edit(HO, "if(!C||!C.user||C.user.id!==m.sub)return;", "if(!C||!C.user)return;")),
    ('M32 Codex r1: no profile needs no text', lambda: edit(API, "if (!typed || (p && typed", "if ((p && typed")),
    ('M33 Codex r1: no Clerk identity check', lambda: edit(API, "  if (!known && p) return json({ error: 'clerk-mismatch' }, 503);\r\n", '')),
    ('M34 Codex r1: Clerk 500 read as an unknown user', lambda: edit(LIB, "return r.status === 200 ? true : r.status === 404 ? false : null;", "return r.status === 200 ? true : r.status >= 400 ? false : null;")),
    ('M35 Codex r1: a lost delete response resumes sync', lambda: edit(HO, "  if(!delMark.get())SYNC.hold(false);\r\n  acMsg(!r?", "  SYNC.hold(false);\r\n  acMsg(!r?")),
    ('M36 Codex r1: no resume at load', lambda: edit(HO, "if(delMark.get())setTimeout(resumeDelete,1500);", '')),
    ('M37 Codex r1: resume sends the @ (deletes an intact account)', lambda: edit(HO, "const r=await askDelete(C,m.sub,'#fin',true);", "const r=await askDelete(C,m.sub,(acct.get()||{}).handle||'ana_a',true);")),
    ('M38 Codex r2: the mark is read after the copy', lambda: edit(SY, "const seq=readSeq(),raw=markNow().raw,d=D.getDoc(),mark={raw,seq};", "const d=D.getDoc(),seq=readSeq(),raw=markNow().raw,mark={raw,seq};")),
    ('M39 Codex r2: profile create without the fence', lambda: edit(PR, "WHERE NOT EXISTS (SELECT 1 FROM deleted_accounts WHERE id_hash = ?12)", "WHERE ?12 = ?12")),
    ('M40 Codex r2: handle check without the fence', lambda: edit(HD, "' AND NOT EXISTS (SELECT 1 FROM deleted_accounts WHERE id_hash = ?5)'", "' AND ?5 = ?5'")),
    ('M41 Codex r2: no tombstone in the batch', lambda: edit(API, "    env.DB.prepare('INSERT INTO deleted_accounts (id_hash, deleted_at) VALUES (?1, ?2) ON CONFLICT(id_hash) DO NOTHING').bind(hash, new Date().toISOString()),\r\n", '')),
    ('M42 Codex r2: no not-ready check', lambda: edit(API, "  if (!t.tomb) return json({ error: 'not-ready' }, 503);\r\n", '')),
    ('M43 Codex r2: a failed last sweep reported as done', lambda: edit(API, "catch (e) { return json({ error: 'cleanup-failed' }, 502); }", "catch (e) {}")),
    ('M44 Codex r2: a transient error after a half delete drops the mark', lambda: edit(HO, "else if(!had&&r&&", "else if(r&&")),
    ('M45 Codex r2: other tabs keep their copy after a sign-out', lambda: edit(HO, "if(e.key==='lhb_mihoja_v1_owner'&&e.oldValue&&e.newValue===null){SYNC.hold(true);ST=null;STRAW=null;location.assign('/')}", "")),
    ('M46 Codex r2: the tombstone keeps the id', lambda: edit(API, ".bind(hash, new Date().toISOString()),", ".bind(user.sub, new Date().toISOString()),")),
    ('M47 Codex r2: the tombstone table counted as unknown', lambda: edit(LIB, "!known.has(n) && n !== TOMB", "!known.has(n)")),
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
