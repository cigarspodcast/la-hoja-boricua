"""LHB-39 mutation proof after the Codex round 1 fixes (forward copy of lhb-39-mutations.py: M29 follows the count into dRefresh; F1 to F6 break the two fixes): each mutation breaks one rule of the Mi Hoja stats or the diary search, filters and sort in a scratch copy
of site/hoja.js, runs the LHB-39 tests, and must turn them red; the file is restored after each.
usage: python evidence/lhb-39-mutations.py WORKTREE SCRATCH"""
import os, re, shutil, subprocess, sys

WT, D = sys.argv[1], sys.argv[2]
if os.path.exists(D):
    shutil.rmtree(D)
shutil.copytree(WT, D, ignore=shutil.ignore_patterns('.git', 'node_modules'))
P = os.path.join(D, 'site', 'hoja.js')
M = [
    ('M1 catas count what is not an entry', "return {catas:es.length,", "return {catas:(s.diario||[]).length,"),
    ('M2 stamps not checked against the catalog', ".filter(id=>ok.has(id)).length}", ".length}"),
    ('M3 stamps of one kind counted as another', "sellos[k]=Object.keys((s.pasaporte||{})[k]||{})", "sellos[k]=Object.keys((s.pasaporte||{}).lugares||{})"),
    ('M4 top not ordered by average', "sort((a,b)=>b.avg-a.avg||b.n-a.n||", "sort((a,b)=>b.n-a.n||"),
    ('M5 top average tie not broken by count', "b.avg-a.avg||b.n-a.n||", "b.avg-a.avg||"),
    ('M6 top not capped at three', "top:topRated(es,3)", "top:topRated(es,9)"),
    ('M7 unrated catas in the top', "if(!(r>=1&&r<=5))continue;", ""),
    ('M8 an "otro" cigar keyed by its raw name', "'n:'+dfold(e.nombre)", "'n:'+e.nombre"),
    ('M9 most-logged ignores the count', "if(!best||c>best.n||(c===best.n&&", "if(!best||(c<=best.n&&"),
    ('M10 most-logged tie goes the other way', "v.localeCompare(best.v,'es')<0", "v.localeCompare(best.v,'es')>0"),
    ('M11 fortaleza reads the capa', "fortaleza:mostOf(es,'fortaleza')", "fortaleza:mostOf(es,'capa')"),
    ('M12 search misses the marca', "const hay=[e.nombre,e.marca,e.artesano,", "const hay=[e.nombre,e.artesano,"),
    ('M13 search misses the artesano', "const hay=[e.nombre,e.marca,e.artesano,", "const hay=[e.nombre,e.marca,"),
    ('M14 search misses the name', "const hay=[e.nombre,e.marca,e.artesano,", "const hay=[e.marca,e.artesano,"),
    ('M15 search misses the tags', ",...(Array.isArray(e.tags)?e.tags.flatMap(t=>[t,WN(t)]):[])]", "]"),
    ('M16 search misses the shown tag name', "e.tags.flatMap(t=>[t,WN(t)])", "e.tags.flatMap(t=>[t])"),
    ('M17 search keeps accents', r"const dfold=t=>String(t??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase()", "const dfold=t=>String(t??'').toLowerCase()"),
    ('M18 search is case-sensitive', ".replace(/[\\u0300-\\u036f]/g,'').toLowerCase().replace(/\\s+/g,' ')", ".replace(/[\\u0300-\\u036f]/g,'').replace(/\\s+/g,' ')"),
    ('M19 any word instead of every word', "return ws.every(w=>", "return ws.some(w=>"),
    ('M20 stars filter is at-least, not exact', "if(st&&(+e.rating||0)!==st)return false;", "if(st&&(+e.rating||0)<st)return false;"),
    ('M21 public filter ignored', "if(q.vis==='pub'&&e.publica!==true)return false;", ""),
    ('M22 private filter ignored', "if(q.vis==='priv'&&e.publica===true)return false;", ""),
    ('M23 date sort ignores the day smoked', "const dday=e=>okDay(e.consumido)?e.consumido:", "const dday=e=>false?e.consumido:"),
    ('M24 date sort oldest first', "const byDay=(a,b)=>dday(b).localeCompare(dday(a))", "const byDay=(a,b)=>dday(a).localeCompare(dday(b))"),
    ('M25 stars sort ignored', "out.sort(q.ord==='estrellas'?", "out.sort(false?"),
    ('M26 stars sort tie not by date', "(+b.rating||0)-(+a.rating||0)||byDay(a,b)", "(+b.rating||0)-(+a.rating||0)"),
    ('M27 the stats panel is not shown', " ${dStats(diaryStats(s,D()))}\r\n", "\r\n"),
    ('M28 filters lose their state on repaint', "${dFilters(q)}", "${dFilters(DQ0())}"),
    ('M29 the count does not follow the filter', "n.textContent=dCount(l.length,all.length);", ""),
    ('M30 typing in the search does nothing', "$('#dqQ').oninput=upd;", ""),
    ('M31 a filter change repaints the whole page', "box.innerHTML=l.map(dCard).join('');", "vDiario();"),
    ('M32 another account keeps the search', "if(DQ.who!==w)DQ={...DQ0(),who:w};", ""),
    ('M33 no message when nothing matches', "const dCount=(n,all)=>n?tt('h.dqN',{a:n,b:all}):tt('h.dqNada');", "const dCount=(n,all)=>tt('h.dqN',{a:n,b:all});"),
    ('M34 focus does not come back after a repaint', "  if(foc){const x=$('#'+foc);", "  if(false){const x=$('#'+foc);"),
    ('M35 the caret goes to the start', "x.setSelectionRange(k,k)", "x.setSelectionRange(0,0)"),
    ('F1 a public toggle under a filter does not repaint', 'if(dq().vis)dRefresh()});', '});'),
    ('F2 every public toggle repaints the list', 'if(dq().vis)dRefresh()});', 'dRefresh()});'),
    ('F3 a sync does not note the focus first', '{dKeepFocus();A.route()}', '{A.route()}'),
    ('F4 the noted focus is not used', 'foc=DFOC||(', 'foc=('),
    ('F5 the noted focus is used again', "ae.id:'');DFOC='';", "ae.id:'');"),
    ('F6 any focused field is noted', "DFOC=ae&&/^dq[QSVO]$/.test(ae.id||'')?ae.id:''", "DFOC=ae?ae.id:''"),
]
CMD = ['node', '--test', '--test-timeout=60000', '--test-name-pattern=LHB-39', 'test/site.test.js']
orig = open(P, 'rb').read()
red = 0
for name, old, new in M:
    s = orig.decode('utf-8')
    assert s.count(old) == 1, (name, s.count(old))
    try:
        open(P, 'wb').write(s.replace(old, new).encode('utf-8'))
        r = subprocess.run(CMD, cwd=D, capture_output=True, text=True, encoding='utf-8', errors='replace')
        fails = re.findall(r'^ℹ fail (\d+)', r.stdout, re.M)
        ok = r.returncode != 0 and fails and int(fails[-1]) > 0
        red += bool(ok)
        print('%-48s rc %d fail %s -> %s' % (name, r.returncode, fails[-1] if fails else '?', 'RED' if ok else 'SURVIVED'), flush=True)
    finally:
        open(P, 'wb').write(orig)
r = subprocess.run(CMD, cwd=D, capture_output=True, text=True, encoding='utf-8', errors='replace')
p = re.findall(r'^ℹ pass (\d+)', r.stdout, re.M)
print('baseline after restore: rc %d pass %s' % (r.returncode, p[-1] if p else '?'))
print('RESULT %d of %d mutations red' % (red, len(M)))
