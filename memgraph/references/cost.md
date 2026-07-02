# Cost model

## Per-operation

| Operation                                         | OpenAI API call? | Approx. cost        |
|---------------------------------------------------|------------------|---------------------|
| `session-context`                                 | no               | 0                   |
| `next-wf`, `next-run`                             | no               | 0                   |
| `policy <fragment>`                               | no               | 0                   |
| `entity <name>`                                   | no               | 0                   |
| `timeline --run/--wf`                             | no               | 0                   |
| `recall "<query>"`                                | 1 embed call     | ~$3e-7 per 20-token query |
| `write-decision` / `write-claim` / `write-policy` | 1 embed call     | ~$6e-6 per 300-token body |
| `write-entity` (new)                              | 1 embed call     | ~$1e-6              |
| `write-entity` (existing — idempotent)            | no               | 0                   |
| `alias-entity` (adds new aliases)                 | 1 embed call     | ~$1e-6              |
| `alias-entity` (no change)                        | no               | 0                   |
| `open-wf`                                         | 2 embed calls    | ~$3e-6 (WF + event) |
| `wf-status`                                       | 1 embed call     | ~$1e-6              |
| `open-run` / `close-run`                          | 2 / 1 embed calls| ~$2e-6              |
| `write-review`                                    | 1 embed call     | ~$1e-6              |
| `write-relation`                                  | no               | 0                   |

`text-embedding-3-small` list price (as of the migration): **$0.02 / 1M tokens**. Numbers above assume typical English text; longer bodies scale linearly.

## Daily budget example

30 recalls + 5 writes + 10 WF status updates + 3 review gates + 2 run lifecycle events per day:

- Embed calls: 30 + 5 + 10 + 3 + 2 ≈ 50
- Avg tokens per call: 60
- Total tokens: 3000
- Cost: `3000 × $0.02/1M = $6e-5` (six hundredths of a cent).

Over a month of daily work: ~$0.002. Embedding calls are not a budget concern in normal use.

## Ceilings that DO matter

- **Session-context doc is large.** The rendered `project_overview` + `current_state` bodies can be >5k tokens combined. Not an API cost — but it burns context window on session start. If the hook output is too heavy, render a compact form via `memgraph.py session-context --format json` and post-process.
- **Recall `--k` above 20.** Fusion is cheap but the result text will eat context. Default 10 is almost always right.
- **Hot loops.** Do not embed the same query twice in a row. If you need to refine, use filters (`--type`, `--k`) on a single result set.
