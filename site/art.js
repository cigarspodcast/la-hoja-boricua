(()=>{
function star(cx,cy,R){const r=R*.382;let p='';for(let i=0;i<10;i++){const a=-Math.PI/2+i*Math.PI/5,rr=i%2?r:R;p+=(i?'L':'M')+(cx+rr*Math.cos(a)).toFixed(1)+','+(cy+rr*Math.sin(a)).toFixed(1)}return p+'Z'}

/* LHB-111: una sola manera de ilustrar fuera de la intro, la del anillo del cigarro y la litografía de la caja de cigarros: dibujo de línea en un solo color,
   la tinta de tabaco (--art-ink), con un solo acento (--art-ac, el ámbar). El color lo pone styles.css (.lart), así que siguen al tema; los dibujos no llevan
   colores propios. Las cabeceras son adorno (aria-hidden: el título ya lo dice). Dibujos originales de este repositorio */
const LA=(name,cls,vb,body)=>`<svg class="lart ${name} ${cls}" viewBox="${vb}" aria-hidden="true" focusable="false">${body}</svg>`;
const sprig=(x,y,d)=>`<path class="fn" d="M${x} ${y}h${18*d}M${x+4*d} ${y}q${3*d} -5 ${7*d} -5q${-1*d} 4 ${-7*d} 5M${x+4*d} ${y}q${3*d} 5 ${7*d} 5q${-1*d} -4 ${-7*d} -5M${x+11*d} ${y}q${3*d} -4 ${6*d} -4q${-1*d} 3 ${-6*d} 4M${x+11*d} ${y}q${3*d} 4 ${6*d} 4q${-1*d} -3 ${-6*d} -4"/>`;
/* Lugares: el ranchón de tabaco, con la hoja colgada a secar */
const ranchon=(cls='')=>LA('ranchon',cls,'0 0 120 100',
 `<circle class="ac" cx="98" cy="22" r="8"/><path d="M6 64C20 54 32 54 40 58M86 56C96 50 106 52 114 58"/>
 <path d="M14 58L60 28L106 58M22 53V90M98 53V90M6 90H114"/><path d="M52 90V66H68V90"/>
 <path class="fn" d="M30 90V48M38 90V43M46 90V38M74 90V38M82 90V43M90 90V48M50 46H70"/>
 <path class="fn" d="M54 46c-3 4-3 10 0 14c3-4 3-10 0-14M60 46c-3 4-3 10 0 14c3-4 3-10 0-14M66 46c-3 4-3 10 0 14c3-4 3-10 0-14"/>`);
/* Eventos: el anillo del cigarro, con su medallón y la estrella */
const banda=(cls='')=>LA('banda',cls,'0 0 120 100',
 `<path d="M8 44Q60 37 112 44V66Q60 73 8 66Z"/><path class="fn" d="M14 49Q60 43 106 49M14 61Q60 67 106 61"/>
 ${sprig(16,55,1)}${sprig(104,55,-1)}
 <path class="bg" d="M42 30Q60 22 78 30V78Q60 88 42 78Z"/><path class="fn" d="M47 34Q60 28 73 34V75Q60 82 47 75Z"/>
 <path class="ac" d="${star(60,54,10)}"/><path class="fn" d="M48 22q6-6 12 0q6-6 12 0"/>`);
/* Artesanos: la chaveta del torcedor, la hoja y el cigarro ya torcido */
const chaveta=(cls='')=>LA('chaveta',cls,'0 0 120 100',
 `<path d="M14 72C10 40 40 12 80 12C80 46 52 74 14 72Z"/><path class="fn" d="M14 72Q44 46 80 12M30 56l-2-14M42 46l-2-16M54 36l-1-14M30 56l14 2M42 46l16 1M54 36l14-1"/>
 <path class="bg" d="M62 82A22 22 0 0 1 106 82Z"/><path d="M62 82A22 22 0 0 1 106 82Z"/><path class="fn" d="M70 82A14 14 0 0 1 98 82"/>
 <rect x="8" y="84" width="74" height="9" rx="4.5"/><rect class="ac" x="60" y="84" width="8" height="9"/>`);
/* Podcast: el micrófono de cápsula */
const micro=(cls='')=>LA('micro',cls,'0 0 120 100',
 `<rect x="44" y="8" width="32" height="48" rx="16"/><path class="fn" d="M48 22H72M46 31H74M46 40H74M48 49H72"/><rect class="ac" x="42" y="54" width="36" height="6" rx="3"/>
 <path d="M34 36V46A26 26 0 0 0 86 46V36M60 72V88M42 92H78"/><path class="fn" d="M24 26q-7 12 0 24M96 26q7 12 0 24M16 20q-11 18 0 36M104 20q11 18 0 36"/>`);
/* Buscar: la lupa sobre la hoja */
const lupa=(cls='')=>LA('lupa',cls,'0 0 120 100',
 `<path d="M10 86C6 48 38 16 78 14C78 52 50 84 10 86Z"/><path class="fn" d="M10 86Q42 54 78 14M26 70l-2-14M38 58l-1-16M50 46l-1-14M26 70l14 1M38 58l15 0"/>
 <circle class="bg" cx="76" cy="58" r="18"/><circle cx="76" cy="58" r="18"/><path class="fn" d="M66 52a12 12 0 0 1 8-6"/><path class="acs th" d="M89 71L106 88"/>`);
/* Acerca de y créditos: la hoja de tabaco, atada por el tallo como se cuelga a secar */
const hoja=(cls='')=>LA('hoja',cls,'0 0 120 100',
 `<path d="M60 92C34 78 26 46 60 8C94 46 86 78 60 92Z"/><path class="fn" d="M60 92V14M60 30l-12-8M60 30l12-8M60 46l-16-10M60 46l16-10M60 62l-18-10M60 62l18-10M60 76l-14-8M60 76l14-8"/>
 <rect class="ac" x="54" y="84" width="12" height="7" rx="2"/><path d="M60 91V97"/>`);
/* Maridajes: la taza de café y el cigarro en el plato */
const maridaje=(cls='')=>LA('maridaje',cls,'0 0 120 100',
 `<path d="M22 54H70V62C70 78 60 86 46 86C32 86 22 78 22 62Z"/><path d="M70 60c11 0 11 15 0 15M12 92H80"/><path class="fn" d="M36 46c-4-6 4-10 0-16M48 46c-4-6 4-10 0-16M58 46c-4-6 4-10 0-16"/>
 <rect x="62" y="82" width="50" height="8" rx="4"/><rect class="ac" x="96" y="82" width="6" height="8"/><path class="fn" d="M109 78c-4-6 4-10 0-18"/>`);
/* Subir y los estados vacíos: la caja de cigarros abierta, con su litografía en la tapa */
const CAJA=`<path d="M32 50L40 14H112L104 50"/><path class="fn" d="M45 20H105L100 44H40Z"/><ellipse class="ac" cx="72" cy="32" rx="10" ry="7"/>
 <path d="M14 60H86V90H14ZM86 60L104 50V80L86 90M14 60L32 50H104"/><path class="fn" d="M36 68H64V80H36Z"/>`;
const caja=(cls='')=>LA('caja',cls,'0 0 120 100',CAJA);
/* LHB-111: el cigarro sin foto, una silueta de línea neutra en el mismo marco 2:1 que las fotos de producto. lit (los colores ya resueltos) es para la imagen
   para compartir, que la dibuja como imagen suelta y no lee la hoja de estilos */
function silueta(label,lit){const st=lit?` fill="none" stroke="${lit.ink}" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"`:'',ac=lit?` fill="${lit.ac}"`:'',fn=lit?` stroke-width="4"`:'';
 return `<svg class="lart sil" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 300"${label?` role="img" aria-label="${label}"`:' aria-hidden="true" focusable="false"'}${st}>
 <path d="M96 122H462C494 122 510 136 510 150C510 164 494 178 462 178H96"/><ellipse cx="96" cy="150" rx="10" ry="28"/>
 <path class="fn"${fn} d="M150 136q60 8 120-2M196 165q70-7 150 2M298 140q40 5 80-1M486 126c-11 9-11 39 0 48"/>
 <rect class="ac"${ac} x="402" y="118" width="38" height="64" rx="5"/></svg>`}
/* el mapa: aquí estás */
const aqui=(cls='')=>LA('aqui',cls,'0 0 30 30',`<circle class="bg" cx="15" cy="15" r="11"/><circle cx="15" cy="15" r="11"/><circle class="ac" cx="15" cy="15" r="4.5"/>`);
/* la hoja de tabaco en los íconos y los pines: no es ilustración, es un ícono con su color (lounge o tienda, la hoja ganada) */
function leaf(color,cls=''){return `<svg class="leafsvg ${cls}" viewBox="0 0 40 52" aria-hidden="true"><path d="M20 2 C 34 12 38 28 32 40 C 28 47 23 50 20 51 C 17 50 12 47 8 40 C 2 28 6 12 20 2Z" fill="${color}" stroke="#2a1a12" stroke-width="3" stroke-linejoin="round"/><path d="M20 8 V48 M20 20 l7 -5 M20 28 l9 -5 M20 36 l8 -4 M20 20 l-7 -5 M20 28 l-9 -5 M20 36 l-8 -4" stroke="#2a1a12" stroke-width="2" stroke-linecap="round" opacity=".55"/></svg>`}
window.VBArt={ranchon,banda,chaveta,micro,lupa,hoja,maridaje,caja,CAJA,silueta,aqui,leaf,star};
})();
