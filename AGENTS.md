# La Hoja Boricua: guide for developers and AI coding assistants

This file is the single source of instructions for anyone working on this repository, human or AI. Codex, Cursor, Aider, Gemini CLI, GitHub Copilot, Claude Code and similar tools read it (some through the short pointer files `CLAUDE.md`, `GEMINI.md` and `.github/copilot-instructions.md`). Paste it into any other chat-based assistant before asking it to change code.

For the state of the project, the accounts it uses and the open work, read `docs/HANDOFF.md`.

## What this is

La Hoja Boricua (https://lahojaboricua.com) is an installable web app (PWA) about Puerto Rican handmade cigars: makers, cigars, lounges and shops, events, guides, and a personal section, "Mi Hoja" (humidor, tasting diary, passport, favourites), that syncs to a user account. Spanish is the primary language; every screen also has English. It works offline once loaded.

## Stack, in one paragraph

Plain HTML, CSS and JavaScript in `site/`, with no framework, no npm dependencies and no build step for the app itself. Python scripts in `tools/` generate the static pages and the data bundle from JSON in `data/`. Hosting is Cloudflare Pages (project `la-hoja-boricua`), which publishes `site/` from `main`. A small API runs as Cloudflare Pages Functions in `functions/` on a Cloudflare D1 (SQLite) database. Sign-in is Clerk. Tests use Node's built-in test runner.

## Repository map

| Path | What it is |
|---|---|
| `data/` | Source data in JSON (`artesanos.json`, `cigarros.json`, `places.json`, `events.json`). Edit data here, never in the generated pages. |
| `site/` | Everything that is published. |
| `site/index.html` | The app shell and a small boot guard. |
| `site/app.js` | Router and public views (catalog, makers, places, events, profile). |
| `site/hoja.js` | Mi Hoja (tasting, humidor, diary, passport, favourites), the account panel, the share image, and the wiring for Clerk and the API. |
| `site/cuenta.js` | The account gate: who can open Mi Hoja, onboarding, profile and identity forms. It takes no DOM or network directly (everything comes in through a `D` object), so tests drive it with a fake Clerk. |
| `site/sync.js` | Mi Hoja sync between the phone and the account (merge, operations, fences). Pure logic, tested against SQLite. |
| `site/i18n.js` | Every UI string, in two tables (`es` and `en`), plus the language choice (cookie `lhb_lang`). |
| `site/intro.js` | The first-visit language screen and the intro video. |
| `site/sw.js` | Service worker: the offline cache. Its `VERSION` constant must change on every release (see below). |
| `site/styles.css` | App styles, with light and dark themes from design tokens on `:root`. |
| `site/u.css`, `site/lugares/l.css` | Styles for the public profile pages and the static pages; they share the app's tokens. |
| `site/lugares/`, `site/artesanos/`, `site/cigarros/`, `site/guias/`, `site/en/` | Generated static pages (one per place, maker, cigar and guide, Spanish and English). Do not edit by hand. |
| `site/data/bundle.js` | Generated data bundle the app loads. |
| `site/privacidad.html` | Privacy page. Update it whenever the app stores something new about people. |
| `site/_routes.json` | Sends only `/api/*` and `/u/*` to the Functions; everything else is static. |
| `site/_headers` | Keeps branch previews out of search engines. |
| `functions/api/` | API endpoints: `me`, `profile`, `handle`, `mihoja`, `account` (delete), `follow`, `followers`, `following`, `feed`, `people`, `block`, `u/[handle]`. |
| `functions/u/[handle].js` | Server-rendered public profile page. |
| `functions/_lib/` | Shared server code (auth, profile, Mi Hoja storage, follows, feed, account deletion). |
| `migrations/` | D1 schema, numbered SQL files applied in order (see Database below). |
| `tools/` | Generators and helpers (see Commands). `tools/archive/` holds retired scripts. `tools/ai_*.py` belong to the previous team's tooling and are not needed to run or change the site (see `docs/ai-routes.md`). |
| `test/site.test.js` | The whole test suite (about 500 tests). |
| `evidence/` | Verification records from past changes (review transcripts, test runs). Safe to ignore; never needed at runtime. |
| `docs/` | Handoff notes and design reviews. |

## Commands

Run from the repository root.

```bash
# tests (needs Node 22.5 or newer for node:sqlite; CI uses Node 24; Python 3 must be on PATH as "python")
node --test test/site.test.js

# after editing anything in data/: regenerate pages, sitemap, robots and the bundle
python3 tools/build_lugares.py
python3 tools/build_artesanos.py      # also runs build_cigarros.py
python3 tools/build_guias.py
python3 tools/rebuild_bundle.py

# look at the static site locally (the API does not run this way)
cd site && python3 -m http.server 8080
```

Other tools: `tools/build_icons.py` renders the PNG icons and `og.jpg` from the SVG masters in `site/icons/`; `tools/build_thumbs.py` makes photo thumbnails; `tools/build_llms.py` writes `site/llms.txt`; `tools/build_data.py` creates the JSON in `data/` from a new research file.

CI (`.github/workflows/test.yml`) runs the tests and the generators on every push and pull request, and fails if the generated files committed in git differ from what the generators produce. So always commit generator output together with the data change.

## Deploying

- Push a branch: Cloudflare Pages builds a preview at `https://<branch>.la-hoja-boricua.pages.dev`. Previews use the preview database and Clerk's development instance.
- Merge to `main`: Cloudflare Pages deploys production at https://lahojaboricua.com within a couple of minutes. Cloudflare runs the generators on every deploy.
- Rollback: in the Cloudflare dashboard, Workers & Pages, la-hoja-boricua, Deployments, choose the previous production deployment and "Rollback to this deployment". Or revert the merge commit on `main`.

## Rules that keep the site working

1. **Bump the service worker version on every release.** In `site/sw.js`, change `const VERSION='lhb-vNNN'` to the next number. The tests pin the version in many places, so update every pin as well: search `test/site.test.js` for the old `lhb-vNNN` and replace them all. Without the bump, returning visitors keep the old files.
2. **Add every new file the app needs offline to `SHELL` in `site/sw.js`.**
3. **Every visible string goes through the translation tables.** Add the key to both the `es` and the `en` table in `site/i18n.js` and use `tt('key')` (or `I.t`). The tests scan for untranslated text.
4. **Never edit generated pages.** Change `data/` or the generator in `tools/`, then rerun the generators.
5. **Database changes are additive and tolerant.** Add a new numbered file in `migrations/`. Code must keep working before the migration is applied (see `functions/api/me.js`, which falls back when the `lang` column is missing). Apply it to the preview database first, then production.
6. **Secrets never go in the repository.** The repository is public. Server secrets live only in the Cloudflare Pages project settings. Clerk's publishable keys in `site/hoja.js` are public by design; the secret key is not.
7. **Mi Hoja is local first.** It is saved on the phone (localStorage) and synced to the account by `site/sync.js`. Changes there must survive offline use, two open tabs, and a sign-out while a sync is in flight. The existing tests cover many of these cases; run the whole suite.
8. **Keep it dependency free.** No frameworks, bundlers or npm packages in `site/`. Leaflet is vendored as `site/vendor-leaflet.*`.
9. **Accessibility and contrast are tested.** Some CSS changes need the pinned contrast or paint tables in the tests updated on purpose. Check that the new colours really pass, instead of just changing the numbers.
10. **Comments in the code are in Spanish.** Match the surrounding style when adding code.

## How to make a change safely (any assistant)

1. Read the relevant file and its tests before editing (search `test/site.test.js` for the function or file name).
2. Write or adjust a test that fails before the change, then make it pass.
3. Run the full suite: `node --test test/site.test.js`. Expect 0 failures (one test is skipped on purpose).
4. If you touched `data/` or a generator, run the generators and commit their output.
5. If the release changes anything the app caches, bump `VERSION` in `site/sw.js` and its test pins.
6. Push a branch, check the preview in a phone-sized browser window in both Spanish and English, and in light and dark themes, then merge.

## Server configuration (Cloudflare Pages project settings)

Names only; the values are in the Cloudflare dashboard.

| Name | Kind | Used by |
|---|---|---|
| `DB` | D1 binding | Every API endpoint. Production is bound to `lhb-prod`, previews to `lhb-preview`. |
| `CLERK_ISSUERS` | Variable | `functions/_lib/auth.js`: the allowed Clerk token issuers, comma separated (production and development instances). |
| `CLERK_SECRET_KEY` | Secret, production only | `functions/_lib/account.js`: deletes the Clerk user when someone deletes their account. |

## Database

D1 databases: `lhb-prod` (production) and `lhb-preview` (previews), in the same Cloudflare account as the Pages project. The schema is the migrations in order, `0001` to `0009` at the time of writing. To apply a new one, either:

- Cloudflare dashboard, Storage & databases, D1, choose the database, Console, paste the file's SQL and run it (preview first, then production); or
- `npx wrangler d1 execute lhb-preview --remote --file migrations/00NN_name.sql` (then `lhb-prod`), with a Cloudflare API token that has D1 edit rights on that account.

Read-only checks can use the same console with `SELECT`.

## Known behaviour worth knowing

- The live JavaScript files are served with `Cache-Control: max-age=14400`. A browser that has no service worker yet can keep last release's files for up to four hours. Visitors with the service worker get new files when the new `VERSION` installs.
- On a first visit the app asks for the language before anything else; the choice is kept in the `lhb_lang` cookie and, when signed in, on the account. The device's choice wins over the account's.
- Branch previews are not indexed (`site/_headers`).
