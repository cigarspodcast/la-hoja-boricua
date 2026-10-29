/* LHB-62: bloquear y desbloquear. Solo quien tiene perfil; se bloquea por @. La persona bloqueada no se entera.
   POST /api/block {handle}   → {blocked: true}    quita los seguir en las dos direcciones en la misma tanda (repetirlo no cambia nada)
   DELETE /api/block {handle} → {blocked: false}   no devuelve los seguir; de un perfil oculto también, si de verdad estaba bloqueado
   GET /api/block             → {people: [{handle, display_name, avatar_key}]}   a quienes bloqueé yo, los más nuevos primero (la lista "Bloqueados" de Editar perfil)
   Reglas: no se bloquea uno mismo (400 self-block), ni a un perfil oculto o que no existe (404 not-found); sin la tabla todavía (0007 sin aplicar), 503 blocks-off.
   Lo que sale de cada persona es solo lo público, como en las listas de seguidores. */
import { json } from '../_lib/auth.js';
import { requireProfile } from '../_lib/profile.js';
import { intake, noBlocks } from '../_lib/follow.js';

export const BLOCK_LIST_MAX = 500;
const off = () => json({ error: 'blocks-off' }, 503);

export async function onRequestPost({ request, env }) {
  const it = await intake(request, env);
  if (it.res) return it.res;
  const { me, who } = it;
  if (who.user_id === me) return json({ error: 'self-block' }, 400);
  try {
    // una tanda es una transacción: el bloqueo y el quitar los seguir pasan juntos o no pasan
    await env.DB.batch([
      env.DB.prepare('INSERT INTO blocks (blocker_id, blocked_id, created_at) VALUES (?1, ?2, ?3) ON CONFLICT(blocker_id, blocked_id) DO NOTHING')
        .bind(me, who.user_id, new Date().toISOString()),
      env.DB.prepare('DELETE FROM follows WHERE (follower_id = ?1 AND followee_id = ?2) OR (follower_id = ?2 AND followee_id = ?1)').bind(me, who.user_id)
    ]);
  } catch (e) {
    if (noBlocks(e)) return off();
    throw e;
  }
  return json({ blocked: true });
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
  if (who.hidden && !r.meta.changes) return json({ error: 'not-found' }, 404);
  return json({ blocked: false });
}

export async function onRequestGet({ request, env }) {
  const g = await requireProfile(request, env);
  if (g instanceof Response) return g;
  let rows;
  try {
    // los ocultos también salen: quien bloqueó tiene que poder desbloquearlos
    rows = (await env.DB.prepare(
      'SELECT p.handle, p.display_name, p.avatar_key FROM blocks b JOIN profiles p ON p.user_id = b.blocked_id WHERE b.blocker_id = ?1 ' +
      'ORDER BY b.created_at DESC, p.handle ASC LIMIT ' + BLOCK_LIST_MAX
    ).bind(g.user.sub).all()).results || [];
  } catch (e) {
    if (noBlocks(e)) return off();
    throw e;
  }
  return json({ people: rows.map(r => ({ handle: r.handle, display_name: r.display_name, avatar_key: r.avatar_key })) });
}
