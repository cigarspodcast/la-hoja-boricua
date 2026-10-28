/* LHB-40: el pasaporte público de una persona (/u/<handle>), una sola lectura que también usa la app (LHB-58).
   Sale solo lo público del perfil (@, nombre e inicial del apellido, bio, marca favorita, foto), los conteos (catas públicas y sellos por tipo)
   y las catas que su dueño marcó públicas (publica === true), cada una con una lista cerrada de campos.
   Nunca sale el humidor, los favoritos, las estrellas sueltas, cuáles lugares selló, la llave de una foto del teléfono, el id de una entrada,
   el apellido completo, el género ni la fecha de nacimiento. Un perfil oculto o que no existe es null (los dos dan 404 igual). */
import { checkHandle, checkAvatar, publicName } from './profile.js';

export const KINDS = ['artesanos', 'cigarros', 'lugares'];
export const PUBLIC_MAX = 100; // catas públicas que se muestran; el conteo es de todas
const MAX = { nombre: 80, marca: 60, artesano: 80, notas: 1000, tag: 40, tags: 30 };
const DAY = /^\d{4}-\d{2}-\d{2}$/;
const isObj = o => o !== null && typeof o === 'object' && !Array.isArray(o);

// texto recortado por caracteres, no por bytes; lo que no es texto queda vacío
const str = (v, n) => typeof v === 'string' ? [...v.trim()].slice(0, n).join('') : '';

// una cata pública con solo lo que se enseña: lo demás de la entrada (foto, id, fecha de guardado, pasos) se queda en su Mi Hoja
export function publicEntry(e) {
  const r = e.rating;
  return {
    nombre: str(e.nombre, MAX.nombre),
    marca: str(e.marca, MAX.marca),
    artesano: str(e.artesano, MAX.artesano),
    rating: Number.isInteger(r) && r >= 1 && r <= 5 ? r : 0,
    tags: (Array.isArray(e.tags) ? e.tags : []).map(t => str(t, MAX.tag)).filter(Boolean).slice(0, MAX.tags),
    notas: str(e.notas, MAX.notas),
    consumido: typeof e.consumido === 'string' && DAY.test(e.consumido) ? e.consumido : null
  };
}

// del documento guardado: las catas públicas (la más reciente primero, por el día en que se fumó) y los sellos por tipo
export function publicDoc(text) {
  let doc = null;
  try { doc = text == null ? null : JSON.parse(text); } catch (e) { doc = null; }
  if (!isObj(doc)) doc = {};
  const all = (Array.isArray(doc.diario) ? doc.diario : []).filter(e => isObj(e) && e.publica === true).map(publicEntry);
  // orden estable: a igual día se queda el orden del diario (la más nueva primero)
  const catas = all.map((e, i) => [e, i]).sort((a, b) => (b[0].consumido || '').localeCompare(a[0].consumido || '') || a[1] - b[1]).map(x => x[0]);
  const pas = isObj(doc.pasaporte) ? doc.pasaporte : {};
  const sellos = {};
  for (const k of KINDS) sellos[k] = isObj(pas[k]) ? Object.keys(pas[k]).length : 0;
  return { catas, sellos };
}

// { uid, view } o null. uid es solo para quien llama (los conteos de seguidores en LHB-58) y nunca se manda; view es lo que se puede enseñar
export async function publicPassport(db, rawHandle) {
  if (typeof rawHandle !== 'string') return null;
  const h = checkHandle(rawHandle);
  if (h.error) return null;
  const row = await db.prepare(
    'SELECT p.user_id, p.handle, p.first_name, p.last_name, p.bio, p.favorite_brand, p.avatar_key, m.doc FROM profiles p ' +
    'LEFT JOIN mihoja m ON m.user_id = p.user_id WHERE p.handle = ?1 AND p.hidden = 0'
  ).bind(h.handle).first();
  if (!row) return null;
  const { catas, sellos } = publicDoc(row.doc);
  const av = checkAvatar(row.avatar_key);
  return {
    uid: row.user_id,
    view: {
      profile: {
        handle: row.handle,
        display_name: row.first_name && row.last_name ? publicName(row.first_name, row.last_name) : null,
        bio: row.bio || null,
        favorite_brand: row.favorite_brand || null,
        avatar_key: av.error ? null : av.avatar_key
      },
      counts: { catas: catas.length, sellos },
      catas: catas.slice(0, PUBLIC_MAX)
    }
  };
}
