/* LHB-34: DELETE /api/account { confirm } borra la cuenta entera de quien tiene la sesión: sus filas en todas las tablas (functions/_lib/account.js),
   y su usuario en Clerk, que cierra sus sesiones en todos los teléfonos. Las fotos de perfil hoy las guarda Clerk y se van con el usuario; las de R2 llegan con LHB-35.
   confirm es el @ de la persona escrito a mano. Si ya no tiene perfil (un borrado que quedó a medias: la base se borró y Clerk no, o la respuesta se perdió),
   basta cualquier texto: ya no queda nada suyo que proteger salvo terminar lo que pidió.
   Antes de borrar nada se revisa todo lo que puede fallar: la sesión, la base, la llave de Clerk (CLERK_SECRET_KEY), JSON, la confirmación, que la base no tenga
   tablas que la lista no conoce y que la llave sea de la instancia de esta sesión: Clerk tiene que conocer a este usuario con esa llave (GET /v1/users/{id}).
   Después se borra la base, de una vez (batch), luego Clerk, y la base otra vez por si algo escribió mientras tanto. Si Clerk falla, la respuesta lo dice
   (502 clerk-failed) y otro intento termina el trabajo: borrar lo ya borrado no hace nada. */
import { userOf, tokenOf, issuersOf, json } from '../_lib/auth.js';
import { userTables, deletes, clerkKey, clerkUser, deleteClerkUser } from '../_lib/account.js';

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
  let p, t;
  try {
    p = await env.DB.prepare('SELECT handle FROM profiles WHERE user_id = ?1').bind(user.sub).first();
    t = await userTables(env.DB);
  } catch (e) {
    return json({ error: 'unavailable' }, 503);
  }
  if (!typed || (p && typed !== String(p.handle).toLowerCase())) return json({ error: 'confirm-mismatch' }, 400);
  if (t.unknown.length) return json({ error: 'unknown-table' }, 503);
  // la llave tiene que ser de la instancia que firmó esta sesión: con la de otra, Clerk no conoce al usuario.
  // Sin perfil y sin usuario en Clerk es un borrado que ya terminó en Clerk (la respuesta se perdió): solo falta barrer la base
  const known = await clerkUser(key, user.sub, fetchFn);
  if (known === null) return json({ error: 'clerk-unavailable' }, 503);
  if (!known && p) return json({ error: 'clerk-mismatch' }, 503);
  const sweep = () => env.DB.batch(deletes(env.DB, t.present, user.sub));
  try {
    await sweep();
  } catch (e) {
    return json({ error: 'unavailable' }, 503);
  }
  if (known && !(await deleteClerkUser(key, user.sub, fetchFn))) return json({ error: 'clerk-failed' }, 502);
  // lo que una sesión todavía viva escribió mientras se borraba Clerk (Mi Hoja ya no puede: su PUT pide el perfil en la misma sentencia)
  try { await sweep(); } catch (e) {}
  return json({ ok: true });
}
