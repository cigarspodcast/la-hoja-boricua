/* LHB-34: borrar la cuenta. Qué tablas guardan filas de una persona y en qué columnas, cómo se borran y cómo se borra su usuario en Clerk.
   La lista es cerrada a propósito: si la base tiene una tabla que esta lista no conoce, no se borra nada (una tabla nueva tiene que decir aquí
   dónde guarda a la persona antes de que se pueda borrar una cuenta). Una tabla de la lista que todavía no existe en la base (una migración sin
   aplicar) no puede tener filas y se salta. */

// tabla -> columnas que nombran a la persona. Primero las que apuntan a profiles, al final profiles.
export const USER_TABLES = [
  ['follow_events', ['follower_id']],
  ['follows', ['follower_id', 'followee_id']],
  ['handle_checks', ['user_id']],
  ['mihoja', ['user_id']],
  ['profiles', ['user_id']],
];
// lo de SQLite, D1 y wrangler, que no guarda datos de nadie
export const INTERNAL = n => /^(sqlite_|_cf_)/.test(n) || n === 'd1_migrations';

// { present: [tablas de la lista que existen], unknown: [tablas que la lista no conoce] }
export async function userTables(db) {
  const r = await db.prepare("SELECT name FROM sqlite_master WHERE type = 'table'").bind().all();
  const names = ((r && r.results) || []).map(x => x.name).filter(n => !INTERNAL(n));
  const known = new Map(USER_TABLES);
  return {
    present: USER_TABLES.filter(([t]) => names.includes(t)),
    unknown: names.filter(n => !known.has(n)).sort(),
  };
}

// una sentencia por tabla, en el orden de USER_TABLES; los nombres salen de la lista, nunca del pedido
export const deletes = (db, present, sub) => present.map(([t, cols]) =>
  db.prepare(`DELETE FROM ${t} WHERE ${cols.map(c => c + ' = ?1').join(' OR ')}`).bind(sub));

// La llave secreta de Clerk tiene que ser de la misma instancia que firmó la sesión: sk_test_ para la de desarrollo (*.clerk.accounts.dev),
// sk_live_ para la de producción. Con la llave de la otra, Clerk diría 404 y la cuenta de verdad quedaría viva.
export function clerkKey(env, iss) {
  const k = String((env && env.CLERK_SECRET_KEY) || '').trim();
  if (!k) return null;
  let host = '';
  try { host = new URL(iss).hostname; } catch (e) { return null; }
  const dev = /\.clerk\.accounts\.dev$/.test(host);
  return k.startsWith(dev ? 'sk_test_' : 'sk_live_') ? k : null;
}

// ¿esta llave conoce a este usuario? true (200), false (404: otra instancia, o ya se borró) o null (Clerk no contestó). El prefijo de la llave dice
// desarrollo o producción, no cuál instancia: dos instancias de desarrollo tienen llaves sk_test_, y solo la buena conoce al usuario.
export async function clerkUser(key, sub, fetchFn = fetch) {
  let r;
  try {
    r = await fetchFn('https://api.clerk.com/v1/users/' + encodeURIComponent(sub), { method: 'GET', headers: { Authorization: 'Bearer ' + key } });
  } catch (e) {
    return null;
  }
  return r.status === 200 ? true : r.status === 404 ? false : null;
}

// borra el usuario en Clerk, que cierra todas sus sesiones. Un 404 es que ya no estaba (otro pedido lo borró entre la revisión y aquí).
export async function deleteClerkUser(key, sub, fetchFn = fetch) {
  let r;
  try {
    r = await fetchFn('https://api.clerk.com/v1/users/' + encodeURIComponent(sub), { method: 'DELETE', headers: { Authorization: 'Bearer ' + key } });
  } catch (e) {
    return false;
  }
  return r.status === 200 || r.status === 404;
}
