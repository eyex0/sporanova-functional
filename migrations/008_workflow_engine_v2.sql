-- Workflow Engine V2: Extended node types, approvals, checkpoints, events, schedules, deployments
-- Apply with: psql $DATABASE_URL -f migrations/008_workflow_engine_v2.sql

-- 1. Extend the node type enum with new native types
ALTER TYPE workflow_nodes_node_type ADD VALUE IF NOT EXISTS 'ai_agent';
ALTER TYPE workflow_nodes_node_type ADD VALUE IF NOT EXISTS 'ai_router';
ALTER TYPE workflow_nodes_node_type ADD VALUE IF NOT EXISTS 'ai_classifier';
ALTER TYPE workflow_nodes_node_type ADD VALUE IF NOT EXISTS 'supervisor';
ALTER TYPE workflow_nodes_node_type ADD VALUE IF NOT EXISTS 'multi_agent';
ALTER TYPE workflow_nodes_node_type ADD VALUE IF NOT EXISTS 'knowledge_search';
ALTER TYPE workflow_nodes_node_type ADD VALUE IF NOT EXISTS 'rag_retrieval';
ALTER TYPE workflow_nodes_node_type ADD VALUE IF NOT EXISTS 'memory_read';
ALTER TYPE workflow_nodes_node_type ADD VALUE IF NOT EXISTS 'memory_write';
ALTER TYPE workflow_nodes_node_type ADD VALUE IF NOT EXISTS 'mcp_tool';
ALTER TYPE workflow_nodes_node_type ADD VALUE IF NOT EXISTS 'http_request';
ALTER TYPE workflow_nodes_node_type ADD VALUE IF NOT EXISTS 'function';
ALTER TYPE workflow_nodes_node_type ADD VALUE IF NOT EXISTS 'code';
ALTER TYPE workflow_nodes_node_type ADD VALUE IF NOT EXISTS 'parallel';
ALTER TYPE workflow_nodes_node_type ADD VALUE IF NOT EXISTS 'merge';
ALTER TYPE workflow_nodes_node_type ADD VALUE IF NOT EXISTS 'aggregate';
ALTER TYPE workflow_nodes_node_type ADD VALUE IF NOT EXISTS 'subworkflow';
ALTER TYPE workflow_nodes_node_type ADD VALUE IF NOT EXISTS 'escalation';
ALTER TYPE workflow_nodes_node_type ADD VALUE IF NOT EXISTS 'approval';

-- 2. Workflow approvals (human-in-the-loop)
CREATE TYPE workflow_approvals_status AS ENUM ('pending', 'approved', 'rejected', 'expired');

CREATE TABLE IF NOT EXISTS workflow_approvals (
  id SERIAL PRIMARY KEY,
  run_id INTEGER NOT NULL REFERENCES workflow_runs(id) ON DELETE CASCADE,
  node_id INTEGER NOT NULL REFERENCES workflow_nodes(id) ON DELETE CASCADE,
  workflow_id INTEGER NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
  workspace_id INTEGER NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  status workflow_approvals_status NOT NULL DEFAULT 'pending',
  request_context JSONB NOT NULL DEFAULT '{}',
  decision_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  decision_note TEXT,
  decision_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS workflow_approvals_run_idx ON workflow_approvals(run_id);
CREATE INDEX IF NOT EXISTS workflow_approvals_workspace_status_idx ON workflow_approvals(workspace_id, status);
CREATE INDEX IF NOT EXISTS workflow_approvals_workspace_created_idx ON workflow_approvals(workspace_id, created_at);

-- 3. Workflow step checkpoints (durable execution / resume)
CREATE TABLE IF NOT EXISTS workflow_step_checkpoints (
  id SERIAL PRIMARY KEY,
  run_id INTEGER NOT NULL REFERENCES workflow_runs(id) ON DELETE CASCADE,
  workflow_id INTEGER NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
  workspace_id INTEGER NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  node_key VARCHAR(80) NOT NULL,
  checkpoint_data JSONB NOT NULL DEFAULT '{}',
  resume_token VARCHAR(128) UNIQUE,
  is_resumable BOOLEAN NOT NULL DEFAULT FALSE,
  resumed BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS workflow_checkpoints_run_idx ON workflow_step_checkpoints(run_id);
CREATE INDEX IF NOT EXISTS workflow_checkpoints_resume_idx ON workflow_step_checkpoints(resume_token);
CREATE INDEX IF NOT EXISTS workflow_checkpoints_workspace_idx ON workflow_step_checkpoints(workspace_id);

-- 4. Workflow events (event-driven triggers)
CREATE TABLE IF NOT EXISTS workflow_events (
  id SERIAL PRIMARY KEY,
  run_id INTEGER NOT NULL REFERENCES workflow_runs(id) ON DELETE CASCADE,
  workflow_id INTEGER NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
  workspace_id INTEGER NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  event_type VARCHAR(80) NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}',
  source_node_id INTEGER REFERENCES workflow_nodes(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS workflow_events_run_idx ON workflow_events(run_id);
CREATE INDEX IF NOT EXISTS workflow_events_workspace_type_idx ON workflow_events(workspace_id, event_type);
CREATE INDEX IF NOT EXISTS workflow_events_workspace_created_idx ON workflow_events(workspace_id, created_at);

-- 5. Workflow schedules (cron-based)
CREATE TABLE IF NOT EXISTS workflow_schedules (
  id SERIAL PRIMARY KEY,
  workflow_id INTEGER NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
  workspace_id INTEGER NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  cron_expr VARCHAR(100) NOT NULL,
  timezone VARCHAR(64) NOT NULL DEFAULT 'UTC',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  next_run_at TIMESTAMPTZ,
  last_run_at TIMESTAMPTZ,
  run_count INTEGER NOT NULL DEFAULT 0,
  metadata JSONB,
  created_by_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS workflow_schedules_workflow_idx ON workflow_schedules(workflow_id);
CREATE INDEX IF NOT EXISTS workflow_schedules_workspace_idx ON workflow_schedules(workspace_id);
CREATE INDEX IF NOT EXISTS workflow_schedules_next_run_idx ON workflow_schedules(next_run_at);

-- 6. Workflow deployments (publish/archive lifecycle)
CREATE TYPE workflow_deployments_status AS ENUM ('deployed', 'archived', 'superseded');

CREATE TABLE IF NOT EXISTS workflow_deployments (
  id SERIAL PRIMARY KEY,
  workflow_id INTEGER NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
  workspace_id INTEGER NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  version_id INTEGER REFERENCES workflow_versions(id) ON DELETE SET NULL,
  status workflow_deployments_status NOT NULL DEFAULT 'deployed',
  deployed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deployed_by_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  changelog TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS workflow_deployments_workflow_idx ON workflow_deployments(workflow_id);
CREATE INDEX IF NOT EXISTS workflow_deployments_workspace_idx ON workflow_deployments(workspace_id);
CREATE INDEX IF NOT EXISTS workflow_deployments_status_idx ON workflow_deployments(status);
