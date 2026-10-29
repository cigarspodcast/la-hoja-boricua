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
    ('S1 private entries too (the query and the second check)', lambda: (edit(FD, "\"WHERE f.follower_id = ?1 AND j.type = 'object' AND \" + PUBLICA + ') ' +", "\"WHERE f.follower_id = ?1 AND j.type = 'object') ' +"), edit(FD, " || e.publica !== true) continue;", ") continue;"))),
    ('S1b the query lets private entries in (the second check alone hides them)', lambda: edit(FD, "\"WHERE f.follower_id = ?1 AND j.type = 'object' AND \" + PUBLICA + ') ' +", "\"WHERE f.follower_id = ?1 AND j.type = 'object') ' +")),
    ('S2 anything truthy counts as public', lambda: edit(FD, "member('j.value', 'publica', 'x.type') + \" = 'true'\";", "member('j.value', 'publica', 'x.type') + \" IN ('true', 'text', 'integer')\";")),
    ('S3 hidden profiles too', lambda: edit(FD, " AND p.hidden = 0 JOIN mihoja", " JOIN mihoja")),
    ('S4 anyone\'s follows, not mine', lambda: edit(FD, "WHERE f.follower_id = ?1 AND", "WHERE ?1 IS NOT NULL AND")),
    ('S5 the cursor is ignored', lambda: edit(FD, "const AFTER = 'WHERE day < ?2 OR (day = ?2 AND handle < ?3) ';", "const AFTER = 'WHERE ?2 IS NOT NULL AND ?3 IS NOT NULL ';")),
    ('S6 oldest first within a person and day', lambda: edit(FD, "ORDER BY day DESC, handle DESC, k ASC'", "ORDER BY day DESC, handle DESC, k DESC'")),
    ('S7 a page ends in the middle of a group (Codex r1 P2)', lambda: edit(FD, "    while (page.length && key(page[page.length - 1]) === cut) page.pop();\r\n", "")),
    ('S15 the stored display_name goes out (Codex r1 P1)', lambda: edit(FD, "r.first_name && r.last_name ? publicName(r.first_name, r.last_name) : null", "r.first_name && r.last_name ? r.first_name + ' ' + r.last_name : null")),
    ('S16 the day read past a NUL (Codex r1 P2)', lambda: edit(FD, " AND length(CAST(x.value AS BLOB)) = 10", "")),
    ('S16b ten characters that are not a day', lambda: edit(FD, " AND x.value GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]' THEN x.value END", " THEN x.value END")),
    ('S17 a group bigger than a page goes out whole (Codex r2 P2)', lambda: edit(FD, "page = rest.slice(0, PAGE), last", "page = rest, last")),
    ('S18 after a big group, always a next page', lambda: edit(FD, "next: (await read(db, AFTER, [me, day, handle], 1)).length ? key({ day, handle }) : null };", "next: key({ day, handle }) };")),
    ('S19 publica read by path, a NUL key passes (Codex r2 P1)', lambda: edit(FD, "const PUBLICA = member('j.value', 'publica', 'x.type') + \" = 'true'\";", "const PUBLICA = \"json_type(j.value, '$.publica') = 'true'\";")),
    ('S19b the same, and no second check: the private entry goes out', lambda: (edit(FD, "const PUBLICA = member('j.value', 'publica', 'x.type') + \" = 'true'\";", "const PUBLICA = \"json_type(j.value, '$.publica') = 'true'\";"), edit(FD, " || e.publica !== true) continue;", ") continue;"))),
    ('S20 diario read by path, a NUL key hides a second diary (Codex r2 P1)', lambda: edit(FD, "const DIARIO = 'COALESCE(' + member(\"CASE WHEN json_valid(m.doc) THEN m.doc ELSE '{}' END\", 'diario', \"CASE WHEN x.type = 'array' THEN x.value END\") + \", '[]')\";", "const DIARIO = \"CASE WHEN json_valid(m.doc) AND json_type(m.doc, '$.diario') = 'array' THEN json_extract(m.doc, '$.diario') ELSE '[]' END\";")),
    ('S25 keys matched by prefix, not whole (Codex r2 P1)', lambda: edit(FD, "WHERE x.key = '\" + key + \"' ORDER BY", "WHERE x.key LIKE '\" + key + \"%' ORDER BY")),
    ('S23 the first of a repeated key wins, not the last', lambda: edit(FD, "ORDER BY x.id DESC LIMIT 1)", "ORDER BY x.id ASC LIMIT 1)")),
    ('S24 a group page restarts at its beginning', lambda: edit(FD, "start = at >= 0 ? at + 1 : g.findIndex(x => x[1] < n);", "start = 0;")),
    ('S26 the next part found by its place only, not by the last entry seen (Codex r3 P2)', lambda: edit(FD, "start = at >= 0 ? at + 1 : g.findIndex(x => x[1] < n);", "start = g.findIndex(x => x[1] < n);")),
    ('S27 of two equal entries, the first one, not the nearest', lambda: edit(FD, "(at < 0 || Math.abs(x[1] - n) < Math.abs(g[at][1] - n))", "at < 0")),
    ('S28 the fingerprint ignores the entry', lambda: edit(FD, "const t = JSON.stringify(e && typeof e === 'object' ? publicEntry(e) : null);", "const t = 'x';")),
    ('S29 the last entry gone: no fallback to its place', lambda: edit(FD, "start = at >= 0 ? at + 1 : g.findIndex(x => x[1] < n);", "start = at >= 0 ? at + 1 : g.length;")),
    ('S8 a broken document is not guarded', lambda: edit(FD, "member(\"CASE WHEN json_valid(m.doc) THEN m.doc ELSE '{}' END\", 'diario',", "member('m.doc', 'diario',")),
    ('S9 the whole entry goes out', lambda: edit(FD, "entry: publicEntry(e) });", "entry: e });")),
    ('S10 a bad cursor reads as none', lambda: edit(FD, ": { error: 'bad-cursor' };", ": { cursor: null };")),
    ('S11 no look-ahead row, so never a next page', lambda: edit(FD, "  if (rows.length > PAGE) {", "  if (rows.length > PAGE + 1) {")),
    ('S12 no profile is fine', lambda: edit(AP, "  if (g instanceof Response) return g;\r\n", "  if (g instanceof Response && g.status !== 403) return g;\r\n  if (g instanceof Response) return json({ items: [], next: null });\r\n")),
    ('S13 an undated entry sorts by its raw value', lambda: edit(FD, " AND length(CAST(x.value AS BLOB)) = 10 AND x.value GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]' THEN x.value END", " THEN x.value END")),
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
