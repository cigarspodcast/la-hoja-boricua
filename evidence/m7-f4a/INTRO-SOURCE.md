# Intro video: source record (LHB-72)

Recorded 2026-10-29 on branch `facelift`.

## What is in the repository

All four files are in `site/assets/intro/`. Measured sizes add up to 1,161,658 bytes.

| File | Bytes | SHA-256 |
|---|---|---|
| intro-portrait.mp4 (576x1024, 6 s, 24 fps, H.264 + AAC stereo) | 478,543 | 1178c62825574da23766a26392e5afbf7aa720293ac9747db004df758dfb13de |
| intro-landscape.mp4 (1024x576, 6 s, 24 fps, H.264 + AAC stereo) | 616,197 | 6fd276de8569f4ffef932eeb22623e262dea61b79ad74e46f3e33539c4d1973e |
| poster-portrait.webp (first frame, quality 70) | 29,460 | 701f1e3a6368b415c5f105a9ba711f2cdf9a242dfc1c76e9e8c91edc7dacf059 |
| poster-landscape.webp (first frame, quality 70) | 37,458 | aa68329acfc29ae8ab0f8969a193cd0d2859b17a76d9d78ed6318f4042bc6d83 |

- **Which video file is used:** the two plain-named files, `intro-portrait.mp4` and `intro-landscape.mp4`, from revision `rodin-painted-pr-audio-20261027`.
- **Re-baseline (2026-10-29):** the Codex folder has two sets of copies of these files:
  - `outputs/claude-code-handoff/video/*-with-audio.mp4`;
  - `outputs/intro-final-pr/deliverables/*.mp4`.

  Both sets are byte-identical to the moved files: the same SHA-256, all with the audio track. No newer MP4 exists anywhere under `outputs/`, so the "audio variant" and the plain names are the same file.
- **How the move was done:** the two plain-named files were moved (not copied) out of `outputs/claude-code-handoff/video/`. A one-line note, `MOVED-TO-REPO.txt`, was left there. The identical `-with-audio` files and the `intro-final-pr/deliverables` copies stay in the Codex folder as part of the source package.
- **Posters:** two posters (deviation, see below), each made from the first frame of its own video with `ffmpeg -frames:v 1 -c:v libwebp -quality 70`. The package posters were 540 to 600 KB.

## What stays outside the repository

- **3D source package:** `C:/Users/Owner/Documents/Codex/2026-10-25/go-to-https-la-hoja-boricua-3/outputs/La-Hoja-Boricua-3D-Source.zip`.
  - Size: 303,804,770 bytes.
  - SHA-256 `cad5ceda348ac1a7df514300060ab78c11e530db3cd17e1acb54e4d22fb802cd`, measured 2026-10-29. It matches the hash pinned in LHB-72.
  - It holds the packed Blender scene `outputs/intro-final-pr/la-hoja-pr-mountain-drive.blend`, the source GLBs, the renderer, the encoder and the verifier, and the audio masters. It is not copied to GitHub.

## Credits that travel with the video

- **The bus:** original illustration by Calle Pomarrosas, https://callepomarrosas.com/. The owner holds the illustrator's permission (owner statement 2026-10-27); the written record is filed by the owner under M7-F4b. The intro shows this credit with a link.
- **What the bus is not:** the bus is a passing cameo. It is not La Hoja Boricua's mascot, logo, permanent hero or app icon.
- **Engine sound:** "Volkswagen Type 2_revving up2.wav" by nhaudio, https://freesound.org/people/nhaudio/sounds/332695/, CC BY 4.0. Changes: excerpted, filtered, playback-pitch shaping, fades, pan and mix. No endorsement implied. **CC BY requires this attribution wherever the audio is published.** The credits page (M7-F4b) must carry it.
- **Nature bed:** "Jungle, Tropical birds and insects" by myrinvp, https://freesound.org/people/myrinvp/sounds/423711/, CC0 1.0.
- **Terrain:** derived from public-domain USGS 3DEP elevation data. The road and the vegetation are artistic.

## Deviation from the ticket

LHB-72's scope names one poster; the repository carries two (29 KB and 37 KB). The portrait and landscape videos open on different frames, so either single poster would show the wrong picture for a moment on one orientation.
