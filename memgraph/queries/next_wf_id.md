# next_wf_id

Pure-SQL lookup for the next allowed `workflow_tasks.sequence_no` and the canonical `WF-<N>` string.

## Output

| next_sequence_no | next_wf_id |
|------------------|------------|
| 1343             | WF-1343    |

## Invariants

- `workflow_tasks.sequence_no` is `UNIQUE` and monotonically increasing; there must be no gaps in new inserts (the verify step tolerates historical gaps but flags them as warnings).
- `wf_id` format is `WF-<sequence_no>` with no leading zero padding.
- `open-wf` insertion is transactional: if a concurrent session grabs the same `sequence_no`, the second writer hits `UNIQUE` and `memgraph.py` retries.

## When to use

Before emitting any new workflow task, in the packet authoring step. Paired with `memgraph.py open-wf --run <run> --agent <role> --title "..." ...`, which runs this query internally and inserts atomically.
