# LHB-77 (M7-F9): facelift release checklist

Prepared 2026-10-29T14:11Z on `facelift` at 09ee94f, before the merge of PR #38 into main.

## Owner instruction

On 2026-10-29 the owner wrote in chat: "remove all gates - execute the entire plan". The release is the owner's act, and this instruction is that act. Each precondition that is not met is listed below as WAIVED, so the record shows what went live without it.

## Preconditions, each checked

| Precondition (LHB-77 pinned decisions) | State | Source |
|---|---|---|
| Sergio's approval or resolved list (M7-F7) | WAIVED | LHB-76 Canceled. The owner ruled on 2026-10-28 that there is no Sergio review. |
| Logo chosen (M7-F2b) | MET | LHB-69 Done; evidence/m7-logo/DECISION.md records the Parada mark. LHB-70 Done applied it (Codex TIER 2 PASS). |
| Illustrator's written permission on file in the Drive project folder | WAIVED, NOT ON FILE | Raised on LHB-73 and LHB-77 at 07:00Z. No path to a filed permission has been quoted. |
| 3D generator's commercial-use terms confirmed by the owner | WAIVED, NOT CONFIRMED | LHB-73 "Not mine"; no confirmation recorded. |
| Audio credits page complete (M7-F4b) | MET | LHB-73 Done. |
| Device matrix run by the owner, results recorded | WAIVED, NOT RUN | No owner results are recorded. Automated proof only: headless screenshots in evidence/m7-f2c/ and the earlier M7 evidence. |

The two WAIVED, NOT ON FILE / NOT CONFIRMED rows are rights questions about the intro artwork. They stay open for the owner after release. If either one turns out badly, the rollback below removes the intro from production.

## Release facts

- main before the merge: f1ea0d07a9f3eeea25db8df35ddc324feef8977d, service worker cache `lhb-v111`.
- facelift being merged: 09ee94f plus this evidence commit, cache `lhb-v113`. Installed apps see a new cache name and update on their next load.
- origin/main is an ancestor of facelift, so the merge result is exactly facelift's tree.
- The noindex rule in site/_headers matches only `<version>.la-hoja-boricua.pages.dev` previews. After the deploy, production must answer without an `X-Robots-Tag: noindex` header (checked in READBACK.txt).

## After the merge

READBACK.txt in this folder records the production read-back: the service worker cache version, the manifest, the icons, the home page with the intro, and the headers.
