# memory-graph (Claude Code skill)

Read/write interface to the repo-local memory graph stored in `.agent/memory.db` (SQLite + sqlite-vec FLOAT[512] + FTS5). Pairs with the v2.1 memory migration.

## Layout

```
SKILL.md                      — primary skill prompt loaded by Claude Code.
README.md                     — this file (you're here).
scripts/
  memgraph.py                 — entrypoint for every read/write command.
  embed.py                    — stdin text → 512-dim JSON vector (OpenAI).
  session_context.sql         — pure-SQL boot context.
  recall_hybrid.sql           — RRF over FTS5 + sqlite-vec.
  next_wf_id.sql              — next WF-<N> sequence.
  next_run_id.sql             — next run-<NNN>_<date> sequence.
  active_policies.sql         — active/locked policies.
  active_decisions.sql        — active architecture decisions.
  known_gotchas.sql           — gotcha/risk/observation/constraint claims.
  open_runs.sql               — open runs with their unfinished WFs.
  entity_by_name.sql          — entity lookup by canonical_name or alias.
  wf_timeline.sql             — orchestration_events scoped by run/wf.
queries/
  session_context.md          — what session_context projects, when to re-run.
  recall_hybrid.md            — RRF parameters, cost, type filter.
  next_wf_id.md               — invariants around WF numbering.
  insert_decision.md          — write-decision transactional contract.
  insert_claim.md             — write-claim contract; when to pick which claim_type.
  insert_workflow_task.md     — open-wf contract.
  update_workflow_status.md   — wf-status contract + status→event mapping.
  insert_review_gate.md       — write-review contract.
  insert_run.md               — open-run / close-run.
  insert_policy.md            — write-policy with --retires.
  insert_entity.md            — write-entity / alias-entity.
  insert_relation.md          — write-relation (typed edges).
references/
  schema.md                   — compact DDL cheat-sheet for all writer-surface tables.
  object_types.md             — what each object_type means.
  triggers.md                 — decision tree: recall? write?
  cost.md                     — per-op cost + daily budget example.
install/
  README.md                   — install + SessionStart hook setup.
  settings.snippet.json       — JSON block to merge into ~/.claude/settings.json.
```

## Quick entry points

- On session start the hook runs and dumps live context automatically. Nothing else to do.
- Before any non-trivial task: `memgraph.py recall "<query>"`.
- To write durable knowledge: `memgraph.py write-decision | write-claim | write-entity | write-relation`.
- To run the orchestration loop: `memgraph.py next-wf`, `memgraph.py open-wf`, `memgraph.py wf-status`, `memgraph.py write-review`, `memgraph.py open-run`, `memgraph.py close-run`.

## Hard invariants

- Four-table atomicity: every write touches `objects + <structured table> + index_docs + memory_vec + embedding_meta` in a single transaction.
- Embedding model is pinned to `text-embedding-3-small` with `dimensions=512`. Matches `meta.embedding_model` and `meta.embedding_dimensions`.
- `memory_vec.rowid = objects.id`. Never insert into `memory_vec` without a matching `objects` row first.
- `index_docs.embedding_text_hash = sha256(embedding_text)`. The migration's verify phase checks hash integrity.
- Raw layer (`chunks`, `sources`, `migration_log`, `extraction_cache`) is read-only for the skill.

## See also

Start with `SKILL.md`. Drill into `queries/*.md` for any specific command. Use `references/schema.md` as the constant-reference cheat-sheet when composing ad-hoc SQL beyond the shipped templates.
