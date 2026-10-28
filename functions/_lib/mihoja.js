/* LHB-28 / LHB-31: la Mi Hoja de cada cuenta en el servidor. Una fila por usuario (tabla mihoja de 0002): doc es el JSON de la app (lhb_mihoja_v1) sin lo que es solo del teléfono,
   schema su versión y rev el contador con el que se evitan pisadas: una escritura solo vale si trae el rev que el servidor tiene.
   Es información privada de su dueño: nada de aquí sale por otra ruta. */
export const SCHEMA_MAX = 1;      // la versión del formato que esta app entiende
export const DOC_MAX = 900000;    // caracteres del JSON (un humidor y un diario enormes caben de sobra)
export const LIST_MAX = 5000;     // entradas por lista, favoritos, sellos y estrellas
export const BODY_MAX = 1000000;  // caracteres del cuerpo completo, antes de leerlo como JSON

const isObj = o => o !== null && typeof o === 'object' && !Array.isArray(o);
const KINDS = ['artesanos', 'cigarros', 'lugares'];

// If-Match: el rev que el cliente vio (0 = todavía no hay copia en el servidor); "3" o 3. Devuelve el número o null
export function revOf(h) {
  const m = /^\s*(?:W\/)?(?:"(\d{1,9})"|(\d{1,9}))\s*$/.exec(String(h == null ? '' : h));
  return m ? Number(m[1] !== undefined ? m[1] : m[2]) : null;
}

// lo que manda el cliente: { schema, doc }. Devuelve { text, schema } o { error, status }
export function checkBody(b) {
  if (!isObj(b)) return { error: 'bad-body', status: 400 };
  if (!Number.isInteger(b.schema) || b.schema < 1 || b.schema > SCHEMA_MAX) return { error: 'schema-unsupported', status: 400 };
  if (!isObj(b.doc)) return { error: 'bad-doc', status: 400 };
  for (const k of ['humidor', 'diario']) {
    if (b.doc[k] !== undefined && !Array.isArray(b.doc[k])) return { error: 'bad-doc', status: 400 };
    if ((b.doc[k] || []).length > LIST_MAX) return { error: 'too-big', status: 413 };
  }
  for (const k of ['pasaporte', 'favs', 'ratings']) if (b.doc[k] !== undefined && !isObj(b.doc[k])) return { error: 'bad-doc', status: 400 };
  for (const k of KINDS) {
    if ((b.doc.favs && b.doc.favs[k] !== undefined) && (!Array.isArray(b.doc.favs[k]) || b.doc.favs[k].length > LIST_MAX)) return Array.isArray(b.doc.favs[k]) ? { error: 'too-big', status: 413 } : { error: 'bad-doc', status: 400 };
    if (b.doc.pasaporte && isObj(b.doc.pasaporte[k]) && Object.keys(b.doc.pasaporte[k]).length > LIST_MAX) return { error: 'too-big', status: 413 };
  }
  if (b.doc.ratings && Object.keys(b.doc.ratings).length > LIST_MAX) return { error: 'too-big', status: 413 };
  const text = JSON.stringify(b.doc);
  if (text.length > DOC_MAX) return { error: 'too-big', status: 413 };
  return { text, schema: b.schema };
}

// la fila de la cuenta como la ve el cliente; sin fila: rev 0 y doc null
export function shape(row) {
  if (!row) return { rev: 0, schema: null, doc: null, updated_at: null };
  let doc;
  try { doc = JSON.parse(row.doc); } catch (e) { return null; }
  return { rev: row.rev, schema: row.schema, doc, updated_at: row.updated_at };
}
