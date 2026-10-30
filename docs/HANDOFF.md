# La Hoja Boricua: handoff

Status as of October 30, 2026. Prepared by Alfredo Medina for Sergio, who takes over the site. For how to work on the code, with any AI assistant or by hand, read `AGENTS.md` at the repository root first.

## Where things stand

- Production: https://lahojaboricua.com, deployed from `main`. Service worker cache version `lhb-v171`.
- Test suite: about 500 tests, all passing on `main` (one is skipped on purpose).
- No pull request is open, and every branch's work is either merged or kept on GitHub.

What the site does today:

- **Catalog and pages.** Cigars, makers, lounges and shops, events and Q&A guides. Every one has its own crawlable page in Spanish and English, plus a sitemap, structured data and `llms.txt` for AI answer engines.
- **The app.** Installable, offline after the first load, five tabs on the phone, a first-visit language choice (Español or English), light and dark themes, and an intro video.
- **Installing it [LHB-121].** An Install button at the top of every page until the app is installed. Where the browser allows it (Chrome, Edge and Samsung Internet, on Android and on computers) it installs in one tap. iPhone and iPad Safari allow no one-tap install, so they get a three-step guide pointing at the Share button. Facebook and Instagram's built-in browsers cannot install apps, so the button sends the visitor to Chrome (Android, one tap) or tells them how to open Safari (iPhone). A computer without the option shows a QR code for the phone. A small reminder bar appears on the second page of a visit, at most once per visit, then 3, 7, 14 and 30 days after each "Ahora no".
- **Accounts (Clerk).** Email sign-in, a profile with a public handle, 21+ onboarding, follow, feed, block and report, a public profile page at `/u/<handle>`, and account deletion that also removes the Clerk user.
- **Mi Hoja.** Humidor, guided tasting and diary, passport, favourites. Saved on the phone first, then synced to the account, across tabs and phones.
- **The logo.** The Medallón, with its own dark version.

## Accounts and services

| Service | What it holds | Owner today | Notes |
|---|---|---|---|
| GitHub `cigarspodcast/la-hoja-boricua` | The code. Public repository. | cigarspodcast | CI runs the tests on every push. |
| Cloudflare (account "Sergio@cigarspodcast.com's Account") | Pages project `la-hoja-boricua`, D1 databases `lhb-prod` and `lhb-preview`, Web Analytics, the `lahojaboricua.com` DNS zone | Sergio | Server settings (`DB`, `CLERK_ISSUERS`, `CLERK_SECRET_KEY`) are in the Pages project settings. |
| Clerk app "La Hoja Boricua" | Sign-in: production instance on `clerk.lahojaboricua.com`, plus a development instance for previews | Freddy's Clerk workspace, moving to Sergio's | See step 0 below. A transfer keeps the keys, so no code changes. |
| Google Cloud (OAuth client) | Google sign-in credentials for Clerk | Not created yet | See step 1. Until then, production sign-in is email only. |
| Cloudflare R2 | Photo storage | Not enabled yet | See step 2. Profile photos are hosted by Clerk for now. |
| Tab (`tab.bot`) | The old copy of the site | Sergio | See step 3. |

## Sergio's first steps

These belong in your own accounts. Each takes about 10 minutes. (The ticket numbers in brackets refer to the previous team's tracker and also appear in the git history.)

### 0. Take over the Clerk app (do this first)

1. **Sergio:** create a Clerk account at https://dashboard.clerk.com with your own email.
2. **Freddy:** in Clerk, use the workspace dropdown (top left) to pick the workspace that holds La Hoja Boricua. Open the app's **Settings** and click **Transfer ownership** in the **Danger zone**, then pick Sergio's workspace (invite Sergio first if it is not listed).
3. The app is on the free Hobby plan. If it were on a paid plan, the receiving workspace would need billing details first.
4. **Sergio:** confirm the app shows in your workspace, then do step 1 there.

### 1. Google sign-in [LHB-22, LHB-81, then LHB-26]

1. Open https://console.cloud.google.com/projectcreate and create a project named **La Hoja Boricua**.
2. **APIs & Services → OAuth consent screen**:
   - User type External.
   - App name La Hoja Boricua, with your support email.
   - Scopes `openid`, `email` and `profile`.
   - Then **Publish app** (In production).
3. **APIs & Services → Credentials → Create credentials → OAuth client ID**:
   - Type **Web application**, named "Clerk production".
   - Authorized redirect URI `https://clerk.lahojaboricua.com/v1/oauth_callback`.
   - Click **Create**.
4. In Clerk, go to **La Hoja Boricua → Production → Configure → SSO connections → Google**:
   - Turn on **Use custom credentials**.
   - Paste the Client ID and Client Secret.
   - **Enable connection**, then **Save**.
5. Leave Apple off unless you have an Apple Developer account.
6. Then try a real Google sign-in on production. It should land on onboarding or Mi Hoja (LHB-26).

### 2. Photo storage, R2 [LHB-35]

1. In the Cloudflare dashboard, open **Storage & databases → R2 Object Storage**.
2. Enable R2 on the free tier (10 GB). It asks for a payment method on file and acceptance of the terms.
3. Then create a private bucket `lhb-fotos` and bind it to the Pages project.
4. The app work that follows: move diary-entry photos and avatars to R2, and include them in account deletion.

### 3. Redirect tab.bot [LHB-8]

In Tab, redirect every `tab.bot` page to the same path on https://lahojaboricua.com. If Tab cannot redirect, replace the copy with a short "Nos mudamos a lahojaboricua.com" page that links there.

### 4. Six listings to rule on [LHB-15]

- Scryer: confirmed.
- Timber & Blues: the website is dead; use its Instagram.
- VC Lounge: probably should be the hotel's Avo Lounge.
- Don Paco 1932, La Factoría, The Cave: could not be confirmed.

Decide each one, then edit `data/places.json` and rerun the generators (see `AGENTS.md`).

### 5. Review the Q&A guides [LHB-46]

Read the guide pages (`/guias/`) and correct anything that is wrong. Guide content is generated by `tools/build_guias.py`.

## Other open work

| Item | What it needs |
|---|---|
| Google Search Console [LHB-6] | Add a Domain property for `lahojaboricua.com`, verify it with a DNS TXT record in the Cloudflare zone, and submit `https://lahojaboricua.com/sitemap.xml`. Decide which Google account owns it. Leave the existing `google-site-verification` meta tag in `site/index.html` alone (it belongs to the tab.bot property). |
| Bing Webmaster Tools and IndexNow [LHB-43] | Import the site from Search Console, or verify it by DNS. Then turn on Cloudflare Crawler Hints, or add an IndexNow key file. Bing's index feeds ChatGPT search and Copilot. |
| AI visibility re-check [LHB-91] | Any day from November 24 to 30, 2026: ask the 20 fixed questions in `evidence/lhb-47-ai-visibility-2026-10.txt`, in the same order, and record whether lahojaboricua.com appears. The October baseline was 0 of 20. Save the result as `evidence/lhb-47-ai-visibility-2026-11.txt`. |
| Points and levels [LHB-78] | Later, once learning content exists. The findings are in `docs/reviews/FACELIFT-REVIEW-AND-PLAN.md`, section "Points and levels". Whether points or levels are public is your call. |
| Install reminder timing [LHB-121] | Optional. The waits after each "Ahora no" are `REMIND_GAP=[3,7,14,30]` (days) in `site/app.js`. Change the numbers there, bump the service worker version (see `AGENTS.md`), and update the LHB-121 test in `test/site.test.js`, which pins them. |
| Browser cache of scripts | Production serves the JavaScript with `Cache-Control: max-age=14400`, so a visitor without the service worker can run the previous release for up to four hours after a deploy. Optional fix: a shorter cache rule for `/*.js` and `/*.css` in `site/_headers`. |

## Design reviews

`docs/reviews/` holds two assessments written during the project, each as Markdown and Word:

- **Brand and architecture assessment (October 29).** What to keep and what to change. Most of its recommendations have since shipped: the dark theme, the static pages restyled to match the app, and the new logo.
- **Facelift review and plan (October 27).** What was adopted from the design package and what was not, including the points-and-levels analysis.

## History and records

- Every commit names the ticket it belongs to (for example `LHB-115: ...`), so `git log --grep LHB-115` finds a change and its reasons.
- `evidence/` keeps the proof for past changes: test runs, review transcripts, production checks. You never need it to run the site, but it explains why things are the way they are.
- The tickets themselves lived in the previous team's Linear workspace. This file and the git history carry everything needed to continue without it.

## Working with your own AI assistant

Any capable coding assistant (ChatGPT or Codex, Gemini, Claude, Cursor, Copilot) can work on this repository:

1. Give it access to the repository (clone it, or connect GitHub in the tool).
2. Tools that read repository instructions pick up `AGENTS.md` by themselves. With a chat-only assistant, paste `AGENTS.md` first.
3. A good first request: "Read AGENTS.md and docs/HANDOFF.md, run the tests, and tell me what you would need to change to [your goal]. Do not edit anything yet."
4. Ask it to work on a branch, run `node --test test/site.test.js` before every push, and check the branch preview before merging.
5. Never paste keys or secrets into a chat. Server secrets go only into the Cloudflare Pages settings.
