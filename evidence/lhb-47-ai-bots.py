"""Count requests from known AI crawlers on lahojaboricua.com through the Cloudflare GraphQL Analytics API.
Reads CLOUDFLARE_API_TOKEN from the environment; prints the counts or the API's own error. Never prints the token.
The crawler filter runs in the query (OR of userAgent_like), so the row limit applies to crawler user agents only; a
result that reaches the limit is refused (exit 3) rather than reported, because it may be cut short.
usage: python lhb-47-ai-bots.py DAYS"""
import json, os, sys, urllib.request, datetime
ZONE = '25ebca85f3121058137e3ea8b5a65c43'
LIMIT = 10000
days = int(sys.argv[1]) if len(sys.argv) > 1 else 7
end = datetime.datetime.now(datetime.timezone.utc).replace(microsecond=0)
start = end - datetime.timedelta(days=days)
BOTS = ['GPTBot', 'ChatGPT-User', 'OAI-SearchBot', 'ClaudeBot', 'Claude-User', 'Claude-SearchBot', 'PerplexityBot', 'Perplexity-User',
        'Google-Extended', 'Applebot', 'Bytespider', 'CCBot', 'Amazonbot', 'meta-externalagent', 'DuckAssistBot', 'MistralAI-User']
q = '''query($zone:String!,$filter:ZoneHttpRequestsAdaptiveGroupsFilter_InputObject!){viewer{zones(filter:{zoneTag:$zone}){
  httpRequestsAdaptiveGroups(limit:%d,filter:$filter,orderBy:[count_DESC]){count dimensions{userAgent}}}}}''' % LIMIT
flt = {'datetime_geq': start.isoformat().replace('+00:00', 'Z'), 'datetime_lt': end.isoformat().replace('+00:00', 'Z'),
       'requestSource': 'eyeball', 'OR': [{'userAgent_like': '%' + b + '%'} for b in BOTS]}
body = json.dumps({'query': q, 'variables': {'zone': ZONE, 'filter': flt}}).encode()
req = urllib.request.Request('https://api.cloudflare.com/client/v4/graphql', body, {'Authorization': 'Bearer ' + os.environ['CLOUDFLARE_API_TOKEN'], 'Content-Type': 'application/json'})
d = json.load(urllib.request.urlopen(req))
if d.get('errors'): print('errors:', json.dumps(d['errors'])[:600]); sys.exit(1)
rows = d['data']['viewer']['zones'][0]['httpRequestsAdaptiveGroups']
if len(rows) >= LIMIT:
    print('INCOMPLETE: %d crawler user-agent groups returned, the limit; counts not reported. Shorten DAYS.' % len(rows)); sys.exit(3)
tot = {b: 0 for b in BOTS}
for r in rows:
    ua = (r['dimensions']['userAgent'] or '').lower()
    for b in BOTS:  # a user agent naming two crawlers counts once, under the first in BOTS
        if b.lower() in ua: tot[b] += r['count']; break
print('window', start.isoformat(), 'to', end.isoformat(), '| crawler user-agent groups read', len(rows), '| requests in those groups', sum(r['count'] for r in rows))
for b in BOTS: print('%-20s %d' % (b, tot[b]))
print('AI crawlers total', sum(tot.values()))
