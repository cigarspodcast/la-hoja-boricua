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
   hacía saltar otra). No lleva nada privado: ni el id de la entrada, ni cuántas privadas hay */
const CURSOR = /^(\d{4}-\d{2}-\d{2}|-)~([a-z0-9_]{3,20})$/;
export function parseFeedCursor(raw) {
  if (raw == null || raw === '') return { cursor: null };
  const m = typeof raw === 'string' ? CURSOR.exec(raw) : null;
  return m ? { cursor: { day: m[1] === '-' ? '' : m[1], handle: m[2] } } : { error: 'bad-cursor' };
}

/* un documento que no es JSON, o sin diario en lista, no aporta nada (y no rompe la consulta de los demás) */
const DOC = "CASE WHEN json_valid(m.doc) AND json_type(m.doc, '$.diario') = 'array' THEN m.doc ELSE '{\"diario\":[]}' END";
/* el día solo cuenta si el valor guardado entero tiene la forma de un día (la misma que publicEntry); si no, la cata va al final, como en el perfil.
   Se mira el texto JSON del valor, con sus comillas: GLOB sobre el valor leído se para en un carácter nulo y dejaba pasar "2026-10-28\u0000...",
   que publicEntry no acepta y que hacía un cursor que este mismo archivo rechaza (Codex ronda 1) */
const DAY = "CASE WHEN (j.value -> '$.consumido') GLOB '\"[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]\"' THEN json_extract(j.value, '$.consumido') ELSE '' END";

const SQL =
  'WITH e AS (SELECT p.user_id AS uid, p.handle, p.first_name, p.last_name, p.avatar_key, j.key AS k, j.value AS v, ' + DAY + ' AS day ' +
  'FROM follows f JOIN profiles p ON p.user_id = f.followee_id AND p.hidden = 0 JOIN mihoja m ON m.user_id = f.followee_id, ' +
  'json_each(' + DOC + ", '$.diario') j " +
  "WHERE f.follower_id = ?1 AND j.type = 'object' AND json_type(j.value, '$.publica') = 'true') " +
  'SELECT uid, handle, first_name, last_name, avatar_key, v, day FROM e ';
const AFTER = 'WHERE day < ?2 OR (day = ?2 AND handle < ?3) ';
const GROUP = 'WHERE day = ?2 AND handle = ?3 ';
// en el diario la más nueva va primero (k es su lugar en la lista)
const ORDER = 'ORDER BY day DESC, handle DESC, k ASC';

const key = r => (r.day || '-') + '~' + r.handle;
const read = async (db, where, args, limit) => (await db.prepare(SQL + where + ORDER + (limit ? ' LIMIT ' + limit : '')).bind(...args).all()).results || [];

// una página: { items: [{ author: {handle, display_name, avatar_key}, entry }], next }
export async function feedOf(db, me, cursor) {
  const rows = cursor ? await read(db, AFTER, [me, cursor.day, cursor.handle], PAGE + 1) : await read(db, '', [me], PAGE + 1);
  let page = rows, next = null;
  if (rows.length > PAGE) {
    // la fila de más dice si el último grupo quedó cortado; si es así, ese grupo va entero en la página siguiente
    const cut = key(rows[PAGE]);
    page = rows.slice(0, PAGE);
    while (page.length && key(page[page.length - 1]) === cut) page.pop();
    if (page.length) next = key(page[page.length - 1]);
    else {
      // un grupo de más de PAGE catas (más de 20 públicas de una persona en un mismo día) sale entero, en su propia página;
      // su tamaño lo limita Mi Hoja (LIST_MAX entradas y BODY_MAX caracteres)
      page = await read(db, GROUP, [me, rows[0].day, rows[0].handle]);
      next = (await read(db, AFTER, [me, rows[0].day, rows[0].handle], 1)).length ? key(rows[0]) : null;
    }
  }
  // LHB-62 (bloquear) completa isBlocked; una persona bloqueada se salta aquí, y el cursor sigue siendo el del último grupo leído
  const blocked = new Map();
  const items = [];
  for (const r of page) {
    if (!blocked.has(r.uid)) blocked.set(r.uid, await isBlocked(db, me, r.uid));
    if (blocked.get(r.uid)) continue;
    let e = null;
    try { e = JSON.parse(r.v); } catch (x) { e = null; }
    if (!e || typeof e !== 'object' || Array.isArray(e)) continue;
    const av = checkAvatar(r.avatar_key);
    items.push({ author: { handle: r.handle, display_name: r.first_name && r.last_name ? publicName(r.first_name, r.last_name) : null, avatar_key: av.error ? null : av.avatar_key }, entry: publicEntry(e) });
  }
  return { items, next };
}
