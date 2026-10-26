/* LHB-25: reglas del perfil (onboarding) y la puerta de Mi Hoja: sin perfil no hay Mi Hoja. */
import { userOf, tokenOf, issuersOf, json } from './auth.js';

// nombres que no puede tomar nadie: los del ticket y las rutas y carpetas del sitio
export const RESERVED = new Set([
  'admin', 'api', 'u', 'lahojaboricua',
  'catalogo', 'artesanos', 'subir', 'lugares', 'actividades', 'eventos', 'perfil', 'mihoja', 'cata',
  'maridajes', 'podcast', 'buscar', 'cigarros', 'privacidad', 'icons', 'img', 'data', 'functions',
  'sitemap', 'robots', 'llms', 'index', 'clerk', 'accounts', 'www'
]);
export const LIMITS = { display_name: 50, bio: 160, favorite_brand: 60 };
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

export function checkProfile(b) {
  if (!b || typeof b !== 'object' || Array.isArray(b)) return { error: 'bad-body' };
  if (b.age_ok !== true) return { error: 'age-required' };
  const h = checkHandle(b.handle);
  if (h.error) return h;
  const out = { handle: h.handle };
  for (const f of Object.keys(LIMITS)) {
    const r = text(b[f], f);
    if (r.error) return r;
    out[f] = r.value;
  }
  const a = checkAvatar(b.avatar_url);
  if (a.error) return a;
  out.avatar_key = a.avatar_key;
  return out;
}

// la puerta de toda API de Mi Hoja: { user, profile } o la respuesta de rechazo (401, 403 no-profile, 503)
export async function requireProfile(request, env) {
  if (!tokenOf(request)) return json({ error: 'no-session' }, 401);
  if (!issuersOf(env).length) return json({ error: 'no-auth-config' }, 503);
  const user = await userOf(request, env);
  if (!user) return json({ error: 'no-session' }, 401);
  if (!env.DB) return json({ error: 'no-db' }, 503);
  const profile = await env.DB.prepare(
    'SELECT handle, display_name, bio, favorite_brand, avatar_key, hidden FROM profiles WHERE user_id = ?1'
  ).bind(user.sub).first();
  if (!profile) return json({ error: 'no-profile' }, 403);
  return { user, profile };
}
