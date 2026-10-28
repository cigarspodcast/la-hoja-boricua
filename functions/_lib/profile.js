/* LHB-25: reglas del perfil (onboarding) y la puerta de Mi Hoja: sin perfil no hay Mi Hoja. */
import { userOf, tokenOf, issuersOf, json } from './auth.js';

// nombres que no puede tomar nadie: los del ticket y las rutas y carpetas del sitio
export const RESERVED = new Set([
  'admin', 'api', 'u', 'lahojaboricua',
  'catalogo', 'artesanos', 'subir', 'lugares', 'actividades', 'eventos', 'perfil', 'mihoja', 'cata',
  'maridajes', 'podcast', 'buscar', 'cigarros', 'privacidad', 'icons', 'img', 'data', 'functions',
  'sitemap', 'robots', 'llms', 'index', 'clerk', 'accounts', 'www'
]);
export const LIMITS = { bio: 160, favorite_brand: 60 };
// la bio puede tener saltos de línea y tabs; el nombre y la marca, ningún carácter de control
const CONTROL = { bio: /[\u0000-\u0008\u000B-\u001F\u007F]/, line: /[\u0000-\u001F\u007F]/ };

// 3 a 20 de a-z 0-9 _, se guarda en minúscula
export function checkHandle(raw) {
  const handle = String(raw ?? '').trim().toLowerCase();
  if (!/^[a-z0-9_]{3,20}$/.test(handle)) return { error: 'handle-invalid' };
  if (RESERVED.has(handle)) return { error: 'handle-reserved' };
  return { handle };
}

// texto opcional: string o nada; vacío se guarda como null; largo en caracteres, no en bytes
function text(v, field) {
  if (v == null) return { value: null };
  if (typeof v !== 'string') return { error: field + '-invalid' };
  const t = v.trim();
  if ((field === 'bio' ? CONTROL.bio : CONTROL.line).test(t)) return { error: field + '-invalid' };
  if ([...t].length > LIMITS[field]) return { error: field + '-long' };
  return { value: t || null };
}

// LHB-49: la foto de perfil la guarda Clerk; aquí solo se acepta su URL y se guarda en avatar_key (LHB-35 las pasa a R2).
// Prefijo literal, solo ASCII visible (sin espacios, controles ni \), así el host nunca puede ser otro.
export const AVATAR_PREFIX = 'https://img.clerk.com/';
export const AVATAR_MAX = 1000;
export function checkAvatar(v) {
  if (v == null || v === '') return { error: 'avatar-required' };
  if (typeof v !== 'string' || v.length > AVATAR_MAX || v.length <= AVATAR_PREFIX.length) return { error: 'avatar-invalid' };
  if (!v.startsWith(AVATAR_PREFIX) || !/^[!-~]+$/.test(v) || v.includes('\\')) return { error: 'avatar-invalid' };
  return { avatar_key: v };
}

// LHB-52: identidad. Nombre y apellido (1 a 50 caracteres, no bytes, sin caracteres de control), género M o F y fecha de nacimiento.
// La fecha reemplaza la casilla de 21+: tiene que ser una fecha real del calendario, no estar en el futuro y dar 21 años o más en la fecha UTC del servidor.
export const NAME_MAX = 50;
export const MIN_AGE = 21;
export const MIN_BIRTH_YEAR = 1900;
const NAME_CONTROL = /[\p{Cc}\p{Zl}\p{Zp}]/u;

// la fecha de hoy en UTC, 'YYYY-MM-DD': la que decide la edad, no la del teléfono
export function utcDay(now = new Date()) {
  return now.toISOString().slice(0, 10);
}

function name(v, field) {
  if (v == null) return { error: field + '-required' };
  if (typeof v !== 'string') return { error: field + '-invalid' };
  const t = v.normalize('NFC').trim(); // una sola forma guardada (é junta, no e y un acento suelto): la búsqueda de personas compara el texto tal cual
  if (!t) return { error: field + '-required' };
  if (NAME_CONTROL.test(t)) return { error: field + '-invalid' };
  if ([...t].length > NAME_MAX) return { error: field + '-long' };
  return { value: t };
}

export function checkGender(v) {
  if (v == null || v === '') return { error: 'gender-required' };
  if (v !== 'M' && v !== 'F') return { error: 'gender-invalid' };
  return { gender: v };
}

// today es 'YYYY-MM-DD' (utcDay). Se compara como texto: el corte de los 21 años es hoy con el año restado, y 'YYYY-MM-DD' ordena igual que las fechas
export function checkBirthDate(v, today = utcDay()) {
  if (v == null || v === '') return { error: 'birth_date-required' };
  if (typeof v !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return { error: 'birth_date-invalid' };
  const y = +v.slice(0, 4), m = +v.slice(5, 7), d = +v.slice(8, 10);
  const dt = new Date(0);
  dt.setUTCFullYear(y, m - 1, d);
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d || y < MIN_BIRTH_YEAR) return { error: 'birth_date-invalid' };
  if (v > today) return { error: 'birth_date-future' };
  const cutoff = String(+today.slice(0, 4) - MIN_AGE).padStart(4, '0') + today.slice(4);
  if (v > cutoff) return { error: 'age-under-21' };
  return { birth_date: v };
}

// el nombre público: el nombre y la inicial del apellido ("Ana M."); el apellido completo no sale del dueño
export function publicName(first, last) {
  return first + ' ' + [...last][0].toUpperCase() + '.';
}

export function checkIdentity(b, now = new Date()) {
  if (!b || typeof b !== 'object' || Array.isArray(b)) return { error: 'bad-body' };
  const first = name(b.first_name, 'first_name');
  if (first.error) return first;
  const last = name(b.last_name, 'last_name');
  if (last.error) return last;
  const g = checkGender(b.gender);
  if (g.error) return g;
  const bd = checkBirthDate(b.birth_date, utcDay(now));
  if (bd.error) return bd;
  return { first_name: first.value, last_name: last.value, gender: g.gender, birth_date: bd.birth_date, display_name: publicName(first.value, last.value) };
}

// display_name ya no lo manda el cliente: sale del nombre y la inicial del apellido
export function checkProfile(b, now = new Date()) {
  if (!b || typeof b !== 'object' || Array.isArray(b)) return { error: 'bad-body' };
  const id = checkIdentity(b, now);
  if (id.error) return id;
  const h = checkHandle(b.handle);
  if (h.error) return h;
  const out = { handle: h.handle, ...id };
  for (const f of ['bio', 'favorite_brand']) {
    const r = text(b[f], f);
    if (r.error) return r;
    out[f] = r.value;
  }
  const a = checkAvatar(b.avatar_url);
  if (a.error) return a;
  out.avatar_key = a.avatar_key;
  return out;
}

// LHB-52: lo único que sale de un perfil hacia los demás. Nombre, apellido, género y fecha de nacimiento no están aquí; display_name es el nombre y la inicial.
export const PUBLIC_COLUMNS = 'handle, display_name, bio, favorite_brand, avatar_key';
export function publicProfile(db, handle) {
  return db.prepare('SELECT ' + PUBLIC_COLUMNS + ' FROM profiles WHERE handle = ?1 AND hidden = 0').bind(handle).first();
}

// la puerta de toda API de Mi Hoja: { user, profile } o la respuesta de rechazo (401, 403 no-profile, 503)
export async function requireProfile(request, env) {
  if (!tokenOf(request)) return json({ error: 'no-session' }, 401);
  if (!issuersOf(env).length) return json({ error: 'no-auth-config' }, 503);
  const user = await userOf(request, env);
  if (!user) return json({ error: 'no-session' }, 401);
  if (!env.DB) return json({ error: 'no-db' }, 503);
  const profile = await env.DB.prepare(
    'SELECT ' + PUBLIC_COLUMNS + ', hidden FROM profiles WHERE user_id = ?1'
  ).bind(user.sub).first();
  if (!profile) return json({ error: 'no-profile' }, 403);
  return { user, profile };
}
