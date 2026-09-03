# Kimi Codebase Architecture — Deep Technical Analysis

**Date:** 2026-09-03
**Status:** COMPLETE
**Repository:** `kimi-code-main` (MoonshotAI/kimi-code)
**License:** MIT

---

## CRITICAL FINDING

**This is NOT a model training or inference codebase.**

`kimi-code-main` is a **TypeScript monorepo** for a terminal-based AI coding agent (similar to Claude Code, Cursor, GitHub Copilot CLI). It contains:

- CLI/TUI application
- Agent orchestration engine (v1 + v2)
- Multi-provider LLM abstraction layer
- Tool calling system
- Context management
- Plugin/MCP ecosystem

It does NOT contain:

- Model architecture implementations (no transformer code)
- Training pipelines
- Model weights
- Inference engines
- CUDA/Triton kernels
- Attention implementations
- MoE routing code
- Tokenizer code
- Any model-internal code

**The models (kimi-k2, Claude, GPT, Gemini) are called via external APIs. The codebase is an orchestration layer.**

---

## Repository Structure

```
kimi-code-main/
├── apps/
│   ├── kimi-code/          # Main CLI/TUI application
│   ├── kimi-inspect/       # Session inspection tool
│   ├── vis/                # Session visualizer
│   └── vscode/             # VS Code extension
├── packages/
│   ├── agent-core/         # Agent engine v1 (legacy)
│   ├── agent-core-v2/      # Agent engine v2 (DI Scope architecture)
│   ├── kosong/             # LLM/provider abstraction layer
│   ├── kaos/               # Execution environment (fs, process, sandbox)
│   ├── protocol/           # Wire protocol schemas (Zod)
│   ├── klient/             # Transport-agnostic API client
│   ├── kap-server/         # Agent protocol server
│   ├── acp-adapter/        # Agent Client Protocol adapter
│   ├── acp-server/         # ACP server implementation
│   ├── pi-tui/             # Terminal UI framework
│   ├── minidb/             # Embedded document store
│   ├── oauth/              # OAuth authentication
│   ├── telemetry/          # Usage telemetry
│   ├── transcript/         # Session transcript management
│   ├── node-sdk/           # Node.js SDK
│   ├── migration-legacy/   # Legacy data migration
│   └── tree-sitter-bash/   # Bash AST parser
├── plugins/                # Plugin ecosystem
├── scripts/                # Build/install scripts
└── docs/                   # Documentation
```

---

## Architecture Layers

### Layer 1: Application (`apps/kimi-code/`)
- Commander.js CLI with interactive TUI (Ink-based)
- Headless mode (`kimi -p "prompt"`)
- ACP (Agent Client Protocol) mode for IDE integration
- Reverse RPC for question/approval handling

### Layer 2: Agent Engine (`packages/agent-core-v2/`)
- VSCode-inspired DI system (Service, Scope, Fiber, Graph)
- Lifecycle tiers: App → Workspace → Session → Agent
- Agent loop with step execution, tool dispatch, continuation
- Context memory with compaction, undo, projection
- Permission system (yolo, auto, plan-mode)
- Goal mode with budget system (token/turn/time)
- Swarm mode for multi-agent coordination
- Background task management

### Layer 3: Model Abstraction (`packages/kosong/`)
- Provider-agnostic model interface
- Protocol adapters: Anthropic, OpenAI, Google GenAI, Kimi
- Model catalog with capabilities, context limits
- Streaming normalization across providers
- Token usage tracking with cache metrics
- Completion budget management
- Thinking/reasoning mode support

### Layer 4: Execution Environment (`packages/kaos/`)
- File system abstraction with sandboxing
- Process execution with PTY support
- Shell environment probing
- SSH remote execution support

### Layer 5: Protocol (`packages/protocol/`)
- Zod schemas for all wire types
- 50+ event types for agent lifecycle
- Message format: roles, content parts, tool calls
- Session schema with usage tracking
- REST API endpoint definitions

---

## Key Architectural Patterns

### 1. Provider Abstraction (Kosong)
```
User Request → ModelRequester → ProtocolAdapter → Provider SDK → API
                                    ↓
                              Stream Normalizer → Unified Stream
```
- All providers (OpenAI, Anthropic, Google, Kimi) normalized to `StreamedMessagePart`
- Protocol adapters handle wire format translation
- OAuth token refresh on 401 errors
- Prompt cache key routing

### 2. Agent Loop
```
User Input → ContextMemory.project() → LLM.chat()
    ↓
  [Tool Calls] → ToolExecutor → Tool Result → Next Step
    ↓
  [end_turn] → Final Response
```
- Stateless turn execution
- Concurrent tool scheduling with resource access tracking
- Grace timeout for abort handling
- Max-step enforcement

### 3. Context Management
```
History → Micro-compaction → Projection (synthesis, dedup, cleanup)
    ↓
  [Context Overflow] → Full Compaction (summary replacement)
```
- Deferred message flushing
- Media degradation cascade (normal → degraded → stripped)
- Orphan tool result synthesis
- Wire compliance repairs

### 4. Tool System
```
Tool Registration → Schema Validation → Preflight → Authorize → Execute → Finalize
```
- Dynamic tool selection
- MCP server integration
- Permission-based gating
- Concurrent execution with resource locking

### 5. Streaming Architecture
```
Provider Stream → StreamedMessagePart → mergeInPlace() → Callbacks
    ↓
  [Live Events] → text.delta, thinking.delta, tool.call.delta
  [Recorded Events] → step.begin/end, content.part, tool.call/result
```

---

## Model Provider Support

| Provider | Protocol | SDK | Thinking | Tool Use |
|----------|----------|-----|----------|----------|
| Kimi (Moonshot) | OpenAI/Anthropic | openai | ✅ | ✅ |
| Anthropic | Anthropic | @anthropic-ai/sdk | ✅ | ✅ |
| OpenAI | OpenAI | openai | ✅ | ✅ |
| Google | GenAI | @google/genai | ✅ | ✅ |
| Vertex AI | Google | @google/genai | ✅ | ✅ |

### Model Identifiers Found
- `kimi-k2` — Primary Kimi model
- `kimi-code/k2` — Full qualified alias
- `kimi-code/k2.5` — Next-gen variant
- `k2-thinking` — Thinking-enabled variant
- `moonshot-v1` — Legacy model

### Capability Matrix
```typescript
interface ModelCapability {
  image_in: boolean;        // Image input support
  video_in: boolean;        // Video input support
  audio_in: boolean;        // Audio input support
  thinking: boolean;        // Chain-of-thought support
  tool_use: boolean;        // Tool/function calling
  max_context_tokens: number; // Context window size
  max_input_tokens?: number;  // Input token cap
  dynamically_loaded_tools?: boolean; // Runtime tool injection
}
```

---

## Tool System (17 Built-in Tools)

| Tool | Purpose | Capabilities |
|------|---------|--------------|
| `bash` | Shell command execution | `['process']` |
| `read` | File reading | `['fs']` |
| `write` | File writing | `['fs']` |
| `edit` | File editing | `['fs']` |
| `glob` | File pattern matching | `['fs']` |
| `grep` | Content search | `['fs']` |
| `agent` | Sub-agent spawning | — |
| `web-search` | Internet search | `['network']` |
| `fetch-url` | URL fetching | `['network']` |
| `ask-user-question` | User interaction | — |
| `select-tools` | Dynamic tool loading | — |
| `read-media-file` | Image/video reading | `['fs']` |
| `task` | Background tasks | — |
| `todo` | Task management | — |
| `plan` | Planning mode | — |
| `goal` | Goal tracking | — |
| `cron` | Scheduled tasks | — |

---

## What Can Inspire SOPRANOVA

### Agent Orchestration Patterns (REUSABLE CONCEPTS)
1. **Stateless turn execution** with step-level tool dispatch
2. **Concurrent tool scheduling** with resource access tracking
3. **Context compaction** with head+tail selection
4. **Media degradation cascade** for handling oversized inputs
5. **Permission-based tool gating** (yolo, auto, plan-mode)
6. **Goal mode with budget system** (token/turn/time)
7. **Swarm mode** for multi-agent coordination
8. **Background task management** with lifecycle tracking

### Model Abstraction Patterns (REUSABLE CONCEPTS)
1. **Protocol adapter pattern** for multi-provider support
2. **Stream normalization** across different API formats
3. **OAuth token refresh** on authentication failures
4. **Prompt cache key routing** for cost optimization
5. **Completion budget management** for token control

### Context Management Patterns (REUSABLE CONCEPTS)
1. **Micro-compaction** for incremental context reduction
2. **Orphan tool result synthesis** for conversation repair
3. **Deferred message flushing** for concurrent tool execution
4. **Wire compliance repairs** for conversation integrity

### What Is NOT Present (Cannot Inspire)
- No model architecture code
- No training pipelines
- No inference optimization
- No attention implementations
- No MoE routing
- No tokenizer code
- No CUDA kernels
- No model weights
