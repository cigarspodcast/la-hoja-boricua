# LHB-99: the color-literal scan, accepted with two known limits

Owner decision, 2026-10-29 at 09:29 UTC-4 (2026-10-29T13:29Z): accept the round 3 scan and close, without another fix and review round.

## What the scan catches

The LHB-67 scan in test/site.test.js (LIT67, extra99, scan67) catches each of these:

- hex colors, including percent-encoded and partly encoded ones;
- `rgb()`, `rgba()`, `hsl()` and `hsla()` in any case;
- named colors in color-bearing CSS properties, in style attributes and in SVG attributes;
- colors inside encoded SVG data URIs, including their `<style>` sheets.

Codex rounds 1 to 3 found gaps, and all of them are fixed. Round 4 concurs with those fixes (evidence/lhb-99-review-r4.txt).

## The two limits it does not catch

These are the two round 4 findings, left open by this decision:

1. **`${}` inside a quoted attribute.** A double-quoted string inside an attribute's `${}`, for example `title="${on?"Activo (nuevo)":"Inactivo"}"`, hides a later static style color in the same tag. The scanner does not skip `${}` inside a quoted attribute value.
2. **A comment inside an encoded SVG stylesheet.** A CSS comment inside a percent-encoded SVG `<style>` hides that sheet's declarations. Comments are blanked before the payload is decoded, so a `/* */` that only appears after decoding is not blanked.

Neither form appears in the five scanned files today, and the scan reports no new color there.

## Why the decision was to stop

Each review round found a narrower parser edge case in hypothetical text, never a miss in the real files. A scanner built from regular expressions, guarding a design rule, will not reach a clean pass against every way of writing CSS.

If either form is ever written for real, these are the fixes:

1. skip `${}` inside quoted attribute values;
2. blank `/* */` again after decoding a data URI payload.
