// LHB-29 evidence: the Spanish moved to i18n.js, not rewritten.
// Puts each T.es value back in place of its tt() call in site/hoja.js (test/i18n-resolve.js), joins adjacent
// single-quoted pieces ('<p>'+'Texto'+'</p>' is the string '<p>Texto</p>'), and word-diffs the result against
// hoja.js on main (BASE). Every difference left is printed; the reviewer reads each one.
// usage: node evidence/lhb-29-resolve-compare.js BASE   (run from the repo root)
const fs = require('fs'), os = require('os'), path = require('path'), cp = require('child_process');
const base = process.argv[2] || '0530ca3';
const w = {}; require('vm').runInNewContext(fs.readFileSync('site/i18n.js', 'utf8'), { window: w });
const ES = w.LHB_I18N.T.es;
const { resolve } = require('../test/i18n-resolve.js');
let r = resolve(fs.readFileSync('site/hoja.js', 'utf8'), ES), p;
do { p = r; r = r.replace(/(?<![=(,:?\s])'\+'(?![;),:])/g, ''); } while (r !== p);
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lhb29-'));
const a = path.join(dir, 'main.js'), b = path.join(dir, 'resolved.js');
fs.writeFileSync(a, cp.execFileSync('git', ['show', base + ':site/hoja.js']));
fs.writeFileSync(b, r);
const d = cp.spawnSync('git', ['diff', '--no-index', '--word-diff=plain', '--word-diff-regex=[^[:space:]]+', a, b], { encoding: 'utf8' }).stdout;
const re = /\[-([\s\S]*?)-\]|\{\+([\s\S]*?)\+\}/g; let m, n = 0;
console.log('LHB-29 resolve-compare: site/hoja.js with its tt() calls resolved to T.es, against ' + base + ':site/hoja.js');
console.log('counting basis: one line per word-diff run (- removed from main, + added on the branch), cut at 240 characters');
while ((m = re.exec(d))) { n++; console.log((m[1] !== undefined ? '- ' : '+ ') + (m[1] ?? m[2]).replace(/\s+/g, ' ').slice(0, 240).replace(/\u2014/g, '\\u2014')); }
console.log('RUNS ' + n);
// the pairing range: the second end used to print the raw key; it now prints fortLabel(key) in lower case
const keys = [...new Set([...fs.readFileSync('site/hoja.js', 'utf8').matchAll(/\bf:\[([^\]]*)\]/g)].flatMap(x => [...x[1].matchAll(/'(\w+)'/g)].map(y => y[1])))];
for (const k of keys) console.log('range end ' + k + ': es ' + JSON.stringify(ES['fort.' + k].toLowerCase()) + (ES['fort.' + k].toLowerCase() === k ? ' = key' : ' DIFFERS'));
fs.rmSync(dir, { recursive: true, force: true });
