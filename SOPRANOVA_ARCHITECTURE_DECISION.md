# SOPRANOVA — Architecture Decision & Migration Plan

**Date:** September 2, 2026
**Mode:** READ-ONLY — No code modifications
**Auditor:** Architecture Review

---

## Table of Contents

1. [Executive Decision](#1-executive-decision)
2. [Current Architecture](#2-current-architecture)
3. [Target Architecture](#3-target-architecture)
4. [Current → Target Mapping](#4-current--target-mapping)
5. [Agent Runtime Design](#5-agent-runtime-design)
6. [Model Gateway](#6-model-gateway)
7. [Knowledge Architecture](#7-knowledge-architecture)
8. [Tool Architecture](#8-tool-architecture)
9. [Workflow Architecture](#9-workflow-architecture)
10. [Memory Architecture](#10-memory-architecture)
11. [Database Evolution](#11-database-evolution)
12. [API Evolution](#12-api-evolution)
13. [Frontend Evolution](#13-frontend-evolution)
14. [Multi-Tenancy Strategy](#14-multi-tenancy-strategy)
15. [Haier Architecture](#15-haier-architecture)
16. [Migration Strategy](#16-migration-strategy)
17. [Risks](#17-risks)
18. [Architectural Decisions](#18-architectural-decisions)
19. [Recommended Development Order](#19-recommended-development-order)
20. [Definition of Done](#20-definition-of-done)

---

## 1. Executive Decision

### Critical Architecture Decision: Agent Runtime Before RAG

**Decision:** Implement the Agent Runtime abstraction BEFORE building RAG.

**Reasoning:**

1. **Agent Runtime is the spine.** RAG, tools, memory, and workflows are all capabilities consumed by the Agent Runtime. Without it, each feature must invent its own invocation, context-building, and response handling. Building RAG first means creating a parallel path that must later be merged into the Agent Runtime — doubling work.

2. **RAG requires streaming, tool-calling loops, and iteration limits — all Agent Runtime concepts.** If you build RAG independently, you will build a hardcoded invocation path (the current `intelligence.ask`) that cannot later support tools, multi-turn reasoning, or human approval. You will throw it away.

3. **The Agent Runtime can deliver value immediately** without RAG. An agent that can follow instructions, call a webhook, create a ticket, or route a conversation already solves Haier-tier problems. RAG makes it smarter. Tools make it useful. Both need the Runtime.

4. **Incremental migration is safer.** The current `intelligence.ask` becomes the Agent Runtime's "simple invoke" mode. Adding RAG, tools, and memory later are additive — each plugs into the existing Runtime's Context Builder without rewriting the core loop.

5. **The existing worker already proves the pattern.** `processAgentRun` in `server/worker.ts` already does: load agent → call LLM → save result. The Agent Runtime formalizes this into a reusable, configurable, observable execution engine.

**Build order:** Agent Runtime → Streaming → RAG → Tools → Workflows → Memory → Channels → Haier.

---

## 2. Current Architecture

### 2.1 What Exists

```
React 19 + Vite 7 + Tailwind v4 + shadcn/ui
       ↓ fetch() with credentials:include + superjson
Express 4 + tRPC v11 (superjson transformer)
       ↓ workspaceProcedure (RBAC middleware)
PostgreSQL (Supabase) + Drizzle ORM
       ↓ SQL queries
Background Worker (polling jobs table)
       ↓ invokeLLM()
OpenRouter (OpenAI-compatible) → openai/gpt-4o
```

### 2.2 Current tRPC Routers (67 procedures)

| Router | Procedures | Purpose |
|--------|-----------|---------|
| `auth` | 6 | Register, login, logout, password reset |
| `workspaces` | 7 | CRUD, members, onboarding |
| `agents` | 6 | CRUD, setStatus, runs, runNow |
| `conversations` | 5 | CRUD, messages, search |
| `intelligence` | 1 | `ask` — single LLM call, no RAG, no streaming |
| `dataSources` | 5 | CRUD, configureHttp, sync |
| `documents` | 4 | CRUD, upload, accessUrl |
| `memory` | 1 | Summary (counts of docs/sources/chunks) |
| `workflows` | 5 | CRUD, runNow, runs |
| `channels` | 3 | list, configure, disable, getEmbedCode |
| `analytics` | 4 | overview, segments, topics, sentiment, trends |
| `helpdesk` | 6 | ticket CRUD, messages, inboxes |
| `contacts` | 5 | CRUD, import, export |
| `leads` | 5 | CRUD, convert, export |
| `outbound` | 5 | campaign CRUD, send, stats |
| `notifications` | 3 | list, markRead, markAllRead |
| `audit` | 1 | list |
| `dashboard` | 2 | overview, runSummary |
| `preferences` | 3 | get, updateProfile, update |

### 2.3 Current Database (25 tables, 18 enums)

**Core entities:** users, organizations, workspaces, memberships, jobs, auth_sessions, oauth_accounts, user_preferences, password_reset_tokens

**Agent system:** agents, agent_runs

**Data layer:** documents, document_chunks, data_sources, data_source_runs, data_records

**Conversations:** conversations, messages, message_sources, insights

**CRM:** contacts, leads, tickets, ticket_messages

**Channels:** channels, campaigns

**Automation:** workflows, workflow_nodes, workflow_runs

**Infrastructure:** integrations, notifications, audit_logs, business_metrics

### 2.4 What Is Missing

| Category | Missing |
|----------|---------|
| Agent Runtime | No tool-calling loop, no streaming, no iteration limits, no tracing |
| RAG | No embeddings, no vector search, no chunking strategy |
| Tools | No tool registry, no execution engine, no integration connectors |
| Memory | No short-term or long-term memory (only counts chunks) |
| Model Gateway | Single provider (OpenRouter), no fallback, no per-agent model selection |
| Streaming | No SSE/WebSocket streaming for responses |
| Workflows | Only notification actions — no AI, condition, tool, or API nodes |
| Evaluation | No test sets, no scoring, no regression detection |
| Observability | Structured logging only — no traces, no spans, no latency metrics |
| Multi-tenancy | Workspace-level isolation only — no RLS, no org-level isolation |
| API keys | No external API access |
| Agent versioning | No version history, no rollback |
| Integrations | `integrations` table exists but no connector framework |

---

## 3. Target Architecture

### 3.1 Core Principles

1. **SOPRANOVA Core is the platform.** Customer solutions (Haier, Samsung, etc.) are configurations on top.
2. **Do not rebuild.** Evolve the existing Express/tRPC/React stack.
3. **Separation of concerns.** Each subsystem has a clear boundary.
4. **Tenant isolation first.** Every query is scoped to workspace.
5. **Observable by default.** Every agent action is traceable.

### 3.2 Target System Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                    SOPRANOVA CORE PLATFORM                    │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────┐  ┌──────────────┐  ┌─────────────────────┐ │
│  │   Channel    │  │   Channel    │  │    Channel          │ │
│  │   Adapter    │  │   Adapter    │  │    Adapter          │ │
│  │   (Widget)   │  │   (WhatsApp) │  │    (Voice)          │ │
│  └──────┬──────┘  └──────┬───────┘  └─────────┬───────────┘ │
│         │                │                      │             │
│         └────────────────┼──────────────────────┘             │
│                          ↓                                    │
│  ┌───────────────────────────────────────────────────────┐   │
│  │               Conversation Service                     │   │
│  │  (CRUD, routing, thread management, handoff)           │   │
│  └───────────────────────┬───────────────────────────────┘   │
│                          ↓                                    │
│  ┌───────────────────────────────────────────────────────┐   │
│  │                  Agent Runtime                         │   │
│  │                                                        │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐│   │
│  │  │   Context    │  │    Model     │  │    Tool      ││   │
│  │  │   Builder    │  │   Gateway    │  │   Executor   ││   │
│  │  │              │  │              │  │              ││   │
│  │  │ - Agent cfg  │  │ - Provider   │  │ - Registry   ││   │
│  │  │ - Memory     │  │ - Routing    │  │ - Dispatch   ││   │
│  │  │ - Knowledge  │  │ - Fallback   │  │ - Audit      ││   │
│  │  │ - Business   │  │ - Cost       │  │ - Retry      ││   │
│  │  └──────────────┘  └──────────────┘  └──────────────┘│   │
│  │                                                        │   │
│  │  Execution Loop:                                       │   │
│  │    1. Build context                                    │   │
│  │    2. Invoke model                                     │   │
│  │    3. If tool_call → execute → loop to 2              │   │
│  │    4. If finish_reason=stop → return response          │   │
│  │    5. If max_iterations → force stop                   │   │
│  └───────────────────────┬───────────────────────────────┘   │
│                          ↓                                    │
│  ┌──────────────────┐  ┌──────────────────┐                  │
│  │  Knowledge/RAG   │  │     Memory       │                  │
│  │                  │  │                  │                  │
│  │  - Embeddings    │  │  - Short-term    │                  │
│  │  - pgvector      │  │  - Long-term     │                  │
│  │  - Retrieval     │  │  - Agent         │                  │
│  │  - Reranking     │  │  - Organization  │                  │
│  └──────────────────┘  └──────────────────┘                  │
│                                                              │
│  ┌───────────────────────────────────────────────────────┐   │
│  │              Workflow Engine (Deterministic)           │   │
│  │                                                        │   │
│  │  Nodes: START → AI → CONDITION → TOOL → API           │   │
│  │         → HUMAN_APPROVAL → WAIT → NOTIFICATION → END  │   │
│  │                                                        │   │
│  │  Separate from Agent Runtime.                         │   │
│  │  Workflows can invoke Agent Runtime for AI decisions. │   │
│  └───────────────────────────────────────────────────────┘   │
│                                                              │
│  ┌──────────────────┐  ┌──────────────────┐                  │
│  │   Integration    │  │   Analytics &    │                  │
│  │   Framework      │  │   Evaluation     │                  │
│  │                  │  │                  │                  │
│  │  - Salesforce    │  │  - Traces        │                  │
│  │  - WhatsApp      │  │  - Metrics       │                  │
│  │  - Custom API    │  │  - Scoring       │                  │
│  └──────────────────┘  └──────────────────┘                  │
│                                                              │
│  ┌───────────────────────────────────────────────────────┐   │
│  │              Security & Multi-Tenancy                  │   │
│  │                                                        │   │
│  │  - PostgreSQL RLS (workspace scope)                   │   │
│  │  - API key management                                 │   │
│  │  - Audit logging                                      │   │
│  │  - Encryption at rest                                 │   │
│  └───────────────────────────────────────────────────────┘   │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

### 3.3 Subsystem Responsibilities

#### Agent Runtime
**Responsibility:** Execute an agent's instruction through an iterative LLM + tool loop.
- Accepts: agent ID, user message, conversation context
- Builds: system prompt, context (memory + knowledge + instructions)
- Executes: model calls, tool calls, up to N iterations
- Produces: final response, tool call traces, cost/token usage
- Does NOT: manage conversations, store memory, embed documents, or define tools

#### Workflow Engine
**Responsibility:** Execute deterministic, multi-step business processes.
- Nodes: START, AI, CONDITION, TOOL, API, HUMAN_APPROVAL, WAIT, NOTIFICATION, END
- State machine with persistence, retries, branching, and idempotency
- Can invoke Agent Runtime for AI decision nodes
- Completely separate from the Agent Runtime execution loop
- Deterministic: same inputs → same execution path (excluding AI nodes)

#### Tool System
**Responsibility:** Define, authenticate, and execute external tool calls.
- Tool Registry: schema, permissions, authentication, timeout
- Tool Executor: dispatch calls, handle responses, audit
- Integration Connector: wraps external APIs (Salesforce, WhatsApp, custom)
- Tools are consumed by Agent Runtime and Workflow Engine

#### Knowledge / RAG
**Responsibility:** Ingest, embed, and retrieve knowledge for agent grounding.
- Upload → Extract → Clean → Chunk → Embed → pgvector
- Retrieval: similarity search + metadata filtering + reranking
- Scoped to: organization, workspace, agent, language, product, category

#### Memory
**Responsibility:** Provide context about the user, agent, and organization over time.
- Short-term: conversation window (last N messages)
- Long-term: user facts, preferences, interaction history
- Agent memory: what the agent has learned across conversations
- Organization memory: shared knowledge, policies, decisions

#### Model Gateway
**Responsibility:** Abstract LLM providers, route requests, manage fallback.
- Supports: OpenAI, Anthropic, Google, OpenRouter, local models
- Per-agent model selection with fallback chains
- Cost tracking, latency metrics, rate limiting

#### Integration Framework
**Responsibility:** Connect to external services through configurable connectors.
- Connector definition: authentication, API spec, mapping
- Agent tools are built on top of connectors
- Workflow actions can invoke connectors

#### Channel Framework
**Responsibility:** Adapt incoming messages from different channels into a uniform format.
- Channels: Widget, WhatsApp, Voice, Email, Slack, Instagram, SMS
- Outbound: send responses back through the originating channel
- Human handoff: route to human agent when needed

---

## 4. Current → Target Mapping

### 4.1 Module-by-Module Mapping

| Current Module | Target Module | Action | Why | Risk |
|---|---|---|---|---|
| `auth` router | Auth + API Keys | **EXTEND** | Add API key auth alongside session auth | Low — additive |
| `workspaces` router | Org/Workspace | **KEEP** | Multi-tenant hierarchy already works | None |
| `agents` router | Agent Registry | **EXTEND** | Add model config, tool bindings, knowledge bindings, versioning | Low — add fields |
| `agent_runs` table | Agent Runtime | **REPLACE** | Current runs are fire-and-forget LLM calls. Target: iterative loop with tool calls, traces, cost | Medium — new worker logic |
| `conversations` router | Conversation Service | **EXTEND** | Add agent binding, channel binding, handoff state | Low — add columns |
| `intelligence.ask` | Agent Runtime | **REPLACE** | Current: hardcoded LLM call. Target: full runtime loop | Medium — core change |
| `documents` router | Knowledge System | **EXTEND** | Add embeddings table, embedding pipeline, vector search | Medium — new tables |
| `document_chunks` table | Knowledge System | **EXTEND** | Add embedding vector column (pgvector) | Low — column add |
| `data_sources` router | Data Connectors | **KEEP** | HTTP data source sync is a valid connector pattern | None |
| `workflows` router | Workflow Engine | **REPLACE** | Current: notification-only. Target: full DAG with AI/tool nodes | High — new engine |
| `workflow_nodes` table | Workflow Engine | **EXTEND** | Add node types, edges, configuration schemas | Medium |
| `channels` router | Channel Framework | **EXTEND** | Add inbound/outbound routing, WhatsApp, voice adapters | Medium |
| `analytics` router | Analytics & Evaluation | **EXTEND** | Add traces, scores, latency metrics | Low — additive |
| `helpdesk` router | Helpdesk | **KEEP** | Ticket system works well. Add AI-assisted triage later | None |
| `contacts` router | CRM | **KEEP** | Contact management is solid | None |
| `leads` router | CRM | **KEEP** | Lead management is solid | None |
| `outbound` router | Outbound | **KEEP** | Campaign system works | None |
| `notifications` router | Notifications | **KEEP** | Notification system works | None |
| `audit` router | Audit Logs | **KEEP** | Audit trail works | None |
| `memory` router | Memory System | **REPLACE** | Current: counts only. Target: short/long-term memory store | Medium |
| `llm.ts` | Model Gateway | **EXTEND** | Add provider abstraction, per-agent model selection, fallback | Medium |
| `worker.ts` | Worker | **EXTEND** | Add agent runtime execution, embedding pipeline, workflow engine | High — core change |
| `DashboardLayout` | Dashboard | **EXTEND** | Add agent builder, tools, knowledge sections | Low — UI only |
| `Playground` | Agent Builder | **EXTEND** | Add model picker, tool selection, knowledge binding, streaming | Medium |
| `e2e-test.mjs` | Test Suite | **EXTEND** | Add agent runtime, RAG, tool, workflow tests | Low |

### 4.2 What Stays Untouched

- `auth` session management (cookie-based, bcrypt, jose)
- `organizations` / `workspaces` / `memberships` hierarchy
- `memberships` RBAC (owner/admin/member/viewer)
- `user_preferences` settings
- `password_reset_tokens` flow
- `oauth_accounts` Google OAuth flow
- `contacts` / `leads` / `tickets` / `ticket_messages` CRM layer
- `channels` (widget, help_page, center_stage types)
- `campaigns` outbound system
- `integrations` connection store
- `audit_logs` trail
- `notifications` system
- `business_metrics` aggregation
- Frontend design system (shadcn/ui, Tailwind, Geist font)
- React 19 + Vite 7 + wouter routing
- tRPC v11 + superjson serialization
- Express server + Helmet + CORS + rate limiting
- Worker polling architecture

---

## 5. Agent Runtime Design

### 5.1 Request Lifecycle

```
1.  Receive user message (from channel or API)
2.  Resolve agent configuration (model, tools, knowledge, instructions)
3.  Load conversation history (short-term memory)
4.  Load user memory (long-term memory)
5.  Retrieve relevant knowledge (RAG query)
6.  Build context:
      a. System prompt (agent instructions + business context)
      b. Knowledge context (retrieved chunks)
      c. Memory context (user facts, conversation summary)
      d. Conversation history (last N messages)
      e. Tool definitions (available tools for this agent)
7.  Invoke model gateway
8.  Parse response
9.  If tool_call:
      a. Validate tool permissions
      b. Execute tool with timeout
      c. Record tool call trace
      d. Append tool result to context
      e. Increment iteration counter
      f. Go to step 7
10. If finish_reason=stop:
      a. Save assistant message to conversation
      b. Update memory (extract facts from conversation)
      c. Record analytics (tokens, latency, cost)
      d. Return final response
11. If max_iterations reached:
      a. Force stop with summary response
      b. Record forced stop event
      c. Return partial response
12. If error:
      a. Record error trace
      b. If retryable and retries < max: retry step 7
      c. Else: return error to user
```

### 5.2 Pseudocode

```typescript
interface AgentRuntimeConfig {
  agentId: number;
  workspaceId: number;
  maxIterations: number;        // default: 10
  timeoutMs: number;            // default: 120_000
  maxRetries: number;           // default: 2
  streaming: boolean;           // default: false
}

interface RuntimeContext {
  agent: Agent;
  conversation: Conversation;
  messages: Message[];
  knowledge: KnowledgeChunk[];
  memory: MemoryContext;
  tools: ToolDefinition[];
  model: ModelConfig;
}

interface RuntimeResult {
  response: string;
  toolCalls: ToolCallTrace[];
  usage: TokenUsage;
  cost: number;
  iterations: number;
  latencyMs: number;
  traces: TraceSpan[];
}

async function executeAgentRuntime(
  config: AgentRuntimeConfig,
  userMessage: string
): Promise<RuntimeResult> {
  const startTime = Date.now();
  const traces: TraceSpan[] = [];
  const toolCalls: ToolCallTrace[] = [];

  // 1. Load agent configuration
  const agent = await loadAgent(config.agentId, config.workspaceId);
  traces.push({ name: "load_agent", durationMs: elapsed(startTime) });

  // 2. Load conversation and history
  const conversation = await loadConversation(config.workspaceId, userMessage);
  const messages = await loadMessageHistory(config.workspaceId, conversation.id, 20);
  traces.push({ name: "load_history", durationMs: elapsed(startTime) });

  // 3. Build context
  const context = await buildContext(agent, conversation, messages);
  traces.push({ name: "build_context", durationMs: elapsed(startTime) });

  // 4. Iterative execution loop
  let iterations = 0;
  let totalUsage: TokenUsage = { prompt: 0, completion: 0, total: 0 };
  let totalCost = 0;

  while (iterations < config.maxIterations) {
    iterations++;

    // 4a. Invoke model
    const modelStart = Date.now();
    const result = await invokeModel(context);
    traces.push({ name: `model_call_${iterations}`, durationMs: elapsed(modelStart) });

    totalUsage = addUsage(totalUsage, result.usage);
    totalCost += calculateCost(result.model, result.usage);

    // 4b. Check for tool calls
    if (result.toolCalls && result.toolCalls.length > 0) {
      for (const toolCall of result.toolCalls) {
        // Validate permissions
        await validateToolPermission(toolCall.name, agent);

        // Execute tool
        const toolStart = Date.now();
        const toolResult = await executeTool(toolCall, config.workspaceId);
        traces.push({ name: `tool_${toolCall.name}`, durationMs: elapsed(toolStart) });

        toolCalls.push({
          name: toolCall.name,
          arguments: toolCall.arguments,
          result: toolResult,
          durationMs: elapsed(toolStart),
        });

        // Append tool result to context
        context.messages.push({
          role: "tool",
          tool_call_id: toolCall.id,
          content: JSON.stringify(toolResult),
        });
      }
      continue; // Loop back to model call
    }

    // 4c. Final response
    const response = extractResponse(result);

    // Save to conversation
    await saveMessage(config.workspaceId, conversation.id, {
      role: "assistant",
      content: response,
      metadata: { toolCalls: toolCalls.length, iterations },
    });

    // Record analytics
    await recordAnalytics({
      agentId: config.agentId,
      workspaceId: config.workspaceId,
      conversationId: conversation.id,
      tokens: totalUsage,
      cost: totalCost,
      latencyMs: elapsed(startTime),
      iterations,
      toolCallsCount: toolCalls.length,
    });

    return {
      response,
      toolCalls,
      usage: totalUsage,
      cost: totalCost,
      iterations,
      latencyMs: elapsed(startTime),
      traces,
    };
  }

  // Max iterations reached
  await recordAnalytics({
    agentId: config.agentId,
    workspaceId: config.workspaceId,
    forcedStop: true,
    iterations,
  });

  return {
    response: "I was unable to complete this request within the allowed steps.",
    toolCalls,
    usage: totalUsage,
    cost: totalCost,
    iterations,
    latencyMs: elapsed(startTime),
    traces,
  };
}
```

### 5.3 Context Builder

```typescript
async function buildContext(
  agent: Agent,
  conversation: Conversation,
  messages: Message[]
): Promise<RuntimeContext> {
  // 1. Load agent configuration
  const agentConfig = agent.configuration as AgentConfig;

  // 2. Load knowledge (RAG)
  const knowledge = await retrieveKnowledge({
    workspaceId: agent.workspaceId,
    agentId: agent.id,
    query: messages[messages.length - 1]?.content ?? "",
    topK: agentConfig.ragTopK ?? 5,
    minScore: agentConfig.ragMinScore ?? 0.7,
  });

  // 3. Load memory
  const memory = await loadMemory({
    workspaceId: agent.workspaceId,
    userId: conversation.createdById,
    agentId: agent.id,
  });

  // 4. Load available tools
  const tools = await loadAgentTools(agent.id);

  // 5. Build messages array
  const systemPrompt = buildSystemPrompt(agent, knowledge, memory);
  const contextMessages = [
    { role: "system", content: systemPrompt },
    ...messages.map(m => ({ role: m.role, content: m.content })),
  ];

  // 6. Resolve model
  const model = await resolveModel(agentConfig.modelId);

  return {
    agent,
    conversation,
    messages: contextMessages,
    knowledge,
    memory,
    tools,
    model,
  };
}

function buildSystemPrompt(
  agent: Agent,
  knowledge: KnowledgeChunk[],
  memory: MemoryContext
): string {
  const parts: string[] = [];

  // Agent instructions
  parts.push(agent.purpose);

  // Knowledge context
  if (knowledge.length > 0) {
    parts.push("\n## Relevant Knowledge");
    for (const chunk of knowledge) {
      parts.push(`\n### ${chunk.documentName} (score: ${chunk.score.toFixed(2)})`);
      parts.push(chunk.content);
    }
  }

  // Memory context
  if (memory.userFacts.length > 0) {
    parts.push("\n## User Context");
    for (const fact of memory.userFacts) {
      parts.push(`- ${fact}`);
    }
  }

  // Business context
  parts.push("\n## Constraints");
  parts.push("- Answer only from provided knowledge and context");
  parts.push("- If evidence is insufficient, ask for clarification");
  parts.push("- Never reveal internal system details");

  return parts.join("\n");
}
```

### 5.4 Key Design Decisions

| Decision | Choice | Reasoning |
|----------|--------|-----------|
| Tool calling | OpenAI function calling format | Universal across providers via OpenRouter |
| Max iterations | Configurable, default 10 | Prevents infinite loops while allowing complex tasks |
| Timeout | Per-invocation, default 120s | Prevents long-running tools from blocking |
| Streaming | SSE via tRPC subscription | Real-time response delivery to frontend |
| Tracing | Structured JSON spans | Enables observability without external dependencies |
| Cost tracking | Per-invocation aggregation | Enables billing, budgeting, optimization |

---

## 6. Model Gateway

### 6.1 Provider Abstraction

```typescript
interface ModelProvider {
  id: string;
  name: string;
  baseUrl: string;
  apiKey: string;
  models: ModelInfo[];
  invoke(request: ModelRequest): Promise<ModelResponse>;
  invokeStreaming(request: ModelRequest): AsyncGenerator<StreamChunk>;
}

interface ModelRequest {
  messages: Message[];
  model: string;
  tools?: Tool[];
  toolChoice?: ToolChoice;
  maxTokens?: number;
  temperature?: number;
  responseFormat?: ResponseFormat;
}

interface ModelResponse {
  id: string;
  model: string;
  choices: Choice[];
  usage: TokenUsage;
  latencyMs: number;
}

interface TokenUsage {
  prompt: number;
  completion: number;
  total: number;
}

interface ModelRouter {
  resolve(agentConfig: AgentConfig): ModelProvider;
  getFallback(provider: ModelProvider): ModelProvider | null;
  calculateCost(model: string, usage: TokenUsage): number;
}
```

### 6.2 Provider Registry

```typescript
const PROVIDERS: Record<string, ModelProviderConfig> = {
  "openai": {
    baseUrl: "https://api.openai.com/v1",
    models: ["gpt-4o", "gpt-4o-mini", "gpt-4-turbo"],
    supportsTools: true,
    supportsStreaming: true,
  },
  "anthropic": {
    baseUrl: "https://api.anthropic.com/v1",
    models: ["claude-sonnet-4-20250514", "claude-3-5-haiku-20241022"],
    supportsTools: true,
    supportsStreaming: true,
  },
  "google": {
    baseUrl: "https://generativelanguage.googleapis.com/v1",
    models: ["gemini-2.0-flash", "gemini-1.5-pro"],
    supportsTools: true,
    supportsStreaming: true,
  },
  "openrouter": {
    baseUrl: "https://openrouter.ai/api/v1",
    models: ["openai/gpt-4o", "anthropic/claude-sonnet-4-20250514"],
    supportsTools: true,
    supportsStreaming: true,
  },
};
```

### 6.3 Agent Model Selection

```typescript
// Agent configuration includes model selection
interface AgentConfig {
  modelId?: string;          // e.g., "gpt-4o", "claude-sonnet-4-20250514"
  modelProvider?: string;    // e.g., "openai", "anthropic", "openrouter"
  fallbackModelId?: string;  // e.g., "gpt-4o-mini"
  temperature?: number;      // 0-2
  maxTokens?: number;        // 100-128000
  maxIterations?: number;    // 1-50
  toolTimeoutMs?: number;    // 5000-300000
}

// Resolution order:
// 1. Agent-specific model (agent.configuration.modelId)
// 2. Workspace default (workspace.preferences.defaultModel)
// 3. Environment default (ENV.ai.model)
```

---

## 7. Knowledge Architecture

### 7.1 Pipeline

```
Upload (file or URL)
  ↓
Extraction (PDF, DOCX, XLSX, CSV, HTML)
  ↓
Cleaning (normalize whitespace, remove artifacts)
  ↓
Chunking (semantic or fixed-size, with overlap)
  ↓
Metadata extraction (language, product, category, version)
  ↓
Embedding (OpenAI text-embedding-3-small or local)
  ↓
Storage (pgvector column on document_chunks)
  ↓
Retrieval (similarity search + metadata filtering)
  ↓
Reranking (optional: cross-encoder or LLM-based)
  ↓
Context injection (into Agent Runtime system prompt)
```

### 7.2 Metadata Schema

```typescript
interface ChunkMetadata {
  // Tenant isolation
  organizationId: number;
  workspaceId: number;
  agentId?: number;           // Optional: agent-specific knowledge

  // Document context
  documentId: number;
  documentName: string;
  chunkIndex: number;
  mimeType: string;

  // Classification (optional, for filtering)
  language?: string;           // "en", "de", "it", "zh"
  country?: string;            // "DE", "IT", "CN"
  product?: string;            // "washing-machine", "refrigerator"
  category?: string;           // "troubleshooting", "specification", "manual"
  version?: string;            // "v2.1", "2024-Q3"

  // Access control
  permissions?: string[];      // ["support", "engineering", "sales"]
}
```

### 7.3 Retrieval

```typescript
interface RetrievalQuery {
  workspaceId: number;
  agentId?: number;
  query: string;
  topK: number;
  minScore: number;
  filters?: {
    language?: string;
    country?: string;
    product?: string;
    category?: string;
  };
}

async function retrieveKnowledge(query: RetrievalQuery): Promise<KnowledgeChunk[]> {
  // 1. Embed the query
  const queryEmbedding = await embedText(query.query);

  // 2. Vector similarity search with metadata filters
  const results = await db.execute(sql`
    SELECT
      dc.id,
      dc.content,
      dc.metadata,
      1 - (dc.embedding <=> ${queryEmbedding}) AS score
    FROM document_chunks dc
    WHERE dc.workspace_id = ${query.workspaceId}
      AND dc.embedding IS NOT NULL
      ${query.agentId ? sql`AND (dc.metadata->>'agentId')::int = ${query.agentId}` : sql``}
      ${query.filters?.language ? sql`AND dc.metadata->>'language' = ${query.filters.language}` : sql``}
      ${query.filters?.product ? sql`AND dc.metadata->>'product' = ${query.filters.product}` : sql``}
    ORDER BY dc.embedding <=> ${queryEmbedding}
    LIMIT ${query.topK}
  `);

  // 3. Filter by minimum score
  return results.filter(r => r.score >= query.minScore);
}
```

### 7.4 Tenant Isolation

Every query is scoped to `workspaceId`. Knowledge can optionally be scoped to `agentId` for agent-specific knowledge bases. Organization-level knowledge sharing is achieved by sharing the same `organizationId` across workspaces.

---

## 8. Tool Architecture

### 8.1 Tool Definition

```typescript
interface ToolDefinition {
  id: string;
  name: string;
  description: string;
  inputSchema: JSONSchema;
  outputSchema: JSONSchema;
  permissions: ToolPermissions;
  authentication: ToolAuth;
  timeoutMs: number;
  retryCount: number;
  auditLevel: "none" | "input" | "full";
  tenantScope: "workspace" | "organization";
}

interface ToolPermissions {
  requiredRole: "viewer" | "member" | "admin" | "owner";
  requiredCapabilities?: string[];
}

interface ToolAuth {
  type: "none" | "api_key" | "oauth2" | "bearer";
  secretRef?: string;          // Reference to encrypted secret
  scopes?: string[];
}
```

### 8.2 Tool Executor

```typescript
async function executeTool(
  toolCall: ToolCall,
  workspaceId: number
): Promise<ToolResult> {
  const tool = await loadToolDefinition(toolCall.name);
  if (!tool) throw new ToolNotFoundError(toolCall.name);

  // 1. Validate permissions
  await validateToolPermissions(tool, workspaceId);

  // 2. Authenticate
  const authContext = await authenticateTool(tool, workspaceId);

  // 3. Validate input
  const input = validateInput(tool.inputSchema, toolCall.arguments);

  // 4. Execute with timeout
  const result = await withTimeout(
    toolExecutor(tool, input, authContext),
    tool.timeoutMs
  );

  // 5. Audit
  if (tool.auditLevel !== "none") {
    await auditToolCall({
      toolId: tool.id,
      workspaceId,
      input: tool.auditLevel === "full" ? input : undefined,
      result: tool.auditLevel === "full" ? result : undefined,
      durationMs: result.durationMs,
    });
  }

  return result;
}
```

### 8.3 Built-in Tool Categories

| Category | Tools | Description |
|----------|-------|-------------|
| HTTP | `http_request` | Make authenticated HTTP calls |
| Database | `query_database`, `update_database` | Read/write to workspace database |
| Storage | `upload_file`, `get_file_url` | File operations |
| Notification | `send_notification`, `send_email` | User notifications |
| CRM | `create_contact`, `update_contact`, `create_ticket` | CRM operations |
| Workflow | `trigger_workflow`, `get_workflow_status` | Workflow automation |
| Custom | User-defined via Integration Framework | Any external API |

### 8.4 Integration Framework

```typescript
interface IntegrationConnector {
  id: string;
  provider: string;          // "salesforce", "whatsapp", "custom"
  name: string;
  status: "connected" | "disconnected" | "error";
  configuration: Record<string, unknown>;
  authType: "api_key" | "oauth2" | "bearer";
  tools: ToolDefinition[];   // Tools this connector provides
}

// Example: Salesforce Connector
const salesforceConnector: IntegrationConnector = {
  id: "salesforce-1",
  provider: "salesforce",
  name: "Salesforce CRM",
  status: "connected",
  tools: [
    {
      name: "salesforce_create_case",
      description: "Create a support case in Salesforce",
      inputSchema: { /* ... */ },
      authentication: { type: "oauth2", secretRef: "salesforce-creds" },
    },
  ],
};
```

---

## 9. Workflow Architecture

### 9.1 Node Types

| Node Type | Purpose | Configuration |
|-----------|---------|---------------|
| `START` | Entry point | None |
| `AI` | Invoke Agent Runtime | agentId, prompt template, maxTokens |
| `CONDITION` | Branch based on value | field, operator, value, branches |
| `TOOL` | Execute a tool | toolName, input mapping |
| `API` | Make HTTP call | url, method, headers, body |
| `HUMAN_APPROVAL` | Pause for human review | assignee, message, timeout |
| `WAIT` | Delay execution | duration, unit |
| `NOTIFICATION` | Send notification | recipient, title, content |
| `END` | Terminate workflow | output mapping |

### 9.2 Execution Engine

```typescript
interface WorkflowExecution {
  id: number;
  workflowId: number;
  status: "pending" | "running" | "completed" | "failed" | "cancelled";
  currentNodeId: number | null;
  state: Record<string, unknown>;      // Shared state across nodes
  traces: NodeTrace[];
  startedAt: Date;
  completedAt?: Date;
}

async function executeWorkflow(
  workflowId: number,
  input: Record<string, unknown>
): Promise<WorkflowExecution> {
  const workflow = await loadWorkflow(workflowId);
  const execution = await createExecution(workflowId, input);

  let currentNode = getStartNode(workflow);

  while (currentNode && currentNode.nodeType !== "END") {
    const trace = { nodeId: currentNode.id, nodeType: currentNode.nodeType, startedAt: Date.now() };

    try {
      switch (currentNode.nodeType) {
        case "AI":
          const aiResult = await executeAgentRuntime({
            agentId: currentNode.configuration.agentId,
            workspaceId: workflow.workspaceId,
            maxIterations: 5,
            ...buildAIInput(currentNode.configuration, execution.state),
          });
          execution.state[currentNode.nodeKey] = aiResult;
          break;

        case "CONDITION":
          const conditionResult = evaluateCondition(
            currentNode.configuration,
            execution.state
          );
          break;

        case "TOOL":
          const toolResult = await executeTool(
            { name: currentNode.configuration.toolName, arguments: currentNode.configuration.input },
            workflow.workspaceId
          );
          execution.state[currentNode.nodeKey] = toolResult;
          break;

        case "API":
          const apiResult = await executeApiCall(
            currentNode.configuration,
            execution.state
          );
          execution.state[currentNode.nodeKey] = apiResult;
          break;

        case "HUMAN_APPROVAL":
          await pauseForApproval(execution, currentNode);
          return execution; // Resumed externally

        case "WAIT":
          await delay(currentNode.configuration.duration);
          break;

        case "NOTIFICATION":
          await sendNotification(currentNode.configuration, execution.state);
          break;
      }

      trace.completedAt = Date.now();
      trace.status = "completed";
      execution.traces.push(trace);

      currentNode = getNextNode(workflow, currentNode, execution.state);
    } catch (error) {
      trace.completedAt = Date.now();
      trace.status = "failed";
      trace.error = error instanceof Error ? error.message : "Unknown error";
      execution.traces.push(trace);

      execution.status = "failed";
      execution.completedAt = new Date();
      await saveExecution(execution);
      throw error;
    }
  }

  execution.status = "completed";
  execution.completedAt = new Date();
  await saveExecution(execution);
  return execution;
}
```

### 9.3 Separation from Agent Runtime

The Workflow Engine and Agent Runtime are separate systems:

| Aspect | Agent Runtime | Workflow Engine |
|--------|--------------|-----------------|
| Purpose | Interactive conversation | Deterministic business process |
| Execution | Iterative LLM + tool loop | Linear DAG traversal |
| State | Conversation context | Workflow state object |
| Human interaction | Real-time chat | Approval gates |
| Trigger | User message | API, schedule, event, manual |
| Can invoke the other? | No | Yes (via AI node) |

The Workflow Engine can invoke the Agent Runtime for AI decision nodes. The Agent Runtime does not invoke the Workflow Engine directly.

---

## 10. Memory Architecture

### 10.1 Memory Types

| Type | Scope | Storage | Retention | Use |
|------|-------|---------|-----------|-----|
| Short-term | Conversation | `messages` table | Conversation lifetime | Recent conversation context |
| Long-term (User) | Per-user | `memories` table | Permanent (configurable) | User facts, preferences |
| Agent | Per-agent | `agent_memories` table | Permanent | What agent has learned |
| Organization | Per-org | `organization_memories` table | Permanent | Shared knowledge, policies |

### 10.2 Memory Schema

```typescript
interface Memory {
  id: number;
  workspaceId: number;
  userId?: number;
  agentId?: number;
  organizationId?: number;
  type: "fact" | "preference" | "interaction_summary" | "policy";
  content: string;
  importance: number;         // 0-1, determines retrieval priority
  sourceConversationId?: number;
  createdAt: Date;
  updatedAt: Date;
  expiresAt?: Date;
  deletedAt?: Date;
}
```

### 10.3 Memory Operations

```typescript
// Extract facts from conversation after each interaction
async function extractAndStoreMemory(
  workspaceId: number,
  userId: number,
  agentId: number,
  conversation: Conversation
): Promise<void> {
  // 1. Use LLM to extract key facts from conversation
  const facts = await invokeLLM({
    model: "gpt-4o-mini",
    messages: [{
      role: "system",
      content: "Extract key facts, preferences, and important information from this conversation. Return as JSON array."
    }, {
      role: "user",
      content: conversation.summary
    }],
    responseFormat: { type: "json_object" },
  });

  // 2. Store each fact as a memory
  for (const fact of facts) {
    await db.insert(memories).values({
      workspaceId,
      userId,
      agentId,
      type: fact.type,
      content: fact.content,
      importance: fact.importance,
      sourceConversationId: conversation.id,
    });
  }
}

// Retrieve relevant memories for context building
async function retrieveMemories(query: {
  workspaceId: number;
  userId?: number;
  agentId?: number;
  limit?: number;
}): Promise<Memory[]> {
  return db.select()
    .from(memories)
    .where(and(
      eq(memories.workspaceId, query.workspaceId),
      query.userId ? eq(memories.userId, query.userId) : undefined,
      query.agentId ? eq(memories.agentId, query.agentId) : undefined,
      isNull(memories.deletedAt),
    ))
    .orderBy(desc(memories.importance))
    .limit(query.limit ?? 20);
}
```

### 10.4 Privacy & Deletion

- User memory is deleted when the user is deleted (CASCADE)
- Agent memory is deleted when the agent is deleted (CASCADE)
- Memory expiration is configurable per memory type
- Users can view and delete their memories via Settings
- Organization admins can manage organization-level memories

---

## 11. Database Evolution

### 11.1 New Tables Required

#### Phase 0: Agent Runtime Foundation

| Table | Why | Relationships | Tenant Scope | Indexes | When |
|-------|-----|---------------|-------------|---------|------|
| `embeddings` | Store vector embeddings for RAG | FK → document_chunks, documents | workspaceId | `(workspaceId, documentId)`, vector index | Now |
| `model_configs` | Per-agent and per-workspace model settings | FK → agents, workspaces | workspaceId | `(workspaceId, agentId)` | Now |
| `api_keys` | External API access | FK → workspaces, users | workspaceId | `(workspaceId, keyPrefix)` | Now |

#### Phase 1: Knowledge System

| Table | Why | Relationships | Tenant Scope | Indexes | When |
|-------|-----|---------------|-------------|---------|------|
| `knowledge_bases` | Group documents by purpose | FK → workspaces | workspaceId | `(workspaceId, name)` | Now |
| `knowledge_base_documents` | Link documents to knowledge bases | FK → knowledge_bases, documents | workspaceId | `(knowledgeBaseId, documentId)` | Now |

#### Phase 2: Memory System

| Table | Why | Relationships | Tenant Scope | Indexes | When |
|-------|-----|---------------|-------------|---------|------|
| `memories` | Long-term user/agent memory | FK → workspaces, users, agents | workspaceId | `(workspaceId, userId, type)`, `(workspaceId, agentId)` | Now |
| `agent_versions` | Version history for agents | FK → agents | workspaceId | `(agentId, version)` | Later |

#### Phase 3: Tool System

| Table | Why | Relationships | Tenant Scope | Indexes | When |
|-------|-----|---------------|-------------|---------|------|
| `tools` | Tool definitions | FK → workspaces | workspaceId | `(workspaceId, name)` | Now |
| `tool_executions` | Audit trail for tool calls | FK → tools, workspaces | workspaceId | `(workspaceId, toolId, createdAt)` | Now |
| `integration_connectors` | Extends existing `integrations` | FK → workspaces | workspaceId | `(workspaceId, provider)` | Now |

#### Phase 4: Workflow Engine

| Table | Why | Relationships | Tenant Scope | Indexes | When |
|-------|-----|---------------|-------------|---------|------|
| `workflow_edges` | Directed edges between nodes | FK → workflows, workflow_nodes | workspaceId | `(workflowId, sourceNodeId)` | Now |
| `workflow_versions` | Version history for workflows | FK → workflows | workspaceId | `(workflowId, version)` | Later |

#### Phase 5: Evaluation & Observability

| Table | Why | Relationships | Tenant Scope | Indexes | When |
|-------|-----|---------------|-------------|---------|------|
| `evaluation_datasets` | Test cases for agents | FK → workspaces, agents | workspaceId | `(workspaceId, agentId)` | Later |
| `evaluation_runs` | Evaluation results | FK → evaluation_datasets, agents | workspaceId | `(workspaceId, datasetId)` | Later |
| `traces` | Agent execution traces | FK → agents, conversations | workspaceId | `(workspaceId, agentId, createdAt)` | Now |
| `trace_spans` | Individual spans within traces | FK → traces | workspaceId | `(traceId, spanIndex)` | Now |

### 11.2 Table NOT Required

| Table | Why Not |
|-------|---------|
| `agent_knowledge_bases` | Use `agent.configuration.knowledgeBaseIds` JSONB — avoids join table for a flexible relationship |
| `user_memory` | Use `memories` table with `userId` filter — single table, simpler |
| `channel_configurations` | Use existing `channels.configuration` JSONB — already works |
| `notification_templates` | Use existing `notifications` table with type field |

---

## 12. API Evolution

### 12.1 tRPC Procedure Mapping

| Current Procedure | Target | Action | Notes |
|---|---|---|---|
| `auth.register` | `auth.register` | **KEEP** | |
| `auth.login` | `auth.login` | **KEEP** | |
| `auth.logout` | `auth.logout` | **KEEP** | |
| `auth.me` | `auth.me` | **KEEP** | |
| `auth.requestPasswordReset` | `auth.requestPasswordReset` | **KEEP** | |
| `auth.resetPassword` | `auth.resetPassword` | **KEEP** | |
| `workspaces.*` | `workspaces.*` | **KEEP** | All 7 procedures |
| `agents.list` | `agents.list` | **KEEP** | |
| `agents.get` | `agents.get` | **KEEP** | |
| `agents.create` | `agents.create` | **EXTEND** | Add model, tools, knowledge config |
| `agents.update` | `agents.update` | **EXTEND** | Add model, tools, knowledge config |
| `agents.setStatus` | `agents.setStatus` | **KEEP** | |
| `agents.delete` | `agents.delete` | **KEEP** | |
| `agents.runs` | `agents.runs` | **KEEP** | |
| `agents.runNow` | `agents.runNow` | **EXTEND** | Route through Agent Runtime |
| `conversations.*` | `conversations.*` | **KEEP** | All 5 procedures |
| `intelligence.ask` | `agents.chat` | **REPLACE** | Route through Agent Runtime, support streaming |
| `dataSources.*` | `dataSources.*` | **KEEP** | All 5 procedures |
| `documents.*` | `documents.*` | **KEEP** | All 4 procedures |
| `memory.summary` | `memory.summary` | **EXTEND** | Return actual memory, not just counts |
| `analytics.*` | `analytics.*` | **KEEP** | All 4 procedures |
| `workflows.*` | `workflows.*` | **KEEP** | All 5 procedures |
| `channels.*` | `channels.*` | **KEEP** | All 3 procedures |
| `helpdesk.*` | `helpdesk.*` | **KEEP** | All 6 procedures |
| `contacts.*` | `contacts.*` | **KEEP** | All 5 procedures |
| `leads.*` | `leads.*` | **KEEP** | All 5 procedures |
| `outbound.*` | `outbound.*` | **KEEP** | All 5 procedures |
| `notifications.*` | `notifications.*` | **KEEP** | All 3 procedures |
| `audit.list` | `audit.list` | **KEEP** | |
| `dashboard.*` | `dashboard.*` | **KEEP** | Both procedures |
| `preferences.*` | `preferences.*` | **KEEP** | All 3 procedures |

### 12.2 New Procedures

| Procedure | Type | Purpose |
|-----------|------|---------|
| `agents.chat` | mutation | Main agent interaction (replaces `intelligence.ask`) |
| `agents.chat.stream` | subscription | Streaming agent responses |
| `agents.versions` | query | Agent version history |
| `agents.rollback` | mutation | Rollback to previous agent version |
| `knowledge.list` | query | List knowledge bases |
| `knowledge.create` | mutation | Create knowledge base |
| `knowledge.delete` | mutation | Delete knowledge base |
| `tools.list` | query | List available tools |
| `tools.create` | mutation | Register custom tool |
| `tools.test` | mutation | Test tool execution |
| `memory.list` | query | List memories |
| `memory.delete` | mutation | Delete specific memory |
| `traces.list` | query | List agent traces |
| `traces.get` | query | Get trace detail |
| `apiKeys.list` | query | List API keys |
| `apiKeys.create` | mutation | Create API key |
| `apiKeys.revoke` | mutation | Revoke API key |

### 12.3 Deprecation Plan

| Procedure | Deprecation | Replacement |
|-----------|-------------|-------------|
| `intelligence.ask` | After Agent Runtime launch | `agents.chat` |

---

## 13. Frontend Evolution

### 13.1 Keep Existing Pages (Extend)

| Page | Current Purpose | Evolution |
|------|----------------|-----------|
| `Dashboard.tsx` | Overview KPIs | Add agent runtime metrics, cost, traces |
| `Playground.tsx` | Agent builder + chat | Add model picker, tool selection, knowledge binding, streaming |
| `Conversations.tsx` | Chat with agent | Add streaming, tool call visualization, source display |
| `Documents.tsx` | Upload documents | Add knowledge base management, embedding status |
| `DataSources.tsx` | Data source sync | Keep as-is |
| `Workflows.tsx` | Workflow list | Add visual editor, AI nodes, tool nodes |
| `Analytics.tsx` | Business metrics | Add agent metrics, cost, latency |
| `Settings.tsx` | Workspace settings | Add model configuration, API keys |
| `Integrations.tsx` | Integration list | Add tool registry, connector config |
| `Helpdesk.tsx` | Ticket system | Add AI-assisted triage |
| `Contacts.tsx` | Contact management | Keep as-is |
| `Leads.tsx` | Lead management | Keep as-is |
| `Channels.tsx` | Channel config | Add WhatsApp, voice, email setup |

### 13.2 New Pages

| Page | Purpose | Priority |
|------|---------|----------|
| `Tools.tsx` | Tool registry, test tools | P2 |
| `Knowledge.tsx` | Knowledge bases, embedding status | P1 |
| `Traces.tsx` | Agent execution traces, observability | P2 |
| `Evaluation.tsx` | Test sets, scoring, regression | P3 |
| `ApiKeys.tsx` | API key management | P2 |
| `AgentVersions.tsx` | Version history, rollback | P3 |

### 13.3 Navigation Updates

```
Current:                          Target:
├── Backstage                     ├── Backstage
├── Playground                    ├── Agent Builder (renamed)
├── Build                         ├── Build
│   ├── Data sources              │   ├── Knowledge bases (new)
│   ├── Documents                 │   ├── Documents
│   ├── Actions                   │   ├── Tools (new)
│   ├── Widgets                   │   ├── Integrations (renamed)
│   └── Procedures                │   └── Workflows (renamed)
├── Activity                      ├── Activity
│   ├── Conversations             │   ├── Conversations
│   ├── Leads                     │   ├── Leads
│   └── Collected data            │   └── Data sources (renamed)
├── Analytics                     ├── Analytics
│   ├── Chats                     │   ├── Overview
│   ├── Topics                    │   ├── Topics
│   └── Sentiment                 │   ├── Sentiment
│                                 │   └── Traces (new)
├── Contacts                      ├── Contacts
├── Channels                      ├── Channels
├── Integrations                  ├── Settings
├── Outbound                      │   ├── General
├── Helpdesk inbox                │   ├── Model configuration (new)
├── Settings                      │   ├── API keys (new)
└── Team                          │   └── Team
```

---

## 14. Multi-Tenancy Strategy

### 14.1 Current Isolation

All queries are scoped to `workspaceId` via the `workspaceProcedure` middleware. This is enforced at the application layer.

### 14.2 RLS Strategy

**Decision:** Introduce PostgreSQL RLS incrementally, starting with the most sensitive tables.

**Phase 1 (Now):** Enable RLS on tables containing PII or secrets:
- `users` — row-level by user ID
- `auth_sessions` — row-level by user ID
- `oauth_accounts` — row-level by user ID
- `password_reset_tokens` — row-level by user ID
- `contacts` — row-level by workspaceId
- `leads` — row-level by workspaceId

**Phase 2 (After Agent Runtime):** Enable RLS on agent-related tables:
- `agents` — row-level by workspaceId
- `agent_runs` — row-level by workspaceId
- `memories` — row-level by workspaceId
- `embeddings` — row-level by workspaceId

**Phase 3 (After Tool System):** Enable RLS on tool and integration tables:
- `tools` — row-level by workspaceId
- `tool_executions` — row-level by workspaceId
- `integrations` — row-level by workspaceId
- `api_keys` — row-level by workspaceId

### 14.3 RLS Policy Pattern

```sql
-- Enable RLS on contacts table
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;

-- Policy: users can only see contacts in their workspace
CREATE POLICY contacts_workspace_isolation ON contacts
  USING (workspace_id = current_setting('app.workspace_id')::int);

-- Application sets workspace context at connection time
SET app.workspace_id = '123';
```

### 14.4 Organization-Level Isolation

Some operations need organization-level scope (e.g., audit logs across workspaces). The existing `organizations` → `workspaces` hierarchy already supports this. RLS policies for organization-level tables use `organization_id` instead of `workspace_id`.

---

## 15. Haier Architecture

### 15.1 Haier as Configuration

```
SOPRANOVA Core Platform
  ↓
Haier Organization (org_id: haier_europe)
  ↓
Haier Workspace (workspace_id: haier_support)
  ↓
Haier Agent (agent_id: haier_service_agent)
  │
  ├── Configuration:
  │   ├── name: "Haier Service Agent"
  │   ├── purpose: "Customer support for Haier home appliances in Europe"
  │   ├── model: "gpt-4o"
  │   ├── language: ["en", "de", "it", "fr", "es"]
  │   ├── maxIterations: 15
  │   └── businessHours: "Mon-Fri 8:00-18:00 CET"
  │
  ├── Knowledge Bases:
  │   ├── Haier Product Manuals (DE, IT, FR, EN)
  │   ├── Haier Troubleshooting Guides
  │   ├── Haier Warranty Policies
  │   └── Haier Service Center Directory
  │
  ├── Tools:
  │   ├── salesforce_create_case
  │   ├── salesforce_update_case
  │   ├── salesforce_query_account
  │   ├── haier_product_lookup
  │   ├── haier_warranty_check
  │   └── haier_service_center_find
  │
  ├── Workflows:
  │   ├── Warranty Claim Process
  │   ├── Service Appointment Booking
  │   └── Escalation to Human Agent
  │
  └── Channels:
      ├── Widget (haier.com/support)
      ├── WhatsApp (Haier Europe)
      ├── Email (support@haier-europe.com)
      └── Voice (Haier hotline)
```

### 15.2 Haier Customer Journey

```
Customer Message (any channel)
  ↓
Channel Adapter (normalizes input)
  ↓
Conversation Service (load/create conversation)
  ↓
Agent Runtime (Haier Service Agent)
  │
  ├── Step 1: Product Identification
  │   ├── Ask for model number / photo
  │   ├── Use vision to identify product
  │   └── Look up in product database
  │
  ├── Step 2: Knowledge Retrieval
  │   ├── Retrieve relevant manuals (language-aware)
  │   ├── Retrieve troubleshooting guides
  │   └── Retrieve warranty information
  │
  ├── Step 3: Diagnosis
  │   ├── Ask about symptoms
  │   ├── Use knowledge to diagnose
  │   └── Provide troubleshooting steps
  │
  ├── Step 4: Resolution
  │   ├── If resolved → Close with summary
  │   ├── If warranty issue → salesforce_create_case
  │   ├── If complex → Escalate to human
  │   └── If service needed → Book appointment
  │
  └── Step 5: Follow-up
      ├── Send satisfaction survey
      ├── Update CRM
      └── Store interaction in memory
```

### 15.3 Haier-Specific Requirements

| Requirement | Implementation |
|---|---|
| Multi-language (DE, IT, FR, EN, ES) | Knowledge base metadata + language filter |
| Product identification from photos | Vision model (GPT-4o) + product database |
| Warranty check | Salesforce integration tool |
| Service center lookup | Haier API tool |
| Human handoff | Workflow: AI → Condition → Human Approval → Salesforce |
| Escalation to Tier 2 | Workflow: AI → Condition → Escalation → Notification |
| Compliance (GDPR) | Memory deletion, data retention policies |
| Business hours routing | Condition node in workflow |

---

## 16. Migration Strategy

### Phase 0: Foundation (Week 1-2)

**Objective:** Agent Runtime core with streaming, no RAG, no tools.

| Area | Changes |
|------|---------|
| Database | `model_configs` table, `api_keys` table |
| Backend | `server/_core/agentRuntime.ts` — core execution loop |
| Backend | `server/_core/modelGateway.ts` — provider abstraction |
| Backend | `server/_core/streaming.ts` — SSE streaming |
| Backend | Extend `intelligence.ask` → `agents.chat` |
| Frontend | Add streaming to Playground/Conversations |
| Tests | Agent runtime unit tests, streaming tests |
| Risks | Breaking existing chat functionality |
| Rollback | Revert to `intelligence.ask` |
| Acceptance | Agent follows instructions, streams responses, handles errors |

### Phase 1: Knowledge / RAG (Week 3-4)

**Objective:** Embeddings, vector search, RAG retrieval.

| Area | Changes |
|------|---------|
| Database | Enable pgvector extension, `embeddings` table |
| Backend | `server/_core/embedding.ts` — embedding pipeline |
| Backend | `server/_core/retrieval.ts` — similarity search |
| Backend | Extend worker: document processing → embedding |
| Backend | Extend context builder: retrieve knowledge |
| Frontend | Knowledge base management page |
| Tests | Embedding pipeline tests, retrieval tests |
| Risks | Embedding API costs, vector index performance |
| Rollback | Disable RAG, fall back to full-context |
| Acceptance | Documents are embedded, retrieved by similarity, injected into context |

### Phase 2: Tools (Week 5-6)

**Objective:** Tool registry, execution engine, built-in tools.

| Area | Changes |
|------|---------|
| Database | `tools` table, `tool_executions` table |
| Backend | `server/_core/toolRegistry.ts` — tool definitions |
| Backend | `server/_core/toolExecutor.ts` — execution engine |
| Backend | Built-in tools: http_request, send_notification |
| Backend | Extend agent runtime: tool calling loop |
| Frontend | Tools management page |
| Tests | Tool execution tests, permission tests |
| Risks | Tool execution security, timeout handling |
| Rollback | Disable tools, agent runs without tool calls |
| Acceptance | Agent can call tools, results are returned, audit is recorded |

### Phase 3: Memory (Week 7)

**Objective:** Short-term and long-term memory.

| Area | Changes |
|------|---------|
| Database | `memories` table |
| Backend | `server/_core/memory.ts` — memory operations |
| Backend | Extend context builder: load memory |
| Backend | Extend worker: extract facts after conversation |
| Frontend | Memory management in Settings |
| Tests | Memory extraction tests, retrieval tests |
| Risks | Memory extraction accuracy, storage growth |
| Rollback | Disable memory, agent runs without user context |
| Acceptance | User facts are extracted, stored, and retrieved for context |

### Phase 4: Workflow Engine (Week 8-9)

**Objective:** Deterministic workflow execution with AI nodes.

| Area | Changes |
|------|---------|
| Database | `workflow_edges` table |
| Backend | `server/_core/workflowEngine.ts` — DAG execution |
| Backend | Node executors: AI, Condition, Tool, API, Notification |
| Backend | Extend worker: workflow execution |
| Frontend | Workflow visual editor (basic) |
| Tests | Workflow execution tests, branching tests |
| Risks | Workflow complexity, state management |
| Rollback | Disable new workflows, keep notification-only |
| Acceptance | Workflows execute with AI decisions, branching, tool calls |

### Phase 5: Haier Pilot (Week 10-11)

**Objective:** Deploy Haier configuration on top of core platform.

| Area | Changes |
|------|---------|
| Database | Haier knowledge bases, tools, workflows |
| Backend | Salesforce connector, Haier product API |
| Frontend | Haier-specific configuration pages |
| Tests | End-to-end Haier journey tests |
| Risks | Salesforce API reliability, multi-language quality |
| Rollback | Disable Haier configuration |
| Acceptance | Full Haier customer journey works end-to-end |

### Phase 6: Channels & Multimodal (Week 12-14)

**Objective:** WhatsApp, Voice, Email channels.

| Area | Changes |
|------|---------|
| Backend | WhatsApp Business API adapter |
| Backend | Voice (Twilio/Vonage) adapter |
| Backend | Email (Resend) adapter |
| Frontend | Channel configuration UI |
| Tests | Channel adapter tests |
| Risks | Third-party API reliability, rate limits |
| Rollback | Disable channels |
| Acceptance | Messages flow through all channels |

### Phase 7: Enterprise (Week 15-16)

**Objective:** Evaluation, observability, RLS, API keys.

| Area | Changes |
|------|---------|
| Database | `traces` table, RLS policies |
| Backend | Trace recording, evaluation engine |
| Backend | API key authentication |
| Frontend | Traces page, evaluation page, API key management |
| Tests | RLS policy tests, API key tests |
| Risks | RLS performance impact, evaluation accuracy |
| Rollback | Disable RLS, disable API keys |
| Acceptance | Full observability, evaluation scoring, secure API access |

---

## 17. Risks

### 17.1 Technical Risks

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Agent Runtime breaks existing chat | High | Medium | Feature flag, gradual rollout, fallback to `intelligence.ask` |
| pgvector performance on free-tier Supabase | Medium | High | Monitor query latency, add indexes, consider dedicated instance |
| Embedding API costs | Medium | Medium | Use batch embedding, cache embeddings, use smaller models |
| Tool execution security | High | Low | Permission system, timeout, sandboxing, audit |
| Streaming complexity | Medium | Low | Start with polling, add SSE incrementally |
| Workflow engine state bugs | High | Medium | Extensive testing, idempotency, checkpoint/restore |
| Multi-language RAG quality | Medium | High | Language-specific embeddings, human evaluation |

### 17.2 Organizational Risks

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Scope creep | High | High | Strict phase boundaries, MVP per phase |
| Haier timeline pressure | High | Medium | Deliver core first, Haier is configuration |
| Render free-tier limitations | Medium | High | Monitor resource usage, plan upgrade path |
| Supabase free-tier limitations | Medium | Medium | Monitor DB size, plan upgrade path |

### 17.3 Dependency Risks

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| OpenRouter API changes | Medium | Low | Abstract provider, support multiple |
| Supabase pgvector extension issues | Medium | Low | Test early, have fallback to application-level search |
| Drizzle ORM breaking changes | Low | Low | Pin versions, test upgrades in dev |

---

## 18. Architectural Decisions

| # | Decision | Choice | Reasoning |
|---|----------|--------|-----------|
| 1 | **Agent Runtime before RAG** | Runtime first | RAG, tools, and memory all need the Runtime spine. Building RAG first creates throwaway code. |
| 2 | **Single execution engine** | One Runtime, consumed by chat + workflows | Avoids parallel implementations. Workflows invoke Runtime for AI nodes. |
| 3 | **Workflow Engine separate from Agent Runtime** | Separate systems | Workflows are deterministic DAGs. Agent Runtime is iterative LLM loops. Different execution models. |
| 4 | **PostgreSQL RLS incremental** | Phase 0 for PII, Phase 2 for agents, Phase 3 for tools | Minimizes migration risk. Application-layer isolation already works. |
| 5 | **Streaming via SSE** | Server-Sent Events over tRPC subscription | Simpler than WebSocket, sufficient for unidirectional streaming. |
| 6 | **Embeddings in pgvector** | Same PostgreSQL database | Avoids separate vector database, maintains single source of truth, simpler ops. |
| 7 | **Tool calling via OpenAI function calling format** | Universal format | Supported by all major providers via OpenRouter. Tools defined in JSON Schema. |
| 8 | **Memory extraction via LLM** | Post-conversation LLM call | Simpler than rule-based extraction. Use gpt-4o-mini for cost efficiency. |
| 9 | **Haier as configuration, not code** | Configuration layer | Core platform is reusable. Haier-specific logic is agent config, tools, and workflows. |
| 10 | **Keep existing tRPC API** | Extend, don't rewrite | Existing API works. Add new procedures. Deprecate `intelligence.ask` after migration. |
| 11 | **Keep existing frontend** | Extend, don't rebuild | React 19 + shadcn/ui + Tailwind is solid. Add new pages, extend existing ones. |
| 12 | **Worker polling over message queue** | Keep polling | Simpler ops on Render free-tier. Sufficient for current scale. |

---

## 19. Recommended Development Order

```
Week 1-2:   Agent Runtime (core loop + streaming)
Week 3-4:   Knowledge / RAG (embeddings + retrieval)
Week 5-6:   Tools (registry + execution)
Week 7:     Memory (short-term + long-term)
Week 8-9:   Workflow Engine (DAG + AI nodes)
Week 10-11: Haier Pilot (configuration layer)
Week 12-14: Channels (WhatsApp, Voice, Email)
Week 15-16: Enterprise (evaluation, observability, RLS, API keys)
```

**Critical path:** Agent Runtime → RAG → Tools → Workflows → Haier

**Parallel work:**
- RLS can be done in parallel with Agent Runtime (Phase 0 PII tables)
- Frontend pages can be built in parallel with backend
- Test suite can grow alongside each phase

---

## 20. Definition of Done

### Core Platform Done When:

- [ ] Agent Runtime executes iterative LLM + tool loop
- [ ] Streaming responses work in Playground and Conversations
- [ ] RAG retrieves relevant knowledge and injects into context
- [ ] Tools can be registered, executed, and audited
- [ ] Memory extracts and retrieves user/agent facts
- [ ] Workflows execute with AI, condition, tool, and API nodes
- [ ] Model Gateway supports multiple providers with fallback
- [ ] Cost and token tracking work per invocation
- [ ] Traces record every agent execution
- [ ] RLS protects PII tables and agent data
- [ ] API keys enable external access
- [ ] 80%+ test coverage on new systems

### Haier Pilot Done When:

- [ ] Haier agent identifies products from text and photos
- [ ] Haier agent retrieves manuals in DE/IT/FR/EN/ES
- [ ] Haier agent diagnoses issues from customer descriptions
- [ ] Haier agent creates Salesforce cases for warranty claims
- [ ] Haier agent escalates to human agents when needed
- [ ] Haier workflows handle the full customer journey
- [ ] Haier channels work on web, WhatsApp, and email
- [ ] Haier analytics show conversation quality and resolution rate

### Enterprise Done When:

- [ ] Evaluation datasets can score agent responses
- [ ] Regression detection catches quality drops
- [ ] Observability shows traces, latency, cost, errors
- [ ] Multi-tenant isolation is enforced at database level
- [ ] API keys are secure and rate-limited
- [ ] Organization-level settings work across workspaces

---

*Document produced as a READ-ONLY architecture decision. No files were modified.*
