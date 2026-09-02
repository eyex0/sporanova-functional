-- Phase 3: Tool Calling & Memory Infrastructure

-- Tools registry table
CREATE TABLE IF NOT EXISTS tools (
  id SERIAL PRIMARY KEY,
  "workspaceId" INTEGER NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name VARCHAR(160) NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  parameters JSONB NOT NULL DEFAULT '{}',
  "handlerType" VARCHAR(40) NOT NULL DEFAULT 'builtin',
  "handlerConfig" JSONB NOT NULL DEFAULT '{}',
  enabled BOOLEAN NOT NULL DEFAULT true,
  "createdById" INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  "deletedAt" TIMESTAMP,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS tools_workspace_name_unique ON tools("workspaceId", name) WHERE "deletedAt" IS NULL;
CREATE INDEX IF NOT EXISTS tools_workspace_idx ON tools("workspaceId");

-- Tool executions audit table
CREATE TABLE IF NOT EXISTS tool_executions (
  id SERIAL PRIMARY KEY,
  "workspaceId" INTEGER NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  "agentId" INTEGER NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  "conversationId" INTEGER REFERENCES conversations(id) ON DELETE SET NULL,
  "toolName" VARCHAR(160) NOT NULL,
  "toolCallId" VARCHAR(120) NOT NULL,
  arguments JSONB NOT NULL DEFAULT '{}',
  result JSONB,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  "errorMessage" TEXT,
  "latencyMs" INTEGER,
  "createdById" INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS tool_executions_workspace_agent_idx ON tool_executions("workspaceId", "agentId");
CREATE INDEX IF NOT EXISTS tool_executions_conversation_idx ON tool_executions("conversationId") WHERE "conversationId" IS NOT NULL;

-- Agent memory table
CREATE TABLE IF NOT EXISTS agent_memory (
  id SERIAL PRIMARY KEY,
  "workspaceId" INTEGER NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  "agentId" INTEGER NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  "conversationId" INTEGER REFERENCES conversations(id) ON DELETE SET NULL,
  "memoryType" VARCHAR(40) NOT NULL DEFAULT 'fact',
  content TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}',
  "createdById" INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  "deletedAt" TIMESTAMP,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS agent_memory_workspace_agent_idx ON agent_memory("workspaceId", "agentId");
CREATE INDEX IF NOT EXISTS agent_memory_type_idx ON agent_memory("memoryType");
CREATE INDEX IF NOT EXISTS agent_memory_conversation_idx ON agent_memory("conversationId") WHERE "conversationId" IS NOT NULL;