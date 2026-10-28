/* LHB-34: DELETE /api/account { confirm } borra la cuenta entera de quien tiene la sesión: sus filas en todas las tablas (functions/_lib/account.js),
   y su usuario en Clerk, que cierra sus sesiones en todos los teléfonos. Las fotos de perfil hoy las guarda Clerk y se van con el usuario; las de R2 llegan con LHB-35.
   confirm es el @ de la persona escrito a mano (sin perfil todavía, la palabra BORRAR).
   Antes de borrar nada se revisa todo lo que puede fallar sin red: la sesión, la base, la llave de Clerk (CLERK_SECRET_KEY, de la misma instancia que la sesión),
   la confirmación y que la base no tenga tablas que la lista no conoce. Primero se borra la base, de una vez (batch), y después Clerk: si Clerk falla, la respuesta
   lo dice (502 clerk-failed) y otro intento termina el trabajo, porque borrar lo ya borrado no hace nada y Clerk responde 404 a un usuario que ya no está. */
import { userOf, tokenOf, issuersOf, json } from '../_lib/auth.js';
import { userTables, deletes, clerkKey, deleteClerkUser } from '../_lib/account.js';

export async function onRequestDelete({ request, env }, fetchFn) {
  if (!tokenOf(request)) return json({ error: 'no-session' }, 401);
  if (!issuersOf(env).length) return json({ error: 'no-auth-config' }, 503);
  const user = await userOf(request, env);
  if (!user) return json({ error: 'no-session' }, 401);
  if (!env.DB) return json({ error: 'no-db' }, 503);
  const key = clerkKey(env, user.iss);
  if (!key) return json({ error: 'no-clerk-key' }, 503);
  // solo JSON: un formulario de otro sitio no puede mandarlo sin preflight
  if (!/^application\/json\b/i.test(request.headers.get('Content-Type') || '')) return json({ error: 'bad-type' }, 415);
  let body;
  try { body = await request.json(); } catch (e) { return json({ error: 'bad-body' }, 400); }
  const typed = body && typeof body === 'object' && typeof body.confirm === 'string' ? body.confirm.trim().replace(/^@/, '').toLowerCase() : '';
  let t;
  try {
    const p = await env.DB.prepare('SELECT handle FROM profiles WHERE user_id = ?1').bind(user.sub).first();
    if (!typed || typed !== (p ? String(p.handle).toLowerCase() : 'borrar')) return json({ error: 'confirm-mismatch' }, 400);
    t = await userTables(env.DB);
  } catch (e) {
    return json({ error: 'unavailable' }, 503);
  }
  if (t.unknown.length) return json({ error: 'unknown-table' }, 503);
  try {
    await env.DB.batch(deletes(env.DB, t.present, user.sub));
  } catch (e) {
    return json({ error: 'unavailable' }, 503);
  }
  if (!(await deleteClerkUser(key, user.sub, fetchFn))) return json({ error: 'clerk-failed' }, 502);
  return json({ ok: true });
}
