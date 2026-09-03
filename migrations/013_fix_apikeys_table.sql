-- 013_fix_apikeys_table.sql - Recreate api_keys with correct schema
DROP TABLE IF EXISTS api_keys CASCADE;

CREATE TABLE api_keys (
  id              SERIAL PRIMARY KEY,
  "workspaceId"   INTEGER NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  "userId"        INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name            VARCHAR(120) NOT NULL,
  "keyPrefix"     VARCHAR(16) NOT NULL,
  "keyHash"       VARCHAR(128) NOT NULL UNIQUE,
  scopes          JSONB NOT NULL DEFAULT '["*"]',
  "rateLimit"     INTEGER NOT NULL DEFAULT 60,
  "expiresAt"     TIMESTAMP,
  "lastUsedAt"    TIMESTAMP,
  "isActive"      BOOLEAN NOT NULL DEFAULT true,
  "createdAt"     TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX api_keys_workspace_idx ON api_keys("workspaceId");
CREATE INDEX api_keys_hash_idx ON api_keys("keyHash");
CREATE INDEX api_keys_prefix_idx ON api_keys("keyPrefix");
