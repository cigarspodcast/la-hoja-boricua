"""LHB-56: la prueba de que las pruebas nuevas pueden fallar. Cada mutación rompe una línea de lo que se entrega,
corre `node --test test/site.test.js` y debe dar al menos una prueba en rojo. Al final todo se restaura byte por byte.
Uso: python evidence/lhb-52-mutations.py  (desde la raíz del repositorio); con --check solo comprueba que cada texto a mutar aparece una vez."""
import os, re, subprocess, sys
R = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

sys.stdout.reconfigure(encoding='utf-8')

def run():
    p = subprocess.run(['node', '--test', '--test-timeout=60000', 'test/site.test.js'], cwd=R, capture_output=True, text=True, encoding='utf-8')
    # una prueba que se cuelga hasta el tiempo límite sale como cancelled, no como fail: cuenta como roja
    fail = int(re.search(r'^ℹ fail (\d+)', p.stdout, re.M).group(1)) + int(re.search(r'^ℹ cancelled (\d+)', p.stdout, re.M).group(1))
    names = sorted(set(re.findall(r'^✖ (.+?) \(\d', p.stdout, re.M)))
    return fail, names

PF = 'functions/_lib/profile.js'
AP = 'functions/api/profile.js'
ME = 'functions/api/me.js'
CU = 'site/cuenta.js'
HO = 'site/hoja.js'

# (nombre, archivo, texto exacto que existe una vez, texto que lo reemplaza); el texto puede abarcar varias líneas
FL = 'functions/_lib/follow.js'
FW = 'functions/api/follow.js'
FF = 'functions/api/followers.js'
MG = 'migrations/0004_follows.sql'

MUTS = [
    # la tabla
    ('M1 tabla: alguien puede seguirse a sí mismo (sin el CHECK)', MG, "PRIMARY KEY (follower_id, followee_id),\n  CHECK (follower_id <> followee_id)\n", "PRIMARY KEY (follower_id, followee_id)\n"),
    ('M2 tabla: el mismo par se puede repetir (sin llave)', MG, "  PRIMARY KEY (follower_id, followee_id),\n", ""),
    ('M3 tabla: borrar a quien es seguido deja filas (sin cascada en followee_id)', MG, "followee_id TEXT NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,", "followee_id TEXT NOT NULL REFERENCES profiles(user_id),"),
    ('M4 tabla: borrar a quien sigue deja filas (sin cascada en follower_id)', MG, "follower_id TEXT NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,", "follower_id TEXT NOT NULL REFERENCES profiles(user_id),"),
    ('M5 tabla: sin índice por seguidores', MG, "CREATE INDEX follows_by_followee ON follows (followee_id, created_at DESC);\n", ""),
    # las reglas
    ('L1 reglas: se puede seguir a un perfil oculto', FL, "(hidden ? '' : ' AND hidden = 0')", "''"),
    ('L2 reglas: el conteo de seguidores cuenta perfiles ocultos', FL, "WHERE f.followee_id = ?1 AND p.hidden = 0'", "WHERE f.followee_id = ?1'"),
    ('L3 reglas: el conteo de seguidos cuenta perfiles ocultos', FL, "WHERE f.follower_id = ?1 AND p.hidden = 0'", "WHERE f.follower_id = ?1'"),
    ('L4 reglas: las listas incluyen perfiles ocultos', FL, "' WHERE f.' + mine + ' = ?1 AND p.hidden = 0' +", "' WHERE f.' + mine + ' = ?1' +"),
    ('L5 reglas: las listas salen de la más vieja a la más nueva', FL, "ORDER BY f.created_at DESC, p.handle DESC", "ORDER BY f.created_at ASC, p.handle ASC"),
    ('L6 reglas: la página es de 21', FL, "export const PAGE = 20;", "export const PAGE = 21;"),
    ('L7 reglas: el cursor repite a la última persona', FL, "(f.created_at < ?2 OR (f.created_at = ?2 AND p.handle < ?3))", "(f.created_at <= ?2 OR (f.created_at = ?2 AND p.handle < ?3))"),
    ('L8 reglas: el cursor se salta a las del mismo instante', FL, "(f.created_at < ?2 OR (f.created_at = ?2 AND p.handle < ?3))", "(f.created_at < ?2)"),
    ('L9 reglas: cada persona de la lista trae la fecha en que la siguió', FL, "avatar_key: r.avatar_key }))", "avatar_key: r.avatar_key, created_at: r.created_at }))"),
    ('L10 reglas: un cursor malo se acepta como si no hubiera', FL, ": { error: 'bad-cursor' };", ": { cursor: null };"),
    ('L11 reglas: ya hay bloqueos entre todos', FL, "export async function isBlocked(db, a, b) {\n  return false;\n}", "export async function isBlocked(db, a, b) {\n  return true;\n}"),
    ('L12 reglas: el tope por hora es de 61', FL, "export const FOLLOW_PER_HOUR = 60;", "export const FOLLOW_PER_HOUR = 61;"),
    ('L13 reglas: el tope total es de 5001', FL, "export const FOLLOW_MAX = 5000;", "export const FOLLOW_MAX = 5001;"),
    ('L14 reglas: una lista de un perfil oculto se entrega', FL, "const who = await targetOf(env.DB, q.get('handle'));", "const who = await targetOf(env.DB, q.get('handle'), { hidden: true });"),
    ('L15 reglas: un @ que no es texto se toma por texto', FL, "  if (typeof rawHandle !== 'string') return null;\n", ""),
    # los pedidos
    ('F1 seguir: uno puede seguirse a sí mismo', FW, "  if (who.user_id === me) return json({ error: 'self-follow' }, 400);\n", ""),
    ('F2 seguir: repetir un seguir ya hecho gasta tope', FW, "  if (!had) {", "  if (true) {"),
    ('F3 seguir: el tope por hora no se revisa', FW, "    if (hour.n >= FOLLOW_PER_HOUR) return json({ error: 'follow-rate' }, 429);\n", ""),
    ('F4 seguir: el tope total no se revisa', FW, "    if (all.n >= FOLLOW_MAX) return json({ error: 'follow-cap' }, 429);\n", ""),
    ('F5 seguir: la ventana del tope es de diez horas', FW, "now.getTime() - 3600e3", "now.getTime() - 36000e3"),
    ('F6 seguir: el bloqueo no se pregunta', FW, "  if (await isBlocked(env.DB, me, who.user_id)) return json({ error: 'blocked' }, 403);\n", ""),
    ('F7 seguir: acepta cualquier tipo de contenido', FW, "  if (!/^application\\/json\\b/i.test(request.headers.get('Content-Type') || '')) return { res: json({ error: 'bad-type' }, 415) };\n", ""),
    ('F8 seguir: devuelve cuántas personas sigue la otra y no cuántas la siguen', FW, "return json({ following: true, followers: (await countsOf(env.DB, who.user_id)).followers });", "return json({ following: true, followers: (await countsOf(env.DB, who.user_id)).following });"),
    ('F9 dejar de seguir: no se puede dejar de seguir a un perfil que se ocultó', FW, "intake(request, env, { hidden: true })", "intake(request, env)"),
    ('F10 dejar de seguir: borra la fila al revés', FW, "DELETE FROM follows WHERE follower_id = ?1 AND followee_id = ?2", "DELETE FROM follows WHERE follower_id = ?2 AND followee_id = ?1"),
    ('F11 estado: viewerFollows dice siempre que sí', FW, "out.viewerFollows = !!(await env.DB", "out.viewerFollows = true || !!(await env.DB"),
    ('F12 lista: seguidores y seguidos al revés', FF, "listResponse(request, env, 'followers')", "listResponse(request, env, 'following')"),
]

def load(rel):
    p = os.path.join(R, *rel.split('/'))
    orig = open(p, 'rb').read()
    text = orig.decode('utf-8')
    return p, orig, '\r\n' in text, text.replace('\r\n', '\n')

def main():
    if '--check' in sys.argv:
        bad = 0
        for name, rel, a, b, *more in MUTS:
            t = load(rel)[3]
            for x in [a] + more[0::2]:
                n = t.count(x)
                if n != 1: bad += 1; print(name, '-> aparece', n, 'veces')
        print('mutaciones:', len(MUTS), 'con anclaje malo:', bad)
        return 1 if bad else 0
    base = run()
    print('baseline', base)
    assert base[0] == 0, 'la línea base debe estar en verde'
    bad = 0
    only = [x for x in sys.argv[1:] if not x.startswith('--')]  # p. ej. C6 C7 S8: solo esas mutaciones
    for name, rel, a, b, *more in MUTS:
        if only and name.split()[0] not in only: continue
        p, orig, crlf, t = load(rel)
        if t.count(a) != 1:
            print(name, '-> ERROR: el texto a mutar aparece', t.count(a), 'veces'); bad += 1; continue
        m = t.replace(a, b, 1)
        for a2, b2 in zip(more[0::2], more[1::2]):
            assert m.count(a2) == 1, (name, a2)
            m = m.replace(a2, b2, 1)
        open(p, 'wb').write((m.replace('\n', '\r\n') if crlf else m).encode('utf-8'))
        try:
            fail, names = run()
        finally:
            open(p, 'wb').write(orig)
        verdict = 'ROJO (bien)' if fail > 0 else 'SOBREVIVIÓ'
        if fail == 0: bad += 1
        print(name, '->', verdict, 'fail=%d' % fail)
        for n in names[:4]: print('     ', n[:150])
    final = run()
    print('restaurado', final)
    print('mutaciones:', len(MUTS), 'sobrevivieron o con error:', bad)
    return 0 if bad == 0 and final[0] == 0 else 1

if __name__ == '__main__':
    sys.exit(main())
