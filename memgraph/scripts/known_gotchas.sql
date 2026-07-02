-- known_gotchas.sql
-- Active claims of type gotcha/risk/observation, optionally filtered by entity.
--
-- Parameters (optional):
--   :entity_name   — canonical_name of an entity; pass '' or NULL for all.

SELECT c.id,
       c.claim_type,
       c.statement,
       c.confidence,
       e.canonical_name AS entity,
       datetime(c.recorded_at, 'unixepoch') AS recorded_at
  FROM claims c
  LEFT JOIN entities e ON e.object_id = c.entity_object_id
 WHERE c.status = 'active'
   AND c.claim_type IN ('gotcha', 'risk', 'observation', 'constraint')
   AND (COALESCE(:entity_name, '') = '' OR e.canonical_name = :entity_name)
 ORDER BY c.recorded_at DESC;
