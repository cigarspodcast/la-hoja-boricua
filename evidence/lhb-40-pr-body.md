LHB-40: the public passport page `/u/<handle>`, server-rendered.

**What it does**
- `functions/_lib/passport.js` `publicPassport()`: the one public read. It loads the visible profile (`hidden = 0`) and its stored Mi Hoja document, keeps only diary entries with `publica === true`, and copies a closed list of fields per entry (name, brand, artisan, stars, tags, notes, day smoked). Counts: public catas and stored stamps by kind. Display name is first name plus last initial. LHB-58's `/api/u/<handle>` will reuse it.
- `functions/u/[handle].js`: renders that as HTML with no JavaScript. Avatar, name, @handle, bio, favorite brand, counts, a grid of public catas, and a detail card per cata opened with `:target`. Open Graph and Twitter tags (title `@handle en La Hoja Boricua`, image `og.jpg`), `noindex, follow` in a meta tag and in `X-Robots-Tag`, `cache-control: no-store`, and a CSP with `default-src 'none'`. A hidden or missing profile returns the same 404. "Reportar este perfil" mails the contact address from privacidad.html.
- `site/_routes.json` adds `/u/*`. The service worker never answers `/u/` (network only, never cached as the app shell). The stylesheet is `site/u.css`. Cache `lhb-v84`.

**Decisions** (also recorded on LHB-40): `og:image` is always `og.jpg` because entry photos live only in the phone until LHB-35. The page is Spanish only.

**Evidence** (runner output, in `evidence/`)
- `lhb-40-tests-red.txt`: the new tests fail on origin/main.
- `lhb-40-tests-merged.txt`: suite 249 of 249 after merging main.
- `lhb-40-mutations.txt`: 20 of 20 mutations red. M1 removes the `publica` filter.
- `lhb-40-local-render.txt`: `wrangler pages dev` with a seeded local D1. The visible profile gives 200, hidden and missing give 404, no private string appears, and the layout has no horizontal scroll at 375 px.
- `lhb-40-router-check.txt`: trailing slash and uppercase are served; encoded and extra path segments give 404, both locally and on the preview.
- `lhb-40-review-r1.txt`: Codex TIER 2 round 1, VERDICT: PASS.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
