import os, re, subprocess, shutil
R = r'C:\Users\Owner\la-hoja-boricua'
S = os.path.join(R, 'site')
def run():
    p = subprocess.run(['node', '--test', 'test/site.test.js'], cwd=R, capture_output=True, text=True, encoding='utf-8')
    fail = re.search(r'^ℹ fail (\d+)', p.stdout, re.M).group(1)
    names = sorted(set(re.findall(r'^✖ (.+?) \(\d', p.stdout, re.M)))
    return fail, names
def regen():
    for t in ('build_artesanos.py', 'build_lugares.py', 'rebuild_bundle.py'):
        subprocess.run(['python', 'tools/' + t], cwd=R, check=True, capture_output=True)
def edit(f, a, b):
    p = os.path.join(S, f); s = open(p, encoding='utf-8').read(); assert a in s, (f, a); open(p, 'w', encoding='utf-8', newline='').write(s.replace(a, b, 1))
muts = [
    ('M1 one cigar page removed', lambda: os.remove(os.path.join(S, 'cigarros', 'yambo-toro.html'))),
    ('M2 one cigar sitemap entry removed', lambda: edit('sitemap.xml', '<url><loc>https://lahojaboricua.com/cigarros/yambo-toro</loc></url>\n', '')),
    ('M3 sw navigation exclusion removed', lambda: edit('sw.js', "&&!url.pathname.includes('/cigarros/')", '')),
    ('M4 artesano link back to the app hash', lambda: edit('artesanos/yambo-cigars.html', 'href="../cigarros/yambo-toro.html"', 'href="../#/c/yambo-toro"')),
    ('M5 stray extra page in cigarros/', lambda: open(os.path.join(S, 'cigarros', 'extra.html'), 'w').write('x')),
    ('M6 price leaks into JSON-LD', lambda: edit('cigarros/monte-mistica-corojo.html', '"category":"Cigarro"', '"category":"Cigarro","description2":"Desde $12.35"')),
]
SW = open(os.path.join(S, 'sw.js'), encoding='utf-8', newline='').read()
print('baseline', run())
for name, f in muts:
    f()
    print(name, '->', run())
    if name.startswith('M5'): os.remove(os.path.join(S, 'cigarros', 'extra.html'))
    open(os.path.join(S, 'sw.js'), 'w', encoding='utf-8', newline='').write(SW)
    regen()
print('restored', run())
