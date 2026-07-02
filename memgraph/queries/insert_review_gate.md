# insert_review_gate / write-review (write path)

Records a review gate verdict on a specific WF. Used by Claude-reviewer, Codex code/logic review, lead review, regression gate, application logic review.

## Inputs

- `--wf WF-<N>` — reviewed task.
- `--type` — one of `claude_reviewer`, `codex_code_review`, `codex_logic_review`, `lead_review`, `regression_gate`, `application_logic_review`.
- `--verdict` — `pending`, `pass`, `fail`, `findings`, `accepted`, `rejected`.
- `--findings` — integer count (default 0).
- `--summary` — findings_summary text.
- `--reviewer` — reviewer_agent identifier.

## Effect

1. Validate `--wf` exists in `workflow_tasks`.
2. `BEGIN IMMEDIATE`.
3. Insert `objects(object_type='review_gate')`, then `review_gates(object_id, task_id, review_type, verdict, findings_count, findings_summary, reviewed_at=now, reviewer_agent, created_at=now)`.
4. Materialize `index_docs + memory_vec + embedding_meta` with `embedding_text`:
   ```
   Review: <type>
   WF: WF-<N>
   Verdict: <verdict>
   Findings: <count>
   Summary: <summary>
   ```
5. `COMMIT`.

## Policy coupling

- `ACCEPTED` vs `ACCEPTED with N non-blocking notes` terminology in `CLAUDE.md` must be reflected in `--summary`. Never call a gate "clean" when `findings > 0`.
- After any `--verdict findings` or `--verdict fail`, the orchestrator must NOT open the next WF in the same tranche until the finding is resolved (policy: `No Forward Progress With Open Tails`).
