# insert_decision (write path)

Wraps atomic inserts into four tables: `objects`, `decisions`, `index_docs`, `memory_vec` (+ `embedding_meta`). Do not hand-roll — call `memgraph.py write-decision`.

## Inputs

- `--title` — short human identifier (≤100 chars recommended).
- `--summary` — one-paragraph summary. Appears in recall results.
- `--decision` — the actual decision text.
- `--rationale` (optional) — why this decision was made.
- `--consequences` (optional) — downstream implications.
- `--status` — `proposed`, `active` (default), `superseded`, `invalidated`, `rejected`, `archived`.
- `--valid-from`, `--valid-until` — epoch seconds. Defaults: `now`, `NULL`.
- `--evidence-chunk <object_id>` — pointer to a `chunks.object_id` supplying the textual provenance.
- `--relates-to <object_id> [--relation <rel>]` — optional typed edge into `relations`. Default relation is `relates_to`.
- `--tags` — comma-separated string stored in `index_docs.tags`.
- `--dry-run` — print the computed `embedding_text`, hash, and planned SQL without touching the DB.

## Transactional steps

1. `BEGIN IMMEDIATE`.
2. Insert a row into `objects(object_type='decision', created_at, updated_at)` and capture the new `object_id`.
3. Insert into `decisions(object_id, title, summary, decision_text, rationale, consequences, status, decided_at, valid_from, valid_until, primary_evidence_chunk_id, created_at, updated_at)`.
4. Compose `embedding_text` = `"Title: …\nSummary: …\nDecision: …\nRationale: …\nConsequences: …"` (empty fields dropped).
5. Insert into `index_docs(object_id, object_type, title, summary, body, tags, aliases, embedding_text, embedding_text_hash, indexed_at)` with `embedding_text_hash = sha256(embedding_text)`.
6. Call `embed.py` with `embedding_text` → 512-float JSON vector.
7. Insert `memory_vec(rowid=object_id, embedding=vec_f32(json))`.
8. Insert `embedding_meta(object_id, embedding_text_hash, model='text-embedding-3-small', dimensions=512, embedded_at)`.
9. Optionally insert each `relations` edge.
10. `COMMIT`.

## Invariants

- `index_docs.embedding_text_hash` must equal `sha256(embedding_text)` — verification phase 13.6 enforces this.
- `memory_vec.rowid` must equal `objects.id` — verification phase 13.5 enforces pairing.
- `embedding_meta.model` and `.dimensions` must equal `meta.embedding_model` and `meta.embedding_dimensions`.

## Failure modes

- Rollback on any exception. No partial write survives.
- If `embed.py` fails (API error, no `OPENAI_API_KEY`, non-512 output), the command aborts before any row is committed.
