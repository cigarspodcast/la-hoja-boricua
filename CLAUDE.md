# La Hoja Boricua: rules for sessions working in this repo

## AI routes (LHB-79)

LHB calls three AI services directly, through its own client `tools/ai_routes.py`, with keys held in the Windows user environment. It never uses the estate gateway or the C10 routing pack.

| Route | Variable | Call |
|---|---|---|
| TypeSafe Jev | `TYPESAFE_API_KEY` | `jev_choice(...)`: POST `https://api.typesafe.ai/v1/systemone`, model `jev-latest` |
| OpenCode Go | `OPENCODE_GO_API_KEY` | `opencode_chat(...)`: POST `https://opencode.ai/zen/go/v1/chat/completions`, Go-plan models only |
| Together (fallback) | `TOGETHER_API_KEY` | `together_chat(..., case=...)`: POST `https://api.together.ai/v1/chat/completions` |

Rules that travel with the access:

- **Keys.** A key is read from the environment at the moment of the call. It is never printed, logged, written to a file, committed, quoted in a comment, or stored in any tool's credential store, opencode's own login included. Verify a key by presence and by use only.
- **Jev data class.** Jev takes data class none only: synthetic text or public site content. Ticket text, code, review notes, database contents, Clerk data and anyone's personal data never go to Jev.
- **OpenCode Go endpoint.** OpenCode Go is called under `https://opencode.ai/zen/go/v1` only, never anything under `https://opencode.ai/inference`, which is metered.
- **Together is a fallback only.** Call it when the model is not on the Go plan (`case='not-on-go'`) or when an OpenCode call is refused because the subscription is used up (`case='go-exhausted'`). The client refuses any other case.
- **Spend.** Jev and Together are paid. Before the first Jev call on a ticket, post a reason comment on that ticket. At most 10 Jev calls per ticket go without the owner's yes.
- **Call log.** Every call appends one line to `evidence/ai-calls.log`, tab-separated: UTC time with Z, route, model, ticket, reason, HTTP status. It holds no key and no request or response text.
- **A refusal is a result.** A refused call (401, 403, 429) is recorded, never retried in a loop.

Tests: `python -m unittest tools/test_ai_routes.py` (no network). Proof: `python tools/ai_proof.py <base commit>`.
