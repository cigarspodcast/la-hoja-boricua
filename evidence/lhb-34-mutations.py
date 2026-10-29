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
    ('M20 a refused delete leaves sync stopped', lambda: edit(HO, "   if(!delMark.get())SYNC.hold(false);\r\n   acMsg(!r?", "   acMsg(!r?")),
    ('M21 a lost response clears the delete mark', lambda: edit(HO, "else if(!had&&r&&((r.status>=400&&r.status<500)||r.status===503))delMark.clear();", "else if(!had&&(!r||(r.status>=400&&r.status<500)||r.status===503))delMark.clear();")),
    ('M22 delete button always enabled', lambda: edit(HO, "inp.oninput=()=>{del.disabled=!typedOk(a,inp.value)};", "inp.oninput=()=>{del.disabled=false};")),
    ('M23 no privacy link in the panel', lambda: edit(HO, ' <p class="hint">${tt(\'h.leeQueGuardamosY\')} <a href="/privacidad">${tt(\'h.privacidadYCuenta\')}</a>.</p></section>`}', ' </section>`}')),
    ('M24 Perfil does not bind the panel', lambda: edit(AP, "EXT.bindAccount();", '')),
    ('M25 Codex r1: Mi Hoja create without the profile in the same statement', lambda: edit(MH, "SELECT ?1, ?2, ?3, 1, ?4 WHERE EXISTS (SELECT 1 FROM profiles WHERE user_id = ?1) ON CONFLICT", "VALUES (?1, ?2, ?3, 1, ?4) ON CONFLICT")),
    ('M26 Codex r1: a Mi Hoja PUT without a profile is not a 403', lambda: edit(MH, "    if (!(await env.DB.prepare('SELECT 1 AS n FROM profiles WHERE user_id = ?1').bind(me).first())) return json({ error: 'no-profile' }, 403);\r\n", '')),
    ('M27 Codex r1: no sweep after Clerk', lambda: edit(API, "  try { await sweep(); } catch (e) { return json({ error: 'cleanup-failed' }, 502); }\r\n", '')),
    ('M28 Codex r1: old handle checks pruned per account only', lambda: edit(HD, "'DELETE FROM handle_checks WHERE created_at <= ?1').bind(since)", "'DELETE FROM handle_checks WHERE user_id = ?1 AND created_at <= ?2').bind(user.sub, since)")),
    ('M29 Codex r1: forget ignores the mark', lambda: edit(SY, "const same=mark=>{const now=markNow();return now.raw===mark.raw&&now.seq===mark.seq};", "const same=mark=>true;")),
    ('M30 Codex r1: a failed sign-out is checked again (no retry)', lambda: edit(HO, "  if(!outDone){const r=", "  if(true){const r=")),
    ('M31 Codex r1: resume for another account', lambda: edit(HO, "if(!m||!C||!C.user||C.user.id!==m.sub)return;", "if(!m||!C||!C.user)return;")),
    ('M32 Codex r1: no profile needs no text', lambda: edit(API, "if (!typed || (p && typed", "if ((p && typed")),
    ('M33 Codex r1: no Clerk identity check', lambda: edit(API, "  if (!known && p) return json({ error: 'clerk-mismatch' }, 503);\r\n", '')),
    ('M34 Codex r1: Clerk 500 read as an unknown user', lambda: edit(LIB, "return r.status === 200 ? true : r.status === 404 ? false : null;", "return r.status === 200 ? true : r.status >= 400 ? false : null;")),
    ('M35 Codex r1: a lost delete response resumes sync', lambda: edit(HO, "   if(!delMark.get())SYNC.hold(false);\r\n   acMsg(!r?", "   SYNC.hold(false);\r\n   acMsg(!r?")),
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
    ('M48 Codex r3: forget sets no fence', lambda: edit(SY, "   try{D.ls.set(FENCE,String(D.nowMs()))}catch(e){return back()}\r\n   await D.wait(FENCE_MS);", "   await D.wait(FENCE_MS);")),
    ('M49 Codex r3: no second check after the wait', lambda: edit(SY, "   if(!same(mark))return back()}", "   }")),
    ('M50 Codex r3: no wait for the other tabs', lambda: edit(SY, "   await D.wait(FENCE_MS);\r\n", '')),
    ('M51 Codex r3: hoja.js writes through the fence', lambda: edit(HO, "function write(s,quiet){if(SYNC&&SYNC.fenced()){ST=null;toast(tt('ac.fenced'));return false}", "function write(s,quiet){")),
    ('M52 Codex r3: the sync meta written through the fence', lambda: edit(SY, "const writeMeta=m=>{if(fenced())return false;", "const writeMeta=m=>{")),
    ('M53 Codex r3: the shared counter bumped through the fence', lambda: edit(SY, "const bumpSeq=()=>{if(fenced())return;", "const bumpSeq=()=>{")),
    ('M54 Codex r3: the owner written through the fence', lambda: edit(SY, "const setOwner=uid=>{if(fenced())return false;", "const setOwner=uid=>{")),
    ('M55 Codex r3: the fence never expires', lambda: edit(SY, "return t>0&&d<FENCE_TTL&&d>-FENCE_TTL", "return t>0&&d>-FENCE_TTL")),
    ('M56 Codex r3: an aborted forget leaves the fence', lambda: edit(SY, "const back=()=>{try{D.ls.remove(FENCE)}catch(e){}hold(false);return false};", "const back=()=>{hold(false);return false};")),
    ('M57 Codex r3: an aborted forget leaves sync held', lambda: edit(SY, "const back=()=>{try{D.ls.remove(FENCE)}catch(e){}hold(false);return false};", "const back=()=>{try{D.ls.remove(FENCE)}catch(e){}return false};")),
    ('M58 Codex r3: passes run during the wait', lambda: edit(SY, "   await hold(true);\r\n   const back", "   const back")),
    ('M59 Codex r3: the fence removed right after the erase', lambda: edit(SY, "  for(const k of [KEY,META,OWNER,SEQ]){try{D.ls.remove(k)}catch(e){ok=false}}\r\n", "  for(const k of [KEY,META,OWNER,SEQ]){try{D.ls.remove(k)}catch(e){ok=false}}\r\n  try{D.ls.remove(FENCE)}catch(e){}\r\n")),
    ('M60 Codex r3: the delete mark not read back', lambda: edit(HO, "const v=delMark.get();return !!v&&v.sub===sub}", "return true}")),
    ('M61 Codex r3: delete sent without a saved mark', lambda: edit(HO, "   if(!delMark.set(a.sub)){if(!delMark.get())SYNC.hold(false);acMsg(tt('ac.del.store'));return}\r\n", "   delMark.set(a.sub);\r\n")),
    ('M62 Codex r3: a failed mark releases sync over an earlier mark', lambda: edit(HO, "if(!delMark.set(a.sub)){if(!delMark.get())SYNC.hold(false);", "if(!delMark.set(a.sub)){SYNC.hold(false);")),
    ('M63 Codex r3: salir does not wait for forget', lambda: edit(HO, "if(!(await dropLocal(r.mark)))", "if(!dropLocal(r.mark))")),
    ('M64 Codex r4: the fence not stamped again after the wait', lambda: edit(SY, "   await D.wait(FENCE_MS);\r\n   try{D.ls.set(FENCE,String(D.nowMs()))}catch(e){return back()}\r\n", "   await D.wait(FENCE_MS);\r\n")),
    ('M65 Codex r4: a fence from the future counts forever', lambda: edit(SY, "return t>0&&d<FENCE_TTL&&d>-FENCE_TTL", "return t>0&&d<FENCE_TTL")),
    ('M66 Codex r4: no fence check right before the store', lambda: edit(HO, "const txt=JSON.stringify(s);if(SYNC&&SYNC.fenced()){ST=null;toast(tt('ac.fenced'));return false}", "const txt=JSON.stringify(s);")),
    ('M67 Codex r4: delete and resume not serialized', lambda: edit(HO, "const delLock=f=>typeof navigator", "const delLock=f=>f();const delLock0=f=>typeof navigator")),
    ('M68 Codex r4: the waiting resume uses the mark it read before its turn', lambda: (edit(HO, "async function resumeDelete(){if(!delMark.get())return;", "async function resumeDelete(){const m0=delMark.get();if(!m0)return;"), edit(HO, "const m=delMark.get();if(!m||!C", "const m=m0;if(!m||!C"))),
    ('M69 Codex r5: a sign-out retry skips the check after new writes', lambda: edit(HO, "if(back!==null){outDone=false;SYNC.hold(false)}", "")),
    ('M70 Codex r5: the retry checks again but leaves the sync held', lambda: edit(HO, "if(back!==null){outDone=false;SYNC.hold(false)}", "if(back!==null){outDone=false}")),
    ('M71 Codex r6: the fence is not renewed while Clerk signs out', lambda: edit(HO, "const beat=setInterval(SYNC.fenceUp,3e3);", "const beat=0;")),
    ('M72 Codex r6: a retry does not put the fence back first', lambda: edit(HO, "async function leaving(C){SYNC.fenceUp();", "async function leaving(C){")),
    ('M73 Codex r6: the renewal never stops', lambda: edit(HO, "finally{clearInterval(beat)}}", "finally{}}")),
    ('M74 Codex r6: fenceUp writes nothing', lambda: edit(SY, "const fenceUp=()=>{try{D.ls.set(FENCE,String(D.nowMs()))}catch(e){}};", "const fenceUp=()=>{};")),
    ('M75 Codex r6: delete signs out without the fence', lambda: edit(HO, "bye('del');try{await leaving(C)}", "bye('del');try{await signOutClerk(C)}")),
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
