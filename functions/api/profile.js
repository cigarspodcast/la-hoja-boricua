/* LHB-25: POST /api/profile crea el perfil del onboarding (@handle, bio, marca favorita y, desde LHB-49, la foto: la URL de Clerk en avatar_url, que se guarda en avatar_key).
   LHB-52: desde ahora también pide nombre, apellido, género y fecha de nacimiento. La fecha reemplaza la casilla de 21+: age_ok_at se sella cuando la fecha da 21 años o más.
   display_name sale del nombre y la inicial del apellido ("Ana M."); el género y la fecha de nacimiento nunca salen en la respuesta.
   PUT /api/profile completa la identidad de un perfil que ya existía sin ella (null en las cuatro columnas nuevas); uno que ya la tiene da 409.
   Cambiar el perfil después es de LHB-34 y LHB-55; aquí un segundo POST da 409. */
import { userOf, tokenOf, issuersOf, json } from '../_lib/auth.js';
import { checkProfile, checkIdentity } from '../_lib/profile.js';

// la sesión, la base y el cuerpo JSON: { user, body } o la respuesta de rechazo
async function intake(request, env) {
  if (!tokenOf(request)) return { res: json({ error: 'no-session' }, 401) };
  if (!issuersOf(env).length) return { res: json({ error: 'no-auth-config' }, 503) };
  const user = await userOf(request, env);
  if (!user) return { res: json({ error: 'no-session' }, 401) };
  if (!env.DB) return { res: json({ error: 'no-db' }, 503) };
  // solo JSON: un formulario de otro sitio no puede mandarlo sin preflight
  if (!/^application\/json\b/i.test(request.headers.get('Content-Type') || '')) return { res: json({ error: 'bad-type' }, 415) };
  let body;
  try { body = await request.json(); } catch (e) { return { res: json({ error: 'bad-body' }, 400) }; }
  return { user, body };
}

export async function onRequestPost({ request, env }) {
  const it = await intake(request, env);
  if (it.res) return it.res;
  const now = new Date();
  const p = checkProfile(it.body, now);
  if (p.error) return json({ error: p.error }, 400);
  const stamp = now.toISOString();
  try {
    const r = await env.DB.prepare(
      'INSERT INTO profiles (user_id, handle, display_name, bio, favorite_brand, avatar_key, first_name, last_name, gender, birth_date, age_ok_at, created_at, updated_at) ' +
      'VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?11, ?11) ON CONFLICT(user_id) DO NOTHING'
    ).bind(it.user.sub, p.handle, p.display_name, p.bio, p.favorite_brand, p.avatar_key, p.first_name, p.last_name, p.gender, p.birth_date, stamp).run();
    if (!r.meta.changes) return json({ error: 'profile-exists' }, 409);
  } catch (e) {
    if (/UNIQUE/i.test(String(e && e.message))) return json({ error: 'handle-taken' }, 409);
    throw e;
  }
  const { handle, display_name, bio, favorite_brand, avatar_key } = p;
  return json({ profile: { handle, display_name, bio, favorite_brand, avatar_key } }, 201);
}

export async function onRequestPut({ request, env }) {
  const it = await intake(request, env);
  if (it.res) return it.res;
  const now = new Date();
  const id = checkIdentity(it.body, now);
  if (id.error) return json({ error: id.error }, 400);
  // una sola sentencia: solo toca un perfil al que le falta alguna de las cuatro; un display_name que ya existía se queda, y age_ok_at no se toca
  const r = await env.DB.prepare(
    'UPDATE profiles SET first_name = ?2, last_name = ?3, gender = ?4, birth_date = ?5, display_name = COALESCE(display_name, ?6), updated_at = ?7 ' +
    'WHERE user_id = ?1 AND (first_name IS NULL OR last_name IS NULL OR gender IS NULL OR birth_date IS NULL)'
  ).bind(it.user.sub, id.first_name, id.last_name, id.gender, id.birth_date, id.display_name, now.toISOString()).run();
  if (r.meta.changes) return json({ ok: true });
  const has = await env.DB.prepare('SELECT 1 AS n FROM profiles WHERE user_id = ?1').bind(it.user.sub).first();
  return has ? json({ error: 'identity-exists' }, 409) : json({ error: 'no-profile' }, 403);
}
