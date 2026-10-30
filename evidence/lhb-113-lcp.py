"""LHB-113: what bounds the home's LCP, read from the three home reports in evidence/lhb-113-lh/: the LCP element, the LCP phases
(lcp-breakdown-insight), the unused-javascript items, and the script requests that end before the LCP image request starts.
usage: python evidence/lhb-113-lcp.py"""
import json, os

D = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'lhb-113-lh')
for i in (1, 2, 3):
    j = json.load(open(os.path.join(D, 'home%d.json' % i), encoding='utf-8'))
    a = j['audits']
    print('home%d: LCP %.0f ms (simulated), observed LCP %.0f ms (unthrottled)' % (i, a['largest-contentful-paint']['numericValue'],
          a['metrics']['details']['items'][0].get('observedLargestContentfulPaint', 0)))
    lb = a.get('lcp-breakdown-insight', {}).get('details', {})
    for it in lb.get('items', []):
        if it.get('type') == 'node':
            print('  LCP element:', it.get('selector'), '|', (it.get('nodeLabel') or '')[:60])
        for row in it.get('items', []) if isinstance(it.get('items'), list) else []:
            if 'label' in row or 'subpart' in row:
                print('  phase %-28s %7.0f ms (observed)' % (row.get('label') or row.get('subpart'), row.get('duration', 0)))
    for it in a['unused-javascript'].get('details', {}).get('items', []):
        print('  unused JS: %-50s %6.1f of %6.1f KiB' % (it['url'].split('/')[-1][:50], it.get('wastedBytes', 0) / 1024, it.get('totalBytes', 0) / 1024))
    lcp_req = None
    reqs = a['network-requests']['details']['items']
    obs = a['metrics']['details']['items'][0].get('observedLargestContentfulPaint', 0)
    imgs = [r for r in reqs if r.get('resourceType') == 'Image' and r.get('networkRequestTime', 1e9) < obs]
    scripts = [r for r in reqs if r.get('resourceType') == 'Script']
    print('  scripts: %d, last script ends %.0f ms; images requested before observed LCP: %d, first at %.0f ms' % (
        len(scripts), max((r.get('networkEndTime', 0) for r in scripts), default=0), len(imgs), min((r.get('networkRequestTime', 0) for r in imgs), default=0)))
