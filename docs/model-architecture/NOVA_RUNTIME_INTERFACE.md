# NOVA Runtime Interface

**Date:** 2026-09-03
**Status:** ACTIVE

---

## Overview

The NOVA Runtime Interface defines the API contract between SOPRANOVA agents and the NOVA model platform. It provides a unified interface for model inference, tool calling, and context management.

---

## API Contract

### 1. Model Gateway API

#### POST /api/nova/invoke
Non-streaming model inference.

**Request:**
```typescript
interface NovaInvokeRequest {
  messages: NovaMessage[];
  model?: string;
  provider?: string;
  tools?: NovaTool[];
  toolChoice?: 'none' | 'auto' | 'required' | { name: string };
  maxTokens?: number;
  temperature?: number;
  topP?: number;
  stop?: string[];
  responseFormat?: {
    type: 'text' | 'json_object' | 'json_schema';
    schema?: Record<string, any>;
  };
  context: NovaContext;
}
```

**Response:**
```typescript
interface NovaInvokeResponse {
  id: string;
  model: string;
  provider: string;
  content: string;
  toolCalls?: NovaToolCall[];
  finishReason: 'stop' | 'length' | 'tool_calls' | 'content_filter';
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  latencyMs: number;
}
```

---

#### POST /api/nova/invoke/stream
Streaming model inference.

**Request:**
```typescript
interface NovaStreamRequest {
  messages: NovaMessage[];
  model?: string;
  provider?: string;
  tools?: NovaTool[];
  toolChoice?: 'none' | 'auto' | 'required' | { name: string };
  maxTokens?: number;
  temperature?: number;
  context: NovaContext;
}
```

**Response:**
```typescript
// SSE stream
type NovaStreamEvent = 
  | { type: 'content'; content: string }
  | { type: 'tool_call'; toolCall: NovaToolCall }
  | { type: 'done'; usage: NovaUsage }
  | { type: 'error'; error: string };
```

---

### 2. Agent Intelligence API

#### POST /api/nova/agent/execute
Execute agent with tool calling loop.

**Request:**
```typescript
interface NovaAgentExecuteRequest {
  agentId: string;
  messages: NovaMessage[];
  config?: {
    maxIterations?: number;
    timeoutMs?: number;
    maxTokens?: number;
    useRag?: boolean;
    enableTools?: boolean;
  };
  context: NovaContext;
}
```

**Response:**
```typescript
interface NovaAgentExecuteResponse {
  id: string;
  content: string;
  toolCalls: NovaToolCall[];
  iterations: number;
  model: string;
  provider: string;
  usage: NovaUsage;
  latencyMs: number;
  status: 'success' | 'failed' | 'timeout';
}
```

---

### 3. Context Engine API

#### POST /api/nova/context/build
Build context for agent execution.

**Request:**
```typescript
interface NovaContextBuildRequest {
  agentId: string;
  conversationId?: string;
  messages: NovaMessage[];
  useRag?: boolean;
  context: NovaContext;
}
```

**Response:**
```typescript
interface NovaContextBuildResponse {
  messages: NovaMessage[];
  contextBreakdown: {
    systemPrompt: number;
    ragContext: number;
    history: number;
    total: number;
  };
}
```

---

### 4. Tool Execution API

#### POST /api/nova/tools/execute
Execute a tool call.

**Request:**
```typescript
interface NovaToolExecuteRequest {
  toolName: string;
  arguments: Record<string, any>;
  context: NovaContext;
}
```

**Response:**
```typescript
interface NovaToolExecuteResponse {
  toolCallId: string;
  result: any;
  status: 'success' | 'error';
  error?: string;
  latencyMs: number;
}
```

---

## Data Types

### NovaMessage
```typescript
interface NovaMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string | NovaContentPart[];
  toolCallId?: string;
  toolCalls?: NovaToolCall[];
  name?: string;
}

type NovaContentPart = 
  | { type: 'text'; text: string }
  | { type: 'image_url'; image_url: { url: string } }
  | { type: 'image_file'; image_file: { file_id: string } };
```

### NovaTool
```typescript
interface NovaTool {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: Record<string, any>;
    strict?: boolean;
  };
}
```

### NovaToolCall
```typescript
interface NovaToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}
```

### NovaContext
```typescript
interface NovaContext {
  workspaceId: string;
  agentId: string;
  userId: string;
  permissions: string[];
  metadata?: Record<string, any>;
}
```

### NovaUsage
```typescript
interface NovaUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  estimatedCost: number;
}
```

---

## Error Handling

### Error Codes
| Code | Description | Retry |
|------|-------------|-------|
| NOVA_001 | Invalid request | No |
| NOVA_002 | Model not found | No |
| NOVA_003 | Provider unavailable | Yes |
| NOVA_004 | Rate limited | Yes |
| NOVA_005 | Timeout | Yes |
| NOVA_006 | Tool execution failed | No |
| NOVA_007 | Permission denied | No |
| NOVA_008 | Context too long | No |
| NOVA_009 | Invalid tool arguments | No |
| NOVA_010 | Model overloaded | Yes |

### Error Response
```typescript
interface NovaError {
  code: string;
  message: string;
  details?: Record<string, any>;
  retryable: boolean;
  retryAfter?: number;
}
```

---

## Authentication

### API Key Authentication
```typescript
// Header
Authorization: Bearer sk_live_...

// Or
X-API-Key: sk_live_...
```

### Session Authentication
```typescript
// Cookie
Cookie: sopranova_session=...
```

---

## Rate Limiting

### Limits
| Tier | Requests/minute | Tokens/minute |
|------|----------------|---------------|
| Free | 60 | 10,000 |
| Pro | 600 | 100,000 |
| Enterprise | 6,000 | 1,000,000 |

### Headers
```typescript
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 59
X-RateLimit-Reset: 1693737600
```

---

## Streaming Protocol

### SSE Format
```
data: {"type":"content","content":"Hello"}

data: {"type":"content","content":" world"}

data: {"type":"tool_call","toolCall":{"id":"call_1","type":"function","function":{"name":"sql_query","arguments":"{\"query\":\"SELECT * FROM users\"}"}}}

data: {"type":"done","usage":{"promptTokens":150,"completionTokens":250,"totalTokens":400}}

data: [DONE]
```

---

## Integration with Existing SOPRANOVA

### Backward Compatibility
The NOVA Runtime Interface is designed to be backward compatible with existing SOPRANOVA APIs:

```typescript
// Existing API (still works)
const response = await trpc.agents.chat.mutate({
  agentId: 1,
  conversationId: 1,
  message: "Hello"
});

// New NOVA API (optional)
const response = await fetch('/api/nova/invoke', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    messages: [{ role: 'user', content: 'Hello' }],
    context: {
      workspaceId: 'ws_123',
      agentId: 'agent_456',
      userId: 'user_789',
      permissions: []
    }
  })
});
```

---

## SDK Examples

### JavaScript/TypeScript
```typescript
import { NovaClient } from '@sporanova/nova-sdk';

const nova = new NovaClient({
  apiKey: 'sk_live_...',
  baseUrl: 'https://sopranova-api.onrender.com'
});

// Non-streaming
const response = await nova.invoke({
  messages: [{ role: 'user', content: 'Hello' }],
  context: {
    workspaceId: 'ws_123',
    agentId: 'agent_456',
    userId: 'user_789',
    permissions: []
  }
});

// Streaming
const stream = await nova.invokeStream({
  messages: [{ role: 'user', content: 'Hello' }],
  context: {
    workspaceId: 'ws_123',
    agentId: 'agent_456',
    userId: 'user_789',
    permissions: []
  }
});

for await (const event of stream) {
  if (event.type === 'content') {
    process.stdout.write(event.content);
  }
}
```

### Python
```python
from sporanova import NovaClient

nova = NovaClient(
    api_key="sk_live_...",
    base_url="https://sopranova-api.onrender.com"
)

# Non-streaming
response = nova.invoke(
    messages=[{"role": "user", "content": "Hello"}],
    context={
        "workspaceId": "ws_123",
        "agentId": "agent_456",
        "userId": "user_789",
        "permissions": []
    }
)

print(response.content)
```

---

## Next Steps

1. **Q4 2026:** Implement Model Gateway API
2. **Q4 2026:** Implement Agent Intelligence API
3. **Q1 2027:** Implement Context Engine API
4. **Q1 2027:** Implement Tool Execution API
5. **Q2 2027:** Create SDKs
