-- 010_fix_missing_tables.sql - Create missing tables for observability and workflow V2
-- Run each statement separately to avoid transaction rollback

-- evaluation_test_cases
CREATE TABLE IF NOT EXISTS evaluation_test_cases (
  id              SERIAL PRIMARY KEY,
  "datasetId"     INTEGER NOT NULL REFERENCES evaluation_datasets(id) ON DELETE CASCADE,
  "workspaceId"   INTEGER NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name            VARCHAR(255),
  input           TEXT NOT NULL,
  "expectedOutput" TEXT,
  "expectedToolCalls" JSONB,
  "referenceContext" TEXT,
  tags            JSONB DEFAULT '[]',
  "createdAt"     TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS eval_cases_dataset_idx
  ON evaluation_test_cases("datasetId");
CREATE INDEX IF NOT EXISTS eval_cases_workspace_idx
  ON evaluation_test_cases("workspaceId");

-- evaluation_runs
CREATE TABLE IF NOT EXISTS evaluation_runs (
  id              SERIAL PRIMARY KEY,
  "workspaceId"   INTEGER NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  "datasetId"     INTEGER NOT NULL REFERENCES evaluation_datasets(id) ON DELETE CASCADE,
  "agentId"       INTEGER NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  name            VARCHAR(255),
  status          VARCHAR(40) NOT NULL DEFAULT 'pending',
  "totalCases"    INTEGER NOT NULL DEFAULT 0,
  "passedCases"   INTEGER NOT NULL DEFAULT 0,
  "failedCases"   INTEGER NOT NULL DEFAULT 0,
  "errorCases"    INTEGER NOT NULL DEFAULT 0,
  "avgScore"      NUMERIC(5, 4),
  "avgLatencyMs"  INTEGER,
  "totalTokens"   INTEGER,
  "estimatedCost" NUMERIC(12, 6),
  results         JSONB,
  "startedAt"     TIMESTAMP,
  "completedAt"   TIMESTAMP,
  "createdById"   INTEGER REFERENCES users(id) ON DELETE SET NULL,
  "createdAt"     TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS eval_runs_workspace_idx
  ON evaluation_runs("workspaceId");
CREATE INDEX IF NOT EXISTS eval_runs_dataset_idx
  ON evaluation_runs("datasetId");
CREATE INDEX IF NOT EXISTS eval_runs_agent_idx
  ON evaluation_runs("agentId");

-- cost_records (without FK to traces since traces.id is UUID in current DB)
CREATE TABLE IF NOT EXISTS cost_records (
  id              SERIAL PRIMARY KEY,
  "workspaceId"   INTEGER NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  "agentId"       INTEGER REFERENCES agents(id) ON DELETE SET NULL,
  "runId"         INTEGER REFERENCES agent_runs(id) ON DELETE SET NULL,
  "traceId"       INTEGER,
  model           VARCHAR(120) NOT NULL,
  provider        VARCHAR(120) NOT NULL,
  "promptTokens"  INTEGER NOT NULL DEFAULT 0,
  "completionTokens" INTEGER NOT NULL DEFAULT 0,
  "totalTokens"   INTEGER NOT NULL DEFAULT 0,
  "costUsd"       NUMERIC(12, 6) NOT NULL DEFAULT 0,
  metadata        JSONB,
  "createdAt"     TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS cost_records_workspace_idx
  ON cost_records("workspaceId");
CREATE INDEX IF NOT EXISTS cost_records_workspace_created_idx
  ON cost_records("workspaceId", "createdAt");
CREATE INDEX IF NOT EXISTS cost_records_agent_idx
  ON cost_records("agentId");

-- workflow_versions
CREATE TABLE IF NOT EXISTS workflow_versions (
  id              SERIAL PRIMARY KEY,
  "workflowId"    INTEGER NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
  version         INTEGER NOT NULL,
  snapshot        JSONB NOT NULL,
  "createdById"   INTEGER REFERENCES users(id) ON DELETE SET NULL,
  "createdAt"     TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS workflow_versions_workflow_version_unique
  ON workflow_versions("workflowId", version);
CREATE INDEX IF NOT EXISTS workflow_versions_workflow_idx
  ON workflow_versions("workflowId");

-- node_executions
CREATE TABLE IF NOT EXISTS node_executions (
  id              SERIAL PRIMARY KEY,
  "runId"         INTEGER NOT NULL REFERENCES workflow_runs(id) ON DELETE CASCADE,
  "nodeId"        INTEGER NOT NULL REFERENCES workflow_nodes(id) ON DELETE CASCADE,
  "nodeKey"       VARCHAR(80) NOT NULL,
  "nodeType"      VARCHAR(80) NOT NULL,
  status          VARCHAR(40) NOT NULL DEFAULT 'pending',
  input           JSONB,
  output          JSONB,
  error           TEXT,
  "startedAt"     TIMESTAMP,
  "completedAt"   TIMESTAMP,
  "durationMs"    INTEGER,
  "createdAt"     TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS node_executions_run_idx
  ON node_executions("runId");
CREATE INDEX IF NOT EXISTS node_executions_node_idx
  ON node_executions("nodeId");
