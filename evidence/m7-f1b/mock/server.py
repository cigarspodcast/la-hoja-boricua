"""Mock server for screenshots of the signed-in screens of La Hoja Boricua.

Usage:  python server.py ROOT PORT [--host 127.0.0.1] [--pidfile FILE] [--no-img-rewrite]

ROOT is the site/ folder. Python standard library only. Nothing on disk is changed:
every rewrite happens on the text being served.

What it does
- Serves ROOT as static files (clean URLs: /privacidad -> privacidad.html; 404.html on a miss).
- hoja.js: the two Clerk script URLs become /__mock/clerk.js and /__mock/ui.js.
- app.js, cuenta.js, hoja.js: the Clerk image host literal 'https://img.clerk.com/' becomes
  (location.origin+'/__clerkimg/'), because the client only shows a profile photo whose URL starts
  with that host. Turn this off with --no-img-rewrite (photos then fall back to initials).
- sw.js: replaced by a service worker that clears its caches and unregisters itself, so a cached
  copy of the original hoja.js can never be served on this origin.
- /api/*: canned, stateful (in memory) answers shaped like functions/api/*.js.
- /u/<handle>: a Python port of renderPassport in functions/u/[handle].js.
- /__mock/seed?to=<hash>: stores the saved account (vb_cuenta2) and skips the splash, then opens /<hash>.
- /__mock/reset?to=<hash>: resets the server state and this origin's localStorage and sessionStorage.
- /__mock/state: the server state as JSON (debugging).
"""
import argparse
import datetime
import json
import os
import re
import sys
import threading
import unicodedata
import urllib.parse
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from html import escape as _hesc

# ---------------------------------------------------------------- rewrites

CLERK_JS = 'https://${CLERK.fapi}/npm/@clerk/clerk-js@6/dist/clerk.browser.js'
CLERK_UI = 'https://${CLERK.fapi}/npm/@clerk/ui@1/dist/ui.browser.js'
IMG_LIT = "'https://img.clerk.com/'"
IMG_NEW = "(location.origin+'/__clerkimg/')"
IMG_FILES = ('app.js', 'cuenta.js', 'hoja.js')

OPTS = {'img_rewrite': True}


def rewrite(name, text):
    """Returns (text, notes). notes lists what was replaced, or MISSING lines."""
    notes = []
    if name == 'hoja.js':
        for old, new in ((CLERK_JS, '/__mock/clerk.js'), (CLERK_UI, '/__mock/ui.js')):
            n = text.count(old)
            notes.append('%s x%d' % (new, n) if n == 1 else 'MISSING or repeated (%d): %s' % (n, old))
            text = text.replace(old, new)
    if OPTS['img_rewrite'] and name in IMG_FILES:
        n = text.count(IMG_LIT)
        notes.append('img host x%d' % n if n else 'MISSING img host literal')
        text = text.replace(IMG_LIT, IMG_NEW)
    return text, notes


MOCK_SW = r"""/* mock67: clears this origin's caches and unregisters itself */
self.addEventListener('install',()=>self.skipWaiting());
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(ks=>Promise.all(ks.map(k=>caches.delete(k)))).then(()=>self.registration.unregister())));
"""

MOCK_UI = r"""/* mock67: stands in for @clerk/ui; the sign-in screens are never drawn */
window.__internal_ClerkUICtor=class ClerkUIMock{constructor(){}};
"""

# window.Clerk as the app uses it: load, user, session.getToken, addListener, openSignIn, signOut,
# user.setProfileImage + user.reload (the photo goes to POST /__mock/avatar), user.update.
MOCK_CLERK = r"""/* mock67: a signed-in window.Clerk, no network except this server */
(function(){'use strict';
 var O=location.origin,IMG=O+'/__clerkimg/',U=__USER__;
 var listeners=[];
 var note=function(m){try{console.info('[mock clerk] '+m)}catch(e){}};
 var user={id:U.id,firstName:U.firstName,lastName:U.lastName,fullName:U.firstName+' '+U.lastName,username:U.username,
  hasImage:true,imageUrl:IMG+U.image,
  primaryEmailAddress:{emailAddress:U.email},emailAddresses:[{emailAddress:U.email}],
  setProfileImage:async function(o){var f=o&&o.file;if(!f)throw new Error('no file');
   var r=await fetch('/__mock/avatar',{method:'POST',headers:{'Content-Type':f.type||'application/octet-stream'},body:f});
   if(!r.ok)throw new Error('upload '+r.status);var j=await r.json();this._next=IMG+j.name;return {}},
  reload:async function(){if(this._next){this.imageUrl=this._next;this._next=null}return this},
  update:async function(p){if(p&&typeof p==='object'){for(var k in p)if(Object.prototype.hasOwnProperty.call(p,k))this[k]=p[k]}return this}};
 var session={id:'sess_demo',status:'active',user:user,
  getToken:async function(){return 'mock-session-token.'+user.id}};
 window.Clerk={version:'mock67',loaded:false,user:user,session:session,isSignedIn:true,
  load:async function(){this.loaded=true;return this},
  addListener:function(f){listeners.push(f);return function(){var i=listeners.indexOf(f);if(i>=0)listeners.splice(i,1)}},
  openSignIn:function(){note('openSignIn ignored (already signed in)')},
  openSignUp:function(){note('openSignUp ignored')},
  closeSignIn:function(){},closeSignUp:function(){},
  signOut:async function(){note('signOut ignored: the mock stays signed in')},
  setActive:async function(){},
  mountSignIn:function(){},unmountSignIn:function(){}};
 note('signed in as '+user.id);
})();
"""

# ---------------------------------------------------------------- data

MES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
HANDLE_RE = re.compile(r'^[a-z0-9_]{3,20}$')
KINDS = ['artesanos', 'cigarros', 'lugares']
ME = 'user_demo'

# key served at /__clerkimg/<key> -> file under ROOT
AVATARS = {
    'av-ana.webp': 'img/logos/el-buho-ricamontes.webp',
    'av-carlos.webp': 'img/logos/don-collins.webp',
    'av-mari.webp': 'img/logos/cohoba-cigars.webp',
    'av-pepe.webp': 'img/logos/finca-neo-jibairo.webp',
    'av-manu.webp': 'img/logos/el-chapu-pr.webp',
    'av-andres.webp': 'img/logos/cigarros-caimito.webp',
}

PEOPLE0 = [
    dict(uid=ME, handle='ana', first='Ana', last='Rivera', gender='F', birth='1988-04-12', av='av-ana.webp',
         bio='Catadora de Caguas. Maduro con café colao los domingos.', brand='Don Rey Cigar'),
    dict(uid='user_carlos', handle='carlos_humo', first='Carlos', last='Ortiz', gender='M', birth='1979-09-03', av='av-carlos.webp',
         bio='Lounge los viernes, Connecticut los lunes.', brand='Don Collins Cigars'),
    dict(uid='user_mari', handle='mari_tabaco', first='Marisol', last='Vega', gender='F', birth='1991-01-22', av='av-mari.webp',
         bio='Del campo de Lares al humidor.', brand='Tabaco La Altura'),
    dict(uid='user_pepe', handle='pepe_jibaro', first='José', last='Martínez', gender='M', birth='1965-06-30', av='av-pepe.webp',
         bio='Jíbaro de pura cepa. Corojo y ron añejo.', brand='Finca Neo Jibairo'),
    dict(uid='user_manu', handle='manu_rosa', first='Manuel', last='Rosa', gender='M', birth='1984-11-11', av='av-manu.webp',
         bio='Aprendiendo a catar, una vitola a la vez.', brand=''),
    dict(uid='user_andres', handle='andres_pr', first='Andrés', last='Colón', gender='M', birth='1990-02-14', av='av-andres.webp',
         bio='', brand='El Chapu PR'),
]

# (follower, followee)
FOLLOWS0 = [
    (ME, 'user_carlos'), (ME, 'user_mari'), (ME, 'user_pepe'),
    ('user_carlos', ME), ('user_mari', ME), ('user_andres', ME),
    ('user_carlos', 'user_mari'), ('user_mari', 'user_carlos'), ('user_pepe', 'user_carlos'), ('user_manu', 'user_mari'),
]

NOTES = [
    'Tiro perfecto y ceniza firme. Cedro al principio, cacao al final.',
    'Fuerte para la mañana, pero con café negro brilla.',
    'Dulce y cremoso; lo repetiría en la terraza.',
    'Pimienta en el primer tercio, luego se calma. Buen final.',
    'Notas de tierra y cuero. Para una tarde larga.',
    'Liviano y floral. Ideal para empezar.',
]
TAGSETS = [['madera', 'cacao'], ['especias', 'tierra'], ['dulce', 'nuez'], ['especias', 'madera', 'cuero'], ['tierra', 'cuero'], ['floral', 'dulce']]


def public_name(first, last):
    return first + ' ' + last[0].upper() + '.'


def load_bundle(root):
    t = open(os.path.join(root, 'data', 'bundle.js'), encoding='utf-8').read()
    return json.loads(t[t.index('{'):t.rindex('}') + 1])


def day(today, n):
    return (today - datetime.timedelta(days=n)).isoformat()


def build_docs(bundle, today):
    """One Mi Hoja document (schema 1, the synced shape) per user id."""
    arts, cigs, places = bundle['artesanos'], bundle['cigarros'], bundle['places']
    art_name = {a['id']: a['nombre'] for a in arts}

    def entry(i, cig, n_days, public, rating):
        c = cigs[cig % len(cigs)]
        when = day(today, n_days)
        return {'id': 'd_mock_%d' % i, 'fecha': when + 'T20:15:00.000Z', 'cigarId': c['id'], 'nombre': c['nombre'],
                'artesano': art_name.get(c.get('artesano_id'), ''), 'rating': rating, 'notas': NOTES[i % len(NOTES)],
                'tags': TAGSETS[i % len(TAGSETS)], 'fortaleza': 'media', 'pasos': [], 'origen': 'cata', 'foto': '',
                'publica': public, 'consumido': when, 'marca': '', 'actualizado': when + 'T20:15:00.000Z'}

    def stamps(seq, start, n, first_day):
        return {x['id']: day(today, first_day + k * 3) for k, x in enumerate(seq[start:start + n])}

    def doc(diario, s_art, s_cig, s_lug, humidor=None, favs=None, ratings=None):
        return {'schema': 1, 'creado': '2026-03-01T12:00:00.000Z', 'humidor': humidor or [], 'diario': diario,
                'pasaporte': {'artesanos': s_art, 'cigarros': s_cig, 'lugares': s_lug},
                'favs': favs or {'cigarros': [], 'artesanos': [], 'lugares': []}, 'ratings': ratings or {}}

    hum = []
    for k, ci in enumerate((0, 9, 17)):
        c = cigs[ci % len(cigs)]
        hum.append({'id': 'h_mock_%d' % k, 'cigarId': c['id'], 'nombre': c['nombre'], 'artesano': art_name.get(c.get('artesano_id'), ''),
                    'cantidad': [5, 2, 10][k], 'fecha': day(today, 10 + k * 7), 'nota': ['Regalo de cumpleaños', '', 'Caja para la Navidad'][k],
                    'actualizado': day(today, 10 + k * 7) + 'T15:00:00.000Z'})
    ana_diary = [entry(0, 0, 2, True, 5), entry(1, 3, 6, True, 4), entry(2, 9, 12, False, 3), entry(3, 17, 20, True, 4)]
    docs = {
        ME: doc(ana_diary, stamps(arts, 0, 6, 5), stamps(cigs, 0, 7, 4), stamps(places, 0, 6, 3), hum,
                {'cigarros': [cigs[0]['id'], cigs[3]['id'], cigs[9]['id']], 'artesanos': [], 'lugares': []},
                {e['cigarId']: e['rating'] for e in ana_diary}),
        'user_carlos': doc([entry(10, 7, 1, True, 5), entry(11, 12, 4, True, 4), entry(12, 20, 9, True, 3)],
                           stamps(arts, 4, 9, 2), stamps(cigs, 6, 12, 1), stamps(places, 2, 15, 2)),
        'user_mari': doc([entry(13, 25, 0, True, 4), entry(14, 30, 7, True, 5)],
                         stamps(arts, 8, 5, 1), stamps(cigs, 10, 6, 1), stamps(places, 10, 4, 1)),
        'user_pepe': doc([entry(15, 33, 3, True, 5), entry(16, 40, 14, True, 4)],
                         stamps(arts, 12, 3, 2), stamps(cigs, 20, 4, 2), stamps(places, 20, 2, 2)),
        'user_manu': doc([entry(17, 44, 5, True, 3)], stamps(arts, 0, 1, 5), stamps(cigs, 30, 2, 5), {}),
        'user_andres': doc([], {}, stamps(cigs, 35, 1, 9), stamps(places, 30, 1, 9)),
    }
    return docs


class State:
    def __init__(self, root):
        self.root = root
        self.bundle = load_bundle(root)
        self.lock = threading.Lock()
        self.uploads = {}
        self.reset()

    def reset(self):
        with self.lock:
            today = datetime.date.today()
            self.people = {p['uid']: dict(p) for p in PEOPLE0}
            self.follows = set(FOLLOWS0)
            self.docs = build_docs(self.bundle, today)
            # the server copy of ana's Mi Hoja: rev 3, saved yesterday
            self.mihoja = {'rev': 3, 'schema': 1, 'doc': self.docs[ME],
                           'updated_at': day(today, 1) + 'T21:40:00.000Z'}

    # -- reads (call with the lock held)
    def by_handle(self, h):
        h = str(h or '').strip().lower()
        for p in self.people.values():
            if p['handle'] == h:
                return p
        return None

    def doc_of(self, uid):
        return self.mihoja['doc'] if uid == ME else self.docs.get(uid, {})


STATE = None

# ---------------------------------------------------------------- shapes (functions/_lib)


def s_trim(v, n):
    return ''.join(list(v.strip())[:n]) if isinstance(v, str) else ''


DAY_RE = re.compile(r'^\d{4}-\d{2}-\d{2}$')


def public_entry(e):
    r = e.get('rating')
    return {'nombre': s_trim(e.get('nombre'), 80), 'marca': s_trim(e.get('marca'), 60), 'artesano': s_trim(e.get('artesano'), 80),
            'rating': r if isinstance(r, int) and not isinstance(r, bool) and 1 <= r <= 5 else 0,
            'tags': [t for t in (s_trim(t, 40) for t in (e.get('tags') if isinstance(e.get('tags'), list) else [])) if t][:30],
            'notas': s_trim(e.get('notas'), 1000),
            'consumido': e.get('consumido') if isinstance(e.get('consumido'), str) and DAY_RE.match(e.get('consumido')) else None}


def public_doc(doc):
    doc = doc if isinstance(doc, dict) else {}
    diary = doc.get('diario') if isinstance(doc.get('diario'), list) else []
    allp = [public_entry(e) for e in diary if isinstance(e, dict) and e.get('publica') is True]
    order = sorted(range(len(allp)), key=lambda i: (allp[i]['consumido'] or '', -i), reverse=True)
    catas = [allp[i] for i in order]
    pas = doc.get('pasaporte') if isinstance(doc.get('pasaporte'), dict) else {}
    sellos = {k: len(pas[k]) if isinstance(pas.get(k), dict) else 0 for k in KINDS}
    return catas, sellos


def av_url(origin, key):
    return origin + '/__clerkimg/' + key if key else None


def pub_profile(p, origin):
    return {'handle': p['handle'], 'display_name': public_name(p['first'], p['last']) if p['first'] and p['last'] else None,
            'bio': p['bio'] or None, 'favorite_brand': p['brand'] or None, 'avatar_key': av_url(origin, p['av'])}


def person_row(p, origin):
    return {'handle': p['handle'], 'display_name': public_name(p['first'], p['last']), 'avatar_key': av_url(origin, p['av'])}


def counts_of(uid):
    s = STATE
    return {'followers': sum(1 for a, b in s.follows if b == uid), 'following': sum(1 for a, b in s.follows if a == uid)}


def passport_view(p, origin):
    catas, sellos = public_doc(STATE.doc_of(p['uid']))
    return {'profile': pub_profile(p, origin), 'counts': {'catas': len(catas), 'sellos': sellos}, 'catas': catas[:100]}


def fold(s):
    return ''.join(c for c in unicodedata.normalize('NFKD', s) if not unicodedata.combining(c)).lower()


def age_ok(birth, today):
    try:
        b = datetime.date.fromisoformat(birth)
    except (TypeError, ValueError):
        return 'birth_date-invalid'
    if b > today:
        return 'birth_date-future'
    try:
        lim = b.replace(year=b.year + 21)
    except ValueError:
        lim = b.replace(year=b.year + 21, day=28)
    return '' if lim <= today else 'age-under-21'


def check_profile(b, origin):
    if not isinstance(b, dict):
        return {'error': 'bad-body'}
    h = str(b.get('handle') or '').strip().lower()
    if not HANDLE_RE.match(h):
        return {'error': 'handle-invalid'}
    out = {'handle': h}
    for k in ('first_name', 'last_name'):
        v = str(b.get(k) or '').strip()
        if not v:
            return {'error': k + '-required'}
        if len(v) > 50:
            return {'error': k + '-long'}
        out[k] = v
    if b.get('gender') not in ('M', 'F'):
        return {'error': 'gender-required'}
    out['gender'] = b['gender']
    bad = age_ok(b.get('birth_date'), datetime.date.today())
    if bad:
        return {'error': bad}
    out['birth_date'] = b['birth_date']
    bio, brand = str(b.get('bio') or '').strip(), str(b.get('favorite_brand') or '').strip()
    if len(bio) > 160:
        return {'error': 'bio-long'}
    if len(brand) > 60:
        return {'error': 'favorite_brand-long'}
    out['bio'], out['favorite_brand'] = bio, brand
    av = b.get('avatar_url')
    pre = origin + '/__clerkimg/'
    if not av:
        return {'error': 'avatar-required'}
    if not isinstance(av, str) or not av.startswith(pre) or len(av) <= len(pre):
        return {'error': 'avatar-invalid'}
    out['av'] = av[len(pre):]
    return out


def rev_of(h):
    m = re.match(r'^\s*(?:W/)?(?:"(\d{1,9})"|(\d{1,9}))\s*$', str(h if h is not None else ''))
    return int(m.group(1) or m.group(2)) if m else None

# ---------------------------------------------------------------- /u/<handle> (port of renderPassport)


CONTACT = 'sergio@cigarspodcast.com'
ROBOTS = 'noindex, follow'
KIND_LABEL = {'artesanos': 'artesanos', 'cigarros': 'cigarros', 'lugares': 'lugares'}
WHEEL_NAME = {'madera': 'Madera', 'tierra': 'Tierra', 'especias': 'Especias', 'dulce': 'Dulce', 'cacao': 'Cacao / café',
              'frutos': 'Frutos', 'floral': 'Floral', 'cuero': 'Cuero', 'nuez': 'Nuez'}
U_HEADERS = {
    'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store', 'x-robots-tag': ROBOTS,
    'x-content-type-options': 'nosniff',
    'content-security-policy': "default-src 'none'; style-src 'self'; img-src 'self' https://img.clerk.com; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
}


def esc(s):
    return _hesc('' if s is None else str(s), quote=True).replace('&#x27;', '&#39;')


def u_fecha(d):
    return '%d %s %s' % (int(d[8:10]), MES[int(d[5:7]) - 1], d[0:4]) if d else ''


def u_stars(n):
    if not n:
        return '<span class="pp-stars pp-sin">Sin estrellas</span>'
    return '<span class="pp-stars" role="img" aria-label="%d de 5 estrellas">' % n + '★' * n + '☆' * (5 - n) + '</span>'


def u_initials(p):
    w = [x for x in (p.get('display_name') or '').split() if x]
    if w:
        return (w[0][0] + (w[-1][0] if len(w) > 1 else '')).upper()
    return (p['handle'][:1]).upper()


def u_shell(head, main):
    return ('<!doctype html>\n<html lang="es-PR">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1">\n'
            + head + '<meta name="robots" content="' + ROBOTS + '">\n<link rel="stylesheet" href="/u.css">\n</head>\n<body>\n'
            + '<header><a class="brand" href="/">La Hoja <em>Boricua</em></a><a class="app" href="/">Abrir la app</a></header>\n<main>\n' + main + '</main>\n')


def u_not_found():
    return u_shell('<title>Perfil no encontrado | La Hoja Boricua</title>\n',
                   '<h1>Este perfil no está disponible</h1>\n<p class="tag">Puede que el enlace esté viejo o que la persona lo haya quitado.</p>\n<p><a href="/">Ir a La Hoja Boricua</a></p>\n') \
        + '<footer><a href="/">La Hoja Boricua</a></footer>\n</body>\n</html>\n'


def render_passport(v, origin):
    p = v['profile']
    at = '@' + p['handle']
    url, img = origin + '/u/' + p['handle'], origin + '/og.jpg'
    title = at + ' en La Hoja Boricua'
    desc = p['bio'] or ('Las catas públicas de ' + at + ' en La Hoja Boricua.')

    def meta(k, val, attr='property'):
        return '<meta ' + attr + '="' + k + '" content="' + esc(val) + '">\n'
    head = ('<title>' + esc(title) + '</title>\n' + meta('description', desc, 'name') + '<link rel="canonical" href="' + esc(url) + '">\n'
            + meta('og:type', 'profile') + meta('og:site_name', 'La Hoja Boricua') + meta('og:locale', 'es_PR') + meta('og:title', title)
            + meta('og:description', desc) + meta('og:url', url) + meta('og:image', img) + meta('og:image:alt', 'La Hoja Boricua')
            + meta('twitter:card', 'summary_large_image', 'name') + meta('twitter:title', title, 'name')
            + meta('twitter:description', desc, 'name') + meta('twitter:image', img, 'name'))
    if p['avatar_key']:
        av = '<img class="pp-av" src="' + esc(p['avatar_key']) + '" alt="Foto de ' + esc(at) + '" width="96" height="96">'
    else:
        av = '<span class="pp-av pp-ini" aria-hidden="true">' + esc(u_initials(p)) + '</span>'
    main = ('<section class="pp-head">' + av + '<div>' + '<h1>' + esc(p['display_name'] or at) + '</h1>'
            + ('<p class="pp-h">' + esc(at) + '</p>' if p['display_name'] else '')
            + ('<p class="pp-bio">' + esc(p['bio']) + '</p>' if p['bio'] else '')
            + ('<p class="pp-fav">Marca favorita: <b>' + esc(p['favorite_brand']) + '</b></p>' if p['favorite_brand'] else '')
            + '</div></section>\n')
    c = v['counts']
    main += ('<ul class="pp-counts"><li><b>' + str(c['catas']) + '</b><span>' + ('cata pública' if c['catas'] == 1 else 'catas públicas') + '</span></li>'
             + ''.join('<li><b>' + str(c['sellos'][k]) + '</b><span>' + ('sello' if c['sellos'][k] == 1 else 'sellos') + ' de ' + KIND_LABEL[k] + '</span></li>' for k in KIND_LABEL)
             + '</ul>\n')
    main += '<h2 id="catas">Catas públicas</h2>\n'
    catas = v['catas']
    if not catas:
        main += '<p class="pp-empty">Todavía no hay catas públicas.</p>\n'
    else:
        def sub(e):
            return ' · '.join(esc(x) for x in (e['marca'], e['artesano'], u_fecha(e['consumido'])) if x)
        main += '<ul class="pp-grid">' + ''.join(
            '<li><a class="pp-cata" href="#cata-%d"><b>' % (i + 1) + esc(e['nombre'] or 'Cigarro') + '</b>' + u_stars(e['rating'])
            + ('<small>' + esc(u_fecha(e['consumido'])) + '</small>' if e['consumido'] else '') + '</a></li>' for i, e in enumerate(catas)) + '</ul>\n'
        main += ''.join(
            '<article class="pp-card" id="cata-%d" aria-labelledby="cata-%d-t"><div class="pp-card-in">' % (i + 1, i + 1)
            + '<a class="pp-x" href="#catas" aria-label="Cerrar">×</a><h3 id="cata-%d-t">' % (i + 1) + esc(e['nombre'] or 'Cigarro') + '</h3>'
            + ('<p class="pp-sub">' + sub(e) + '</p>' if sub(e) else '') + u_stars(e['rating'])
            + ('<ul class="pp-tags">' + ''.join('<li>' + esc(WHEEL_NAME.get(t, t)) + '</li>' for t in e['tags']) + '</ul>' if e['tags'] else '')
            + ('<p class="pp-notas">' + esc(e['notas']) + '</p>' if e['notas'] else '') + '</div></article>\n' for i, e in enumerate(catas))
    report = 'mailto:' + CONTACT + '?subject=' + urllib.parse.quote('Reportar ' + at, safe="-_.!~*'()") + '&body=' + urllib.parse.quote(url, safe="-_.!~*'()")
    return u_shell(head, main) + '<footer><a href="' + esc(report) + '">Reportar este perfil</a> · <a href="/privacidad">Privacidad</a> · <a href="/">La Hoja Boricua</a></footer>\n</body>\n</html>\n'

# ---------------------------------------------------------------- helper pages


def seed_page(state, to, reset):
    me = state.people[ME]
    acct = {'sub': ME, 'handle': me['handle'], 'name': public_name(me['first'], me['last']), 'avatar_key': me['av']}
    js = json.dumps({'acct': acct, 'to': to, 'reset': reset}).replace('</', '<\\/')
    return ('<!doctype html><meta charset="utf-8"><title>mock67 seed</title><p>Preparando la cuenta de prueba...</p><script>\n'
            '(function(){var S=' + js + ',o=location.origin;\n'
            ' try{if(S.reset){localStorage.clear();sessionStorage.clear()}}catch(e){}\n'
            ' try{localStorage.setItem("vb_cuenta2",JSON.stringify({sub:S.acct.sub,handle:S.acct.handle,name:S.acct.name,avatar:o+"/__clerkimg/"+S.acct.avatar_key}))}catch(e){}\n'
            ' try{sessionStorage.setItem("vb_splash","1")}catch(e){}\n'
            ' location.replace("/"+(S.to||"#/catalogo"))})();\n</script>\n')

# ---------------------------------------------------------------- handler


class Handler(SimpleHTTPRequestHandler):
    server_version = 'mock67'
    extensions_map = dict(SimpleHTTPRequestHandler.extensions_map, **{'.webmanifest': 'application/manifest+json', '.js': 'text/javascript', '.webp': 'image/webp'})

    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()

    def log_message(self, fmt, *args):
        sys.stderr.write('%s %s\n' % (datetime.datetime.now(datetime.timezone.utc).strftime('%H:%M:%SZ'), fmt % args))

    # -- plumbing
    def origin(self):
        return 'http://' + (self.headers.get('Host') or '%s:%d' % self.server.server_address[:2])

    def send_bytes(self, status, data, ctype, extra=None):
        self.send_response(status)
        self.send_header('Content-Type', ctype)
        self.send_header('Content-Length', str(len(data)))
        for k, v in (extra or {}).items():
            self.send_header(k, v)
        self.end_headers()
        if self.command != 'HEAD':
            self.wfile.write(data)

    def send_json(self, obj, status=200):
        self.send_bytes(status, json.dumps(obj, ensure_ascii=False).encode('utf-8'), 'application/json; charset=utf-8')

    def body_json(self):
        n = int(self.headers.get('Content-Length') or 0)
        raw = self.rfile.read(n) if n else b''
        try:
            # like request.json() in the Workers runtime: bad UTF-8 becomes U+FFFD instead of failing
            return json.loads(raw.decode('utf-8', errors='replace')) if raw else None
        except ValueError:
            return ValueError

    def authed(self):
        return (self.headers.get('Authorization') or '').startswith('Bearer ') and len(self.headers.get('Authorization')) > 7

    # -- verbs
    def do_GET(self):
        self.route('GET')

    def do_HEAD(self):
        self.route('HEAD')

    def do_POST(self):
        self.route('POST')

    def do_PUT(self):
        self.route('PUT')

    def do_DELETE(self):
        self.route('DELETE')

    def route(self, m):
        u = urllib.parse.urlsplit(self.path)
        path, q = urllib.parse.unquote(u.path), urllib.parse.parse_qs(u.query)
        try:
            if path.startswith('/api/'):
                return self.api(m, path, q)
            if path.startswith('/__mock/') or path.startswith('/__clerkimg/'):
                return self.mock(m, path, q)
            mu = re.match(r'^/u/([^/]+)/?$', path)
            if mu and m in ('GET', 'HEAD'):
                return self.public_page(mu.group(1))
            if m not in ('GET', 'HEAD'):
                return self.send_json({'error': 'method-not-allowed'}, 405)
            return self.static(path, u.path)
        except (BrokenPipeError, ConnectionResetError):
            pass

    # -- static files with text rewrites
    def static(self, path, raw):
        name = path.rsplit('/', 1)[-1]
        if name == 'sw.js':
            return self.send_bytes(200, MOCK_SW.encode('utf-8'), 'text/javascript; charset=utf-8')
        fs = self.translate_path(raw)
        if not os.path.exists(fs) and not path.endswith('/') and os.path.isfile(fs + '.html'):
            fs = fs + '.html'
        if os.path.isdir(fs):
            if not path.endswith('/'):
                self.send_response(301)
                self.send_header('Location', path + '/')
                self.send_header('Content-Length', '0')
                self.end_headers()
                return
            fs = os.path.join(fs, 'index.html')
        if not os.path.isfile(fs):
            nf = os.path.join(STATE.root, '404.html')
            data = open(nf, 'rb').read() if os.path.isfile(nf) else b'not found'
            return self.send_bytes(404, data, 'text/html; charset=utf-8')
        base = os.path.basename(fs)
        if base in IMG_FILES and os.path.dirname(os.path.abspath(fs)) == os.path.abspath(STATE.root):
            text, notes = rewrite(base, open(fs, encoding='utf-8').read())
            return self.send_bytes(200, text.encode('utf-8'), 'text/javascript; charset=utf-8', {'X-Mock-Rewrite': '; '.join(notes) or 'none'})
        ctype = self.guess_type(fs)
        if ctype.startswith('text/') or ctype in ('application/javascript', 'application/json', 'application/manifest+json'):
            ctype += '; charset=utf-8'
        return self.send_bytes(200, open(fs, 'rb').read(), ctype)

    # -- mock helpers
    def mock(self, m, path, q):
        to = (q.get('to') or ['#/catalogo'])[0]
        if path == '/__mock/clerk.js':
            with STATE.lock:
                me = STATE.people[ME]
                user = {'id': ME, 'firstName': me['first'], 'lastName': me['last'], 'username': me['handle'], 'image': me['av'], 'email': 'ana.rivera@example.test'}
            return self.send_bytes(200, MOCK_CLERK.replace('__USER__', json.dumps(user)).encode('utf-8'), 'text/javascript; charset=utf-8')
        if path == '/__mock/ui.js':
            return self.send_bytes(200, MOCK_UI.encode('utf-8'), 'text/javascript; charset=utf-8')
        if path == '/__mock/seed':
            return self.send_bytes(200, seed_page(STATE, to, False).encode('utf-8'), 'text/html; charset=utf-8')
        if path == '/__mock/reset':
            STATE.reset()
            return self.send_bytes(200, seed_page(STATE, to, True).encode('utf-8'), 'text/html; charset=utf-8')
        if path == '/__mock/state':
            with STATE.lock:
                return self.send_json({'people': list(STATE.people.values()), 'follows': sorted(STATE.follows),
                                       'mihoja': {k: STATE.mihoja[k] for k in ('rev', 'updated_at')}, 'uploads': sorted(STATE.uploads)})
        if path == '/__mock/avatar' and m == 'POST':
            n = int(self.headers.get('Content-Length') or 0)
            data = self.rfile.read(n) if n else b''
            if not data:
                return self.send_json({'error': 'empty'}, 400)
            ctype = (self.headers.get('Content-Type') or 'image/jpeg').split(';')[0]
            with STATE.lock:
                name = 'up-%d.%s' % (len(STATE.uploads) + 1, 'png' if 'png' in ctype else 'webp' if 'webp' in ctype else 'jpg')
                STATE.uploads[name] = (data, ctype)
            return self.send_json({'name': name})
        if path.startswith('/__clerkimg/'):
            key = path[len('/__clerkimg/'):]
            with STATE.lock:
                up = STATE.uploads.get(key)
            if up:
                return self.send_bytes(200, up[0], up[1])
            rel = AVATARS.get(key)
            fs = os.path.join(STATE.root, rel) if rel else None
            if fs and os.path.isfile(fs):
                return self.send_bytes(200, open(fs, 'rb').read(), 'image/webp')
            return self.send_bytes(404, b'no image', 'text/plain')
        return self.send_json({'error': 'not-found'}, 404)

    def public_page(self, raw):
        with STATE.lock:
            p = STATE.by_handle(raw) if HANDLE_RE.match(raw.lower()) else None
            body = render_passport(passport_view(p, self.origin()), self.origin()) if p else u_not_found()
        return self.send_bytes(200 if p else 404, body.encode('utf-8'), U_HEADERS['content-type'], {k: v for k, v in U_HEADERS.items() if k not in ('content-type', 'cache-control')})

    # -- the API
    def api(self, m, path, q):
        o = self.origin()
        one = lambda k: (q.get(k) or [None])[0]
        need_json_body = m in ('POST', 'PUT', 'DELETE') and path in ('/api/profile', '/api/mihoja', '/api/follow', '/api/account')
        if need_json_body and not re.match(r'^application/json\b', self.headers.get('Content-Type') or '', re.I):
            return self.send_json({'error': 'bad-type'}, 415)
        body = self.body_json() if m in ('POST', 'PUT', 'DELETE') else None
        if body is ValueError:
            return self.send_json({'error': 'bad-body'}, 400)
        public = path.startswith('/api/u/') or path in ('/api/followers', '/api/following') or (path == '/api/follow' and m == 'GET')
        if not public and not self.authed():
            return self.send_json({'error': 'no-session'}, 401)
        with STATE.lock:
            s = STATE
            me = s.people[ME]
            if path == '/api/me' and m == 'GET':
                return self.send_json({'profile': {'handle': me['handle'], 'display_name': public_name(me['first'], me['last']), 'bio': me['bio'] or None,
                                                   'favorite_brand': me['brand'] or None, 'avatar_key': av_url(o, me['av']), 'first_name': me['first'],
                                                   'last_name': me['last'], 'gender': me['gender'], 'birth_date': me['birth']}, 'needsIdentity': False})
            if path == '/api/profile':
                if m == 'POST':
                    return self.send_json({'error': 'profile-exists'}, 409)
                if m == 'PUT':
                    if not (isinstance(body, dict) and 'avatar_url' in body):
                        return self.send_json({'error': 'identity-exists'}, 409)
                    p = check_profile(body, o)
                    if p.get('error'):
                        return self.send_json({'error': p['error']}, 400)
                    other = s.by_handle(p['handle'])
                    if other and other['uid'] != ME:
                        return self.send_json({'error': 'handle-taken'}, 409)
                    me.update(handle=p['handle'], first=p['first_name'], last=p['last_name'], gender=p['gender'], birth=p['birth_date'],
                              bio=p['bio'], brand=p['favorite_brand'], av=p['av'])
                    return self.send_json({'profile': {'handle': me['handle'], 'display_name': public_name(me['first'], me['last']), 'bio': me['bio'] or None,
                                                       'favorite_brand': me['brand'] or None, 'avatar_key': av_url(o, me['av'])}})
            if path == '/api/handle' and m == 'GET':
                h = str(one('h') or '').strip().lower()
                if not HANDLE_RE.match(h):
                    return self.send_json({'available': False, 'reason': 'invalid'})
                p = s.by_handle(h)
                return self.send_json({'available': True} if not p or p['uid'] == ME else {'available': False, 'reason': 'taken'})
            if path == '/api/mihoja':
                cur = s.mihoja
                if m == 'GET':
                    return self.send_json({k: cur[k] for k in ('rev', 'schema', 'doc', 'updated_at')})
                if m == 'PUT':
                    rev = rev_of(self.headers.get('If-Match'))
                    if rev is None:
                        return self.send_json({'error': 'if-match-required'}, 428)
                    if not isinstance(body, dict) or not isinstance(body.get('doc'), dict):
                        return self.send_json({'error': 'bad-doc'}, 400)
                    if body.get('schema') != 1:
                        return self.send_json({'error': 'schema-unsupported'}, 400)
                    if rev != cur['rev']:
                        return self.send_json({'error': 'conflict', 'rev': cur['rev'], 'schema': cur['schema'], 'doc': cur['doc'], 'updated_at': cur['updated_at']}, 409)
                    t = datetime.datetime.now(datetime.timezone.utc)
                    at = t.strftime('%Y-%m-%dT%H:%M:%S.') + '%03dZ' % (t.microsecond // 1000)
                    s.mihoja = {'rev': rev + 1, 'schema': 1, 'doc': body['doc'], 'updated_at': at}
                    return self.send_json({'rev': rev + 1, 'updated_at': at})
            if path == '/api/feed' and m == 'GET':
                items = []
                for a, b in s.follows:
                    if a != ME or b not in s.people:
                        continue
                    p = s.people[b]
                    catas, _ = public_doc(s.doc_of(b))
                    items += [{'author': person_row(p, o), 'entry': e} for e in catas]
                items.sort(key=lambda x: (x['entry']['consumido'] or '', x['author']['handle']), reverse=True)
                return self.send_json({'items': items[:20], 'next': None})
            if path == '/api/people' and m == 'GET':
                raw = one('q')
                qq = re.sub(r'\s+', ' ', str(raw or '').strip().lstrip('@'))
                if len(qq) < 2:
                    return self.send_json({'error': 'q-short'}, 400)
                if len(qq) > 40:
                    return self.send_json({'error': 'q-long'}, 400)
                f = fold(qq)
                hits = [p for p in s.people.values() if p['uid'] != ME and any(fold(x).startswith(f) for x in (p['handle'], p['first'], p['last'], p['first'] + ' ' + p['last']))]
                hits.sort(key=lambda p: p['handle'])
                return self.send_json({'people': [person_row(p, o) for p in hits[:20]], 'next': None})
            if path == '/api/follow':
                if m == 'GET':
                    p = s.by_handle(one('handle'))
                    if not p:
                        return self.send_json({'error': 'not-found'}, 404)
                    signed = self.authed()
                    out = {'handle': p['handle'], 'display_name': public_name(p['first'], p['last']), 'avatar_key': av_url(o, p['av']), **counts_of(p['uid']),
                           'self': signed and p['uid'] == ME, 'viewerFollows': None}
                    if signed and p['uid'] != ME:
                        out['viewerFollows'] = (ME, p['uid']) in s.follows
                    return self.send_json(out)
                if not isinstance(body, dict):
                    return self.send_json({'error': 'bad-body'}, 400)
                p = s.by_handle(body.get('handle'))
                if not p:
                    return self.send_json({'error': 'not-found'}, 404)
                if m == 'POST':
                    if p['uid'] == ME:
                        return self.send_json({'error': 'self-follow'}, 400)
                    s.follows.add((ME, p['uid']))
                    return self.send_json({'following': True, 'followers': counts_of(p['uid'])['followers']})
                if m == 'DELETE':
                    s.follows.discard((ME, p['uid']))
                    return self.send_json({'following': False, 'followers': counts_of(p['uid'])['followers']})
            if path in ('/api/followers', '/api/following') and m == 'GET':
                p = s.by_handle(one('handle'))
                if not p:
                    return self.send_json({'error': 'not-found'}, 404)
                ids = [a for a, b in s.follows if b == p['uid']] if path == '/api/followers' else [b for a, b in s.follows if a == p['uid']]
                ppl = sorted((s.people[i] for i in ids if i in s.people), key=lambda x: x['handle'])
                return self.send_json({'people': [person_row(x, o) for x in ppl], 'next': None})
            mu = re.match(r'^/api/u/([^/]+)$', path)
            if mu and m == 'GET':
                p = s.by_handle(mu.group(1)) if HANDLE_RE.match(mu.group(1).lower()) else None
                if not p:
                    return self.send_json({'error': 'not-found'}, 404)
                v = passport_view(p, o)
                c = counts_of(p['uid'])
                return self.send_json({'profile': v['profile'], 'counts': {'resenas': v['counts']['catas'], 'followers': c['followers'], 'following': c['following'],
                                                                           'sellos': v['counts']['sellos']}, 'resenas': v['catas']})
            if path == '/api/account' and m == 'DELETE':
                typed = str((body or {}).get('confirm') or '').strip().lstrip('@').lower() if isinstance(body, dict) else ''
                if not typed or typed != me['handle'].lower():
                    return self.send_json({'error': 'confirm-mismatch'}, 400)
                deleted = True
            else:
                deleted = False
        if deleted:
            STATE.reset()  # the mock "deletes" by going back to the seed data
            return self.send_json({'ok': True})
        return self.send_json({'error': 'not-found'}, 404)


def main():
    ap = argparse.ArgumentParser(description='La Hoja Boricua mock server (screenshots of signed-in screens)')
    ap.add_argument('root', help='the site/ folder')
    ap.add_argument('port', type=int)
    ap.add_argument('--host', default='127.0.0.1')
    ap.add_argument('--pidfile', help='write this process id here')
    ap.add_argument('--no-img-rewrite', action='store_true', help="leave 'https://img.clerk.com/' alone (photos fall back to initials)")
    a = ap.parse_args()
    root = os.path.abspath(a.root)
    OPTS['img_rewrite'] = not a.no_img_rewrite
    # refuse to start if a rewrite target is gone: a silent miss would load the real Clerk
    bad = []
    for name in ('hoja.js',) + (IMG_FILES if OPTS['img_rewrite'] else ()):
        fs = os.path.join(root, name)
        if not os.path.isfile(fs):
            bad.append(name + ': file missing')
            continue
        _, notes = rewrite(name, open(fs, encoding='utf-8').read())
        bad += [name + ': ' + n for n in notes if n.startswith('MISSING')]
    if bad:
        sys.stderr.write('mock67: cannot start, rewrite targets not found:\n  ' + '\n  '.join(bad) + '\n')
        sys.exit(2)
    global STATE
    STATE = State(root)

    def handler(*args, **kw):
        return Handler(*args, directory=root, **kw)
    # LHB-71: the default listen backlog of 5 overflows on Windows when the page and the service worker's precache fetch together;
    # Chrome then gets ERR_CONNECTION_REFUSED for one script and the page stays blank (measured 2 stalls in 10 runs at 320 by 568)
    ThreadingHTTPServer.request_queue_size = 128
    srv = ThreadingHTTPServer((a.host, a.port), handler)
    pid = os.getpid()
    if a.pidfile:
        with open(a.pidfile, 'w', encoding='ascii') as f:
            f.write(str(pid))
    print('mock67 serving %s at http://%s:%d/ pid %d' % (root, a.host, a.port, pid), flush=True)
    print('open http://%s:%d/__mock/seed?to=%%23/mihoja/perfil first' % (a.host, a.port), flush=True)
    try:
        srv.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        srv.server_close()


if __name__ == '__main__':
    main()
