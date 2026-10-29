/* LHB-58: GET /api/u/<handle>, el perfil de una persona para la app (pasaporte primero). Pública, como /u/<handle> (LHB-40), y con la misma lectura: publicPassport.
   → { profile: {handle, display_name, bio, favorite_brand, avatar_key}, counts: {resenas, followers, following, sellos: {artesanos, cigarros, lugares}}, resenas: [...] }
   "resenas" son las catas que su dueño marcó públicas (estrellas, sabores, notas). Los seguidores y seguidos salen de la tabla follows (LHB-56), solo perfiles visibles.
   Nada privado: ni user_id, ni el apellido completo, ni el género, ni la fecha de nacimiento, ni lo demás de Mi Hoja. Un perfil oculto o que no existe da 404.
   LHB-62: con sesión (la cookie de Clerk llega sola desde la app), el perfil de alguien que tiene el par bloqueado con quien mira también da 404. */
import { json } from '../../_lib/auth.js';
import { publicPassport } from '../../_lib/passport.js';
import { countsOf, isBlocked, viewerOf } from '../../_lib/follow.js';

export async function onRequestGet({ request, env, params }) {
  if (!env.DB) return json({ error: 'no-db' }, 503);
  try {
    const r = await publicPassport(env.DB, params && params.handle);
    if (!r || await isBlocked(env.DB, await viewerOf(request, env), r.uid)) return json({ error: 'not-found' }, 404);
    const f = await countsOf(env.DB, r.uid);
    const { profile, counts, catas } = r.view;
    return json({ profile, counts: { resenas: counts.catas, followers: f.followers, following: f.following, sellos: counts.sellos }, resenas: catas });
  } catch (e) {
    return json({ error: 'unavailable' }, 503);
  }
}
