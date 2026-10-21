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
// v17: la garita se sustituyó por la flor de tabaco (pedido de Sergio, 21 oct 2026). Estilo vectorial con sombreado suave.
function rs(R,k=.5){let p='';for(let i=0;i<5;i++){const a=-1.5708+i*1.2566,v=(b,r)=>(r*Math.cos(b)).toFixed(1)+' '+(r*Math.sin(b)).toFixed(1);p+=(i?'':'M'+v(a-.6283,R*k))+'Q'+v(a,R*1.25)+' '+v(a+.6283,R*k)}return p+'Z'}
function flor(cls=''){const k='f'+(++n),u=(id,x,y,a=0,s=1,m)=>`<use href="#${k}${id}" transform="translate(${x} ${y})${m?' scale(-1 1)':''} rotate(${a}) scale(${s})"/>`;
 return `<svg class="flor ${cls}" viewBox="0 0 130 160" role="img" aria-label="Flor de tabaco"><defs><linearGradient id="${k}g" x2="1" y2="1"><stop offset="0" stop-color="#9ad866"/><stop offset="1" stop-color="#3f8a35"/></linearGradient><linearGradient id="${k}t" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#f7e3c8"/><stop offset="1" stop-color="#ee79a6"/></linearGradient><linearGradient id="${k}b" x1="0" y1="1" x2="0" y2="0"><stop offset=".3" stop-color="#8cc05a"/><stop offset="1" stop-color="#f07fab"/></linearGradient>
 <g id="${k}l"><path d="M0 0C6-22 44-26 62-3C46 16 10 18 0 0Z" fill="url(#${k}g)"/><path d="M0 0Q30-3 62-3C46 16 10 18 0 0Z" fill="#14381c" opacity=".2"/><path d="M2 0Q30-3 59-3M14-1l8-12M28-2l9-12M42-3l8-9M14 0l8 9M28-1l9 9M42-2l8 6" stroke="#e2f3bf" stroke-width="1.1" fill="none" opacity=".6"/></g>
 <g id="${k}f"><path d="M-2.2-5C-2.4-12-3-17-6-21H6C3-17 2.4-12 2.2-5Z" fill="url(#${k}t)"/><path d="${rs(9)}" transform="translate(0 -22) scale(1 .45)" fill="#e8619a"/><ellipse cy="-22" rx="2.6" ry="1.1" fill="#a8335f"/><path d="M-3.2 0-4-6H4L3.2 0Z" fill="#6fae44"/></g>
 <g id="${k}s"><path d="${rs(9)}" fill="#ec6ba0"/><path d="${rs(5,.6)}" fill="#f9b3cf"/><circle r="1.6" fill="#fff2b0"/></g>
 <path id="${k}d" d="M0 0C-3.5-6-3.5-14 0-20C3.5-14 3.5-6 0 0Z" fill="url(#${k}b)"/></defs>
 <ellipse cx="65" cy="156" rx="34" ry="3.5" fill="#000" opacity=".22"/>
 <path d="M65 157C66 124 63 88 65 56M65 60 50 46M65 60 80 46M65 60 56 40M65 60 74 40M65 60 65 36M65 60 46 56M65 60 84 56" stroke="#4f8f32" stroke-width="3.2" fill="none" stroke-linecap="round"/><path d="M64 150C64.5 122 62.5 90 64 62" stroke="#a6d77a" stroke-width="1" fill="none" opacity=".6"/>
 ${[[128,22,1],[113,14,.94,1],[97,6,.82],[83,-4,.68,1],[71,-16,.5]].map(([y,a,s,m])=>u('l',65,y,a,s,m)).join('')}
 ${[[46,56,-70,1.3],[84,56,68,1.3]].map(([x,y,a,s])=>u('d',x,y,a,s)).join('')}
 ${[[50,46,-50,1.3],[56,40,-20,1.35],[74,40,20,1.35],[80,46,50,1.3]].map(([x,y,a,s])=>u('f',x,y,a,s)).join('')}
 ${[[65,26,0,1.2],[36,32,-10,.95],[94,33,10,.95]].map(([x,y,a,s])=>u('s',x,y,a,s)).join('')}
 ${u('d',65,12,0,.6)}</svg>`}
function flamboyan(cls=''){const k='b'+(++n),q=i=>{const x=Math.sin(i*91.7)*4e4;return x-Math.floor(x)},B=[[16,52,11],[30,44,14],[48,37,16],[70,34,17],[92,37,16],[110,44,14],[124,52,11],[40,54,11],[62,55,12],[84,55,12],[104,54,11]];let t='';
 for(let i=0;i<120;i++){const a=q(i)*6.283,r=Math.sqrt(q(i+.37)),x=70+Math.cos(a)*r*56,y=44+Math.sin(a)*r*14;t+=`<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${(1.2+q(i+.7)*1.5).toFixed(1)}" fill="${y<40?(q(i+.2)<.5?'#ffd25a':'#ffaa44'):(q(i+.2)<.5?'#d63a26':'#f26a31')}"/>`}
 return `<svg class="flamboyan ${cls}" viewBox="0 0 140 124" role="img" aria-label="Flamboyán"><defs><radialGradient id="${k}" cx="66" cy="18" r="66" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#ff9a3e"/><stop offset=".45" stop-color="#ec5a2c"/><stop offset="1" stop-color="#c22c22"/></radialGradient><linearGradient id="${k}t" x2="1"><stop offset="0" stop-color="#8a5a34"/><stop offset=".6" stop-color="#5e3b22"/><stop offset="1" stop-color="#3f2716"/></linearGradient></defs>
 <ellipse cx="70" cy="119" rx="40" ry="4" fill="#000" opacity=".25"/><ellipse cx="68" cy="116" rx="28" ry="5" fill="#3f8a35"/><path d="M46 116l-2-6 4 5 1-7 2 8M86 116l2-6 1 6 3-5-1 6M60 117l-1-5 3 5" stroke="#7cc04a" stroke-width="1.6" fill="none" stroke-linecap="round"/>
 <path d="M58 117C64 104 62 94 66 84C60 76 46 70 26 66L28 62C46 66 58 70 66 76C66 70 62 64 54 58L57 55C66 61 70 68 70 76C76 68 90 62 112 61L112 65C94 66 82 72 74 80C82 76 90 70 94 62L97 64C92 74 82 82 74 88C72 98 74 108 80 117Z" fill="url(#${k}t)"/>
 <path d="M65 112C67 104 69 98 68 90M70 108C73 100 70 94 72 88" stroke="#3a2314" stroke-width="1.2" fill="none" opacity=".7"/>
 ${[[26,62,8],[114,62,8],[50,64,7],[90,64,7],[70,62,7]].map(([x,y,r])=>`<circle cx="${x}" cy="${y}" r="${r}" fill="#3c7a32"/>`).join('')}
 ${B.map(([x,y,r])=>`<circle cx="${x}" cy="${y}" r="${r}" fill="#a3221d"/>`).join('')}
 ${B.map(([x,y,r])=>`<circle cx="${x}" cy="${y-2.5}" r="${r-2.5}" fill="url(#${k})"/>`).join('')}
 ${t}</svg>`}
function leaf(color,cls=''){return `<svg class="leafsvg ${cls}" viewBox="0 0 40 52" aria-hidden="true"><path d="M20 2 C 34 12 38 28 32 40 C 28 47 23 50 20 51 C 17 50 12 47 8 40 C 2 28 6 12 20 2Z" fill="${color}" stroke="#2a1a12" stroke-width="3" stroke-linejoin="round"/><path d="M20 8 V48 M20 20 l7 -5 M20 28 l9 -5 M20 36 l8 -4 M20 20 l-7 -5 M20 28 l-9 -5 M20 36 l-8 -4" stroke="#2a1a12" stroke-width="2" stroke-linecap="round" opacity=".55"/></svg>`}
// Vehículo de la app: 'volky' (Beetle caricatura) o 'guagua' (camper). Un solo cambio aquí.
const VEHICULO='guagua';
const carro=(cls)=>VEHICULO==='guagua'?guagua(cls):volky(cls);
window.VBArt={volky,guagua,carro,coqui,flor,garita:flor,flamboyan,leaf,star};
})();
