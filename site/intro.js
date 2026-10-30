/* LHB-72: la intro, la guagua que pasa por la montaña (seis segundos, sin bucle). Se ve la primera vez y luego a lo sumo una vez cada 14 días,
   nunca dos veces en la misma sesión. No sale con menos movimiento, con ahorro de datos, con la página escondida, en un enlace directo, ni
   al abrir la app instalada si ya se vio. Empieza sin sonido (botón para oírla), se salta con el botón o con Escape y tiene límites de tiempo.
   Lo esencial de la app no depende de ella. La vuelve a mostrar ?intro=1 (el enlace "Ver intro" de Acerca de), una vez: sale de la dirección. */
(()=>{'use strict';
const KEY='vb_introAt',SKEY='vb_intro',DAY=864e5,EVERY=14;
/* la decisión, sin tocar el navegador: devuelve 'play' o la razón para no mostrarla */
function decide(o){
 if(o.hidden)return 'hidden';
 if(o.reduced)return 'reduced';
 if(o.saveData)return 'saveData';
 if(o.storage===false)return 'storage';
 if(o.assets===false)return 'assets';
 if(o.replay)return 'play';
 if(o.deep)return 'deep';
 if(o.session)return 'session';
 if(o.last==null)return 'play';
 if(o.standalone)return 'standalone';
 return o.now-o.last>=EVERY*DAY?'play':'recent';
}
/* lo que el navegador dice ahora; una fecha guardada que no es un número cuenta como ninguna; una en el futuro (el reloj se atrasó) cuenta como ahora, salvo que pase de 14 días */
function inputs(now){
 const w=window,mm=q=>{try{return !!(w.matchMedia&&w.matchMedia(q).matches)}catch(e){return false}};
 let last=null,session=false,storage=true;
 try{const n=Number(w.localStorage.getItem(KEY));if(Number.isFinite(n)&&n>0&&n<=now+EVERY*DAY)last=Math.min(n,now);session=w.sessionStorage.getItem(SKEY)==='1'}catch(e){storage=false}
 const h=w.location.hash||'';let replay=false;try{replay=new URLSearchParams(w.location.search).get('intro')==='1'}catch(e){}
 /* lo que la intro necesita del resto de la app: sus estilos (styles.css marca --intro-ready) y sus textos (i18n.js); un shell viejo en caché no los trae */
 let css='';try{css=w.getComputedStyle(w.document.documentElement).getPropertyValue('--intro-ready').trim()}catch(e){}
 const assets=css==='1'&&!!w.LHB_I18N&&w.LHB_I18N.t('intro.skip')!=='intro.skip';
 return {now,last,session,storage,assets,replay,hidden:!!w.document.hidden,reduced:mm('(prefers-reduced-motion: reduce)'),
  saveData:!!(w.navigator.connection&&w.navigator.connection.saveData),deep:!!h&&!/^#\/?(catalogo\/?)?$/.test(h),
  standalone:mm('(display-mode: standalone)')||w.navigator.standalone===true}
}
function play(now){
 const w=window,d=w.document,app=d.getElementById('app');if(!app)return;
 try{w.localStorage.setItem(KEY,String(now));w.sessionStorage.setItem(SKEY,'1')}catch(e){return}
 const tt=k=>w.LHB_I18N?w.LHB_I18N.t(k):k,o=w.innerHeight>w.innerWidth?'portrait':'landscape';
 const ov=d.createElement('section');ov.className='intro';ov.setAttribute('role','dialog');ov.setAttribute('aria-modal','true');ov.setAttribute('aria-label',tt('intro.label'));
 ov.innerHTML=`<video muted playsinline preload="auto" aria-hidden="true" poster="assets/intro/poster-${o}.webp"></video><div class="intro-mark"><img src="icons/icon.svg" alt="" width="40" height="40"><b>${tt('intro.name')}</b><span lang="es">${tt('brand.tagline')}</span></div><button type="button" class="intro-skip">${tt('intro.skip')}</button><button type="button" class="intro-sound" aria-pressed="false">${tt('intro.soundOn')}</button><p class="intro-credit">${tt('intro.credit')} <a href="https://callepomarrosas.com/" target="_blank" rel="noopener">${tt('intro.creditName')}</a></p>`;
 const v=ov.querySelector('video'),skip=ov.querySelector('.intro-skip'),sound=ov.querySelector('.intro-sound'),link=ov.querySelector('a'),ring=[skip,sound,link];
 v.muted=true;v.loop=false;v.volume=.75;v.src='assets/intro/intro-'+o+'.mp4';
 const motion=w.matchMedia?w.matchMedia('(prefers-reduced-motion: reduce)'):null;
 let done=false,started=false,tLoad=0,tMax=0,tStall=0;
 const onHidden=()=>{if(d.hidden)finish()};
 function finish(){if(done)return;done=true;clearTimeout(tLoad);clearTimeout(tMax);clearTimeout(tStall);try{v.pause();v.removeAttribute('src');v.load()}catch(e){}
  app.inert=false;ov.remove();w.removeEventListener('hashchange',finish);d.removeEventListener('visibilitychange',onHidden);if(motion&&motion.removeEventListener)motion.removeEventListener('change',finish);
  const view=d.getElementById('view');if(view)view.focus({preventScroll:true})}
 skip.addEventListener('click',finish);v.addEventListener('ended',finish);v.addEventListener('error',finish);
 sound.addEventListener('click',()=>{if(done)return;v.muted=!v.muted;sound.setAttribute('aria-pressed',String(!v.muted));sound.textContent=v.muted?tt('intro.soundOn'):tt('intro.soundOff')});
 ov.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();finish();return}if(e.key!=='Tab')return;const i=ring.indexOf(d.activeElement);
  if(e.shiftKey&&i<=0){e.preventDefault();ring[ring.length-1].focus()}else if(!e.shiftKey&&(i===ring.length-1||i<0)){e.preventDefault();ring[0].focus()}});
 d.body.appendChild(ov);app.inert=true;skip.focus({preventScroll:true});
 w.addEventListener('hashchange',finish);d.addEventListener('visibilitychange',onHidden);if(motion&&motion.addEventListener)motion.addEventListener('change',finish);
 /* límites: si no arranca en 1,8 s, si se traba más de 0,7 s después de arrancar, o a los 9 s pase lo que pase, se cierra */
 tLoad=setTimeout(finish,1800);tMax=setTimeout(finish,9000);
 v.addEventListener('playing',()=>{started=true;clearTimeout(tLoad);clearTimeout(tStall)});
 v.addEventListener('waiting',()=>{if(started){clearTimeout(tStall);tStall=setTimeout(finish,700)}});
 try{const p=v.play();if(p&&p.catch)p.catch(finish)}catch(e){finish()}
 api.finish=finish;
}
/* ?intro=1 vale una vez: sale de la dirección antes de decidir; si no se puede quitar, no cuenta (Codex ronda 2), para que recargar no la repita */
function boot(now){const i=inputs(now);
 if(i.replay){let gone=false;try{const w=window,u=new URL(w.location.href);u.searchParams.delete('intro');w.history.replaceState(w.history.state,'',u.pathname+u.search+u.hash);gone=true}catch(e){}if(!gone)i.replay=false}
 const why=decide(i);if(why==='play')api.play(now);return why}
const api={decide,inputs,play,boot,KEY,SKEY,EVERY,finish:()=>{}};
window.LHB_INTRO=api;
api.last=boot(Date.now());
})();
