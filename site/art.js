(()=>{
function star(cx,cy,R){const r=R*.382;let p='';for(let i=0;i<10;i++){const a=-Math.PI/2+i*Math.PI/5,rr=i%2?r:R;p+=(i?'L':'M')+(cx+rr*Math.cos(a)).toFixed(1)+','+(cy+rr*Math.sin(a)).toFixed(1)}return p+'Z'}
let n=0;
// v9: el dibujo SVG viejo se borró; volky() queda como alias para no romper llamadas.
function volky(cls=''){return guagua(cls)}

const COQUI_INNER=`<ellipse cx="60" cy="102" rx="36" ry="5" fill="#000" opacity=".2"/>
 <path d="M24 92 C 10 92 12 78 26 80 M96 92 C 110 92 108 78 94 80" stroke="#6b4a2a" stroke-width="7" fill="none" stroke-linecap="round"/>
 <ellipse cx="60" cy="70" rx="36" ry="28" fill="#a7743f" stroke="#3a2417" stroke-width="4"/>
 <ellipse cx="60" cy="80" rx="22" ry="14" fill="#e3c08e"/>
 <circle cx="40" cy="38" r="17" fill="#a7743f" stroke="#3a2417" stroke-width="4"/><circle cx="80" cy="38" r="17" fill="#a7743f" stroke="#3a2417" stroke-width="4"/>
 <circle cx="40" cy="38" r="11" fill="#fff"/><circle cx="80" cy="38" r="11" fill="#fff"/><circle cx="42" cy="40" r="6" fill="#2a1a12"/><circle cx="82" cy="40" r="6" fill="#2a1a12"/><circle cx="44" cy="37" r="2" fill="#fff"/><circle cx="84" cy="37" r="2" fill="#fff"/>
 <path d="M48 62 q 12 10 24 0" stroke="#3a2417" stroke-width="4" fill="none" stroke-linecap="round"/><circle cx="34" cy="60" r="5" fill="#e88a6a" opacity=".7"/><circle cx="86" cy="60" r="5" fill="#e88a6a" opacity=".7"/>
 <path d="M30 92 c -4 6 4 8 8 2 M90 92 c 4 6 -4 8 -8 2" stroke="#3a2417" stroke-width="4" fill="none" stroke-linecap="round"/>`;
function guagua(cls=''){
 // v8: la guagua es la ilustración B que escogió Sergio (turquesa y crema, sin logo), recortada en WebP con transparencia.
 // Sustituye el dibujo SVG de la v6 (tablilla HOJA PR). Mismo nombre y VEHICULO='guagua' para no romper nada.
 return `<img class="volky guagua ${cls}" src="img/guagua/guagua_recorte.webp" width="600" height="400" alt="Guagua turquesa y crema" decoding="async" draggable="false">`}

function coqui(cls=''){return `<svg class="coqui ${cls}" viewBox="0 0 120 110" role="img" aria-label="Coquí">${COQUI_INNER}</svg>`}
function garita(cls=''){return `<svg class="garita ${cls}" viewBox="0 0 120 150" role="img" aria-label="Garita"><ellipse cx="60" cy="146" rx="48" ry="4" fill="#000" opacity=".2"/>
 <path d="M60 4 C 48 18 42 26 42 36 L 78 36 C 78 26 72 18 60 4Z" fill="#efc56f" stroke="#3a2417" stroke-width="4" stroke-linejoin="round"/><circle cx="60" cy="5" r="5" fill="#efc56f" stroke="#3a2417" stroke-width="3.5"/>
 <rect x="34" y="34" width="52" height="11" rx="5" fill="#e2a39a" stroke="#3a2417" stroke-width="4"/>
 <path d="M40 45 h40 v62 h-40z" fill="#f4e9d6" stroke="#3a2417" stroke-width="4" stroke-linejoin="round"/>
 <path d="M52 64 a8 8 0 0 1 16 0 v24 h-16z" fill="#3a2417"/>
 <path d="M26 107 h68 l10 38 h-88z" fill="#d8c29a" stroke="#3a2417" stroke-width="4" stroke-linejoin="round"/>
 <path d="M24 120 h72 M20 133 h80" stroke="#3a2417" stroke-width="3" opacity=".45"/></svg>`}
function flamboyan(cls=''){const blobs=[[40,40,24],[70,30,26],[100,42,24],[55,58,22],[88,60,22],[28,60,16],[114,62,16]];return `<svg class="flamboyan ${cls}" viewBox="0 0 140 130" role="img" aria-label="Flamboyán"><ellipse cx="70" cy="126" rx="44" ry="4" fill="#000" opacity=".2"/>
 <path d="M64 124 C 66 100 64 84 56 70 M70 124 C 70 96 78 82 92 70 M68 96 C 60 88 46 84 36 78" stroke="#5a3a22" stroke-width="9" fill="none" stroke-linecap="round"/>
 ${blobs.map(([x,y,r])=>`<circle cx="${x}" cy="${y}" r="${r}" fill="#e0472c" stroke="#3a2417" stroke-width="4"/>`).join('')}
 ${blobs.map(([x,y,r])=>`<circle cx="${x}" cy="${y}" r="${r-4}" fill="#ef5f3e"/>`).join('')}
 ${[[46,34],[78,24],[98,40],[60,54],[90,56],[30,58]].map(([x,y])=>`<circle cx="${x}" cy="${y}" r="3.2" fill="#ffd36b"/>`).join('')}
 <path d="M48 76 q 8 6 16 0 M86 76 q 8 6 16 0" stroke="#6f9b4a" stroke-width="5" fill="none" stroke-linecap="round"/></svg>`}
function leaf(color,cls=''){return `<svg class="leafsvg ${cls}" viewBox="0 0 40 52" aria-hidden="true"><path d="M20 2 C 34 12 38 28 32 40 C 28 47 23 50 20 51 C 17 50 12 47 8 40 C 2 28 6 12 20 2Z" fill="${color}" stroke="#2a1a12" stroke-width="3" stroke-linejoin="round"/><path d="M20 8 V48 M20 20 l7 -5 M20 28 l9 -5 M20 36 l8 -4 M20 20 l-7 -5 M20 28 l-9 -5 M20 36 l-8 -4" stroke="#2a1a12" stroke-width="2" stroke-linecap="round" opacity=".55"/></svg>`}
// Vehículo de la app: 'volky' (Beetle caricatura) o 'guagua' (camper). Un solo cambio aquí.
const VEHICULO='guagua';
const carro=(cls)=>VEHICULO==='guagua'?guagua(cls):volky(cls);
window.VBArt={volky,guagua,carro,coqui,garita,flamboyan,leaf,star};
})();
