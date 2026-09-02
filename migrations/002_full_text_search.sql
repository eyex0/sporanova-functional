-- Phase 2: Full-Text Search Infrastructure
-- Run this against your Supabase PostgreSQL database manually
-- or via: psql $DATABASE_URL -f migrations/002_full_text_search.sql

-- Enable pg_trgm for trigram similarity search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Add tsvector column to document_chunks for full-text search
ALTER TABLE document_chunks ADD COLUMN IF NOT EXISTS search_vector tsvector;

-- Add tsvector column to data_records for full-text search  
ALTER TABLE data_records ADD COLUMN IF NOT EXISTS search_vector tsvector;

-- Create GIN indexes for fast full-text search
CREATE INDEX IF NOT EXISTS document_chunks_search_idx ON document_chunks USING GIN(search_vector);
CREATE INDEX IF NOT EXISTS data_records_search_idx ON data_records USING GIN(search_vector);

-- Create GIN index for trigram similarity on document chunks content
CREATE INDEX IF NOT EXISTS document_chunks_content_trgm_idx ON document_chunks USING GIN(content gin_trgm_ops);

-- Create GIN index for trigram similarity on data_records searchableText
CREATE INDEX IF NOT EXISTS data_records_text_trgm_idx ON data_records USING GIN(searchableText gin_trgm_ops);

-- Populate search_vector for existing document_chunks
UPDATE document_chunks SET search_vector = to_tsvector('english', coalesce(content, ''));

-- Populate search_vector for existing data_records
UPDATE data_records SET search_vector = to_tsvector('english', coalesce(searchableText, ''));

-- Create trigger function to auto-update search_vector on document_chunks
CREATE OR REPLACE FUNCTION update_document_chunks_search_vector()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector := to_tsvector('english', coalesce(NEW.content, ''));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger function to auto-update search_vector on data_records
CREATE OR REPLACE FUNCTION update_data_records_search_vector()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector := to_tsvector('english', coalesce(NEW.searchableText, ''));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers
DROP TRIGGER IF EXISTS trg_document_chunks_search ON document_chunks;
CREATE TRIGGER trg_document_chunks_search
  BEFORE INSERT OR UPDATE ON document_chunks
  FOR EACH ROW EXECUTE FUNCTION update_document_chunks_search_vector();

DROP TRIGGER IF EXISTS trg_data_records_search ON data_records;
CREATE TRIGGER trg_data_records_search
  BEFORE INSERT OR UPDATE ON data_records
  FOR EACH ROW EXECUTE FUNCTION update_data_records_search_vector();

-- Hybrid search function for document chunks
CREATE OR REPLACE FUNCTION search_document_chunks(
  p_workspace_id INTEGER,
  p_query TEXT,
  p_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
  id INTEGER,
  document_id INTEGER,
  chunk_index INTEGER,
  content TEXT,
  metadata JSONB,
  rank REAL,
  similarity REAL,
  combined_score REAL
) AS $$
BEGIN
  RETURN QUERY
  WITH fts_results AS (
    SELECT 
      dc.id,
      dc.documentId,
      dc.chunkIndex,
      dc.content,
      dc.metadata,
      ts_rank_cd(dc.search_vector, plainto_tsquery('english', p_query)) AS rank
    FROM document_chunks dc
    WHERE dc.workspaceId = p_workspace_id
      AND dc.search_vector @@ plainto_tsquery('english', p_query)
  ),
  trgm_results AS (
    SELECT 
      dc.id,
      similarity(dc.content, p_query) AS sim
    FROM document_chunks dc
    WHERE dc.workspaceId = p_workspace_id
      AND dc.content % p_query
  )
  SELECT 
    f.id,
    f.document_id,
    f.chunk_index,
    f.content,
    f.metadata,
    f.rank,
    COALESCE(t.sim, 0)::REAL AS similarity,
    (f.rank * 0.7 + COALESCE(t.sim, 0) * 0.3)::REAL AS combined_score
  FROM fts_results f
  LEFT JOIN trgm_results t ON f.id = t.id
  ORDER BY combined_score DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- Hybrid search function for data records
CREATE OR REPLACE FUNCTION search_data_records(
  p_workspace_id INTEGER,
  p_query TEXT,
  p_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
  id INTEGER,
  data_source_id INTEGER,
  external_id VARCHAR,
  payload JSONB,
  rank REAL,
  similarity REAL,
  combined_score REAL
) AS $$
BEGIN
  RETURN QUERY
  WITH fts_results AS (
    SELECT 
      dr.id,
      dr.dataSourceId,
      dr.externalId,
      dr.payload,
      ts_rank_cd(dr.search_vector, plainto_tsquery('english', p_query)) AS rank
    FROM data_records dr
    WHERE dr.workspaceId = p_workspace_id
      AND dr.search_vector @@ plainto_tsquery('english', p_query)
  ),
  trgm_results AS (
    SELECT 
      dr.id,
      similarity(dr.searchableText, p_query) AS sim
    FROM data_records dr
    WHERE dr.workspaceId = p_workspace_id
      AND dr.searchableText % p_query
  )
  SELECT 
    f.id,
    f.data_source_id,
    f.external_id,
    f.payload,
    f.rank,
    COALESCE(t.sim, 0)::REAL AS similarity,
    (f.rank * 0.7 + COALESCE(t.sim, 0) * 0.3)::REAL AS combined_score
  FROM fts_results f
  LEFT JOIN trgm_results t ON f.id = t.id
  ORDER BY combined_score DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;