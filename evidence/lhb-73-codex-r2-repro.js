/* LHB-73 Codex round 2: the two bypasses, rebuilt from the real landscape intro, run against the census in test/site.test.js.
   1) the free box moved in front of ftyp and the file renamed .dat; 2) the moov wrapped in a QuickTime cmov (zlib).
   Both files are made in memory and injected into a fake readdir/readFile, as Codex did. Each must be counted.
   usage: node evidence/lhb-73-codex-r2-repro.js [TEST_FILE]   (from the worktree root; TEST_FILE defaults to test/site.test.js) */
const fs = require('fs'), path = require('path'), zlib = require('zlib');
const S = path.resolve('site'), t = fs.readFileSync(process.argv[2] || 'test/site.test.js', 'utf8').replace(/\r\n/g, '\n');
const b = fs.readFileSync(path.join(S, 'assets/intro/intro-landscape.mp4'));
/* top-level boxes of the real file */
const top = []; for (let o = 0; o < b.length;) { let n = b.readUInt32BE(o), h = 8; if (n === 1) { n = Number(b.readBigUInt64BE(o + 8)); h = 16 } else if (n === 0) n = b.length - o; top.push({ ty: b.toString('latin1', o + 4, o + 8), o, n }); o += n }
console.log('top-level boxes:', top.map(x => x.ty + ':' + x.n).join(' '));
const raw = x => b.subarray(x.o, x.o + x.n);
const box = (ty, body) => { const h = Buffer.alloc(8); h.writeUInt32BE(8 + body.length, 0); h.write(ty, 4, 'latin1'); return Buffer.concat([h, body]) };
/* 1: a free box in front of ftyp (offsets in stco would shift by 8; the census reads structure, so that does not matter for the check) */
const moved = Buffer.concat([box('free', Buffer.alloc(0)), b]);
/* 2: moov replaced by moov(cmov(dcom zlib, cmvd size + deflated original moov)) */
const mv = top.find(x => x.ty === 'moov');
const z = zlib.deflateSync(raw(mv)), sz = Buffer.alloc(4); sz.writeUInt32BE(mv.n, 0);
const cmov = box('moov', box('cmov', Buffer.concat([box('dcom', Buffer.from('zlib', 'latin1')), box('cmvd', Buffer.concat([sz, z]))])));
const packed = Buffer.concat(top.map(x => x.ty === 'moov' ? cmov : raw(x)));
const extra = { [path.join(S, 'assets/intro/uncredited.dat')]: moved, [path.join(S, 'assets/intro/packed.mov')]: packed };
const fake = { ...fs,
  readFileSync: (p, ...a) => extra[path.resolve(p)] || fs.readFileSync(p, ...a),
  readdirSync: (p, ...a) => { const e = fs.readdirSync(p, ...a); if (path.resolve(p) === path.join(S, 'assets', 'intro')) for (const k of Object.keys(extra)) e.push({ name: path.basename(k), isDirectory: () => false }); return e } };
const f = new Function('fs', 'path', 'S', t.slice(t.indexOf('function SOUND73'), t.includes('/* cajas de prueba') ? t.indexOf('/* cajas de prueba') : t.indexOf('/* un MP4 de prueba')) + ';return {SOUND73,AUDIO73}')(fake, path, S);
const r1 = f.SOUND73(moved), r2 = f.SOUND73(packed), census = f.AUDIO73();
console.log('free before ftyp, renamed .dat:', r1);
console.log('moov compressed in cmov:', r2);
console.log('census:', census.join(', '));
const ok = census.includes('assets/intro/uncredited.dat') && census.includes('assets/intro/packed.mov') && r1 === 'sound' && r2 === 'unknown';
console.log(ok ? 'RESULT PASS: both rebuilt files are counted and would need credits' : 'RESULT FAIL');
process.exitCode = ok ? 0 : 1;
