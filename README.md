# La Hoja Boricua

App web (PWA) sobre el tabaco artesanal puertorriqueño: artesanos, cigarros hechos en Puerto Rico, lugares, eventos y una sección personal ("Mi Hoja") con humidor, diario de catas, pasaporte y favoritos. Funciona en el teléfono, se puede instalar en la pantalla de inicio y sigue funcionando sin conexión.

**En vivo:** https://lahojaboricua.com

**Para trabajar en el código** (a mano o con cualquier asistente de IA): lee primero `AGENTS.md`, que explica la arquitectura, los comandos, cómo publicar y las reglas que mantienen el sitio funcionando. El estado del proyecto, las cuentas y lo que falta están en `docs/HANDOFF.md`.

## Estructura

- `data/`: los datos fuente en JSON (`artesanos.json`, `cigarros.json`, `places.json`, `events.json`). No se publican; aquí es donde se editan.
- `site/`: la app completa, lo que se publica (HTML, CSS y JavaScript sin dependencias de build).
  - `site/data/bundle.js`: el único archivo de datos que carga la app, generado desde `data/`.
  - `site/lugares/`, `site/artesanos/` y `site/cigarros/`: páginas estáticas por lugar, por artesano y por cigarro, generadas desde `data/`, igual que `site/sitemap.xml` y `site/robots.txt`.
  - `site/sw.js`: service worker (caché y modo offline).
  - `site/404.html`: página de "no encontrada".
  - `site/img/`, `site/icons/`, `site/fonts/`: imágenes, íconos y tipografías.
- `functions/` y `migrations/`: la API (Cloudflare Pages Functions sobre la base D1) y el esquema de la base.
- `docs/`: la entrega del proyecto (`HANDOFF.md`) y las revisiones de diseño.
- `tools/`: los generadores (ver abajo). `tools/archive/` guarda scripts viejos de verificación que ya no se usan.
- `test/site.test.js`: pruebas (`node --test test/site.test.js`).
- `evidence/`: constancias de verificación de los cambios.

## Después de editar los JSON en `data/`

Desde la raíz del repositorio:

```bash
python3 tools/build_lugares.py
python3 tools/build_artesanos.py
python3 tools/rebuild_bundle.py
```

- `build_lugares.py`: `site/lugares/`, `site/sitemap.xml` y `site/robots.txt`.
- `build_artesanos.py`: `site/artesanos/`, `site/cigarros/` (llama a `build_cigarros.py`) y `site/sitemap.xml`.
- `rebuild_bundle.py`: `site/data/bundle.js`.

`tools/build_data.py` es distinto: crea los JSON de `data/` y el bundle a partir de un archivo de investigación nuevo (`python3 tools/build_data.py investigacion.json`).

## Publicación

- Hosting: Cloudflare Pages, proyecto `la-hoja-boricua`. Publica la carpeta `site/` desde la rama `main`.
- En cada publicación, Cloudflare corre los tres generadores de arriba, así que el sitio siempre sale de `data/`.
- Cada otra rama tiene su vista previa en `https://<rama>.la-hoja-boricua.pages.dev`.
- `www.lahojaboricua.com` redirige a `https://lahojaboricua.com`.
- GitHub Actions (`.github/workflows/test.yml`) corre las pruebas y los generadores en cada push y avisa si las páginas guardadas en git no coinciden con lo que producen los generadores.

## Probar localmente

```bash
cd site
python3 -m http.server 8080
# abrir http://localhost:8080
```
