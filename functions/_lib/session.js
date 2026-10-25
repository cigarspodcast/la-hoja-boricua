/* LHB-24: sesiones de Mi Hoja. La cookie lleva un id aleatorio; D1 guarda solo su SHA-256. */
export const COOKIE = 'lhb_s';
export const SESSION_DAYS = 90;

export async function sha256hex(s) {
  const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join('');
}

// 32 bytes aleatorios en base64url (43 caracteres, sin relleno)
export function newId() {
  const a = new Uint8Array(32);
  crypto.getRandomValues(a);
  return btoa(String.fromCharCode(...a)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function readCookie(header, name) {
  for (const part of (header || '').split(';')) {
    const i = part.indexOf('=');
    if (i > 0 && part.slice(0, i).trim() === name) return part.slice(i + 1).trim();
  }
  return null;
}

export const sessionCookie = (id, maxAge) => `${COOKIE}=${id}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`;
export const clearCookie = () => `${COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;

export async function createSession(DB, userId, now = Date.now()) {
  const id = newId();
  const expires = new Date(now + SESSION_DAYS * 864e5).toISOString();
  await DB.prepare('INSERT INTO sessions (id_hash, user_id, expires_at) VALUES (?1, ?2, ?3)')
    .bind(await sha256hex(id), userId, expires).run();
  return sessionCookie(id, SESSION_DAYS * 86400);
}

export async function getUser(request, DB, now = Date.now()) {
  const id = readCookie(request.headers.get('Cookie'), COOKIE);
  if (!id) return null;
  const row = await DB.prepare(
    'SELECT u.id, u.email FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.id_hash = ?1 AND s.expires_at > ?2'
  ).bind(await sha256hex(id), new Date(now).toISOString()).first();
  return row || null;
}

export const json = (obj, status = 200, headers = {}) => new Response(JSON.stringify(obj), {
  status,
  headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...headers },
});
