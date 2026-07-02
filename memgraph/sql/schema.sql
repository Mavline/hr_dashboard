-- memgraph-memory: SQLite schema v1
-- Source of truth: PRD-memory-migration v2 §7.
-- Tables: meta, migration_log, objects, sources, chunks,
--   policies, tranches, runs, workflow_tasks, workflow_dependencies,
--   orchestration_events, review_gates,
--   entities, claims, decisions, tasks, events, relations,
--   generated_views, index_docs,
--   memory_fts (FTS5), memory_vec (vec0),
--   embedding_meta, extraction_cache.
-- Apply via: sqlite3 .agent/memory.db.tmp < schema.sql
-- (sqlite-vec must be loaded BEFORE running schema.sql for memory_vec to work)

-- ===========================================================================
-- 7.1 PRAGMA
-- ===========================================================================
PRAGMA foreign_keys = ON;
PRAGMA journal_mode = WAL;
PRAGMA synchronous = NORMAL;
PRAGMA cache_size = -64000;
PRAGMA mmap_size = 268435456;
PRAGMA temp_store = MEMORY;
PRAGMA busy_timeout = 5000;

-- ===========================================================================
-- 7.2 Meta
-- ===========================================================================
CREATE TABLE meta (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

INSERT INTO meta(key, value) VALUES
  ('schema_version', '1'),
  ('storage', 'sqlite-memory-graph'),
  ('raw_layer', 'enabled'),
  ('operational_layer', 'enabled'),
  ('structured_layer', 'enabled'),
  ('fts', 'enabled'),
  ('vector_index', 'enabled'),
  ('embedding_provider', 'openai'),
  ('embedding_model', 'text-embedding-3-small'),
  ('embedding_dimensions', '512'),
  ('extraction_provider', 'openai'),
  ('extraction_model', 'gpt-4.1-mini'),
  ('sqlite_vec_version', 'pinned-at-install'),
  ('external_memory_service', 'disabled'),
  ('mcp_required', 'false');

-- ===========================================================================
-- 7.3 Migration log
-- ===========================================================================
CREATE TABLE migration_log (
  id INTEGER PRIMARY KEY,
  phase TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('start', 'progress', 'done', 'error', 'warning')),
  started_at INTEGER NOT NULL,
  finished_at INTEGER,
  counts_json TEXT,
  error_message TEXT,
  notes TEXT
);
CREATE INDEX idx_migration_log_phase ON migration_log(phase, status);

-- ===========================================================================
-- 7.4 Object registry
-- ===========================================================================
CREATE TABLE objects (
  id INTEGER PRIMARY KEY,
  object_type TEXT NOT NULL CHECK (
    object_type IN (
      'chunk', 'entity', 'claim', 'decision', 'task', 'event', 'view',
      'policy', 'tranche', 'run', 'workflow_task',
      'orchestration_event', 'review_gate'
    )
  ),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX idx_objects_type ON objects(object_type);

CREATE TRIGGER trg_objects_updated_at
AFTER UPDATE ON objects
FOR EACH ROW
WHEN NEW.updated_at = OLD.updated_at
BEGIN
  UPDATE objects SET updated_at = unixepoch() WHERE id = NEW.id;
END;

-- ===========================================================================
-- 7.5 Sources
-- ===========================================================================
CREATE TABLE sources (
  id INTEGER PRIMARY KEY,
  path TEXT NOT NULL UNIQUE,
  source_role TEXT NOT NULL,
  source_category TEXT NOT NULL CHECK (
    source_category IN (
      'project_doc',
      'policies',
      'ledger_canonical',
      'ledger_per_agent',
      'run_index',
      'task_packet',
      'other'
    )
  ),
  content_hash TEXT NOT NULL,
  imported_at INTEGER NOT NULL
);

-- ===========================================================================
-- 7.6 Raw chunks
-- ===========================================================================
CREATE TABLE chunks (
  id INTEGER PRIMARY KEY,
  object_id INTEGER NOT NULL UNIQUE REFERENCES objects(id) ON DELETE CASCADE,
  source_id INTEGER NOT NULL REFERENCES sources(id) ON DELETE CASCADE,
  heading_path TEXT NOT NULL DEFAULT '',
  body TEXT NOT NULL,
  chunk_order INTEGER NOT NULL,
  detected_date INTEGER,
  extraction_status TEXT NOT NULL DEFAULT 'pending' CHECK (
    extraction_status IN ('pending', 'extracted', 'fallback', 'ignored', 'parsed_structural', 'error')
  ),
  content_hash TEXT NOT NULL,
  imported_at INTEGER NOT NULL
);
CREATE INDEX idx_chunks_source_order ON chunks(source_id, chunk_order);
CREATE INDEX idx_chunks_extraction_status ON chunks(extraction_status);

-- ===========================================================================
-- 7.7 Policies (operational)
-- ===========================================================================
CREATE TABLE policies (
  id INTEGER PRIMARY KEY,
  object_id INTEGER NOT NULL UNIQUE REFERENCES objects(id) ON DELETE CASCADE,
  policy_name TEXT NOT NULL,
  effective_from INTEGER NOT NULL,
  source_file TEXT NOT NULL,
  status TEXT NOT NULL CHECK (
    status IN ('active', 'locked', 'retired', 'superseded')
  ),
  policy_text TEXT NOT NULL,
  scope TEXT NOT NULL CHECK (
    scope IN ('repo', 'orchestration', 'execution', 'review', 'memory', 'git', 'other')
  ),
  retires_policy_id INTEGER REFERENCES policies(id),
  retired_at INTEGER,
  retirement_reason TEXT DEFAULT '',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  UNIQUE(source_file, effective_from, policy_name)
);
CREATE INDEX idx_policies_status ON policies(status);
CREATE INDEX idx_policies_effective ON policies(effective_from);
CREATE INDEX idx_policies_scope ON policies(scope);

CREATE TRIGGER trg_policies_updated_at
AFTER UPDATE ON policies
FOR EACH ROW
WHEN NEW.updated_at = OLD.updated_at
BEGIN
  UPDATE policies SET updated_at = unixepoch() WHERE id = NEW.id;
END;

-- ===========================================================================
-- 7.8 Tranches (operational)
-- ===========================================================================
CREATE TABLE tranches (
  id INTEGER PRIMARY KEY,
  object_id INTEGER NOT NULL UNIQUE REFERENCES objects(id) ON DELETE CASCADE,
  tranche_name TEXT NOT NULL UNIQUE,
  milestone TEXT NOT NULL,
  phase TEXT NOT NULL,
  scope TEXT NOT NULL DEFAULT '',
  deferred_to_next TEXT NOT NULL DEFAULT '',
  opened_at INTEGER NOT NULL,
  closed_at INTEGER,
  status TEXT NOT NULL CHECK (
    status IN ('planned', 'open', 'closed', 'accepted', 'stopped')
  )
);
CREATE INDEX idx_tranches_milestone ON tranches(milestone, phase);
CREATE INDEX idx_tranches_status ON tranches(status);

-- ===========================================================================
-- 7.9 Runs (operational)
-- ===========================================================================
CREATE TABLE runs (
  id INTEGER PRIMARY KEY,
  object_id INTEGER NOT NULL UNIQUE REFERENCES objects(id) ON DELETE CASCADE,
  run_id TEXT NOT NULL UNIQUE,
  sequence_no INTEGER NOT NULL UNIQUE,
  run_date TEXT NOT NULL,
  run_title TEXT NOT NULL DEFAULT '',
  tranche_id INTEGER REFERENCES tranches(id),
  opened_at INTEGER NOT NULL,
  closed_at INTEGER,
  status TEXT NOT NULL CHECK (
    status IN (
      'planned', 'open', 'in_progress', 'awaiting_review',
      'closed_accepted', 'closed_rejected', 'stopped', 'paused'
    )
  ),
  boundary_decision TEXT NOT NULL DEFAULT ''
);
CREATE INDEX idx_runs_tranche ON runs(tranche_id);
CREATE INDEX idx_runs_status ON runs(status);
CREATE INDEX idx_runs_seq ON runs(sequence_no);

-- ===========================================================================
-- 7.10 Workflow tasks (operational)
-- ===========================================================================
CREATE TABLE workflow_tasks (
  id INTEGER PRIMARY KEY,
  object_id INTEGER NOT NULL UNIQUE REFERENCES objects(id) ON DELETE CASCADE,
  wf_id TEXT NOT NULL UNIQUE,
  sequence_no INTEGER NOT NULL UNIQUE,
  run_id INTEGER REFERENCES runs(id) ON DELETE RESTRICT,
  agent_role TEXT NOT NULL,
  packet_path TEXT NOT NULL DEFAULT '',
  title TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL CHECK (
    status IN (
      'planned', 'pending', 'queued', 'assigned', 'kickoff',
      'in_progress', 'awaiting_review', 'verification',
      'reviewed_with_findings', 'findings', 'blocked',
      'blocked_for_remediation', 'remediation',
      'done', 'done_with_findings', 'done_no_findings',
      'accepted', 'closed', 'published', 'cancelled',
      'stalled_no_artifact', 'paused', 'checkpoint',
      'rollout', 'reconciliation', 'implementation'
    )
  ),
  opened_at INTEGER,
  completed_at INTEGER,
  owned_files_json TEXT NOT NULL DEFAULT '[]'
    CHECK (json_valid(owned_files_json) AND json_type(owned_files_json) = 'array'),
  forbidden_paths_json TEXT NOT NULL DEFAULT '[]'
    CHECK (json_valid(forbidden_paths_json) AND json_type(forbidden_paths_json) = 'array'),
  acceptance_criteria TEXT NOT NULL DEFAULT '',
  validation_commands TEXT NOT NULL DEFAULT '',
  discovered_only_in_agent_log INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX idx_wf_run ON workflow_tasks(run_id);
CREATE INDEX idx_wf_agent ON workflow_tasks(agent_role, status);
CREATE INDEX idx_wf_seq ON workflow_tasks(sequence_no);
CREATE INDEX idx_wf_status ON workflow_tasks(status);

-- ===========================================================================
-- 7.11 Workflow dependencies (operational)
-- ===========================================================================
CREATE TABLE workflow_dependencies (
  task_id INTEGER NOT NULL REFERENCES workflow_tasks(id) ON DELETE CASCADE,
  depends_on_task_id INTEGER NOT NULL REFERENCES workflow_tasks(id) ON DELETE RESTRICT,
  dependency_type TEXT NOT NULL CHECK (
    dependency_type IN ('blocks', 'review_of', 'remediation_of', 'parallel_with', 'depends_on')
  ),
  created_at INTEGER NOT NULL,
  PRIMARY KEY (task_id, depends_on_task_id, dependency_type),
  CHECK (task_id != depends_on_task_id)
);
CREATE INDEX idx_wf_deps_target ON workflow_dependencies(depends_on_task_id);

-- ===========================================================================
-- 7.12 Orchestration events (operational)
-- ===========================================================================
CREATE TABLE orchestration_events (
  id INTEGER PRIMARY KEY,
  object_id INTEGER NOT NULL UNIQUE REFERENCES objects(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (
    event_type IN (
      'run_start', 'run_open', 'run_planned', 'run_opened',
      'run_accept', 'run_acceptance', 'run_closeout', 'closeout',
      'task_assignment', 'task_launch', 'task_kickoff',
      'checkpoint', 'task_completion', 'task_complete',
      'task_transition', 'task_relaunch',
      'claude_launch', 'execution_start',
      'review_gate', 'review_launch', 'review_result', 'review_rejection',
      'verification_complete', 'audit_complete', 'implementation_complete',
      'tranche_boundary_set', 'tranche_open', 'tranche_closed', 'tranche_stop',
      'policy_update', 'next_prompt_prepared',
      'wf_numbering_clarified', 'pause', 'cleanup'
    )
  ),
  happened_at INTEGER NOT NULL,
  run_id INTEGER REFERENCES runs(id),
  task_id INTEGER REFERENCES workflow_tasks(id),
  tranche_id INTEGER REFERENCES tranches(id),
  agent_role TEXT,
  previous_pushed_sha TEXT,
  details TEXT NOT NULL DEFAULT '',
  next_action TEXT NOT NULL DEFAULT '',
  source_file TEXT NOT NULL,
  source_line INTEGER NOT NULL,
  source_primary INTEGER NOT NULL DEFAULT 1,
  duplicate_of_event_id INTEGER REFERENCES orchestration_events(id)
);
CREATE INDEX idx_oe_run ON orchestration_events(run_id, happened_at);
CREATE INDEX idx_oe_task ON orchestration_events(task_id, happened_at);
CREATE INDEX idx_oe_type ON orchestration_events(event_type, happened_at);
CREATE INDEX idx_oe_sha ON orchestration_events(previous_pushed_sha)
  WHERE previous_pushed_sha IS NOT NULL;
CREATE INDEX idx_oe_primary ON orchestration_events(source_primary, happened_at);

-- ===========================================================================
-- 7.13 Review gates (operational)
-- ===========================================================================
CREATE TABLE review_gates (
  id INTEGER PRIMARY KEY,
  object_id INTEGER NOT NULL UNIQUE REFERENCES objects(id) ON DELETE CASCADE,
  task_id INTEGER NOT NULL REFERENCES workflow_tasks(id),
  review_type TEXT NOT NULL CHECK (
    review_type IN (
      'claude_reviewer', 'codex_code_review', 'codex_logic_review',
      'lead_review', 'regression_gate', 'application_logic_review'
    )
  ),
  verdict TEXT NOT NULL CHECK (
    verdict IN ('pending', 'pass', 'fail', 'findings', 'accepted', 'rejected')
  ),
  findings_count INTEGER NOT NULL DEFAULT 0,
  findings_summary TEXT NOT NULL DEFAULT '',
  reviewed_at INTEGER,
  reviewer_agent TEXT,
  created_at INTEGER NOT NULL
);
CREATE INDEX idx_review_task ON review_gates(task_id, review_type);
CREATE INDEX idx_review_verdict ON review_gates(verdict);

-- ===========================================================================
-- 7.14 Entities (knowledge)
-- ===========================================================================
CREATE TABLE entities (
  id INTEGER PRIMARY KEY,
  object_id INTEGER NOT NULL UNIQUE REFERENCES objects(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL CHECK (
    entity_type IN (
      'project', 'system', 'module', 'service', 'component',
      'process', 'integration', 'database', 'tool', 'concept',
      'workflow', 'external_system', 'person_role', 'unknown'
    )
  ),
  canonical_name TEXT NOT NULL,
  display_name TEXT NOT NULL,
  aliases_json TEXT NOT NULL DEFAULT '[]'
    CHECK (json_valid(aliases_json) AND json_type(aliases_json) = 'array'),
  summary TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'active' CHECK (
    status IN ('active', 'deprecated', 'removed', 'unknown')
  ),
  first_seen_at INTEGER,
  last_seen_at INTEGER,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  UNIQUE(entity_type, canonical_name)
);
CREATE INDEX idx_entities_type_status ON entities(entity_type, status);
CREATE INDEX idx_entities_name ON entities(canonical_name);

CREATE TRIGGER trg_entities_updated_at
AFTER UPDATE ON entities
FOR EACH ROW
WHEN NEW.updated_at = OLD.updated_at
BEGIN
  UPDATE entities SET updated_at = unixepoch() WHERE id = NEW.id;
END;

-- ===========================================================================
-- 7.15 Claims (knowledge)
-- ===========================================================================
CREATE TABLE claims (
  id INTEGER PRIMARY KEY,
  object_id INTEGER NOT NULL UNIQUE REFERENCES objects(id) ON DELETE CASCADE,
  entity_object_id INTEGER REFERENCES objects(id) ON DELETE SET NULL,
  claim_type TEXT NOT NULL CHECK (
    claim_type IN (
      'fact', 'requirement', 'constraint', 'assumption',
      'rule', 'observation', 'gotcha', 'risk', 'status'
    )
  ),
  statement TEXT NOT NULL,
  normalized_statement TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'active' CHECK (
    status IN ('active', 'superseded', 'invalidated', 'uncertain', 'archived')
  ),
  confidence REAL NOT NULL DEFAULT 0.8 CHECK (confidence >= 0.0 AND confidence <= 1.0),
  valid_from INTEGER,
  valid_until INTEGER,
  recorded_at INTEGER NOT NULL,
  primary_evidence_chunk_id INTEGER REFERENCES objects(id) ON DELETE SET NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX idx_claims_entity ON claims(entity_object_id);
CREATE INDEX idx_claims_type_status ON claims(claim_type, status);
CREATE INDEX idx_claims_temporal ON claims(valid_from, valid_until, recorded_at);

CREATE TRIGGER trg_claims_updated_at
AFTER UPDATE ON claims
FOR EACH ROW
WHEN NEW.updated_at = OLD.updated_at
BEGIN
  UPDATE claims SET updated_at = unixepoch() WHERE id = NEW.id;
END;

-- ===========================================================================
-- 7.16 Decisions (knowledge)
-- ===========================================================================
CREATE TABLE decisions (
  id INTEGER PRIMARY KEY,
  object_id INTEGER NOT NULL UNIQUE REFERENCES objects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  decision_text TEXT NOT NULL,
  rationale TEXT NOT NULL DEFAULT '',
  consequences TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'active' CHECK (
    status IN ('proposed', 'active', 'superseded', 'invalidated', 'rejected', 'archived')
  ),
  decided_at INTEGER,
  valid_from INTEGER,
  valid_until INTEGER,
  primary_evidence_chunk_id INTEGER REFERENCES objects(id) ON DELETE SET NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX idx_decisions_status ON decisions(status);
CREATE INDEX idx_decisions_temporal ON decisions(decided_at, valid_from, valid_until);

CREATE TRIGGER trg_decisions_updated_at
AFTER UPDATE ON decisions
FOR EACH ROW
WHEN NEW.updated_at = OLD.updated_at
BEGIN
  UPDATE decisions SET updated_at = unixepoch() WHERE id = NEW.id;
END;

-- ===========================================================================
-- 7.17 Tasks (knowledge - non-WF)
-- ===========================================================================
CREATE TABLE tasks (
  id INTEGER PRIMARY KEY,
  object_id INTEGER NOT NULL UNIQUE REFERENCES objects(id) ON DELETE CASCADE,
  entity_object_id INTEGER REFERENCES objects(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  summary TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL CHECK (
    status IN ('open', 'in_progress', 'blocked', 'done', 'cancelled', 'archived')
  ),
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (
    priority IN ('low', 'normal', 'high', 'critical')
  ),
  opened_at INTEGER,
  closed_at INTEGER,
  due_at INTEGER,
  primary_evidence_chunk_id INTEGER REFERENCES objects(id) ON DELETE SET NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX idx_tasks_status_priority ON tasks(status, priority);
CREATE INDEX idx_tasks_entity ON tasks(entity_object_id);
CREATE INDEX idx_tasks_temporal ON tasks(opened_at, closed_at, due_at);

CREATE TRIGGER trg_tasks_updated_at
AFTER UPDATE ON tasks
FOR EACH ROW
WHEN NEW.updated_at = OLD.updated_at
BEGIN
  UPDATE tasks SET updated_at = unixepoch() WHERE id = NEW.id;
END;

-- ===========================================================================
-- 7.18 Events (knowledge)
-- ===========================================================================
CREATE TABLE events (
  id INTEGER PRIMARY KEY,
  object_id INTEGER NOT NULL UNIQUE REFERENCES objects(id) ON DELETE CASCADE,
  entity_object_id INTEGER REFERENCES objects(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL CHECK (
    event_type IN (
      'change', 'incident', 'migration', 'release', 'discovery',
      'bug', 'fix', 'meeting', 'note', 'decision_event', 'task_event'
    )
  ),
  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  happened_at INTEGER NOT NULL,
  primary_evidence_chunk_id INTEGER REFERENCES objects(id) ON DELETE SET NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX idx_events_entity_time ON events(entity_object_id, happened_at);
CREATE INDEX idx_events_type_time ON events(event_type, happened_at);

-- ===========================================================================
-- 7.19 Relations (graph)
-- ===========================================================================
CREATE TABLE relations (
  id INTEGER PRIMARY KEY,
  source_object_id INTEGER NOT NULL REFERENCES objects(id) ON DELETE CASCADE,
  relation TEXT NOT NULL CHECK (
    relation IN (
      'about', 'mentions', 'evidence_for', 'relates_to',
      'parent_of', 'depends_on', 'blocks', 'solves', 'caused_by',
      'supersedes', 'invalidates', 'implements', 'changes',
      'documents', 'contradicts'
    )
  ),
  target_object_id INTEGER NOT NULL REFERENCES objects(id) ON DELETE CASCADE,
  confidence REAL NOT NULL DEFAULT 1.0 CHECK (confidence >= 0.0 AND confidence <= 1.0),
  evidence_chunk_id INTEGER REFERENCES objects(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (
    status IN ('active', 'retracted')
  ),
  created_at INTEGER NOT NULL,
  retracted_at INTEGER,
  UNIQUE(source_object_id, relation, target_object_id),
  CHECK (
    source_object_id != target_object_id
    OR relation IN ('relates_to', 'mentions')
  )
);
CREATE INDEX idx_relations_source ON relations(source_object_id, relation);
CREATE INDEX idx_relations_target ON relations(target_object_id, relation);
CREATE INDEX idx_relations_relation ON relations(relation);
CREATE INDEX idx_relations_active ON relations(status) WHERE status = 'active';

-- ===========================================================================
-- 7.20 Generated views
-- ===========================================================================
CREATE TABLE generated_views (
  id INTEGER PRIMARY KEY,
  object_id INTEGER NOT NULL UNIQUE REFERENCES objects(id) ON DELETE CASCADE,
  view_name TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  generated_at INTEGER NOT NULL,
  source_query TEXT NOT NULL DEFAULT ''
);
CREATE INDEX idx_generated_views_name ON generated_views(view_name);

-- ===========================================================================
-- 7.21 Index docs
-- ===========================================================================
CREATE TABLE index_docs (
  object_id INTEGER PRIMARY KEY REFERENCES objects(id) ON DELETE CASCADE,
  object_type TEXT NOT NULL,
  title TEXT NOT NULL,
  summary TEXT NOT NULL DEFAULT '',
  body TEXT NOT NULL DEFAULT '',
  tags TEXT NOT NULL DEFAULT '',
  aliases TEXT NOT NULL DEFAULT '',
  embedding_text TEXT NOT NULL,
  embedding_text_hash TEXT NOT NULL,
  indexed_at INTEGER NOT NULL
);
CREATE INDEX idx_index_docs_hash ON index_docs(embedding_text_hash);

-- ===========================================================================
-- 7.22 FTS5
-- ===========================================================================
CREATE VIRTUAL TABLE memory_fts USING fts5(
  object_type UNINDEXED,
  title,
  summary,
  body,
  tags,
  aliases,
  content='index_docs',
  content_rowid='object_id',
  tokenize="unicode61 remove_diacritics 2"
);

CREATE TRIGGER index_docs_ai AFTER INSERT ON index_docs BEGIN
  INSERT INTO memory_fts(rowid, object_type, title, summary, body, tags, aliases)
  VALUES (new.object_id, new.object_type, new.title, new.summary,
          new.body, new.tags, new.aliases);
END;

CREATE TRIGGER index_docs_ad AFTER DELETE ON index_docs BEGIN
  INSERT INTO memory_fts(memory_fts, rowid, object_type, title, summary, body, tags, aliases)
  VALUES ('delete', old.object_id, old.object_type, old.title, old.summary,
          old.body, old.tags, old.aliases);
END;

CREATE TRIGGER index_docs_au AFTER UPDATE ON index_docs BEGIN
  INSERT INTO memory_fts(memory_fts, rowid, object_type, title, summary, body, tags, aliases)
  VALUES ('delete', old.object_id, old.object_type, old.title, old.summary,
          old.body, old.tags, old.aliases);
  INSERT INTO memory_fts(rowid, object_type, title, summary, body, tags, aliases)
  VALUES (new.object_id, new.object_type, new.title, new.summary,
          new.body, new.tags, new.aliases);
END;

-- ===========================================================================
-- 7.23 Vector index (sqlite-vec must be loaded)
-- ===========================================================================
CREATE VIRTUAL TABLE memory_vec USING vec0(
  embedding FLOAT[512]
);

-- ===========================================================================
-- 7.24 Embedding metadata + extraction cache
-- ===========================================================================
CREATE TABLE embedding_meta (
  object_id INTEGER PRIMARY KEY REFERENCES objects(id) ON DELETE CASCADE,
  embedding_text_hash TEXT NOT NULL,
  model TEXT NOT NULL,
  dimensions INTEGER NOT NULL,
  embedded_at INTEGER NOT NULL
);
CREATE INDEX idx_embedding_meta_hash ON embedding_meta(embedding_text_hash);

CREATE TABLE extraction_cache (
  content_hash TEXT NOT NULL,
  model TEXT NOT NULL,
  response_json TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (content_hash, model)
);
