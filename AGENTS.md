# Agent Operating Instructions

FIRST RULE: operational state, work progress, evidence, blockers, review
verdicts, status, handoffs, gotchas, and run memory live only in
`.agent/memory.db` through `memgraph`. Do not write operational state into
specs, PRDs, control docs, role files, or `.agent/tasks/<TASK_ID>/spec.md`; the
task spec is only the initial frozen plan before coder handoff.

CLAUDE_POINTER_RULE: `CLAUDE.md` is not a duplicate runtime prompt. It must
contain exactly one line: `@AGENTS.md`. `AGENTS.md` is the canonical editable
agent instruction file. When these instructions change, update `AGENTS.md`
only.

COLLABORATION RULE: when more than one agent works the project, fix the
lead/reviewer and orchestrator/executor lanes explicitly and keep the tool
boundary asymmetric if the setup requires it. Coordination that the user has
not delegated to direct agent-to-agent calls passes through the user as concise
assignments, corrections, reviews, or next-step instructions. No agent kills or
manages another agent's processes unless the user explicitly asks.

FLOW CODE RULE: all new task titles, task specs, handoffs, closeouts, reviews,
blockers, reports, and next-step instructions use a single human-readable
`[wf-code=####]` as the only workflow identifier. The code is assigned by the
user's instruction, the handoff, or the lane's own sequence; it is never
derived from memgraph numeric workflow IDs, run IDs, object IDs, or other DB
numbers. The project may define its own prefix semantics (for example platform
work `1###`, content/spec work `2###`). If a DB tool emits numeric identifiers
while handling `[wf-code=####]`, keep them internal and continue using only
`[wf-code=####]`.

Status: project-agnostic runtime instructions. Project-specific product,
architecture, content, platform, business rules, and roadmap belong in the
repository source documents (`docs/spec.md` and approved additional documents),
not in these runtime prompt files. Until the user provides the main concept,
missing product/spec docs are `UNKNOWN`, not permission to invent them.

DOCUMENTATION DISCIPLINE: do not create sidecar planning, note, scratch,
status, evidence, blocker, or "analysis" files just to preserve working
context. Working context and operational memory go to `.agent/memory.db`
through `memgraph`. Durable product decisions are consolidated into the
canonical source document `docs/spec.md`, unless the user explicitly approves a
separate source document; an approved separate document must be linked from
`docs/spec.md` with a one-line reason. Otherwise consolidate or delete the
sidecar before commit.

MEMORY WRITE CADENCE: write to `.agent/memory.db` through `memgraph` DURING the
work, not as a closing summary. Each time, citing concrete evidence (file path,
command + exit code, log line, source reference), record at: run start/resume;
after any verification, observation, or experiment (`write-claim`); on a
non-trivial decision or pivot, or when a prior finding is overturned
(`write-decision` with what it supersedes); on a trap or gotcha
(`write-claim --type gotcha|risk`); on a source conflict; before any handoff,
self-review, or closeout; and on every `wf-status` transition. A turn that
produced a finding, a verdict, or a pivot but wrote nothing to memgraph is
incomplete; deferring all writes to the end is a violation. `recall` is hybrid
(semantic + keyword) — query by meaning, and never treat a keyword miss as proof
that nothing was recorded.

STRATEGIC-DOCUMENT DISCIPLINE: durable system knowledge is split across the
approved strategic documents, never dumped into one rolling file. `docs/spec.md`
is the single clean current map; a topic that outgrows a section gets its own
approved document, linked from `docs/spec.md`; using the documents that already
exist is mandatory. Never delete or overwrite a past finding to tidy up: mark an
overturned fact in place `[SUPERSEDED <UTC date>: why]`, send the displaced
reasoning to memgraph, and append a one-line dated entry to the document's
revision log. A decomposition or plan document is a living deliverable, updated
the same turn a node is resolved — not a write-once file.

## Startup Discipline

Before non-trivial work:

1. Run `git status --short --branch`.
2. If `.agent/memory.db` exists, run `memgraph session-context`.
3. Read the source documents that exist, in source-hierarchy order.
4. Classify the lane, branch, worktree, open task/run records, dirty files,
   owned files, forbidden files, and the next safe action.

Navigation documents do not override the source hierarchy.

## Continuation Discipline

If the project is not complete and no active task remains, do not end with a
passive status-only response. State the next safe options for continuation,
ordered by practical priority, and identify which option can start immediately.

Every readiness, status, blocker, or "not complete" report must include the
next executable step or concrete handoff prompt in the same response. A
status-only answer is invalid unless the project is complete or a real blocker
prevents any next action.

After any analysis, review, or completed stage, do not wait for the user to ask
"what next?". End with one of: the next action already being taken; a concrete
ready-to-forward assignment for the correct executor; or the shortest specific
question truly required to unblock. If a minor correction or hygiene fix is safe
to do directly, do it instead of turning it into a handoff.

Do not leave tails: when a logical task changes files, memory records, or
generated assets, finish the loop in the same turn by verifying, recording the
result, removing superseded clutter, committing, pushing, and naming the next
concrete action. If a real blocker prevents that, report the blocker and the
exact remaining command or prerequisite.

## Source Hierarchy

Use this order:

1. User's latest explicit instruction.
2. `docs/spec.md`.
3. Approved additional strategic documents, in their declared order.
4. `AGENTS.md`.
5. Frozen `.agent/tasks/<TASK_ID>/spec.md`.
6. Memgraph recall as supporting context only.

If sources conflict, record the conflict in `.agent/memory.db` and stop unless
a higher-priority source resolves it.

## No Guessing

Do not invent values, routes, schemas, tests, roles, keys, product decisions,
option names, command flags, output paths, package behavior, DB columns, API
signatures, site purpose, or business claims.

Concrete technical claims are binding only when verified in the current session
by one of: a repository file read now; installed source or types read now; a
command run now with stdout/stderr and exit code; official documentation
fetched now. Memory, prior chat, old plans, examples, and model knowledge are
not verification. Missing evidence is `UNKNOWN` or a blocker. `UNKNOWN` blocks
approval.

High-risk work needs feasibility proof before freeze: build pipeline, runtime
adapter, deployment target, package resolution, external runtime, data access,
DB connectivity, storage, auth, cron/scheduler, and generated-output paths.
Paper plans are not proof. If two planned cycles are coupled, stop and supersede
the plan before opening more implementation work.

## Role Cycle

For every non-trivial logical task:

```txt
orchestrator -> task-spec-freezer -> coder -> integration test runner ->
fresh reviewer -> fixer if needed -> impacted tests -> fresh reviewer ->
logical reviewer-lead
```

The cycle ends only on blocker or completion of the declared logical block
after required verification, review, memgraph status, and commit/push when
tracked files changed. Do not stop after a role stage, command, micro-step, or
routine next action. Stop only for a real blocker: missing product decision,
missing secret, destructive/out-of-scope approval, unresolved source conflict,
missing runtime role, or unprovable high-risk boundary.

## Role Boundaries

- Orchestrator: reads sources, opens/closes memgraph task/run records, creates
  the initial frozen spec, classifies lanes and blockers.
- Task-spec-freezer: writes only the task spec before coder handoff.
- Coder/builder: edits only owned implementation files listed in the frozen
  spec.
- Test-runner/verifier: read-only for repo files; records evidence in memgraph.
- Reviewer: fresh context; read-only; assigns only `PASS`, `FAIL`, or
  `UNKNOWN`.
- Fixer: edits only directly affected owned files needed to resolve recorded
  findings, then stops for independent tests.
- Logical reviewer-lead: read-only final reasoning check and memgraph status.

No role may normalize a role-boundary violation into `PASS`. The builder must
not collect or package reviewer evidence. Fixer sanity checks do not replace
independent impacted tests.

## Memory And Evidence

Use repo-local memory through the memgraph wrapper only. Never edit
`.agent/memory.db` manually. Commit `.agent/memory.db` as the canonical portable
project memory; under `.agent/tasks/` commit only `<TASK_ID>/spec.md`.

Allowed `.agent/` layout:

```txt
.agent/
  memory.db
  tasks/<TASK_ID>/spec.md
```

Do not create markdown/json handoff, evidence, verdict, blocker, review,
lead-review, memory snapshot, or raw-output files under `.agent/`.

Evidence must cite concrete proof: file paths, commands, exit codes, output
summaries, HTTP traces, SQL smoke results, browser checks when relevant, and
the active `[wf-code=####]`. For mutating or generated commands, record
`git status --short` before and after.

## Memgraph Output Hygiene

Never stream raw memgraph stdout/stderr into the transcript. Raw output may
contain service DB identifiers, field names, handles, or diagnostics that are
not valid authored text. Use a sanitized wrapper when available, or redirect
raw output to a private sink and print only `[wf-code=####] <operation>:
ok|FAIL`.

## Git Discipline

Assume dirty work may belong to the user or another lane. Do not revert or
overwrite changes you did not make. Classify dirty files before editing. Use
destructive git commands only when the user explicitly asks for that exact
operation. Keep unrelated changes out of commits.

Commit and push are part of done: after every completed logical change with
repository changes, stage only the intended files, commit them, and push in the
same turn. Do not leave completed work local-only unless a real blocker exists
(missing remote access, failed required verification, unresolved ownership
conflict, or an explicit latest user instruction not to push).

## Runtime And Infrastructure

Do not start, stop, install, pull, bootstrap, deploy, tunnel, or bind
long-running services unless the user's latest instruction or tracked control
docs explicitly authorize that exact action. Read-only detection is allowed and
does not grant permission to start missing infrastructure. If a required
environment is absent, record `UNKNOWN/BLOCKER` with the exact prerequisite.

## Review Standard

Reviewer verdicts are only `PASS`, `FAIL`, or `UNKNOWN`. Missing evidence is
`UNKNOWN`. Code inspection alone cannot prove runtime, build, HTTP, DB, storage,
browser, or deployment behavior when the acceptance criterion requires those
boundaries. Before claiming completion, rerun the required verification and
report the commands, exit codes, changed files, active `[wf-code=####]`,
skipped/unknown checks, and residual risk.
