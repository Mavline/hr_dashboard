# insert_claim (write path)

For gotchas, invariants, facts, risks, observations, assumptions, constraints, rules, and status claims.

## When to write which claim_type

- `gotcha` — runtime trap that a future session must know about. Example: "`requests.Session` keeps TCP connection open; call `.close()` explicitly after streaming."
- `risk` — a known-but-unmitigated hazard.
- `observation` — a stable empirical fact about system behavior.
- `fact` — a declarative truth ("SUPABASE Auth issues JWTs with `exp=3600` by default").
- `requirement` — something the spec mandates.
- `constraint` — a non-negotiable limit.
- `assumption` — something currently assumed; may be invalidated later.
- `rule` — an operational rule not severe enough to be a policy.
- `status` — a time-bound status claim ("frontend notifications tranche is green as of run-354").

## Inputs

- `--type` — one of the above.
- `--statement` — the full claim text.
- `--entity <canonical_name>` — link to an existing entity. Helper verifies and attaches `entity_object_id`. If not found, the claim is still stored (with a stderr warning); prefer creating the entity first via `memgraph.py write-entity`.
- `--confidence` — float 0.0–1.0 (default 0.8).
- `--status` — `active` (default), `superseded`, `invalidated`, `uncertain`, `archived`.
- `--valid-from`, `--valid-until` — epoch seconds.
- `--evidence-chunk <object_id>` — pointer to a `chunks.object_id`.
- `--relates-to <object_id> [--relation about]` — typed edges.

## Effect

Same 10-step transactional write as decisions, into `objects + claims + index_docs + memory_vec + embedding_meta`. `embedding_text` composition:

```
ClaimType: <type>
Statement: <statement>
Entity: <canonical_name or blank>
```

## When to emit

- Immediately after you catch a runtime trap. Do not defer to end-of-session; the claim should exist before the bug log rots.
- When the user states a rule that is not yet a locked policy.
- When you verify an assumption and want to lift it to `fact` or bury it as `invalidated`.
