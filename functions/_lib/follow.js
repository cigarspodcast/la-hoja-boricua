/* LHB-56: seguir. Una vía, sin aprobación (estilo Instagram), no amistad. Las reglas viven aquí; los pedidos en api/follow.js, api/followers.js y api/following.js.
   Lo que sale hacia los demás es solo lo público: @, nombre público (nombre e inicial del apellido) y foto. Nunca fecha de nacimiento, género, correo ni user_id. */
import { checkHandle, requireProfile } from './profile.js';
import { json, tokenOf, issuersOf, userOf } from './auth.js';

export const PAGE = 20;
// TOPES DE PRUEBA (placeholder): los números definitivos son del dueño (LHB-56, No es mío). Por cuenta y por hora, y el total de personas que una cuenta puede seguir.
export const FOLLOW_PER_HOUR = 60;
export const FOLLOW_MAX = 5000;

/* LHB-62: bloquear (migrations/0007_blocks.sql). Un bloqueo vale en las dos direcciones: ninguno ve al otro ni lo puede seguir.
   Sin la tabla todavía (0007 sin aplicar) nadie está bloqueado y bloquear contesta 503 blocks-off: el código sale antes que la migración. */
export const noBlocks = e => /no such table: blocks/i.test(String(e && e.message));
// corre q(true), la lectura con el filtro de bloqueos; si la tabla todavía no existe, la misma lectura sin él, q(false)
export async function blockAware(q) {
  try { return await q(true); } catch (e) { if (!noBlocks(e)) throw e; return q(false); }
}
// lo que se añade a un WHERE para dejar fuera a quien tiene el par bloqueado con quien mira: v es el número del parámetro con el user_id de quien mira,
// col la columna con el user_id de la otra persona
export const notBlocked = (v, col) =>
  ` AND NOT EXISTS (SELECT 1 FROM blocks b WHERE (b.blocker_id = ?${v} AND b.blocked_id = ${col}) OR (b.blocker_id = ${col} AND b.blocked_id = ?${v}))`;
export async function isBlocked(db, a, b) {
  if (!a || !b || a === b) return false;
  return blockAware(async on => on && !!(await db.prepare(
    'SELECT 1 AS n FROM blocks WHERE (blocker_id = ?1 AND blocked_id = ?2) OR (blocker_id = ?2 AND blocked_id = ?1)'
  ).bind(a, b).first()));
}
// quien mira, en una lectura pública: su user_id con una sesión válida, o null (sin sesión, vencida, o si la verificación falla: se contesta como a cualquiera)
export async function viewerOf(request, env) {
  try {
    if (!request || !request.headers || !tokenOf(request) || !issuersOf(env).length) return null;
    const u = await userOf(request, env);
    return u ? u.sub : null;
  } catch (e) { return null; }
}

// LHB-56, compartida con LHB-62: la sesión con perfil, el cuerpo JSON y a quién se apunta: { me, who } o la respuesta de rechazo
export async function intake(request, env, { hidden = false } = {}) {
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

// la persona a la que se apunta por su @: nunca un perfil oculto (a menos que se pida, para dejar de seguirlo). null si no existe.
export async function targetOf(db, rawHandle, { hidden = false } = {}) {
  if (typeof rawHandle !== 'string') return null;
  const h = checkHandle(rawHandle);
  if (h.error) return null;
  return db.prepare(
    'SELECT user_id, handle, display_name, avatar_key, hidden FROM profiles WHERE handle = ?1' + (hidden ? '' : ' AND hidden = 0')
  ).bind(h.handle).first();
}

// los conteos salen de la tabla, y solo cuentan perfiles visibles: el número cuadra con la lista.
// LHB-62 (Codex ronda 1): con viewer, tampoco cuentan quienes tienen el par bloqueado con quien mira, como en listOf
export async function countsOf(db, userId, viewer = null) {
  return blockAware(async on => {
    const filter = on && viewer;
    const one = async (mine, other) => (await db.prepare(
      'SELECT COUNT(*) AS n FROM follows f JOIN profiles p ON p.user_id = f.' + other + ' WHERE f.' + mine + ' = ?1 AND p.hidden = 0' +
      (filter ? notBlocked(2, 'p.user_id') : '')
    ).bind(userId, ...(filter ? [viewer] : [])).first()).n;
    return { followers: await one('followee_id', 'follower_id'), following: await one('follower_id', 'followee_id') };
  });
}

// el cursor es "fecha~@" de la última persona de la página: sin nada privado, y con la fecha y el @ el orden es estable
const CURSOR = /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z)~([a-z0-9_]{3,20})$/;
export function parseCursor(raw) {
  if (raw == null || raw === '') return { cursor: null };
  const m = typeof raw === 'string' ? CURSOR.exec(raw) : null;
  return m ? { cursor: { at: m[1], handle: m[2] } } : { error: 'bad-cursor' };
}

// dir 'followers': quienes siguen a userId; 'following': a quienes sigue userId. Más nuevos primero, PAGE por página.
// LHB-62: con viewer (quien mira, con sesión), sin las personas que tienen el par bloqueado con quien mira
export async function listOf(db, userId, dir, cursor, viewer = null) {
  const [mine, other] = dir === 'followers' ? ['followee_id', 'follower_id'] : ['follower_id', 'followee_id'];
  const args = cursor ? [userId, cursor.at, cursor.handle] : [userId];
  const rows = await blockAware(async on => {
    const filter = on && viewer;
    const sql = 'SELECT p.handle, p.display_name, p.avatar_key, f.created_at FROM follows f JOIN profiles p ON p.user_id = f.' + other +
      ' WHERE f.' + mine + ' = ?1 AND p.hidden = 0' +
      (cursor ? ' AND (f.created_at < ?2 OR (f.created_at = ?2 AND p.handle < ?3))' : '') +
      (filter ? notBlocked(args.length + 1, 'p.user_id') : '') +
      ' ORDER BY f.created_at DESC, p.handle DESC LIMIT ' + (PAGE + 1);
    return (await db.prepare(sql).bind(...args, ...(filter ? [viewer] : [])).all()).results || [];
  });
  const more = rows.length > PAGE;
  const page = more ? rows.slice(0, PAGE) : rows;
  const last = page[page.length - 1];
  return {
    people: page.map(r => ({ handle: r.handle, display_name: r.display_name, avatar_key: r.avatar_key })),
    next: more ? last.created_at + '~' + last.handle : null
  };
}

// GET /api/followers?handle=x&cursor=y y GET /api/following?handle=x&cursor=y: públicas; un perfil oculto o que no existe da 404.
// LHB-62: con sesión, el de alguien que tiene el par bloqueado con quien mira también da 404, y de la lista salen los que lo tienen
export async function listResponse(request, env, dir) {
  if (!env.DB) return json({ error: 'no-db' }, 503);
  const q = new URL(request.url).searchParams;
  const c = parseCursor(q.get('cursor'));
  if (c.error) return json({ error: c.error }, 400);
  const who = await targetOf(env.DB, q.get('handle'));
  if (!who) return json({ error: 'not-found' }, 404);
  const me = await viewerOf(request, env);
  if (await isBlocked(env.DB, me, who.user_id)) return json({ error: 'not-found' }, 404);
  // Codex ronda 5: X-Lhb-Viewer, como /api/u/<handle>: con qué sesión se contestó (el user_id de quien mira, o - sin sesión)
  return json(await listOf(env.DB, who.user_id, dir, c.cursor, me), 200, { 'X-Lhb-Viewer': me || '-' });
}
