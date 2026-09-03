# Kimi Capability Analysis

**Date:** 2026-09-03
**Status:** COMPLETE

---

## Critical Finding

**The Kimi codebase does NOT contain a model. It contains an agent application.**

The capabilities we observe in Kimi products come from:
1. **The underlying LLM** (kimi-k2, served via API) — NOT in this codebase
2. **The agent orchestration** (this codebase) — REUSABLE PATTERNS
3. **The tool system** (this codebase) — REUSABLE PATTERNS
4. **The training data** (NOT in this codebase) — CANNOT EXTRACT

---

## What Makes Kimi Powerful

### 1. Model Architecture (NOT PRESENT)
- Transformer architecture — NOT IN CODEBASE
- Attention mechanisms — NOT IN CODEBASE
- MoE routing — NOT IN CODEBASE
- Tokenizer — NOT IN CODEBASE
- Training pipeline — NOT IN CODEBASE

**Source:** These are served by Moonshot AI's API infrastructure, not included in the open-source repository.

### 2. Training Data (NOT PRESENT)
- Pretraining corpus — NOT IN CODEBASE
- SFT datasets — NOT IN CODEBASE
- RLHF preferences — NOT IN CODEBASE
- Arabic training data — NOT IN CODEBASE

**Source:** Proprietary to Moonshot AI.

### 3. Agent Orchestration (PRESENT — REUSABLE)
| Pattern | File | Purpose | Reusable? |
|---------|------|---------|-----------|
| Stateless turn execution | `agent-core/src/loop/run-turn.ts` | Step-by-step agent loop | ✅ Yes |
| Concurrent tool scheduling | `agent-core/src/loop/tool-scheduler.ts` | Parallel tool execution | ✅ Yes |
| Context compaction | `agent-core/src/agent/compaction/` | Long conversation handling | ✅ Yes |
| Permission system | `agent-core/src/agent/permission/` | Tool access control | ✅ Yes |
| Goal mode | `agent-core/src/agent/goal/` | Budget-based execution | ✅ Yes |
| Swarm mode | `agent-core/src/agent/swarm/` | Multi-agent coordination | ✅ Yes |

### 4. Tool System (PRESENT — REUSABLE)
| Tool | File | Purpose | Reusable? |
|------|------|---------|-----------|
| bash | `agent-core-v2/src/agent/tools/bash.tool.ts` | Shell execution | ✅ Yes |
| read/write/edit | `agent-core-v2/src/agent/tools/file*.tool.ts` | File operations | ✅ Yes |
| glob/grep | `agent-core-v2/src/agent/tools/search*.tool.ts` | File search | ✅ Yes |
| agent | `agent-core-v2/src/agent/tools/agent.tool.ts` | Sub-agent spawning | ✅ Yes |
| web-search | `agent-core-v2/src/agent/tools/web-search.tool.ts` | Internet search | ✅ Yes |
| fetch-url | `agent-core-v2/src/agent/tools/fetch-url.tool.ts` | URL fetching | ✅ Yes |

### 5. Model Abstraction (PRESENT — REUSABLE)
| Component | File | Purpose | Reusable? |
|-----------|------|---------|-----------|
| Provider adapter | `kosong/src/provider/` | Multi-provider support | ✅ Yes |
| Protocol translation | `kosong/src/protocol/` | Wire format normalization | ✅ Yes |
| Streaming normalization | `kosong/src/model/modelRequesterImpl.ts` | Unified stream handling | ✅ Yes |
| Token management | `kosong/src/model/completionBudget.ts` | Context window tracking | ✅ Yes |

### 6. Context Management (PRESENT — REUSABLE)
| Pattern | File | Purpose | Reusable? |
|---------|------|---------|-----------|
| Micro-compaction | `agent-core/src/agent/compaction/micro.ts` | Incremental compression | ✅ Yes |
| Head+tail selection | `agent-core/src/agent/compaction/` | Smart context pruning | ✅ Yes |
| Media degradation | `agent-core/src/agent/context/` | Handle oversized inputs | ✅ Yes |
| Wire compliance | `agent-core/src/agent/context/projector.ts` | Conversation repair | ✅ Yes |

---

## Capability Separation

### Model Capabilities (From LLM API)
- Text generation
- Reasoning
- Coding
- Arabic/English
- Tool call generation
- Structured output

### Agent Capabilities (From Codebase)
- Tool execution
- Context management
- Permission checking
- Session persistence
- Streaming UI
- Multi-provider routing

### Orchestration Capabilities (From Codebase)
- Goal-directed execution
- Budget management
- Multi-agent coordination
- Background tasks
- Error recovery
- Retry logic

---

## What SOPRANOVA Should Extract

### High Priority (Directly Reusable)
1. **Multi-provider model abstraction** — Implement our own Kosong-inspired layer
2. **Tool calling lifecycle** — Preflight → Authorize → Execute → Finalize
3. **Context compaction** — Micro-compaction + head+tail selection
4. **Streaming normalization** — Convert provider-specific streams to unified format
5. **Permission system** — Role-based tool access control

### Medium Priority (Adapt)
1. **Goal mode with budgets** — Token/turn/time limits
2. **Swarm mode** — Multi-agent coordination patterns
3. **Background tasks** — Long-running operation management
4. **Session persistence** — State management patterns
5. **Plugin system** — Extensibility architecture

### Low Priority (Reference Only)
1. **TUI implementation** — Not relevant for SOPRANOVA
2. **ACP protocol** — Not relevant for SOPRANOVA
3. **VS Code extension** — Not relevant for SOPRANOVA
4. **Telemetry system** — Can design our own

---

## What SOPRANOVA Should NOT Extract

1. ❌ Model architecture — Not present in codebase
2. ❌ Training pipelines — Not present in codebase
3. ❌ Inference optimizations — Not present in codebase
4. ❌ Kimi-specific code — Would create dependency
5. ❌ Branding/trademarks — Legal issues

---

## Conclusion

The Kimi codebase is a **well-engineered agent application** with reusable patterns for:
- Multi-provider model abstraction
- Tool calling orchestration
- Context management
- Permission systems

However, it does NOT contain:
- Model architecture
- Training data
- Inference optimizations

SOPRANOVA should use Kimi's agent patterns as **architectural inspiration** while building its own:
- Enterprise-specific training data
- Arabic optimization
- Cost-efficient inference
- Proprietary evaluation benchmarks
