# recall_hybrid

Reciprocal Rank Fusion over FTS5 (`memory_fts`) + sqlite-vec (`memory_vec` FLOAT[512]).

## Parameters

- `:query_embedding` — JSON string of 512 floats, produced by `embed.py` (OpenAI `text-embedding-3-small`, `dimensions=512`). Passed to `vec_f32(...)`.
- `:fts_query` — FTS5 MATCH string. The `memgraph.py` entrypoint builds this by quoting each token and joining with `OR` to avoid tokenizer edge-cases.
- `:top_k` — final result cap (default 10, max 50).
- `:pool` — candidates per leg before fusion (default `:top_k * 5`, capped at 50). Vector leg uses `k = :pool` and ORDER BY distance; FTS leg uses `ORDER BY rank LIMIT :pool`.

## Fusion formula

```
score(object_id) = Σ  1 / (60 + rank_i)
```

Summed across both legs where the object appears. `60` is the classical RRF constant. Objects present in both legs dominate single-leg hits.

## Returned columns

`object_id`, `object_type`, `title`, truncated `summary` (240 chars), `tags`, fused `score`.

Use the returned `object_id` as a pointer — to pull the full structured row, query the specific table:

```sql
SELECT * FROM decisions  WHERE object_id = ?;
SELECT * FROM claims     WHERE object_id = ?;
SELECT * FROM policies   WHERE object_id = ?;
SELECT * FROM workflow_tasks WHERE object_id = ?;
SELECT * FROM orchestration_events WHERE object_id = ?;
-- etc.
```

## Type filter

`memgraph.py recall --type <csv>` post-filters after RRF fusion. Valid `object_type` values mirror the `objects.object_type` CHECK: `chunk`, `entity`, `claim`, `decision`, `task`, `event`, `view`, `policy`, `tranche`, `run`, `workflow_task`, `orchestration_event`, `review_gate`.

## Cost

One OpenAI embedding call per query (~20–50 tokens typical). The SQL itself is free.

## When to use

Before any non-trivial task: "investigate bug", "refactor", "implement", "why does X behave Y", "is there a policy about Z", "has someone hit this timeout before". Skip on pure typos and formatting-only diffs.
