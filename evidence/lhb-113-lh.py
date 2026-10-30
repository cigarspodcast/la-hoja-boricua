"""LHB-113: first-visit cost, measured. Lighthouse 13.6.0, mobile (its default: simulated throttling, a mid-tier phone on slow 4G),
performance only, headless Chrome, three runs each of production's home (the app: every script loads) and of one cigar page (where
search lands: a static page), interleaved, under a CORRUPTIBLE host claim that refuses to start while any other claim is OPEN.
Writes the JSON reports to evidence/lhb-113-lh/ and prints one row per run, from the reports.
usage: python evidence/lhb-113-lh.py"""
import datetime, json, os, re, subprocess, sys

HERE = os.path.dirname(os.path.abspath(__file__))
OUTD = os.path.join(HERE, 'lhb-113-lh')
D = os.path.join(os.path.expanduser('~'), '.claude', 'dev-os', 'ops-records', 'live-runs')
CLAIM = os.path.join(D, 'lhb-113-lighthouse.claim.md')
PAGES = [('home', 'https://lahojaboricua.com/'), ('cigar', 'https://lahojaboricua.com/cigarros/turro-lancero.html')]
NPX = 'npx.cmd' if os.name == 'nt' else 'npx'


def now():
    return datetime.datetime.now(datetime.timezone.utc)


def z(x):
    return x.strftime('%Y-%m-%dT%H:%MZ')


def write_claim(first, body):
    with open(CLAIM, 'w', encoding='utf-8', newline='\n') as f:
        f.write(first + '\n\n' + body)


opened = []
for n in os.listdir(D):
    if n.endswith('.claim.md') and n != os.path.basename(CLAIM):
        with open(os.path.join(D, n), encoding='utf-8', errors='replace') as f:
            if re.match(r'^#\s*OPEN([^A-Za-z0-9_]|$)', f.readline()):
                opened.append(n)
if opened:
    print('OPEN claims, not starting (a timing run waits for every producer):', opened)
    sys.exit(4)
os.makedirs(OUTD, exist_ok=True)
t0 = now()
end = t0 + datetime.timedelta(minutes=8)
body = ('Owner: Alfredo Medina\nSession: LHB-113 (builder, La Hoja Boricua)\nRoot: C:/LHB/lhb-marca-wt\nClaimed at: %s\nExpected window: 8 min.\n'
        'Closes when: the finally block of evidence/lhb-113-lh.py rewrites line 1 as CLOSED when the six runs end.\n\n## What this claim covers\n\n'
        'Six Lighthouse mobile runs against production, timing-sensitive: their result is corrupted by any heavy load on this host.\n' % t0.strftime('%Y-%m-%dT%H:%M:%SZ'))
write_claim('# OPEN: [CORRUPTIBLE] [touched %s] Lighthouse mobile timing runs against production, six runs about eight minutes, until ~%s. LHB lane, LHB-113' % (z(t0), z(end)), body)
rows = []
try:
    print('LHB-113 first-visit cost. Lighthouse 13.6.0, mobile, performance only, simulated throttling, headless Chrome, this host,')
    print('under host claim lhb-113-lighthouse (CORRUPTIBLE), opened %s with no other claim OPEN.' % t0.strftime('%Y-%m-%dT%H:%M:%SZ'))
    print('Counting basis: one Lighthouse run per row, values read from its JSON report: score = categories.performance.score x 100;')
    print('FCP, LCP, TBT, SI, TTI = audits[...].numericValue (simulated, ms); JS KiB = resource-summary script transferSize (compressed, as served);')
    print('unused JS = unused-javascript details.overallSavingsBytes and metricSavings.LCP; unminified JS = unminified-javascript overallSavingsBytes;')
    print('script eval = bootup-time details, sum of scripting ms over every script.')
    print('')
    print('run        time      score   FCP    LCP    TBT     SI    TTI   JS KiB  unused KiB (LCP ms)  unminified KiB  script eval ms')
    for i in (1, 2, 3):
        for name, url in PAGES:
            out = os.path.join(OUTD, '%s%d.json' % (name, i))
            ts = now().strftime('%H:%M:%S')
            r = subprocess.run([NPX, '-y', 'lighthouse@13.6.0', url, '--only-categories=performance', '--output=json', '--output-path=' + out,
                                '--chrome-flags=--headless=new', '--quiet'], capture_output=True, text=True, encoding='utf-8', errors='replace')
            if r.returncode != 0 or not os.path.exists(out):
                print('%-9s  %s  FAILED rc %s: %s' % (name + str(i), ts, r.returncode, (r.stderr or r.stdout)[-300:]))
                continue
            j = json.load(open(out, encoding='utf-8'))
            a = j['audits']
            v = lambda k: a[k].get('numericValue') or 0
            js = sum(x['transferSize'] for x in a['resource-summary']['details']['items'] if x['resourceType'] == 'script')
            uj = a['unused-javascript']
            um = a['unminified-javascript']
            ev = sum(x.get('scripting', 0) for x in a['bootup-time'].get('details', {}).get('items', []))
            row = dict(name=name, i=i, score=round(j['categories']['performance']['score'] * 100), fcp=v('first-contentful-paint'), lcp=v('largest-contentful-paint'),
                       tbt=v('total-blocking-time'), si=v('speed-index'), tti=v('interactive'), js=js / 1024,
                       unused=(uj.get('details', {}).get('overallSavingsBytes') or 0) / 1024, unusedlcp=(uj.get('metricSavings') or {}).get('LCP', 0),
                       unmin=(um.get('details', {}).get('overallSavingsBytes') or 0) / 1024, ev=ev)
            rows.append(row)
            print('%-9s  %s  %5d %6.0f %6.0f %6.0f %6.0f %6.0f %8.1f %11.1f (%4.0f) %15.1f %15.0f' % (name + str(i), ts, row['score'], row['fcp'], row['lcp'], row['tbt'], row['si'], row['tti'],
                                                                                           row['js'], row['unused'], row['unusedlcp'], row['unmin'], row['ev']))
    print('')
    for name, _ in PAGES:
        rs = [r for r in rows if r['name'] == name]
        if not rs:
            continue
        med = lambda k: sorted(r[k] for r in rs)[len(rs) // 2]
        print('%-6s median of %d: score %d, FCP %.0f, LCP %.0f, TBT %.0f, TTI %.0f ms; JS %.1f KiB; unused JS %.1f KiB (LCP savings %.0f ms); unminified %.1f KiB' % (
            name, len(rs), med('score'), med('fcp'), med('lcp'), med('tbt'), med('tti'), med('js'), med('unused'), med('unusedlcp'), med('unmin')))
finally:
    t1 = now()
    write_claim('# CLOSED: [touched %s] no live run. Closed %s. LHB lane, LHB-113' % (z(t1), t1.strftime('%Y-%m-%dT%H:%M:%SZ')), body + '\nRuns ended: %d of 6 reports read.\n' % len(rows))
    print('claim closed %s; %d of 6 runs read' % (t1.strftime('%Y-%m-%dT%H:%M:%SZ'), len(rows)))
sys.exit(0 if len(rows) == 6 else 1)
