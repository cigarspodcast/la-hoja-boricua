/* LHB-7: la copia vieja en GitHub Pages se retira. Este service worker reemplaza al de la app vieja (lhb-v44):
   borra sus cachés, se da de baja y recarga las pestañas abiertas, que entonces ven el aviso de mudanza (404.html).
   No toca localStorage: la Mi Hoja guardada aquí sigue disponible para su respaldo. */
self.addEventListener('install',()=>self.skipWaiting());
self.addEventListener('activate',e=>{e.waitUntil((async()=>{
 try{const ks=await caches.keys();await Promise.all(ks.map(k=>caches.delete(k)))}catch(err){}
 try{await self.registration.unregister()}catch(err){}
 try{const cs=await self.clients.matchAll({type:'window'});cs.forEach(c=>{try{c.navigate(c.url).catch(()=>{})}catch(err){}})}catch(err){}
})())});
