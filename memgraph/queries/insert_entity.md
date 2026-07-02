# insert_entity / write-entity / alias-entity (write path)

Entities are canonical nouns in the project graph: services, modules, external systems, databases, tools, concepts, workflows, roles.

## write-entity

Create a new entity or return the existing one (idempotent on `(entity_type, canonical_name)`).

Inputs:

- `--type` — one of `project`, `system`, `module`, `service`, `component`, `process`, `integration`, `database`, `tool`, `concept`, `workflow`, `external_system`, `person_role`, `unknown`.
- `--name` — `canonical_name` (unique per `entity_type`). Lowercase, no spaces, dot-separated for modules (`backend.api.operations`).
- `--display` — human display name (defaults to `--name`).
- `--aliases '["alt1","alt2"]'` — JSON array of lowercase aliases.
- `--summary` — ≤400 chars description.

Effect: insert `objects + entities + index_docs + memory_vec + embedding_meta`. If the row already exists, return its ids without a write (no embedding call).

## alias-entity

Add aliases to an existing entity and re-embed.

Inputs:

- `--canonical` — existing `canonical_name`.
- `--add '["new-alias-1","new-alias-2"]'` — aliases to merge into `aliases_json`.

Effect:

1. Load current `aliases_json`.
2. Union with `--add`, sort, de-dup.
3. If set is unchanged, return `{"changed": false}` with no embedding call.
4. Otherwise: `UPDATE entities SET aliases_json=?, updated_at=now, last_seen_at=now` + re-materialize `index_docs + memory_vec + embedding_meta` with updated `embedding_text`.

## When to write

- New service/module/external system you are about to reference.
- A new alias someone in the user message used that is not yet in `aliases_json` (agents must recognize it in future sessions).
- A rename: create the new canonical entity, then `write-relation --relation supersedes --source <new_obj_id> --target <old_obj_id>`.
