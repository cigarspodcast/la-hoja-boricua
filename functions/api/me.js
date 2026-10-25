/* LHB-24: GET /api/me devuelve {email} con sesión válida, 401 sin ella. */
import { getUser, json } from '../_lib/session.js';

export async function onRequestGet({ request, env }) {
  if (!env.DB) return json({ error: 'no-db' }, 503);
  const user = await getUser(request, env.DB);
  return user ? json({ email: user.email }) : json({ error: 'no-session' }, 401);
}
