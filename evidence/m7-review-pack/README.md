# La Hoja Boricua facelift: review pack

Branch `facelift` (staged, not live). Prepared by Alfredo Medina, October 29, 2026.

This pack is for reviewing the new look of La Hoja Boricua before anything goes live. It has three parts:

1. A checklist for Sergio: the English text, the logo, the colors and the intro.
2. Screenshots of 13 screens at three phone and tablet sizes.
3. A device check for the owner: install on iPhone and Android, the screen readers, and offline use.

**The preview address comes from the owner.** It is not written in this pack. Nothing here is on lahojaboricua.com. The preview is hidden from search engines: every page answers with `X-Robots-Tag: noindex, nofollow`.

## Before the review (owner)

1. The preview database (lhb-preview) has migrations 0001 to 0005, so profiles, People search and the passport work. The project record says they were applied; that was not re-checked on October 29, 2026. Confirm it in the Cloudflare dashboard, or run the check named in LHB-34.
2. Sign-in on the preview uses the preview Clerk instance, the same as the earlier previews. A visit with no session answers 401 `no-session` on `/api/me`, as it should (checked October 29, 2026).
3. The intro uses the bus illustration by Calle Pomarrosas. The written permission record for it, and the 3D generator's commercial terms, are preconditions of the release (LHB-77). They are not needed for this review.

## Checklist for Sergio

Mark each item OK, or write what to change.

### A. English text

The app follows the phone's language. The **English** button at the top switches it.

1. Open `en-strings.md` in this folder. It lists the 75 English texts the facelift adds or changes (74 new, 1 changed), each beside its Spanish.
2. For each row: is the English natural and correct, and does it say the same as the Spanish?
3. On the preview, switch to English and open the menu, About, Credits and the passport. Check the texts in place: nothing cut off, nothing left in Spanish.

### B. Logo

1. Open `../m7-logo/contact-sheet.png`. It shows the three candidates, *ruta*, *parada* and *camino*, in one color and in the palette, at 16, 32 and 180 px.
2. Which one reads best at 16 px (a browser tab) and at 180 px (the phone's home screen)?
3. The owner makes the final pick (LHB-69). Your comments go to the owner.

### C. Colors

1. Look at the screenshots `inicio`, `menu`, `pasaporte` and `artesano`.
   - The palette's accents are celeste (sky blue), red, amber and sun gold, beside the leaf green.
   - The passport stamps and badges cycle through those four accents.
2. Does it feel like La Hoja Boricua? Is anything too loud, too pale, or hard to read?
3. Every text color was measured against its background at 4.5:1 or better (the WCAG AA level). This item is about taste, not legibility.

### D. Intro

1. It plays the first time someone opens the app (screenshot `intro`). Later it is under **About**, then **Watch intro**.
2. Check:
   - the video;
   - the line *Discover the tobacco of Puerto Rico*;
   - the sound button (it starts muted);
   - **Skip intro**;
   - the credit line under the video.
3. **Credits** (screenshot `creditos`) names the illustration, the two sounds and their licenses.
4. The intro lasts about six seconds. Is that the right length? Does it fit the brand?

## Screens

Taken from this branch's build on a local stand-in for sign-in and the server (there is no test account). Each screen is shown as a visitor first sees it, without scrolling.

Counting basis: rows of `manifest.json`, which is 13 screens times 3 sizes, 39 files, all 39 checked as the intended screen. `shootpack.out` is the run's own transcript.

| Screen | What it shows | 320 x 568 | 390 x 844 | 768 x 1024 |
|---|---|---|---|---|
| intro | the intro on a first visit | [320](shots/intro-320x568.png) | [390](shots/intro-390x844.png) | [768](shots/intro-768x1024.png) |
| inicio | home, the catalog | [320](shots/inicio-320x568.png) | [390](shots/inicio-390x844.png) | [768](shots/inicio-768x1024.png) |
| menu | the menu | [320](shots/menu-320x568.png) | [390](shots/menu-390x844.png) | [768](shots/menu-768x1024.png) |
| cigarro | a cigar page | [320](shots/cigarro-320x568.png) | [390](shots/cigarro-390x844.png) | [768](shots/cigarro-768x1024.png) |
| lugares | lounges, list view (the app has no page per lounge) | [320](shots/lugares-320x568.png) | [390](shots/lugares-390x844.png) | [768](shots/lugares-768x1024.png) |
| lugar | a lounge's own web page | [320](shots/lugar-320x568.png) | [390](shots/lugar-390x844.png) | [768](shots/lugar-768x1024.png) |
| artesano | a maker page | [320](shots/artesano-320x568.png) | [390](shots/artesano-390x844.png) | [768](shots/artesano-768x1024.png) |
| pasaporte | the passport | [320](shots/pasaporte-320x568.png) | [390](shots/pasaporte-390x844.png) | [768](shots/pasaporte-768x1024.png) |
| perfil | your profile | [320](shots/perfil-320x568.png) | [390](shots/perfil-390x844.png) | [768](shots/perfil-768x1024.png) |
| persona | another person's profile | [320](shots/persona-320x568.png) | [390](shots/persona-390x844.png) | [768](shots/persona-768x1024.png) |
| personas | People search | [320](shots/personas-320x568.png) | [390](shots/personas-390x844.png) | [768](shots/personas-768x1024.png) |
| acerca | About | [320](shots/acerca-320x568.png) | [390](shots/acerca-390x844.png) | [768](shots/acerca-768x1024.png) |
| creditos | intro credits | [320](shots/creditos-320x568.png) | [390](shots/creditos-390x844.png) | [768](shots/creditos-768x1024.png) |

## Device check (owner)

Use the preview address on a real iPhone and a real Android phone. Write down OK, or what went wrong, for each step.

### iPhone (Safari)

1. Open Safari and go to the preview address.
2. Wait for the intro. It should play muted and close by itself, or close when you tap **Saltar intro** / **Skip intro**.
3. Tap the **Share** button (the square with an arrow), scroll down, tap **Add to Home Screen**, then tap **Add**.
4. Close Safari. Open La Hoja Boricua from the home screen. It opens full screen, with no Safari bar.
5. Sign in. Open **Mi Hoja**, then **Pasaporte**, and tap a stamp. It stamps, and the stamp gives a short bounce.

### iPhone with VoiceOver

1. Open **Settings**, then **Accessibility**, then **VoiceOver**, and turn it on. Swipe right to move, and double-tap to press.
2. Open the app from the home screen. VoiceOver should read the page title, then each card's name.
3. Open the menu. Each item is read with its name, and the current page is announced as current.
4. Open **Pasaporte** and stamp a cigar. VoiceOver reads the stamp as pressed and reads the new date.
5. In **Settings**, then **Accessibility**, then **Motion**, turn on **Reduce Motion**. Stamp again: no bounce, and no intro on a fresh install.
6. Turn VoiceOver and Reduce Motion back off.

### Android (Chrome)

1. Open Chrome and go to the preview address. Wait for the intro.
2. Tap the three-dot menu, tap **Install app** (or **Add to Home screen**), then tap **Install**.
3. Open the app from the home screen. It opens full screen, with no Chrome bar.
4. Sign in. Open **Mi Hoja**, then **Pasaporte**, and tap a stamp. It stamps, and the stamp gives a short bounce.

### Android with TalkBack

1. Open **Settings**, then **Accessibility**, then **TalkBack**, and turn it on. Swipe right to move, and double-tap to press.
2. Repeat steps 2 to 4 of the VoiceOver list.
3. Turn TalkBack off: press and hold both volume keys for three seconds.

### Offline (either phone)

1. Open the installed app once while online and visit the catalog, a cigar and the passport.
2. Turn on airplane mode.
3. Close the app fully, then open it again. The catalog, the cigar pages you opened and your passport still show.
4. Stamp a cigar while offline. It stamps on the phone.
5. Turn airplane mode off and wait a minute. The stamp is saved to your account: open the app on another device or browser and check that it is there.

## Files in this folder

- `README.md` (this file) and `README.docx` (the same, editable).
- `en-strings.md`: the English texts to review, made by `en-strings.js` from `site/i18n.js`, compared with `origin/main`.
- `shots/` and `manifest.json`: the 39 screenshots and their record, made by `shootpack.py`, with the transcript in `shootpack.out`.
