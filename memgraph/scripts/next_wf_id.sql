-- next_wf_id.sql
-- Emit the next monotonic workflow_task sequence_no and its canonical WF-<N> id.
-- Pure SQL, no embedding.

SELECT COALESCE(MAX(sequence_no), 0) + 1        AS next_sequence_no,
       'WF-' || (COALESCE(MAX(sequence_no), 0) + 1) AS next_wf_id
  FROM workflow_tasks;
