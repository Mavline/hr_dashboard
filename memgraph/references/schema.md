# memory-graph schema cheat-sheet

Compact reference for the tables touched by the skill. Authoritative source is `.agent/memory.db` itself (`sqlite_master`); this doc stays in sync with the migration's post-verify state.

## Polymorphic key

```
objects (
  id INTEGER PK,
  object_type TEXT CHECK ∈ {chunk, entity, claim, decision, task, event, view,
                             policy, tranche, run, workflow_task,
                             orchestration_event, review_gate},
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
)
```

Every row in a structured table has exactly one `object_id` matching an `objects.id` with the right `object_type`. `ON DELETE CASCADE` from `objects` removes the structured row, its `index_docs`, its `memory_vec` row, and its `embedding_meta`.

## Structured tables (writer surface)

```
policies(object_id, policy_name, effective_from, source_file, status∈{active,locked,retired,superseded},
         policy_text, scope∈{repo,orchestration,execution,review,memory,git,other},
         retires_policy_id?, retired_at?, retirement_reason, created_at, updated_at)
         UNIQUE(source_file, effective_from, policy_name)

runs(object_id, run_id UNIQUE, sequence_no UNIQUE, run_date, run_title, tranche_id?,
     opened_at, closed_at?, status∈{planned,open,in_progress,awaiting_review,
     closed_accepted,closed_rejected,stopped,paused}, boundary_decision)

tranches(object_id, tranche_name UNIQUE, milestone, phase, scope, deferred_to_next,
         opened_at, closed_at?, status∈{planned,open,closed,accepted,stopped})

workflow_tasks(object_id, wf_id UNIQUE, sequence_no UNIQUE, run_id?, agent_role,
               packet_path, title,
               status∈<long enum — see CHECK in DDL>,
               opened_at?, completed_at?,
               owned_files_json JSON-array, forbidden_paths_json JSON-array,
               acceptance_criteria, validation_commands, discovered_only_in_agent_log)

workflow_dependencies(task_id, depends_on_task_id,
                      dependency_type∈{blocks,review_of,remediation_of,
                                       parallel_with,depends_on},
                      created_at, PK composite)

tasks(object_id, entity_object_id?, title, summary,
      status∈{open,in_progress,blocked,done,cancelled,archived},
      priority∈{low,normal,high,critical},
      opened_at?, closed_at?, due_at?, primary_evidence_chunk_id?,
      created_at, updated_at)

entities(object_id, entity_type∈<14 types>, canonical_name, display_name,
         aliases_json JSON-array, summary, status∈{active,deprecated,removed,unknown},
         first_seen_at?, last_seen_at?, created_at, updated_at)
         UNIQUE(entity_type, canonical_name)

claims(object_id, entity_object_id?, claim_type∈{fact,requirement,constraint,
       assumption,rule,observation,gotcha,risk,status},
       statement, normalized_statement,
       status∈{active,superseded,invalidated,uncertain,archived},
       confidence 0..1, valid_from?, valid_until?, recorded_at,
       primary_evidence_chunk_id?, created_at, updated_at)

decisions(object_id, title, summary, decision_text, rationale, consequences,
          status∈{proposed,active,superseded,invalidated,rejected,archived},
          decided_at?, valid_from?, valid_until?, primary_evidence_chunk_id?,
          created_at, updated_at)

events(object_id, entity_object_id?, event_type∈{change,incident,migration,release,
       discovery,bug,fix,meeting,note,decision_event,task_event},
       title, summary, happened_at, primary_evidence_chunk_id?, created_at)

relations(id, source_object_id, relation∈<15 relations>, target_object_id,
          confidence, evidence_chunk_id?, status∈{active,retracted},
          created_at, retracted_at?)
          UNIQUE(source, relation, target)

review_gates(object_id, task_id, review_type∈<6 types>,
             verdict∈{pending,pass,fail,findings,accepted,rejected},
             findings_count, findings_summary, reviewed_at?, reviewer_agent?, created_at)

orchestration_events(object_id, event_type∈<~35 types>, happened_at, run_id?, task_id?,
                     tranche_id?, agent_role?, previous_pushed_sha?, details, next_action,
                     source_file, source_line, source_primary, duplicate_of_event_id?)

generated_views(object_id, view_name UNIQUE, title, body, generated_at, source_query)
```

## Indexing surface (read surface)

```
index_docs(object_id PK, object_type, title, summary, body, tags, aliases,
           embedding_text, embedding_text_hash, indexed_at)

memory_fts — FTS5 virtual table over index_docs (content=index_docs, content_rowid=object_id,
             tokenize="unicode61 remove_diacritics 2").
             columns indexed: title, summary, body, tags, aliases

memory_vec — vec0 virtual table: CREATE VIRTUAL TABLE memory_vec USING vec0(embedding FLOAT[512]);
             rowid MUST equal objects.id.

embedding_meta(object_id PK, embedding_text_hash, model, dimensions, embedded_at)
```

## Raw layer (do not write to)

`chunks`, `sources`, `migration_log`, `extraction_cache`. Owned by the migration pipeline.

## `meta` key/value pairs relevant to the skill

```
schema_version           = 1
storage                  = sqlite-memory-graph
embedding_provider       = openai
embedding_model          = text-embedding-3-small
embedding_dimensions     = 512
sqlite_vec_version       = 0.1.6
fts                      = enabled
vector_index             = enabled
```

Never override these. If a migration rebuilds with different values, re-embedding every row is required.
