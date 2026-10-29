# LHB-77 (M7-F9): rollback note for the facelift release

- **Previous production:** main at f1ea0d07a9f3eeea25db8df35ddc324feef8977d, service worker cache `lhb-v111`.
- **Release:** the merge commit of PR #38 (facelift into main). Its id is recorded on LHB-77 and in READBACK.txt.

## To roll back

1. In a checkout of main: `git revert -m 1 <merge commit>`. This restores the f1ea0d0 tree as a new commit. Delivered history is never rewritten.
2. In the same commit, set the cache name in site/sw.js ABOVE every version that has been live, so `lhb-v114` or higher, never back to `lhb-v111`. Update the test pins that name the version. An installed app holding `lhb-v113` only drops it when it sees a different name, and reusing an old name would leave some phones on the facelift.
3. Run `node --test --test-timeout=60000 test/site.test.js`, push main, and let Cloudflare Pages deploy it.
4. Read production back: `curl -s "https://lahojaboricua.com/sw.js?r=$RANDOM" | grep -oE "lhb-v[0-9]+"` must print the new version.

## Partial rollback

If only the intro has to come down (for example, the illustrator's permission or the generator's terms come back negative), revert just the intro commits (LHB-72 and LHB-73) instead of the whole merge, with the same cache-bump rule.

No data migration is part of the facelift, so a rollback touches no database.
