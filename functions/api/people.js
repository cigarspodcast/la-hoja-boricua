/* LHB-57: GET /api/people?q=ana&cursor=ana_mora → { people: [{handle, display_name, avatar_key}], next }.
   Para quien tiene cuenta y perfil (401 sin sesión, 403 sin perfil): buscar personas es de dentro de la app. La consulta pide al menos 2 caracteres (400 q-short), a lo sumo 40 (q-long);
   no hay lista de todos. Perfiles ocultos nunca salen, ni quien tiene el par bloqueado con quien busca (LHB-62). */
import { json } from '../_lib/auth.js';
import { requireProfile } from '../_lib/profile.js';
import { parseQuery, searchPeople } from '../_lib/people.js';

export async function onRequestGet({ request, env }) {
  const g = await requireProfile(request, env);
  if (g instanceof Response) return g;
  const u = new URL(request.url).searchParams;
  const p = parseQuery(u.get('q'), u.get('cursor'));
  if (p.error) return json({ error: p.error }, 400);
  return json(await searchPeople(env.DB, g.user.sub, p));
}
