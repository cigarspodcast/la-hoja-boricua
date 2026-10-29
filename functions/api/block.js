/* LHB-62: bloquear y desbloquear. Solo quien tiene perfil; se bloquea por @. La persona bloqueada no se entera.
   POST /api/block {handle}   → {blocked: true}    quita los seguir en las dos direcciones en la misma tanda (repetirlo no cambia nada)
   DELETE /api/block {handle} → {blocked: false}   no devuelve los seguir; de un perfil oculto también, si de verdad estaba bloqueado
   GET /api/block             → {people: [{handle, display_name, avatar_key}]}   a quienes bloqueé yo, los más nuevos primero (la lista "Bloqueados" de Editar perfil)
   Reglas: no se bloquea uno mismo (400 self-block), ni a un perfil oculto o que no existe (404 not-found); sin la tabla todavía (0007 sin aplicar), 503 blocks-off.
   Codex ronda 1: quien te bloqueó tampoco existe aquí: bloquearlo o desbloquearlo (sin haberlo bloqueado tú) da el mismo 404 que un perfil que no existe.
   Una cuenta bloquea a lo sumo BLOCK_MAX personas (429 block-cap), así la lista Bloqueados las trae todas y cada una se puede desbloquear.
   Lo que sale de cada persona es solo lo público, como en las listas de seguidores; de quien también te bloqueó o se ocultó, solo el @ (para poder desbloquearlo). */
import { json } from '../_lib/auth.js';
import { requireProfile } from '../_lib/profile.js';
import { intake, noBlocks, isBlocked } from '../_lib/follow.js';

// TOPE DE PRUEBA (placeholder, como los de seguir): el número definitivo es del dueño. La lista Bloqueados trae hasta este mismo número, así nunca se queda nadie fuera
export const BLOCK_MAX = 500;
const off = () => json({ error: 'blocks-off' }, 503);
const notFound = () => json({ error: 'not-found' }, 404);

export async function onRequestPost({ request, env }) {
  const it = await intake(request, env);
  if (it.res) return it.res;
  const { me, who } = it;
  if (who.user_id === me) return json({ error: 'self-block' }, 400);
  let mine;
  try {
    // una tanda es una transacción: el bloqueo y el quitar los seguir pasan juntos o no pasan.
    // La fila entra solo si la otra persona no me bloqueó antes y no llegué al tope, revisado en la misma sentencia (dos pedidos a la vez no pasan el tope);
    // los seguir se quitan solo si la fila quedó
    await env.DB.batch([
      env.DB.prepare(
        'INSERT INTO blocks (blocker_id, blocked_id, created_at) SELECT ?1, ?2, ?3 WHERE ' +
        'NOT EXISTS (SELECT 1 FROM blocks WHERE blocker_id = ?2 AND blocked_id = ?1) AND (SELECT COUNT(*) FROM blocks WHERE blocker_id = ?1) < ?4 ' +
        'ON CONFLICT(blocker_id, blocked_id) DO NOTHING'
      ).bind(me, who.user_id, new Date().toISOString(), BLOCK_MAX),
      env.DB.prepare(
        'DELETE FROM follows WHERE ((follower_id = ?1 AND followee_id = ?2) OR (follower_id = ?2 AND followee_id = ?1)) ' +
        'AND EXISTS (SELECT 1 FROM blocks WHERE blocker_id = ?1 AND blocked_id = ?2)'
      ).bind(me, who.user_id)
    ]);
    mine = !!(await env.DB.prepare('SELECT 1 AS n FROM blocks WHERE blocker_id = ?1 AND blocked_id = ?2').bind(me, who.user_id).first());
  } catch (e) {
    if (noBlocks(e)) return off();
    throw e;
  }
  if (mine) return json({ blocked: true });
  // sin la fila: o la otra persona me bloqueó (para mí no existe), o llegué al tope
  if (await isBlocked(env.DB, me, who.user_id)) return notFound();
  return json({ error: 'block-cap' }, 429);
}

export async function onRequestDelete({ request, env }) {
  // desbloquear a alguien que después se ocultó también se puede, pero solo si de verdad estaba bloqueado: para los demás un perfil oculto no existe
  const it = await intake(request, env, { hidden: true });
  if (it.res) return it.res;
  const { me, who } = it;
  let r;
  try {
    r = await env.DB.prepare('DELETE FROM blocks WHERE blocker_id = ?1 AND blocked_id = ?2').bind(me, who.user_id).run();
  } catch (e) {
    if (noBlocks(e)) return off();
    throw e;
  }
  // sin una fila mía que quitar: un perfil oculto, o alguien que me bloqueó, no existe para mí
  if (!r.meta.changes && (who.hidden || await isBlocked(env.DB, me, who.user_id))) return notFound();
  return json({ blocked: false });
}

export async function onRequestGet({ request, env }) {
  const g = await requireProfile(request, env);
  if (g instanceof Response) return g;
  let rows;
  try {
    // los ocultos también salen: quien bloqueó tiene que poder desbloquearlos. De un oculto, o de quien también me bloqueó, solo el @:
    // ni su nombre ni su foto de ahora. Trae hasta BLOCK_MAX, el tope de bloqueos, así salen todos
    rows = (await env.DB.prepare(
      'SELECT p.handle, CASE WHEN p.hidden = 0 AND NOT EXISTS (SELECT 1 FROM blocks r WHERE r.blocker_id = b.blocked_id AND r.blocked_id = b.blocker_id) THEN 1 ELSE 0 END AS shown, ' +
      'p.display_name, p.avatar_key FROM blocks b JOIN profiles p ON p.user_id = b.blocked_id WHERE b.blocker_id = ?1 ' +
      'ORDER BY b.created_at DESC, p.handle ASC LIMIT ' + BLOCK_MAX
    ).bind(g.user.sub).all()).results || [];
  } catch (e) {
    if (noBlocks(e)) return off();
    throw e;
  }
  return json({ people: rows.map(r => ({ handle: r.handle, display_name: r.shown ? r.display_name : null, avatar_key: r.shown ? r.avatar_key : null })) });
}
