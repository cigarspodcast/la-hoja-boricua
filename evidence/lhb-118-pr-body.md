**Staged for the owner's review. Do not merge until the owner says so.** It also goes after LHB-115 and LHB-119, as agreed with the LHB lane. Before merging, this branch takes `origin/main`, sets the `sw.js` VERSION to main's plus one, gives LHB-115's language-screen mark its day/night pair, reruns the generators and the suite, and gets the merge reviewed.

## What

LHB-118 replaces the logo. The new mark, the Medallón, is a cigar band's medallion: an oval tobacco ring holding an upright leaf, with Puerto Rico's lone star in red. It replaces the Parada leaf from LHB-69, and it has its own dark version, so the dark theme no longer sets the mark on a paper tile.

- **`site/icons`:** two masters plus their dark twins.
  - `icon.svg` is the small master, for 16 to 47 px.
  - `icon-full.svg` is the full master, for 48 px and up.
  - `icon-dark.svg` and `icon-full-dark.svg` are the same marks in sage.
- **`tools/build_icons.py`:** renders the favicons from the small master, and the app icons, the maskable icons and `og.jpg` from the full master. In the maskable icons the ring sits 37.8 of 40 units from the centre, so the whole medallion stays inside the safe circle. Its outputs are regenerated.
- **Theme swap:**
  - Every mark is now a pair of images, `img.mark-l` and `img.mark-d`. This covers the header, the intro, the share card, 404, privacidad, `/u/` and all 270 static pages. The four generators reproduce those pages byte for byte.
  - The pair is driven by `--mark-light` and `--mark-dark` through `.mark-l` and `.mark-d`, which are `!important`.
  - `--mark-bg` is transparent in every theme, so the paper tile is gone.
  - The `hidden` attribute still hides a mark.
- **`sw.js`:** precaches the four SVGs.

## Evidence

- **New `LHB-118` test:**
  - Seen red on `origin/main` in `evidence/lhb-118/red-on-main.txt`.
  - Kills 23 of 23 mutants, green before and after, in `evidence/lhb-118/mutations-r5.txt`.
- **Full suite:** 474 tests, 473 pass, 0 fail, 1 skipped, in `evidence/lhb-118/suite-6.txt`.
- **Browser:**
  - Light and dark, both forced themes, and a static page all swap correctly.
  - Every override the reviewer injected loses, and `hidden` hides both marks. See `evidence/lhb-118/browser-r2-injection.txt`.
- **Codex review, TIER 2 (`evidence/lhb-118-review-r1.txt` to `r4.txt`):**
  - Round 1 passed.
  - Rounds 2 to 4 blocked on how strictly the test guards the day/night swap, and each finding was fixed and proven.
  - On 2026-10-30, after round 4's fix (`a774f89`), the owner ruled "Accept, open PR" in place of a fifth round.

Not done here: the band lockup in the header, the wordmark colour, and trademark clearance (the owner's).

Linear: LHB-118

🤖 Generated with [Claude Code](https://claude.com/claude-code)
