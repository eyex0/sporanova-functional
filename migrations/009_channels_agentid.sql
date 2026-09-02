-- Add agentId column to channels table (proper FK, not just JSONB)
-- Apply with: psql $DATABASE_URL -f migrations/009_channels_agentid.sql

ALTER TABLE channels ADD COLUMN IF NOT EXISTS agent_id INTEGER REFERENCES agents(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS channels_workspace_agent_idx ON channels(workspace_id, agent_id);
