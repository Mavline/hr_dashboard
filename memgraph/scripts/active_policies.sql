-- active_policies.sql
-- All currently in-force policies (active or locked), newest first.
-- Pure SQL, no embedding.

SELECT p.id,
       p.policy_name,
       p.scope,
       p.status,
       datetime(p.effective_from, 'unixepoch') AS effective_from,
       p.source_file,
       p.policy_text
  FROM policies p
 WHERE p.status IN ('active', 'locked')
 ORDER BY p.effective_from DESC, p.id DESC;
