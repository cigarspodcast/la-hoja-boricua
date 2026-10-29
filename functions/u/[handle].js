/* LHB-40: GET /u/<handle>, el pasaporte público de una persona, hecho en el servidor (HTML, sin JavaScript).
   Foto, nombre público, @, bio, marca favorita, los conteos y la cuadrícula de catas públicas; tocar una abre su tarjeta (estrellas, sabores, notas) con :target.
   Lo que se lee sale de publicPassport (functions/_lib/passport.js), la misma lectura de la app. Un perfil oculto o que no existe da el mismo 404.
   noindex, follow al lanzar (para compartir; indexar se decide en M5). La imagen para compartir es og.jpg: las fotos de las catas viven en el teléfono hasta LHB-35. */
import { publicPassport } from '../_lib/passport.js';

export const CONTACT = 'sergio@cigarspodcast.com'; // el contacto de privacidad.html
const ROBOTS = 'noindex, follow';
const MES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const KIND_LABEL = { artesanos: 'artesanos', cigarros: 'cigarros', lugares: 'lugares' };
// LHB-96: los sabores de la rueda se guardan por su id (site/hoja.js WHEEL) y aquí salen con su nombre, como en la app (los mismos textos en español de site/i18n.js).
// Lo que no es de la rueda sale como se escribió
export const WHEEL_NAME = { madera: 'Madera', tierra: 'Tierra', especias: 'Especias', dulce: 'Dulce', cacao: 'Cacao / café', frutos: 'Frutos', floral: 'Floral', cuero: 'Cuero', nuez: 'Nuez' };
const tagName = t => Object.prototype.hasOwnProperty.call(WHEEL_NAME, t) ? WHEEL_NAME[t] : t;

// todo texto que entra al HTML, en el cuerpo o en un atributo, pasa por aquí
export const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

const fecha = d => d ? +d.slice(8, 10) + ' ' + MES[+d.slice(5, 7) - 1] + ' ' + d.slice(0, 4) : '';
const stars = n => n ? '<span class="pp-stars" role="img" aria-label="' + n + ' de 5 estrellas">' + '★'.repeat(n) + '☆'.repeat(5 - n) + '</span>' : '<span class="pp-stars pp-sin">Sin estrellas</span>';
// las iniciales como en la app: la primera letra del nombre y la de la última palabra; sin nombre, la del @
const initials = p => {
  const w = (p.display_name || '').split(/\s+/).filter(Boolean);
  const first = s => [...s][0] || '';
  return (w.length ? first(w[0]) + (w.length > 1 ? first(w[w.length - 1]) : '') : first(p.handle)).toUpperCase();
};

const HEADERS = {
  'content-type': 'text/html; charset=utf-8',
  // sin caché: ocultar un perfil lo quita en el próximo pedido
  'cache-control': 'no-store',
  'x-robots-tag': ROBOTS,
  'x-content-type-options': 'nosniff',
  // la página no corre JavaScript; solo su hoja de estilo y las fotos de Clerk
  'content-security-policy': "default-src 'none'; style-src 'self'; font-src 'self'; img-src 'self' https://img.clerk.com; base-uri 'none'; form-action 'none'; frame-ancestors 'none'"
};
const html = (body, status) => new Response(body, { status, headers: HEADERS });

const shell = (head, main) => '<!doctype html>\n<html lang="es-PR">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1">\n' +
  head + '<meta name="robots" content="' + ROBOTS + '">\n<link rel="stylesheet" href="/u.css">\n</head>\n<body>\n' +
  '<header><a class="brand" href="/">La Hoja <em>Boricua</em></a><a class="app" href="/">Abrir la app</a></header>\n<main>\n' + main + '</main>\n';

function notFound() {
  return html(shell('<title>Perfil no encontrado | La Hoja Boricua</title>\n',
    '<h1>Este perfil no está disponible</h1>\n<p class="tag">Puede que el enlace esté viejo o que la persona lo haya quitado.</p>\n<p><a href="/">Ir a La Hoja Boricua</a></p>\n') +
    '<footer><a href="/">La Hoja Boricua</a></footer>\n</body>\n</html>\n', 404);
}

export function renderPassport(v, origin) {
  const p = v.profile, at = '@' + p.handle;
  const url = origin + '/u/' + p.handle, img = origin + '/og.jpg';
  const title = at + ' en La Hoja Boricua';
  const desc = p.bio || 'Las catas públicas de ' + at + ' en La Hoja Boricua.';
  const meta = (k, val, attr = 'property') => '<meta ' + attr + '="' + k + '" content="' + esc(val) + '">\n';
  const head = '<title>' + esc(title) + '</title>\n' + meta('description', desc, 'name') + '<link rel="canonical" href="' + esc(url) + '">\n' +
    meta('og:type', 'profile') + meta('og:site_name', 'La Hoja Boricua') + meta('og:locale', 'es_PR') + meta('og:title', title) + meta('og:description', desc) +
    meta('og:url', url) + meta('og:image', img) + meta('og:image:alt', 'La Hoja Boricua') +
    meta('twitter:card', 'summary_large_image', 'name') + meta('twitter:title', title, 'name') + meta('twitter:description', desc, 'name') + meta('twitter:image', img, 'name');

  const av = p.avatar_key
    ? '<img class="pp-av" src="' + esc(p.avatar_key) + '" alt="Foto de ' + esc(at) + '" width="96" height="96">'
    : '<span class="pp-av pp-ini" aria-hidden="true">' + esc(initials(p)) + '</span>';
  let main = '<section class="pp-head">' + av + '<div>' +
    '<h1>' + esc(p.display_name || at) + '</h1>' + (p.display_name ? '<p class="pp-h">' + esc(at) + '</p>' : '') +
    (p.bio ? '<p class="pp-bio">' + esc(p.bio) + '</p>' : '') +
    (p.favorite_brand ? '<p class="pp-fav">Marca favorita: <b>' + esc(p.favorite_brand) + '</b></p>' : '') + '</div></section>\n';

  const c = v.counts;
  main += '<ul class="pp-counts"><li><b>' + c.catas + '</b><span>' + (c.catas === 1 ? 'cata pública' : 'catas públicas') + '</span></li>' +
    Object.keys(KIND_LABEL).map(k => '<li><b>' + c.sellos[k] + '</b><span>' + (c.sellos[k] === 1 ? 'sello' : 'sellos') + ' de ' + KIND_LABEL[k] + '</span></li>').join('') + '</ul>\n';

  main += '<h2 id="catas">Catas públicas</h2>\n';
  if (!v.catas.length) main += '<p class="pp-empty">Todavía no hay catas públicas.</p>\n';
  else {
    const sub = e => [e.marca, e.artesano, fecha(e.consumido)].filter(Boolean).map(esc).join(' · ');
    main += '<ul class="pp-grid">' + v.catas.map((e, i) => '<li><a class="pp-cata" href="#cata-' + (i + 1) + '"><b>' + esc(e.nombre || 'Cigarro') + '</b>' + stars(e.rating) +
      (e.consumido ? '<small>' + esc(fecha(e.consumido)) + '</small>' : '') + '</a></li>').join('') + '</ul>\n';
    main += v.catas.map((e, i) => '<article class="pp-card" id="cata-' + (i + 1) + '" aria-labelledby="cata-' + (i + 1) + '-t"><div class="pp-card-in">' +
      '<a class="pp-x" href="#catas" aria-label="Cerrar">×</a><h3 id="cata-' + (i + 1) + '-t">' + esc(e.nombre || 'Cigarro') + '</h3>' +
      (sub(e) ? '<p class="pp-sub">' + sub(e) + '</p>' : '') + stars(e.rating) +
      (e.tags.length ? '<ul class="pp-tags">' + e.tags.map(t => '<li>' + esc(tagName(t)) + '</li>').join('') + '</ul>' : '') +
      (e.notas ? '<p class="pp-notas">' + esc(e.notas) + '</p>' : '') + '</div></article>\n').join('');
  }
  const report = 'mailto:' + CONTACT + '?subject=' + encodeURIComponent('Reportar ' + at) + '&body=' + encodeURIComponent(url);
  return shell(head, main) + '<footer><a href="' + esc(report) + '">Reportar este perfil</a> · <a href="/privacidad">Privacidad</a> · <a href="/">La Hoja Boricua</a></footer>\n</body>\n</html>\n';
}

const unavailable = () => html(shell('<title>No disponible | La Hoja Boricua</title>\n', '<h1>No se pudo cargar el perfil</h1>\n<p class="tag">Intenta otra vez en un rato.</p>\n') + '</body>\n</html>\n', 503);

export async function onRequestGet({ request, env, params }) {
  if (!env.DB) return unavailable();
  let r;
  try { r = await publicPassport(env.DB, params && params.handle); } catch (e) { return unavailable(); }
  if (!r) return notFound();
  return html(renderPassport(r.view, new URL(request.url).origin), 200);
}
