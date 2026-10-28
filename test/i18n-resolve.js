// LHB-29: pone de vuelta el español en el código: cada tt('k') o tt('k',{a:...}) se cambia por T.es[k].
// Dentro de una plantilla (${tt(...)}) queda el texto, con ${expr} donde iba {a}; suelto, queda una cadena '...'.
// Sirve a las pruebas que buscan un texto en hoja.js y a la evidencia de que el español se movió sin cambiarlo.
function args(s) { // "{a:x,b:y}" o "{n}" -> {a:'x',b:'y'}; "null,v" u otra cosa -> null
  s = s.trim(); if (s[0] !== '{' || s[s.length - 1] !== '}') return null;
  const out = {}; let d = 0, q = null, st = 1;
  const put = p => { p = p.trim(); if (!p) return; const i = p.indexOf(':'); if (i < 0) out[p] = p; else out[p.slice(0, i).trim()] = p.slice(i + 1).trim(); };
  for (let i = 1; i < s.length - 1; i++) {
    const c = s[i];
    if (q) { if (c === '\\') i++; else if (c === q) q = null; continue; }
    if (c === "'" || c === '"' || c === '`') q = c;
    else if ('([{'.includes(c)) d++;
    else if (')]}'.includes(c)) d--;
    else if (c === ',' && d === 0) { put(s.slice(st, i)); st = i + 1; }
  }
  put(s.slice(st, s.length - 1));
  return out;
}
function resolve(s, ES) {
  let o = '', i = 0;
  for (;;) {
    const j = s.indexOf("tt('", i);
    if (j < 0) return o + s.slice(i);
    const ke = s.indexOf("'", j + 4), k = s.slice(j + 4, ke);
    if (/[\w.$]/.test(s[j - 1] || '') || typeof ES[k] !== 'string') { o += s.slice(i, j + 4); i = j + 4; continue; }
    let e = ke + 1, vars = {};
    if (s[e] === ',') {
      let d = 0, q = null; const st = e + 1;
      for (e = st; e < s.length; e++) {
        const c = s[e];
        if (q) { if (c === '\\') e++; else if (c === q) q = null; continue; }
        if (c === "'" || c === '"' || c === '`') q = c;
        else if ('([{'.includes(c)) d++;
        else if (')]}'.includes(c)) { if (d === 0) break; d--; }
      }
      vars = args(s.slice(st, e));
      if (!vars) { o += s.slice(i, j + 4); i = j + 4; continue; }
      for (const n in vars) vars[n] = resolve(vars[n], ES); // un tt() dentro de los valores
    }
    if (s[e] !== ')') { o += s.slice(i, j + 4); i = j + 4; continue; }
    const inTpl = s.slice(j - 2, j) === '${' && s[e + 1] === '}';
    const text = ES[k];
    if (inTpl) { o += s.slice(i, j - 2) + text.replace(/\{(\w+)\}/g, (m, n) => n in vars ? '${' + vars[n] + '}' : m); i = e + 2; }
    else { o += s.slice(i, j) + "'" + text.replace(/'/g, "\\'").replace(/\{(\w+)\}/g, (m, n) => n in vars ? "'+(" + vars[n] + ")+'" : m) + "'"; i = e + 1; }
  }
}
module.exports = { resolve };
