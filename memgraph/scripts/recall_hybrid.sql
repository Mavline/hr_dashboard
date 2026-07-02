-- recall_hybrid.sql
--
-- Reciprocal Rank Fusion over sqlite-vec (FLOAT[512]) and FTS5 (memory_fts).
-- Parameters (must be pre-bound):
--   :query_embedding  — JSON string '[0.1, -0.2, ...]' of exactly 512 floats
--   :fts_query        — FTS5 MATCH string, already tokenized/escaped
--   :vec_k            — integer; sqlite-vec requires an explicit k for the
--                        KNN MATCH. Pass a value large enough to cover the
--                        whole memory_vec row count when you want "all".
--
-- The python entrypoint `memgraph.py recall` does the tokenization, calls
-- embed.py for :query_embedding, and runs this template. Prefer that.
--
-- If you run this file standalone: first load sqlite-vec
--   .load /path/to/vec0.dylib
-- and bind parameters via sqlite3's `-param` flag or `.param set`.

WITH vec_leg AS (
    SELECT rowid AS object_id,
           distance,
           ROW_NUMBER() OVER (ORDER BY distance) AS r
      FROM memory_vec
     WHERE embedding MATCH vec_f32(:query_embedding)
       AND k = :vec_k
),
fts_leg AS (
    SELECT rowid AS object_id,
           rank,
           ROW_NUMBER() OVER (ORDER BY rank) AS r
      FROM memory_fts
     WHERE memory_fts MATCH :fts_query
),
fused AS (
    SELECT object_id, SUM(rrf) AS score
      FROM (
          SELECT object_id, 1.0 / (60.0 + r) AS rrf FROM vec_leg
          UNION ALL
          SELECT object_id, 1.0 / (60.0 + r) AS rrf FROM fts_leg
      )
     GROUP BY object_id
)
SELECT d.object_id,
       d.object_type,
       d.title,
       d.summary,
       d.tags,
       f.score
  FROM fused f
  JOIN index_docs d USING (object_id)
 ORDER BY f.score DESC;
