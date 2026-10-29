/* LHB-28 / LHB-31: GET y PUT /api/mihoja, la Mi Hoja de la cuenta.
   GET → { rev, schema, doc, updated_at }; sin copia todavía: { rev: 0, schema: null, doc: null }.
   PUT { schema, doc } con If-Match: <rev que el cliente vio> → { rev, updated_at } con el rev nuevo. If-Match: 0 crea la copia.
   Si el rev ya no es ese (otro teléfono guardó antes), 409 { error: 'conflict', rev, schema, doc } con la copia de ahora: el cliente junta las dos y reintenta. Nunca se pisa una copia que el cliente no vio.
   LHB-80: el PUT puede traer X-Op: <id> (lo inventa el cliente); si escribe, el id queda anotado con su rev en la misma sentencia. GET ?op=<id> añade
   op: { id, rev } (rev null si esa subida no llegó): así una subida cuya respuesta se perdió se sabe si llegó. Sin la columna (0008 sin aplicar), como antes.
   Solo para quien tiene cuenta y perfil (401 sin sesión, 403 sin perfil). Privado de su dueño. */
import { json } from '../_lib/auth.js';
import { requireProfile } from '../_lib/profile.js';
import { BODY_MAX, checkBody, revOf, shape, OP, OPS_KEEP, noOps, opRev } from '../_lib/mihoja.js';

const current = db => db.prepare('SELECT doc, schema, rev, updated_at FROM mihoja WHERE user_id = ?1');
// LHB-80: la misma fila con sus subidas anotadas; una sola lectura, así el rev y lo anotado son del mismo momento
const currentOps = db => db.prepare('SELECT doc, schema, rev, updated_at, ops FROM mihoja WHERE user_id = ?1');
// la lista nueva: la que había (o vacía, si no se puede leer) con [id, rev nuevo] al final, sin pasar de OPS_KEEP
const OPS_NEXT = (id, rev, keep) =>
  `CASE WHEN json_valid(ops) AND json_type(ops) = 'array' AND json_array_length(ops) >= ${keep} ` +
  `THEN json_remove(json_insert(ops, '$[#]', json_array(${id}, ${rev})), '$[0]') ` +
  `WHEN json_valid(ops) AND json_type(ops) = 'array' THEN json_insert(ops, '$[#]', json_array(${id}, ${rev})) ` +
  `ELSE json_array(json_array(${id}, ${rev})) END`;

// la revisión de sesión y perfil también toca D1: si falla, es un 503 y no una excepción
const gate = async (request, env) => { try { return await requireProfile(request, env); } catch (e) { return json({ error: 'unavailable' }, 503); } };

export async function onRequestGet({ request, env }) {
  const g = await gate(request, env);
  if (g instanceof Response) return g;
  const id = new URL(request.url).searchParams.get('op');
  if (id !== null && !OP.test(id)) return json({ error: 'bad-op' }, 400);
  try {
    if (id !== null) {
      let row = null, cols = true;
      try { row = await currentOps(env.DB).bind(g.user.sub).first(); } catch (e) { if (!noOps(e)) throw e; cols = false; }
      if (cols) {
        const s = shape(row);
        return s ? json({ ...s, op: { id, rev: row ? opRev(row.ops, id) : null } }) : json({ error: 'corrupt' }, 500);
      }
    }
    const s = shape(await current(env.DB).bind(g.user.sub).first());
    return s ? json(s) : json({ error: 'corrupt' }, 500);
  } catch (e) {
    return json({ error: 'unavailable' }, 503);
  }
}

export async function onRequestPut({ request, env }) {
  const g = await gate(request, env);
  if (g instanceof Response) return g;
  // solo JSON: un formulario de otro sitio no puede mandarlo sin preflight
  if (!/^application\/json\b/i.test(request.headers.get('Content-Type') || '')) return json({ error: 'bad-type' }, 415);
  const rev = revOf(request.headers.get('If-Match'));
  if (rev === null) return json({ error: 'if-match-required' }, 428);
  // el tamaño se mira antes de leerlo como JSON
  const len = Number(request.headers.get('Content-Length'));
  if (len > BODY_MAX) return json({ error: 'too-big' }, 413);
  let body;
  try {
    const text = await request.text();
    if (text.length > BODY_MAX) return json({ error: 'too-big' }, 413);
    body = JSON.parse(text);
  } catch (e) { return json({ error: 'bad-body' }, 400); }
  const c = checkBody(body);
  if (c.error) return json({ error: c.error }, c.status);
  const opH = request.headers.get('X-Op');
  if (opH !== null && !OP.test(opH)) return json({ error: 'bad-op' }, 400);
  const me = g.user.sub, at = new Date().toISOString();
  try {
    // una sola sentencia revisa el rev y escribe: dos teléfonos a la vez no pasan los dos.
    // LHB-34: crear la copia también pide el perfil en la misma sentencia: un PUT que pasó la puerta antes de que se borrara la cuenta no la vuelve a crear
    const plain = () => rev === 0
      ? env.DB.prepare('INSERT INTO mihoja (user_id, doc, schema, rev, updated_at) SELECT ?1, ?2, ?3, 1, ?4 WHERE EXISTS (SELECT 1 FROM profiles WHERE user_id = ?1) ON CONFLICT(user_id) DO NOTHING').bind(me, c.text, c.schema, at).run()
      : env.DB.prepare('UPDATE mihoja SET doc = ?2, schema = ?3, rev = rev + 1, updated_at = ?4 WHERE user_id = ?1 AND rev = ?5').bind(me, c.text, c.schema, at, rev).run();
    // LHB-80: con X-Op, la misma sentencia anota el id con el rev nuevo; sin la columna todavía, la de siempre
    let r;
    if (opH !== null) {
      try {
        r = rev === 0
          ? await env.DB.prepare('INSERT INTO mihoja (user_id, doc, schema, rev, updated_at, ops) SELECT ?1, ?2, ?3, 1, ?4, json_array(json_array(?6, 1)) WHERE EXISTS (SELECT 1 FROM profiles WHERE user_id = ?1) ON CONFLICT(user_id) DO NOTHING').bind(me, c.text, c.schema, at, rev, opH).run()
          : await env.DB.prepare('UPDATE mihoja SET doc = ?2, schema = ?3, rev = rev + 1, updated_at = ?4, ops = ' + OPS_NEXT('?6', 'rev + 1', OPS_KEEP) + ' WHERE user_id = ?1 AND rev = ?5').bind(me, c.text, c.schema, at, rev, opH).run();
      } catch (e) { if (!noOps(e)) throw e; r = await plain(); }
    } else r = await plain();
    if (r.meta.changes) return json({ rev: rev + 1, updated_at: at });
    if (!(await env.DB.prepare('SELECT 1 AS n FROM profiles WHERE user_id = ?1').bind(me).first())) return json({ error: 'no-profile' }, 403);
    // el rev ya no era ese: se devuelve la copia de ahora para que el cliente la junte con la suya
    const s = shape(await current(env.DB).bind(me).first());
    return s ? json({ error: 'conflict', ...s }, 409) : json({ error: 'corrupt' }, 500);
  } catch (e) {
    return json({ error: 'unavailable' }, 503);
  }
}
