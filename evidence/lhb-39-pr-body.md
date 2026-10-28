LHB-39: Mi Hoja stats and a searchable diary (`#/mihoja/diario`).

**Stats ("Tus números")**: total catas; passport stamps by kind (artesanos, cigarros, lugares), counting only ids still in the catalog, as the Pasaporte does; the three top-rated cigars by average stars (ties by number of catas); the most-logged capa and fortaleza.

**Diary**: search by name, marca, artesano and tag (accent and case insensitive, every word must match); filter by exact stars and by public/private; sort by the day smoked or by stars. A filter change repaints only the list and its count. The query is kept for the same account and cleared for another.

**Also**: new es/en keys in `site/i18n.js`, new CSS rules, cache `lhb-v82` (main is `lhb-v81`). origin/main 822fb62 is merged in; the one conflict was two appended test blocks, both kept.

**Proof** (all in `evidence/`):
- Tests red on main's site (`lhb-39-tests-red.txt`), then green. The final suite after the merge and both fixes: 243 of 243 (`lhb-39-r2fix-tests.txt`).
- Mutation proofs: round 1, 32 of 33 (M7 survived, test added); round 2, 35 of 35; after the round 1 fixes, 41 of 41; after the round 2 fix, 43 of 43.
- Codex (TIER 1):
  - r1 BLOCK, two findings: the visibility filter went stale after a toggle; focus was lost on the sync path.
  - r2 BLOCK: the focus note was never invalidated.
  - r3 PASS.
  - Each fix was red first. The third round was run after the second-cycle blocker was escalated on the ticket.
- Preview read signed out, with no sign-in (`lhb-39-preview.txt`).

🤖 Generated with [Claude Code](https://claude.com/claude-code)
