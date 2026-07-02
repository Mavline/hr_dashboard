# object_type reference

Every row in a structured table has a matching `objects` row whose `object_type` is one of the values below. This is the discriminator used by `index_docs` and the type filter for `recall`.

## policy

`policies`. Binding rules for the repository. High-privilege — only write on explicit direction. Terminology in summaries must match `CLAUDE.md` wording (`ACCEPTED`, `ACCEPTED with N non-blocking notes`, etc.).

## decision

`decisions`. Architectural or design decisions that shape multiple future tasks. Includes rationale and consequences for auditability.

## claim

`claims`. Narrower facts attached to entities: gotchas, risks, observations, facts, requirements, constraints, assumptions, rules, status.

## task

`tasks`. Generic work items. Distinct from `workflow_task`: `tasks` are not part of the orchestration `WF-<N>` sequence (e.g. "investigate customer report", "write migration note").

## event

`events`. Temporal facts: change, incident, migration, release, discovery, bug, fix, meeting, note, decision_event, task_event. Bug/fix events are how to record "we hit this trap on X, fixed it with Y" as a timeline item (complementary to a `claim(gotcha)`).

## entity

`entities`. Canonical nouns: project, system, module, service, component, process, integration, database, tool, concept, workflow, external_system, person_role, unknown.

## tranche

`tranches`. Named work envelopes defined in `memory-bank/productContext.md` / `_orchestrator.md`. A run belongs to at most one tranche; a tranche's `status` gates forward progress.

## run

`runs`. Canonical execution container `run-<NNN>_<YYYY-MM-DD>`. One or more WFs per run.

## workflow_task

`workflow_tasks`. `WF-<N>`. The atomic packet-scoped task. All orchestration events attach to one WF.

## orchestration_event

`orchestration_events`. Timeline primitive emitted on every meaningful transition (assignment, kickoff, checkpoint, review_launch, review_result, task_completion, run_open, run_closeout, tranche_boundary_set, etc.). The primary audit trail. Every write helper emits at least one.

## review_gate

`review_gates`. A single review pass on a single WF by a single reviewer. Referenced by `review_type` and `verdict`; the `ACCEPTED with N non-blocking notes` terminology maps to `verdict='findings'` with `findings_count=N` and an explicit "non-blocking" qualifier in `findings_summary`.

## view

`generated_views`. Pre-rendered prose projections (`project_overview`, `current_state`, `open_tasks`, `known_gotchas`, `orchestration_timeline`, `timeline_index`, `entity_index`, `review_gate_status`, `stale_or_conflicting_items`, `open_runs_with_tasks`, `active_policies`, `active_decisions`). Consumed during `session-context` and can be re-queried directly.

## chunk

`chunks`. Raw textual slices of source docs (CLAUDE.md, memory-bank/*, run INDEX files, task packets, etc.). Read-only for the skill; owned by the migration pipeline. Referenced by `primary_evidence_chunk_id` across claims, decisions, tasks, events.
