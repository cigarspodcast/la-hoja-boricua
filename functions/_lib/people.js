/* LHB-57: buscar personas por @ o por nombre (prefijo, sin importar mayúsculas). Solo lo público de cada persona: @, nombre público (nombre e inicial del apellido) y foto.
   Nunca fecha de nacimiento, género, correo ni el apellido completo. */
import { publicName } from './profile.js';
export const QMIN = 2;
export const QMAX = 40;
export const PAGE = 20;
export const CASEMAX = 6;

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

// LIKE de SQLite solo iguala mayúsculas y minúsculas del ASCII; para letras como Á, ñ o É se prueban las dos formas de cada una (2 a la k combinaciones, k <= CASEMAX; con más, solo todo en minúscula, todo en mayúscula y la inicial en mayúscula)
export function patternsOf(q) {
  const cs = [...q];
  const ix = [];
  cs.forEach((c, i) => { const lo = c.toLowerCase(), up = c.toUpperCase(); if (lo !== up && c.codePointAt(0) > 127 && [...lo].length === 1 && [...up].length === 1) ix.push(i); });
  const out = new Set();
  if (ix.length <= CASEMAX) {
    for (let m = 0; m < (1 << ix.length); m++) {
      const v = cs.slice();
      ix.forEach((i, b) => { v[i] = (m >> b) & 1 ? cs[i].toUpperCase() : cs[i].toLowerCase() });
      out.add(likeOf(v.join('')));
    }
  } else {
    const low = q.toLowerCase(), up = q.toUpperCase(), cap = [...low][0].toUpperCase() + [...low].slice(1).join('');
    [low, up, cap, q].forEach(s => out.add(likeOf(s)));
  }
  return [...out];
}

// las coincidencias empiezan por el @, el nombre, el apellido o "nombre apellido"; nunca perfiles ocultos ni el de quien busca; por @ de la A a la Z, PAGE por página.
// el nombre público siempre se arma aquí (nombre e inicial); un display_name guardado de antes no sale. Sin nombre ni apellido guardados, display_name es null y solo se muestra el @
export async function searchPeople(db, me, { q, cursor }) {
  const pats = patternsOf(q);
  const one = pats.map((_, i) => "(handle LIKE ?" + (i + 3) + " ESCAPE '\\' OR first_name LIKE ?" + (i + 3) + " ESCAPE '\\' OR last_name LIKE ?" + (i + 3) + " ESCAPE '\\' OR (first_name || ' ' || last_name) LIKE ?" + (i + 3) + " ESCAPE '\\')");
  const rows = (await db.prepare(
    'SELECT handle, first_name, last_name, avatar_key FROM profiles ' +
    'WHERE hidden = 0 AND user_id <> ?1 AND handle > ?2 AND (' + one.join(' OR ') + ') ' +
    'ORDER BY handle ASC LIMIT ' + (PAGE + 1)
  ).bind(me, cursor, ...pats).all()).results || [];
  const more = rows.length > PAGE;
  const page = more ? rows.slice(0, PAGE) : rows;
  return {
    people: page.map(r => ({ handle: r.handle, display_name: r.first_name && r.last_name ? publicName(r.first_name, r.last_name) : null, avatar_key: r.avatar_key })),
    next: more ? page[page.length - 1].handle : null
  };
}
