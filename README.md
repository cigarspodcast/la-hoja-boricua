# La Hoja Boricua

App web (PWA) sobre el tabaco artesanal puertorriqueño: artesanos, cigarros hechos en Puerto Rico, lugares, eventos y una sección personal ("Mi Hoja") con humidor, diario de catas, pasaporte y favoritos. Funciona en el teléfono, se puede instalar en la pantalla de inicio y sigue funcionando sin conexión.

**En vivo:** https://lahojaboricua.sites.tab.bot/

> Prototipo — información pública, sujeta a verificación.

## Estructura

- `site/` — la app completa (HTML, CSS y JavaScript sin dependencias de build).
  - `site/data/*.json` — datos de artesanos, cigarros, lugares y eventos; `site/data/bundle.js` es la copia para uso sin conexión.
  - `site/sw.js` — service worker (caché y modo offline).
  - `site/img/`, `site/icons/`, `site/fonts/` — imágenes, íconos y tipografías.
- `tools/build_data.py` — genera `site/data/` a partir de una investigación nueva.
- `tools/rebuild_bundle.py` — regenera `site/data/bundle.js` después de editar los JSON.
- `test/site.test.js` — pruebas básicas (`node --test test/site.test.js`).

## Probar localmente

```bash
cd site
python3 -m http.server 8080
# abrir http://localhost:8080
```
