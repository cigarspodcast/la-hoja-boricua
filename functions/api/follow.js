/* LHB-56: seguir y dejar de seguir (una vía, sin aprobación). Solo quien ya tiene perfil sigue; se sigue por @.
   POST /api/follow {handle}   → {following: true, followers}   (repetirlo no cambia nada)
   DELETE /api/follow {handle} → {following: false, followers}  (repetirlo tampoco; de un perfil oculto solo si se le seguia, y sin conteo)
   GET /api/follow?handle=x    → los conteos públicos de esa persona y, con sesión, si yo la sigo
   Reglas: no se sigue a uno mismo (400 self-follow), ni a un perfil oculto o que no existe (404 not-found), ni a quien tiene el par bloqueado (403 blocked; LHB-62 lo completa);
   topes de prueba por hora y en total (429 follow-rate, follow-cap), documentados en _lib/follow.js. */
import { userOf, tokenOf, issuersOf, json } from '../_lib/auth.js';
import { requireProfile } from '../_lib/profile.js';
import { targetOf, countsOf, isBlocked, FOLLOW_PER_HOUR, FOLLOW_MAX } from '../_lib/follow.js';

// la sesión con perfil, el cuerpo JSON y a quién se apunta: { me, who } o la respuesta de rechazo
async function intake(request, env, { hidden = false } = {}) {
  const g = await requireProfile(request, env);
  if (g instanceof Response) return { res: g };
  // solo JSON: un formulario de otro sitio no puede mandarlo sin preflight
  if (!/^application\/json\b/i.test(request.headers.get('Content-Type') || '')) return { res: json({ error: 'bad-type' }, 415) };
  let body;
  try { body = await request.json(); } catch (e) { return { res: json({ error: 'bad-body' }, 400) }; }
  if (!body || typeof body !== 'object' || Array.isArray(body)) return { res: json({ error: 'bad-body' }, 400) };
  const who = await targetOf(env.DB, body.handle, { hidden });
  if (!who) return { res: json({ error: 'not-found' }, 404) };
  return { me: g.user.sub, who };
}

export async function onRequestPost({ request, env }) {
  const it = await intake(request, env);
  if (it.res) return it.res;
  const { me, who } = it;
  if (who.user_id === me) return json({ error: 'self-follow' }, 400);
  if (await isBlocked(env.DB, me, who.user_id)) return json({ error: 'blocked' }, 403);
  const has = () => env.DB.prepare('SELECT 1 AS n FROM follows WHERE follower_id = ?1 AND followee_id = ?2').bind(me, who.user_id).first();
  if (!(await has())) {
    const now = new Date();
    const since = new Date(now.getTime() - 3600e3).toISOString();
    // lo de mas de una hora ya no cuenta
    await env.DB.prepare('DELETE FROM follow_events WHERE follower_id = ?1 AND created_at <= ?2').bind(me, since).run();
    // los dos topes y la fila: UNA sentencia revisa e inserta, asi dos pedidos a la vez no pasan los dos; el disparador follows_event anota el seguir en el registro dentro de la misma sentencia,
    // asi un seguir rechazado o repetido no gasta cupo, y dejar de seguir no borra el registro
    const ins = await env.DB.prepare(
      'INSERT INTO follows (follower_id, followee_id, created_at) SELECT ?1, ?2, ?3 WHERE ' +
      '(SELECT COUNT(*) FROM follow_events WHERE follower_id = ?1 AND created_at > ?4) < ?5 AND (SELECT COUNT(*) FROM follows WHERE follower_id = ?1) < ?6 ' +
      'ON CONFLICT(follower_id, followee_id) DO NOTHING'
    ).bind(me, who.user_id, now.toISOString(), since, FOLLOW_PER_HOUR, FOLLOW_MAX).run();
    // sin fila nueva: o ya existia (otro pedido igual llego antes) o se llego a un tope
    if (!ins.meta.changes && !(await has())) {
      const h = await env.DB.prepare('SELECT COUNT(*) AS n FROM follow_events WHERE follower_id = ?1 AND created_at > ?2').bind(me, since).first();
      return json({ error: h.n >= FOLLOW_PER_HOUR ? 'follow-rate' : 'follow-cap' }, 429);
    }
  }
  return json({ following: true, followers: (await countsOf(env.DB, who.user_id)).followers });
}

export async function onRequestDelete({ request, env }) {
  // dejar de seguir a alguien que después se ocultó también se puede
  const it = await intake(request, env, { hidden: true });
  if (it.res) return it.res;
  const { me, who } = it;
  const had = await env.DB.prepare('SELECT 1 AS n FROM follows WHERE follower_id = ?1 AND followee_id = ?2').bind(me, who.user_id).first();
  // un perfil oculto solo se deja de seguir si de verdad se seguia: para los demas no existe, ni su conteo
  if (who.hidden && !had) return json({ error: 'not-found' }, 404);
  await env.DB.prepare('DELETE FROM follows WHERE follower_id = ?1 AND followee_id = ?2').bind(me, who.user_id).run();
  if (who.hidden) return json({ following: false });
  return json({ following: false, followers: (await countsOf(env.DB, who.user_id)).followers });
}

export async function onRequestGet({ request, env }) {
  if (!env.DB) return json({ error: 'no-db' }, 503);
  const who = await targetOf(env.DB, new URL(request.url).searchParams.get('handle'));
  if (!who) return json({ error: 'not-found' }, 404);
  // la sesión es opcional aquí: sin ella (o con una vencida) se contesta igual, sin el campo viewerFollows
  let me = null;
  if (tokenOf(request) && issuersOf(env).length) { const u = await userOf(request, env); me = u ? u.sub : null; }
  const out = { handle: who.handle, display_name: who.display_name, avatar_key: who.avatar_key, ...(await countsOf(env.DB, who.user_id)), self: me === who.user_id, viewerFollows: null };
  if (me && me !== who.user_id) out.viewerFollows = !!(await env.DB.prepare('SELECT 1 AS n FROM follows WHERE follower_id = ?1 AND followee_id = ?2').bind(me, who.user_id).first());
  return json(out);
}
