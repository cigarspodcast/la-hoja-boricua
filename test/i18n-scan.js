// LHB-27: cuenta los textos visibles escritos directo en el código de las vistas (no en site/i18n.js).
// Base de conteo: segmentos literales de site/app.js, uno por aparición, de tres tipos:
//  (1) texto entre > y < en las plantillas HTML, sin las expresiones ${...};
//  (2) valores de aria-label, placeholder, alt y title;
//  (3) cadenas entre comillas simples con espacio o letra acentuada (o el argumento de toast/confirm).
// Un segmento cuenta si tiene al menos dos letras seguidas y no es código, una marca o un nombre de capa (ALLOW).
const ALLOW = new Set(['Cigars Podcast', 'Instagram', 'WhatsApp', 'Facebook', 'YouTube', 'OpenStreetMap', 'Podcast', 'Lounge',
  'Claro', 'Connecticut', 'Natural', 'Colorado', 'Habano', 'Corojo', 'Criollo', 'Maduro', 'Oscuro', 'La Hoja', 'Boricua', 'Puerto Rico']);
const stripExpr = s => { let p; do { p = s; s = s.replace(/\$\{[^{}]*\}/g, ''); } while (s !== p); return s; };
// LHB-29 (Codex ronda 1): un ";" seguido de espacio y minúscula es prosa ("del pie; debe sentirse"), no código
// LHB-112: una condición de medios de sizes ("(min-width:900px) 231px,") es código
const code = s => /=>|;(?! [a-zà-ÿ])|[{}=|]|&&|\?\?|\(['"]|\bconst\b|\breturn\b|\.(map|join|filter)\(|^[',+]|'$|^\(.*\)$|^use strict$|\w\(|^\((?:min|max)-width:\d+px\)/.test(s);
function scan(src) {
  src = src.replace(/\/\* [\s\S]*?\*\//g, ''); // comentarios "/* ... */" (no "image/*")
  const out = [];
  const keep = (kind, raw) => {
    const s = stripExpr(raw).replace(/\s+/g, ' ').trim();
    // LHB-29 (Codex ronda 1): una conjunción sola entre etiquetas (<b>⋮</b> o <b>⋯</b>) también es texto
    if (!(/[A-Za-zÀ-ÿ]{2}/.test(s) || (kind === 'text' && /^[oyeu]$/.test(s))) || code(s) || ALLOW.has(s)) return;
    out.push(kind + ': ' + s);
  };
  for (const m of src.matchAll(/(?<=>)([^<>`]*)(?=<)/g)) keep('text', m[1]);
  for (const m of src.matchAll(/\b(?:aria-label|placeholder|alt|title)="([^"]*)"/g)) keep('attr', m[1]);
  for (const m of src.matchAll(/\b(?:toast|confirm)\('([^']*)'/g)) keep('call', m[1]);
  for (const m of src.matchAll(/\bhead\('([^']*)'/g)) keep('head', m[1]);
  for (const m of src.matchAll(/'([^'\n]*)'/g)) {
    const s = m[1];
    if (/(toast|confirm|head)\($/.test(src.slice(Math.max(0, m.index - 8), m.index))) continue; // ya contadas arriba
    if (/^(#|\.|\[|https?:|img\/|data\/)/.test(s) || /^ ?[a-z-]+$/.test(s)) continue; // selectores, rutas, clases
    if (/<[a-z\/][^>]*>/i.test(s)) { const p = s.split(/<[^>]+>/); keep('html', p[0]); keep('html', p[p.length - 1]); continue; } // lo de en medio ya es "text"
    if (/( |[áéíóúñÁÉÍÓÚÑ¿¡])/.test(s)) keep('str', s);
  }
  for (const m of src.matchAll(/`([^`<>]*)`/g)) if (/\$\{/.test(m[1])) keep('tpl', m[1]);
  return out;
}
module.exports = { scan, ALLOW };
if (require.main === module) {
  const fs = require('fs'), path = require('path');
  const f = process.argv[2] || path.join(__dirname, '..', 'site', 'app.js');
  const r = scan(fs.readFileSync(f, 'utf8'));
  for (const x of r) console.log(x.replace(/\u2014/g, '\\u2014')); // la raya larga se imprime escapada
  console.log('TOTAL', r.length);
}
