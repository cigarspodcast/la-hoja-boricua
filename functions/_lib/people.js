/* LHB-57: buscar personas por @ o por nombre (prefijo, sin importar mayúsculas). Solo lo público de cada persona: @, nombre público (nombre e inicial del apellido) y foto.
   Nunca fecha de nacimiento, género, correo ni el apellido completo. */
import { publicName } from './profile.js';
export const QMIN = 2;
export const QMAX = 40;
export const PAGE = 20;
export const CASEMAX = 6;
export const SCAN = 100;
export const SCANMAX = 1000;

const CONTROL = /[\p{Cc}\p{Zl}\p{Zp}]/u;
const CURSOR = /^[a-z0-9_]{3,20}$/;

// q: texto de 2 a 40 caracteres ya sin espacios de los lados ni un @ de entrada; el cursor es el @ de la última persona de la página anterior
export function parseQuery(rawQ, rawCursor) {
  if (typeof rawQ !== 'string') return { error: 'q-short' };
  let q = rawQ.normalize('NFC').trim().replace(/^@/, '').trim().replace(/\s+/g, ' ');
  if (CONTROL.test(q)) return { error: 'q-invalid' };
  const n = [...q].length;
  if (n < QMIN) return { error: 'q-short' };
  if (n > QMAX) return { error: 'q-long' };
  if (rawCursor != null && rawCursor !== '' && !(typeof rawCursor === 'string' && CURSOR.test(rawCursor))) return { error: 'bad-cursor' };
  return { q, cursor: rawCursor || '' };
}

// el texto buscado no es un patrón: % _ y \ se escapan para que valgan como letras
export const likeOf = q => q.replace(/[\\%_]/g, c => '\\' + c) + '%';

// LIKE de SQLite solo iguala mayúsculas y minúsculas del ASCII. Las demás letras (Á, ñ, É...) tienen dos formas, y la ß también la ẞ
const SHARP = ['ß', 'ẞ'];
const formsOf = c => {
  if (SHARP.includes(c)) return SHARP;
  const lo = c.toLowerCase(), up = c.toUpperCase();
  return c.codePointAt(0) > 127 && lo !== up && [...lo].length === 1 && [...up].length === 1 ? [lo, up] : null;
};

// el comienzo de la primera palabra de lo escrito, con a lo sumo CASEMAX letras de dos formas: con eso la base de datos reúne a los candidatos (un candidato de más no hace daño; uno de menos sí)
export function stemOf(q) {
  const out = [];
  let k = 0;
  for (const c of q.split(' ')[0]) {
    if (formsOf(c)) { if (k === CASEMAX) break; k++; }
    out.push(c);
  }
  return out.join('');
}

// todas las combinaciones de mayúscula y minúscula de las letras que LIKE no iguala (2 a la k, k <= CASEMAX, 64 como mucho)
export function patternsOf(s) {
  let outs = [[]];
  for (const c of s) {
    const f = formsOf(c);
    outs = f ? outs.flatMap(p => f.map(x => p.concat(x))) : outs.map(p => p.concat(c));
  }
  return [...new Set(outs.map(p => likeOf(p.join(''))))];
}

// la comparación de verdad, ya en código y con minúsculas de todo el alfabeto: lo escrito (en minúsculas) abre el @, el nombre, el apellido o "nombre apellido"
const matches = (ql, r) => [r.handle, r.first_name, r.last_name, r.first_name && r.last_name ? r.first_name + ' ' + r.last_name : null]
  .some(s => s != null && s.normalize('NFC').toLowerCase().startsWith(ql));

// las coincidencias empiezan por el @, el nombre, el apellido o "nombre apellido"; nunca perfiles ocultos ni el de quien busca; por @ de la A a la Z, PAGE por página.
// la base de datos trae candidatos por el comienzo de la primera palabra en el @, el nombre o el apellido (lo que se escribe como "nombre apellido" empieza por el nombre; SCAN por tanda, a lo sumo SCANMAX revisados por llamada) y aquí se comprueba todo lo escrito, incluido "nombre apellido"; si se agota SCANMAX, next sigue desde lo último revisado.
// el nombre público siempre se arma aquí (nombre e inicial); un display_name guardado de antes no sale. Sin nombre ni apellido guardados, display_name es null y solo se muestra el @
export async function searchPeople(db, me, { q, cursor }) {
  const pats = patternsOf(stemOf(q)), ql = q.toLowerCase();
  const one = pats.map((_, i) => "(handle LIKE ?" + (i + 3) + " ESCAPE '\\' OR first_name LIKE ?" + (i + 3) + " ESCAPE '\\' OR last_name LIKE ?" + (i + 3) + " ESCAPE '\\')");
  const sql = 'SELECT handle, first_name, last_name, avatar_key FROM profiles ' +
    'WHERE hidden = 0 AND user_id <> ?1 AND handle > ?2 AND (' + one.join(' OR ') + ') ' +
    'ORDER BY handle ASC LIMIT ' + SCAN;
  const found = [];
  let at = cursor, scanned = 0, last = '', cut = false;
  for (;;) {
    const rows = (await db.prepare(sql).bind(me, at, ...pats).all()).results || [];
    for (const r of rows) {
      scanned++; last = r.handle;
      if (matches(ql, r)) found.push(r);
      if (found.length > PAGE) break;
    }
    if (found.length > PAGE || rows.length < SCAN) break;
    if (scanned >= SCANMAX) { cut = true; break; }
    at = rows[rows.length - 1].handle;
  }
  const more = found.length > PAGE;
  const page = more ? found.slice(0, PAGE) : found;
  return {
    people: page.map(r => ({ handle: r.handle, display_name: r.first_name && r.last_name ? publicName(r.first_name, r.last_name) : null, avatar_key: r.avatar_key })),
    next: more ? page[page.length - 1].handle : cut ? last : null
  };
}
