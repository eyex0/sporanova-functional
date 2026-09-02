-- Phase 7: API Keys table
CREATE TABLE IF NOT EXISTS api_keys (
  id serial PRIMARY KEY,
  "workspaceId" integer NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  "userId" integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name varchar(120) NOT NULL,
  "keyPrefix" varchar(16) NOT NULL,
  "keyHash" varchar(128) NOT NULL UNIQUE,
  scopes jsonb NOT NULL DEFAULT '["*"]',
  "rateLimit" integer NOT NULL DEFAULT 60,
  "expiresAt" timestamp,
  "lastUsedAt" timestamp,
  "isActive" boolean NOT NULL DEFAULT true,
  "createdAt" timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS api_keys_workspace_idx ON api_keys("workspaceId");
CREATE INDEX IF NOT EXISTS api_keys_hash_idx ON api_keys("keyHash");
CREATE INDEX IF NOT EXISTS api_keys_prefix_idx ON api_keys("keyPrefix");
