# LHB-73: audio licenses and credit wording, checked before writing the credits

Recorded 2026-10-29T06:01Z on branch `facelift`.

## Source of the list

- The list was read in place from the Codex folder `C:/Users/Owner/Documents/Codex/2026-10-25/go-to-https-la-hoja-boricua-3/outputs/intro-audio/`:
  - `audio-sources.json`, SHA-256 `2b584c832bb3aec431e8607b041669b7045cbbe84947e28d7c62d07c02df4f6a`. A copy is saved here as `audio-sources.codex.json`.
  - `AUDIO-CREDITS.md`, SHA-256 `0d37760c936c5d1bb7fc1bf692011895b03374b43cb7e076e90698881fc19adb`.
- Three layers are named:
  - two licensed recordings (below);
  - one project-created breeze layer. It has no license to credit, and the page names it as made for the intro.
- `audio-sources.json` says the TinyWorlds "Forest Ambience" was evaluated and is not in the mix, so it is not listed.

## Each license, re-checked on its source page (built-in browser, 2026-10-29 about 06:00Z)

| Entry | Source page | Title on the page | Author link | License link on the page | Result |
|---|---|---|---|---|---|
| Engine | https://freesound.org/people/nhaudio/sounds/332695/ | Volkswagen Type 2_revving up2.wav | /people/nhaudio/ | https://creativecommons.org/licenses/by/4.0/ "Attribution 4.0" | matches: CC BY 4.0, attribution required in the app |
| Nature bed | https://freesound.org/people/myrinvp/sounds/423711/ | Jungle, Tropical birds and insects | /people/myrinvp/ | http://creativecommons.org/publicdomain/zero/1.0/ "Creative Commons 0" | matches: CC0 1.0. The page shows the geotag Netherlands. |

- Entries left off because they could not be verified: none.
- The test `LHB-73: cada archivo con sonido...` pins these titles, authors, licenses and links.

## Which shipped files carry the sound

- Under `site/assets`, the test counts every audio file, and every MP4 with a sound track (an `hdlr` box of type `soun`).
- As measured: 2 files, `assets/intro/intro-landscape.mp4` and `assets/intro/intro-portrait.mp4`. Each carries the mix of both recordings.
- `CREDITS.files` in `site/app.js` maps each file to its two entries.

## The bus credit: frame inspected before writing the line

- **Frames inspected:** full-size frames at 3.0 s, when the bus is nearest and facing the camera. They are saved in `frames/`:
  - `landscape-3.0s-full.png`, 1024x576;
  - `portrait-3.0s-full.png`, 576x1024;
  - `landscape-3.0s-plate-8x.png`, the plate cropped and enlarged 8 times.
- **What the frame shows:**
  - The front plate carries lettering that reads CALLE POMARROSAS when enlarged.
  - At the video's own size the plate is about 45 pixels wide and its letters are about 4 pixels tall, so it is not readable at normal viewing.
- **What the credit therefore says:**
  - The bus is a 3D version, made for this app, of an original illustration by Calle Pomarrosas, with a link to https://callepomarrosas.com/.
  - The artist did not make the animation or the landscape, and naming the artist does not mean an endorsement.
- **What the credit does not say:**
  - It makes no claim about the plate.
  - It makes no claim of permission. The owner states he holds the permission (2026-10-27); the written record is the owner's to file.
- The test checks that no credit or About string mentions a plate, a signature or a permission.
