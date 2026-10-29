"""LHB-61 proof: each mutation breaks one rule of Siguiendo (the feed in functions/_lib/feed.js and the screen in site/hoja.js) on a scratch copy
of the worktree, runs the LHB-61 tests, and must turn them red; the copy is restored after each.
usage: python evidence/lhb-61-mutations.py WORKTREE SCRATCH"""
import os, re, shutil, subprocess, sys

WT, D = sys.argv[1], sys.argv[2]
if os.path.exists(D):
    shutil.rmtree(D)
shutil.copytree(WT, D, ignore=shutil.ignore_patterns('.git', 'node_modules'))
PAT = 'LHB-61|LHB-28: Mi Hoja del servidor solo sale'  # the second is the guard on who reads mihoja (S14)
FD, AP, HO = 'functions/_lib/feed.js', 'functions/api/feed.js', 'site/hoja.js'
FILES = (FD, AP, HO)


def edit(rel, old, new):
    p = os.path.join(D, rel)
    s = open(p, 'rb').read().decode('utf-8')
    assert s.count(old) == 1, (rel, old, s.count(old))
    open(p, 'wb').write(s.replace(old, new).encode('utf-8'))


M = [
    ('S1 private entries too', lambda: edit(FD, " AND json_type(j.value, '$.publica') = 'true'", "")),
    ('S2 anything truthy counts as public', lambda: edit(FD, "json_type(j.value, '$.publica') = 'true'", "json_extract(j.value, '$.publica')")),
    ('S3 hidden profiles too', lambda: edit(FD, " AND p.hidden = 0 JOIN mihoja", " JOIN mihoja")),
    ('S4 anyone\'s follows, not mine', lambda: edit(FD, "WHERE f.follower_id = ?1 AND", "WHERE ?1 IS NOT NULL AND")),
    ('S5 the cursor is ignored', lambda: edit(FD, "SQL + (cursor ? AFTER : '') + ORDER", "SQL + ORDER")),
    ('S6 oldest first within a person and day', lambda: edit(FD, "ORDER BY day DESC, handle DESC, pos DESC LIMIT", "ORDER BY day DESC, handle DESC, pos ASC LIMIT")),
    ('S7 the place counted from the newest', lambda: edit(FD, "ORDER BY j.key DESC) AS pos", "ORDER BY j.key ASC) AS pos")),
    ('S8 a broken document is not guarded', lambda: edit(FD, "'json_each(' + DOC + \", '$.diario') j \"", "\"json_each(m.doc, '$.diario') j \"")),
    ('S9 the whole entry goes out', lambda: edit(FD, "entry: publicEntry(e) });", "entry: e });")),
    ('S10 a bad cursor reads as none', lambda: edit(FD, ": { error: 'bad-cursor' };", ": { cursor: null };")),
    ('S11 no look-ahead row, so never a next page', lambda: edit(FD, "LIMIT ' + (PAGE + 1);", "LIMIT ' + PAGE;")),
    ('S12 no profile is fine', lambda: edit(AP, "  if (g instanceof Response) return g;\r\n", "  if (g instanceof Response && g.status !== 403) return g;\r\n  if (g instanceof Response) return json({ items: [], next: null });\r\n")),
    ('S13 an undated entry sorts by its raw value', lambda: edit(FD, "GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]' THEN json_extract(j.value, '$.consumido') ELSE '' END", "GLOB '*' THEN json_extract(j.value, '$.consumido') ELSE '' END")),
    ('C1 the name is not escaped', lambda: edit(HO, "<b>${esc(e.nombre||tt('h.pfCigarro'))}</b>${e.rating?stars(e.rating):''}${tagChips(e.tags,true)}", "<b>${e.nombre||tt('h.pfCigarro')}</b>${e.rating?stars(e.rating):''}${tagChips(e.tags,true)}")),
    ('C2 a stale answer paints', lambda: edit(HO, "no pinta nada */\r\n  if(!live()||mine!==seq)return;\r\n  /* un error deja", "no pinta nada */\r\n  /* un error deja")),
    ('C3 a request still goes out after leaving', lambda: edit(HO, ",a&&a.sub,undefined,()=>live()&&mine===seq)", ",a&&a.sub)")),
    ('C4 the next page without the cursor', lambda: edit(HO, "'/api/feed'+(next?'?cursor='+encodeURIComponent(next):'')", "'/api/feed'")),
    ('C5 an invalid @ is shown', lambda: edit(HO, "PF_HANDLE.test(x.author.handle)&&x.entry", "x.entry")),
    ('C6 the empty state has no way to find people', lambda: edit(HO, " <a href=\"#/mihoja/personas\">${esc(tt('h.fdBusca'))}</a>", "")),
    ('C7 a tap opens the wrong entry', lambda: edit(HO, "const x=b&&items[+b.dataset.feed];", "const x=b&&items[0];")),
    ('C8 numbering restarts on each page', lambda: edit(HO, "feedCard(x,from+k)", "feedCard(x,k)")),
    ('C9 an error cannot be retried', lambda: edit(HO, "$('#fdMore').hidden=false;return}", "return}")),
    ('C10 tags in a div inside the button', lambda: edit(HO, "${tagChips(e.tags,true)}", "${tagChips(e.tags)}")),
    ('C13 tagChips ignores inline', lambda: edit(HO, "return inl?`<span class=\"tagchips\">${ch}</span>`:`<div class=\"tagchips\">${ch}</div>`", "return `<div class=\"tagchips\">${ch}</div>`")),
    ('S14 the mihoja guard: a second read of mihoja', lambda: edit(FD, "export async function feedOf(db, me, cursor) {", "export async function feedOf(db, me, cursor) {\r\n  await db.prepare('SELECT doc FROM mihoja WHERE user_id = ?1').bind(me).first();")),
    ('C11 no Siguiendo tab in Mi Hoja', lambda: edit(HO, ",['siguiendo',tt('h.pfSiguiendo')]", "")),
    ('C12 the route does not open the screen', lambda: edit(HO, "siguiendo:vSiguiendo,", "")),
]
red = 0
for name, mut in M:
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
print('RESULT %d of %d mutations red' % (red, len(M)))
