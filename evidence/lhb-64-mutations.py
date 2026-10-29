"""LHB-64 proof: each mutation breaks one accessibility fix (site/hoja.js sheet, backup; site/app.js catalog; site/styles.css; the manifest) on a scratch
copy of the worktree, runs the LHB-64 tests, and must turn them red; the copy is restored after each. With --main, it instead puts back main's
versions of the five site files and runs the same tests once (the red-before run).
usage: python evidence/lhb-64-mutations.py WORKTREE SCRATCH [--main REV]"""
import os, re, shutil, subprocess, sys

WT, D = sys.argv[1], sys.argv[2]
if os.path.exists(D):
    shutil.rmtree(D)
shutil.copytree(WT, D, ignore=shutil.ignore_patterns('.git', 'node_modules'))
PAT = 'LHB-64'
HO, AP, CS, MF, I18 = 'site/hoja.js', 'site/app.js', 'site/styles.css', 'site/manifest.webmanifest', 'site/i18n.js'
FILES = (HO, AP, CS, MF, I18)


def runp():
    return subprocess.run(['node', '--test', '--test-timeout=60000', '--test-name-pattern=' + PAT, 'test/site.test.js'], cwd=D, capture_output=True, text=True, encoding='utf-8', errors='replace')


if len(sys.argv) > 4 and sys.argv[3] == '--main':
    for rel in FILES:
        b = subprocess.run(['git', 'show', sys.argv[4] + ':' + rel], cwd=WT, capture_output=True, check=True).stdout
        open(os.path.join(D, rel), 'wb').write(b)
    r = runp()
    for line in r.stdout.splitlines():
        if line[:1] in ('✔', '✖') or re.match(r'^ℹ (tests|pass|fail)', line) or 'Error' in line:
            print(line)
    print('rc', r.returncode)
    sys.exit(0)


def edit(rel, old, new):
    p = os.path.join(D, rel)
    s = open(p, 'rb').read().decode('utf-8')
    assert s.count(old) == 1, (rel, old, s.count(old))
    open(p, 'wb').write(s.replace(old, new).encode('utf-8'))


M = [
    ('F1 Tab at the last control does not wrap', lambda: edit(HO, "else if(!e.shiftKey&&at===last){e.preventDefault();first.focus()}", "")),
    ('F2 Shift+Tab at the first does not wrap', lambda: edit(HO, "else if(e.shiftKey&&at===first){e.preventDefault();last.focus()}", "")),
    ('F3 focus left outside is not brought back in', lambda: edit(HO, "if(!el.contains(at)){e.preventDefault();(e.shiftKey?last:first).focus()}else ", "")),
    ('F4 hidden and unrendered controls count', lambda: edit(HO, ".filter(n=>!n.closest('[hidden]')&&n.getClientRects().length)", "")),
    ('F5 a closing sheet still traps Tab', lambda: edit(HO, "if(!el||el.hidden||!document.body.classList.contains('sheet-on'))return;", "if(!el||el.hidden)return;")),
    ('F6 the app behind is not inert', lambda: edit(HO, " el.hidden=false;appInert(true);", " el.hidden=false;")),
    ('F7 closing leaves the app inert', lambda: edit(HO, "document.body.classList.remove('sheet-on');appInert(false);clearTimeout(closeT);", "document.body.classList.remove('sheet-on');clearTimeout(closeT);")),
    ('F8 closing at once leaves the app inert', lambda: edit(HO, "document.body.classList.remove('sheet-on');appInert(false);focusBack()}", "document.body.classList.remove('sheet-on');focusBack()}")),
    ('F9 a sheet from a sheet forgets the first trigger', lambda: edit(HO, " if(!el.contains(document.activeElement))lastFocus=document.activeElement;", " lastFocus=document.activeElement;")),
    ('F10 no control: focus does not enter (no Cerrar fallback)', lambda: edit(HO, "||el.querySelector('.sheet-x');setTimeout(", ";setTimeout(")),
    ('F11 the trigger gone: focus is lost, not sent to the content', lambda: edit(HO, "const v=$('#view');if(v&&v.focus)v.focus({preventScroll:true})}", "}")),
    ('F12 closing at once steals focus with no sheet open', lambda: edit(HO, "function focusBack(){if(!owed)return;owed=false;", "function focusBack(){")),
    ('F13 the delayed first focus jumps into a closed sheet', lambda: edit(HO, "if(!el.hidden&&f&&f.isConnected)f.focus(", "if(f)f.focus(")),
    ('F14 Escape does not close', lambda: edit(HO, "if(e.key==='Escape'){closeSheet();return}", "")),
    ('F15 import is a label with tabindex 0 again', lambda: edit(HO, "<button class=\"lbtn\" type=\"button\" id=\"impB\">${tt('h.importarRespaldo')}</button><input type=\"file\" accept=\"application/json,.json\" id=\"impF\" class=\"sr\" tabindex=\"-1\" aria-hidden=\"true\">", "<label class=\"lbtn\" tabindex=\"0\">${tt('h.importarRespaldo')}<input type=\"file\" accept=\"application/json,.json\" id=\"impF\" class=\"sr\"></label>")),
    ('F16 the import button opens nothing', lambda: edit(HO, " const ib=$('#impB');if(ib)ib.onclick=()=>{const x=$('#impF');if(x)x.click()};", " ")),
    ('F17 a chip loses focus on repaint', lambda: edit(AP, "const n=$$('[data-fort]').find(x=>x.dataset.fort===v);if(n)n.focus({preventScroll:true})", "")),
    ('F18 the capa select loses focus', lambda: edit(AP, "vCatalogo();$('#fCapa').focus({preventScroll:true})", "vCatalogo()")),
    ('F19 the artisan select loses focus', lambda: edit(AP, "vCatalogo();$('#fArt').focus({preventScroll:true})", "vCatalogo()")),
    ('F20 the status is not updated', lambda: edit(AP, "resultStatus(list.length?tt('cat.count',{a:list.length}):tt('cat.noMatch'));", "")),
    ('F21 no matches says nothing', lambda: edit(AP, ":tt('cat.noMatch'));", ":'');")),
    ('F22 the status region lives in the view (repainted away)', lambda: edit(AP, "e.setAttribute('aria-atomic','true');document.body.appendChild(e)}", "e.setAttribute('aria-atomic','true');view.appendChild(e)}")),
    ('F23 the status region is not polite', lambda: edit(AP, "e.setAttribute('aria-live','polite');", "")),
    ('F24 the English count is missing', lambda: edit(I18, ' "cat.count": "Vitolas in the catalog: {a}.",', '')),
    ('F25 no focus ring on camera and gallery', lambda: edit(CS, ".photo-btns label:has(input:focus-visible){outline:2px solid var(--gold);outline-offset:2px}", "")),
    ('F26 the portrait lock is back', lambda: edit(MF, '"display": "standalone",', '"display": "standalone",\n  "orientation": "portrait",')),
]
red = 0
for name, mut in M:
    snap = {rel: open(os.path.join(D, rel), 'rb').read() for rel in FILES}
    try:
        mut()
        r = runp()
        fails = re.findall(r'^ℹ fail (\d+)', r.stdout, re.M)
        ok = r.returncode != 0 and fails and int(fails[-1]) > 0
        red += bool(ok)
        print('%-60s rc %d fail %s -> %s' % (name, r.returncode, fails[-1] if fails else '?', 'RED' if ok else 'SURVIVED'), flush=True)
    finally:
        for rel, b in snap.items():
            open(os.path.join(D, rel), 'wb').write(b)
r = runp()
n = re.findall(r'^ℹ pass (\d+)', r.stdout, re.M)
print('baseline after restore: rc %d pass %s' % (r.returncode, n[-1] if n else '?'))
print('RESULT %d of %d mutations red' % (red, len(M)))
