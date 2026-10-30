# La Hoja Boricua: independent brand and architecture assessment

Alfredo Medina. October 29, 2026 (UTC-4). Read against production (lahojaboricua.com, main b8b2b89) at phone width (390 by 844) and desktop width (1366 by 860), and against the code on main. Earlier proposals (the facelift package) were not used as a reference.

## Verdict

The foundations are right: a crawlable site of real pages with an installable app on top, a local-first Mi Hoja that syncs to the account, a palette rooted in the place, and a sound body typeface. What is wrong is coherence. The app speaks with three display voices, three wordmarks, five illustration styles and three navigation systems, and on a computer it is a phone column with a phone tab bar stretched across the screen. Fix coherence first; most of it is subtraction.

## Bless (keep, and build on)

- **Architecture: static pages plus app.** Every cigar, maker, lounge and guide has its own crawlable page (49 cigar, 33 maker, 43 place, 22 guide pages, plus 124 English pages), with sitemap, canonical links, structured data and llms.txt. That is the right answer to a hash-routed app (#/catalogo), and it is how the site gets found.
- **Local-first Mi Hoja with account sync.** A lounge has poor signal. Saving on the phone first and settling with the account later is the correct model, and the recent sync work makes it safe across tabs.
- **The palette.** Paper #F4F1EA, tobacco green #344C31, and the flag's celeste and red as accents. It belongs to Puerto Rico and to tobacco, and it is already built as role tokens with a contrast test. Keep it.
- **Figtree for the interface and body text.** Clear at small sizes, warm, self-hosted, preloaded, font-display swap.
- **Fraunces for content headings.** A soft, literate serif that suits names of cigars, makers and places.
- **The mark.** A tobacco leaf whose rib is a road. It is specific to this product and reads at icon size.
- **Five tabs on the phone, Spanish and English, the intro video** (owner ruling: the intro stays).

## Challenge (change)

### 1. One display typeface: retire Shrikhand
Shrikhand is a 1970s fat italic. It reads as diner signage or surf merchandise, not as the craft and heritage of a tobacco farm, and it competes with Fraunces: the home page shows a Shrikhand hero, a Fraunces section title and Figtree labels in one screen. Fraunces already carries character. **Do:** use Fraunces as the only display face, in its variable form (weight and optical size axes, Latin subset, self-hosted), heavier and at a large optical size for page titles. Body and controls stay Figtree.

### 2. One lockup, everywhere
Today there are three wordmarks: the app header (Shrikhand, stacked, with MADE IN BORINQUEN), the static pages (plain Fraunces, no mark) and the intro (Shrikhand, one line). **Do:** one lockup, the leaf mark plus a Fraunces wordmark, in a horizontal and a stacked form, used in the app, every static page, the 404 and privacy pages and the share image. The tagline is **Hecho en Borinquen** in both languages: a tagline is part of the brand, not text to translate.

### 3. One navigation system and one vocabulary
Six destinations are reached through the tab bar, three shortcut chips on the home page, a menu sheet that lists them again, and four round header buttons (language, search, menu, account). The names drift: Catalog and Cigars, Artisans and Makers. **Do:** the tabs are the navigation (Cigarros, Artesanos, Lugares, Eventos, Mi Hoja and their English pairs, used identically in tabs, titles and links). The header keeps search, menu and account. The language switch moves into the menu. The menu holds only what the tabs do not: guides, the Tobacco Route, about, credits, privacy. The home shortcut chips go. The decorative hero card on the catalog (The Tobacco Route in Puerto Rico) becomes a real entry to the Route.

### 4. Colour has meaning
On an event card three buttons use three colours (celeste, outlined, red). Red is also the add button, sign-in, map clusters and the Full strength tag. **Do:** one primary action per view, filled tobacco green; secondary actions outlined; red is the brand accent for the single most important action (the add button) and for the flag stripe, never decoration; celeste is for links and the flag only. Strength tags use a neutral ramp, not alarm red.

### 5. One illustration language
Five styles coexist: the rendered 3D intro, a flat botanical flower on Places, a cartoon frog on Events, patterned placeholder cards for cigars without a photo, and real product photos on white. **Do:** the subject's own vernacular, the cigar band and the cigar-box lithograph: single-colour line art in tobacco ink with one accent. The frog and the flower are replaced by line-art headers in that style; cigars without a photo get a neutral line silhouette in the same frame as the photos, so the grid reads as one catalogue. The intro video stays (owner ruling) as the one cinematic moment.

### 6. A real system: type scale, radii, spacing
styles.css uses 23 distinct font sizes (9 to 30 px, including half pixels) and 16 border-radius values. **Do:** a six-step type scale and three radii as tokens, and rules read only tokens.

### 7. A computer layout
At 1366 px the app is a phone column and its tab bar spans the full width, Catalog at the far left and Mi Hoja at the far right. **Do:** from 900 px the navigation moves to the top bar, the catalogue grid widens to three or four columns, and the tab bar is hidden.

### 8. A dark lounge theme
Lounges are dim and the app is used at night. **Do:** a dark theme from the same role tokens, following the phone's setting, with a manual choice in the menu. The token work already done makes this cheap.

### 9. Static pages share the app's chrome
The static pages are functional but look like a different product. **Do:** the generators emit the same lockup, header, tokens and type as the app, so a visitor from search lands on the brand, not on a bare list.

### 10. Avatar placeholder
A star in a circle does not say account. **Do:** a person glyph when signed out, the picture or initials when signed in.

## Architecture: measure before changing

About 400 KB of unminified JavaScript loads on every first visit (hoja.js 165 KB, data bundle 97 KB, app.js 67 KB, sync.js 33 KB), with no build step; the service worker caches it after that. Mi Hoja and sync (about 200 KB) only matter to people who sign in. **Do:** measure first-visit cost with Lighthouse on a claimed host; if it matters, add a minimal build (minify, and load Mi Hoja and sync on demand). This waits until the sync work (LHB-104) merges, because it touches the same files. Not verified here: the actual first-visit timings.

## Release

All of this ships to a branch preview for the owner's review. Nothing merges to production until the owner says so (owner ruling, October 28, 2026).

## Not verified

- Behaviour when signed in (the review was done signed out); in that state, tapping the add button showed no visible change.
- First-visit performance numbers; the reading above is file sizes, not timings.
- Trademark clearance of the mark.
