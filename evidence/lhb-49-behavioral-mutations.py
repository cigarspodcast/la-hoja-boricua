"""Mutations run ONLY against the two DOM-de-mentira tests, to see them fail on their own (the source pins are not consulted)."""
import subprocess, re, sys
R = r'C:\Users\Owner\la-hoja-boricua'
P = R + r'\site\hoja.js'
MUTS = [
 ("upload success keeps buttons off", "busy(false);if(r.error)return err(", "if(r.error)return err("),
 ("upload stale with form mounted keeps buttons off", "catch(x){r={error:'avatar-type'}}\n  if($('#obForm')!==form)return;if(!r||r.stale){busy(false);return}", "catch(x){r={error:'avatar-type'}}\n  if($('#obForm')!==form)return;if(!r||r.stale){return}"),
 ("submit stale with form mounted keeps buttons off", "catch(x){r={error:'generic'}}\n  if($('#obForm')!==form)return;if(!r||r.stale){busy(false);return}", "catch(x){r={error:'generic'}}\n  if($('#obForm')!==form)return;if(!r||r.stale){return}"),
 ("submit error keeps buttons off", "busy(false);if(r.error)err(OB_ERR[r.error]||'No pudimos", "if(r.error)err(OB_ERR[r.error]||'No pudimos"),
 ("a file chosen while busy is not ignored", "if(!f||working)return;", "if(!f)return;"),
 ("submit while busy is not ignored", "e.preventDefault();if(working)return;", "e.preventDefault();"),
 ("the photo button stays on while busy", "$('#obGo').disabled=b;$('#obPb').disabled=b};", "$('#obGo').disabled=b};"),
 ("not resized before upload", "await A.resizeImage(f,512,.85)", "f"),
 ("photo asked after the handle", "  if(!picture.url())return err(OB_ERR['avatar-required']);\n  if(!HANDLE_RE.test(h))return err(OB_ERR['handle-invalid']);", "  if(!HANDLE_RE.test(h))return err(OB_ERR['handle-invalid']);\n  if(!picture.url())return err(OB_ERR['avatar-required']);"),
]
def run():
    p = subprocess.run(['node', '--test', '--test-timeout=30000', '--test-name-pattern', 'DOM de mentira', 'test/site.test.js'], cwd=R, capture_output=True, text=True, encoding='utf-8')
    return int(re.search(r'^ℹ fail (\d+)', p.stdout, re.M).group(1)), int(re.search(r'^ℹ pass (\d+)', p.stdout, re.M).group(1))
print('baseline (fail, pass):', run())
orig = open(P, 'rb').read()
text = orig.decode('utf-8'); crlf = '\r\n' in text; t = text.replace('\r\n', '\n')
bad = 0
for name, a, b in MUTS:
    if t.count(a) != 1:
        print(name, '-> ERROR anchor count', t.count(a)); bad += 1; continue
    m = t.replace(a, b, 1)
    open(P, 'wb').write((m.replace('\n', '\r\n') if crlf else m).encode('utf-8'))
    try:
        r = run()
    finally:
        open(P, 'wb').write(orig)
    ok = r[0] > 0
    bad += 0 if ok else 1
    print(name, '->', 'RED' if ok else 'SURVIVED', r)
print('restored (fail, pass):', run(), '| survivors or errors:', bad)
sys.exit(0 if bad == 0 else 1)
