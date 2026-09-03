# NOVA Architecture

**SOPRANOVA Intelligence Platform / Model Runtime**

---

## Overview

NOVA is the core intelligence layer powering SOPRANOVA agents. It is NOT a trained foundation model (yet). It is a **production-grade model runtime** that:

1. Routes requests to the best available provider
2. Manages context, tool calling, and streaming
3. Provides a unified API for all SOPRANOVA agents
4. Enables progressive fine-tuning toward a specialized NOVA model

---

## Architecture

```
SOPRANOVA Agents
       │
       ▼
┌─────────────────────────────────────────────┐
│              NOVA RUNTIME                    │
│  ┌─────────────────────────────────────┐    │
│  │         Model Gateway               │    │
│  │  - Provider resolution              │    │
│  │  - Model selection                  │    │
│  │  - Load balancing                   │    │
│  │  - Fallback chains                  │    │
│  │  - Cost tracking                    │    │
│  └──────────────┬──────────────────────┘    │
│                 │                            │
│  ┌──────────────▼──────────────────────┐    │
│  │       Provider Adapters             │    │
│  │  ┌─────────┐ ┌──────────┐          │    │
│  │  │ NOVA    │ │ OpenAI   │          │    │
│  │  │ Local   │ │ Groq     │          │    │
│  │  │         │ │ Anthropic│          │    │
│  │  │         │ │ Gemini   │          │    │
│  │  │         │ │ OpenRouter│         │    │
│  │  └─────────┘ └──────────┘          │    │
│  └──────────────┬──────────────────────┘    │
│                 │                            │
│  ┌──────────────▼──────────────────────┐    │
│  │       Inference Engine              │    │
│  │  - Generation                       │    │
│  │  - Streaming                        │    │
│  │  - Tool calling                     │    │
│  │  - Structured output                │    │
│  │  - Cancellation                     │    │
│  │  - Retry                            │    │
│  │  - Timeout                          │    │
│  └──────────────┬──────────────────────┘    │
│                 │                            │
│  ┌──────────────▼──────────────────────┐    │
│  │       Agent Intelligence            │    │
│  │  - Planning                         │    │
│  │  - Reasoning                        │    │
│  │  - Tool selection                   │    │
│  │  - Execution loop                   │    │
│  │  - Verification                     │    │
│  │  - Final response                   │    │
│  └──────────────┬──────────────────────┘    │
│                 │                            │
│  ┌──────────────▼──────────────────────┐    │
│  │       Context Engine                │    │
│  │  - Conversation context             │    │
│  │  - Context compaction               │    │
│  │  - Long-context handling            │    │
│  │  - Memory                           │    │
│  │  - RAG                              │    │
│  └──────────────┬──────────────────────┘    │
│                 │                            │
│  ┌──────────────▼──────────────────────┐    │
│  │       Safety / Permissions          │    │
│  │  - Tool permissions                 │    │
│  │  - Tenant isolation                 │    │
│  │  - Prompt injection protection      │    │
│  │  - Secret protection                │    │
│  │  - Action authorization             │    │
│  └──────────────┬──────────────────────┘    │
│                 │                            │
│  ┌──────────────▼──────────────────────┐    │
│  │       Observability                 │    │
│  │  - Request tracing                  │    │
│  │  - Token usage                      │    │
│  │  - Cost tracking                    │    │
│  │  - Latency metrics                  │    │
│  │  - Error rates                      │    │
│  └─────────────────────────────────────┘    │
└─────────────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────────┐
│              TRAINING PIPELINE              │
│  ┌─────────┐ ┌──────────┐ ┌──────────┐    │
│  │Dataset  │ │SFT/LoRA  │ │Eval      │    │
│  │Pipeline │ │Training  │ │Pipeline  │    │
│  └─────────┘ └──────────┘ └──────────┘    │
└─────────────────────────────────────────────┘
```

---

## Core Components

### 1. Model Gateway

**Purpose:** Route model requests to the best provider.

**File:** `server/_core/nova/gateway.ts`

**Key Features:**
- Provider registry with health checks
- Model-to-provider mapping
- Load balancing across providers
- Fallback chains (NOVA → fallback → fallback)
- Cost-aware routing
- Latency-aware routing
- Rate limit management

### 2. Provider Adapters

**Purpose:** Normalize different provider APIs to a unified interface.

**Files:** `server/_core/nova/providers/`

**Supported Providers:**
| Provider | Adapter | Models | Status |
|----------|---------|--------|--------|
| NOVA Local | `nova.ts` | NOVA (when available) | Planned |
| OpenAI | `openai.ts` | GPT-4o, GPT-4o-mini | Active |
| Groq | `groq.ts` | Qwen 3.6-27b | Active |
| Anthropic | `anthropic.ts` | Claude 3.5 | Active |
| Gemini | `gemini.ts` | Gemini 2.0 | Active |
| OpenRouter | `openrouter.ts` | Multiple | Active |
| Ollama | `ollama.ts` | Local models | Planned |

### 3. Inference Engine

**Purpose:** Execute model inference with full lifecycle management.

**File:** `server/_core/nova/inference.ts`

**Key Features:**
- Non-streaming generation
- Streaming generation (SSE)
- Tool calling (OpenAI format)
- Structured output (JSON schema)
- Cancellation via AbortController
- Retry with exponential backoff
- Timeout management
- Token counting

### 4. Agent Intelligence

**Purpose:** Orchestrate agent execution with planning and verification.

**File:** `server/_core/nova/agent.ts`

**Key Features:**
- Multi-step planning
- Tool selection and execution
- Execution loop with max iterations
- Verification and self-correction
- Goal-directed execution
- Budget management (tokens, turns, time)

### 5. Context Engine

**Purpose:** Manage conversation context efficiently.

**Files:** `server/_core/nova/context/`

**Key Features:**
- Conversation history management
- Context compaction (micro-compaction)
- Long-context handling (sliding window)
- Memory integration
- RAG integration
- Token-aware truncation

### 6. Safety / Permissions

**Purpose:** Ensure secure and authorized operations.

**Files:** `server/_core/nova/safety/`

**Key Features:**
- Tool permission system
- Tenant isolation
- Prompt injection detection
- Secret protection
- Action authorization
- Output filtering

### 7. Observability

**Purpose:** Track all NOVA operations.

**Files:** `server/_core/nova/observability/`

**Key Features:**
- Request tracing
- Token usage tracking
- Cost calculation
- Latency metrics
- Error rates
- Tool call tracking

---

## Integration Points

### With Existing SOPRANOVA

NOVA integrates through the existing `modelGateway.ts`:

```
Current:  AgentRuntime → modelGatewayInvoke() → invokeLLM()
NOVA:     AgentRuntime → novaInvoke() → Provider Adapter → LLM
```

The existing `modelGatewayInvoke()` becomes a fallback when NOVA is not configured.

### Database Schema Changes

```sql
-- Add model/provider columns to agents
ALTER TABLE agents ADD COLUMN nova_model TEXT;
ALTER TABLE agents ADD COLUMN nova_provider TEXT;
ALTER TABLE agents ADD COLUMN nova_config JSONB;

-- Provider registry
CREATE TABLE nova_providers (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  adapter TEXT NOT NULL,
  base_url TEXT NOT NULL,
  api_key_encrypted TEXT,
  models JSONB NOT NULL,
  max_context_window INTEGER,
  pricing JSONB,
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Model checkpoints (for fine-tuning)
CREATE TABLE nova_checkpoints (
  id SERIAL PRIMARY KEY,
  version TEXT NOT NULL,
  base_model TEXT NOT NULL,
  checkpoint_path TEXT,
  metrics JSONB,
  training_config JSONB,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

## Kimi Code Patterns Extracted

| Kimi Pattern | NOVA Implementation | File |
|--------------|---------------------|------|
| Multi-provider abstraction | `NovaProvider` interface | `providers/base.ts` |
| Tool calling lifecycle | `NovaToolCall` lifecycle | `agent.ts` |
| Context compaction | `NovaContextCompactor` | `context/compactor.ts` |
| Permission system | `NovaPermissionChecker` | `safety/permissions.ts` |
| Goal mode | `NovaGoalExecutor` | `agent.ts` |
| Streaming normalization | `NovaStreamNormalizer` | `inference.ts` |
| Concurrent tool scheduling | `NovaToolScheduler` | `agent.ts` |
| Agent loops | `NovaAgentLoop` | `agent.ts` |
| Error handling | `NovaErrorHandler` | `utils/errors.ts` |
| Retry logic | `NovaRetryHandler` | `utils/retry.ts` |
| Cancellation | `NovaCancellation` | `utils/cancellation.ts` |

---

## Current Status

**NOVA v0.1 — Foundation Model + NOVA Runtime**

- ✅ Model gateway implemented
- ✅ Provider adapters (Groq, OpenAI-compatible)
- ✅ Streaming support
- ✅ Tool calling support
- ✅ Context management
- ❌ NOVA local inference (requires GPU)
- ❌ Fine-tuning pipeline (requires training data)
- ❌ Model checkpoints (requires training)

---

## Files Created

```
server/_core/nova/
├── gateway.ts              # Model gateway
├── inference.ts            # Inference engine
├── agent.ts                # Agent intelligence
├── providers/
│   ├── base.ts             # Provider interface
│   ├── openai.ts           # OpenAI adapter
│   ├── groq.ts             # Groq adapter
│   └── index.ts            # Provider registry
├── context/
│   ├── engine.ts           # Context engine
│   └── compactor.ts        # Context compaction
├── safety/
│   ├── permissions.ts      # Permission system
│   └── injection.ts        # Prompt injection detection
├── observability/
│   └── tracer.ts           # Request tracing
├── tools/
│   └── scheduler.ts        # Tool execution scheduler
└── utils/
    ├── errors.ts           # Error handling
    ├── retry.ts            # Retry logic
    └── cancellation.ts     # Cancellation support
```
