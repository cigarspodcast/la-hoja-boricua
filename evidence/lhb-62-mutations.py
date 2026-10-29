"""LHB-62 proof, on a scratch copy of the worktree: each part of block and report broken one at a time, each expected to turn the
LHB-62 tests red. The first is the state before this ticket (isBlocked always false, the M6-S4 placeholder). The copy is restored
after each. usage: python evidence/lhb-62-mutations.py WORKTREE SCRATCH"""
import os, shutil, subprocess, sys

WT, D = sys.argv[1], sys.argv[2]
if os.path.exists(D):
    shutil.rmtree(D)
shutil.copytree(WT, D, ignore=shutil.ignore_patterns('.git', 'node_modules', 'evidence'))
PAT = 'LHB-62'
FL, AF, BL, PE, FE, AU, SSR, AC, HJ = ('functions/_lib/follow.js', 'functions/api/follow.js', 'functions/api/block.js', 'functions/_lib/people.js',
                                       'functions/_lib/feed.js', 'functions/api/u/[handle].js', 'functions/u/[handle].js', 'functions/_lib/account.js', 'site/hoja.js')
NF = "if (await isBlocked(env.DB, me, who.user_id)) return json({ error: 'not-found' }, 404);"
MUTS = [
    (FL, 'isBlocked always false (before LHB-62)', 'return blockAware(async on => on && !!(', 'return blockAware(async on => false && !!('),
    (FL, 'isBlocked one direction only', "'SELECT 1 AS n FROM blocks WHERE (blocker_id = ?1 AND blocked_id = ?2) OR (blocker_id = ?2 AND blocked_id = ?1)'", "'SELECT 1 AS n FROM blocks WHERE (blocker_id = ?1 AND blocked_id = ?2)'"),
    (FL, 'a missing table hides every error', 'if (!noBlocks(e)) throw e; return q(false);', 'return q(false);'),
    (FL, 'a missing table is not tolerated', 'if (!noBlocks(e)) throw e; return q(false);', 'throw e;'),
    (FL, 'lists not filtered for the viewer', 'const filter = on && viewer;\n    const sql', 'const filter = false;\n    const sql'),
    (FL, 'a blocked list owner still answers', NF, ''),
    (AF, 'follow counts of a blocked pair still answer', NF + '\n  const out', '\n  const out'),
    (AF, 'the race: follow insert ignores blocks', "(on ? 'AND NOT EXISTS (SELECT 1 FROM blocks WHERE (blocker_id = ?1 AND blocked_id = ?2) OR (blocker_id = ?2 AND blocked_id = ?1)) ' : '')", "''"),
    (BL, 'block keeps the follows', "'DELETE FROM follows WHERE ((follower_id", "'DELETE FROM follows WHERE 0 AND ((follower_id"),
    (BL, 'block removes one direction only', "((follower_id = ?1 AND followee_id = ?2) OR (follower_id = ?2 AND followee_id = ?1)) ' +", "((follower_id = ?1 AND followee_id = ?2)) ' +"),
    (BL, 'self-block not refused', "if (who.user_id === me) return json({ error: 'self-block' }, 400);", ''),
    (BL, 'unblock reveals a hidden profile', '(who.hidden || await', '(false || await'),
    (PE, 'search not filtered', "(on ? notBlocked(1, 'profiles.user_id') + ' ' : '')", "''"),
    (FE, 'feed does not skip a blocked author', 'if (blocked.get(r.uid)) continue;', ''),
    (AU, 'app profile of a blocked pair answers', 'if (!r || await isBlocked(env.DB, viewer, r.uid))', 'if (!r)'),
    (SSR, '/u page of a blocked pair answers', 'if (r) blocked = await isBlocked(env.DB, await viewerOf(request, env), r.uid);', 'if (r) blocked = false;'),
    (AC, 'account deletion forgets blocks', "  ['blocks', ['blocker_id', 'blocked_id']],\n", ''),
    (HJ, 'report subject without the handle', "encodeURIComponent('Reportar @'+h)", "encodeURIComponent('Reportar')"),
    (HJ, 'Bloquear shown without an account', '${a&&a.handle!==h?`<button class="lbtn" type="button" id="pfBlock">', '${h?`<button class="lbtn" type="button" id="pfBlock">'),
    (HJ, 'blocking stays on the hidden profile', "if(live())location.hash='#/mihoja/perfil'", ''),
    (HJ, 'Bloqueados section never shown', 'sec.hidden=false;say();', 'say();'),
    (HJ, 'unblock focus not moved to the next row', "const f=nx&&nx.isConnected?nx:$('#blkT');", "const f=$('#blkT');"),
    # Codex round 1
    (AF, 'r1: follow to a blocked pair says blocked (the race recheck)', "      if (await isBlocked(env.DB, me, who.user_id)) return json({ error: 'not-found' }, 404);\n", ''),
    (AF, 'r1: unfollow of a blocked pair answers with counts', "  // LHB-62: para un par bloqueado no existe, ni su conteo (el bloqueo ya borro los seguir de los dos lados)\n  " + NF + "\n", ''),
    (BL, 'r1: blocking back someone who blocked you goes through', "'NOT EXISTS (SELECT 1 FROM blocks WHERE blocker_id = ?2 AND blocked_id = ?1) AND (SELECT", "'(SELECT"),
    (BL, 'r1: block refused by an inbound block says something else', 'if (await isBlocked(env.DB, me, who.user_id)) return notFound();', ''),
    (BL, 'r1: unblock of someone who blocked you answers 200', '(who.hidden || await isBlocked(env.DB, me, who.user_id))', 'who.hidden'),
    (BL, 'r1: block list shows name and photo of a mutual or hidden', 'THEN 1 ELSE 0 END AS shown', 'THEN 1 ELSE 1 END AS shown'),
    (BL, 'r1: the block cap lets one more through', 'AND (SELECT COUNT(*) FROM blocks WHERE blocker_id = ?1) < ?4 ', 'AND (SELECT COUNT(*) FROM blocks WHERE blocker_id = ?1) < ?4 + 1 '),
    (BL, 'r1: a refused block still removes follows', "'AND EXISTS (SELECT 1 FROM blocks WHERE blocker_id = ?1 AND blocked_id = ?2)'", "''"),
    (FL, 'r1: counts not filtered for the viewer', 'const filter = on && viewer;\n    const one', 'const filter = false;\n    const one'),
    (AU, 'r1: app profile counts without the viewer', 'countsOf(env.DB, r.uid, viewer)', 'countsOf(env.DB, r.uid)'),
    (AF, 'r1: follow counts without the viewer', '...(await countsOf(env.DB, who.user_id, me)),', '...(await countsOf(env.DB, who.user_id)),'),
    (HJ, 'r1: profile from the old session is painted', 'if(subNow()!==sub0)return vPersona(raw);', ''),
    (HJ, 'r1: profile not repainted on an account change', "pfRedo(()=>$('#pfX')===el,sub0,()=>vPersona(raw));", ''),
    (HJ, 'r1: list from the old session is painted', 'if(subNow()!==sub0)return vFwList(h,dir);', ''),
    (HJ, 'r1: list not repainted on an account change', 'pfRedo(live,sub0,()=>vFwList(h,dir));', ''),
    (HJ, 'r1: a late block closes another sheet', "if($('#blkGo')===go)closeSheet();", 'closeSheet();'),
    # Codex round 2
    ('site/cuenta.js', 'r2: cuenta.js does not tell of a Clerk change', "  if(typeof D.onAccount==='function')D.onAccount(id);\n", ''),
    (HJ, 'r2: the Clerk change count is not part of the session token', "return acctGen+'|'+(a&&", "return '|'+(a&&"),
    (HJ, 'r2: hoja.js does not count a Clerk change', 'onAccount:()=>{acctGen++;acctTell()}', 'onAccount:()=>{acctTell()}'),
    (HJ, 'r2: stale page watchers stay', '(live,sub0,redo)=>{for(const f of [...acctW])f();const w=()=>', '(live,sub0,redo)=>{const w=()=>'),
    # Codex round 3
    (HJ, 'r3: the session cookie is not part of the token', "+'|'+cookieTok()};", '};'),
    (HJ, 'r3: the cookie read is the wrong one', '__session=([^;]+)', '__sesion=([^;]+)'),
    (HJ, 'r3: returning to the tab does not tell the watchers', "window.addEventListener('focus',()=>acctTell())", "window.addEventListener('focus',()=>{})"),
    # Codex round 5
    (AU, 'r5: the profile does not say its viewer', "{ 'X-Lhb-Viewer': viewer || '-' }", '{}'),
    (FL, 'r5: the lists do not say their viewer', "{ 'X-Lhb-Viewer': me || '-' }", '{}'),
    (HJ, 'r5: the viewer header is never read', 'const vwOf=x=>{try{', 'const vwOf=x=>{return null;try{'),
    (HJ, 'r6: the cookie is judged by its exp (the fingerprint is the sub only)', "return m?m[1]:''}catch(e){return ''}};", "return m?tokSub(m[1]):''}catch(e){return ''}};"),
    (HJ, 'r6: the profile never compares the answer with the cookie', 'if(!pfMatch(tok0,r)){r=await pfWho(r,t=>pfFetch(h,t));', 'if(false){r=await pfWho(r,t=>pfFetch(h,t));'),
    (HJ, 'r6: the list never compares the answer with the cookie', 'if(!pfMatch(tok0,r)){r=await pfWho(r,ask);', 'if(false){r=await pfWho(r,ask);'),
    (HJ, 'r6: an answer without a session always matches', 'r.viewer==null||r.viewer===tokSub(tok)', 'r.viewer==null||r.viewer===''||r.viewer===tokSub(tok)'),
    (HJ, 'r6: nobody signed in still rejects the anonymous answer', "return r.viewer===''?r:null;", 'return null;'),
    (HJ, 'r6: the re-ask with the key is believed whoever it says', 'return x.viewer==null||x.viewer===uid?x:null}', 'return x}'),
    (HJ, 'r7: the Clerk user is read after the wait', 'return x.viewer==null||x.viewer===uid?x:null}', 'return x.viewer==null||x.viewer===C.user.id?x:null}'),
    (HJ, 'r6: the re-ask goes without the key', "...(t?{Authorization:'Bearer '+t}:{})}});let j={};try{j=await r.json()}", "}});let j={};try{j=await r.json()}"),
    (HJ, 'r6: an unresolved profile is painted anyway', "if(!r){el.innerHTML=`<div class=\"empty\">${tt('h.pfError')}</div>`;return}", ''),
    (HJ, 'r6: the follow button goes into a page that was repainted', "if(!live()||$('#'+id)!==box)return;acctW.add(w);", 'acctW.add(w);'),
    # Codex round 4
    (HJ, 'r1: a late block tells another account', '   if(!ok())return;\n   if(r.status===200&&r.body&&r.body.blocked===true)', '   if(r.status===200&&r.body&&r.body.blocked===true)'),
]


def runp():
    return subprocess.run(['node', '--test', '--test-timeout=60000', '--test-name-pattern=' + PAT, 'test/site.test.js'], cwd=D, capture_output=True, text=True, encoding='utf-8', errors='replace')


def tally(r):
    t = {k: 0 for k in ('pass', 'fail')}
    for l in r.stdout.splitlines():
        for k in t:
            if l.startswith('ℹ ' + k + ' '):
                t[k] = int(l.split()[-1])
    return t


def edit(rel, old, new):
    p = os.path.join(D, rel)
    s = open(p, 'rb').read().decode('utf-8')
    if '\r\n' in s:
        old, new = old.replace('\n', '\r\n'), new.replace('\n', '\r\n')
    assert s.count(old) == 1, (rel, old[:80], s.count(old))
    open(p, 'wb').write(s.replace(old, new).encode('utf-8'))


def restore(rel):
    shutil.copy(os.path.join(WT, rel), os.path.join(D, rel))


t = tally(runp())
print('baseline (no mutation): pass %d fail %d' % (t['pass'], t['fail']))
assert t['fail'] == 0 and t['pass'] > 0
red = 0
for rel, name, a, b in MUTS:
    edit(rel, a, b)
    t = tally(runp())
    ok = t['fail'] > 0
    red += ok
    print('%-48s %s (fail %d)' % (name, 'RED (caught)' if ok else 'GREEN (survived)', t['fail']))
    restore(rel)
print('RESULT %d of %d red' % (red, len(MUTS)))
