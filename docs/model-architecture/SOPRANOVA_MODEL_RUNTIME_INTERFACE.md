# SOPRANOVA Model Runtime Interface

**Date:** 2026-09-03
**Status:** PROPOSAL

---

## Overview

The SOPRANOVA Model Runtime Interface defines the contract between:
- **SOPRANOVA Agent Runtime** (orchestration layer)
- **SOPRANOVA Foundation Model** (inference layer)

This interface ensures clean separation of concerns while enabling tight integration.

---

## API Contract

### Request Schema

```typescript
interface ModelRequest {
  // Required
  messages: Message[];
  
  // Optional
  model?: string;                    // Model identifier (default: sopranoVA-agent-v1)
  tools?: Tool[];                    // Available tools
  response_format?: ResponseFormat;  // Output format constraint
  temperature?: number;              // Sampling temperature (0-2)
  max_tokens?: number;               // Maximum output tokens
  stop?: string[];                   // Stop sequences
  
  // Enterprise-specific
  workspace_id?: string;             // Tenant isolation
  task_type?: TaskType;              // Hint for model routing
  reasoning_budget?: number;         // Max thinking tokens
  tool_budget?: number;              // Max tool calls
  timeout_ms?: number;               // Request timeout
}

interface Message {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string | ContentPart[];
  tool_calls?: ToolCall[];
  tool_call_id?: string;
  name?: string;
}

interface Tool {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: JSONSchema;
    strict?: boolean;
  };
}

interface ToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;  // JSON string
  };
}

interface ResponseFormat {
  type: 'text' | 'json_object';
  schema?: JSONSchema;
}

type TaskType = 
  | 'general'
  | 'reasoning'
  | 'coding'
  | 'analysis'
  | 'tool_use'
  | 'planning'
  | 'arabic'
  | 'structured_output';
```

### Response Schema

```typescript
interface ModelResponse {
  id: string;
  choices: Choice[];
  usage: Usage;
  
  // Enterprise-specific
  metadata: {
    model: string;
    provider: string;
    latency_ms: number;
    reasoning_tokens?: number;
    tool_calls_count?: number;
  };
}

interface Choice {
  index: number;
  message: {
    role: 'assistant';
    content: string | null;
    tool_calls?: ToolCall[];
  };
  finish_reason: 'stop' | 'tool_calls' | 'length' | 'content_filter';
}

interface Usage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  prompt_tokens_details?: {
    cached_tokens: number;
  };
}
```

### Streaming Schema

```typescript
interface StreamChunk {
  id: string;
  choices: StreamChoice[];
  usage?: Usage;
}

interface StreamChoice {
  index: number;
  delta: {
    role?: 'assistant';
    content?: string;
    tool_calls?: ToolCallDelta[];
  };
  finish_reason: 'stop' | 'tool_calls' | 'length' | null;
}

interface ToolCallDelta {
  index: number;
  id?: string;
  type?: 'function';
  function?: {
    name?: string;
    arguments?: string;
  };
}
```

---

## Integration Points

### 1. Agent Runtime → Model

```typescript
// Agent sends request
const response = await modelGateway.chat({
  messages: context.getMessages(),
  tools: toolRegistry.getToolDefinitions(),
  response_format: task.requiresJSON ? { type: 'json_object' } : undefined,
  workspace_id: context.workspaceId,
  task_type: task.classify(),
});
```

### 2. Model → Tool Execution

```typescript
// Model returns tool calls
if (response.choices[0].message.tool_calls) {
  for (const toolCall of response.choices[0].message.tool_calls) {
    const result = await toolExecutor.execute(toolCall);
    context.addToolResult(toolCall.id, result);
  }
}
```

### 3. Model → Workflow Engine

```typescript
// Model participates in workflow
const step = workflow.getCurrentStep();
const response = await modelGateway.chat({
  messages: step.getMessages(),
  tools: step.getAvailableTools(),
  reasoning_budget: step.getReasoningBudget(),
});
workflow.processResponse(response);
```

### 4. Model → RAG System

```typescript
// Model uses retrieved context
const context = await rag.retrieve(query);
const response = await modelGateway.chat({
  messages: [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: query },
    { role: 'system', content: `Retrieved context:\n${context}` },
  ],
});
```

### 5. Model → Memory System

```typescript
// Model accesses conversation memory
const memory = await memoryStore.getRelevant(query);
const response = await modelGateway.chat({
  messages: [
    { role: 'system', content: `Previous context:\n${memory}` },
    ...conversation.getMessages(),
  ],
});
```

---

## Error Handling

### Error Response Schema

```typescript
interface ModelError {
  code: string;
  message: string;
  type: 'validation' | 'auth' | 'rate_limit' | 'context_length' | 'server' | 'timeout';
  retryable: boolean;
  retry_after_ms?: number;
}
```

### Error Codes

| Code | Type | Retryable | Description |
|------|------|-----------|-------------|
| `INVALID_REQUEST` | validation | No | Malformed request |
| `CONTEXT_TOO_LONG` | validation | No | Exceeds model context window |
| `INVALID_TOOL` | validation | No | Unknown tool definition |
| `UNAUTHORIZED` | auth | No | Invalid API key |
| `RATE_LIMITED` | rate_limit | Yes | Too many requests |
| `CONTEXT_LENGTH` | context_length | Yes | Context window exceeded |
| `SERVER_ERROR` | server | Yes | Internal server error |
| `TIMEOUT` | timeout | Yes | Request timed out |

### Retry Strategy

```typescript
const retryConfig = {
  maxRetries: 3,
  baseDelayMs: 1000,
  maxDelayMs: 30000,
  retryableErrors: ['RATE_LIMITED', 'SERVER_ERROR', 'TIMEOUT'],
  backoffMultiplier: 2,
  jitter: true,
};
```

---

## Context Management

### Context Window Budget

```typescript
interface ContextBudget {
  total: number;           // Model's max context window
  system: number;          // Reserved for system prompt
  tools: number;           // Reserved for tool definitions
  history: number;         // Available for conversation history
  response: number;        // Reserved for model response
  buffer: number;          // Safety buffer
}

function calculateBudget(model: ModelConfig): ContextBudget {
  const total = model.max_context_tokens;
  const response = model.max_output_tokens || 4096;
  const buffer = Math.floor(total * 0.1); // 10% buffer
  
  return {
    total,
    system: 0,  // Dynamically calculated
    tools: 0,   // Dynamically calculated
    history: total - response - buffer,
    response,
    buffer,
  };
}
```

### Compaction Strategy

```typescript
interface CompactionConfig {
  enabled: boolean;
  targetTokens: number;      // Target after compaction
  strategy: 'summary' | 'sliding_window' | 'hybrid';
  preserveSystem: boolean;   // Never compact system prompt
  preserveToolResults: boolean; // Keep recent tool results
}
```

---

## Tool Calling Protocol

### Tool Definition

```typescript
// Model receives tool definitions
const tools = [
  {
    type: 'function',
    function: {
      name: 'query_database',
      description: 'Execute a SQL query against the database',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'SQL query to execute'
          },
          database: {
            type: 'string',
            description: 'Database name (optional)',
            default: 'main'
          }
        },
        required: ['query']
      },
      strict: true  // Enforce schema compliance
    }
  }
];
```

### Tool Call Flow

```
1. Model generates tool call(s)
2. Agent Runtime validates arguments against schema
3. Agent Runtime executes tool(s)
4. Agent Runtime returns result(s) to model
5. Model incorporates result and continues
```

### Concurrent Tool Execution

```typescript
// Model can request multiple tools
const toolCalls = [
  { id: 'call_1', function: { name: 'query_database', arguments: '{"query":"..."}' }},
  { id: 'call_2', function: { name: 'create_chart', arguments: '{"type":"bar"...}' }},
];

// Agent Runtime can execute in parallel
const results = await Promise.all(
  toolCalls.map(tc => toolExecutor.execute(tc))
);
```

---

## Streaming Protocol

### Event Types

```typescript
type StreamEvent = 
  | { type: 'message_start'; message: { role: 'assistant' } }
  | { type: 'content_delta'; delta: { type: 'text'; text: string } }
  | { type: 'thinking_delta'; delta: { type: 'thinking'; thinking: string } }
  | { type: 'tool_call_start'; tool_call: ToolCall }
  | { type: 'tool_call_delta'; delta: { type: 'arguments'; arguments: string } }
  | { type: 'message_end'; usage: Usage }
  | { type: 'error'; error: ModelError };
```

### Streaming Usage

```typescript
for await (const event of modelGateway.stream(request)) {
  switch (event.type) {
    case 'content_delta':
      ui.appendText(event.delta.text);
      break;
    case 'tool_call_start':
      ui.showToolCall(event.tool_call);
      break;
    case 'message_end':
      ui.showUsage(event.usage);
      break;
  }
}
```

---

## Model Routing

### Routing Rules

```typescript
interface RoutingRule {
  task_type: TaskType;
  model: string;
  priority: number;
  conditions?: {
    max_tokens?: number;
    requires_tools?: boolean;
    requires_json?: boolean;
    language?: string;
  };
}

const routingRules: RoutingRule[] = [
  { task_type: 'general', model: 'sopranoVA-agent-v1', priority: 1 },
  { task_type: 'reasoning', model: 'sopranoVA-reasoning-v1', priority: 1 },
  { task_type: 'coding', model: 'sopranoVA-code-v1', priority: 1 },
  { task_type: 'arabic', model: 'sopranoVA-arabic-v1', priority: 1 },
  { task_type: 'tool_use', model: 'sopranoVA-agent-v1', priority: 1, conditions: { requires_tools: true } },
];
```

### Fallback Chain

```typescript
const fallbackChain = [
  'sopranoVA-agent-v1',      // Primary
  'gpt-4o',                  // Fallback 1
  'claude-3-5-sonnet',       // Fallback 2
  'qwen-2.5-72b',            // Fallback 3
];
```

---

## Observability

### Request Logging

```typescript
interface RequestLog {
  request_id: string;
  workspace_id: string;
  user_id: string;
  model: string;
  task_type: TaskType;
  messages_count: number;
  tools_count: number;
  tokens_input: number;
  tokens_output: number;
  latency_ms: number;
  tool_calls_count: number;
  error?: string;
  timestamp: Date;
}
```

### Metrics

```typescript
// Prometheus metrics
const metrics = {
  'sopranoVA_model_requests_total': Counter,
  'sopranoVA_model_latency_seconds': Histogram,
  'sopranoVA_model_tokens_total': Counter,
  'sopranoVA_model_errors_total': Counter,
  'sopranoVA_tool_calls_total': Counter,
  'sopranoVA_tool_call_duration_seconds': Histogram,
};
```

---

## Security

### Authentication

```typescript
// API Key authentication
headers: {
  'Authorization': `Bearer ${apiKey}`,
  'X-Workspace-Id': workspaceId,
}
```

### Input Validation

```typescript
// Validate all inputs
const request = ModelRequestSchema.parse(rawRequest);

// Sanitize tool arguments
const cleanArgs = sanitizeJSON(toolCall.function.arguments);

// Rate limiting
await rateLimiter.check(workspaceId);
```

### Output Filtering

```typescript
// Filter sensitive data
const filtered = contentFilter.filter(response.choices[0].message.content);

// Validate JSON output
if (response_format.type === 'json_object') {
  JSON.parse(response.choices[0].message.content);
}
```
