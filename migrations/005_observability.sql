-- Phase 5: Evaluation & Observability
-- Run: psql $DATABASE_URL -f migrations/005_observability.sql

-- ============================================================
-- 1. traces — agent execution traces (one per run)
-- ============================================================
CREATE TABLE IF NOT EXISTS traces (
  id              SERIAL PRIMARY KEY,
  "workspaceId"   INTEGER NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  "agentId"       INTEGER NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  "conversationId" INTEGER REFERENCES conversations(id) ON DELETE SET NULL,
  "runId"         INTEGER REFERENCES agent_runs(id) ON DELETE SET NULL,
  traceId         VARCHAR(128) NOT NULL,  -- UUID for correlation
  name            VARCHAR(255),           -- e.g. "agent.chat", "workflow.ai_node"
  "startTime"     TIMESTAMP WITH TIME ZONE NOT NULL,
  "endTime"       TIMESTAMP WITH TIME ZONE,
  "durationMs"    INTEGER,
  status          VARCHAR(40) NOT NULL DEFAULT 'ok',  -- ok, error, unset
  "spanCount"     INTEGER NOT NULL DEFAULT 0,
  "model"         VARCHAR(120),
  "provider"      VARCHAR(120),
  "totalTokens"   INTEGER,
  "promptTokens"  INTEGER,
  "completionTokens" INTEGER,
  "estimatedCost" NUMERIC(12, 6),  -- USD cost estimate
  metadata        JSONB,
  "createdAt"     TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS traces_traceid_unique
  ON traces(traceId);
CREATE INDEX IF NOT EXISTS traces_workspace_agent_idx
  ON traces("workspaceId", "agentId");
CREATE INDEX IF NOT EXISTS traces_workspace_created_idx
  ON traces("workspaceId", "createdAt");
CREATE INDEX IF NOT EXISTS traces_conversation_idx
  ON traces("conversationId");
CREATE INDEX IF NOT EXISTS traces_run_idx
  ON traces("runId");

-- ============================================================
-- 2. trace_spans — individual spans within a trace
-- ============================================================
CREATE TABLE IF NOT EXISTS trace_spans (
  id              SERIAL PRIMARY KEY,
  "traceId"       INTEGER NOT NULL REFERENCES traces(id) ON DELETE CASCADE,
  "workspaceId"   INTEGER NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  "spanId"        VARCHAR(128) NOT NULL,  -- UUID for this span
  "parentSpanId"  VARCHAR(128),           -- parent span UUID (null for root)
  name            VARCHAR(255) NOT NULL,  -- e.g. "llm.call", "tool.execute", "rag.retrieve"
  kind             VARCHAR(40) NOT NULL DEFAULT 'internal',  -- internal, llm, tool, http, db
  "startTime"     TIMESTAMP WITH TIME ZONE NOT NULL,
  "endTime"       TIMESTAMP WITH TIME ZONE,
  "durationMs"    INTEGER,
  status          VARCHAR(40) NOT NULL DEFAULT 'ok',
  "statusCode"    INTEGER,
  "statusMessage" TEXT,
  input           JSONB,                  -- span input (prompt, tool args, etc.)
  output          JSONB,                  -- span output (response, result, etc.)
  attributes      JSONB,                  -- flexible key-value pairs
  events          JSONB,                  -- span events (errors, annotations)
  "createdAt"     TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS trace_spans_trace_idx
  ON trace_spans("traceId");
CREATE INDEX IF NOT EXISTS trace_spans_workspace_idx
  ON trace_spans("workspaceId");
CREATE INDEX IF NOT EXISTS trace_spans_kind_idx
  ON trace_spans("kind");
CREATE INDEX IF NOT EXISTS trace_spans_parent_idx
  ON trace_spans("parentSpanId");

-- ============================================================
-- 3. evaluation_datasets — test case collections
-- ============================================================
CREATE TABLE IF NOT EXISTS evaluation_datasets (
  id              SERIAL PRIMARY KEY,
  "workspaceId"   INTEGER NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  "agentId"       INTEGER REFERENCES agents(id) ON DELETE SET NULL,
  name            VARCHAR(255) NOT NULL,
  description     TEXT,
  "testCaseCount" INTEGER NOT NULL DEFAULT 0,
  metadata        JSONB,
  "createdById"   INTEGER REFERENCES users(id) ON DELETE SET NULL,
  "createdAt"     TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  "updatedAt"     TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS eval_datasets_workspace_idx
  ON evaluation_datasets("workspaceId");
CREATE INDEX IF NOT EXISTS eval_datasets_agent_idx
  ON evaluation_datasets("agentId");

-- ============================================================
-- 4. evaluation_test_cases — individual test cases
-- ============================================================
CREATE TABLE IF NOT EXISTS evaluation_test_cases (
  id              SERIAL PRIMARY KEY,
  "datasetId"     INTEGER NOT NULL REFERENCES evaluation_datasets(id) ON DELETE CASCADE,
  "workspaceId"   INTEGER NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name            VARCHAR(255),
  input           TEXT NOT NULL,           -- user message / prompt
  "expectedOutput" TEXT,                   -- expected response (for scoring)
  "expectedToolCalls" JSONB,              -- expected tool calls (for tool scoring)
  "referenceContext" TEXT,                 -- reference documents/context
  tags            JSONB DEFAULT '[]',     -- categorization tags
  "createdAt"     TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS eval_cases_dataset_idx
  ON evaluation_test_cases("datasetId");
CREATE INDEX IF NOT EXISTS eval_cases_workspace_idx
  ON evaluation_test_cases("workspaceId");

-- ============================================================
-- 5. evaluation_runs — evaluation execution results
-- ============================================================
CREATE TABLE IF NOT EXISTS evaluation_runs (
  id              SERIAL PRIMARY KEY,
  "workspaceId"   INTEGER NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  "datasetId"     INTEGER NOT NULL REFERENCES evaluation_datasets(id) ON DELETE CASCADE,
  "agentId"       INTEGER NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  name            VARCHAR(255),
  status          VARCHAR(40) NOT NULL DEFAULT 'pending',  -- pending, running, completed, failed
  "totalCases"    INTEGER NOT NULL DEFAULT 0,
  "passedCases"   INTEGER NOT NULL DEFAULT 0,
  "failedCases"   INTEGER NOT NULL DEFAULT 0,
  "errorCases"    INTEGER NOT NULL DEFAULT 0,
  "avgScore"      NUMERIC(5, 4),          -- overall score 0.0000 - 1.0000
  "avgLatencyMs"  INTEGER,
  "totalTokens"   INTEGER,
  "estimatedCost" NUMERIC(12, 6),
  results         JSONB,                  -- detailed per-case results
  "startedAt"     TIMESTAMP WITH TIME ZONE,
  "completedAt"   TIMESTAMP WITH TIME ZONE,
  "createdById"   INTEGER REFERENCES users(id) ON DELETE SET NULL,
  "createdAt"     TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS eval_runs_workspace_idx
  ON evaluation_runs("workspaceId");
CREATE INDEX IF NOT EXISTS eval_runs_dataset_idx
  ON evaluation_runs("datasetId");
CREATE INDEX IF NOT EXISTS eval_runs_agent_idx
  ON evaluation_runs("agentId");

-- ============================================================
-- 6. cost_records — per-invocation cost tracking
-- ============================================================
CREATE TABLE IF NOT EXISTS cost_records (
  id              SERIAL PRIMARY KEY,
  "workspaceId"   INTEGER NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  "agentId"       INTEGER REFERENCES agents(id) ON DELETE SET NULL,
  "runId"         INTEGER REFERENCES agent_runs(id) ON DELETE SET NULL,
  "traceId"       INTEGER REFERENCES traces(id) ON DELETE SET NULL,
  model           VARCHAR(120) NOT NULL,
  provider        VARCHAR(120) NOT NULL,
  "promptTokens"  INTEGER NOT NULL DEFAULT 0,
  "completionTokens" INTEGER NOT NULL DEFAULT 0,
  "totalTokens"   INTEGER NOT NULL DEFAULT 0,
  "costUsd"       NUMERIC(12, 6) NOT NULL DEFAULT 0,
  metadata        JSONB,
  "createdAt"     TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS cost_records_workspace_idx
  ON cost_records("workspaceId");
CREATE INDEX IF NOT EXISTS cost_records_workspace_created_idx
  ON cost_records("workspaceId", "createdAt");
CREATE INDEX IF NOT EXISTS cost_records_agent_idx
  ON cost_records("agentId");
