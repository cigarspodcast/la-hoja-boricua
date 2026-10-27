/* LHB-57: buscar personas por @ o por nombre (prefijo, sin importar mayúsculas). Solo lo público de cada persona: @, nombre público (nombre e inicial del apellido) y foto.
   Nunca fecha de nacimiento, género, correo ni el apellido completo. */
export const QMIN = 2;
export const QMAX = 40;
export const PAGE = 20;

const CONTROL = /[\p{Cc}\p{Zl}\p{Zp}]/u;
const CURSOR = /^[a-z0-9_]{3,20}$/;

// q: texto de 2 a 40 caracteres ya sin espacios de los lados ni un @ de entrada; el cursor es el @ de la última persona de la página anterior
export function parseQuery(rawQ, rawCursor) {
  if (typeof rawQ !== 'string') return { error: 'q-short' };
  let q = rawQ.trim().replace(/^@/, '').replace(/\s+/g, ' ');
  if (CONTROL.test(q)) return { error: 'q-invalid' };
  const n = [...q].length;
  if (n < QMIN) return { error: 'q-short' };
  if (n > QMAX) return { error: 'q-long' };
  if (rawCursor != null && rawCursor !== '' && !(typeof rawCursor === 'string' && CURSOR.test(rawCursor))) return { error: 'bad-cursor' };
  return { q, cursor: rawCursor || '' };
}

// el texto buscado no es un patrón: % _ y \ se escapan para que valgan como letras
export const likeOf = q => q.replace(/[\\%_]/g, c => '\\' + c) + '%';

// las coincidencias empiezan por el @, el nombre, el apellido o "nombre apellido"; nunca perfiles ocultos ni el de quien busca; por @ de la A a la Z, PAGE por página
export async function searchPeople(db, me, { q, cursor }) {
  const rows = (await db.prepare(
    'SELECT handle, display_name, avatar_key FROM profiles ' +
    'WHERE hidden = 0 AND user_id <> ?1 AND handle > ?2 AND ' +
    "(handle LIKE ?3 ESCAPE '\\' OR first_name LIKE ?3 ESCAPE '\\' OR last_name LIKE ?3 ESCAPE '\\' OR (first_name || ' ' || last_name) LIKE ?3 ESCAPE '\\') " +
    'ORDER BY handle ASC LIMIT ' + (PAGE + 1)
  ).bind(me, cursor, likeOf(q)).all()).results || [];
  const more = rows.length > PAGE;
  const page = more ? rows.slice(0, PAGE) : rows;
  return {
    people: page.map(r => ({ handle: r.handle, display_name: r.display_name, avatar_key: r.avatar_key })),
    next: more ? page[page.length - 1].handle : null
  };
}
