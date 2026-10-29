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
    (FL, 'lists not filtered for the viewer', 'const filter = on && viewer;', 'const filter = false;'),
    (FL, 'a blocked list owner still answers', NF, ''),
    (AF, 'follow counts of a blocked pair still answer', NF, ''),
    (AF, 'the race: follow insert ignores blocks', "(on ? 'AND NOT EXISTS (SELECT 1 FROM blocks WHERE (blocker_id = ?1 AND blocked_id = ?2) OR (blocker_id = ?2 AND blocked_id = ?1)) ' : '')", "''"),
    (BL, 'block keeps the follows', "env.DB.prepare('DELETE FROM follows WHERE (follower_id = ?1 AND followee_id = ?2) OR (follower_id = ?2 AND followee_id = ?1)').bind(me, who.user_id)", "env.DB.prepare('SELECT 1').bind()"),
    (BL, 'block removes one direction only', "'DELETE FROM follows WHERE (follower_id = ?1 AND followee_id = ?2) OR (follower_id = ?2 AND followee_id = ?1)'", "'DELETE FROM follows WHERE (follower_id = ?1 AND followee_id = ?2)'"),
    (BL, 'self-block not refused', "if (who.user_id === me) return json({ error: 'self-block' }, 400);", ''),
    (BL, 'unblock reveals a hidden profile', 'if (who.hidden && !r.meta.changes) return json({ error: \'not-found\' }, 404);', ''),
    (PE, 'search not filtered', "(on ? notBlocked(1, 'profiles.user_id') + ' ' : '')", "''"),
    (FE, 'feed does not skip a blocked author', 'if (blocked.get(r.uid)) continue;', ''),
    (AU, 'app profile of a blocked pair answers', 'if (!r || await isBlocked(env.DB, await viewerOf(request, env), r.uid))', 'if (!r)'),
    (SSR, '/u page of a blocked pair answers', 'if (r) blocked = await isBlocked(env.DB, await viewerOf(request, env), r.uid);', 'if (r) blocked = false;'),
    (AC, 'account deletion forgets blocks', "  ['blocks', ['blocker_id', 'blocked_id']],\n", ''),
    (HJ, 'report subject without the handle', "encodeURIComponent('Reportar @'+h)", "encodeURIComponent('Reportar')"),
    (HJ, 'Bloquear shown without an account', '${a&&a.handle!==h?`<button class="lbtn" type="button" id="pfBlock">', '${h?`<button class="lbtn" type="button" id="pfBlock">'),
    (HJ, 'blocking stays on the hidden profile', "if(live())location.hash='#/mihoja/perfil'", ''),
    (HJ, 'Bloqueados section never shown', 'sec.hidden=false;say();', 'say();'),
    (HJ, 'unblock focus not moved to the next row', "const f=nx&&nx.isConnected?nx:$('#blkT');", "const f=$('#blkT');"),
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
