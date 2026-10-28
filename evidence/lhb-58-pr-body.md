LHB-58: the profile page, passport-first, and `GET /api/u/<handle>`.

**What it does**
- `functions/api/u/[handle].js`: a public read for the app. It returns LHB-40's `publicPassport()` (one source of truth for what is public) plus follower and following counts from the follows table (LHB-56): `{profile, counts: {resenas, followers, following, sellos}, resenas}`. A hidden or missing profile gives 404, and D1 trouble gives 503. Nothing private is returned: no user id, last name, gender, birth date, humidor, favorites lists or photo keys.
- `site/hoja.js`, the profile block:
  - `vPersona`, at `#/u/<handle>`: someone else's view. Photo, name (first name plus last initial), @, bio, favorite brand and counts, then the tabs Reseñas, Pasaporte and Favoritos. There is no Humidor tab. The favorites lists stay private, so Favoritos shows only the favorite brand. Tapping a review opens a sheet with stars, tag chips and notes. An empty `#pfFollow` slot is left for the follow button (LHB-60). Your own handle sends you to Perfil.
  - `profileOwn`, inside Perfil: bio, brand and follower counts come from `/api/u/<your @>`. Your review count and the four tabs (including Humidor) come from your Mi Hoja. It also shows Editar perfil. It repaints when a sync lands, on the same tab and for the same account only.
  - Tabs: roving tabindex, arrow keys, Home and End. A late answer never paints another page or another account.
  - People search rows now link to `#/u/<handle>`.
- `site/app.js`: Perfil keeps LHB-51's photo and name card and mounts the profile in `#pfOwn`; the old stats row and favorites list moved into the tabs. Route `u` added.
- `site/styles.css`; `site/i18n.js` (16 keys in both languages, 3 unused removed). Cache `lhb-v85`.

**Evidence** (runner output, in `evidence/`)
- `lhb-58-tests-red.txt`: the new tests fail on the LHB-40 base.
- `lhb-58-r1fix-tests-red.txt`: the round 1 tests fail before the fix.
- `lhb-58-r1fix-tests.txt`: suite 257 of 257.
- `lhb-58-mutations-r1fix.txt`: 27 of 27 mutations red. The first run's two survivors are kept in `lhb-58-mutations-r0.txt`.
- `lhb-58-local-render.txt`: `wrangler pages dev` with a seeded local D1, covering the endpoint and the `#/u/` view at 375 px.
- Codex TIER 2: round 1 BLOCK (`lhb-58-review-r1.txt`, three findings, all fixed); round 2 in `lhb-58-review-r2.txt`.
- Also: `lhb-40-production.txt`, LHB-40's production read-back.

Owner check still open: your own picture and name in the header and in Perfil, on the preview, signed in.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
