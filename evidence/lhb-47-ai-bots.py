"""Count requests from known AI crawlers on lahojaboricua.com through the Cloudflare GraphQL Analytics API.
Reads CLOUDFLARE_API_TOKEN from the environment; prints the counts or the API's own error. Never prints the token.
usage: python aibots.py DAYS"""
import json, os, sys, urllib.request, datetime
ZONE = '25ebca85f3121058137e3ea8b5a65c43'
days = int(sys.argv[1]) if len(sys.argv) > 1 else 7
end = datetime.datetime.now(datetime.timezone.utc).replace(microsecond=0)
start = end - datetime.timedelta(days=days)
BOTS = ['GPTBot', 'ChatGPT-User', 'OAI-SearchBot', 'ClaudeBot', 'Claude-User', 'Claude-SearchBot', 'PerplexityBot', 'Perplexity-User',
        'Google-Extended', 'Applebot', 'Bytespider', 'CCBot', 'Amazonbot', 'meta-externalagent', 'DuckAssistBot', 'MistralAI-User']
q = '''query($zone:String!,$start:Time!,$end:Time!){viewer{zones(filter:{zoneTag:$zone}){
  httpRequestsAdaptiveGroups(limit:1000,filter:{datetime_geq:$start,datetime_lt:$end,requestSource:"eyeball"},orderBy:[count_DESC]){count dimensions{userAgent}}}}}'''
body = json.dumps({'query': q, 'variables': {'zone': ZONE, 'start': start.isoformat().replace('+00:00', 'Z'), 'end': end.isoformat().replace('+00:00', 'Z')}}).encode()
req = urllib.request.Request('https://api.cloudflare.com/client/v4/graphql', body, {'Authorization': 'Bearer ' + os.environ['CLOUDFLARE_API_TOKEN'], 'Content-Type': 'application/json'})
d = json.load(urllib.request.urlopen(req))
if d.get('errors'): print('errors:', json.dumps(d['errors'])[:600]); sys.exit(1)
rows = d['data']['viewer']['zones'][0]['httpRequestsAdaptiveGroups']
tot = {b: 0 for b in BOTS}
for r in rows:
    ua = r['dimensions']['userAgent'] or ''
    for b in BOTS:
        if b.lower() in ua.lower(): tot[b] += r['count']; break
print('window', start.isoformat(), 'to', end.isoformat(), '| user-agent groups read', len(rows), '| all requests in those groups', sum(r['count'] for r in rows))
for b in BOTS: print('%-20s %d' % (b, tot[b]))
print('AI crawlers total', sum(tot.values()))
