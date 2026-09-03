-- 011_fix_traces_table.sql - Recreate traces/trace_spans with new schema
-- Old traces has id VARCHAR, but Drizzle schema expects id SERIAL

-- Save data we want to keep (or drop if none important)
DO $$
DECLARE
  has_data boolean;
BEGIN
  SELECT EXISTS(SELECT 1 FROM traces LIMIT 1) INTO has_data;
  IF has_data THEN
    RAISE NOTICE 'Existing traces data will be backed up and dropped';
  END IF;
END $$;

-- Backup existing traces
CREATE TABLE IF NOT EXISTS traces_backup AS SELECT * FROM traces;
CREATE TABLE IF NOT EXISTS trace_spans_backup AS SELECT * FROM trace_spans;

-- Drop the old tables
DROP TABLE IF EXISTS trace_spans CASCADE;
DROP TABLE IF EXISTS traces CASCADE;

-- Recreate with new schema (matching Drizzle)
CREATE TABLE traces (
  id              SERIAL PRIMARY KEY,
  "workspaceId"   INTEGER NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  "agentId"       INTEGER NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  "conversationId" INTEGER REFERENCES conversations(id) ON DELETE SET NULL,
  "runId"         INTEGER REFERENCES agent_runs(id) ON DELETE SET NULL,
  "traceId"       VARCHAR(128) NOT NULL,
  name            VARCHAR(255),
  "startTime"     TIMESTAMP NOT NULL,
  "endTime"       TIMESTAMP,
  "durationMs"    INTEGER,
  status          VARCHAR(40) NOT NULL DEFAULT 'ok',
  "spanCount"     INTEGER NOT NULL DEFAULT 0,
  model           VARCHAR(120),
  provider        VARCHAR(120),
  "totalTokens"   INTEGER,
  "promptTokens"  INTEGER,
  "completionTokens" INTEGER,
  "estimatedCost" NUMERIC(12, 6),
  metadata        JSONB,
  "createdAt"     TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE UNIQUE INDEX traces_traceid_unique ON traces("traceId");
CREATE INDEX traces_workspace_agent_idx ON traces("workspaceId", "agentId");
CREATE INDEX traces_workspace_created_idx ON traces("workspaceId", "createdAt");
CREATE INDEX traces_conversation_idx ON traces("conversationId");
CREATE INDEX traces_run_idx ON traces("runId");

CREATE TABLE trace_spans (
  id              SERIAL PRIMARY KEY,
  "traceId"       INTEGER NOT NULL REFERENCES traces(id) ON DELETE CASCADE,
  "workspaceId"   INTEGER NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  "spanId"        VARCHAR(128) NOT NULL,
  "parentSpanId"  VARCHAR(128),
  name            VARCHAR(255) NOT NULL,
  kind            VARCHAR(40) NOT NULL DEFAULT 'internal',
  "startTime"     TIMESTAMP NOT NULL,
  "endTime"       TIMESTAMP,
  "durationMs"    INTEGER,
  status          VARCHAR(40) NOT NULL DEFAULT 'ok',
  "statusCode"    INTEGER,
  "statusMessage" TEXT,
  input           JSONB,
  output          JSONB,
  attributes      JSONB,
  events          JSONB,
  "createdAt"     TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX trace_spans_trace_idx ON trace_spans("traceId");
CREATE INDEX trace_spans_workspace_idx ON trace_spans("workspaceId");
CREATE INDEX trace_spans_kind_idx ON trace_spans(kind);
CREATE INDEX trace_spans_parent_idx ON trace_spans("parentSpanId");
