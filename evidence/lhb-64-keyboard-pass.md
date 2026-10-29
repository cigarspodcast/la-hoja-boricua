# LHB-64 keyboard pass on the preview deploy

Run 2026-10-29 03:12Z to 03:14Z (23:12 to 23:14 UTC-4, October 28) in the Claude desktop app's built-in browser (Chromium), on the branch preview https://a11y-fixes.la-hoja-boricua.pages.dev (deployment ffe2aeb1, commit 1ab573b). Keys were real key presses sent to the page; state was read with page scripts after each step. The browser's language was English, so the English strings show.

| # | Check | Result |
|---|---|---|
| 1 | Preview serves the new build | PASS: sw.js VERSION lhb-v90; manifest has no orientation |
| 2 | Status region exists outside the view | PASS: #resultStatus, role status, aria-live polite, child of BODY; "Vitolas in the catalog: 48." |
| 3 | Fortaleza chip from the keyboard | PASS: focus on Full, Enter; focus is the new Full chip (aria-pressed true) after the repaint; status "Vitolas in the catalog: 5." |
| 4 | Capa select from the keyboard | PASS: focus on the capa select, ArrowDown picks Barber Pole; focus stays on the select; status "Vitolas in the catalog: 1."; one status node |
| 5 | Menu sheet opens from the keyboard | PASS: focus on Menu, Enter; sheet open, #app inert, focus on the first link (Catalog) |
| 6 | Tab stays inside the sheet | PASS: 12 Tab presses then 3 Shift+Tab presses, 15 focus moves, all inside the sheet; Tab after the last link (Search) went to Close, Shift+Tab from Close went back to the last link |
| 7 | Escape closes and focus returns | PASS: sheet hidden, #app not inert, focus back on the Menu button |
| 8 | Importar respaldo from the keyboard | NOT CHECKED: the backup panel is only in Mi Hoja's lists, behind sign-in, and this pass did not sign in. Covered by the LHB-64 test on the real backupPanel and bindBackup code |
| 9 | Camera and gallery focus ring | NOT CHECKED: Subir needs an account. Covered by the CSS assertion only; a person should Tab to Cámara and Galería on #/subir and see the gold outline |
| 10 | Screen reader announcements | NOT CHECKED: no screen reader in this pass (NVDA, VoiceOver and TalkBack are the device matrix of LHB-75) |
