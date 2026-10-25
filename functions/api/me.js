/* LHB-24: GET /api/me. 401 sin sesión de Clerk; { needsProfile: true } si aún no creó su perfil; si no, el perfil. */
import { userOf, tokenOf, issuersOf, json } from '../_lib/auth.js';

export async function onRequestGet({ request, env }) {
  if (!tokenOf(request)) return json({ error: 'no-session' }, 401);
  if (!issuersOf(env).length) return json({ error: 'no-auth-config' }, 503);
  const user = await userOf(request, env);
  if (!user) return json({ error: 'no-session' }, 401);
  if (!env.DB) return json({ error: 'no-db' }, 503);
  const p = await env.DB.prepare(
    'SELECT handle, display_name, bio, favorite_brand, avatar_key FROM profiles WHERE user_id = ?1'
  ).bind(user.sub).first();
  return p ? json({ profile: p }) : json({ needsProfile: true });
}
