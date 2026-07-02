# insert_workflow_task / open-wf (write path)

Opens a new WF: inserts `workflow_tasks` + a companion `orchestration_event(event_type='task_assignment')`, both fully materialized into `index_docs + memory_vec + embedding_meta`.

## Inputs

- `--title` — one-line human title.
- `--agent` — agent role string (`agent_backend`, `agent_frontend`, `agent_fullstack`, `agent_orchestrator`, etc.).
- `--run` — either `run_id` (`run-354_2026-04-15`) or bare `sequence_no` (`354`).
- `--packet` — path to the task packet file.
- `--owned-files '["a","b"]'` — JSON array of allowlist paths.
- `--forbidden '["c"]'` — JSON array of deny paths.
- `--acceptance "..."` — textual acceptance criteria.
- `--validation "..."` — exact validation/test commands.
- `--status` — initial status (default `planned`); valid values are the `workflow_tasks.status` CHECK enum.
- `--sha` — optional `previous_pushed_sha` for the orchestration event.
- `--dry-run` — print everything without writing.

## Effect

1. `BEGIN IMMEDIATE`.
2. Compute `next_sequence_no = MAX(sequence_no)+1`, build `wf_id = f"WF-{next_sequence_no}"`.
3. Insert `objects(object_type='workflow_task')`, then `workflow_tasks(...)` with the full packet fields.
4. Materialize `index_docs + memory_vec + embedding_meta` for the WF. `embedding_text` is:
   ```
   WF: WF-<N>
   Title: …
   Agent: …
   OwnedFiles: […]
   Forbidden: […]
   Acceptance: …
   Validation: …
   ```
5. Insert `objects(object_type='orchestration_event')`, then `orchestration_events(event_type='task_assignment', happened_at=now, run_id, task_id, agent_role, previous_pushed_sha, details, next_action='await kickoff', source_file='memgraph.py', source_line=0)`.
6. Materialize the orchestration_event into `index_docs + memory_vec + embedding_meta`.
7. `COMMIT`.

## Invariants

- `sequence_no` and `wf_id` are `UNIQUE`; concurrent writers hit the UNIQUE constraint and retry via the driver's backoff.
- `owned_files_json` and `forbidden_paths_json` must be valid JSON arrays (`json_valid` + `json_type = 'array'`).
- `CLAUDE.md` policy: do not open a new WF while the current tranche has unresolved findings. The helper does not enforce this — the orchestrator agent must check first (`memgraph.py recall "findings" --type review_gate` and the open tranche state).
