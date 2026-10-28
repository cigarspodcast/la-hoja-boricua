// LHB-87 hypothesis test: how many map pins overlap another at the island zooms, before and after groupPins.
// usage: node evidence/lhb-87-overlap.js   (from the worktree root)
// Counting basis: places in data/places.json with lat and lng; a pin's box is the 26 x 34 leaf icon anchored at its tip
// (pinBox in site/app.js), a group's box the 36 px circle; "overlapping" means its box touches another box (less than
// 2 px of air), which is what leaves axe target-size short of 24 x 24 free. Projection: Web Mercator at 256 px tiles,
// as Leaflet uses; the zoom the page opens at depends on the map width (fitBounds of every place, padding 28, max 11).
const fs = require('fs'), path = require('path');
const app = fs.readFileSync(path.join(__dirname, '..', 'site', 'app.js'), 'utf8');
const a = app.match(/const pinBox=\(x,y,n\)=>[^\n]*/), b = app.match(/function groupPins\(items\)\{[^\n]*return gs\}/);
const { pinBox, groupPins } = new Function(a[0] + '\n' + b[0] + ';return {pinBox,groupPins}')();
const P = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'places.json'), 'utf8')).filter(p => p.lat && p.lng);
const px = (p, z) => { const s = 256 * 2 ** z, la = p.lat * Math.PI / 180; return { x: (p.lng + 180) / 360 * s, y: (1 - Math.log(Math.tan(la) + 1 / Math.cos(la)) / Math.PI) / 2 * s } };
const touch = (a, b) => a[0] < b[2] + 2 && b[0] < a[2] + 2 && a[1] < b[3] + 2 && b[1] < a[3] + 2;
const overl = gs => { const bx = gs.map(g => pinBox(g.x, g.y, g.ms.length)); return bx.filter((x, i) => bx.some((y, j) => i !== j && touch(x, y))).length };
console.log('places with coordinates', P.length);
console.log('zoom  pins overlapping (before)  markers after grouping  groups  markers overlapping (after)');
for (const z of [8, 9, 10, 11, 12, 13, 14, 15]) {
  const items = P.map((p, i) => ({ ...px(p, z), m: i }));
  const before = overl(items.map(i => ({ x: i.x, y: i.y, ms: [i.m] })));
  const gs = groupPins(items);
  console.log(String(z).padStart(4), String(before).padStart(26), String(gs.length).padStart(23), String(gs.filter(g => g.ms.length > 1).length).padStart(7), String(overl(gs)).padStart(28));
}
