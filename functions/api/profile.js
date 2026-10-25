/* LHB-25: POST /api/profile crea el perfil del onboarding (@handle, nombre, bio, marca favorita y la
   confirmación de 21+). Cambiar el perfil después es de LHB-34; aquí un segundo POST da 409. */
import { userOf, tokenOf, issuersOf, json } from '../_lib/auth.js';
import { checkProfile } from '../_lib/profile.js';

export async function onRequestPost({ request, env }) {
  if (!tokenOf(request)) return json({ error: 'no-session' }, 401);
  if (!issuersOf(env).length) return json({ error: 'no-auth-config' }, 503);
  const user = await userOf(request, env);
  if (!user) return json({ error: 'no-session' }, 401);
  if (!env.DB) return json({ error: 'no-db' }, 503);
  // solo JSON: un formulario de otro sitio no puede mandarlo sin preflight
  if (!/^application\/json\b/i.test(request.headers.get('Content-Type') || '')) return json({ error: 'bad-type' }, 415);
  let body;
  try { body = await request.json(); } catch (e) { return json({ error: 'bad-body' }, 400); }
  const p = checkProfile(body);
  if (p.error) return json({ error: p.error }, 400);
  const now = new Date().toISOString();
  try {
    const r = await env.DB.prepare(
      'INSERT INTO profiles (user_id, handle, display_name, bio, favorite_brand, age_ok_at, created_at, updated_at) ' +
      'VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?6, ?6) ON CONFLICT(user_id) DO NOTHING'
    ).bind(user.sub, p.handle, p.display_name, p.bio, p.favorite_brand, now).run();
    if (!r.meta.changes) return json({ error: 'profile-exists' }, 409);
  } catch (e) {
    if (/UNIQUE/i.test(String(e && e.message))) return json({ error: 'handle-taken' }, 409);
    throw e;
  }
  const { handle, display_name, bio, favorite_brand } = p;
  return json({ profile: { handle, display_name, bio, favorite_brand, avatar_key: null } }, 201);
}
