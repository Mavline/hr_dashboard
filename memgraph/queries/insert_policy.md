# insert_policy / write-policy (write path)

Adds a new policy row, optionally superseding an older one.

## Guardrails

- Only invoke on explicit user direction or on an accepted tranche-level decision.
- Policies are the highest-privilege memory objects. Do not use this command to capture transient rules — use `write-claim --type rule` instead.

## Inputs

- `--name` — `policies.policy_name`, unique per `(source_file, effective_from, policy_name)`.
- `--scope` — `repo`, `orchestration`, `execution`, `review`, `memory`, `git`, or `other`.
- `--status` — `active` (default), `locked`, `retired`, `superseded`.
- `--effective-from` — epoch seconds; defaults to `now`.
- `--source-file` — the repo-relative file where the policy is defined (e.g. `CLAUDE.md`, `AGENTS.md`, `memory-bank/agents/README.md`).
- `--text` — the full policy text.
- `--retires <policy_id>` — optional; marks the target policy as `superseded` with `retired_at=now` and `retirement_reason=<supplied or default>`.
- `--retirement-reason` — override the default reason string.

## Effect

1. `BEGIN IMMEDIATE`.
2. Insert `objects(object_type='policy')` + `policies(...)`.
3. If `--retires`: `UPDATE policies SET status='superseded', retired_at=now, retirement_reason=? WHERE id=?`.
4. Materialize `index_docs + memory_vec + embedding_meta` with:
   ```
   Policy: <name>
   Scope: <scope>
   Status: <status>
   Text: <full text>
   ```
5. `COMMIT`.

## Post-conditions

- `session_context` on the next session shows the new policy at the top.
- The retired policy still appears in recall (and the `relations` table can carry a `supersedes` edge — add via `write-relation --relation supersedes --source <new> --target <old>`).
