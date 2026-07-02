-- open_runs.sql
-- Open / in-flight runs with their unfinished workflow tasks attached.

WITH open_runs AS (
    SELECT r.id, r.run_id, r.sequence_no, r.status, r.run_title,
           t.tranche_name, r.opened_at
      FROM runs r
      LEFT JOIN tranches t ON t.id = r.tranche_id
     WHERE r.status IN ('planned','open','in_progress','awaiting_review','paused')
)
SELECT  o.run_id,
        o.sequence_no       AS run_seq,
        o.status            AS run_status,
        o.tranche_name,
        wt.wf_id,
        wt.sequence_no      AS wf_seq,
        wt.status           AS wf_status,
        wt.agent_role,
        wt.title
  FROM open_runs o
  LEFT JOIN workflow_tasks wt
         ON wt.run_id = o.id
        AND wt.status NOT IN (
          'done','done_no_findings','done_with_findings',
          'accepted','closed','cancelled','published'
        )
 ORDER BY o.sequence_no DESC, wt.sequence_no ASC;
