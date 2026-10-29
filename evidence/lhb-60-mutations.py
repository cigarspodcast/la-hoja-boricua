"""LHB-60 proof: each mutation breaks one rule of the follow button or the lists on a scratch copy of the worktree, runs the LHB-60 tests,
and must turn them red; the copy is restored after each.
usage: python evidence/lhb-60-mutations.py WORKTREE SCRATCH"""
import os, re, shutil, subprocess, sys

WT, D = sys.argv[1], sys.argv[2]
if os.path.exists(D):
    shutil.rmtree(D)
shutil.copytree(WT, D, ignore=shutil.ignore_patterns('.git', 'node_modules'))
PAT = 'LHB-60'
HO = 'site/hoja.js'
FILES = (HO,)


def edit(rel, old, new):
    p = os.path.join(D, rel)
    s = open(p, 'rb').read().decode('utf-8')
    assert s.count(old) == 1, (rel, old, s.count(old))
    open(p, 'wb').write(s.replace(old, new).encode('utf-8'))


M = [
    ('N1 the count waits for the server', lambda: edit(HO, "onCount(Math.max(0,st.n+(want===st.on?0:want?1:-1)))", "onCount(st.n)")),
    ('N2 no rollback on a refusal', lambda: edit(HO, "else if(want===target){want=st.on;toast(", "else if(want===target){toast(")),
    ('N3 a refusal says nothing', lambda: edit(HO, "else if(want===target){want=st.on;toast(fwErr(r.body&&r.body.error))}", "else if(want===target){want=st.on}")),
    ('N4 two requests at once', lambda: edit(HO, "btn.onclick=()=>{want=!want;paint();if(!busy)pump()}", "btn.onclick=()=>{want=!want;paint();pump()}")),
    ('N5 a stale response overwrites a newer tap', lambda: edit(HO, "{st.on=target;if(Number.isInteger(r.body.followers))", "{st.on=target;want=target;if(Number.isInteger(r.body.followers))")),
    ('N6 your own row gets a button', lambda: edit(HO, "me&&p.handle!==me.handle?`<span class=\"fw-row\"", "me?`<span class=\"fw-row\"")),
    ('N7 any stored account counts', lambda: edit(HO, "const meAcct=()=>{const a=acct.get();return a&&typeof a==='object'&&typeof a.sub==='string'&&a.sub&&typeof a.handle==='string'&&PF_HANDLE.test(a.handle)?a:null};", "const meAcct=()=>acct.get();")),
    ('N8 a button without knowing the state', lambda: edit(HO, "||r.status!==200||!r.body||typeof r.body.viewerFollows!=='boolean')return;", "||r.status!==200||!r.body)return;")),
    ('N9 the same person twice across pages', lambda: edit(HO, "PF_HANDLE.test(p.handle)&&!seen.has(p.handle))", "PF_HANDLE.test(p.handle))")),
    ('N10 the next page without the cursor', lambda: edit(HO, "(next?'&cursor='+encodeURIComponent(next):'')", "''")),
    ('N11 no more button', lambda: edit(HO, "say(seen.size?'':tt('h.fwNadie'));$('#fwMore').hidden=!next;", "say(seen.size?'':tt('h.fwNadie'));")),
    ('N12 the list routes ignored', lambda: edit(HO, "if((seg==='seguidores'||seg==='siguiendo')&&PF_HANDLE.test(h))return vFwList(h,seg==='seguidores'?'followers':'following');", "")),
    ('N13 the counts do not link', lambda: edit(HO, "<li><a href=\"${to('seguidores')}\">", "<li><a>")),
    ('N14 a left page still answers (r1: the check is ok())', lambda: edit(HO, "   if(!ok())return;\r\n   if(r.status===200&&r.body&&r.body.following===target)", "   if(r.status===200&&r.body&&r.body.following===target)")),
    ('N16 r1: the request does not ask again after the token', lambda: edit(HO, "{handle:h},sub,undefined,ok)", "{handle:h},sub)")),
    ('N17 r1: api() ignores go', lambda: edit(HO, "if(go&&!go())throw new Error('gone');", "")),
    ('N18 r1: the mount ignores an account change during the GET', lambda: edit(HO, "||!fwSame(a.sub)||r.status!==200", "||r.status!==200")),
    ('N19 r1: a mounted button ignores sign-out', lambda: edit(HO, "acctW.add(w);", "")),
    ('N20 r1: the account store does not tell the buttons', lambda: edit(HO, "if(A.topAvatar)A.topAvatar();acctTell()},clear:", "if(A.topAvatar)A.topAvatar()},clear:")),
    ('N21 r1: a confirmation does not repaint the count', lambda: edit(HO, "st.n=r.body.followers;paint()}", "st.n=r.body.followers}")),
    ('N22 r1: the watcher never leaves a gone page', lambda: edit(HO, "if(!live()||$('#'+id)!==box){acctW.delete(w);return}", "if(!live()||$('#'+id)!==box)return;")),
    ('N23 r2: watchers of gone pages pile up until an account change', lambda: edit(HO, "for(const f of [...acctW])f();acctW.add(w);", "acctW.add(w);")),
    ('N15 an empty list says nothing', lambda: edit(HO, "say(seen.size?'':tt('h.fwNadie'))", "say('')")),
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
        print('%-48s rc %d fail %s -> %s' % (name, r.returncode, fails[-1] if fails else '?', 'RED' if ok else 'SURVIVED'), flush=True)
    finally:
        for rel, b in snap.items():
            open(os.path.join(D, rel), 'wb').write(b)
r = subprocess.run(['node', '--test', '--test-timeout=60000', '--test-name-pattern=' + PAT, 'test/site.test.js'], cwd=D, capture_output=True, text=True, encoding='utf-8', errors='replace')
n = re.findall(r'^ℹ pass (\d+)', r.stdout, re.M)
print('baseline after restore: rc %d pass %s' % (r.returncode, n[-1] if n else '?'))
print('RESULT %d of %d mutations red' % (red, len(M)))
