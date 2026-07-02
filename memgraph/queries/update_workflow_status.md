# update_workflow_status / wf-status (write path)

Advances `workflow_tasks.status` and emits a corresponding `orchestration_event` in one transaction.

## Inputs

- `--wf WF-<N>` — target workflow task.
- `--status` — new status. Valid values are every string in the `workflow_tasks.status` CHECK enum:
  `planned`, `pending`, `queued`, `assigned`, `kickoff`, `in_progress`, `awaiting_review`, `verification`, `reviewed_with_findings`, `findings`, `blocked`, `blocked_for_remediation`, `remediation`, `done`, `done_with_findings`, `done_no_findings`, `accepted`, `closed`, `published`, `cancelled`, `stalled_no_artifact`, `paused`, `checkpoint`, `rollout`, `reconciliation`, `implementation`.
- `--sha` — commit SHA attached to the orchestration_event as `previous_pushed_sha`.
- `--note` — free-text appended to `orchestration_events.details`.
- `--next-action` — short "what happens next" hint.

## Status → event mapping

| status                        | orchestration_event.event_type |
|-------------------------------|--------------------------------|
| kickoff                       | task_kickoff                   |
| in_progress                   | checkpoint                     |
| awaiting_review               | review_launch                  |
| reviewed_with_findings        | review_result                  |
| findings                      | review_result                  |
| blocked / paused              | pause                          |
| blocked_for_remediation       | task_transition                |
| remediation                   | task_relaunch                  |
| done / done_* / closed        | task_completion                |
| accepted                      | run_accept                     |
| cancelled                     | task_transition                |
| verification                  | verification_complete          |
| checkpoint                    | checkpoint                     |
| (anything else)               | task_transition                |

## Effect

1. `BEGIN IMMEDIATE`.
2. `UPDATE workflow_tasks SET status=?, completed_at=COALESCE(?, completed_at) WHERE id=?`. `completed_at` is set to `now` iff the new status is terminal (`done*`, `accepted`, `closed`, `cancelled`, `published`).
3. `UPDATE index_docs SET tags='agent:<role>,status:<new>' WHERE object_id=?` — keeps recall filters fresh.
4. Insert the orchestration_event and materialize it into `index_docs + memory_vec + embedding_meta` so later recalls surface the transition.
5. `COMMIT`.

## When to emit

Every transition. Never update `workflow_tasks` directly — always through `wf-status` so the event trail exists.
