/* LHB-24: GET /api/me. 401 sin sesión de Clerk; { needsProfile: true } si aún no creó su perfil; si no, el perfil.
   LHB-52: el perfil trae también nombre, apellido, género y fecha de nacimiento, solo aquí y solo para su dueño (la sesión decide de quién es). Un perfil al que le falta
   alguno de los cuatro (los que existían antes) llega con needsIdentity: true y la app muestra "Completa tu perfil" antes de abrir Mi Hoja.
   LHB-115: también el idioma de la cuenta (lang: 'es', 'en' o null). Antes de la migración 0009 la columna no existe: se lee sin ella y el perfil llega sin lang. */
import { userOf, tokenOf, issuersOf, json } from '../_lib/auth.js';

export async function onRequestGet({ request, env }) {
  if (!tokenOf(request)) return json({ error: 'no-session' }, 401);
  if (!issuersOf(env).length) return json({ error: 'no-auth-config' }, 503);
  const user = await userOf(request, env);
  if (!user) return json({ error: 'no-session' }, 401);
  if (!env.DB) return json({ error: 'no-db' }, 503);
  const sel = 'SELECT handle, display_name, bio, favorite_brand, avatar_key, first_name, last_name, gender, birth_date';
  let p;
  try {
    p = await env.DB.prepare(sel + ', lang FROM profiles WHERE user_id = ?1').bind(user.sub).first();
  } catch (e) {
    if (!/no such column/i.test(String(e && e.message))) throw e;
    p = await env.DB.prepare(sel + ' FROM profiles WHERE user_id = ?1').bind(user.sub).first();
  }
  if (!p) return json({ needsProfile: true });
  const needsIdentity = p.first_name == null || p.last_name == null || p.gender == null || p.birth_date == null;
  return json({ profile: p, needsIdentity });
}
