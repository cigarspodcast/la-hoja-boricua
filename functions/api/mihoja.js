/* LHB-28 / LHB-31: GET y PUT /api/mihoja, la Mi Hoja de la cuenta.
   GET → { rev, schema, doc, updated_at }; sin copia todavía: { rev: 0, schema: null, doc: null }.
   PUT { schema, doc } con If-Match: <rev que el cliente vio> → { rev, updated_at } con el rev nuevo. If-Match: 0 crea la copia.
   Si el rev ya no es ese (otro teléfono guardó antes), 409 { error: 'conflict', rev, schema, doc } con la copia de ahora: el cliente junta las dos y reintenta. Nunca se pisa una copia que el cliente no vio.
   Solo para quien tiene cuenta y perfil (401 sin sesión, 403 sin perfil). Privado de su dueño. */
import { json } from '../_lib/auth.js';
import { requireProfile } from '../_lib/profile.js';
import { BODY_MAX, checkBody, revOf, shape } from '../_lib/mihoja.js';

const current = db => db.prepare('SELECT doc, schema, rev, updated_at FROM mihoja WHERE user_id = ?1');

// la revisión de sesión y perfil también toca D1: si falla, es un 503 y no una excepción
const gate = async (request, env) => { try { return await requireProfile(request, env); } catch (e) { return json({ error: 'unavailable' }, 503); } };

export async function onRequestGet({ request, env }) {
  const g = await gate(request, env);
  if (g instanceof Response) return g;
  try {
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
  const me = g.user.sub, at = new Date().toISOString();
  try {
    // una sola sentencia revisa el rev y escribe: dos teléfonos a la vez no pasan los dos.
    // LHB-34: crear la copia también pide el perfil en la misma sentencia: un PUT que pasó la puerta antes de que se borrara la cuenta no la vuelve a crear
    const r = rev === 0
      ? await env.DB.prepare('INSERT INTO mihoja (user_id, doc, schema, rev, updated_at) SELECT ?1, ?2, ?3, 1, ?4 WHERE EXISTS (SELECT 1 FROM profiles WHERE user_id = ?1) ON CONFLICT(user_id) DO NOTHING').bind(me, c.text, c.schema, at).run()
      : await env.DB.prepare('UPDATE mihoja SET doc = ?2, schema = ?3, rev = rev + 1, updated_at = ?4 WHERE user_id = ?1 AND rev = ?5').bind(me, c.text, c.schema, at, rev).run();
    if (r.meta.changes) return json({ rev: rev + 1, updated_at: at });
    if (!(await env.DB.prepare('SELECT 1 AS n FROM profiles WHERE user_id = ?1').bind(me).first())) return json({ error: 'no-profile' }, 403);
    // el rev ya no era ese: se devuelve la copia de ahora para que el cliente la junte con la suya
    const s = shape(await current(env.DB).bind(me).first());
    return s ? json({ error: 'conflict', ...s }, 409) : json({ error: 'corrupt' }, 500);
  } catch (e) {
    return json({ error: 'unavailable' }, 503);
  }
}
