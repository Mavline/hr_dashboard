# insert_run / open-run / close-run (write path)

## open-run

Opens a new run row plus a `run_open` orchestration_event.

Inputs:

- `--title` — short run title.
- `--tranche` — existing `tranches.tranche_name`. If missing, command aborts.
- `--boundary` — textual boundary_decision (what this run is allowed to touch).

Effect:

1. `next_sequence_no = MAX(sequence_no)+1`. `run_id = f"run-{seq:03d}_{YYYY-MM-DD}"` (UTC date).
2. Insert `objects(object_type='run')` + `runs(object_id, run_id, sequence_no, run_date, run_title, tranche_id, opened_at=now, status='open', boundary_decision)`.
3. Materialize `index_docs + memory_vec + embedding_meta`.
4. Insert `objects(object_type='orchestration_event')` + `orchestration_events(event_type='run_open', run_id, tranche_id, agent_role='orchestrator', details="opened <run_id>: <title>", next_action='queue first WF')` and materialize it.
5. Commit.

## close-run

Closes the run and emits a `run_closeout` event.

Inputs:

- `--run` — `run_id` (string).
- `--status` — `closed_accepted`, `closed_rejected`, `stopped`, or `paused`.
- `--sha` — `previous_pushed_sha` to stamp on the event.
- `--note` — free-text.

Effect:

1. `UPDATE runs SET status=?, closed_at=now WHERE run_id=?`.
2. Insert + materialize `orchestration_events(event_type='run_closeout', …)`.
3. Commit.

## Policy coupling

- Use `closed_accepted` only when the run's review gates are `pass` or `accepted` (or `findings` with `non-blocking` notes per `CLAUDE.md` wording).
- After close, check for next red boundary in the tranche via `memgraph.py recall "<tranche name>" --type workflow_task,orchestration_event`. Per `Autonomous Continuous Execution` policy, proceed immediately unless a stop condition applies.
