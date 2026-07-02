# insert_relation / write-relation (write path)

Typed edges between two `objects`. Used to wire decisions → policies, claims → entities, runs → tranches, events → WFs, etc.

## Inputs

- `--source <object_id>` — originating object.
- `--target <object_id>` — target object.
- `--relation` — one of `about`, `mentions`, `evidence_for`, `relates_to`, `parent_of`, `depends_on`, `blocks`, `solves`, `caused_by`, `supersedes`, `invalidates`, `implements`, `changes`, `documents`, `contradicts`.
- `--evidence-chunk <object_id>` — optional; points to a `chunks.object_id` supplying textual provenance.
- `--confidence` — float 0.0..1.0 (default 1.0).

## Effect

`INSERT OR IGNORE INTO relations(source_object_id, relation, target_object_id, confidence, evidence_chunk_id, status='active', created_at=now)`.

The unique key is `(source_object_id, relation, target_object_id)`. Re-inserts are silently ignored.

## Constraint

Self-edges are allowed only for `relates_to` and `mentions` (enforced by CHECK). For everything else, `source != target`.

## Common patterns

- Supersede a policy:
  `write-relation --relation supersedes --source <new_policy_obj_id> --target <old_policy_obj_id>`
- Evidence for a claim:
  `write-relation --relation evidence_for --source <claim_obj_id> --target <chunk_obj_id> --evidence-chunk <chunk_obj_id>`
- Run belongs to tranche:
  `write-relation --relation parent_of --source <tranche_obj_id> --target <run_obj_id>`
- WF blocks another WF:
  `write-relation --relation blocks --source <wfA_obj_id> --target <wfB_obj_id>` (for stronger typing also insert a row into `workflow_dependencies`).
- Bug caused by a decision:
  `write-relation --relation caused_by --source <event_bug_obj_id> --target <decision_obj_id>`

## When to use

Whenever a write would otherwise leave a fact isolated. Relations are cheap (no embedding call), and they massively improve graph traversal in later recalls.
