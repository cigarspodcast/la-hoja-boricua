/* LHB-63: GET /api/handle?h=<texto> dice si un @ esta libre, para avisarlo mientras la persona escribe (registro y Editar perfil). Solo lectura: nunca escribe un perfil ni dice de quien es un @.
   → {available: true} o {available: false, reason: 'invalid' | 'reserved' | 'taken'}
   Las mismas reglas que al guardar (checkHandle: sin espacios de los lados, minuscula, 3 a 20 de a-z 0-9 _, nombres reservados); el @ que ya es tuyo sale libre (para no marcar el campo sin cambiar).
   Un perfil oculto cuenta como tomado, igual que uno visible. Pide sesion (no perfil: en el registro todavia no hay). Tope de prueba por cuenta (CHECKS_PER_MINUTE, numero a decidir por el dueño): 429 handle-rate.
   Guardar sigue siendo la autoridad: la columna handle es UNIQUE y el servidor contesta 409 handle-taken si alguien se adelanto. */
import { userOf, tokenOf, issuersOf, json } from '../_lib/auth.js';
import { checkHandle } from '../_lib/profile.js';

export const CHECKS_PER_MINUTE = 30; // tope de prueba, a decidir por el dueño

export async function onRequestGet({ request, env }) {
  if (!tokenOf(request)) return json({ error: 'no-session' }, 401);
  if (!issuersOf(env).length) return json({ error: 'no-auth-config' }, 503);
  const user = await userOf(request, env);
  if (!user) return json({ error: 'no-session' }, 401);
  if (!env.DB) return json({ error: 'no-db' }, 503);
  const h = checkHandle(new URL(request.url).searchParams.get('h'));
  // lo que las reglas rechazan se contesta sin tocar la base ni gastar tope
  if (h.error) return json({ available: false, reason: h.error === 'handle-reserved' ? 'reserved' : 'invalid' }, 200);
  try {
    const now = new Date();
    const since = new Date(now.getTime() - 60e3).toISOString();
    // LHB-34: lo vencido se borra de todos, no solo de esta cuenta: así la anotación de una cuenta borrada tampoco se queda
    await env.DB.prepare('DELETE FROM handle_checks WHERE created_at <= ?1').bind(since).run();
    // revisar y anotar en UNA sentencia, para que pedidos a la vez no pasen el tope
    const t = await env.DB.prepare(
      'INSERT INTO handle_checks (user_id, created_at) SELECT ?1, ?2 WHERE (SELECT COUNT(*) FROM handle_checks WHERE user_id = ?1 AND created_at > ?3) < ?4'
    ).bind(user.sub, now.toISOString(), since, CHECKS_PER_MINUTE).run();
    if (!t.meta.changes) return json({ error: 'handle-rate' }, 429);
    const row = await env.DB.prepare('SELECT user_id FROM profiles WHERE handle = ?1').bind(h.handle).first();
    if (!row || row.user_id === user.sub) return json({ available: true }, 200);
    return json({ available: false, reason: 'taken' }, 200);
  } catch (e) {
    // sin la tabla (la migracion 0005 todavia no se aplica) o con la base caida: el formulario no muestra nada y guardar sigue revisando
    return json({ error: 'unavailable' }, 503);
  }
}
