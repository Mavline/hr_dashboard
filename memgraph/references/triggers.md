# When to recall, when to write

This is the decision tree the agent should follow, not a policy — policies live in `policies` and are loaded via `session-context`.

## Decision: should I recall?

```
New session started
   └── SessionStart hook runs → session-context loaded → no further recall needed yet.

User message arrives
   ├── trivial (typo fix, formatting, one-line renaming, factual question about the message itself)
   │      → no recall
   ├── request involves the codebase or previous work
   │      ├── matches an existing policy/decision/gotcha keyword I already see in session-context
   │      │      → answer from session-context, optional targeted recall for confirmation
   │      └── otherwise
   │             → ONE recall for the concrete sub-problem
   └── request mentions an unfamiliar term, service, module, file, or bug symptom
          → recall with that phrase as query, optional type filter (claim,event,decision)

Before opening a new WF
   → next-wf (no recall) + recall "<tranche name> <topic>" to verify no open tail
Before committing or pushing
   → no recall (git hygiene is local)
Unclear code behavior ("why does this fail?", "what should this do?")
   → recall "<symptom>" --type claim,event,decision
```

Budget heuristic: one recall per distinct sub-problem. Do not chain recalls to refine a query — widen `--k` or add `--type` filter instead.

## Decision: should I write?

```
Finished implementing a design choice that will affect future tasks
   → write-decision (title + summary + decision + rationale + consequences)
Found a runtime trap that a future session must know
   → write-claim --type gotcha (attach to entity if one exists)
Stated a new operational rule without elevating to policy
   → write-claim --type rule
Uncovered a new service / module / external system
   → write-entity
Encountered a new alias for an existing entity
   → alias-entity --canonical <name> --add '["alias"]'
Opened a new WF
   → open-wf (emits task_assignment event)
Transitioned WF status
   → wf-status (emits appropriate orchestration event)
Opened or closed a run
   → open-run / close-run
Finished a review pass
   → write-review
User explicitly locked a new policy or amended an existing one
   → write-policy [--retires <id>]
Linked two existing objects (supersedes, implements, caused_by, depends_on, …)
   → write-relation
```

Write cadence: do not batch writes. Each write is cheap, durable, and adds to later recall. Batching loses the temporal ordering in `orchestration_events`.

## Anti-patterns

- Hand-crafting `INSERT` into `index_docs`/`memory_vec`/`embedding_meta` — the four-table invariant will break.
- Calling a different embedding model or different dimensionality — verify phase flags the mismatch.
- Inserting into `chunks` or `sources` from the skill — those are raw layer and rebuilt from disk by the migration.
- Writing `status='active'` while a superseding row is already active — use `write-policy --retires` or `write-decision` with explicit supersede relation.
- Closing a run with `closed_accepted` while `review_gates` for any of its WFs have `verdict IN ('fail', 'findings')` without a follow-up `pass`/`accepted` — violates `No Forward Progress With Open Tails`.
