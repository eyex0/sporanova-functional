# Phase 2 Implementation Report

**Date:** September 2, 2026  
**Status:** COMPLETE  
**Author:** SOPRANOVA Engineering

---

## Executive Summary

Phase 2 adds full-text search (FTS) and retrieval-augmented generation (RAG) to SOPRANOVA's agent runtime. The implementation introduces a PostgreSQL-based hybrid search system using `pg_trgm` + `tsvector`/`tsquery`, a `RagProvider` that integrates with the Context Builder from Phase 1, streaming support for real-time responses, and Playground migration from `intelligence.ask` to the new `agents.chat` endpoint.

---

## What Was Built

### 1. Full-Text Search Migration (`migrations/002_full_text_search.sql`)
- **Extension**: `pg_trgm` for trigram similarity search
- **Schema changes**: `search_vector tsvector` column on `document_chunks` and `data_records`
- **Indexes**: GIN indexes on `search_vector` columns + trigram indexes on `content` and `searchableText`
- **Triggers**: Auto-update `search_vector` on INSERT/UPDATE for both tables
- **Search functions**: 
  - `search_document_chunks(workspace_id, query, limit)` — hybrid FTS + trigram search
  - `search_data_records(workspace_id, query, limit)` — hybrid FTS + trigram search
  - Combined scoring: 70% FTS rank + 30% trigram similarity

### 2. RagProvider (`server/_core/ragProvider.ts`)
- Implements `ContextProvider` interface from Phase 1
- **Hybrid search**: Combines PostgreSQL full-text search (`ts_rank_cd`) with trigram similarity (`pg_trgm`)
- **Dual source search**: Queries both `document_chunks` and `data_records` in parallel
- **Fallback**: When FTS functions aren't available (pre-migration), falls back to keyword matching on existing data
- **Configurable**: `maxChunks`, `maxRecords`, `minScore`, `includeMetadata`
- **Query extraction**: Strips common question phrases ("tell me about", "what is", etc.) to improve search relevance

### 3. Streaming Support
- **LLM layer** (`server/_core/llm.ts`): Added `invokeLLMStream()` — returns `ReadableStream<Uint8Array>` for SSE streaming
- **Model Gateway** (`server/_core/modelGateway.ts`): Added `modelGatewayInvokeStream()` — wraps streaming with model/provider metadata
- **HTTP endpoint** (`server/_core/index.ts`): `POST /api/agents/chat/stream` — Server-Sent Events endpoint with auth, RAG context assembly, and token-by-token streaming
- **Frontend** (`client/src/lib/trpc.ts`): `agentsApi.chatStream()` — async generator yielding content chunks from SSE stream

### 4. Context Builder Enhancement (`server/_core/contextBuilder.ts`)
- Added `createRagContextBuilder()` factory — registers `AgentInstructionsProvider` → `RagProvider` → `ConversationHistoryProvider`
- RAG context is injected between instructions and history for optimal LLM attention

### 5. Runtime Integration (`server/_core/agentRuntime.ts`)
- Added `useRag` config flag — lazily initializes RAG context builder when enabled
- Both `agents.chat` (router) and worker `processAgentRun()` now use `{ useRag: true }`

### 6. Playground Migration (`client/src/pages/Playground.tsx`)
- Switched from `intelligenceApi.ask()` to `agentsApi.chat()`
- Removed `intelligenceApi` import
- Chat now routes through the full runtime pipeline (RAG search → context assembly → LLM → execution recording)

---

## Files Changed

| File | Action | Lines Added |
|------|--------|-------------|
| `migrations/002_full_text_search.sql` | **NEW** | ~160 |
| `server/_core/ragProvider.ts` | **NEW** | ~280 |
| `server/_core/llm.ts` | Modified | +45 |
| `server/_core/modelGateway.ts` | Modified | +30 |
| `server/_core/contextBuilder.ts` | Modified | +10 |
| `server/_core/agentRuntime.ts` | Modified | +20 |
| `server/_core/index.ts` | Modified | +95 |
| `server/routers/agents.ts` | Modified | +1 |
| `server/worker.ts` | Modified | +1 |
| `client/src/lib/trpc.ts` | Modified | +30 |
| `client/src/pages/Playground.tsx` | Modified | -5/+10 |

---

## Architecture Decisions

1. **PostgreSQL FTS over external vector DB**: Chose native `pg_trgm` + `tsvector` to avoid external dependencies. Supabase supports both natively. This provides 80% of RAG value with 20% of the complexity.

2. **Hybrid scoring (70/30 FTS/trigram)**: Full-text search handles semantic relevance; trigram handles exact/partial matching. The 70/30 weighting prioritizes semantic understanding while preserving fuzzy matching.

3. **Fallback keyword search**: If the FTS migration hasn't been applied yet, the `RagProvider` gracefully degrades to simple keyword matching on existing `content` and `searchableText` columns.

4. **Streaming via SSE (not WebSocket)**: Server-Sent Events over HTTP is simpler, works through proxies, and doesn't require WebSocket infrastructure. The `chatStream` async generator on the frontend provides a clean API.

5. **Lazy context builder initialization**: The `AgentRuntime` lazily creates the RAG context builder only when `useRag: true` is set, avoiding unnecessary DB queries for non-RAG calls.

---

## What's NOT in Phase 2 (By Design)

- Embedding generation / vector search (pgvector)
- Semantic chunking (current: fixed 3500-char windows)
- Reranking / cross-encoder
- Conversation memory / summarization
- Tool calling / function execution
- Workflow execution
- Haier-specific configuration
- Frontend streaming UI (async generator ready, Playground still uses non-streaming `agents.chat`)

---

## Prerequisites

**Migration must be applied before FTS works:**

```bash
psql $DATABASE_URL -f migrations/002_full_text_search.sql
```

Until migration is applied:
- `RagProvider` falls back to keyword matching (functional but less powerful)
- `search_vector` columns don't exist (triggers won't fire)
- GIN indexes don't exist (slower search on large datasets)

---

## Test Results

### Unit Tests (37/37 passing)
All Phase 1 tests continue to pass. No regressions.

### Build Verification
- Server: `dist/index.js` 210.2kb, `dist/worker.js` 87.4kb
- Client: `index-KTXHrLoO.js` 772.45kb

---

## Acceptance Criteria Checklist

- [x] RagProvider searches document chunks using hybrid FTS + trigram
- [x] RagProvider searches data records using hybrid FTS + trigram
- [x] Fallback search works when FTS migration not applied
- [x] RagProvider integrates with ContextBuilder (injected between instructions and history)
- [x] AgentRuntime supports `useRag` flag
- [x] `invokeLLMStream()` returns streaming ReadableStream
- [x] `POST /api/agents/chat/stream` SSE endpoint works with auth
- [x] `agentsApi.chatStream()` async generator available on frontend
- [x] Playground uses `agents.chat` instead of `intelligence.ask`
- [x] All 37 unit tests pass
- [x] Server + client builds succeed

---

## Next Phase (Phase 3: Tool Calling & Memory)

1. Tool registry system — define tools with JSON Schema parameters
2. Tool execution pipeline — LLM generates tool calls, runtime executes them
3. Conversation memory — summarization + long-term memory storage
4. Agent versioning — track instruction/purpose changes over time
5. Enhanced Playground — streaming UI, tool call visualization, source citations

---

## Rollback Plan

1. Revert Playground to `intelligenceApi.ask()` (change import + sendMessage)
2. Remove `chatStream` from `agentsApi` (frontend)
3. Remove `/api/agents/chat/stream` endpoint (server)
4. Remove `useRag: true` from runtime configs
5. Core modules (`ragProvider.ts`, streaming functions) are inert if unused
6. Database migration is additive only (new columns + indexes + functions) — safe to keep
