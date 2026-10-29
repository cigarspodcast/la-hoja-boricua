/* LHB-56: seguir y dejar de seguir (una vía, sin aprobación). Solo quien ya tiene perfil sigue; se sigue por @.
   POST /api/follow {handle}   → {following: true, followers}   (repetirlo no cambia nada)
   DELETE /api/follow {handle} → {following: false, followers}  (repetirlo tampoco; de un perfil oculto solo si se le seguia, y sin conteo)
   GET /api/follow?handle=x    → los conteos públicos de esa persona y, con sesión, si yo la sigo
   Reglas: no se sigue a uno mismo (400 self-follow), ni a un perfil oculto o que no existe (404 not-found), ni a quien tiene el par bloqueado (LHB-62: el mismo 404, quien queda bloqueado no se entera);
   topes de prueba por hora y en total (429 follow-rate, follow-cap), documentados en _lib/follow.js.
   LHB-62: con sesión, GET de alguien que tiene el par bloqueado con quien pregunta da 404, como si no existiera. */
import { json } from '../_lib/auth.js';
import { targetOf, countsOf, isBlocked, blockAware, viewerOf, intake, FOLLOW_PER_HOUR, FOLLOW_MAX } from '../_lib/follow.js';

export async function onRequestPost({ request, env }) {
  const it = await intake(request, env);
  if (it.res) return it.res;
  const { me, who } = it;
  if (who.user_id === me) return json({ error: 'self-follow' }, 400);
  if (await isBlocked(env.DB, me, who.user_id)) return json({ error: 'not-found' }, 404);
  const has = () => env.DB.prepare('SELECT 1 AS n FROM follows WHERE follower_id = ?1 AND followee_id = ?2').bind(me, who.user_id).first();
  if (!(await has())) {
    const now = new Date();
    const since = new Date(now.getTime() - 3600e3).toISOString();
    // lo de mas de una hora ya no cuenta
    await env.DB.prepare('DELETE FROM follow_events WHERE follower_id = ?1 AND created_at <= ?2').bind(me, since).run();
    // los dos topes y la fila: UNA sentencia revisa e inserta, asi dos pedidos a la vez no pasan los dos; el disparador follows_event anota el seguir en el registro dentro de la misma sentencia,
    // asi un seguir rechazado o repetido no gasta cupo, y dejar de seguir no borra el registro
    // LHB-62: y el bloqueo, en la misma sentencia: un bloqueo que llega entre la revision de arriba y aqui no deja pasar el seguir
    const ins = await blockAware(on => env.DB.prepare(
      'INSERT INTO follows (follower_id, followee_id, created_at) SELECT ?1, ?2, ?3 WHERE ' +
      '(SELECT COUNT(*) FROM follow_events WHERE follower_id = ?1 AND created_at > ?4) < ?5 AND (SELECT COUNT(*) FROM follows WHERE follower_id = ?1) < ?6 ' +
      (on ? 'AND NOT EXISTS (SELECT 1 FROM blocks WHERE (blocker_id = ?1 AND blocked_id = ?2) OR (blocker_id = ?2 AND blocked_id = ?1)) ' : '') +
      'ON CONFLICT(follower_id, followee_id) DO NOTHING'
    ).bind(me, who.user_id, now.toISOString(), since, FOLLOW_PER_HOUR, FOLLOW_MAX).run());
    // sin fila nueva: o ya existia (otro pedido igual llego antes), o el par se bloqueo mientras tanto, o se llego a un tope
    if (!ins.meta.changes && !(await has())) {
      if (await isBlocked(env.DB, me, who.user_id)) return json({ error: 'not-found' }, 404);
      const h = await env.DB.prepare('SELECT COUNT(*) AS n FROM follow_events WHERE follower_id = ?1 AND created_at > ?2').bind(me, since).first();
      return json({ error: h.n >= FOLLOW_PER_HOUR ? 'follow-rate' : 'follow-cap' }, 429);
    }
  }
  return json({ following: true, followers: (await countsOf(env.DB, who.user_id, me)).followers });
}

export async function onRequestDelete({ request, env }) {
  // dejar de seguir a alguien que después se ocultó también se puede
  const it = await intake(request, env, { hidden: true });
  if (it.res) return it.res;
  const { me, who } = it;
  // LHB-62: para un par bloqueado no existe, ni su conteo (el bloqueo ya borro los seguir de los dos lados)
  if (await isBlocked(env.DB, me, who.user_id)) return json({ error: 'not-found' }, 404);
  const had = await env.DB.prepare('SELECT 1 AS n FROM follows WHERE follower_id = ?1 AND followee_id = ?2').bind(me, who.user_id).first();
  // un perfil oculto solo se deja de seguir si de verdad se seguia: para los demas no existe, ni su conteo
  if (who.hidden && !had) return json({ error: 'not-found' }, 404);
  await env.DB.prepare('DELETE FROM follows WHERE follower_id = ?1 AND followee_id = ?2').bind(me, who.user_id).run();
  if (who.hidden) return json({ following: false });
  return json({ following: false, followers: (await countsOf(env.DB, who.user_id, me)).followers });
}

export async function onRequestGet({ request, env }) {
  if (!env.DB) return json({ error: 'no-db' }, 503);
  const who = await targetOf(env.DB, new URL(request.url).searchParams.get('handle'));
  if (!who) return json({ error: 'not-found' }, 404);
  // la sesión es opcional aquí: sin ella (o con una vencida) se contesta igual, sin el campo viewerFollows
  const me = await viewerOf(request, env);
  if (await isBlocked(env.DB, me, who.user_id)) return json({ error: 'not-found' }, 404);
  const out = { handle: who.handle, display_name: who.display_name, avatar_key: who.avatar_key, ...(await countsOf(env.DB, who.user_id, me)), self: me === who.user_id, viewerFollows: null };
  if (me && me !== who.user_id) out.viewerFollows = !!(await env.DB.prepare('SELECT 1 AS n FROM follows WHERE follower_id = ?1 AND followee_id = ?2').bind(me, who.user_id).first());
  return json(out);
}
