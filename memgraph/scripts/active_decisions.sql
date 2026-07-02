-- active_decisions.sql
-- Active architecture decisions, most recently decided first.

SELECT d.id,
       d.title,
       d.summary,
       datetime(d.decided_at, 'unixepoch') AS decided_at,
       datetime(d.valid_from, 'unixepoch') AS valid_from,
       datetime(d.valid_until, 'unixepoch') AS valid_until,
       d.decision_text,
       d.rationale,
       d.consequences
  FROM decisions d
 WHERE d.status = 'active'
 ORDER BY d.decided_at DESC, d.id DESC;
