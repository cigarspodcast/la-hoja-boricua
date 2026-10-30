# La Hoja Boricua: facelift review and staged integration plan

Alfredo Medina. Reviewed October 27, 2026 (UTC-4). Source: the Codex handoff package and the 3D source package, read against the current main branch of the app.

## Verdict

Adopt the palette, the video, the menu grouping, the accessibility fixes and the voice. Rebuild the logo. Do not adopt the points system as proposed. Do not copy the package's web folder or apply its patch as it stands: it was cut against an older production snapshot, and it gets its light theme by redefining the old dark-theme color names. Stage the whole facelift on a preview address for Sergio. Nothing goes to production until Sergio and the owner sign off.

## What I checked myself

- **The package is older than main.** Its account file is 7.9 KB and main's is 17.6 KB. Its index, app and profile files also differ from main. It has none of the static search pages (43 lounge pages plus the maker and cigar pages), the privacy page, the share image or the generators in tools. Port the changes as a diff on current main.
- **The patch itself is small.** Ten files. About 100 changed lines across index.html, app.js and hoja.js, plus 191 lines of new CSS, a 26-line icon and menu file, and a 27-line intro player. The facelift is smaller than it sounds.
- **The light theme is a hack.** Main is a dark app (cream text on dark green). The package flips it to light by redefining --cream as dark ink and --gold as tobacco green. Main uses var(--cream) on 34 lines and var(--gold) on 40, and has about 140 hex and 60 rgba literals in styles.css, 62 hex in app.js and 64 in hoja.js. The package's own reviewer found four contrast failures that come from this (an event date at 1.29 to 1 is the worst). Every screen I built for the profile work (avatar header, profile editor, People search, follow buttons) was drawn for the dark theme and needs the same audit.
- **The palette has limits as text colors.** I computed contrast. On paper #F4F1EA: tobacco 8.37, red 4.59, amber 2.98, celeste 2.44, sun 1.63. Dark ink on celeste is 4.62 (fine), dark ink on sun 6.93 (fine), dark ink on amber 3.78 (large bold text only), white on celeste 2.75 (fails). So celeste, amber and sun are fills, never text on paper, and amber needs a darker companion for small text.
- **The 3D source zip is intact.** 108 files, no bad entries, SHA-256 cad5ceda348ac1a7df514300060ab78c11e530db3cd17e1acb54e4d22fb802cd. The scene file alone is 339 MB, so it stays out of the repository (see the plan).

## Adversarial review

### Logo: needs improvement
- The mark reads as a stick laid across a leaf, or a quill. The idea (the vein is also a path, two gaps are discoveries) does not read, and the knots on the stem make it look like a twig.
- It is a generic ovate leaf. Any wellness or organic brand could use it. Tobacco has a clear signature: a broad leaf with a pointed tip, a strong central rib and curved side veins. The package's own video poster already shows that leaf in the roadside plants.
- At 32 px it reads as "a leaf". At 16 px the knots and the short side branches will merge.
- Keep the wordmark: Fraunces for La Hoja and widely spaced Figtree for BORICUA works and matches the type system.
- Direction: a tobacco-leaf silhouette whose rib curves like a road and ends in a small round dot (a stop on the route). Make three variants, test each at 16, 32 and 180 px, in one color, and inside the maskable safe zone. Trademark clearance is not done and is not the app's job to claim.

### Palette: adopt, but build it properly
- Real semantic tokens (surface, on-surface, accent, accent-ink) instead of inverted aliases. No token whose name says the opposite of its value.
- A contrast test in the suite that computes each text and background pair we use and fails below 4.5 (3 for large text).
- Audit every color literal in styles.css, app.js, hoja.js, the static pages and their stylesheet l.css, and the privacy and 404 pages. Otherwise the site ends up as two brands.
- Update manifest theme_color and background_color (both are still the dark green) and the share image.

### Navigation and home: adopt the structure, fix three things
- The grouping (Descubre, Tu experiencia, En comunidad, La app), the destination-specific icons and the current-page marker are better than what we have.
- The menu in the package is a second hard-coded list. Generate it from the route table so a new destination cannot be left out. It must include what we built after the snapshot: Personas search, profile editing.
- The Cigarros card steals focus into the search box and raises the keyboard. Scroll to a heading instead.
- The home page puts an introduction and three cards above the first result. Compact them for returning visitors and verify that results are reachable at 320 by 568.
- Keep the five tabs and the plus button.

### Intro video: adopt the clip, change the policy
- It plays once per session. On an installed app every cold launch is a new session, so people would see it every time. Play it on first run and then at most once every 14 days, with Ver intro in About.
- The video element has no poster, so there is a blank paper flash until it plays. Add a small webp poster (the package posters are 540 to 600 KB, too heavy).
- Good as built: muted start with a sound button, skip, Escape, reduced motion, data saver, deep links, hard time limits, no loop.
- Credit wording must be written as what is true. The package's own reviewer found the credit claiming the plate is retained before the frame was inspected. Inspect a full-size frame, then say it.
- Owner gates: the bus is another artist's illustration (Calle Pomarrosas). The package says not to imply endorsement but nothing in it shows permission. Written permission should be on file before this is public. Also confirm the 3D generator's terms allow commercial use, and ship an in-app audio credits page (CC BY 4.0 requires it).

### Accessibility fixes in the patch: adopt now, separately
Modal focus containment, the persistent results status region, catalog filter focus, and the camera and gallery focus ring are real defects on main today, not branding. One finding is still open: the backup import label has tabindex 0 and a hidden file input. Also remove the portrait-only orientation lock in the manifest. These can land before the visual work.

### Language
All new copy in the package is Spanish text inside scripts. Main has the i18n system with a scan test, and Sergio is reviewing the English draft. Every new string must be a key with Spanish and English values or the scan test fails.

### Points and levels: do not adopt as designed
- The design is careful (no purchases, no streaks, no rankings, the top level reachable without travel or smoking). Keep those rules.
- The machinery is the problem. Event ids, daily caps, idempotent awards and undo are built for rewards that have outside value. These points have none and stay private. Points that are a pure function of the saved passport and diary data cannot be double-counted and undo by themselves.
- Several rules depend on things that do not exist: six learning modules and a "what I learned" prompt on five maker stories. Without that content, the top level cannot be reached at all.
- Some rules depend on history ("first refinement of an entry"). State-based versions are needed (for example, an entry that has observations in two or more groups).
- 165 points in total, with level 5 at 110, is a very short game. Calibrate it with real use before showing numbers.
- Our passport already syncs between phones. Any new learning record belongs inside that same document (the sync branch already carries unknown fields through its merge), not in a second store.

## Rulings where the package overlaps what is built

| Area | Ruling |
|---|---|
| Account control in the header | Built wins: the picture or initials circle (replaces the old star). The package still shows the star. |
| Sign-in door, account file | Built wins entirely. The package has the old version. |
| Mi Hoja sync, backup, import | Built wins. The package must not touch the document format. |
| Passport and profile pages | Built structure wins. The package supplies the color treatment and the stamp celebration. |
| Menu | Package wins, extended with Personas and profile, generated from routes. |
| Splash | Replaced by the intro. Tests that pin the old splash are rewritten on purpose. |
| Intro clip | Package clip, our play policy. |
| Palette and fonts | Package palette (owner decision), implemented as real tokens. Fraunces and Figtree stay. |
| Logo | Rebuild, owner approves. |
| Points and levels | Derived from saved data, later, after content exists. |
| Static pages and generators | Ours, restyled to the same tokens. |

## Staging plan (nothing reaches production)

Branch: facelift, cut from main after the pending profile pull requests merge (they touch the same files, so doing it earlier only creates conflicts). Deploy it as a Cloudflare Pages preview for Sergio. Production stays on its current build. I have not verified that previews are hidden from search engines; add a noindex guard to the preview regardless.

Filed in Linear on October 27, 2026 as milestone M7 Facelift (staged for review), tickets LHB-64 to LHB-78, all in Backlog.

1. **F0 Accessibility fixes** (LHB-64, can go live): modal containment, status region, filter focus, import label, manifest orientation. Own pull request.
2. **F1 Tokens and light theme**: F1a semantic tokens and the contrast test (LHB-65), F1b audit of every literal in the app including the profile-era screens (LHB-67), F1c static pages, generators, privacy and 404 pages (LHB-68).
3. **F2 Logo**: F2a three variants (LHB-66), F2b the owner picks (LHB-69), F2c app icons, favicons, share image, static pages and generators (LHB-70).
4. **F3 Menu and home** (LHB-71): routes-driven menu, icons, home cards, all strings as es and en keys.
5. **F4 Intro**: F4a player with the new policy, poster, legacy splash removed (LHB-72), F4b audio credits page, replay in About, truthful credit wording (LHB-73).
6. **F5 Passport color and stamp celebration** (LHB-74): on top of the existing eight badges, static and reduced-motion safe.
7. **F6 Staging and review pack** (LHB-75): preview deployment, noindex guard, screenshots at 320, 390 and 768, a checklist for Sergio, then the device matrix (install on iOS and Android, VoiceOver, TalkBack, offline).
8. **F7 Sergio reviews** (LHB-76), then **F9 release to production** (LHB-77, owner only).
9. **F8 Points and levels** (LHB-78, later): derived from saved data, only after the learning content exists and the owner decides whether points or levels are public.

Where files live: the Codex folder (C:\Users\Owner\Documents\Codex\2026-10-25\go-to-https-la-hoja-boricua-3\outputs) is taken over in place; no second copy is made. The two intro videos and one small poster move into the repository when F4a is built (about 1.1 MB). The 339 MB scene file and the source models stay in the Codex folder with the SHA-256 above, and are not put in GitHub. The folder holds an audio variant and newer history folders than the zip I reviewed, so F4a re-checks which video file is current.

Owner decisions of October 27, 2026: the animated bus is cleared (the owner holds permission; the written record still has to be filed before production release); badges appear on the public profile.

Still gated: the logo pick (LHB-69), Sergio's review of the preview (LHB-76), and the production release (LHB-77).
