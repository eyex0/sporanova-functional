# SOPRANOVA — Phase 1 Implementation Plan

## Agent Runtime Foundation

**Date:** September 2, 2026
**Mode:** Implementation
**Phase:** 1 of 8

---

## Current Flow

```
agents.runNow (tRPC mutation)
  ↓
Insert agent_runs row (status: "pending")
  ↓
Enqueue job (type: "agent.run")
  ↓
Worker polls jobs table
  ↓
processAgentRun()
  ↓
Load agent from DB
  ↓
invokeLLM() — single call, no context building
  ↓
Save response to agent_runs.output
  ↓
Update agent status to "idle"
```

**Problems:**
- No context building (just system prompt + instruction)
- No conversation history included
- No model configuration per agent
- No execution tracing
- No usage/cost tracking
- No extension points for RAG, tools, memory
- Hardcoded model from ENV.ai.model
- Worker bypasses tenant authorization

---

## Target Flow

```
agents.chat (tRPC mutation)
  ↓
AgentRuntime.execute(request)
  ↓
Load agent (with tenant validation)
  ↓
Build context (ContextBuilder)
  ├── Agent instructions (purpose)
  ├── Conversation history
  ├── [future: Knowledge/RAG]
  ├── [future: Memory]
  └── [future: Tools]
  ↓
ModelGateway.invoke(context)
  ↓
LLM provider (via abstraction)
  ↓
Runtime result (response + metadata)
  ↓
Save to conversation (messages table)
  ↓
Record execution trace (agent_runs)
  ↓
Return to caller
```

---

## Files to Create

| File | Purpose |
|------|---------|
| `server/_core/modelGateway.ts` | Provider abstraction wrapping `invokeLLM` |
| `server/_core/contextBuilder.ts` | Assembles context from agent + conversation |
| `server/_core/agentRuntime.ts` | Core execution engine |

## Files to Modify

| File | Change |
|------|--------|
| `server/routers/agents.ts` | Add `chat` procedure, keep `runNow` for compat |
| `server/worker.ts` | Update `processAgentRun` to use runtime |
| `client/src/lib/trpc.ts` | Add `agentsApi.chat` |

---

## Database Changes

**None for Phase 1.** The existing `agent_runs` table has all required fields:
- `id`, `workspaceId`, `agentId`, `status`, `triggerType`, `progress`
- `input` (jsonb), `output` (jsonb), `errorMessage`
- `startedAt`, `completedAt`, `createdById`

We will store runtime metadata in the existing `output` jsonb field:
```json
{
  "content": "response text",
  "model": "openai/gpt-4o",
  "provider": "openrouter",
  "usage": { "prompt_tokens": 100, "completion_tokens": 50, "total_tokens": 150 },
  "latencyMs": 1200,
  "iterations": 1
}
```

---

## API Changes

### New: `agents.chat`

```typescript
agents.chat
  .input({
    workspaceId: number,
    agentId: number,
    conversationId: number,
    message: string
  })
  .mutation → { id, content, kind, sources? }
```

### Preserved: `agents.runNow`

Remains for backward compatibility. Routes through the same runtime.

### Preserved: `intelligence.ask`

Remains working. Will be deprecated after frontend migration.

---

## Security Considerations

- Every runtime execution validates workspace membership via `workspaceProcedure`
- Agent must belong to the workspace (existing `workspaceAgent` check)
- Conversation must belong to the workspace (existing `ensureConversation` check)
- No cross-tenant access possible
- LLM provider errors are scrubbed before returning to client

---

## Testing Strategy

| Test | Type |
|------|------|
| AgentRuntime executes valid agent | Unit |
| ContextBuilder includes agent instructions | Unit |
| ContextBuilder includes conversation history | Unit |
| ModelGateway calls through abstraction | Unit |
| Agent execution persisted to agent_runs | Integration |
| Failed model call produces failed execution | Unit |
| Unauthorized workspace access rejected | Integration |
| agents.chat invokes runtime | Integration |
| intelligence.ask remains compatible | Integration |
| No cross-tenant agent access | Unit |

---

## Rollback Strategy

1. **Agent Runtime:** Feature-flag `agents.chat` behind env var. If broken, disable and fall back to `intelligence.ask`.
2. **Worker:** Keep original `processAgentRun` as fallback. New runtime is called from worker but original code path preserved.
3. **Frontend:** Frontend still calls `intelligenceApi.ask`. No frontend changes required for Phase 1.

---

## Acceptance Criteria

- [ ] `agents.chat` accepts workspaceId, agentId, conversationId, message
- [ ] Agent instructions are included in system prompt
- [ ] Conversation history is included in context (last 20 messages)
- [ ] Model is resolved from ENV.ai.model (Phase 1: no per-agent model yet)
- [ ] Response is saved to conversation messages
- [ ] Execution metadata is saved to agent_runs.output
- [ ] `agents.runNow` still works (routes through runtime)
- [ ] `intelligence.ask` still works (unchanged)
- [ ] Failed model calls produce proper error responses
- [ ] No cross-tenant agent access
- [ ] All existing tests pass
- [ ] New tests pass
- [ ] TypeScript builds cleanly
