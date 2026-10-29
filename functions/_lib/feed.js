/* LHB-61: Siguiendo, las catas públicas de las personas que sigues. Solo lectura y sin tabla nueva: sale de follows, profiles y mihoja.
   Una cata entra solo si su dueño la marcó pública (publica === true, la misma regla que publicDoc en passport.js) y su perfil no está oculto.
   Cada cata sale con la misma lista cerrada que el pasaporte (publicEntry): nunca la foto del teléfono, el id de la entrada ni la fecha en que se guardó.
   El autor sale con el nombre público del pasaporte (nombre e inicial del apellido), nunca con un display_name guardado que puede traer el apellido entero.
   El orden es el del perfil: la más reciente primero por el día en que se fumó; a igual día, por @ y luego por el orden del diario de esa persona. */
import { checkAvatar, publicName } from './profile.js';
import { PAGE, isBlocked } from './follow.js';
import { publicEntry } from './passport.js';

/* el cursor es "día~@" del último grupo de la página: el día ("-" si no tiene) y el @ de su dueño. Un grupo son las catas de una persona en un día,
   y una página termina siempre con un grupo entero: así nada que esa persona haga en un grupo ya visto (una cata nueva, una que se vuelve pública
   o privada, una borrada) mueve a las que faltan (Codex ronda 1: con el lugar dentro del grupo en el cursor, una vieja que se volvía pública
   hacía saltar otra). Solo un grupo de más de PAGE catas (más de 20 públicas de una persona en un mismo día) se parte, para no pasar de 20 por
   página (Codex ronda 2): ahí el cursor es "día~@~n~h~j", con n el lugar de la última cata entre las públicas del grupo, contando desde la más
   vieja, h la huella de lo público de esa cata y j cuántas del grupo, contando desde la más vieja hasta ella, tienen esa misma huella. La página
   siguiente sigue después de la j-ésima cata con esa huella, desde la más vieja, así que lo que pase con las demás catas del grupo (una nueva, una
   vieja que se vuelve pública, una que se borra o se vuelve privada) no hace saltar ni repetir (Codex ronda 3), tampoco si otra cata es igual a
   ella en lo público, más nueva o más vieja (Codex ronda 4: escoger la más cercana a n podía escoger la gemela). Una cata nueva va al principio
   del diario, más nueva que todas, y no mueve la cuenta desde la más vieja. El límite aceptado: si cambia esa misma cata, o una más vieja que es
   igual a ella en lo público (para quien mira, la misma cata), entra o sale de esa huella, se sigue por la j-ésima que quede con esa
   huella, o por n si ya no hay j (Codex ronda 5: puede repetir o saltar dentro de ese límite).
   No lleva nada privado: ni el id de la entrada, ni cuántas privadas hay; la huella y j son de lo público */
const CURSOR = /^(\d{4}-\d{2}-\d{2}|-)~([a-z0-9_]{3,20})(?:~([1-9]\d{0,6})~([0-9a-f]{20})~([1-9]\d{0,6}))?$/;
export function parseFeedCursor(raw) {
  if (raw == null || raw === '') return { cursor: null };
  const m = typeof raw === 'string' ? CURSOR.exec(raw) : null;
  return m ? { cursor: { day: m[1] === '-' ? '' : m[1], handle: m[2], n: m[3] ? Number(m[3]) : 0, h: m[4] || '', j: m[5] ? Number(m[5]) : 0 } } : { error: 'bad-cursor' };
}

/* un miembro de un objeto JSON por su llave exacta, y como JSON.parse, el último si se repite. Una ruta como '$.publica' no sirve: SQLite la
   compara hasta el primer carácter nulo, así que "publica\u0000x": true pasaba por publica y sacaba una cata privada (Codex ronda 2).
   json_each compara la llave entera */
const member = (obj, key, pick) => '(SELECT ' + pick + ' FROM json_each(' + obj + ") x WHERE x.key = '" + key + "' ORDER BY x.id DESC LIMIT 1)";
/* el diario: un documento que no es JSON, o sin diario en lista, no aporta nada (y no rompe la consulta de los demás) */
const DIARIO = 'COALESCE(' + member("CASE WHEN json_valid(m.doc) THEN m.doc ELSE '{}' END", 'diario', "CASE WHEN x.type = 'array' THEN x.value END") + ", '[]')";
/* pública solo si su publica es true (publica === true, la misma regla que publicDoc) */
const PUBLICA = member('j.value', 'publica', 'x.type') + " = 'true'";
/* el día solo cuenta si el valor guardado entero tiene la forma de un día (la misma que publicEntry); si no, la cata va al final, como en el perfil.
   GLOB se para en un carácter nulo y dejaba pasar "2026-10-28\u0000..." (Codex ronda 1): por eso se cuentan sus bytes */
const DAY = 'COALESCE(' + member('j.value', 'consumido', "CASE WHEN x.type = 'text' AND length(CAST(x.value AS BLOB)) = 10 AND x.value GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]' THEN x.value END") + ", '')";

const SQL =
  'WITH e AS (SELECT p.user_id AS uid, p.handle, p.first_name, p.last_name, p.avatar_key, j.key AS k, j.value AS v, ' + DAY + ' AS day ' +
  'FROM follows f JOIN profiles p ON p.user_id = f.followee_id AND p.hidden = 0 JOIN mihoja m ON m.user_id = f.followee_id, ' +
  'json_each(' + DIARIO + ') j ' +
  "WHERE f.follower_id = ?1 AND j.type = 'object' AND " + PUBLICA + ') ' +
  'SELECT uid, handle, first_name, last_name, avatar_key, v, day FROM e ';
const AFTER = 'WHERE day < ?2 OR (day = ?2 AND handle < ?3) ';
const GROUP = 'WHERE day = ?2 AND handle = ?3 ';
// en el diario la más nueva va primero (k es su lugar en la lista)
const ORDER = 'ORDER BY day DESC, handle DESC, k ASC';

const key = r => (r.day || '-') + '~' + r.handle;
const read = async (db, where, args, limit) => (await db.prepare(SQL + where + ORDER + (limit ? ' LIMIT ' + limit : '')).bind(...args).all()).results || [];

/* la huella de una cata: SHA-256 de lo público de ella (publicEntry), sus primeros 80 bits en hexadecimal. Con 32 bits (FNV-1a) dos catas
   distintas podían dar la misma huella y pasar por gemelas (Codex ronda 4) */
async function huella(r) {
  let e = null;
  try { e = JSON.parse(r.v); } catch (x) { e = null; }
  const t = JSON.stringify(e && typeof e === 'object' ? publicEntry(e) : null);
  const d = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(t)));
  return Array.from(d.subarray(0, 10), b => b.toString(16).padStart(2, '0')).join('');
}

/* las catas de un grupo grande, de PAGE en PAGE, después de la última que se vio (sin n, desde el principio); su tamaño lo limita Mi Hoja (LIST_MAX entradas) */
async function groupPage(db, me, day, handle, n, h, j) {
  const rows = await read(db, GROUP, [me, day, handle]), fp = await Promise.all(rows.map(huella));
  // [fila, su lugar desde la más vieja, su huella, cuántas con esa huella hay desde la más vieja hasta ella]
  const g = rows.map((r, i) => [r, rows.length - i, fp[i], 0]), seen = new Map();
  for (let i = g.length - 1; i >= 0; i--) { const c = (seen.get(g[i][2]) || 0) + 1; seen.set(g[i][2], c); g[i][3] = c; }
  let start = 0;
  if (n) {
    const at = g.findIndex(x => x[2] === h && x[3] === j);
    start = at >= 0 ? at + 1 : g.findIndex(x => x[1] < n);
    if (start < 0) start = g.length;
  }
  const rest = g.slice(start), page = rest.slice(0, PAGE), last = page[page.length - 1];
  if (rest.length > PAGE) return { page: page.map(x => x[0]), next: key({ day, handle }) + '~' + last[1] + '~' + last[2] + '~' + last[3] };
  return { page: page.map(x => x[0]), next: (await read(db, AFTER, [me, day, handle], 1)).length ? key({ day, handle }) : null };
}

// una página: { items: [{ author: {handle, display_name, avatar_key}, entry }], next }
export async function feedOf(db, me, cursor) {
  let page, next = null;
  if (cursor && cursor.n) ({ page, next } = await groupPage(db, me, cursor.day, cursor.handle, cursor.n, cursor.h, cursor.j));
  else {
    const rows = cursor ? await read(db, AFTER, [me, cursor.day, cursor.handle], PAGE + 1) : await read(db, '', [me], PAGE + 1);
    page = rows;
    if (rows.length > PAGE) {
      // la fila de más dice si el último grupo quedó cortado; si es así, ese grupo va entero en la página siguiente
      const cut = key(rows[PAGE]);
      page = rows.slice(0, PAGE);
      while (page.length && key(page[page.length - 1]) === cut) page.pop();
      if (page.length) next = key(page[page.length - 1]);
      else ({ page, next } = await groupPage(db, me, rows[0].day, rows[0].handle, 0, '', 0));
    }
  }
  // LHB-62 (bloquear) completa isBlocked; una persona bloqueada se salta aquí, y el cursor sigue siendo el de la última cata leída
  const blocked = new Map();
  const items = [];
  for (const r of page) {
    if (!blocked.has(r.uid)) blocked.set(r.uid, await isBlocked(db, me, r.uid));
    if (blocked.get(r.uid)) continue;
    let e = null;
    try { e = JSON.parse(r.v); } catch (x) { e = null; }
    // la consulta ya escoge solo las públicas; esta es la segunda vuelta, con la misma regla que publicDoc
    if (!e || typeof e !== 'object' || Array.isArray(e) || e.publica !== true) continue;
    const av = checkAvatar(r.avatar_key);
    items.push({ author: { handle: r.handle, display_name: r.first_name && r.last_name ? publicName(r.first_name, r.last_name) : null, avatar_key: av.error ? null : av.avatar_key }, entry: publicEntry(e) });
  }
  return { items, next };
}
