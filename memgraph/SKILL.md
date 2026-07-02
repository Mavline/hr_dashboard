---
name: memgraph
description: Portable repo-local memory graph — create (bootstrap), read, and write .agent/memory.db (SQLite + sqlite-vec + FTS5) with hybrid semantic+keyword recall. Self-contained kit: engine + bootstrap + cross-platform wrappers (bash + pwsh). Use whenever a repo has .agent/memory.db, or to stand memory up in a new project. On session start load active policies/open runs/next allowed WF; recall before non-trivial work; write on architectural decisions, non-trivial bugs (gotchas), WF open/complete, run open/close, and every orchestration event. All recall and write paths go through the wrapper; never hand-craft INSERTs into objects/index_docs/memory_vec/embedding_meta.
---

# memory-graph

## Purpose

Repo-local long-term memory lives in `<repo>/.agent/memory.db`. It unifies the legacy memory-bank prose into a structured graph:

- `objects` — polymorphic primary key (every policy, decision, claim, run, workflow_task, orchestration_event, review_gate, event, task, chunk, view, entity, generated_view has one `object_id`).
- Structured tables: `policies`, `runs`, `tranches`, `workflow_tasks`, `workflow_dependencies`, `tasks`, `entities`, `claims`, `decisions`, `events`, `relations`, `review_gates`, `orchestration_events`, `generated_views`, `chunks`, `sources`.
- `index_docs` — canonical projection used for both FTS and embeddings (`title`, `summary`, `body`, `tags`, `aliases`, `embedding_text`, `embedding_text_hash`).
- `memory_fts` — FTS5 keyword index over `index_docs`.
- `memory_vec` — sqlite-vec `FLOAT[512]` index; `rowid = object_id`.
- `embedding_meta` — per-object hash + model + dims + `embedded_at`.

Embedding provider is OpenAI `text-embedding-3-small` reduced to 512 dims (fixed in `meta` table). sqlite-vec `0.1.6` is the pinned loadable extension.

## Entrypoint

The only supported entrypoint is the wrapper next to this file — invoke it from
inside the target repo (the DB is resolved from the git root):

    <skill>/memgraph <command> [args]           # macOS / Linux
    pwsh <skill>/memgraph.ps1 <command> [args]   # Windows

where `<skill>` is this folder (e.g. `memgraph/` at your project root). Both
wrappers handle venv activation, the sqlite-vec extension path, `.env` loading,
and (pwsh) UTF-8. Direct invocation of `scripts/memgraph.py` bypasses this setup
and will fail with `AttributeError: enable_load_extension` on systems where the
default `python3` is pyenv-managed (built without
`--enable-loadable-sqlite-extensions`).

Never call `scripts/memgraph.py` or `scripts/embed.py` directly — they are
internal helpers invoked by the wrapper.

## Bootstrap a new project

For a project that has no `.agent/memory.db` yet, create one from the canonical
schema (24 tables + FTS5 + sqlite-vec@512) before any read/write:

    <skill>/venv/bin/python <skill>/scripts/bootstrap.py --target <repo>

Run once per project (`--force` overwrites, backing up the old DB first).
`bootstrap.py` only creates the store — it does NOT set up the venv, the `.env`
key, or the SessionStart hook; see `install/README.md` for the full stand-up.

## Hard constraints (exceptions only)

- Never insert into `objects`, `index_docs`, `memory_vec`, `embedding_meta` outside of the provided scripts. The four tables must stay in sync; the scripts do it transactionally.
- Never call a different embedding model or different dimensionality. `meta.embedding_model` and `meta.embedding_dimensions` are the only allowed values.
- Never write a row whose `embedding_text_hash` does not match `sha256(embedding_text)`. The verify phase checks this and will fail the next migration.
- Never touch `migration_log`, `chunks`, `sources` — those are raw-layer artifacts owned by the migration pipeline.
- Never use timestamps from the model's own "today". Get UTC epoch from shell (`date -u +%s`) or from the helper, which uses `time.time()`.
- Never start a new WF when the current tranche has unresolved findings (policy `No Forward Progress With Open Tails`), and do not skip in the `workflow_tasks.sequence_no` space.
- Never commit `.agent/memory.db` automatically — git hygiene is a separate concern; the DB lives under `.agent/` which is gitignored by convention.

## Environment

The wrapper resolves defaults automatically and invokes from any working directory inside a repo:
- `MEMGRAPH_DB` is derived from `git rev-parse --show-toplevel` + `/.agent/memory.db`.
- `SQLITE_VEC_PATH` defaults to the vendored `~/.claude/skills/memory-graph/vendor/vec0.dylib`.
- `OPENAI_API_KEY` is auto-loaded from `<repo>/.env` if not already exported.

Only `OPENAI_API_KEY` is strictly required, and only for `recall` and embedding-bearing writes. Pure-SQL commands (`session-context`, `next-wf`, `next-run`, `policy`, `entity`, `timeline`) run without it. Any of the defaults above can be overridden by exporting the corresponding env var before invoking the wrapper.

## When to READ (triggers)

### Memory access

memgraph is the primary interface to project memory. Commands return full data 
by default — session context, recall hits, object bodies, timelines, evidence 
chunks are not truncated. Use `memgraph show <id>` for a specific object's 
full text, `memgraph recall "<query>"` for hybrid FTS+vector search, 
`memgraph session-context` for current project state.

The SessionStart hook auto-runs `memgraph session-context`. When output 
exceeds the inline limit, the harness persists it to `tool-results/hook-*.txt` 
— that persisted file IS the session context, read it directly rather than 
re-invoking the command.

Markdown files in `memory-bank/` are a historical archive from the
pre-migration era. They are preserved on disk for audit only and are
NOT updated during the normal working loop. `.agent/memory.db` is the
primary source for all live project memory (tranche state, runs, WF
tasks, policies, decisions, claims, events).

### Source conflicts

If `memgraph session-context` and any `memory-bank/*.md` file disagree
on a fact (e.g. tranche status is `open` in DB but `closed` in markdown
prose), the DB wins. Markdown represents pre-migration state only.

Report the conflict explicitly ("DB says X, markdown-archive says Y")
and update the DB through the appropriate `memgraph` write helper
(`close-tranche`, `close-run`, `wf-status`, `write-decision`,
`write-claim`, etc.). Do not silently merge and do not fall back on
markdown as authoritative.

1. **Session start.** The SessionStart hook runs `memgraph session-context` automatically. No embedding call. Pure SQL projection of: active policies, open runs, top open WF, latest orchestration events, `project_overview` and `current_state` generated views. If the hook is not installed, run manually once per new session: `memgraph session-context`.
2. **Before any non-trivial task.** Run `memgraph recall "<query>"` to hybrid-search (FTS5 + vector RRF). Triggers: "implement X", "fix Y", "refactor Z", "investigate bug", "why does … behave …", "is there a policy about …". One OpenAI embedding call (~$0.000003). Skip only for pure typo fixes, formatting-only diffs, or questions that can be answered from the current packet alone.
3. **On unclear code behavior.** Run `memgraph recall "<symptom phrase>" --type claim,event,decision`. Surfaces prior `claim(gotcha|risk|observation)` and `event(bug|fix|incident)` entries.
4. **Before opening a new WF.** Run `memgraph next-wf` to get the next valid `sequence_no` and the expected `wf_id` string. Pure SQL.
5. **Before opening a new run.** Run `memgraph next-run` for the next `sequence_no` + `run_id` skeleton. Pure SQL.
6. **Policy lookup.** `memgraph policy <name-fragment>` or `memgraph recall "<topic>" --type policy`.
7. **Entity lookup.** `memgraph entity <canonical-or-alias>` returns the entity record plus its active claims and recent events.
8. **Timeline / orchestration audit.** `memgraph timeline --run <run_id>` or `--wf <wf_id>`.

The `recall` command returns every RRF-fused hit by default. Pass `--k <n>` only when you deliberately want a cap (e.g. `--k 10` for a terse summary). A single call always writes an access log line to stderr for budget visibility.

## When to WRITE (triggers)

Every write goes through `memgraph` which handles the transactional insert into `objects + <structured table> + index_docs + memory_vec + embedding_meta`.

1. **Architectural decision.** After deciding a non-trivial design point (library choice, schema shape, auth/DB policy amendment, review gate policy change, provider switch, API contract).
   - `memgraph write-decision --title "…" --summary "…" --decision "…" --rationale "…" --consequences "…" [--valid-from EPOCH] [--evidence-chunk OBJ_ID] [--relates-to OBJ_ID …]`
   - One embedding call for the composed `embedding_text`.
2. **Non-trivial bug / gotcha / invariant.** After catching a runtime trap that future sessions must know about (race, silent fallback, TCP keepalive quirk, pre-commit hook, env-var precedence).
   - `memgraph write-claim --type gotcha --statement "…" [--entity <canonical>] [--confidence 0.0..1.0] [--evidence-chunk OBJ_ID]`
   - Supported `--type`: `fact`, `requirement`, `constraint`, `assumption`, `rule`, `observation`, `gotcha`, `risk`, `status`.
3. **Entity discovery / alias.** New service, module, external system, or a newly learned alias for an existing one.
   - `memgraph write-entity --type module --name backend.api.operations --display "Operations API" --aliases '["ops-api","operations"]' --summary "…"`
   - `memgraph alias-entity --canonical <name> --add '["alt-name"]'` for a pure alias update (no new embedding if `embedding_text` unchanged; helper decides).
4. **New WF.** Before a task actually starts work.
   - `memgraph open-wf --title "…" --agent <role> --run <run_id_or_seq> --packet <path> --owned-files '["a","b"]' --forbidden '["c"]' --acceptance "…" --validation "…"`
   - Also emits a `task_assignment` orchestration_event.
5. **WF status transition.** On kickoff, in_progress, awaiting_review, findings, remediation, done, accepted, closed.
   - `memgraph wf-status --wf WF-1343 --status done --sha <commit_sha> [--note "…"]`
   - Also emits a corresponding `task_*` orchestration_event.
6. **Run lifecycle.** Run opened, closeout, accepted, stopped.
   - `memgraph open-run --title "…" --tranche <name>`
   - `memgraph close-run --run <run_id> --status closed_accepted --sha <commit_sha>`
7. **Review gate.** When a Claude-reviewer or Codex review pass finishes.
   - `memgraph write-review --wf WF-1343 --type claude_reviewer --verdict pass --findings 0 --summary "…"`
8. **Policy write.** Only when the repo is actually adopting a new/amended rule. Requires explicit user direction or an accepted tranche decision.
   - `memgraph write-policy --name "…" --scope orchestration --status active --effective-from EPOCH --source-file CLAUDE.md --text "…"`
9. **Relation.** After any write above, optionally attach `--relates-to <source_object_id>` one or more times to record typed edges (`supersedes`, `implements`, `contradicts`, `depends_on`, `evidence_for`, `solves`, `caused_by`, `blocks`, `parent_of`, `about`, `mentions`, `relates_to`, `documents`, `changes`, `invalidates`).

All write helpers accept `--dry-run` which prints the computed `embedding_text`, its hash, the proposed row(s), and the exact SQL without touching the DB.

## Hybrid recall semantics

`memgraph recall "<query>"` executes Reciprocal Rank Fusion:

- Vector leg: sqlite-vec `MATCH vec_f32(<512-dim JSON>)` with `ORDER BY distance`. `k` defaults to the full `memory_vec` row count so every candidate is ranked; pass `--k <n>` to cap earlier.
- Lexical leg: FTS5 `memory_fts MATCH '<tokenized query>'` with `ORDER BY rank`, no row limit unless `--k` is set.
- Fusion: `score = Σ 1/(60 + rank_i)` across both legs, grouped by `object_id`.
- Final projection: `object_type`, `title`, full `summary`, score, and a pointer to the structured row.

Filters:

- `--type policy,decision,claim,event,workflow_task,run,review_gate,orchestration_event,entity,view`
- `--since 2026-01-01` (ISO date or epoch)
- `--status active,locked`
- `--wf WF-1300..WF-1342` or `--run run-300..run-354`
- `--k <n>` (optional cap on final result count; omit for "return all")

## Cost model

Each embedding API call is roughly `tokens × $0.02/1M` with `text-embedding-3-small`. A 30-token query costs ~$0.0000006; a 300-token decision-body write costs ~$0.000006. A typical working day (30 recalls + 5 writes) is on the order of 10^-5 USD.

Consequences: call `recall` freely before non-trivial work, do not batch it at end-of-task to "save calls". Session context is cheaper still — it is pure SQL, no API.

But: do not spam `recall` on every trivial message. A reasonable ceiling is one recall per distinct sub-problem in a session; more is wasteful, not expensive.

## Failure modes and recovery

- **`OPENAI_API_KEY` missing.** `memgraph recall` and every `write-*` with a new embedding fail fast. Pure-SQL commands (`session-context`, `next-wf`, `next-run`, `policy`, `timeline`, `open-runs`) still work.
- **`sqlite-vec` extension not loadable.** Vector leg is disabled; `recall` falls back to FTS-only with a stderr warning. Write paths still embed and insert into `memory_vec`; if the extension is missing at write time, the command aborts before any row is written.
- **DB locked.** SQLite is single-writer. Retry is handled inside `memgraph` with exponential backoff up to 3s. If it still fails, stop and report the blocker.
- **Hash mismatch on write.** Script recomputes `embedding_text_hash` and refuses to insert if the caller-provided hash disagrees. Do not override.
- **Duplicate insert.** `policies (source_file, effective_from, policy_name)`, `entities (entity_type, canonical_name)`, `runs (run_id)`, `workflow_tasks (wf_id)`, `generated_views (view_name)` are `UNIQUE`. Helpers detect and return the existing `object_id` instead of failing — useful when retrying.

## Output contract

Every `memgraph` subcommand:

- Prints a single JSON object to stdout on success: `{ "ok": true, "object_id": <int>, "type": "<object_type>", "wrote": { ... }, "cost_usd": <float|null> }` for writes; `{ "ok": true, "count": N, "hits": [...] }` for reads.
- Prints human-readable single-line progress to stderr.
- Exit code `0` on success, non-zero on error with `{ "ok": false, "error": "…", "where": "…" }` on stdout.

This is deliberately machine-readable so orchestrator agents can pipe results.

## See also

- `queries/*.md` — one file per SQL template, with the exact text, the parameters, and the expected shape. Read the one you need before composing anything custom.
- `references/schema.md` — compact schema cheat-sheet aligned with the current DB.
- `references/triggers.md` — decision tree for "should I recall?" and "should I write?".
- `references/object_types.md` — what each `object_type` means and which structured table it lives in.
- `references/cost.md` — per-call cost table and daily budget examples.
- `install/README.md` — how to install the skill and the SessionStart hook.
