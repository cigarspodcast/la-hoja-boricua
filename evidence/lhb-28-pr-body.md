## LHB-28 + LHB-31: Mi Hoja requires sign-in, carries existing data over, and syncs between phones

One branch for both tickets: LHB-28 was activated as the prerequisite of LHB-31, and the two share the new engine `site/sync.js`, the `write()` hook in `site/hoja.js` and `functions/api/mihoja.js`.

What it does
- Mi Hoja and its actions need an account; signed out, a tapped heart, star, stamp, tasting or humidor action opens sign-in and completes afterwards.
- First sign-in merges this phone's copy into the account (record by record, never replacing); the local copy is not deleted by the carry-over.
- Signed in, Mi Hoja syncs between phones: server `rev` with `If-Match`, a 409 returns the current copy, a three-way merge (`LHB_MERGE.merge(base, local, remote)`) keeps what only one phone changed, lets a deletion win only when the other phone did not touch the record, and converges.
- Account change on a phone parks the old copy in a separate key; drafts and unreadable copies are parked too.

Evidence (all committed under `evidence/`)
- Suite: 165 pass, 0 fail, after merging current `main` (`evidence/lhb-28-tests-r13.txt`).
- Mutation proof: `evidence/lhb-28-mutations.py` lists 162 mutations; the last full run is `lhb-28-mutations-r15.txt` (159 red, 4 survivors), the survivors were fixed with tests or documented as unobservable in the script's comments, and `r16.txt` and `r17.txt` show them red; earlier runs are `r3` to `r13`.
- Codex review, TIER 2: nine rounds, `evidence/lhb-28-review-r1.txt` to `r9.txt`. All nine ended BLOCK. Every round's findings were fixed with a test seen failing, except the items below, which are the findings of rounds 8 and 9 still open as limits. The findings narrowed from ordinary sync cases to sequences of two failures (storage full, lost response, another tab) plus another phone's deliberate edit.

KNOWN LIMITS (from the last review). Limit 1 can lose a deliberate edit in a rare sequence (a lost or unreadable answer to an upload plus a second action before the retry); the others are not data loss.
1. An upload whose answer was lost or unreadable (exception, HTTP 5xx, unreadable body, sign-out while it was in flight) may or may not have landed. The engine remembers it as uncertain and stops trusting the stored base once the account moves two or more writes ahead. Two sequences still fail (Codex round 9): (a) the person re-adds, on the same phone, what the uncertain upload removed, before retrying: the later re-add is read as unchanged and not synced; (b) the uncertain upload is followed by a 409 before the retry, which erases the memory of the uncertainty and lets a deliberate re-add by another phone be deleted. A proper fix is an idempotency token in the PUT (server change); a follow-up ticket will be filed.
2. The uncertain-upload memory lives in memory only: after a page reload it is forgotten.
3. localStorage has no compare-and-set across tabs, so a write landing between the comparison inside `setDoc` and its `setItem` is not covered.
4. The sync meta keeps a full copy of the synced document (base, and a seed until the first full pass): Mi Hoja takes about twice the localStorage space; a full storage makes the pass fail with the error status and leaves the data alone.
5. Deletions are inferred from the base copy: a damaged but not empty local copy would read as the person deleting those records (an empty phone with a non-empty base is treated as a loss and the account is pulled).
6. Photos: a record's `foto` key travels as text; the image bytes do not.
7. Deleting the account must delete the `mihoja` row (no foreign key); that cascade belongs to LHB-34. No rate limit on PUT beyond the size caps.
8. No browser run was made. Owner steps: the two-browser preview run, the signed-out heart tap after sign-in on the preview, and a real email-link sign-in on production before this merges (LHB-28 release order).

Not merged and not closed: merge and close wait for the owner's approval.

Deviations from the tickets: LHB-28 and LHB-31 share one branch and one PR; `site/sync.js` is a new file (added to the service worker shell, `lhb-v65`); `write()` in `site/hoja.js` got a hook for the engine.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
