-- session_context.sql
--
-- Pure-SQL session-startup context for the memory-graph skill.
-- No embedding call. Safe to run from the SessionStart hook without OPENAI_API_KEY.
--
-- The python entrypoint `memgraph.py session-context` renders this in a
-- compact text form; you can also dot-run this file directly via sqlite3
-- to get the raw rows.

.mode box
.headers on

-- 1) Meta snapshot --------------------------------------------------------
SELECT '===== memory-graph meta =====' AS section;
SELECT key, value FROM meta
 WHERE key IN (
   'schema_version','storage','embedding_provider','embedding_model',
   'embedding_dimensions','sqlite_vec_version','fts','vector_index'
 )
 ORDER BY key;

-- 2) Active policies ------------------------------------------------------
SELECT '===== active policies =====' AS section;
SELECT policy_name, scope, status,
       datetime(effective_from,'unixepoch') AS effective_from,
       source_file
  FROM policies
 WHERE status IN ('active','locked')
 ORDER BY effective_from DESC, id DESC;

-- 3) Open / in-flight runs ------------------------------------------------
SELECT '===== open runs =====' AS section;
SELECT r.run_id, r.sequence_no, r.status, r.run_title,
       COALESCE(t.tranche_name,'') AS tranche,
       datetime(r.opened_at,'unixepoch') AS opened_at
  FROM runs r
  LEFT JOIN tranches t ON t.id = r.tranche_id
 WHERE r.status IN ('planned','open','in_progress','awaiting_review','paused')
 ORDER BY r.sequence_no DESC;

-- 4) Active / planned tranches -------------------------------------------
SELECT '===== active tranches =====' AS section;
SELECT tranche_name, milestone, phase, status,
       datetime(opened_at,'unixepoch') AS opened_at
  FROM tranches
 WHERE status IN ('planned','open')
 ORDER BY opened_at DESC;

-- 5) Next allowed WF ------------------------------------------------------
SELECT '===== next WF =====' AS section;
SELECT 'WF-' || (COALESCE(MAX(sequence_no),0)+1) AS next_wf,
       (COALESCE(MAX(sequence_no),0)+1) AS next_sequence_no
  FROM workflow_tasks;

-- 6) Top open workflow tasks ---------------------------------------------
SELECT '===== top open WF =====' AS section;
SELECT wt.wf_id, wt.sequence_no, wt.status, wt.agent_role, wt.title
  FROM workflow_tasks wt
 WHERE wt.status NOT IN (
   'done','done_no_findings','done_with_findings','accepted','closed','cancelled','published'
 )
 ORDER BY wt.sequence_no ASC;

-- 7) Most recent orchestration events ------------------------------------
SELECT '===== recent orchestration =====' AS section;
SELECT oe.event_type,
       datetime(oe.happened_at,'unixepoch') AS happened_at,
       wt.wf_id, r.run_id, oe.agent_role,
       oe.details
  FROM orchestration_events oe
  LEFT JOIN workflow_tasks wt ON wt.id = oe.task_id
  LEFT JOIN runs r ON r.id = oe.run_id
 ORDER BY oe.happened_at DESC;

-- 8a) OPERATIONAL: recent tranche-level events (14d) ---------------------
SELECT '===== recent tranche events (14d) =====' AS section;
SELECT oe.event_type,
       datetime(oe.happened_at,'unixepoch') AS happened_at,
       COALESCE(t.tranche_name,'') AS tranche,
       COALESCE(oe.agent_role,'') AS agent,
       oe.details,
       oe.next_action
  FROM orchestration_events oe
  LEFT JOIN tranches t ON t.id = oe.tranche_id
 WHERE oe.event_type IN (
         'tranche_closed','tranche_boundary_set',
         'run_accept','run_acceptance','run_closeout','closeout'
       )
   AND oe.happened_at >= unixepoch('now','-14 days')
 ORDER BY oe.happened_at DESC;

-- 8b) OPERATIONAL: current tranche narrative -----------------------------
SELECT '===== current tranches =====' AS section;
SELECT tranche_name, milestone, phase, status,
       scope, deferred_to_next,
       datetime(opened_at,'unixepoch') AS opened_at,
       datetime(closed_at,'unixepoch') AS closed_at
  FROM tranches
 WHERE status IN ('open','accepted')
 ORDER BY opened_at DESC;

-- 8c) OPERATIONAL: recent run closeouts (last 5) -------------------------
SELECT '===== recent run closeouts =====' AS section;
SELECT r.run_id, r.sequence_no, r.run_title, r.status,
       datetime(r.closed_at,'unixepoch') AS closed_at,
       COALESCE(t.tranche_name,'') AS tranche,
       r.boundary_decision
  FROM runs r
  LEFT JOIN tranches t ON t.id = r.tranche_id
 WHERE r.status IN ('closed_accepted','closed_rejected','stopped')
 ORDER BY COALESCE(r.closed_at, r.opened_at) DESC
 LIMIT 5;

-- 8d) OPERATIONAL: deferred items ----------------------------------------
SELECT '===== deferred items =====' AS section;
SELECT oe.event_type,
       datetime(oe.happened_at,'unixepoch') AS happened_at,
       COALESCE(t.tranche_name,'') AS tranche,
       oe.details,
       oe.next_action
  FROM orchestration_events oe
  LEFT JOIN tranches t ON t.id = oe.tranche_id
 WHERE oe.event_type = 'tranche_boundary_set'
    OR LOWER(oe.details) LIKE '%deferred%'
    OR LOWER(oe.details) LIKE '%next tranche%'
    OR LOWER(oe.details) LIKE '%integrated send%'
    OR LOWER(oe.next_action) LIKE '%deferred%'
    OR LOWER(oe.next_action) LIKE '%next tranche%'
    OR LOWER(oe.next_action) LIKE '%integrated send%'
 ORDER BY oe.happened_at DESC
 LIMIT 20;

-- 8) Recent adopted decisions -------------------------------------------
-- Schema CHECK allows 'proposed','active','superseded','invalidated',
-- 'rejected','archived'. 'accepted' is kept for forward compatibility.
SELECT '===== recent adopted decisions =====' AS section;
SELECT d.id AS decision_id,
       d.title,
       d.summary,
       d.rationale,
       d.consequences,
       d.status,
       datetime(COALESCE(d.decided_at, d.updated_at),'unixepoch') AS decided_at
  FROM decisions d
 WHERE d.status IN ('active','accepted')
 ORDER BY COALESCE(d.decided_at, d.updated_at) DESC, d.id DESC
 LIMIT 7;

-- 9) Current baseline: active fact|status|rule claims 'about' a
--    system|project entity ------------------------------------------------
SELECT '===== current baseline =====' AS section;
SELECT c.claim_type,
       c.statement,
       e.display_name AS entity,
       e.entity_type,
       c.confidence,
       datetime(c.recorded_at,'unixepoch') AS recorded_at
  FROM claims c
  JOIN relations r
    ON r.source_object_id = c.object_id
   AND r.relation = 'about'
   AND r.status = 'active'
  JOIN entities e
    ON e.object_id = r.target_object_id
 WHERE c.status = 'active'
   AND c.claim_type IN ('fact','status','rule')
   AND e.entity_type IN ('system','project')
 ORDER BY c.recorded_at DESC, c.id DESC;

-- 10) Deferred / next candidates (status-claims + proposed decisions) ----
SELECT '===== deferred / next candidates (status-claims) =====' AS section;
SELECT statement,
       confidence,
       datetime(recorded_at,'unixepoch') AS recorded_at
  FROM claims
 WHERE status = 'active'
   AND claim_type = 'status'
   AND (statement LIKE '%deferred%'
        OR statement LIKE '%next tranche%'
        OR statement LIKE '%next phase%'
        OR statement LIKE '%next candidate%')
 ORDER BY recorded_at DESC;

SELECT '===== deferred / next candidates (proposed decisions) =====' AS section;
SELECT id AS decision_id,
       title,
       summary,
       rationale,
       consequences,
       datetime(COALESCE(decided_at, updated_at),'unixepoch') AS decided_at
  FROM decisions
 WHERE status = 'proposed'
 ORDER BY COALESCE(decided_at, updated_at) DESC, id DESC;

-- 11) Recent blockers: active risk-claims in the last 14 days ------------
SELECT '===== recent blockers (14d) =====' AS section;
SELECT statement,
       confidence,
       datetime(recorded_at,'unixepoch') AS recorded_at
  FROM claims
 WHERE status = 'active'
   AND claim_type = 'risk'
   AND recorded_at >= unixepoch('now','-14 days')
 ORDER BY recorded_at DESC;

-- 12) Canonical generated views (project_overview, current_state) --------
SELECT '===== project_overview =====' AS section;
SELECT body FROM generated_views WHERE view_name = 'project_overview';

SELECT '===== current_state =====' AS section;
SELECT body FROM generated_views WHERE view_name = 'current_state';
