/* LHB-56: seguir. Una vía, sin aprobación (estilo Instagram), no amistad. Las reglas viven aquí; los pedidos en api/follow.js, api/followers.js y api/following.js.
   Lo que sale hacia los demás es solo lo público: @, nombre público (nombre e inicial del apellido) y foto. Nunca fecha de nacimiento, género, correo ni user_id. */
import { checkHandle } from './profile.js';
import { json } from './auth.js';

export const PAGE = 20;
// TOPES DE PRUEBA (placeholder): los números definitivos son del dueño (LHB-56, No es mío). Por cuenta y por hora, y el total de personas que una cuenta puede seguir.
export const FOLLOW_PER_HOUR = 60;
export const FOLLOW_MAX = 5000;

// LHB-62 (bloquear) completa esto. Hasta entonces ningún par está bloqueado; los puntos que lo preguntan ya existen.
export async function isBlocked(db, a, b) {
  return false;
}

// la persona a la que se apunta por su @: nunca un perfil oculto (a menos que se pida, para dejar de seguirlo). null si no existe.
export async function targetOf(db, rawHandle, { hidden = false } = {}) {
  if (typeof rawHandle !== 'string') return null;
  const h = checkHandle(rawHandle);
  if (h.error) return null;
  return db.prepare(
    'SELECT user_id, handle, display_name, avatar_key FROM profiles WHERE handle = ?1' + (hidden ? '' : ' AND hidden = 0')
  ).bind(h.handle).first();
}

// los conteos salen de la tabla, y solo cuentan perfiles visibles: el número cuadra con la lista
export async function countsOf(db, userId) {
  const f = await db.prepare(
    'SELECT COUNT(*) AS n FROM follows f JOIN profiles p ON p.user_id = f.follower_id WHERE f.followee_id = ?1 AND p.hidden = 0'
  ).bind(userId).first();
  const g = await db.prepare(
    'SELECT COUNT(*) AS n FROM follows f JOIN profiles p ON p.user_id = f.followee_id WHERE f.follower_id = ?1 AND p.hidden = 0'
  ).bind(userId).first();
  return { followers: f.n, following: g.n };
}

// el cursor es "fecha~@" de la última persona de la página: sin nada privado, y con la fecha y el @ el orden es estable
const CURSOR = /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z)~([a-z0-9_]{3,20})$/;
export function parseCursor(raw) {
  if (raw == null || raw === '') return { cursor: null };
  const m = typeof raw === 'string' ? CURSOR.exec(raw) : null;
  return m ? { cursor: { at: m[1], handle: m[2] } } : { error: 'bad-cursor' };
}

// dir 'followers': quienes siguen a userId; 'following': a quienes sigue userId. Más nuevos primero, PAGE por página.
export async function listOf(db, userId, dir, cursor) {
  const [mine, other] = dir === 'followers' ? ['followee_id', 'follower_id'] : ['follower_id', 'followee_id'];
  const sql = 'SELECT p.handle, p.display_name, p.avatar_key, f.created_at FROM follows f JOIN profiles p ON p.user_id = f.' + other +
    ' WHERE f.' + mine + ' = ?1 AND p.hidden = 0' +
    (cursor ? ' AND (f.created_at < ?2 OR (f.created_at = ?2 AND p.handle < ?3))' : '') +
    ' ORDER BY f.created_at DESC, p.handle DESC LIMIT ' + (PAGE + 1);
  const st = db.prepare(sql);
  const rows = (await (cursor ? st.bind(userId, cursor.at, cursor.handle) : st.bind(userId)).all()).results || [];
  const more = rows.length > PAGE;
  const page = more ? rows.slice(0, PAGE) : rows;
  const last = page[page.length - 1];
  return {
    people: page.map(r => ({ handle: r.handle, display_name: r.display_name, avatar_key: r.avatar_key })),
    next: more ? last.created_at + '~' + last.handle : null
  };
}

// GET /api/followers?handle=x&cursor=y y GET /api/following?handle=x&cursor=y: públicas; un perfil oculto o que no existe da 404
export async function listResponse(request, env, dir) {
  if (!env.DB) return json({ error: 'no-db' }, 503);
  const q = new URL(request.url).searchParams;
  const c = parseCursor(q.get('cursor'));
  if (c.error) return json({ error: c.error }, 400);
  const who = await targetOf(env.DB, q.get('handle'));
  if (!who) return json({ error: 'not-found' }, 404);
  return json(await listOf(env.DB, who.user_id, dir, c.cursor));
}
