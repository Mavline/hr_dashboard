-- next_run_id.sql
-- Emit the next monotonic run sequence_no and a skeletal run_id (run-<NNN>_<YYYY-MM-DD>).
-- Pure SQL, no embedding. The date is formatted from sqlite's current UTC time,
-- which is authoritative for the skill.

SELECT next_sequence_no,
       printf('run-%03d_%s', next_sequence_no, run_date) AS next_run_id,
       run_date
  FROM (
      SELECT COALESCE(MAX(sequence_no), 0) + 1 AS next_sequence_no,
             strftime('%Y-%m-%d', 'now') AS run_date
        FROM runs
  );
