-- entity_by_name.sql
-- Locate an entity by canonical_name OR by any alias.
--
-- Parameter:
--   :name   — string, case-insensitive match against canonical_name or aliases_json[*]

SELECT e.id,
       e.object_id,
       e.entity_type,
       e.canonical_name,
       e.display_name,
       e.aliases_json,
       e.status,
       e.summary,
       datetime(e.first_seen_at, 'unixepoch') AS first_seen_at,
       datetime(e.last_seen_at,  'unixepoch') AS last_seen_at
  FROM entities e
 WHERE LOWER(e.canonical_name) = LOWER(:name)
    OR EXISTS (
         SELECT 1 FROM json_each(e.aliases_json)
         WHERE LOWER(value) = LOWER(:name)
       );
