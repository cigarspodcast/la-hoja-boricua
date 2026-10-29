/* LHB-61: Siguiendo, las catas públicas de las personas que sigues. Solo lectura y sin tabla nueva: sale de follows, profiles y mihoja.
   Una cata entra solo si su dueño la marcó pública (publica === true, la misma regla que publicDoc en passport.js) y su perfil no está oculto.
   Cada cata sale con la misma lista cerrada que el pasaporte (publicEntry): nunca la foto del teléfono, el id de la entrada ni la fecha en que se guardó.
   El orden es el del perfil: la más reciente primero por el día en que se fumó; a igual día, por @ y luego por el orden del diario de esa persona. */
import { checkAvatar } from './profile.js';
import { PAGE, isBlocked } from './follow.js';
import { publicEntry } from './passport.js';

/* el cursor es "día~@~n" de la última cata de la página: el día ("-" si no tiene), el @ de su dueño y n, su lugar entre las catas públicas de esa persona
   contando desde la más vieja (1 es la primera). Contar desde la más vieja hace que una cata nueva (va al principio del diario) no mueva a las demás.
   No lleva nada privado: ni el id de la entrada, ni cuántas privadas hay */
const CURSOR = /^(\d{4}-\d{2}-\d{2}|-)~([a-z0-9_]{3,20})~([1-9]\d{0,6})$/;
export function parseFeedCursor(raw) {
  if (raw == null || raw === '') return { cursor: null };
  const m = typeof raw === 'string' ? CURSOR.exec(raw) : null;
  return m ? { cursor: { day: m[1] === '-' ? '' : m[1], handle: m[2], pos: Number(m[3]) } } : { error: 'bad-cursor' };
}

/* un documento que no es JSON, o sin diario en lista, no aporta nada (y no rompe la consulta de los demás) */
const DOC = "CASE WHEN json_valid(m.doc) AND json_type(m.doc, '$.diario') = 'array' THEN m.doc ELSE '{\"diario\":[]}' END";
/* el día solo cuenta si tiene la forma de un día (la misma que publicEntry); si no, la cata va al final, como en el perfil */
const DAY = "CASE WHEN json_type(j.value, '$.consumido') = 'text' AND json_extract(j.value, '$.consumido') GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]' THEN json_extract(j.value, '$.consumido') ELSE '' END";

const SQL =
  'WITH e AS (SELECT p.user_id AS uid, p.handle, p.display_name, p.avatar_key, j.value AS v, ' + DAY + ' AS day, ' +
  'ROW_NUMBER() OVER (PARTITION BY p.user_id ORDER BY j.key DESC) AS pos ' +
  'FROM follows f JOIN profiles p ON p.user_id = f.followee_id AND p.hidden = 0 JOIN mihoja m ON m.user_id = f.followee_id, ' +
  'json_each(' + DOC + ", '$.diario') j " +
  "WHERE f.follower_id = ?1 AND j.type = 'object' AND json_type(j.value, '$.publica') = 'true') " +
  'SELECT uid, handle, display_name, avatar_key, v, day, pos FROM e ';
const AFTER = 'WHERE day < ?2 OR (day = ?2 AND (handle < ?3 OR (handle = ?3 AND pos < ?4))) ';
const ORDER = 'ORDER BY day DESC, handle DESC, pos DESC LIMIT ' + (PAGE + 1);

// una página: { items: [{ author: {handle, display_name, avatar_key}, entry }], next }
export async function feedOf(db, me, cursor) {
  const st = db.prepare(SQL + (cursor ? AFTER : '') + ORDER);
  const rows = (await (cursor ? st.bind(me, cursor.day, cursor.handle, cursor.pos) : st.bind(me)).all()).results || [];
  const more = rows.length > PAGE;
  const page = more ? rows.slice(0, PAGE) : rows;
  const last = page[page.length - 1];
  // LHB-62 (bloquear) completa isBlocked; una persona bloqueada se salta aquí, y el cursor sigue siendo el de la última fila leída
  const blocked = new Map();
  const items = [];
  for (const r of page) {
    if (!blocked.has(r.uid)) blocked.set(r.uid, await isBlocked(db, me, r.uid));
    if (blocked.get(r.uid)) continue;
    let e = null;
    try { e = JSON.parse(r.v); } catch (x) { e = null; }
    if (!e || typeof e !== 'object' || Array.isArray(e)) continue;
    const av = checkAvatar(r.avatar_key);
    items.push({ author: { handle: r.handle, display_name: r.display_name || null, avatar_key: av.error ? null : av.avatar_key }, entry: publicEntry(e) });
  }
  return { items, next: more ? (last.day || '-') + '~' + last.handle + '~' + last.pos : null };
}
