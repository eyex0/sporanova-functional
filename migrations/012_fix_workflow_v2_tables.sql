-- 012_fix_workflow_v2_tables.sql - Recreate workflow V2 tables with correct schema
-- Old schemas from earlier implementation are incompatible

-- workflow_approvals: drop and recreate
DROP TABLE IF EXISTS workflow_approvals CASCADE;

CREATE TABLE workflow_approvals (
  id                SERIAL PRIMARY KEY,
  "runId"           INTEGER NOT NULL REFERENCES workflow_runs(id) ON DELETE CASCADE,
  "nodeId"          INTEGER NOT NULL REFERENCES workflow_nodes(id) ON DELETE CASCADE,
  "workflowId"      INTEGER NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
  "workspaceId"     INTEGER NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  status            workflow_approvals_status NOT NULL DEFAULT 'pending',
  "requestContext"  JSONB NOT NULL DEFAULT '{}',
  "decisionBy"      INTEGER REFERENCES users(id) ON DELETE SET NULL,
  "decisionNote"    TEXT,
  "decisionAt"      TIMESTAMP,
  "expiresAt"       TIMESTAMP,
  "createdAt"       TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX workflow_approvals_run_idx ON workflow_approvals("runId");
CREATE INDEX workflow_approvals_workspace_status_idx ON workflow_approvals("workspaceId", status);
CREATE INDEX workflow_approvals_workspace_created_idx ON workflow_approvals("workspaceId", "createdAt");

-- workflow_step_checkpoints: drop and recreate
DROP TABLE IF EXISTS workflow_step_checkpoints CASCADE;

CREATE TABLE workflow_step_checkpoints (
  id                SERIAL PRIMARY KEY,
  "runId"           INTEGER NOT NULL REFERENCES workflow_runs(id) ON DELETE CASCADE,
  "workflowId"      INTEGER NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
  "workspaceId"     INTEGER NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  "nodeKey"         VARCHAR(80) NOT NULL,
  "checkpointData"  JSONB NOT NULL DEFAULT '{}',
  "resumeToken"     VARCHAR(128) UNIQUE,
  "isResumable"     BOOLEAN NOT NULL DEFAULT false,
  resumed           BOOLEAN NOT NULL DEFAULT false,
  "createdAt"       TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX workflow_checkpoints_run_idx ON workflow_step_checkpoints("runId");
CREATE INDEX workflow_checkpoints_resume_idx ON workflow_step_checkpoints("resumeToken");
CREATE INDEX workflow_checkpoints_workspace_idx ON workflow_step_checkpoints("workspaceId");

-- workflow_events: drop and recreate
DROP TABLE IF EXISTS workflow_events CASCADE;

CREATE TABLE workflow_events (
  id                SERIAL PRIMARY KEY,
  "runId"           INTEGER NOT NULL REFERENCES workflow_runs(id) ON DELETE CASCADE,
  "workflowId"      INTEGER NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
  "workspaceId"     INTEGER NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  "eventType"       VARCHAR(80) NOT NULL,
  payload           JSONB NOT NULL DEFAULT '{}',
  "sourceNodeId"    INTEGER REFERENCES workflow_nodes(id) ON DELETE SET NULL,
  "createdAt"       TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX workflow_events_run_idx ON workflow_events("runId");
CREATE INDEX workflow_events_workspace_type_idx ON workflow_events("workspaceId", "eventType");
CREATE INDEX workflow_events_workspace_created_idx ON workflow_events("workspaceId", "createdAt");

-- workflow_schedules: drop and recreate
DROP TABLE IF EXISTS workflow_schedules CASCADE;

CREATE TABLE workflow_schedules (
  id                SERIAL PRIMARY KEY,
  "workflowId"      INTEGER NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
  "workspaceId"     INTEGER NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  "cronExpr"        VARCHAR(100) NOT NULL,
  timezone          VARCHAR(64) NOT NULL DEFAULT 'UTC',
  "isActive"        BOOLEAN NOT NULL DEFAULT true,
  "nextRunAt"       TIMESTAMP,
  "lastRunAt"       TIMESTAMP,
  "runCount"        INTEGER NOT NULL DEFAULT 0,
  metadata          JSONB,
  "createdById"     INTEGER REFERENCES users(id) ON DELETE SET NULL,
  "createdAt"       TIMESTAMP DEFAULT NOW() NOT NULL,
  "updatedAt"       TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX workflow_schedules_workflow_idx ON workflow_schedules("workflowId");
CREATE INDEX workflow_schedules_workspace_idx ON workflow_schedules("workspaceId");
CREATE INDEX workflow_schedules_next_run_idx ON workflow_schedules("nextRunAt");

-- workflow_deployments: drop and recreate
DROP TABLE IF EXISTS workflow_deployments CASCADE;

CREATE TABLE workflow_deployments (
  id                SERIAL PRIMARY KEY,
  "workflowId"      INTEGER NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
  "workspaceId"     INTEGER NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  "versionId"       INTEGER REFERENCES workflow_versions(id) ON DELETE SET NULL,
  status            workflow_deployments_status NOT NULL DEFAULT 'deployed',
  "deployedAt"      TIMESTAMP DEFAULT NOW() NOT NULL,
  "deployById"      INTEGER REFERENCES users(id) ON DELETE SET NULL,
  changelog         TEXT,
  metadata          JSONB,
  "createdAt"       TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX workflow_deployments_workflow_idx ON workflow_deployments("workflowId");
CREATE INDEX workflow_deployments_workspace_idx ON workflow_deployments("workspaceId");
CREATE INDEX workflow_deployments_status_idx ON workflow_deployments(status);
