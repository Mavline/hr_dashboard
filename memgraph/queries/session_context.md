# session_context

Pure-SQL boot context. Always the first memory-graph action in a fresh session — either implicitly via the SessionStart hook or explicitly via `memgraph.py session-context`. No OpenAI call.

## What it projects

1. `meta` snapshot — schema_version, storage, embedding_provider/model/dimensions, sqlite_vec_version, fts/vector_index flags.
2. `active_policies` — every `policies` row with `status IN ('active','locked')`, newest first.
3. `open_runs` — `runs` with `status IN ('planned','open','in_progress','awaiting_review','paused')`, joined to `tranches`.
4. `active_tranches` — `tranches` with `status IN ('planned','open')`.
5. `next_wf` — `MAX(workflow_tasks.sequence_no)+1` and the canonical `WF-<N>` string.
6. `top_open_wf` — up to 15 `workflow_tasks` whose `status` is not a terminal state, ordered by `sequence_no ASC`.
7. `recent_orchestration` — last 15 `orchestration_events` joined to `workflow_tasks` and `runs`.
8. `generated_views.project_overview` and `generated_views.current_state` — full bodies.

## Parameters

None.

## Cost

Zero API calls.

## When to re-run

- Once per new session (auto).
- After a long idle gap (>1h) inside an existing session, to refresh the agent's view of "open" state.
- After any external change to the DB (user-side migration, manual SQL, other agent session writing in parallel).
