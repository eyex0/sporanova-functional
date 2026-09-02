-- Phase 4: Workflow Engine - Edges + extended node types
-- Run: psql $DATABASE_URL -f migrations/004_workflow_engine.sql

-- ============================================================
-- 1. workflow_edges — directed edges between nodes
-- ============================================================
CREATE TABLE IF NOT EXISTS workflow_edges (
  id            SERIAL PRIMARY KEY,
  "workflowId"  INTEGER NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
  "sourceNodeId" INTEGER NOT NULL REFERENCES workflow_nodes(id) ON DELETE CASCADE,
  "targetNodeId" INTEGER NOT NULL REFERENCES workflow_nodes(id) ON DELETE CASCADE,
  label         VARCHAR(160),
  "conditionExpr" TEXT,  -- JSON expression for conditional edges (e.g. {"field":"status","op":"eq","value":"approved"})
  "createdAt"   TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS workflow_edges_workflow_source_target_unique
  ON workflow_edges("workflowId", "sourceNodeId", "targetNodeId");
CREATE INDEX IF NOT EXISTS workflow_edges_workflow_idx
  ON workflow_edges("workflowId");
CREATE INDEX IF NOT EXISTS workflow_edges_source_idx
  ON workflow_edges("sourceNodeId");
CREATE INDEX IF NOT EXISTS workflow_edges_target_idx
  ON workflow_edges("targetNodeId");

-- ============================================================
-- 2. Extend node type enum — add full set of node types
-- ============================================================
-- Drizzle manages enums via migrations. We add new values manually.
-- The existing enum is: trigger, intelligence, condition, action
-- We add: start, ai, tool, api, human_approval, wait, notification, end

ALTER TYPE workflow_nodes_node_type ADD VALUE IF NOT EXISTS 'start';
ALTER TYPE workflow_nodes_node_type ADD VALUE IF NOT EXISTS 'ai';
ALTER TYPE workflow_nodes_node_type ADD VALUE IF NOT EXISTS 'tool';
ALTER TYPE workflow_nodes_node_type ADD VALUE IF NOT EXISTS 'api';
ALTER TYPE workflow_nodes_node_type ADD VALUE IF NOT EXISTS 'human_approval';
ALTER TYPE workflow_nodes_node_type ADD VALUE IF NOT EXISTS 'wait';
ALTER TYPE workflow_nodes_node_type ADD VALUE IF NOT EXISTS 'notification';
ALTER TYPE workflow_nodes_node_type ADD VALUE IF NOT EXISTS 'end';

-- ============================================================
-- 3. workflow_versions — snapshot history for workflows
-- ============================================================
CREATE TABLE IF NOT EXISTS workflow_versions (
  id            SERIAL PRIMARY KEY,
  "workflowId"  INTEGER NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
  "version"     INTEGER NOT NULL,
  "snapshot"    JSONB NOT NULL,  -- full workflow + nodes + edges snapshot
  "createdById" INTEGER REFERENCES users(id) ON DELETE SET NULL,
  "createdAt"   TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS workflow_versions_workflow_version_unique
  ON workflow_versions("workflowId", "version");
CREATE INDEX IF NOT EXISTS workflow_versions_workflow_idx
  ON workflow_versions("workflowId");

-- ============================================================
-- 4. node_executions — per-node execution results in a run
-- ============================================================
CREATE TABLE IF NOT EXISTS node_executions (
  id            SERIAL PRIMARY KEY,
  "runId"       INTEGER NOT NULL REFERENCES workflow_runs(id) ON DELETE CASCADE,
  "nodeId"      INTEGER NOT NULL REFERENCES workflow_nodes(id) ON DELETE CASCADE,
  "nodeKey"     VARCHAR(80) NOT NULL,
  "nodeType"    VARCHAR(80) NOT NULL,
  status        VARCHAR(40) NOT NULL DEFAULT 'pending',  -- pending, running, completed, failed, skipped
  "input"       JSONB,
  "output"      JSONB,
  "error"       TEXT,
  "startedAt"   TIMESTAMP WITH TIME ZONE,
  "completedAt" TIMESTAMP WITH TIME ZONE,
  "durationMs"  INTEGER,
  "createdAt"   TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS node_executions_run_idx
  ON node_executions("runId");
CREATE INDEX IF NOT EXISTS node_executions_node_idx
  ON node_executions("nodeId");
