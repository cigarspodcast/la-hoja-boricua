/* LHB-61: GET /api/feed?cursor=y → { items: [{ author: {handle, display_name, avatar_key}, entry }], next }.
   Siguiendo: las catas públicas de las personas que sigue la cuenta de la sesión, la más reciente primero, 20 por página. Pide sesión con perfil
   (sin sesión 401, sin perfil 403 no-profile). Las reglas y la consulta viven en _lib/feed.js. */
import { json } from '../_lib/auth.js';
import { requireProfile } from '../_lib/profile.js';
import { parseFeedCursor, feedOf } from '../_lib/feed.js';

export async function onRequestGet({ request, env }) {
  const g = await requireProfile(request, env);
  if (g instanceof Response) return g;
  const c = parseFeedCursor(new URL(request.url).searchParams.get('cursor'));
  if (c.error) return json({ error: c.error }, 400);
  return json(await feedOf(env.DB, g.user.sub, c.cursor));
}
