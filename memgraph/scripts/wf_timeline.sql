-- wf_timeline.sql
-- Full orchestration timeline scoped by run_id or wf_id.
--
-- Parameters:
--   :run_id   — e.g. 'run-354_2026-04-15' or NULL
--   :wf_id    — e.g. 'WF-1343' or NULL
-- At least one of :run_id, :wf_id must be non-null.

SELECT datetime(oe.happened_at, 'unixepoch') AS happened_at,
       oe.event_type,
       wt.wf_id,
       r.run_id,
       oe.agent_role,
       oe.previous_pushed_sha,
       oe.details,
       oe.next_action,
       oe.source_file || ':' || oe.source_line AS source_loc
  FROM orchestration_events oe
  LEFT JOIN workflow_tasks wt ON wt.id = oe.task_id
  LEFT JOIN runs r            ON r.id  = oe.run_id
 WHERE (:run_id IS NULL OR r.run_id  = :run_id)
   AND (:wf_id  IS NULL OR wt.wf_id  = :wf_id)
 ORDER BY oe.happened_at ASC, oe.id ASC;
